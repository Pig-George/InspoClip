export interface Image {
  id: string;
  weekId: string;
  dayOfWeek: number;
  filePath: string;
  thumbnailPath: string | null;
  decoration: DecorationType;
  createdAt: string;
  terms: Term[];
  tags: Tag[];
  colors: string[];
}

export interface Term {
  id: string;
  imageId: string;
  keyword: string;
  position: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt?: string;
}

export interface Week {
  id: string;
  weekStart: string;
  createdAt: string;
}

export interface Note {
  id: string;
  weekId: string;
  content: string;
  updatedAt: string;
}

export interface WeekData {
  week: Week;
  images: Image[];
  notes: Note | null;
}

export type DecorationType = 'tape' | 'pin' | 'clip' | 'washi' | 'stitch' | 'staple' | 'sticker' | 'corner';

export type DayName =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export type ViewMode = 'day' | 'week' | 'timeline';

export const ALL_DAYS: { dayOfWeek: number; dayName: DayName }[] = [
  { dayOfWeek: 0, dayName: 'Monday' },
  { dayOfWeek: 1, dayName: 'Tuesday' },
  { dayOfWeek: 2, dayName: 'Wednesday' },
  { dayOfWeek: 3, dayName: 'Thursday' },
  { dayOfWeek: 4, dayName: 'Friday' },
  { dayOfWeek: 5, dayName: 'Saturday' },
  { dayOfWeek: 6, dayName: 'Sunday' },
];

export function getTodayIndex(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1; // Mon=0, Sun=6
}
