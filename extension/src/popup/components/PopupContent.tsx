import React, { type ReactNode } from "react"

type PopupContentProps = {
  assetSection: ReactNode
  pageAnalysisSection: ReactNode
}

export function PopupContent({ assetSection, pageAnalysisSection }: PopupContentProps) {
  return (
    <div className="popup-content">
      {assetSection}
      {pageAnalysisSection}
    </div>
  )
}
