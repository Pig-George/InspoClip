export function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function getExtensionDayOfWeek(date: Date): number {
  const dow = date.getDay()
  return dow === 0 ? 6 : dow - 1
}
