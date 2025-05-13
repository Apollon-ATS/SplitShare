"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/context/wallet-context"
import { Loader2 } from "lucide-react"
import { formatWalletAddress } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface WalletConnectButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  fullWidth?: boolean
}

export function WalletConnectButton({
  variant = "default",
  size = "default",
  className = "",
  fullWidth = false,
}: WalletConnectButtonProps) {
  const { connected, publicKey, connecting, connectWallet, disconnectWallet, timeoutRemaining, wallet } = useWallet()
  const [timeoutDisplay, setTimeoutDisplay] = useState<string | null>(null)

  // Formater le temps restant pour l'affichage
  useEffect(() => {
    if (timeoutRemaining === null) {
      setTimeoutDisplay(null)
      return
    }

    const minutes = Math.floor(timeoutRemaining / 60000)
    const seconds = Math.floor((timeoutRemaining % 60000) / 1000)
    setTimeoutDisplay(`${minutes}:${seconds.toString().padStart(2, "0")}`)
  }, [timeoutRemaining])

  if (!connected) {
    return (
      <Button
        variant={variant}
        size={size}
        className={`${className} ${fullWidth ? "w-full" : ""} bg-primary text-white hover:bg-primary/90`}
        onClick={() => {
          if (!wallet) {
            // Rediriger vers l'extension Phantom si le wallet n'est pas installé
            window.open("https://phantom.app/", "_blank")
            return
          }
          connectWallet()
        }}
        disabled={connecting}
      >
        {connecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connexion...
          </>
        ) : (
          "Connecter Phantom Wallet"
        )}
      </Button>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size={size}
            className={`${className} ${fullWidth ? "w-full" : ""} border-primary/30 text-primary hover:bg-primary/5`}
            onClick={disconnectWallet}
          >
            {publicKey ? formatWalletAddress(publicKey) : "Wallet connecté"}
            {timeoutDisplay && <span className="ml-2 text-xs text-gray-500">({timeoutDisplay})</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Cliquez pour déconnecter votre wallet</p>
          {timeoutDisplay && <p className="text-xs">Session expire dans: {timeoutDisplay}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
