"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useWallet } from "@/context/wallet-context"
import { AuthService, type User } from "@/services/auth-service"
import { toast } from "sonner"
import { useRouter, usePathname } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase"
import { FriendService } from "@/services/friend-service"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isNewUser: boolean
  login: (walletAddress: string) => Promise<boolean>
  registerNewUser: (walletAddress: string, username: string, email: string) => Promise<boolean>
  logout: () => void
  updateUserProfile: (username?: string, email?: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { connected, publicKey, disconnectWallet } = useWallet()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNewUser, setIsNewUser] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Vérifier l'authentification au chargement et quand le wallet change
  useEffect(() => {
    const supabase = createClientComponentClient()

    // Vérifier s'il y a un utilisateur connecté
    const checkUser = async () => {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Récupérer les informations de l'utilisateur
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (!error && data) {
          const userData: User = {
            id: data.id,
            username: data.username,
            email: data.email,
            walletAddress: data.wallet_address,
            avatarUrl: data.avatar_url,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          }
          setUser(userData)
          
          // Initialiser l'abonnement aux événements d'amitié en temps réel
          FriendService.setupRealtimeSubscription(userData.id)
        } else {
          setUser(null)
          console.error("Error retrieving user:", error)
        }
      } else {
        setUser(null)
      }
      
      setIsLoading(false)
    }

    // Vérifier l'utilisateur au chargement
    checkUser()

    // S'abonner aux changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event)
      
      if (event === "SIGNED_IN" && session) {
        // Récupérer les informations de l'utilisateur
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (!error && data) {
          const userData: User = {
            id: data.id,
            username: data.username,
            email: data.email,
            walletAddress: data.wallet_address,
            avatarUrl: data.avatar_url,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          }
          setUser(userData)
          
          // Initialiser l'abonnement aux événements d'amitié en temps réel
          FriendService.setupRealtimeSubscription(userData.id)
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null)
      }
    })

    // Nettoyer l'abonnement
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Fonction de connexion pour les utilisateurs existants
  const login = async (walletAddress: string): Promise<boolean> => {
    setIsLoading(true)

    try {
      console.log("Attempting to log in with:", walletAddress)
      // Vérifier si l'utilisateur existe
      const userData = await AuthService.getUserByWalletAddress(walletAddress)

      if (userData) {
        console.log("Existing user found, direct login:", userData)
        setUser(userData)
        setIsNewUser(false)
        setIsLoading(false)

        // Rediriger vers le tableau de bord
        router.push("/dashboard")
        return true
      } else {
        console.log("User not found, this is a new user")
        setUser(null)
        setIsNewUser(true)
        setIsLoading(false)

        // Ne pas rediriger, laisser l'interface demander les informations
        toast.info("Please complete your profile to create an account")
        return false
      }
    } catch (error) {
      console.error("Error during login:", error)
      toast.error("Error during login")
      setIsLoading(false)
      return false
    }
  }

  // Fonction d'enregistrement pour les nouveaux utilisateurs
  const registerNewUser = async (walletAddress: string, username: string, email: string): Promise<boolean> => {
    setIsLoading(true)

    try {
      console.log("Attempting to register for:", walletAddress)

      if (!username || !email) {
        toast.error("Username and email are required")
        setIsLoading(false)
        return false
      }

      const userData = await AuthService.registerOrUpdateUser(walletAddress, username, email)

      if (userData) {
        console.log("New user registered:", userData)
        setUser(userData)
        setIsNewUser(false)
        setIsLoading(false)

        // Rediriger vers le tableau de bord
        router.push("/dashboard")
        toast.success("Account created successfully")
        return true
      } else {
        console.error("Failed to register user")
        toast.error("Error creating account")
        setIsLoading(false)
        return false
      }
    } catch (error) {
      console.error("Registration error:", error)
      toast.error("Error creating account")
      setIsLoading(false)
      return false
    }
  }

  // Fonction de déconnexion
  const logout = async () => {
    try {
      await disconnectWallet()
      setUser(null)
      setIsNewUser(false)
      router.push("/login")
    } catch (error) {
      console.error("Error during logout:", error)
    }
  }

  // Fonction de mise à jour du profil
  const updateUserProfile = async (username?: string, email?: string): Promise<boolean> => {
    if (!user || !user.walletAddress) {
      toast.error("You must be logged in to update your profile")
      return false
    }

    try {
      const updatedUser = await AuthService.registerOrUpdateUser(user.walletAddress, username, email)

      if (updatedUser) {
        setUser(updatedUser)
        setIsNewUser(false)
        toast.success("Profile updated successfully")
        return true
      } else {
        toast.error("Error updating profile")
        return false
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Error updating profile")
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isNewUser,
        login,
        registerNewUser,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useAuth must be used inside an AuthProvider")
  }

  return context
}
