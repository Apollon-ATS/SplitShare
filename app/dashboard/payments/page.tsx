"use client"

import { useState } from "react"
import { CopyIcon, CheckIcon, HistoryIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppContext } from "@/context/app-context"
import { Badge } from "@/components/ui/badge"
import { HeaderWithWallet } from "@/components/header-with-wallet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useWallet } from "@/context/wallet-context"

// Define a payment history type
interface PaymentHistoryItem {
  id: string
  type: "sent" | "received"
  name: string
  amount: number
  subscription: string
  date: string
}

export default function PaymentsPage() {
  const { friends, subscriptions } = useAppContext()
  const { connected } = useWallet()
  const [copied, setCopied] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("crypto")
  const [selectedCrypto, setSelectedCrypto] = useState("SOL")

  const walletAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"

  // Get payment history from localStorage or use empty array for first-time users
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ats-payment-history")
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return [] // Empty array for first-time users
  })

  const copyToClipboard = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Wallet address copied to clipboard")
  }

  // Définir les frais pour chaque cryptomonnaie
  const cryptoFees = {
    BTC: 1.5,
    ETH: 1.2,
    USDC: 0.8,
    SOL: 0.5,
  }

  // Frais standard (carte de crédit)
  const standardFeePercentage = 2.5
  const amount = 10.0 // Example amount
  const standardFee = amount * (standardFeePercentage / 100)

  // Calculer les frais pour la crypto sélectionnée
  const selectedFeePercentage = cryptoFees[selectedCrypto as keyof typeof cryptoFees]
  const cryptoFee = amount * (selectedFeePercentage / 100)
  const savings = standardFee - cryptoFee
  const savingsPercentage = ((standardFee - cryptoFee) / standardFee) * 100

  const handleSendReminder = (subscriptionId: string, memberId: string) => {
    toast.success(`Reminder sent to member ${memberId} for subscription ${subscriptionId}!`)
  }

  // Function to handle sending a payment
  const handleSendPayment = () => {
    // In a real app, this would process the payment
    // For demo purposes, we'll just add it to the payment history
    const newPayment: PaymentHistoryItem = {
      id: `payment-${Date.now()}`,
      type: "sent",
      name: "Friend",
      amount: amount,
      subscription: "Subscription",
      date: new Date().toLocaleDateString(),
    }

    const updatedHistory = [...paymentHistory, newPayment]
    setPaymentHistory(updatedHistory)

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("ats-payment-history", JSON.stringify(updatedHistory))
    }

    toast.success("Payment sent successfully!")
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <HeaderWithWallet activePage="payments" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-gray-50">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-lg md:text-2xl">Payments</h1>
        </div>
        <Tabs defaultValue="send" className="space-y-4">
          <TabsList>
            <TabsTrigger value="send">Send Payment</TabsTrigger>
            <TabsTrigger value="receive">Receive Payment</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
            <TabsTrigger value="pending">Pending Payments</TabsTrigger>
          </TabsList>
          <TabsContent value="send" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Send Payment</CardTitle>
                <CardDescription>Send your share of the subscription cost to a friend</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient</Label>
                  <Input id="recipient" placeholder="Friend's wallet address or email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" type="number" placeholder="0.00" defaultValue={amount} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <div className="flex gap-4">
                    <Button
                      variant={paymentMethod === "crypto" ? "default" : "outline"}
                      onClick={() => setPaymentMethod("crypto")}
                      className={paymentMethod === "crypto" ? "bg-primary text-white hover:bg-primary/90" : ""}
                    >
                      Cryptocurrency
                    </Button>
                    <Button
                      variant={paymentMethod === "card" ? "default" : "outline"}
                      onClick={() => setPaymentMethod("card")}
                      className={paymentMethod === "card" ? "bg-primary text-white hover:bg-primary/90" : ""}
                    >
                      Credit Card
                    </Button>
                  </div>
                </div>

                {paymentMethod === "crypto" && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">Select Cryptocurrency</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        variant={selectedCrypto === "BTC" ? "default" : "outline"}
                        className={`justify-start ${selectedCrypto === "BTC" ? "bg-primary text-white hover:bg-primary/90" : ""}`}
                        onClick={() => setSelectedCrypto("BTC")}
                      >
                        Bitcoin (BTC)
                      </Button>
                      <Button
                        variant={selectedCrypto === "ETH" ? "default" : "outline"}
                        className={`justify-start ${selectedCrypto === "ETH" ? "bg-primary text-white hover:bg-primary/90" : ""}`}
                        onClick={() => setSelectedCrypto("ETH")}
                      >
                        Ethereum (ETH)
                      </Button>
                      <Button
                        variant={selectedCrypto === "USDC" ? "default" : "outline"}
                        className={`justify-start ${selectedCrypto === "USDC" ? "bg-primary text-white hover:bg-primary/90" : ""}`}
                        onClick={() => setSelectedCrypto("USDC")}
                      >
                        USD Coin (USDC)
                      </Button>
                      <Button
                        variant={selectedCrypto === "SOL" ? "default" : "outline"}
                        className={`justify-start ${selectedCrypto === "SOL" ? "bg-primary text-white hover:bg-primary/90" : ""}`}
                        onClick={() => setSelectedCrypto("SOL")}
                      >
                        Solana (SOL)
                        <Badge className="ml-2 bg-green-500 text-white">Lowest fees</Badge>
                      </Button>
                    </div>

                    <div className="mt-4 rounded-lg border p-3 bg-green-50">
                      <p className="text-sm font-medium text-green-700">
                        Save on transaction fees with {selectedCrypto}!
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-white">
                          Standard fee: ${standardFee.toFixed(2)}
                        </Badge>
                        <Badge className="bg-green-500">
                          {selectedCrypto} fee: ${cryptoFee.toFixed(2)}
                        </Badge>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        Save ${savings.toFixed(2)} ({savingsPercentage.toFixed(0)}%) on this transaction!
                      </p>
                    </div>
                  </div>
                )}

                {paymentMethod === "card" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Expiry Date</Label>
                          <Input id="expiry" placeholder="MM/YY" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvc">CVC</Label>
                          <Input id="cvc" placeholder="123" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border p-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-700">Credit Card Processing Fee</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-white">
                          Standard fee: $0.10
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Credit card payments incur a standard processing fee of $0.10 per transaction.
                      </p>
                    </div>
                  </>
                )}

                <Button className="w-full bg-primary text-white hover:bg-primary/90" onClick={handleSendPayment}>
                  Send Payment
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="receive" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Receive Payment</CardTitle>
                <CardDescription>Share your wallet address to receive payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border p-8">
                  <div className="h-48 w-48 bg-gray-100 flex items-center justify-center">
                    <img src="/placeholder.svg?height=192&width=192" alt="QR Code" className="h-full w-full" />
                  </div>
                  <div className="flex w-full items-center space-x-2">
                    <Input value={walletAddress} readOnly />
                    <Button size="icon" variant="outline" onClick={copyToClipboard}>
                      {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Share this address with friends to receive payments for subscription shares
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>View all your past payments and receipts</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="flex justify-center mb-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                        <HistoryIcon className="h-10 w-10 text-gray-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-medium ats-accent">No Payment History Yet</h3>
                    <p className="mt-2 text-gray-500 max-w-md mx-auto">
                      Your payment history will appear here once you've sent or received payments.
                    </p>
                    <Button
                      className="mt-4 bg-primary text-white hover:bg-primary/90"
                      onClick={() => document.querySelector('[data-state="inactive"][data-value="send"]')?.click()}
                    >
                      Send Your First Payment
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between border-b pb-4">
                        <div>
                          <p className="font-medium">
                            {payment.type === "sent" ? `Sent to ${payment.name}` : `Received from ${payment.name}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {payment.subscription} - ${payment.amount.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${payment.type === "sent" ? "text-red-500" : "text-green-500"}`}>
                            {payment.type === "sent" ? "-" : "+"}${payment.amount.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">{payment.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Payments</CardTitle>
                <CardDescription>These are the payments that are due from your friends.</CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptions.flatMap((sub) => sub.members.filter((member) => !member.paid && member.name !== "You"))
                  .length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No pending payments at the moment.</p>
                    {subscriptions.length === 0 && (
                      <p className="mt-2 text-sm text-gray-400">
                        Add subscriptions and invite friends to see pending payments here.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subscriptions.flatMap((sub) =>
                      sub.members
                        .filter((member) => !member.paid && member.name !== "You")
                        .map((member) => (
                          <div
                            key={`${sub.id}-${member.id}`}
                            className="flex items-center justify-between border-b pb-4"
                          >
                            <div className="flex items-center gap-4">
                              <Avatar>
                                <AvatarFallback className="bg-gray-200 text-gray-700">
                                  {member.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-sm text-gray-500">
                                  {sub.name} - ${member.share.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="bg-primary text-white hover:bg-primary/90"
                              onClick={() => handleSendReminder(sub.id, member.id)}
                            >
                              Send Reminder
                            </Button>
                          </div>
                        )),
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
