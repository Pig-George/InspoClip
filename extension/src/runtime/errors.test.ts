import { describe, expect, test } from "vitest"

import { RuntimeFailure, toRuntimeError } from "./errors"

describe("runtime errors", () => {
  test("preserves a structured runtime failure", () => {
    const error = new RuntimeFailure({
      code: "MODEL_AUTHENTICATION",
      message: "Invalid API key",
      retryable: false,
      action: "open-settings"
    })

    expect(toRuntimeError(error)).toEqual({
      code: "MODEL_AUTHENTICATION",
      message: "Invalid API key",
      retryable: false,
      action: "open-settings"
    })
  })

  test("normalizes ordinary errors without copying attached secrets", () => {
    const source = Object.assign(new Error("Request failed"), {
      apiKey: "sk-secret",
      authorization: "Bearer secret"
    })

    expect(toRuntimeError(source)).toEqual({
      code: "UNKNOWN_ERROR",
      message: "Request failed",
      retryable: false
    })
  })

  test("normalizes unknown thrown values", () => {
    expect(toRuntimeError({ reason: "bad response", token: "secret" })).toEqual({
      code: "UNKNOWN_ERROR",
      message: "Unexpected extension runtime error",
      retryable: false
    })
  })
})
