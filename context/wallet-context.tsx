"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { toast } from "sonner"

// Types pour Phantom Wallet
type PhantomEvent = "connect" | "disconnect" | "accountChanged"

interface PhantomProvider {
  connect: () => Promise<{ publicKey: { toString: () => string } }>
  disconnect: () => Promise<void>
  on: (event: PhantomEvent, callback: () => void) => void
  isPhantom: boolean
  isConnected: boolean
  publicKey: { toString: () => string } | null
}

type WindowWithSolana = Window & {
  solana?: PhantomProvider
  phantom?: {
    solana?: PhantomProvider
  }
}

interface WalletContextType {
  wallet: PhantomProvider | null
  connected: boolean
  publicKey: string | null
  connecting: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => Promise<void>
  timeoutRemaining: number | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<PhantomProvider | null>(null)
  const [connected, setConnected] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [timeoutRemaining, setTimeoutRemaining] = useState<number | null>(null)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)

  // Fonction pour se déconnecter du wallet (définie avec useCallback pour éviter les dépendances circulaires)
  const disconnectWallet = useCallback(async () => {
    if (wallet) {
      try {
        await wallet.disconnect()
        setPublicKey(null)
        setConnected(false)

        // Annuler le timeout et l'intervalle
        if (timeoutId) {
          clearTimeout(timeoutId)
          setTimeoutId(null)
        }

        if (intervalId) {
          clearInterval(intervalId)
          setIntervalId(null)
        }

        setTimeoutRemaining(null)
      } catch (error) {
        console.error("Erreur de déconnexion:", error)
        toast.error("Error disconnecting wallet")
      }
    }
  }, [wallet, timeoutId, intervalId])

  // Vérifier si Phantom est disponible
  useEffect(() => {
    const getProvider = (): PhantomProvider | null => {
      if (typeof window !== "undefined") {
        const win = window as WindowWithSolana

        // Vérifier si Phantom est installé
        if (win.phantom?.solana?.isPhantom) {
          return win.phantom.solana
        }

        if (win.solana?.isPhantom) {
          return win.solana
        }
      }
      return null
    }

    const provider = getProvider()
    setWallet(provider)

    // Vérifier si l'utilisateur est déjà connecté
    if (provider && provider.isConnected) {
      setConnected(true)
      if (provider.publicKey) {
        setPublicKey(provider.publicKey.toString())
      }
    }
  }, [])

  // Gérer les événements de connexion/déconnexion
  useEffect(() => {
    if (wallet) {
      wallet.on("connect", () => {
        if (wallet.publicKey) {
          setPublicKey(wallet.publicKey.toString())
        }
        setConnected(true)
        toast.success("Wallet connected successfully!")
      })

      wallet.on("disconnect", () => {
        setPublicKey(null)
        setConnected(false)
        toast.info("Wallet disconnected")

        // Annuler le timeout et l'intervalle
        if (timeoutId) {
          clearTimeout(timeoutId)
          setTimeoutId(null)
        }

        if (intervalId) {
          clearInterval(intervalId)
          setIntervalId(null)
        }

        setTimeoutRemaining(null)
      })

      wallet.on("accountChanged", () => {
        if (wallet.publicKey) {
          setPublicKey(wallet.publicKey.toString())
          toast.info("Wallet account changed")
        } else {
          setPublicKey(null)
          setConnected(false)
        }
      })
    }
  }, [wallet, timeoutId, intervalId])

  // Fonction pour se connecter au wallet
  const connectWallet = async () => {
    if (!wallet) {
      toast.error("Phantom Wallet is not installed!")
      window.open("https://phantom.app/", "_blank")
      return
    }

    try {
      setConnecting(true)
      const response = await wallet.connect()
      setPublicKey(response.publicKey.toString())
      setConnected(true)

      // Définir un timeout de 10 minutes (600000 ms)
      const timeout = 600000
      setTimeoutRemaining(timeout)

      // Annuler les anciens timers s'ils existent
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      if (intervalId) {
        clearInterval(intervalId)
      }

      // Créer un intervalle pour mettre à jour le temps restant
      const newIntervalId = setInterval(() => {
        setTimeoutRemaining((prev) => {
          if (prev === null || prev <= 1000) {
            clearInterval(newIntervalId)
            disconnectWallet()
            toast.warning("Session expired")

            // Rediriger vers la page de login
            if (typeof window !== "undefined") {
              window.location.href = "/login"
            }

            return null
          }
          return prev - 1000
        })
      }, 1000)

      setIntervalId(newIntervalId)

      // Définir le timeout pour la déconnexion automatique
      const newTimeoutId = setTimeout(() => {
        disconnectWallet()
        toast.warning("Session expired after 10 minutes of inactivity")

        // Rediriger vers la page de login
        if (typeof window !== "undefined") {
          window.location.href = "/login"
        }
      }, timeout)

      setTimeoutId(newTimeoutId)
    } catch (error) {
      console.error("Erreur de connexion:", error)
      toast.error("Error connecting to wallet")
    } finally {
      setConnecting(false)
    }
  }

  // Fonction pour vérifier si le timeout est expiré sur toutes les pages
  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    if (connected && publicKey) {
      // Vérifier si un timeout est déjà défini
      if (!timeoutId) {
        // Définir un timeout de 10 minutes (600000 ms)
        const timeout = 600000
        setTimeoutRemaining(timeout)

        // Annuler l'ancien intervalle s'il existe
        if (intervalId) {
          clearInterval(intervalId)
        }

        // Créer un intervalle pour mettre à jour le temps restant
        const newIntervalId = setInterval(() => {
          setTimeoutRemaining((prev) => {
            if (prev === null || prev <= 1000) {
              clearInterval(newIntervalId)
              disconnectWallet()
              toast.warning("Session expired")

              // Rediriger vers la page de login
              if (typeof window !== "undefined") {
                window.location.href = "/login"
              }

              return null
            }
            return prev - 1000
          })
        }, 1000)

        setIntervalId(newIntervalId)

        // Définir le timeout pour la déconnexion automatique
        const newTimeoutId = setTimeout(() => {
          disconnectWallet()
          toast.warning("Session expired after 10 minutes of inactivity")

          // Rediriger vers la page de login
          if (typeof window !== "undefined") {
            window.location.href = "/login"
          }
        }, timeout)

        setTimeoutId(newTimeoutId)
      }
    }
  }, [connected, publicKey, disconnectWallet, timeoutId, intervalId])

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connected,
        publicKey,
        connecting,
        connectWallet,
        disconnectWallet,
        timeoutRemaining,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used inside a WalletProvider")
  }
  return context
}
