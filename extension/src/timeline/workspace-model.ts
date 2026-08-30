import type {
  WorkspaceAsset as SharedWorkspaceAsset,
  WorkspaceDay as SharedWorkspaceDay,
  WorkspaceMonth as SharedWorkspaceMonth
} from "@inspoclip/workspace-ui"
import {
  buildIdeaDays,
  buildMonthGroups,
  buildWeekDays,
  dateKey,
  getMonday,
  groupAssetsByDate,
  initialDayIndex,
  monthKey,
  promptText,
  searchWorkspaceAssets
} from "@inspoclip/workspace-ui"

import type { Asset } from "../runtime/contracts"

/** Plugin adapter fields remain local while the presentation model is shared. */
export type WorkspaceAsset = Asset & SharedWorkspaceAsset & {
  content?: { dataUrl: string; mimeType: string }
}

export type WorkspaceDay = SharedWorkspaceDay<WorkspaceAsset>
export type WorkspaceMonth = SharedWorkspaceMonth<WorkspaceAsset>

export {
  buildIdeaDays,
  buildMonthGroups,
  buildWeekDays,
  dateKey,
  getMonday,
  groupAssetsByDate,
  initialDayIndex,
  monthKey,
  promptText,
  searchWorkspaceAssets
}

export function parseStoredValue<T>(value: string | null, fallback: T): T {
  if (value === null || value === "") return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return value as T
  }
}
