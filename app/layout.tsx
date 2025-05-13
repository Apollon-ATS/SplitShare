import type React from "react"
import "@/app/globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProviderCustom } from "@/components/theme-provider-custom"
import { AppProvider } from "@/context/app-context"
import { WalletProvider } from "@/context/wallet-context"
import { AuthProvider } from "@/context/auth-context"
import { NotificationProvider } from "@/context/notification-context"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ATS - Split Subscriptions with Crypto",
  description: "Easily manage and split your subscription costs with friends using cryptocurrency payments.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProviderCustom>
          <WalletProvider>
            <AuthProvider>
              <NotificationProvider>
                <AppProvider>
                  {children}
                  <Toaster position="top-center" />
                </AppProvider>
              </NotificationProvider>
            </AuthProvider>
          </WalletProvider>
        </ThemeProviderCustom>
      </body>
    </html>
  )
}
