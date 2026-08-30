export const EXTENSION_LOGS_KEY = "developmentExtensionLogs"
export const LEGACY_BACKEND_DIAGNOSTICS_KEY = "developmentBackendDiagnostics"

const MAX_EXTENSION_LOGS = 100
const MAX_TEXT_LENGTH = 4_000
const SENSITIVE_KEY = /api[_-]?key|token|authorization|password|secret|credential/i
const INSTALLATION_KEY = Symbol.for("inspoclip.development-error-logging")

export type ExtensionLogSource = "background" | "content" | "popup" | "offscreen" | "timeline" | "backend"
export type ExtensionLogLevel = "error" | "warn"

export type ExtensionLogEntry = {
  timestamp: string
  source: ExtensionLogSource
  level: ExtensionLogLevel
  message: string
  stack?: string
  context?: Record<string, unknown>
}

export type ExtensionLogInput = {
  source: ExtensionLogSource
  level: ExtensionLogLevel
  error: unknown
  stack?: string
  context?: Record<string, unknown>
}

export type ExtensionLogStorage = {
  get: (key: string) => Promise<Record<string, unknown>>
  set: (value: Record<string, unknown>) => Promise<void>
  remove: (key: string) => Promise<void>
}

type ErrorEventTarget = {
  addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void
  removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void
  [INSTALLATION_KEY]?: ExtensionErrorLoggingInstallation
}

type ConsoleTarget = {
  error: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
}

export type ExtensionErrorLoggingInstallation = {
  flush: () => Promise<void>
  uninstall: () => void
}

type InstallExtensionErrorLoggingOptions = {
  source: Exclude<ExtensionLogSource, "backend">
  enabled: boolean
  storage: ExtensionLogStorage
  captureConsole?: boolean
  target?: ErrorEventTarget
  consoleTarget?: ConsoleTarget
}

function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value)
    url.username = ""
    url.password = ""
    url.search = ""
    url.hash = ""
    return url.toString().replace(/\/$/, "")
  } catch {
    return value.replace(/\/\/[^/@]*@/, "//").split(/[?#]/)[0]
  }
}

function sanitizeText(value: string): string {
  return String(value || "Unknown extension error")
    .replace(/https?:\/\/[^\s"'<>]+/gi, (url) => sanitizeUrl(url))
    .replace(/((?:api[_-]?key|token|authorization|password|secret|credential)\s*[=:]\s*)[^\s,;]+/gi, "$1[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .slice(0, MAX_TEXT_LENGTH)
}

function sanitizeValue(key: string, value: unknown, seen: WeakSet<object>): unknown {
  if (SENSITIVE_KEY.test(key)) return "[redacted]"
  if (typeof value === "string") {
    if (key.toLowerCase().includes("url")) return sanitizeUrl(value)
    return sanitizeText(value)
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") return value
  if (value instanceof Error) return sanitizeText(value.message)
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeValue("", item, seen))
  if (value && typeof value === "object") {
    if (seen.has(value)) return "[circular]"
    seen.add(value)
    const result: Record<string, unknown> = {}
    for (const [childKey, childValue] of Object.entries(value).slice(0, 30)) {
      result[childKey] = sanitizeValue(childKey, childValue, seen)
    }
    return result
  }
  return value === undefined ? undefined : sanitizeText(String(value))
}

function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined
  const value = sanitizeValue("", context, new WeakSet())
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return sanitizeText(error.message)
  if (typeof error === "string") return sanitizeText(error)
  try {
    return sanitizeText(JSON.stringify(sanitizeValue("", error, new WeakSet())))
  } catch {
    return sanitizeText(String(error || "Unknown extension error"))
  }
}

function isExtensionLogEntry(value: unknown): value is ExtensionLogEntry {
  if (!value || typeof value !== "object") return false
  const entry = value as Partial<ExtensionLogEntry>
  return typeof entry.timestamp === "string"
    && ["background", "content", "popup", "offscreen", "timeline", "backend"].includes(String(entry.source))
    && (entry.level === "error" || entry.level === "warn")
    && typeof entry.message === "string"
}

function migrateLegacyDiagnostic(value: unknown): ExtensionLogEntry | null {
  if (!value || typeof value !== "object") return null
  const entry = value as Record<string, unknown>
  if (typeof entry.timestamp !== "string" || typeof entry.error !== "string") return null
  return {
    timestamp: entry.timestamp,
    source: "backend",
    level: "error",
    message: sanitizeText(entry.error),
    context: {
      ...(typeof entry.method === "string" ? { method: entry.method } : {}),
      ...(typeof entry.url === "string" ? { url: sanitizeUrl(entry.url) } : {})
    }
  }
}

async function readStoredLogs(storage: ExtensionLogStorage): Promise<ExtensionLogEntry[]> {
  const [currentResult, legacyResult] = await Promise.all([
    storage.get(EXTENSION_LOGS_KEY),
    storage.get(LEGACY_BACKEND_DIAGNOSTICS_KEY)
  ])
  const current = Array.isArray(currentResult[EXTENSION_LOGS_KEY])
    ? currentResult[EXTENSION_LOGS_KEY].filter(isExtensionLogEntry)
    : []
  const legacy = Array.isArray(legacyResult[LEGACY_BACKEND_DIAGNOSTICS_KEY])
    ? legacyResult[LEGACY_BACKEND_DIAGNOSTICS_KEY].map(migrateLegacyDiagnostic).filter((entry): entry is ExtensionLogEntry => Boolean(entry))
    : []
  if (!legacy.length) return current.slice(0, MAX_EXTENSION_LOGS)

  const merged = [...current, ...legacy]
    .filter((entry, index, entries) => entries.findIndex((candidate) =>
      candidate.timestamp === entry.timestamp
      && candidate.source === entry.source
      && candidate.message === entry.message
    ) === index)
    .slice(0, MAX_EXTENSION_LOGS)
  await storage.set({ [EXTENSION_LOGS_KEY]: merged })
  await storage.remove(LEGACY_BACKEND_DIAGNOSTICS_KEY)
  return merged
}

export function createExtensionLogRecorder(
  storage: ExtensionLogStorage,
  enabled: boolean,
  now: () => string = () => new Date().toISOString()
): (input: ExtensionLogInput) => Promise<void> {
  let writeQueue = Promise.resolve()
  return (input) => {
    if (!enabled) return Promise.resolve()
    const write = async () => {
      const previous = await readStoredLogs(storage)
      const stack = input.stack || (input.error instanceof Error ? input.error.stack : undefined)
      const next: ExtensionLogEntry = {
        timestamp: now(),
        source: input.source,
        level: input.level,
        message: errorMessage(input.error),
        ...(stack ? { stack: sanitizeText(stack) } : {}),
        ...(input.context ? { context: sanitizeContext(input.context) } : {})
      }
      await storage.set({ [EXTENSION_LOGS_KEY]: [next, ...previous].slice(0, MAX_EXTENSION_LOGS) })
    }
    writeQueue = writeQueue.then(write, write)
    return writeQueue
  }
}

export async function loadExtensionLogs(storage: ExtensionLogStorage, enabled: boolean): Promise<ExtensionLogEntry[]> {
  return enabled ? readStoredLogs(storage) : []
}

export async function clearExtensionLogs(storage: ExtensionLogStorage, enabled: boolean): Promise<void> {
  if (!enabled) return
  await Promise.all([
    storage.remove(EXTENSION_LOGS_KEY),
    storage.remove(LEGACY_BACKEND_DIAGNOSTICS_KEY)
  ])
}

function consoleMessage(args: unknown[]): { message: string; stack?: string } {
  const parts = args.map((value) => errorMessage(value)).filter(Boolean)
  const error = args.find((value): value is Error => value instanceof Error)
  return {
    message: parts.join(" ") || "Unknown extension error",
    ...(error?.stack ? { stack: error.stack } : {})
  }
}

export function installExtensionErrorLogging({
  source,
  enabled,
  storage,
  captureConsole = true,
  target = globalThis as ErrorEventTarget,
  consoleTarget = console
}: InstallExtensionErrorLoggingOptions): ExtensionErrorLoggingInstallation {
  if (!enabled) return { flush: async () => undefined, uninstall: () => undefined }
  if (target[INSTALLATION_KEY]) return target[INSTALLATION_KEY]

  const record = createExtensionLogRecorder(storage, true)
  const pending = new Set<Promise<void>>()
  const capture = (input: ExtensionLogInput) => {
    const task = record(input).catch(() => undefined)
    pending.add(task)
    void task.finally(() => pending.delete(task))
  }
  const originalError = consoleTarget.error
  const originalWarn = consoleTarget.warn
  const patchedError = (...args: unknown[]) => {
    originalError.apply(consoleTarget, args)
    const normalized = consoleMessage(args)
    capture({ source, level: "error", error: normalized.message, stack: normalized.stack })
  }
  const patchedWarn = (...args: unknown[]) => {
    originalWarn.apply(consoleTarget, args)
    const normalized = consoleMessage(args)
    capture({ source, level: "warn", error: normalized.message, stack: normalized.stack })
  }
  if (captureConsole) {
    consoleTarget.error = patchedError
    consoleTarget.warn = patchedWarn
  }

  const errorHandler: EventListener = (event) => {
    const errorEvent = event as Event & { error?: unknown; message?: string; filename?: string; lineno?: number; colno?: number }
    capture({
      source,
      level: "error",
      error: errorEvent.error || errorEvent.message || "Uncaught extension error",
      context: {
        ...(errorEvent.filename ? { url: errorEvent.filename } : {}),
        ...(errorEvent.lineno ? { line: errorEvent.lineno } : {}),
        ...(errorEvent.colno ? { column: errorEvent.colno } : {})
      }
    })
  }
  const rejectionHandler: EventListener = (event) => {
    const rejectionEvent = event as Event & { reason?: unknown }
    capture({ source, level: "error", error: rejectionEvent.reason || "Unhandled promise rejection" })
  }
  target.addEventListener?.("error", errorHandler)
  target.addEventListener?.("unhandledrejection", rejectionHandler)

  const installation: ExtensionErrorLoggingInstallation = {
    flush: async () => {
      while (pending.size) await Promise.all([...pending])
    },
    uninstall: () => {
      target.removeEventListener?.("error", errorHandler)
      target.removeEventListener?.("unhandledrejection", rejectionHandler)
      if (captureConsole && consoleTarget.error === patchedError) consoleTarget.error = originalError
      if (captureConsole && consoleTarget.warn === patchedWarn) consoleTarget.warn = originalWarn
      delete target[INSTALLATION_KEY]
    }
  }
  target[INSTALLATION_KEY] = installation
  return installation
}
