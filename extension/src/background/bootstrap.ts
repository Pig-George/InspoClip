export function runOptionalInitialization(initialize: () => void, warn: (...args: unknown[]) => void = console.warn): void {
  try {
    initialize()
  } catch (error) {
    warn("[InspoClip] Optional background initialization failed", error)
  }
}

export const runBackgroundBootstrap = runOptionalInitialization
