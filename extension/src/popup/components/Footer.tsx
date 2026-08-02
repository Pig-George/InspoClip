import React from "react"

import type { I18nMessages } from "../types"
import { PopupIcon } from "./PopupIcon"

type FooterProps = {
  t: I18nMessages
  onOpenApp: (event: React.MouseEvent<HTMLAnchorElement>) => void
}

export function Footer({ t, onOpenApp }: FooterProps) {
  return (
    <div className="footer">
      <a href="#" onClick={onOpenApp}><PopupIcon name="external-link" />{t.openInspoClip}</a>
    </div>
  )
}
