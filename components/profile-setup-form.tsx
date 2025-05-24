"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import { useWallet } from "@/context/wallet-context"

export function ProfileSetupForm() {
  const { user, updateUserProfile } = useAuth()
  const { connected, publicKey } = useWallet()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
  })
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.username.trim()) {
      toast.error("Username is required")
      return
    }
    if (!connected || !publicKey) {
      toast.error("You must connect your Phantom wallet to complete setup.")
      return
    }
    if (!user) {
      toast.error("User not found. Please log in again.")
      return
    }
    setIsSubmitting(true)
    try {
      const supabase = (await import("@/lib/supabase")).createClientComponentClient();
      const { data: existing, error: supabaseError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", publicKey)
        .maybeSingle();

      if (existing && existing.id !== user.id) {
        setError("This wallet is already linked to another account.");
        setIsSubmitting(false);
        return;
      }

      const success = await updateUserProfile(formData.username, formData.email)
      let walletOk = true
      if (user?.walletAddress !== publicKey) {
        try {
          const { error: walletError } = await supabase
            .from("users")
            .update({ wallet_address: publicKey })
            .eq("id", user.id);
          if (walletError) {
            toast.error("Error updating wallet address")
            setIsSubmitting(false)
            return
          }
        } catch (err) {
          toast.error("Error updating wallet address")
          setIsSubmitting(false)
          return
        }
      }
      if (success || walletOk) {
        toast.success("Profile set up successfully")
        router.push("/dashboard")
      } else {
        toast.error("Error setting up profile")
      }
    } catch (error) {
      console.error("Erreur lors de la configuration du profil:", error)
      toast.error("Error setting up profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 relative">
      <div className="absolute inset-0 geometric-bg"></div>
      <Card className="w-full max-w-md relative z-10">
        <CardHeader>
          <CardTitle>Set up your profile</CardTitle>
          <CardDescription>Please provide some information to complete your registration</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="Your username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500">
                Your email allows us to send you important notifications regarding your shared subscriptions
              </p>
            </div>
            <div className="space-y-2">
              <Label>Phantom Wallet</Label>
              <div className="flex items-center gap-2">
                <Input value={connected && publicKey ? publicKey : "Not connected"} readOnly className="flex-1" />
                <WalletConnectButton />
              </div>
              <p className="text-xs text-gray-500">You must connect your Phantom wallet to complete your profile setup.</p>
            </div>
            {error && (
              <div className="text-red-500 text-sm">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-primary text-white hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Complete setup"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
