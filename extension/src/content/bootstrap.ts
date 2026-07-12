export const CONTENT_RUNTIME_MARKER = "__inspoclipContentRuntimeReady"

type ContentRuntimeGlobal = Record<string, unknown>

type RemovableElement = {
  remove(): void
}

type ContentDocument = {
  getElementById(rootId: string): RemovableElement | null
}

export function claimContentRuntime(globalScope: ContentRuntimeGlobal): boolean {
  if (globalScope[CONTENT_RUNTIME_MARKER]) return false
  globalScope[CONTENT_RUNTIME_MARKER] = true
  return true
}

export function removeExistingContentRoot(documentScope: ContentDocument, rootId: string): boolean {
  const existingRoot = documentScope.getElementById(rootId)
  if (!existingRoot) return false
  existingRoot.remove()
  return true
}
