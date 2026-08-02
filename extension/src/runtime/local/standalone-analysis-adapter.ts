import type {
  AnalysisAdapter,
  AnalysisJob,
  ImageAnalysisInput,
  PromptGenerationInput,
  PromptResult,
  VideoAnalysisInput
} from "../contracts"
import { RuntimeFailure } from "../errors"

function modelConfigurationRequired(): never {
  throw new RuntimeFailure({
    code: "MODEL_CONFIGURATION_REQUIRED",
    message: "Configure a local-mode AI provider before analyzing assets",
    retryable: false,
    action: "open-settings"
  })
}

export class StandaloneAnalysisAdapter implements AnalysisAdapter {
  async analyzeImage(_input: ImageAnalysisInput): Promise<AnalysisJob> {
    return modelConfigurationRequired()
  }

  async analyzeVideo(_input: VideoAnalysisInput): Promise<AnalysisJob> {
    return modelConfigurationRequired()
  }

  async analyzeVideoUrl(_videoUrl: string): Promise<AnalysisJob> {
    return modelConfigurationRequired()
  }

  async generatePrompt(_input: PromptGenerationInput): Promise<PromptResult> {
    return modelConfigurationRequired()
  }

  getJob(_jobId: string): Promise<AnalysisJob | null> {
    return Promise.resolve(null)
  }

  cancelJob(_jobId: string): Promise<void> {
    return Promise.resolve()
  }
}
