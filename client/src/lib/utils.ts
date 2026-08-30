import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { dateKey, getMonday as sharedGetMonday } from '@inspoclip/workspace-ui';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getMonday = sharedGetMonday;

export function formatDateRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString('en-US', opts)} - ${sunday.toLocaleDateString('en-US', opts)}`;
}

export function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.ceil((diff / (1000 * 60 * 60 * 24) + start.getDay() + 1) / 7);
}

export const formatISODate = dateKey;
