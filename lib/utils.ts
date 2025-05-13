import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWalletAddress(address: string, startChars = 3, endChars = 3): string {
  if (!address) return ""
  if (address.length <= startChars + endChars) return address

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}
