"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CopyIcon, CheckIcon } from "lucide-react"

interface CryptoPaymentWidgetProps {
  amount: number
  recipientName: string
  subscriptionName: string
}

export function CryptoPaymentWidget({ amount, recipientName, subscriptionName }: CryptoPaymentWidgetProps) {
  const [copied, setCopied] = useState(false)
  const [selectedCrypto, setSelectedCrypto] = useState("ETH")

  const walletAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"

  const copyToClipboard = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay {recipientName}</CardTitle>
        <CardDescription>
          Send ${amount.toFixed(2)} for {subscriptionName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium">Select Cryptocurrency</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant={selectedCrypto === "BTC" ? "default" : "outline"}
              className={`justify-start ${selectedCrypto === "BTC" ? "bg-primary text-white hover:bg-primary/90" : ""}`}
              onClick={() => setSelectedCrypto("BTC")}
            >
              <img src="/placeholder.svg?height=20&width=20" alt="BTC" className="mr-2 h-5 w-5" />
              Bitcoin (BTC)
            </Button>
            <Button
              variant={selectedCrypto === "ETH" ? "default" : "outline"}
              className={`justify-start ${selectedCrypto === "ETH" ? "bg-primary text-white hover:bg-primary/90" : ""}`}
              onClick={() => setSelectedCrypto("ETH")}
            >
              <img src="/placeholder.svg?height=20&width=20" alt="ETH" className="mr-2 h-5 w-5" />
              Ethereum (ETH)
            </Button>
            <Button
              variant={selectedCrypto === "USDC" ? "default" : "outline"}
              className={`justify-start ${selectedCrypto === "USDC" ? "bg-primary text-white hover:bg-primary/90" : ""}`}
              onClick={() => setSelectedCrypto("USDC")}
            >
              <img src="/placeholder.svg?height=20&width=20" alt="USDC" className="mr-2 h-5 w-5" />
              USD Coin (USDC)
            </Button>
            <Button
              variant={selectedCrypto === "SOL" ? "default" : "outline"}
              className={`justify-start ${selectedCrypto === "SOL" ? "bg-primary text-white hover:bg-primary/90" : ""}`}
              onClick={() => setSelectedCrypto("SOL")}
            >
              <img src="/placeholder.svg?height=20&width=20" alt="SOL" className="mr-2 h-5 w-5" />
              Solana (SOL)
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border p-4">
          <div className="h-48 w-48 bg-gray-100 flex items-center justify-center">
            <img src="/placeholder.svg?height=192&width=192" alt="QR Code" className="h-full w-full" />
          </div>
          <div className="flex w-full items-center space-x-2">
            <Input value={walletAddress} readOnly />
            <Button size="icon" variant="outline" onClick={copyToClipboard}>
              {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            </Button>
          </div>
          <div className="text-center">
            <p className="font-medium">
              Send {selectedCrypto === "USDC" ? "$" : ""}
              {amount.toFixed(2)} {selectedCrypto !== "USDC" ? selectedCrypto : ""}
            </p>
            <p className="text-sm text-muted-foreground">Send exactly this amount to complete your payment</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" variant="outline">
          I've Sent the Payment
        </Button>
      </CardFooter>
    </Card>
  )
}
