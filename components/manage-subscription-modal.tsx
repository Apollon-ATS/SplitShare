"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, X, Send, Trash2, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { createClientComponentClient } from "@/lib/supabase"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { SubscriptionService } from "@/services/subscription-service"

interface User {
  id: string
  username: string
  email: string
  avatarUrl?: string
}

interface Member {
  id: string
  name: string
  paid: boolean
  share: number
}

interface SubscriptionDetails {
  id: string
  name: string
  cost: number
  dueDate: string
  members: Member[]
  logo?: string
  ownerId: string
}

interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: string
  users?: {
    id: string
    username: string
    email: string
    avatar_url?: string
  }
  friend?: {
    id: string
    username: string
    email: string
    avatar_url?: string
  }
}

interface ManageSubscriptionModalProps {
  subscription: SubscriptionDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddFriend: (subscriptionId: string, friendId: string) => void
  onRemoveFriend: (subscriptionId: string, memberId: string) => void
  onSendReminder: (subscriptionId: string, memberId: string) => void
  onDeleteSubscription: (subscriptionId: string) => void
  onSendInvitation?: (subscriptionId: string, friendId: string) => void
  isDeleting?: boolean
  currentUserId?: string
}

export function ManageSubscriptionModal({
  subscription,
  open,
  onOpenChange,
  onAddFriend,
  onRemoveFriend,
  onSendReminder,
  onDeleteSubscription,
  onSendInvitation,
  isDeleting = false,
  currentUserId,
}: ManageSubscriptionModalProps) {
  const [selectedFriendId, setSelectedFriendId] = useState("")
  const [friends, setFriends] = useState<User[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [formData, setFormData] = useState({
    name: subscription?.name || "",
    cost: subscription?.cost || 0,
    dueDate: subscription?.dueDate ? new Date(subscription.dueDate).toISOString().split("T")[0] : "",
  })
  const supabase = createClientComponentClient()
  const { user } = useAuth()
  const router = useRouter()
  const [isAddingFriend, setIsAddingFriend] = useState(false)
  const [friendEmail, setFriendEmail] = useState("")
  const [isLeaving, setIsLeaving] = useState(false)

  // Vérifier si l'utilisateur actuel est le propriétaire
  const isOwner = subscription?.ownerId === currentUserId

  useEffect(() => {
    if (open && subscription) {
      loadFriends()
      // Mettre à jour le formData quand le subscription change
      setFormData({
        name: subscription.name,
        cost: subscription.cost,
        dueDate: new Date(subscription.dueDate).toISOString().split("T")[0],
      })
    }
  }, [open, subscription])

  // Handle real-time updates
  useEffect(() => {
    const handleSubscriptionChange = () => {
      // Reload the page to reflect changes
      router.refresh()
    }

    window.addEventListener("subscription-change", handleSubscriptionChange)
    return () => window.removeEventListener("subscription-change", handleSubscriptionChange)
  }, [router])

  const loadFriends = async () => {
    if (!currentUserId) {
      console.log("No currentUserId available")
      return
    }

    console.log("Loading friends for user:", currentUserId)
    setIsLoadingFriends(true)
    try {
      // Get all friendships where the current user is either user_id or friend_id
      const { data: friendships, error: friendshipsError } = await supabase
        .from("friendships")
        .select(`
          id,
          user_id,
          friend_id,
          status,
          users!friendships_user_id_fkey (
            id,
            username,
            email,
            avatar_url
          ),
          friend:users!friendships_friend_id_fkey (
            id,
            username,
            email,
            avatar_url
          )
        `)
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
        .eq("status", "accepted")

      if (friendshipsError) {
        console.error("Error loading friendships:", friendshipsError)
        toast.error("Failed to load friends")
        return
      }

      console.log("Raw friendships data:", friendships)

      if (!friendships || friendships.length === 0) {
        console.log("No friendships found")
        setFriends([])
        return
      }

      // Transform friendships into user objects
      const allFriends = friendships.flatMap((friendship: Friendship) => {
        console.log("Processing friendship:", friendship)
        const users: User[] = []
        
        // Add friend from user_id side if it's not the current user
        if (friendship.user_id !== currentUserId && friendship.users) {
          console.log("Adding user from user_id side:", friendship.users)
          users.push({
            id: friendship.users.id,
            username: friendship.users.username || friendship.users.email?.split('@')[0] || 'User',
            email: friendship.users.email || '',
            avatarUrl: friendship.users.avatar_url,
          })
        }
        
        // Add friend from friend_id side if it's not the current user
        if (friendship.friend_id !== currentUserId && friendship.friend) {
          console.log("Adding user from friend_id side:", friendship.friend)
          users.push({
            id: friendship.friend.id,
            username: friendship.friend.username || friendship.friend.email?.split('@')[0] || 'User',
            email: friendship.friend.email || '',
            avatarUrl: friendship.friend.avatar_url,
          })
        }
        
        return users
      })

      console.log("All friends before deduplication:", allFriends)

      // Remove duplicates by ID
      const uniqueFriends = Array.from(new Map(allFriends.map((friend: User) => [friend.id, friend])).values()) as User[]
      console.log("Unique friends after deduplication:", uniqueFriends)

      // Exclude current members
      const currentMemberIds = subscription?.members?.map((member) => member.id) || []
      console.log("Current member IDs:", currentMemberIds)
      const filteredFriends = uniqueFriends.filter((friend) => !currentMemberIds.includes(friend.id))
      console.log("Final filtered friends:", filteredFriends)

      setFriends(filteredFriends)
    } catch (err) {
      console.error("Error in loadFriends:", err)
      toast.error("Failed to load friends")
    } finally {
      setIsLoadingFriends(false)
    }
  }

  if (!subscription) return null

  const handleAddFriend = () => {
    if (selectedFriendId && !isDeleting) {
      if (onSendInvitation) {
        onSendInvitation(subscription.id, selectedFriendId)
        toast.success("Invitation sent successfully")
      } else {
        onAddFriend(subscription.id, selectedFriendId)
        toast.success("Friend added successfully")
      }
      setSelectedFriendId("")
    }
  }

  const handleDeleteSubscription = () => {
    if (isDeleting) return
    onDeleteSubscription(subscription.id)
  }

  const handleUpdateSubscription = async () => {
    if (!subscription || !isOwner || isUpdating) return

    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          name: formData.name,
          cost: Number(formData.cost),
          due_date: formData.dueDate,
        })
        .eq("id", subscription.id)

      if (error) {
        throw error
      }

      toast.success("Subscription updated successfully")
      // Recharger les données de l'abonnement
      window.dispatchEvent(new CustomEvent("subscription-change"))
    } catch (error) {
      console.error("Error updating subscription:", error)
      toast.error("Failed to update subscription")
    } finally {
      setIsUpdating(false)
    }
  }

  // Calculate fee savings with Solana
  const standardFeePercentage = 2.5
  const solanaFeePercentage = 0.5
  const standardFee = subscription.cost * (standardFeePercentage / 100)
  const solanaFee = subscription.cost * (solanaFeePercentage / 100)
  const savings = standardFee - solanaFee
  const savingsPercentage = ((standardFee - solanaFee) / standardFee) * 100

  const handleLeaveGroup = async () => {
    if (!subscription || !user) return

    try {
      setIsLeaving(true)
      const success = await SubscriptionService.leaveSubscription(subscription.id, user.id)
      
      if (success) {
        toast.success("You have left the subscription group")
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error("Failed to leave the subscription group")
      }
    } catch (error) {
      console.error("Error leaving subscription:", error)
      toast.error("Failed to leave the subscription group")
    } finally {
      setIsLeaving(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!subscription || !user) return

    try {
      const success = await SubscriptionService.removeMember(subscription.id, memberId, user.id)
      
      if (success) {
        toast.success("Member has been removed from the subscription")
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error("Failed to remove member from the subscription")
      }
    } catch (error) {
      console.error("Error removing member:", error)
      toast.error("Failed to remove member from the subscription")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!isDeleting || !newOpen) {
          onOpenChange(newOpen)
        }
      }}
    >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {subscription.logo && (
                <img
                  src={subscription.logo || "/placeholder.svg"}
                  alt={subscription.name}
                  className="h-8 w-8 rounded-md object-cover"
                />
              )}
              <span>Manage {subscription.name}</span>
            </DialogTitle>
            <DialogDescription>
              Total cost: ${subscription.cost}/month | Due date: {new Date(subscription.dueDate).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="members" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="members" className="space-y-4 py-4">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Current Members</h3>
                <div className="space-y-3">
                  {subscription.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className={`border-2 ${member.paid ? "border-green-500" : "border-red-500"}`}>
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-gray-500">${member.share.toFixed(2)}/month</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                      {!member.paid && member.id !== currentUserId && (
                          <Button
                          variant="outline"
                            size="sm"
                            onClick={() => onSendReminder(subscription.id, member.id)}
                          >
                          <Send className="h-4 w-4" />
                          </Button>
                        )}
                      {isOwner && member.id !== currentUserId && (
                          <Button
                          variant="destructive"
                            size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      {member.id === currentUserId && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleLeaveGroup}
                          disabled={isLeaving}
                        >
                          {isLeaving ? "Leaving..." : "Leave"}
                        </Button>
                      )}
                    </div>
                    </div>
                  ))}
                </div>

              {isOwner && (
                <div className="mt-6 space-y-2">
                  <h3 className="text-sm font-medium">Add Friend to Subscription</h3>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      {isLoadingFriends ? (
                        <div className="flex items-center justify-center h-10 rounded-md border border-input bg-background px-3 py-2">
                          <span className="text-sm text-muted-foreground">Loading friends...</span>
                        </div>
                      ) : friends && friends.length > 0 ? (
                        <Select value={selectedFriendId} onValueChange={setSelectedFriendId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a friend" />
                          </SelectTrigger>
                          <SelectContent>
                            {friends.map((friend) => (
                              <SelectItem key={friend.id} value={friend.id} className="py-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    {friend.avatarUrl ? (
                                      <img
                                        src={friend.avatarUrl}
                                        alt={friend.username}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <AvatarFallback className="text-xs">
                                        {friend.username?.[0]?.toUpperCase() || friend.email?.[0]?.toUpperCase() || "?"}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{friend.username}</span>
                                    <span className="text-xs text-muted-foreground">{friend.email}</span>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center justify-center h-10 rounded-md border border-input bg-background px-3 py-2">
                          <span className="text-sm text-muted-foreground">No friends available</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={handleAddFriend} 
                      disabled={!selectedFriendId || isDeleting}
                      className="shrink-0"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {onSendInvitation ? "Invite" : "Add"}
                    </Button>
                  </div>
                  {friends.length === 0 && !isLoadingFriends && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Add friends first before inviting them to your subscription.
                    </p>
                  )}
                </div>
              )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 py-4">
              <div className="grid gap-4">
              {isOwner ? (
                <>
                <div className="grid gap-2">
                  <Label htmlFor="subscription-name">Subscription Name</Label>
                    <Input
                      id="subscription-name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subscription-cost">Monthly Cost</Label>
                    <Input
                      id="subscription-cost"
                      type="number"
                      value={formData.cost}
                      onChange={(e) => setFormData((prev) => ({ ...prev, cost: Number(e.target.value) }))}
                    />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subscription-date">Billing Date</Label>
                  <Input
                    id="subscription-date"
                    type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>

                  <Button
                    onClick={handleUpdateSubscription}
                    disabled={isUpdating}
                    className="w-full"
                  >
                    {isUpdating ? "Updating..." : "Update Subscription"}
                  </Button>
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  Only the subscription owner can modify these settings.
                </div>
              )}

                <div className="mt-4 rounded-lg border p-4 bg-gray-50">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium text-sm">Save on transaction fees with Solana</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Pay with Solana and save {savingsPercentage.toFixed(0)}% on transaction fees.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="bg-white">
                          Standard fee: ${standardFee.toFixed(2)}
                        </Badge>
                        <Badge className="bg-primary">Solana fee: ${solanaFee.toFixed(2)}</Badge>
                      </div>
                      <p className="text-sm font-medium text-green-600 mt-2">Save ${savings.toFixed(2)} per month!</p>
                    </div>
                  </div>
                </div>

              <div className="mt-4">
                {isOwner ? (
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteSubscription}
                    disabled={isDeleting}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? "Deleting..." : "Delete Subscription"}
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handleLeaveGroup}
                    disabled={isLeaving}
                    className="w-full"
                  >
                    {isLeaving ? "Leaving..." : "Leave Subscription"}
                  </Button>
                )}
              </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
  )
}
