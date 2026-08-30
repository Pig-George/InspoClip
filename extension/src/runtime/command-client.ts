import type { CommandResult, ExtensionCommand } from "./contracts"
import { RuntimeFailure } from "./errors"

export type RuntimeMessageSender = (message: ExtensionCommand) => Promise<CommandResult<unknown>>

export async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error || new Error("Failed to serialize asset"))
      reader.onload = () => resolve(String(reader.result || ""))
      reader.readAsDataURL(blob)
    })
  }
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const base64 = Buffer.from(bytes).toString("base64")
  return `data:${blob.type || "application/octet-stream"};base64,${base64}`
}

function defaultSender(message: ExtensionCommand): Promise<CommandResult<unknown>> {
  return chrome.runtime.sendMessage(message)
}

export async function sendRuntimeCommand<T = unknown>(
  command: ExtensionCommand,
  sender: RuntimeMessageSender = defaultSender
): Promise<T> {
  const result = await sender(command)
  if (!result || typeof result !== "object" || !("ok" in result)) {
    throw new RuntimeFailure({
      code: "INVALID_RUNTIME_RESPONSE",
      message: "The extension runtime returned an invalid response",
      retryable: true,
      action: "retry"
    })
  }
  if (result.ok === false) throw new RuntimeFailure(result.error)
  return result.data as T
}
