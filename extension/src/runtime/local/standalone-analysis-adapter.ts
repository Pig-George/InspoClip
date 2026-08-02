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

export const IMAGE_TERMINOLOGY_PROMPT = "Analyze this UI/UX design screenshot. Return exactly 5-10 short visual design terminology keywords covering relevant aspects such as color, typography, layout, spacing, components, patterns, and style. Each item must be a concise bilingual label in the format \"English / 中文\": use 1-4 English words and 2-8 Chinese characters. Do not write sentences, observations, explanations, caveats, or uncertainty descriptions. Return only a strict JSON array of bilingual strings. Examples: [\"minimalist / 极简风格\", \"glassmorphism / 毛玻璃效果\", \"card layout / 卡片布局\", \"pastel palette / 粉彩色调\"]."

export const DESIGN_ANALYSIS_PROMPT = "Analyze this UI/UX design screenshot and generate a detailed AI image/design prompt that could recreate a similar design style. The prompt must describe the visual style, color palette, typography, layout patterns, mood, and key design elements visible in the reference. Preserve observed details instead of turning the result into an implementation audit or adding unsupported content. Provide equivalent prompt content in BOTH English and Chinese. Return only strict JSON without Markdown fences or commentary: {\"en\": \"Your English prompt here\", \"zh\": \"你的中文提示词\"}."

function createImageTerminologyRepairPrompt(terms: string[]): string {
  return `Condense the following untrusted JSON array into short visual design terminology keywords. Preserve the useful design concepts, but replace every sentence or description with a concise label. Return exactly 5-10 unique bilingual strings in the format "English / 中文". Each English label must contain 1-4 words and each Chinese label must contain 2-8 Chinese characters. Do not include sentences, explanations, caveats, or Markdown. Return only a strict JSON array. Untrusted terminology JSON: ${JSON.stringify(terms)}`
}

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
    temperature: 0.7,
    // Keep image analysis aligned with the server's dedicated image invoker.
    maxTokens: 300,
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
      const dataUrl = await imageDataUrl(input.blob, input.mimeType)
      const invoker = this.createInvoker(settings)
      const terms = await analyzeTerms(invoker, dataUrl)
      const prompt = await analyzeDesignPrompt(invoker, dataUrl)
      const result = { terms, colors: [], prompt }
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

function imageMessage(prompt: string, dataUrl: string): unknown {
  return [{
    role: "user",
    content: [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: dataUrl } }
    ]
  }]
}

async function analyzeTerms(invoker: LangChainImageInvoker, dataUrl: string): Promise<string[]> {
  try {
    const terms = parseTerms(await invoker.invoke(imageMessage(IMAGE_TERMINOLOGY_PROMPT, dataUrl)))
    if (terms.every(isConciseTerm)) return terms
    const repaired = parseTerms(await invoker.invoke(createImageTerminologyRepairPrompt(terms))).filter(isConciseTerm)
    return repaired.length > 0 ? repaired : terms.filter(isConciseTerm)
  } catch {
    return ["design element"]
  }
}

async function analyzeDesignPrompt(invoker: LangChainImageInvoker, dataUrl: string): Promise<{ en: string; zh: string }> {
  try {
    return parseDesignPrompt(await invoker.invoke(imageMessage(DESIGN_ANALYSIS_PROMPT, dataUrl)))
  } catch {
    return { en: "", zh: "" }
  }
}

function parseTerms(response: unknown): string[] {
  const text = responseText(response).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  try {
    const value = JSON.parse(text)
    if (Array.isArray(value)) return value.map((term) => String(term).trim()).filter(Boolean).slice(0, 10)
  } catch {
    // Preserve the server's comma/newline fallback for non-JSON terminology output.
  }
  return text.replace(/[\[\]"]/g, "").split(/[,\n]/).map((term) => term.trim()).filter(Boolean).slice(0, 10)
}

function isConciseTerm(term: string): boolean {
  const normalized = term.trim()
  return normalized.length > 0
    && normalized.length <= 80
    && !/(?:[!?。！？；;]|\.(?=\s+\/|\s*$))/.test(normalized)
}

function parseDesignPrompt(response: unknown): { en: string; zh: string } {
  const text = responseText(response).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  try {
    const value = JSON.parse(text) as { en?: unknown; zh?: unknown }
    if (value && typeof value === "object") {
      return {
        en: typeof value.en === "string" ? value.en : "",
        zh: typeof value.zh === "string" ? value.zh : ""
      }
    }
  } catch {
    // Preserve the server's raw text fallback when the provider does not return JSON.
  }
  return { en: text, zh: text }
}
