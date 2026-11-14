import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware className joiner — later utilities win on conflicting modifiers. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
