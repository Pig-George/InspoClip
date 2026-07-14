export const CONTENT_RUNTIME_MARKER = "__inspoclipContentRuntimeReady"

type ContentRuntimeGlobal = Record<string, unknown>

type RemovableElement = {
  remove(): void
}

type ContentRootElement = {
  style: {
    cssText: string
  }
}

type ContentDocument = {
  getElementById(rootId: string): RemovableElement | null
}

type ContentRootState = {
  hasModal: boolean
  hasAreaOverlay: boolean
  isAreaRecording: boolean
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

export function setContentRootInteractive(root: ContentRootElement, interactive: boolean): void {
  const size = interactive ? "width:100vw;height:100vh" : "width:0;height:0"
  root.style.cssText = `position:fixed;top:0;left:0;${size};overflow:visible;z-index:2147483647;pointer-events:none;`
}

export function shouldExpandContentRoot(state: ContentRootState): boolean {
  return state.hasModal || (state.hasAreaOverlay && !state.isAreaRecording)
}
