import type { ChangeEvent, InputHTMLAttributes, ReactNode, Ref } from "react"

export type WorkspaceSearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "placeholder" | "aria-label"> & {
  value: string
  placeholder?: string
  label?: string
  icon?: ReactNode
  onChange: (value: string, event: ChangeEvent<HTMLInputElement>) => void
  inputRef?: Ref<HTMLInputElement>
  className?: string
  inputClassName?: string
}

export function WorkspaceSearchInput({
  value,
  placeholder = "Search",
  label = placeholder,
  icon,
  onChange,
  inputRef,
  className = "",
  inputClassName = "",
  ...inputProps
}: WorkspaceSearchInputProps) {
  return (
    <label className={className}>
      {icon}
      <input
        {...inputProps}
        ref={inputRef}
        type={inputProps.type || "search"}
        value={value}
        onChange={(event) => onChange(event.target.value, event)}
        placeholder={placeholder}
        aria-label={label}
        className={inputClassName}
      />
    </label>
  )
}
