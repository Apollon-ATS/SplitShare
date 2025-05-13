"use client"

import type React from "react"

import { useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading, isNewUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Si le chargement est terminé et que l'utilisateur n'est pas connecté
    if (!isLoading && !user && pathname !== "/login") {
      router.push("/login")
    }

    // Si l'utilisateur est connecté mais que son profil est incomplet
    if (!isLoading && user && isNewUser && pathname !== "/profile-setup") {
      router.push("/profile-setup")
    }
  }, [user, isLoading, isNewUser, router, pathname])

  // Afficher un indicateur de chargement pendant la vérification
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Si l'utilisateur n'est pas connecté, ne pas afficher le contenu
  if (!user && pathname !== "/login") {
    return null
  }

  // Si l'utilisateur est connecté mais que son profil est incomplet
  if (user && isNewUser && pathname !== "/profile-setup") {
    return null
  }

  // Sinon, afficher le contenu
  return <>{children}</>
}
