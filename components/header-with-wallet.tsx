"use client"

import Link from "next/link"
import Image from "next/image"
import { LogOut, User, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { WalletStatus } from "@/components/wallet-status"
import { useWallet } from "@/context/wallet-context"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"

// Importer le composant NotificationsDropdown
import { NotificationsDropdown } from "@/components/notifications-dropdown"

interface HeaderWithWalletProps {
  activePage?: "dashboard" | "payments" | "friends"
}

export function HeaderWithWallet({ activePage }: HeaderWithWalletProps) {
  const { disconnectWallet } = useWallet()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      toast.success("Successfully logged out")
      router.push("/login")
    } catch (error) {
      console.error("Error during logout:", error)
    }
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-4 md:px-6">
      <Link className="flex items-center gap-2" href="#">
        <div className="logo-circle h-8 w-8">
          <Image src="/images/ats-logo.png" alt="ATS Logo" width={24} height={24} className="object-contain" />
        </div>
        <span className="font-bold ats-accent">ATS</span>
      </Link>

      {/* Navigation pour écrans moyens et grands */}
      <nav className="hidden flex-1 items-center gap-6 md:flex">
        <Link
          className={`text-sm font-medium ${
            activePage === "dashboard" ? "ats-accent" : "text-gray-600 hover:text-gray-900"
          }`}
          href="/dashboard"
        >
          Dashboard
        </Link>
        <Link
          className={`text-sm font-medium ${
            activePage === "payments" ? "ats-accent" : "text-gray-600 hover:text-gray-900"
          }`}
          href="/dashboard/payments"
        >
          Payments
        </Link>
        <Link
          className={`text-sm font-medium ${
            activePage === "friends" ? "ats-accent" : "text-gray-600 hover:text-gray-900"
          }`}
          href="/dashboard/friends"
        >
          Friends
        </Link>
      </nav>

      {/* Menu hamburger pour petits écrans */}
      <div className="md:hidden flex-1">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0" hideCloseButton={true}>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="logo-circle h-8 w-8">
                    <Image src="/images/ats-logo.png" alt="ATS Logo" width={24} height={24} className="object-contain" />
                  </div>
                  <span className="font-bold ats-accent">ATS</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <nav className="flex flex-col p-4 space-y-4">
              <Link
                className={`flex items-center p-2.5 rounded-lg ${
                  activePage === "dashboard" ? "bg-primary/10 ats-accent" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                className={`flex items-center p-2.5 rounded-lg ${
                  activePage === "payments" ? "bg-primary/10 ats-accent" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                href="/dashboard/payments"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Payments
              </Link>
              <Link
                className={`flex items-center p-2.5 rounded-lg ${
                  activePage === "friends" ? "bg-primary/10 ats-accent" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
                href="/dashboard/friends"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Friends
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center justify-end gap-4">
        <WalletStatus />
        <NotificationsDropdown />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full border-gray-300 hover:bg-gray-100">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                <AvatarFallback className="bg-gray-200 text-gray-700">
                  {user?.username?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
