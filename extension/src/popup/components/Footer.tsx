import React from "react"

import type { I18nMessages } from "../types"
import { PopupIcon } from "./PopupIcon"

type FooterProps = {
  t: I18nMessages
  onOpenApp: (event: React.MouseEvent<HTMLAnchorElement>) => void
  showWorkspaceLink?: boolean
}

export function Footer({ t, onOpenApp, showWorkspaceLink = true }: FooterProps) {
  return (
    <div className="footer">
      {showWorkspaceLink ? <a href="#" onClick={onOpenApp}><PopupIcon name="external-link" />{t.openInspoClip}</a> : null}
    </div>
  )
}
