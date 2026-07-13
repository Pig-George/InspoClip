const inflightVideoPromptRequests = new Map<string, Promise<unknown>>()

export function videoPromptRequestKey(videoId: string, purpose: string, target: string): string {
  return `${videoId}::${purpose}::${target.trim()}`
}

export function getVideoPromptInflight<T = unknown>(key: string): Promise<T> | undefined {
  return inflightVideoPromptRequests.get(key) as Promise<T> | undefined
}

export function setVideoPromptInflight<T>(key: string, promise: Promise<T>): Promise<T> {
  inflightVideoPromptRequests.set(key, promise)
  return promise
}

export function clearVideoPromptInflight<T>(key: string, promise?: Promise<T>): void {
  if (promise && inflightVideoPromptRequests.get(key) !== promise) return
  inflightVideoPromptRequests.delete(key)
}
