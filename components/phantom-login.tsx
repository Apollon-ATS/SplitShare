"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import { useWallet } from "@/context/wallet-context"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function PhantomLogin() {
  const { connected, publicKey } = useWallet()
  const { login, registerNewUser, isLoading, isNewUser } = useAuth()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)

  const handleLogin = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first")
      return
    }

    try {
      setIsLoggingIn(true)
      console.log("Tentative de connexion avec l'adresse:", publicKey)

      // Utiliser le service d'authentification pour se connecter
      const success = await login(publicKey)

      if (success) {
        toast.success("Successfully logged in with Phantom Wallet")
        // La redirection est gérée dans le contexte d'authentification
      } else {
        // Si l'utilisateur n'existe pas, afficher le formulaire d'inscription
        setShowRegistrationForm(true)
      }
    } catch (error) {
      console.error("Erreur de connexion:", error)
      toast.error("Error during login")
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleRegister = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first")
      return
    }

    if (!username.trim()) {
      toast.error("Username is required")
      return
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address")
      return
    }

    try {
      setIsRegistering(true)
      console.log("Tentative d'enregistrement avec:", publicKey, username, email)

      // Enregistrer le nouvel utilisateur
      const success = await registerNewUser(publicKey, username, email)

      if (success) {
        toast.success("Account created successfully")
        setShowRegistrationForm(false)
        // La redirection est gérée dans le contexte d'authentification
      } else {
        toast.error("Error creating account")
      }
    } catch (error) {
      console.error("Erreur d'enregistrement:", error)
      toast.error("Error creating account")
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login with Phantom Wallet</CardTitle>
        <CardDescription>Connect using your Solana wallet to access your ATS account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4 bg-gray-50">
          <p className="text-sm text-gray-600 mb-4">
            Phantom is a secure Solana wallet that allows you to manage your cryptocurrencies and connect to
            decentralized applications.
          </p>

          <WalletConnectButton fullWidth />

          {connected && publicKey && (
            <p className="mt-4 text-sm text-green-600 text-center">
              Wallet connected!{" "}
              {showRegistrationForm ? "Complete your profile below." : 'Click "Login" to access your account.'}
            </p>
          )}
        </div>

        {showRegistrationForm && connected && publicKey && (
          <div className="space-y-4 mt-4 p-4 border rounded-lg">
            <h3 className="text-lg font-medium">Create an account</h3>
            <p className="text-sm text-gray-600">Please provide the following information to create your account.</p>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
            </div>

            <Button
              className="w-full bg-primary text-white hover:bg-primary/90"
              disabled={isRegistering || isLoading}
              onClick={handleRegister}
            >
              {isRegistering || isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create my account"
              )}
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!showRegistrationForm && (
          <Button
            className="w-full bg-primary text-white hover:bg-primary/90"
            disabled={!connected || isLoggingIn || isLoading}
            onClick={handleLogin}
          >
            {isLoggingIn || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
