import type { MouseEvent, ReactNode } from "react"

export type WorkspaceColorSwatchProps = {
  color: string
  title?: string
  label?: ReactNode
  variant?: "dot" | "item"
  className?: string
  swatchClassName?: string
  labelClassName?: string
  onSelect?: (color: string, event: MouseEvent<HTMLButtonElement>) => void
}

export function WorkspaceColorSwatch({
  color,
  title = color.toUpperCase(),
  label,
  variant = "dot",
  className = "",
  swatchClassName = "",
  labelClassName = "",
  onSelect
}: WorkspaceColorSwatchProps) {
  if (variant === "item") {
    return (
      <button type="button" title={title} className={className} onClick={(event) => onSelect?.(color, event)}>
        <span className={swatchClassName} style={{ backgroundColor: color }} />
        {label ? <span className={labelClassName}>{label}</span> : null}
      </button>
    )
  }

  if (onSelect) {
    return <button type="button" title={title} className={className} style={{ backgroundColor: color }} onClick={(event) => onSelect(color, event)} />
  }

  return <span title={title} className={className} style={{ backgroundColor: color }} />
}
