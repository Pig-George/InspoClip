import type { StatusMessage } from "../types"

type StatusBannerProps = {
  status: StatusMessage | null
}

export function StatusBanner({ status }: StatusBannerProps) {
  return <div className={`status ${status ? `${status.type} visible` : ""}`}>{status?.message}</div>
}
