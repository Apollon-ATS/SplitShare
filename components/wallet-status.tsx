"use client"

import { useWallet } from "@/context/wallet-context"
import { formatWalletAddress } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { useState, useEffect } from "react"

export function WalletStatus() {
  const { connected, publicKey, timeoutRemaining } = useWallet()
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
      <Badge variant="outline" className="bg-gray-100 text-gray-500">
        Wallet not connected
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className="bg-green-500 text-white">{publicKey ? formatWalletAddress(publicKey) : "Connected"}</Badge>

      {timeoutDisplay && (
        <Badge
          variant="outline"
          className={`flex items-center gap-1 ${
            timeoutRemaining && timeoutRemaining < 60000
              ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
              : "bg-yellow-50 text-yellow-700 border-yellow-200"
          }`}
        >
          <Clock className="h-3 w-3" />
          {timeoutDisplay}
          {timeoutRemaining && timeoutRemaining < 60000 && (
            <span className="ml-1 text-xs font-bold">Session expiration imminent!</span>
          )}
        </Badge>
      )}
    </div>
  )
}
