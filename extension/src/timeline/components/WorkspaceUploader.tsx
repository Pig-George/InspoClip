import { WorkspaceUploadSurface } from "@inspoclip/workspace-ui"

import { PopupIcon } from "../../popup/components/PopupIcon"
import { TIMELINE_COPY } from "../copy"
import type { Locale } from "../types"

type WorkspaceUploaderProps = {
  locale: Locale
  disabled?: boolean
  onFiles: (files: File[]) => Promise<void> | void
}

export function WorkspaceUploader({ locale, disabled = false, onFiles }: WorkspaceUploaderProps) {
  const copy = TIMELINE_COPY[locale]
  return <WorkspaceUploadSurface label={copy.pasteOrDrop} busyLabel={copy.uploading} disabled={disabled} onFiles={onFiles} icon={<PopupIcon name="upload" />} />
}
