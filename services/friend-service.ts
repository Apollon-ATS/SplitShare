import { createClientComponentClient } from "@/lib/supabase"
import type { User } from "./auth-service"
import { NotificationService } from "./notification-service"

export interface FriendRequest {
  id: string
  userId: string
  friendId: string
  status: "pending" | "accepted" | "rejected"
  createdAt: string
  updatedAt: string
  friend?: User
}

// Type pour le callback d'événements d'amitié
export type FriendshipEventCallback = () => void

export const FriendService = {
  // Stockage des callbacks pour les événements d'amitié
  friendshipEventListeners: new Set<FriendshipEventCallback>(),

  // Fonction pour s'abonner aux événements d'amitié
  subscribeToFriendshipEvents(callback: FriendshipEventCallback): () => void {
    this.friendshipEventListeners.add(callback)
    return () => {
      this.friendshipEventListeners.delete(callback)
    }
  },

  // Fonction pour notifier tous les abonnés d'un changement
  notifyFriendshipChange() {
    console.log("Notifying friendship change to", this.friendshipEventListeners.size, "listeners")
    this.friendshipEventListeners.forEach(callback => callback())
  },

  // Abonnement temps réel aux changements de Supabase
  setupRealtimeSubscription(userId: string) {
    if (!userId) return () => {}
    
    console.log("Setting up realtime friendship subscription for user", userId)
    const supabase = createClientComponentClient()
    
    // S'abonner aux modifications concernant cet utilisateur
    const subscription = supabase
      .channel('friendships-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `friend_id=eq.${userId}`,
        },
        (payload: any) => {
          console.log('Friendship change received (as friend):', payload)
          this.notifyFriendshipChange()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          console.log('Friendship change received (as user):', payload)
          this.notifyFriendshipChange()
        }
      )
      .subscribe()
    
    // Retourner une fonction pour se désabonner
    return () => {
      console.log("Cleaning up realtime friendship subscription")
      supabase.removeChannel(subscription)
    }
  },

  // Récupérer la liste des amis d'un utilisateur
  async getFriends(userId: string): Promise<User[]> {
    try {
      const supabase = createClientComponentClient()

      // Récupérer les amis acceptés où l'utilisateur est l'initiateur
      const { data: sentFriendships, error: sentError } = await supabase
        .from("friendships")
        .select(`
          id,
          friend_id,
          users!friendships_friend_id_fkey (*)
        `)
        .eq("user_id", userId)
        .eq("status", "accepted")

      if (sentError) {
        console.error("Error retrieving sent friendships:", sentError)
        return []
      }

      // Récupérer les amis acceptés où l'utilisateur est le destinataire
      const { data: receivedFriendships, error: receivedError } = await supabase
        .from("friendships")
        .select(`
          id,
          user_id,
          users!friendships_user_id_fkey (*)
        `)
        .eq("friend_id", userId)
        .eq("status", "accepted")

      if (receivedError) {
        console.error("Error retrieving received friendships:", receivedError)
        return []
      }

      // Transformer les données
      const sentFriends = sentFriendships.map((item: any) => ({
        id: item.users.id,
        walletAddress: item.users.wallet_address,
        username: item.users.username,
        email: item.users.email,
        avatarUrl: item.users.avatar_url,
        createdAt: item.users.created_at,
        updatedAt: item.users.updated_at,
      }))

      const receivedFriends = receivedFriendships.map((item: any) => ({
        id: item.users.id,
        walletAddress: item.users.wallet_address,
        username: item.users.username,
        email: item.users.email,
        avatarUrl: item.users.avatar_url,
        createdAt: item.users.created_at,
        updatedAt: item.users.updated_at,
      }))

      return [...sentFriends, ...receivedFriends]
    } catch (error) {
      console.error("Error retrieving friends:", error)
      return []
    }
  },

  // Récupérer les demandes d'amitié en attente
  async getPendingFriendRequests(userId: string): Promise<FriendRequest[]> {
    try {
      const supabase = createClientComponentClient()

      // Récupérer les demandes reçues en attente
      const { data: receivedRequests, error: receivedError } = await supabase
        .from("friendships")
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          updated_at,
          users!friendships_user_id_fkey (*)
        `)
        .eq("friend_id", userId)
        .eq("status", "pending")

      if (receivedError) {
        console.error("Error retrieving received friend requests:", receivedError)
        return []
      }

      // Transformer les données
      return receivedRequests.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        friendId: item.friend_id,
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        friend: {
          id: item.users.id,
          walletAddress: item.users.wallet_address,
          username: item.users.username,
          email: item.users.email,
          avatarUrl: item.users.avatar_url,
          createdAt: item.users.created_at,
          updatedAt: item.users.updated_at,
        },
      }))
    } catch (error) {
      console.error("Error retrieving friend requests:", error)
      return []
    }
  },

  // Envoyer une demande d'amitié
  async sendFriendRequest(userId: string, friendIdentifier: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Vérifier si l'utilisateur essaie de s'ajouter lui-même
      const { data: currentUser, error: currentUserError } = await supabase
        .from("users")
        .select("wallet_address, email")
        .eq("id", userId)
        .single()

      if (currentUserError) {
        console.error("Error retrieving current user:", currentUserError)
        return false
      }

      // Si l'utilisateur essaie de s'ajouter lui-même
      if (
        friendIdentifier === currentUser.wallet_address ||
        (currentUser.email && friendIdentifier === currentUser.email)
      ) {
        console.error("You cannot add yourself as a friend")
        return false
      }

      // Rechercher l'ami par adresse de wallet ou email
      const { data: friendUser, error: userError } = await supabase
        .from("users")
        .select("id")
        .or(`wallet_address.eq.${friendIdentifier},email.eq.${friendIdentifier}`)
        .maybeSingle()

      if (userError && userError.code !== "PGRST116") {
        console.error("Error searching for user:", userError)
        return false
      }

      // Si l'ami n'existe pas
      if (!friendUser) {
        console.error("User not found with this address or email")
        return false
      }

      const friendId = friendUser.id

      // Vérifier si une demande existe déjà
      const { data: existingRequest, error: checkError } = await supabase
        .from("friendships")
        .select("id, status")
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
        .maybeSingle()

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing requests:", checkError)
        return false
      }

      // Si une demande existe déjà
      if (existingRequest) {
        if (existingRequest.status === "accepted") {
          console.log("You are already friends with this user")
          return true
        } else if (existingRequest.status === "pending") {
          console.log("A friend request is already pending")
          return false
        } else if (existingRequest.status === "rejected") {
          // Mettre à jour la demande rejetée en pending
          const { error: updateError } = await supabase
            .from("friendships")
            .update({ status: "pending", updated_at: new Date().toISOString() })
            .eq("id", existingRequest.id)

          if (updateError) {
            console.error("Error updating friend request:", updateError)
            return false
          }

          // Créer une notification
          await NotificationService.createFriendRequestNotification(userId, friendId)
          
          // Notifier les abonnés du changement
          this.notifyFriendshipChange()

          return true
        }
      }

      // Créer une nouvelle demande d'amitié
      const { error: insertError } = await supabase.from("friendships").insert([
        {
          user_id: userId,
          friend_id: friendId,
          status: "pending",
        },
      ])

      if (insertError) {
        console.error("Error sending friend request:", insertError)
        return false
      }

      // Créer une notification
      await NotificationService.createFriendRequestNotification(userId, friendId)
      
      // Notifier les abonnés du changement
      this.notifyFriendshipChange()

      return true
    } catch (error) {
      console.error("Error sending friend request:", error)
      return false
    }
  },

  // Accepter une demande d'amitié
  async acceptFriendRequest(requestId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Récupérer la demande pour obtenir les IDs
      const { data: request, error: fetchError } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .eq("id", requestId)
        .single()

      if (fetchError) {
        console.error("Error retrieving friend request:", fetchError)
        return false
      }

      // Mettre à jour le statut de la demande
      const { error: updateError } = await supabase
        .from("friendships")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", requestId)

      if (updateError) {
        console.error("Error accepting friend request:", updateError)
        return false
      }

      // Supprimer la notification de demande d'ami pour nettoyer l'interface
      try {
        // Rechercher et supprimer la notification de type friend_request
        const { error: deleteError } = await supabase
          .from("notifications")
          .delete()
          .eq("user_id", request.friend_id)
          .eq("type", "friend_request")
          .eq("content->>senderId", request.user_id)

        if (deleteError) {
          console.error("Error deleting friend request notification:", deleteError)
          // On continue même si la suppression échoue
        }
      } catch (deleteError) {
        console.error("Error during notification deletion:", deleteError)
        // On continue même si la suppression échoue
      }

      // Créer une notification pour l'expéditeur
      await NotificationService.createFriendAcceptedNotification(request.friend_id, request.user_id)
      
      // Notifier les abonnés du changement
      this.notifyFriendshipChange()

      return true
    } catch (error) {
      console.error("Error accepting friend request:", error)
      return false
    }
  },

  // Rejeter une demande d'amitié
  async rejectFriendRequest(requestId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Récupérer la demande pour obtenir les IDs
      const { data: request, error: fetchError } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .eq("id", requestId)
        .single()

      if (fetchError) {
        console.error("Error retrieving friend request:", fetchError)
        return false
      }

      const { error } = await supabase
        .from("friendships")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", requestId)

      if (error) {
        console.error("Error rejecting friend request:", error)
        return false
      }

      // Supprimer la notification de demande d'ami pour nettoyer l'interface
      try {
        // Rechercher et supprimer la notification de type friend_request
        const { error: deleteError } = await supabase
          .from("notifications")
          .delete()
          .eq("user_id", request.friend_id)
          .eq("type", "friend_request")
          .eq("content->>senderId", request.user_id)

        if (deleteError) {
          console.error("Error deleting friend request notification:", deleteError)
          // On continue même si la suppression échoue
        }
      } catch (deleteError) {
        console.error("Error during notification deletion:", deleteError)
        // On continue même si la suppression échoue
      }

      // Notifier les abonnés du changement
      this.notifyFriendshipChange()

      return true
    } catch (error) {
      console.error("Error rejecting friend request:", error)
      return false
    }
  },

  // Supprimer un ami
  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Show a loading indicator or disable the button while processing
      console.log(`Removing friendship between ${userId} and ${friendId}`)

      // Get user information before deleting the friendship
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("username, wallet_address")
        .eq("id", userId)
        .single()

      if (userError) {
        console.error("Error retrieving user information:", userError)
        return false
      }

      // Delete the friendship relationship in both directions
      const { error } = await supabase
        .from("friendships")
        .delete()
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)

      if (error) {
        console.error("Error removing friend:", error)
        return false
      }

      // Create a notification for the removed friend
      try {
        await NotificationService.createFriendRemovedNotification(userId, friendId, userData.username || 'Unknown user')
      } catch (notifError) {
        console.error("Error sending friend removal notification:", notifError)
        // Continue even if notification fails
      }

      // Notify subscribers about the friendship change
      this.notifyFriendshipChange()

      console.log("Friendship removed successfully")
      return true
    } catch (error) {
      console.error("Error removing friend:", error)
      return false
    }
  },
}
