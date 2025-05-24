import { createClientComponentClient } from "@/lib/supabase"

export interface Notification {
  id: string
  userId: string
  type: "friend_request" | "friend_accepted" | "payment_reminder" | "payment_received" | "friend_removed"
  content: any
  read: boolean
  createdAt: string
}

export const NotificationService = {
  // Récupérer les notifications d'un utilisateur
  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      const supabase = createClientComponentClient()

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error retrieving notifications:", error)
        return []
      }

      return data.map((item: any) => {
        // On force senderWalletAddress à null si absent
        let content = item.content
        if (content && typeof content === 'object' && !Array.isArray(content)) {
          if (!('senderWalletAddress' in content) || content.senderWalletAddress === undefined) {
            content = { ...content, senderWalletAddress: null }
          }
        }
        return {
        id: item.id,
        userId: item.user_id,
        type: item.type,
          content: content,
        read: item.read,
        createdAt: item.created_at,
        }
      })
    } catch (error) {
      console.error("Error retrieving notifications:", error)
      return []
    }
  },

  // Récupérer le nombre de notifications non lues
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const supabase = createClientComponentClient()

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false)

      if (error) {
        console.error("Error counting unread notifications:", error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error("Error counting unread notifications:", error)
      return 0
    }
  },

  // Marquer une notification comme lue
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId)

      if (error) {
        console.error("Error marking notification:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error marking notification:", error)
      return false
    }
  },

  // Marquer toutes les notifications comme lues
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false)

      if (error) {
        console.error("Error marking notifications:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error marking notifications:", error)
      return false
    }
  },

  // S'abonner aux notifications en temps réel
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void): () => void {
    const supabase = createClientComponentClient()

    console.log(`Subscribing to notifications for user ${userId}`)

    // S'abonner aux changements dans la table notifications
    const subscription = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          console.log("New notification received:", payload)

          // Transformer la notification
          const notification: Notification = {
            id: payload.new.id,
            userId: payload.new.user_id,
            type: payload.new.type,
            content: payload.new.content,
            read: payload.new.read,
            createdAt: payload.new.created_at,
          }

          // Appeler le callback avec la nouvelle notification
          callback(notification)
        },
      )
      .subscribe((status: any) => {
        console.log(`Notification subscription status: ${status}`)
      })

    // Retourner une fonction pour se désabonner
    return () => {
      console.log(`Unsubscribing from notifications for user ${userId}`)
      supabase.removeChannel(subscription)
    }
  },

  // Créer une notification de demande d'amitié
  async createFriendRequestNotification(senderId: string, receiverId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Récupérer les informations de l'expéditeur
      const { data: sender, error: senderError } = await supabase
        .from("users")
        .select("username, wallet_address")
        .eq("id", senderId)
        .single()

      if (senderError) {
        console.error("Error retrieving sender:", senderError)
        return false
      }

      console.log(`Creating friend request notification from ${sender.username} to ${receiverId}`)

      // Créer la notification
      const { data, error } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: receiverId,
            type: "friend_request",
            content: {
              senderId,
              senderUsername: sender.username,
              senderWalletAddress: sender.wallet_address,
            },
          },
        ])
        .select()

      if (error) {
        console.error("Error creating notification:", error)
        return false
      }

      console.log("Notification created successfully:", data)
      return true
    } catch (error) {
      console.error("Error creating notification:", error)
      return false
    }
  },

  // Créer une notification d'acceptation d'amitié
  async createFriendAcceptedNotification(senderId: string, receiverId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Récupérer les informations de l'expéditeur
      const { data: sender, error: senderError } = await supabase
        .from("users")
        .select("username, wallet_address")
        .eq("id", senderId)
        .single()

      if (senderError) {
        console.error("Error retrieving sender:", senderError)
        return false
      }

      console.log(`Creating friend acceptance notification from ${sender.username} to ${receiverId}`)

      // Créer la notification
      const { data, error } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: receiverId,
            type: "friend_accepted",
            content: {
              senderId,
              senderUsername: sender.username,
              senderWalletAddress: sender.wallet_address,
            },
          },
        ])
        .select()

      if (error) {
        console.error("Error creating notification:", error)
        return false
      }

      console.log("Notification created successfully:", data)
      return true
    } catch (error) {
      console.error("Error creating notification:", error)
      return false
    }
  },

  // Créer une notification de suppression d'amitié
  async createFriendRemovedNotification(senderId: string, receiverId: string, senderUsername: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      console.log(`Creating friend removal notification from ${senderUsername} to ${receiverId}`)

      // Créer la notification
      const { data, error } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: receiverId,
            type: "friend_removed",
            content: {
              senderId,
              senderUsername,
              message: `${senderUsername} has removed you from their friends list.`
            },
          },
        ])
        .select()

      if (error) {
        console.error("Error creating friend removal notification:", error)
        return false
      }

      console.log("Friend removal notification created successfully:", data)
      return true
    } catch (error) {
      console.error("Error creating friend removal notification:", error)
      return false
    }
  },

  // Créer une notification de rappel de paiement
  async createPaymentReminderNotification(
    senderId: string,
    receiverId: string,
    subscriptionId: string,
    subscriptionName: string,
    amount: number,
  ): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Récupérer les informations de l'expéditeur
      const { data: sender, error: senderError } = await supabase
        .from("users")
        .select("username, wallet_address")
        .eq("id", senderId)
        .single()

      if (senderError) {
        console.error("Error retrieving sender:", senderError)
        return false
      }

      // Créer la notification
      const { error } = await supabase.from("notifications").insert([
        {
          user_id: receiverId,
          type: "payment_reminder",
          content: {
            senderId,
            senderUsername: sender.username,
            senderWalletAddress: sender.wallet_address,
            subscriptionId,
            subscriptionName,
            amount,
          },
        },
      ])

      if (error) {
        console.error("Error creating notification:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error creating notification:", error)
      return false
    }
  },

  // Créer une notification de paiement reçu
  async createPaymentReceivedNotification(
    senderId: string,
    receiverId: string,
    subscriptionId: string,
    subscriptionName: string,
    amount: number,
    transactionHash?: string,
  ): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Récupérer les informations de l'expéditeur
      const { data: sender, error: senderError } = await supabase
        .from("users")
        .select("username, wallet_address")
        .eq("id", senderId)
        .single()

      if (senderError) {
        console.error("Error retrieving sender:", senderError)
        return false
      }

      // Créer la notification
      const { error } = await supabase.from("notifications").insert([
        {
          user_id: receiverId,
          type: "payment_received",
          content: {
            senderId,
            senderUsername: sender.username,
            senderWalletAddress: sender.wallet_address,
            subscriptionId,
            subscriptionName,
            amount,
            transactionHash,
          },
        },
      ])

      if (error) {
        console.error("Error creating notification:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error creating notification:", error)
      return false
    }
  },

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)

      if (error) {
        console.error("Error deleting notification:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error deleting notification:", error)
      return false
    }
  },

  // Gérer l'animation de notification
  triggerNotificationAnimation(element: HTMLElement) {
    element.classList.add('notification-pulse')
    setTimeout(() => {
      element.classList.remove('notification-pulse')
    }, 1000)
  },
}
