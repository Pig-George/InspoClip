import type { StatusMessage } from "../types"
import { PopupIcon } from "./PopupIcon"

type StatusBannerProps = {
  status: StatusMessage | null
}

export function StatusBanner({ status }: StatusBannerProps) {
  return (
    <div className={`status-toast ${status ? `${status.type} visible` : ""}`} role="status">
      {status ? <PopupIcon name={status.type === "success" ? "circle-check" : "radio-tower"} /> : null}
      <span>{status?.message}</span>
    </div>
  )
}
