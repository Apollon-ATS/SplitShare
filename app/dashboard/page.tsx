"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, Plus, History } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddSubscriptionForm } from "@/components/add-subscription-form"
import { AddFriendForm } from "@/components/add-friend-form"
import { ManageSubscriptionModal } from "@/components/manage-subscription-modal"
import { useAppContext } from "@/context/app-context"
import { useWallet } from "@/context/wallet-context"
import { HeaderWithWallet } from "@/components/header-with-wallet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClientComponentClient } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { SubscriptionService, type Subscription as DBSubscription, type SubscriptionMember } from "@/services/subscription-service"

// Function to convert database subscription format to app context format
function convertDBSubscriptionToAppFormat(dbSubscription: DBSubscription): any {
  return {
    id: dbSubscription.id,
    name: dbSubscription.name,
    cost: dbSubscription.cost,
    dueDate: dbSubscription.dueDate,
    ownerId: dbSubscription.ownerId,
    members: dbSubscription.members ? dbSubscription.members.map(member => ({
      id: member.userId,
      name: member.user?.username || 'User',
      paid: member.paid,
      share: member.share
    })) : [{ id: '1', name: 'You', paid: true, share: dbSubscription.cost }],
    logo: dbSubscription.logoUrl || "/placeholder.svg?height=40&width=40"
  }
}

export default function DashboardPage() {
  const {
    subscriptions,
    setSubscriptions,
    addSubscription,
    removeSubscription,
    addFriend,
    addFriendToSubscription,
    removeFriendFromSubscription,
  } = useAppContext()

  const { connected } = useWallet()
  const { user } = useAuth()
  const router = useRouter()

  const [activeSubscription, setActiveSubscription] = useState<(typeof subscriptions)[0] | null>(null)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [isAddSubscriptionOpen, setIsAddSubscriptionOpen] = useState(false)
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Get payment history from localStorage
  const [paymentHistory, setPaymentHistory] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ats-payment-history")
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return [] // Empty array for first-time users
  })

  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  useEffect(() => {
    if (!connected) {
      toast.error("Please log in to access the dashboard")
      router.push("/login")
    }
  }, [connected, router])

  // Load user subscriptions from database
  const loadUserSubscriptions = async () => {
    if (!user) return

    try {
      const userSubscriptions = await SubscriptionService.getUserSubscriptions(user.id)
      if (userSubscriptions && userSubscriptions.length > 0) {
        // Convert database format to app context format
        const convertedSubscriptions = userSubscriptions.map(convertDBSubscriptionToAppFormat)
        setSubscriptions(convertedSubscriptions)
      } else {
        // If no subscriptions in database, clear local storage and state
        localStorage.removeItem("ats-subscriptions")
        setSubscriptions([])
      }
    } catch (error) {
      console.error("Error loading subscriptions:", error)
      toast.error("Failed to load subscriptions")
      // Clear local storage and state on error
      localStorage.removeItem("ats-subscriptions")
      setSubscriptions([])
    } finally {
      setIsLoading(false)
    }
  }

  // Set up real-time subscription updates
  useEffect(() => {
    if (!user) return

    // Écouter les événements de mise à jour de souscription
    const handleSubscriptionUpdate = (event: CustomEvent) => {
      console.log("Subscription update event received:", event.detail)
      
      // Recharger les souscriptions
      loadUserSubscriptions()
      
      // Afficher un message toast approprié
      if (event.detail.message) {
        toast.info(event.detail.message)
      }
    }

    // Ajouter l'écouteur d'événements
    window.addEventListener("subscription-update", handleSubscriptionUpdate as EventListener)

    const cleanup = SubscriptionService.subscribeToSubscriptionChanges(user.id, (updatedSubscription) => {
      setSubscriptions(prevSubscriptions => {
        // If it's a deletion
        if (!updatedSubscription.name) {
          // Remove the subscription from the list
          const newSubscriptions = prevSubscriptions.filter(sub => sub.id !== updatedSubscription.id)
          // Update localStorage
          localStorage.setItem("ats-subscriptions", JSON.stringify(newSubscriptions))
          return newSubscriptions
        }

        // Update or add the subscription
        const index = prevSubscriptions.findIndex(sub => sub.id === updatedSubscription.id)
        if (index >= 0) {
          const newSubscriptions = [...prevSubscriptions]
          newSubscriptions[index] = convertDBSubscriptionToAppFormat(updatedSubscription)
          // Update localStorage
          localStorage.setItem("ats-subscriptions", JSON.stringify(newSubscriptions))
          return newSubscriptions
        } else {
          const newSubscriptions = [...prevSubscriptions, convertDBSubscriptionToAppFormat(updatedSubscription)]
          // Update localStorage
          localStorage.setItem("ats-subscriptions", JSON.stringify(newSubscriptions))
          return newSubscriptions
        }
      })

      // Show appropriate toast messages based on the type of change
      if (!updatedSubscription.name) {
        if (updatedSubscription.metadata?.type === 'subscription_deleted') {
          toast.info("A subscription has been deleted")
        }
      } else {
        const existingSubscription = subscriptions.find(sub => sub.id === updatedSubscription.id)
        if (!existingSubscription) {
          toast.success("You've been added to a new subscription")
        } else if (updatedSubscription.metadata?.type === 'member_left') {
          toast.info(`${updatedSubscription.metadata.username} has left the subscription`)
        } else {
          toast.info("Subscription details have been updated")
        }
      }
    })

    return () => {
      cleanup()
      window.removeEventListener("subscription-update", handleSubscriptionUpdate as EventListener)
    }
  }, [user, subscriptions])

  useEffect(() => {
    loadUserSubscriptions()
  }, [user])

  // Function to handle adding a new subscription
  const handleAddSubscription = async (data: any) => {
    try {
      if (!user) {
        toast.error("You must be logged in to add a subscription")
        return
      }

      // Create subscription in the database
      const newSubscription = await SubscriptionService.createSubscription(
        user.id,
        data.name,
        Number.parseFloat(data.cost),
        data.billingDate,
        "monthly",  // default billing cycle
        data.logoUrl
      )
      
      if (newSubscription) {
        // Convert the new subscription to app format
        const convertedSubscription = convertDBSubscriptionToAppFormat(newSubscription)
        
        // Update local state with the new subscription
        setSubscriptions(prev => [...prev, convertedSubscription])
        
        setIsAddSubscriptionOpen(false)
        toast.success(`${data.name} subscription added successfully!`)
      } else {
        toast.error("Failed to create subscription")
      }
    } catch (error) {
      console.error("Error creating subscription:", error)
      toast.error("Failed to create subscription")
    }
  }

  // Function to handle adding a friend to a subscription
  const handleAddFriendToSubscription = (subscriptionId: string, friendEmail: string) => {
    addFriendToSubscription(subscriptionId, friendEmail)
    toast.success(`Friend added to ${activeSubscription?.name}!`)
  }

  // Function to handle removing a friend from a subscription
  const handleRemoveFriend = (subscriptionId: string, memberId: string) => {
    removeFriendFromSubscription(subscriptionId, memberId)
    toast.success("Friend removed from subscription")
  }

  // Function to handle sending a reminder
  const handleSendReminder = (subscriptionId: string, memberId: string) => {
    const subscription = subscriptions.find((sub) => sub.id === subscriptionId)
    const member = subscription?.members.find((m) => m.id === memberId)

    if (subscription && member) {
      toast.success(`Payment reminder sent to ${member.name}`)
    }
  }

  // Function to handle adding a global friend
  const handleAddFriend = (data: any) => {
    addFriend({
      name: data.name,
      email: data.email,
      walletAddress: data.walletAddress,
    })
    toast.success(`Friend ${data.name} added successfully!`)
    setIsAddFriendOpen(false)
  }

  // Function to handle deleting a subscription
  const handleDeleteSubscription = async (subscriptionId: string) => {
    try {
      // Set deleting state to prevent UI issues
      setIsDeleting(true)
      
      // Trouver le nom de la souscription pour le message de confirmation
      const subscription = subscriptions.find((sub) => sub.id === subscriptionId)
      const subscriptionName = subscription ? subscription.name : "Subscription"
      
      // Close the manage modal first to prevent UI issues
      setIsManageModalOpen(false)
      setActiveSubscription(null)
      
      // Delete from database first if the user is logged in
      if (user) {
        const success = await SubscriptionService.deleteSubscription(subscriptionId)
        if (!success) {
          toast.error(`Failed to delete ${subscriptionName} from database`)
          setIsDeleting(false)
          return
        }

        // Mettre à jour l'état local immédiatement
        setSubscriptions(prev => prev.filter(sub => sub.id !== subscriptionId))
        
        // Mettre à jour le localStorage
        const updatedSubscriptions = subscriptions.filter(sub => sub.id !== subscriptionId)
        localStorage.setItem("ats-subscriptions", JSON.stringify(updatedSubscriptions))

        // Déclencher un événement de mise à jour
        window.dispatchEvent(new CustomEvent("subscription-update", {
          detail: {
            type: "subscription_deleted",
            subscriptionId,
            message: `${subscriptionName} has been deleted successfully`
          }
        }))
      }

      // Afficher un message de confirmation
      toast.success(`${subscriptionName} has been deleted successfully`)
    } catch (error) {
      console.error("Error deleting subscription:", error)
      toast.error("Failed to delete subscription")
    } finally {
      // Reset deleting state
      setIsDeleting(false)
    }
  }

  // Function to open the manage modal
  const openManageModal = (subscription: (typeof subscriptions)[0]) => {
    setActiveSubscription(subscription)
    setIsManageModalOpen(true)
  }

  // Function to handle sending a subscription invitation
  const handleSendInvitation = async (subscriptionId: string, friendId: string) => {
    try {
      if (!user) {
        toast.error("You must be logged in to send invitations")
        return
      }

      const success = await SubscriptionService.inviteFriendToSubscription(
        subscriptionId,
        friendId,
        user.id,
        user.username || user.email?.split('@')[0] || 'User'
      )

      if (success) {
        toast.success("Invitation sent successfully")
      } else {
        toast.error("Failed to send invitation")
      }
    } catch (error) {
      console.error("Error sending invitation:", error)
      toast.error("Failed to send invitation")
    }
  }

  // Function to handle accepting a subscription invitation
  const handleAcceptInvitation = async (notificationId: string) => {
    try {
      if (!user) {
        toast.error("You must be logged in to accept invitations")
        return
      }

      const success = await SubscriptionService.acceptSubscriptionInvitation(notificationId, user.id)

      if (success) {
        // Reload subscriptions to show the new member
        const userSubscriptions = await SubscriptionService.getUserSubscriptions(user.id)
        if (userSubscriptions && userSubscriptions.length > 0) {
          const convertedSubscriptions = userSubscriptions.map(convertDBSubscriptionToAppFormat)
          setSubscriptions(convertedSubscriptions)
        }
        toast.success("Invitation accepted successfully")
      } else {
        toast.error("Failed to accept invitation")
      }
    } catch (error) {
      console.error("Error accepting invitation:", error)
      toast.error("Failed to accept invitation")
    }
  }

  if (!connected) {
    return null // Ne rien afficher pendant la redirection
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <HeaderWithWallet activePage="dashboard" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-gray-50">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-lg md:text-2xl ats-accent">Dashboard</h1>
          <Button
            size="sm"
            className="ml-auto bg-primary text-white hover:bg-primary/90"
            onClick={() => setIsAddSubscriptionOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Subscription
          </Button>
    </div>
        <Tabs defaultValue="active" className="space-y-4">
          <div className="flex items-center">
            <TabsList className="bg-white">
              <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Active
              </TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Pending Payments
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Payment History
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="active" className="space-y-4">
            {subscriptions.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                    <Plus className="h-10 w-10 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-xl font-medium ats-accent">No Subscriptions Yet</h3>
                <p className="mt-2 text-gray-500 max-w-md mx-auto">
                  You haven't added any subscriptions yet. Add your first subscription to start splitting costs with
                  friends.
                </p>
                <Button
                  className="mt-4 bg-primary text-white hover:bg-primary/90"
                  onClick={() => setIsAddSubscriptionOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Subscription
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {subscriptions.map((subscription) => (
                  <Card key={subscription.id} className="overflow-hidden bg-white">
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                      <img
                        alt={subscription.name}
                        className="rounded-md object-cover"
                        height="40"
                        src={subscription.logo || "/placeholder.svg"}
                        width="40"
                      />
                      <div>
                        <CardTitle>{subscription.name}</CardTitle>
                        <CardDescription>${subscription.cost}/month</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Next payment:</span>
                        <span className="text-sm font-medium">
                          {new Date(subscription.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm text-gray-500">Members:</span>
                        <div className="mt-1 flex -space-x-2">
                          {subscription.members.map((member) => (
                            <Avatar
                              key={member.id}
                              className={`border-2 ${member.paid ? "border-green-500" : "border-red-500"}`}
                            >
                              <AvatarFallback className="bg-gray-200 text-gray-700">
                                {member.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="outline"
                        className="w-full border-primary/30 text-primary hover:bg-primary/5"
                        onClick={() => openManageModal(subscription)}
                      >
                        Manage
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                <Card className="flex h-full flex-col items-center justify-center p-6 bg-white">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                    <Plus className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="mt-4 text-xl font-medium ats-accent">Add Subscription</h3>
                  <p className="mb-4 mt-2 text-center text-sm text-gray-500">
                    Add a new subscription to split with your friends.
                  </p>
                  <Button
                    className="bg-primary text-white hover:bg-primary/90"
                    onClick={() => setIsAddSubscriptionOpen(true)}
                  >
                    Add Subscription
                  </Button>
                </Card>
              </div>
            )}
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
                        <History className="h-10 w-10 text-gray-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-medium ats-accent">No Payment History Yet</h3>
                    <p className="mt-2 text-gray-500 max-w-md mx-auto">
                      Your payment history will appear here once you've sent or received payments.
                    </p>
                    <Button
                      className="mt-4 bg-primary text-white hover:bg-primary/90"
                      onClick={() => router.push("/dashboard/payments")}
                    >
                      Go to Payments
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
                          <p className="text-sm text-gray-500">
                            {payment.subscription} - ${payment.amount.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${payment.type === "sent" ? "text-red-500" : "text-green-500"}`}>
                            {payment.type === "sent" ? "-" : "+"}${payment.amount.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">{payment.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Manage Subscription Modal */}
      <ManageSubscriptionModal
        subscription={activeSubscription}
        open={isManageModalOpen}
        onOpenChange={setIsManageModalOpen}
        onAddFriend={handleAddFriendToSubscription}
        onRemoveFriend={handleRemoveFriend}
        onSendReminder={handleSendReminder}
        onDeleteSubscription={handleDeleteSubscription}
        onSendInvitation={handleSendInvitation}
        isDeleting={isDeleting}
        currentUserId={user?.id}
      />

      {/* Add Subscription Dialog */}
      <Dialog open={isAddSubscriptionOpen} onOpenChange={setIsAddSubscriptionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Subscription</DialogTitle>
            <DialogDescription>Enter the details of the subscription you want to split with friends.</DialogDescription>
          </DialogHeader>
          <AddSubscriptionForm onSubmit={handleAddSubscription} />
        </DialogContent>
      </Dialog>

      {/* Add Friend Dialog */}
      <Dialog open={isAddFriendOpen} onOpenChange={setIsAddFriendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Friend</DialogTitle>
            <DialogDescription>Add a friend to split subscription costs with.</DialogDescription>
          </DialogHeader>
          <AddFriendForm onSubmit={handleAddFriend} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
