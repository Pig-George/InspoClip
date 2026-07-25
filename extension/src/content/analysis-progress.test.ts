import { describe, expect, test } from "vitest"

import {
  getAnalysisCompletionSteps,
  getNextAnalysisProgress,
  normalizeAnalysisProgress
} from "./analysis-progress"

describe("analysis progress helpers", () => {
  test("advances running analysis monotonically without reaching completion", () => {
    const values = [4]
    for (let index = 0; index < 12; index += 1) {
      values.push(getNextAnalysisProgress(values[values.length - 1]))
    }

    expect(values.every((value, index) => index === 0 || value > values[index - 1])).toBe(true)
    expect(values.every((value) => value <= 92)).toBe(true)
  })

  test("uses intermediate completion steps instead of jumping from ten to one hundred", () => {
    const steps = getAnalysisCompletionSteps(10)

    expect(steps.length).toBeGreaterThan(1)
    expect(steps[0]).toBeGreaterThan(10)
    expect(steps.at(-1)).toBe(100)
    expect(steps).toEqual([...steps].sort((left, right) => left - right))
  })

  test("clamps reported backend progress", () => {
    expect(normalizeAnalysisProgress(-4)).toBe(0)
    expect(normalizeAnalysisProgress(48.6)).toBe(49)
    expect(normalizeAnalysisProgress(180)).toBe(100)
  })
})
