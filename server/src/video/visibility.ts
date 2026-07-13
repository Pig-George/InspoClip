export type VideoVisibilityRecord = {
  isSaved?: boolean;
};

export function visibleSavedVideos<T extends VideoVisibilityRecord>(records: T[]): T[] {
  return records.filter((record) => record.isSaved !== false);
}
