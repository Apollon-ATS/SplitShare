"use client"

import { useState, useEffect } from "react"
import { Plus, UserPlus, UserCheck, UserX, Send, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AddFriendForm } from "@/components/add-friend-form"
import { HeaderWithWallet } from "@/components/header-with-wallet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/context/auth-context"
import { useNotifications } from "@/context/notification-context"
import { FriendService, type FriendRequest } from "@/services/friend-service"
import type { User } from "@/services/auth-service"
import { createClientComponentClient } from "@/lib/supabase"

export default function FriendsPage() {
  const { user } = useAuth()
  const { notifications } = useNotifications()
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false)
  const [friendIdentifier, setFriendIdentifier] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [friends, setFriends] = useState<User[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [friendshipUpdated, setFriendshipUpdated] = useState(false)

  // Charger les amis et les demandes en attente
  const loadFriendsData = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      // Charger les amis
      const friendsData = await FriendService.getFriends(user.id)
      setFriends(friendsData)

      // Charger les demandes en attente
      const pendingData = await FriendService.getPendingFriendRequests(user.id)
      setPendingRequests(pendingData)
      
      // Show the update indicator briefly when data is refreshed due to real-time event
      if (friendshipUpdated) {
        setTimeout(() => {
          setFriendshipUpdated(false)
        }, 2000)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des amis:", error)
      setError("Error loading friends: Veuillez réessayer.")
      toast.error("Erreur lors du chargement des amis")
    } finally {
      setIsLoading(false)
    }
  }

  // Charger les données au chargement de la page
  useEffect(() => {
    loadFriendsData()
  }, [user])

  // S'abonner aux changements des amitiés pour mettre à jour l'interface
  useEffect(() => {
    if (!user) return
    
    console.log("Setting up friend changes subscription in friends page")
    
    // S'abonner aux événements de changement d'amitié avec un traitement optimisé
    const unsubscribe = FriendService.subscribeToFriendshipEvents(() => {
      console.log("Friend change detected, updating friend lists")
      // Show update indicator
      setFriendshipUpdated(true)
      // Mettre un petit délai pour laisser le temps aux transactions DB de se terminer
      setTimeout(() => {
        console.log("Refreshing friends list after friendship change")
        loadFriendsData()
      }, 200)
    })
    
    // Se désabonner quand le composant est démonté
    return () => {
      console.log("Cleaning up friend changes subscription")
      unsubscribe()
    }
  }, [user])

  // Watch for friend removal notifications specifically
  useEffect(() => {
    // Skip if no user or no notifications
    if (!user || !notifications.length) return
    
    // Check for friend_removed notifications
    const friendRemovedNotification = notifications.find(
      (notif) => notif.type === "friend_removed" && !notif.read
    )
    
    if (friendRemovedNotification) {
      console.log("Friend removal notification detected, updating friend list")
      
      // Mark the notification as active to show the update indicator
      setFriendshipUpdated(true)
      
      // Update immediately without waiting for the subscription
      loadFriendsData()
    }
  }, [notifications, user])

  // Fonction pour envoyer une requête d'ami
  const handleSendFriendRequest = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour ajouter un ami")
      return
    }

    if (!friendIdentifier.trim()) {
      toast.error("Veuillez entrer une adresse email ou une adresse de wallet valide")
      return
    }

    setIsSending(true)
    setError(null)

    try {
      const success = await FriendService.sendFriendRequest(user.id, friendIdentifier.trim())

      if (success) {
        toast.success("Invitation envoyée avec succès")
        setFriendIdentifier("")
      } else {
        setError("Erreur lors de l'envoi de l'invitation. Vérifiez l'adresse ou l'email.")
        toast.error("Erreur lors de l'envoi de l'invitation")
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'invitation:", error)
      setError("Une erreur s'est produite lors de l'envoi de l'invitation.")
      toast.error("Erreur lors de l'envoi de l'invitation")
    } finally {
      setIsSending(false)
    }
  }

  // Fonction pour accepter une requête d'ami
  const handleAcceptFriendRequest = async (requestId: string) => {
    try {
      const success = await FriendService.acceptFriendRequest(requestId)

      if (success) {
        toast.success("Invitation acceptée")

        // Mettre à jour les listes
        setPendingRequests((prev) => prev.filter((req) => req.id !== requestId))

        // Recharger la liste des amis
        if (user) {
          const updatedFriends = await FriendService.getFriends(user.id)
          setFriends(updatedFriends)
        }
      } else {
        toast.error("Erreur lors de l'acceptation de l'invitation")
      }
    } catch (error) {
      console.error("Erreur lors de l'acceptation de l'invitation:", error)
      toast.error("Erreur lors de l'acceptation de l'invitation")
    }
  }

  // Fonction pour rejeter une requête d'ami
  const handleRejectFriendRequest = async (requestId: string) => {
    try {
      const success = await FriendService.rejectFriendRequest(requestId)

      if (success) {
        toast.success("Invitation refusée")

        // Mettre à jour la liste des demandes en attente
        setPendingRequests((prev) => prev.filter((req) => req.id !== requestId))
      } else {
        toast.error("Erreur lors du refus de l'invitation")
      }
    } catch (error) {
      console.error("Erreur lors du refus de l'invitation:", error)
      toast.error("Erreur lors du refus de l'invitation")
    }
  }

  // Fonction pour supprimer un ami
   const handleRemoveFriend = async (friendId: string) => {
    if (!user) return

    try {
      // Show loading state
      setIsLoading(true)

      // Call the FriendService to remove the friendship
      const success = await FriendService.removeFriend(user.id, friendId)

      if (success) {
        // Update the local state to remove the friend immediately for a responsive UI
        setFriends((prev) => prev.filter((friend) => friend.id !== friendId))
        toast.success("Friend removed successfully")
        
        console.log("Friend removed, UI updated immediately")
        // No need to manually reload friends list here as the subscription will handle it
        // after the real-time notification
      } else {
        toast.error("Error removing friend")
      }
    } catch (error) {
      console.error("Error removing friend:", error)
      toast.error("Error removing friend")
    } finally {
      // End loading state
      setIsLoading(false)
    }
  }

  // Fonction pour ajouter un ami via le formulaire
  const handleAddFriend = async (data: any) => {
    if (!user) {
      toast.error("Vous devez être connecté pour ajouter un ami")
      return
    }

    setIsSending(true)
    setError(null)

    try {
      const success = await FriendService.sendFriendRequest(user.id, data.email)

      if (success) {
        toast.success(`Invitation envoyée à ${data.email}`)
        setIsAddFriendOpen(false)
      } else {
        setError("Erreur lors de l'envoi de l'invitation. Vérifiez l'adresse email.")
        toast.error("Erreur lors de l'envoi de l'invitation")
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'invitation:", error)
      setError("Une erreur s'est produite lors de l'envoi de l'invitation.")
      toast.error("Erreur lors de l'envoi de l'invitation")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <HeaderWithWallet activePage="friends" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-gray-50">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-lg md:text-2xl">Friends</h1>
          <Button className="bg-primary text-white hover:bg-primary/90" onClick={() => setIsAddFriendOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Friend
          </Button>
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Input
              placeholder="Enter valid email"
              value={friendIdentifier}
              onChange={(e) => setFriendIdentifier(e.target.value)}
            />
          </div>
          <Button
            className="bg-primary text-white hover:bg-primary/90"
            onClick={handleSendFriendRequest}
            disabled={isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                 Send invitation
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="friends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="friends" className="data-[state=active]:bg-primary data-[state=active]:text-white">
             My friends 
             {friendshipUpdated && (
                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
             )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Invitations
              {pendingRequests.length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{pendingRequests.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                    <UserPlus className="h-10 w-10 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-xl font-medium ats-accent">No Friends Added Yet</h3>
                <p className="mt-2 text-gray-500 max-w-md mx-auto">
                  You haven't added any friends yet. Add friends to start splitting subscription costs with them.
                </p>
                <Button
                  className="mt-4 bg-primary text-white hover:bg-primary/90"
                  onClick={() => setIsAddFriendOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Your First Friend
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {friends.map((friend) => (
                  <Card key={friend.id}>
                    <CardHeader className="flex flex-row items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{friend.username?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle>{friend.username || "Utilisateur"}</CardTitle>
                        <CardDescription>{friend.email || friend.walletAddress}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Wallet Address:</span>
                          <span className="text-sm font-medium">
                            {friend.walletAddress.substring(0, 6)}...
                            {friend.walletAddress.substring(friend.walletAddress.length - 4)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        Remove
                      </Button>
                      <Button variant="outline" size="sm">
                        Send Payment
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                <Card className="flex h-full flex-col items-center justify-center p-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                    <Plus className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-xl font-medium">Add Friend</h3>
                  <p className="mb-4 mt-2 text-center text-sm text-muted-foreground">
                    Add a new friend to split subscription costs with.
                  </p>
                  <Button
                    className="bg-primary text-white hover:bg-primary/90"
                    onClick={() => setIsAddFriendOpen(true)}
                  >
                    Add Friend
                  </Button>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                    <UserCheck className="h-10 w-10 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-xl font-medium ats-accent">No pending invitations</h3>
                <p className="mt-2 text-gray-500 max-w-md mx-auto">
				  You dont have invitations yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader className="flex flex-row items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{request.friend?.username?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle>{request.friend?.username || "Utilisateur"}</CardTitle>
                        <CardDescription>{request.friend?.email || request.friend?.walletAddress}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          <Badge className="bg-yellow-500">Waiting</Badge>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectFriendRequest(request.id)}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <UserX className="mr-2 h-4 w-4" />
                         refuse 
                      </Button>
                      <Button
                        size="sm"
                        className="bg-primary text-white hover:bg-primary/90"
                        onClick={() => handleAcceptFriendRequest(request.id)}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
						 accept
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Friend Dialog */}
      <Dialog open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Friend</DialogTitle>
            <DialogDescription>Add a friend to split subscription costs with.</DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <AddFriendForm onSubmit={handleAddFriend} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
