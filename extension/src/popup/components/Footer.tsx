import type { I18nMessages } from "../types"

type FooterProps = {
  t: I18nMessages
  onOpenApp: (event: React.MouseEvent<HTMLAnchorElement>) => void
}

export function Footer({ t, onOpenApp }: FooterProps) {
  return (
    <div className="footer">
      <a href="#" onClick={onOpenApp}>{t.openInspoClip}</a>
    </div>
  )
}
