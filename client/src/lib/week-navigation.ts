import { formatISODate, getMonday } from './utils';

export function canNavigateToNextWeek(currentDate: Date, now: Date = new Date()): boolean {
  return formatISODate(getMonday(currentDate)) < formatISODate(getMonday(now));
}
