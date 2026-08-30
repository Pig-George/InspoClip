import type { VideoAnalysisInput } from "../contracts"
import { RuntimeFailure } from "../errors"
import { isBailianEndpoint, uploadBailianTemporaryFile } from "./bailian-temporary-file"
import type { LocalModelSettings } from "./model-settings"
import type { VideoFrame } from "./video-frames"

export type { VideoFrame } from "./video-frames"

export type LocalizedString = string | { en: string; zh: string }

export type VideoAnalysis = {
  summary: LocalizedString
  visualStyle: {
    colors: string[]
    typography: string
    layout: string
    effects: string[]
  }
  stages: Array<{
    startTime: number
    endTime: number
    title: LocalizedString
    initialState: LocalizedString
    trigger: LocalizedString
    actions: Array<{
      subject: LocalizedString
      action: LocalizedString
      from: Record<string, unknown>
      to: Record<string, unknown>
      durationMs: number
      delayMs: number
      easing: string
    }>
    resultState: LocalizedString
  }>
  assets: string[]
  uncertainties: string[]
}

export const VIDEO_ANALYSIS_PROMPT = `Analyze the supplied UI/product demonstration video or timestamped frames in chronological order. Return only strict JSON matching this schema, without Markdown fences or commentary:
{"summary":{"en":"string","zh":"string"},"visualStyle":{"colors":["string"],"typography":"string","layout":"string","effects":["string"]},"stages":[{"startTime":0,"endTime":0,"title":{"en":"string","zh":"string"},"initialState":{"en":"string","zh":"string"},"trigger":{"en":"string","zh":"string"},"actions":[{"subject":{"en":"string","zh":"string"},"action":{"en":"string","zh":"string"},"from":{},"to":{},"durationMs":0,"delayMs":0,"easing":"string"}],"resultState":{"en":"string","zh":"string"}}],"assets":["string"],"uncertainties":["string"]}
All fields are required. Use seconds for stage startTime/endTime and milliseconds for action durationMs/delayMs. Each stage must describe initialState -> trigger -> actions -> resultState. Preserve the supplied frame timestamps when estimating stage boundaries. Provide concise equivalent English and Chinese text for every localized object.`

export type StandaloneVideoInvocation = {
  source: "video" | "frames"
  ossResource: boolean
  content: Array<Record<string, unknown>>
}

type AnalyzeOptions = {
  input: VideoAnalysisInput
  settings: LocalModelSettings
  uploadTemporaryFile?: typeof uploadBailianTemporaryFile
  extractFrames: (blob: Blob, frameCount: number, expectedDurationSeconds?: number) => Promise<VideoFrame[]>
  invoke: (input: StandaloneVideoInvocation) => Promise<unknown>
}

export async function analyzeStandaloneVideo(options: AnalyzeOptions): Promise<VideoAnalysis> {
  if (options.settings.provider === "qwen" && isBailianEndpoint(options.settings.endpoint)) {
    try {
      const ossUrl = await (options.uploadTemporaryFile || uploadBailianTemporaryFile)({
        apiKey: options.settings.apiKey,
        endpoint: options.settings.endpoint,
        model: options.settings.model,
        blob: options.input.blob,
        filename: options.input.filename
      })
      return invokeVideoAnalysisWithRepair(options, {
        source: "video",
        ossResource: true,
        content: [
          { type: "text", text: VIDEO_ANALYSIS_PROMPT },
          { type: "video_url", video_url: { url: ossUrl } }
        ]
      })
    } catch {
      // Temporary storage is intentionally best-effort for standalone mode.
    }
  }

  const frameCount = normalizeVideoFrameCount(options.settings.videoFrameCount)
  const durationSeconds = Number.isFinite(options.input.durationMs) && Number(options.input.durationMs) > 0
    ? Number(options.input.durationMs) / 1000
    : undefined
  const frames = durationSeconds === undefined
    ? await options.extractFrames(options.input.blob, frameCount)
    : await options.extractFrames(options.input.blob, frameCount, durationSeconds)
  if (frames.length === 0) {
    throw new RuntimeFailure({
      code: "LOCAL_VIDEO_FRAME_EXTRACTION_FAILED",
      message: "No usable video frames were extracted",
      retryable: true,
      action: "retry"
    })
  }
  const content: Array<Record<string, unknown>> = [{ type: "text", text: VIDEO_ANALYSIS_PROMPT }]
  frames.forEach((frame, index) => {
    content.push({ type: "text", text: `Frame ${String(index + 1).padStart(2, "0")} · ${frame.timestamp.toFixed(3)}s` })
    content.push({ type: "image_url", image_url: { url: frame.dataUrl } })
  })
  return invokeVideoAnalysisWithRepair(options, { source: "frames", ossResource: false, content })
}

async function invokeVideoAnalysisWithRepair(options: AnalyzeOptions, invocation: StandaloneVideoInvocation): Promise<VideoAnalysis> {
  const response = await options.invoke(invocation)
  try {
    return parseVideoAnalysisResponse(response)
  } catch (error) {
    if (!(error instanceof RuntimeFailure) || error.detail.code !== "LOCAL_MODEL_INVALID_VIDEO_ANALYSIS") throw error
    const repaired = await options.invoke({
      ...invocation,
      content: [
        ...invocation.content,
        {
          type: "text",
          text: "The previous answer was incomplete or used placeholder values. Return ONLY a complete JSON object matching the requested schema. Do not use ellipses (...), omitted fields, Markdown, or commentary."
        }
      ]
    })
    return parseVideoAnalysisResponse(repaired)
  }
}

export function normalizeVideoFrameCount(value: unknown): number {
  const parsed = Number(value)
  return Math.min(48, Math.max(4, Number.isFinite(parsed) ? Math.round(parsed) : 16))
}

export function parseVideoAnalysisResponse(response: unknown): VideoAnalysis {
  const parsed = unwrapVideoAnalysis(response)
  if (!parsed || !isLocalizedString(parsed.summary)) throw invalidVideoResponse()
  const visualStyle = asRecord(parsed.visualStyle)
  if (!visualStyle) throw invalidVideoResponse()
  const typography = stringValue(visualStyle.typography)
  const layout = stringValue(visualStyle.layout)
  if (!isMeaningfulText(typography) || !isMeaningfulText(layout)) throw invalidVideoResponse()
  const stages = Array.isArray(parsed.stages) ? parsed.stages.map(normalizeStage) : null
  if (!stages || stages.some((stage) => !stage)) throw invalidVideoResponse()
  return {
    summary: parsed.summary,
    visualStyle: {
      colors: stringArray(visualStyle.colors),
      typography,
      layout,
      effects: stringArray(visualStyle.effects)
    },
    stages: stages as VideoAnalysis["stages"],
    assets: stringArray(parsed.assets),
    uncertainties: stringArray(parsed.uncertainties)
  }
}

function normalizeStage(value: unknown): VideoAnalysis["stages"][number] | null {
  const stage = asRecord(value)
  if (!stage || !isLocalizedString(stage.title) || !isLocalizedString(stage.initialState) || !isLocalizedString(stage.trigger) || !isLocalizedString(stage.resultState)) return null
  const startTime = nonNegativeNumber(stage.startTime)
  const endTime = nonNegativeNumber(stage.endTime)
  if (startTime === null || endTime === null || endTime < startTime || !Array.isArray(stage.actions)) return null
  const actions = stage.actions.map(normalizeAction)
  if (actions.some((action) => !action)) return null
  return { startTime, endTime, title: stage.title, initialState: stage.initialState, trigger: stage.trigger, actions: actions as VideoAnalysis["stages"][number]["actions"], resultState: stage.resultState }
}

function normalizeAction(value: unknown): VideoAnalysis["stages"][number]["actions"][number] | null {
  const action = asRecord(value)
  if (!action || !isLocalizedString(action.subject) || !isLocalizedString(action.action)) return null
  const durationMs = nonNegativeNumber(action.durationMs)
  const delayMs = nonNegativeNumber(action.delayMs)
  const from = asRecord(action.from)
  const to = asRecord(action.to)
  if (durationMs === null || delayMs === null || !from || !to) return null
  return { subject: action.subject, action: action.action, from, to, durationMs, delayMs, easing: stringValue(action.easing) }
}

function unwrapVideoAnalysis(response: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 5) return null
  if (typeof response === "string") {
    const text = response.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    try {
      return unwrapVideoAnalysis(JSON.parse(text), depth + 1)
    } catch {
      const start = text.indexOf("{")
      const end = text.lastIndexOf("}")
      if (start < 0 || end <= start) return null
      try {
        return unwrapVideoAnalysis(JSON.parse(text.slice(start, end + 1)), depth + 1)
      } catch {
        return null
      }
    }
  }
  if (Array.isArray(response)) {
    return unwrapVideoAnalysis(response.map((item) => {
      const record = asRecord(item)
      return typeof record?.text === "string" ? record.text : typeof item === "string" ? item : ""
    }).join(""), depth + 1)
  }
  const record = asRecord(response)
  if (!record) return null
  if (record.summary && record.visualStyle && record.stages) return record
  // LangChain JS messages may cross the extension boundary as serialized
  // objects (`kwargs`/`lc_kwargs`) instead of class instances. These fields
  // contain the model content; namespace/id metadata must never be rendered.
  for (const key of ["content", "kwargs", "lc_kwargs", "additional_kwargs", "result", "data", "output", "response", "message", "choices"]) {
    const nested = unwrapVideoAnalysis(record[key], depth + 1)
    if (nested) return nested
  }
  return null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function isLocalizedString(value: unknown): value is LocalizedString {
  if (typeof value === "string") return isMeaningfulText(value)
  const record = asRecord(value)
  return Boolean(record && typeof record.en === "string" && isMeaningfulText(record.en) && typeof record.zh === "string" && isMeaningfulText(record.zh))
}

function stringValue(value: unknown): string {
  return typeof value === "string" && isMeaningfulText(value) ? value.trim() : ""
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && isMeaningfulText(item)).map((item) => item.trim()) : []
}

function isMeaningfulText(value: string): boolean {
  const normalized = value.trim()
  return Boolean(normalized)
    && !/^(?:\.\.\.|…+|n\/a|na|null|undefined|unknown|tbd)$/i.test(normalized)
    && !/langchain[_.\s-]*core[_.\s-]*messages/i.test(normalized)
}

function nonNegativeNumber(value: unknown): number | null {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

function invalidVideoResponse(): RuntimeFailure {
  return new RuntimeFailure({
    code: "LOCAL_MODEL_INVALID_VIDEO_ANALYSIS",
    message: "The local AI model returned an invalid video analysis response",
    retryable: true,
    action: "retry"
  })
}
