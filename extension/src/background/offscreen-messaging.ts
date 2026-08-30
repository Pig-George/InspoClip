const MISSING_RECEIVER_MESSAGE = "Could not establish connection. Receiving end does not exist."
const RETRY_DELAYS_MS = [60, 120, 240]

type OffscreenMessageSender<T> = (message: Record<string, unknown>) => Promise<T>

type SendOffscreenMessageOptions<T> = {
  send: OffscreenMessageSender<T>
  wait?: (ms: number) => Promise<void>
}

function defaultWait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isMissingReceiver(error: unknown): boolean {
  return error instanceof Error && error.message.includes(MISSING_RECEIVER_MESSAGE)
}

export async function sendOffscreenMessageWithRetry<T>(
  message: Record<string, unknown>,
  { send, wait = defaultWait }: SendOffscreenMessageOptions<T>
): Promise<T> {
  let lastError: unknown
  for (const delay of [...RETRY_DELAYS_MS, 0]) {
    try {
      return await send(message)
    } catch (error) {
      lastError = error
      if (!isMissingReceiver(error) || delay === 0) throw error
      await wait(delay)
    }
  }
  throw lastError
}
