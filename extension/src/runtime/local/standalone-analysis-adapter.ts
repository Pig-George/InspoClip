import { ChatOpenAI } from "@langchain/openai"

import type {
  AnalysisAdapter,
  AnalysisJob,
  ImageAnalysisInput,
  PromptGenerationInput,
  PromptResult,
  VideoAnalysisInput
} from "../contracts"
import { RuntimeFailure } from "../errors"
import { loadLocalModelSettings, validateLocalModelSettings, type LocalModelSettings } from "./model-settings"

const IMAGE_ANALYSIS_PROMPT = [
  "Analyze this UI or visual design image.",
  "Return JSON only with this exact shape:",
  '{"terms":["short design term"],"prompt":{"en":"recreation prompt in English","zh":"中文复刻提示词"}}',
  "terms must contain at most 10 concise UI, layout, typography, color, motion, or visual-style phrases; no sentences.",
  "Both prompts must explain how to recreate the visible result and be useful for an image or UI generation model."
].join("\n")

export interface LangChainImageInvoker {
  invoke(input: unknown): Promise<unknown>
}

export type LangChainImageInvokerFactory = (settings: LocalModelSettings) => LangChainImageInvoker

type AdapterOptions = {
  loadSettings?: () => Promise<LocalModelSettings>
  createInvoker?: LangChainImageInvokerFactory
  createId?: () => string
  now?: () => string
}

function defaultInvokerFactory(settings: LocalModelSettings): LangChainImageInvoker {
  const model = new ChatOpenAI({
    model: settings.model,
    apiKey: settings.apiKey,
    temperature: 0.3,
    maxTokens: 1800,
    configuration: {
      baseURL: settings.endpoint,
      dangerouslyAllowBrowser: true
    }
  })
  return { invoke: (input) => model.invoke(input as never) }
}

export class StandaloneAnalysisAdapter implements AnalysisAdapter {
  private readonly loadSettings: () => Promise<LocalModelSettings>
  private readonly createInvoker: LangChainImageInvokerFactory
  private readonly createId: () => string
  private readonly now: () => string
  private readonly jobs = new Map<string, AnalysisJob>()

  constructor(options: AdapterOptions = {}) {
    this.loadSettings = options.loadSettings || loadLocalModelSettings
    this.createInvoker = options.createInvoker || defaultInvokerFactory
    this.createId = options.createId || (() => crypto.randomUUID())
    this.now = options.now || (() => new Date().toISOString())
  }

  async analyzeImage(input: ImageAnalysisInput): Promise<AnalysisJob> {
    let settings: LocalModelSettings
    try {
      settings = validateLocalModelSettings(await this.loadSettings())
    } catch (error) {
      if (error instanceof RuntimeFailure) throw error
      throw modelConfigurationRequired()
    }

    const id = this.createId()
    const timestamp = this.now()
    try {
      const response = await this.createInvoker(settings).invoke([{
        role: "user",
        content: [
          { type: "text", text: IMAGE_ANALYSIS_PROMPT },
          { type: "image_url", image_url: { url: await imageDataUrl(input.blob, input.mimeType) } }
        ]
      }])
      const result = parseImageAnalysis(response)
      const job: AnalysisJob = {
        id,
        assetId: input.assetId || id,
        assetKind: "image",
        mode: "standalone",
        status: "completed",
        progress: 100,
        result,
        provider: settings.provider,
        model: settings.model,
        createdAt: timestamp,
        updatedAt: timestamp
      }
      this.jobs.set(id, job)
      return job
    } catch (error) {
      if (error instanceof RuntimeFailure) throw error
      throw new RuntimeFailure({
        code: "LOCAL_MODEL_REQUEST_FAILED",
        message: "The local AI model could not analyze this image",
        retryable: true,
        action: "retry"
      })
    }
  }

  async analyzeVideo(_input: VideoAnalysisInput): Promise<AnalysisJob> {
    throw new RuntimeFailure({
      code: "LOCAL_VIDEO_ANALYSIS_UNAVAILABLE",
      message: "Standalone video analysis is not available yet",
      retryable: false
    })
  }

  async analyzeVideoUrl(_videoUrl: string): Promise<AnalysisJob> {
    throw new RuntimeFailure({
      code: "LOCAL_VIDEO_ANALYSIS_UNAVAILABLE",
      message: "Standalone video analysis is not available yet",
      retryable: false
    })
  }

  async generatePrompt(_input: PromptGenerationInput): Promise<PromptResult> {
    throw new RuntimeFailure({
      code: "LOCAL_PROMPT_GENERATION_UNAVAILABLE",
      message: "Standalone prompt regeneration is not available yet",
      retryable: false
    })
  }

  getJob(jobId: string): Promise<AnalysisJob | null> {
    return Promise.resolve(this.jobs.get(jobId) || null)
  }

  cancelJob(_jobId: string): Promise<void> {
    return Promise.resolve()
  }
}

function modelConfigurationRequired(): RuntimeFailure {
  return new RuntimeFailure({
    code: "MODEL_CONFIGURATION_REQUIRED",
    message: "Configure a local-mode AI provider before analyzing assets",
    retryable: false,
    action: "open-settings"
  })
}

async function imageDataUrl(blob: Blob, mimeType: string): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:${mimeType || blob.type || "image/png"};base64,${btoa(binary)}`
}

function responseText(response: unknown): string {
  if (typeof response === "string") return response
  if (response && typeof response === "object" && "content" in response) return responseText((response as { content: unknown }).content)
  if (Array.isArray(response)) {
    return response.map((item) => {
      if (typeof item === "string") return item
      if (item && typeof item === "object" && "text" in item && typeof item.text === "string") return item.text
      return ""
    }).join("")
  }
  return ""
}

function parseImageAnalysis(response: unknown): { terms: string[]; colors: string[]; prompt: { en: string; zh: string } } {
  const text = responseText(response).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  try {
    const value = JSON.parse(text) as { terms?: unknown; prompt?: { en?: unknown; zh?: unknown } }
    const terms = Array.isArray(value.terms)
      ? value.terms.map((term) => String(term).trim()).filter(Boolean).slice(0, 10)
      : []
    const en = typeof value.prompt?.en === "string" ? value.prompt.en.trim() : ""
    const zh = typeof value.prompt?.zh === "string" ? value.prompt.zh.trim() : ""
    if (terms.length === 0 && !en && !zh) throw new Error("Empty analysis")
    return { terms, colors: [], prompt: { en, zh } }
  } catch {
    return { terms: [], colors: [], prompt: { en: text, zh: text } }
  }
}
