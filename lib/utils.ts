import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string or Date object to a consistent display format
 * Handles both ISO strings and Date objects
 * @param date - ISO string or Date object
 * @param formatStr - Optional format string (default: 'MMM d, yyyy')
 * @returns Formatted date string
 */
export function formatDate(date: string | Date | undefined, formatStr: string = 'MMM d, yyyy'): string {
  if (!date) return '-'
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatStr)
  } catch (error) {
    console.error('[v0] Date formatting error:', { date, error })
    return '-'
  }
}

/**
 * Format a date and time to display format
 * @param date - ISO string or Date object
 * @returns Formatted date and time string (e.g., "Jan 15, 2024 3:30 PM")
 */
export function formatDateTime(date: string | Date | undefined): string {
  if (!date) return '-'
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, 'MMM d, yyyy h:mm a')
  } catch (error) {
    console.error('[v0] DateTime formatting error:', { date, error })
    return '-'
  }
}

/**
 * Format a date relative to now (e.g., "2 hours ago")
 * @param date - ISO string or Date object
 * @returns Relative date string
 */
export function formatRelativeDate(date: string | Date | undefined): string {
  if (!date) return '-'
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(dateObj, { addSuffix: true })
  } catch (error) {
    console.error('[v0] Relative date formatting error:', { date, error })
    return '-'
  }
}

/**
 * Format a time only
 * @param date - ISO string or Date object
 * @returns Time string (e.g., "3:30 PM")
 */
export function formatTime(date: string | Date | undefined): string {
  if (!date) return '-'
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, 'h:mm a')
  } catch (error) {
    console.error('[v0] Time formatting error:', { date, error })
    return '-'
  }
}
