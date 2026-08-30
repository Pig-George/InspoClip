import type { ButtonHTMLAttributes, ReactNode } from "react"

export type WorkspaceIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label" | "title"> & {
  label: string
  icon: ReactNode
  className?: string
  iconClassName?: string
  showLabelOnHover?: boolean
}

export function WorkspaceIconButton({
  label,
  icon,
  className = "",
  iconClassName = "",
  showLabelOnHover = false,
  ...buttonProps
}: WorkspaceIconButtonProps) {
  return (
    <button {...buttonProps} type={buttonProps.type || "button"} className={`${className}${showLabelOnHover ? " workspace-icon-button-hover-label" : ""}`} aria-label={label} title={label}>
      <span className={iconClassName}>{icon}</span>
      {showLabelOnHover ? <span className="workspace-icon-button-label">{label}</span> : null}
    </button>
  )
}
