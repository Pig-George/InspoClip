import React, { useState } from "react"

type BrandLogoButtonProps = {
  iconUrl: string
}

export function BrandLogoButton({ iconUrl }: BrandLogoButtonProps) {
  const [animationRun, setAnimationRun] = useState(0)
  const [hasInteracted, setHasInteracted] = useState(false)

  const playAnimation = () => {
    setHasInteracted(true)
    setAnimationRun((run) => run + 1)
  }

  return (
    <button
      className="brand-logo-button"
      type="button"
      aria-label="Animate InspoClip logo"
      title="InspoClip"
      onClick={playAnimation}
    >
      <span
        className={hasInteracted ? "brand-logo-motion is-playing" : "brand-logo-motion"}
        key={animationRun}
      >
        <img src={iconUrl} alt="" className="logo" />
        <span className="brand-logo-spark brand-logo-spark-one" aria-hidden="true" />
        <span className="brand-logo-spark brand-logo-spark-two" aria-hidden="true" />
      </span>
    </button>
  )
}
