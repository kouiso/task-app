import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeAvatarValue(avatar: string | null | undefined): string | null {
  if (!avatar || avatar === '') return null;
  return avatar;
}
