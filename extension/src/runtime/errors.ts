import type { RuntimeError } from "./contracts"

const DEFAULT_ERROR: RuntimeError = {
  code: "UNKNOWN_ERROR",
  message: "Unexpected extension runtime error",
  retryable: false
}

export class RuntimeFailure extends Error {
  readonly detail: RuntimeError

  constructor(detail: RuntimeError) {
    super(detail.message)
    this.name = "RuntimeFailure"
    this.detail = { ...detail }
  }
}

export function toRuntimeError(error: unknown): RuntimeError {
  if (error instanceof RuntimeFailure) return { ...error.detail }
  if (error instanceof Error) {
    return {
      code: "UNKNOWN_ERROR",
      message: error.message || DEFAULT_ERROR.message,
      retryable: false
    }
  }
  return { ...DEFAULT_ERROR }
}
