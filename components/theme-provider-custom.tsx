"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export function ThemeProviderCustom({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props} forcedTheme="light">
      {children}
    </NextThemesProvider>
  )
}
