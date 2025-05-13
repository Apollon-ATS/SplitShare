"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { NotificationService, type Notification } from "@/services/notification-service"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { createClientComponentClient } from "@/lib/supabase"
import { SubscriptionService } from "@/services/subscription-service"

export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "payment_reminder"
  | "payment_received"
  | "friend_removed"
  | "subscription_invitation"
  | "subscription_member_removed"
  | "subscription_removed"
  | "subscription_member_left"
  | "subscription_left"
  | "subscription_deleted"

export interface Notification {
  id: string
  type: NotificationType
  content: {
    message?: string
    senderId?: string
    senderUsername?: string
    fromUsername?: string
    subscriptionId?: string
    subscriptionName?: string
    cost?: number
    amount?: number
    leavingMemberId?: string
    leavingMemberUsername?: string
    removedMemberId?: string
    removedMemberUsername?: string
  }
  metadata?: {
    subscriptionId?: string
    fromUserId?: string
    removedMemberId?: string
  }
  read: boolean
  createdAt: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  handleFriendRequest: (notificationId: string, accept: boolean) => Promise<void>
  handleSubscriptionInvitation: (notificationId: string, accept: boolean) => Promise<void>
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  // Charger les notifications au chargement et quand l'utilisateur change
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) {
        setNotifications([])
        setUnreadCount(0)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        console.log("Loading notifications for user:", user.id)
        // Charger les notifications
        const notificationsData = await NotificationService.getUserNotifications(user.id)
        console.log("Notifications loaded:", notificationsData)
        setNotifications(notificationsData)

        // Compter les notifications non lues
        const count = await NotificationService.getUnreadCount(user.id)
        console.log("Number of unread notifications:", count)
        setUnreadCount(count)
      } catch (error) {
        console.error("Error loading notifications:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadNotifications()
  }, [user])

  // Gérer les invitations de souscription
  const handleSubscriptionInvitation = async (notificationId: string, accept: boolean) => {
    if (!user) return

    try {
      // Trouver la notification
      const notification = notifications.find((n) => n.id === notificationId)
      if (!notification || notification.type !== "subscription_invitation") return

      if (accept) {
        const success = await SubscriptionService.acceptSubscriptionInvitation(notificationId, user.id)
        if (success) {
          toast.success(`You have joined ${notification.content.subscriptionName}`)
          // Supprimer la notification de la base de données
          await NotificationService.deleteNotification(notificationId)
          // Supprimer immédiatement la notification de l'interface
          setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        } else {
          toast.error("Failed to join subscription")
        }
      } else {
        // Supprimer la notification de la base de données
        await NotificationService.deleteNotification(notificationId)
        // Supprimer immédiatement la notification de l'interface
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        toast.info(`You have declined the invitation to ${notification.content.subscriptionName}`)
      }
    } catch (error) {
      console.error("Error handling subscription invitation:", error)
      toast.error("An error occurred while handling the invitation")
    }
  }

  // S'abonner aux notifications en temps réel
  useEffect(() => {
    if (!user) return

    console.log("Setting up notification subscription for user:", user.id)

    // S'abonner aux nouvelles notifications
    const unsubscribe = NotificationService.subscribeToNotifications(user.id, async (newNotification) => {
      console.log("New notification received:", newNotification)

      // Ajouter la nouvelle notification à la liste
      setNotifications((prev) => [newNotification, ...prev])

      // Incrémenter le compteur de notifications non lues
      setUnreadCount((prev) => prev + 1)
      
      // Si c'est une notification d'acceptation d'ami ou de suppression d'ami, notifier le service d'amis
      if (newNotification.type === "friend_accepted" || newNotification.type === "friend_removed") {
        console.log(`${newNotification.type} notification received, triggering friend update`)
        const { FriendService } = await import("@/services/friend-service")
        FriendService.notifyFriendshipChange()
      }

      // Si c'est une notification de souscription, notifier le service de souscription
      if (newNotification.type === "subscription_invitation" || 
          newNotification.type === "subscription_member_removed" || 
          newNotification.type === "subscription_removed" ||
          newNotification.type === "subscription_member_left" ||
          newNotification.type === "subscription_left" ||
          newNotification.type === "subscription_deleted") {
        console.log("Subscription notification received, triggering subscription update")
        const { SubscriptionService } = await import("@/services/subscription-service")
        
        // Déclencher la mise à jour des souscriptions
        SubscriptionService.notifySubscriptionChange()
        
        // Ajouter un petit délai pour s'assurer que la base de données est à jour
        setTimeout(() => {
          // Déclencher un événement personnalisé pour forcer la mise à jour des composants
          window.dispatchEvent(new CustomEvent("subscription-update", {
            detail: {
              type: newNotification.type,
              subscriptionId: newNotification.content.subscriptionId,
              message: newNotification.content.message
            }
          }))
        }, 100)
      }

      // Afficher une notification toast en fonction du type
      switch (newNotification.type) {
        case "friend_request":
          toast.info(`${newNotification.content.senderUsername} sent you a friend request`)
          break
        case "friend_accepted":
          toast.success(`${newNotification.content.senderUsername} accepted your friend request`)
          break
        case "friend_removed":
          // No toast for friend removal
          break
        case "payment_reminder":
          toast.info(`${newNotification.content.senderUsername} sent you a payment reminder`)
          break
        case "payment_received":
          toast.success(`${newNotification.content.senderUsername} sent you a payment`)
          break
        case "subscription_invitation":
          toast.info(`${newNotification.content.fromUsername} invited you to join ${newNotification.content.subscriptionName}`)
          break
        case "subscription_member_removed":
          toast.info(newNotification.content.message)
          break
        case "subscription_removed":
          toast.info(newNotification.content.message)
          break
        case "subscription_member_left":
          toast.info(newNotification.content.message)
          break
        case "subscription_left":
          toast.info(newNotification.content.message)
          break
      }
    })

    // Se désabonner quand le composant est démonté ou quand l'utilisateur change
    return () => {
      console.log("Unsubscribing from notifications")
      unsubscribe()
    }
  }, [user])

  // Marquer une notification comme lue
  const markAsRead = async (notificationId: string) => {
    if (!user) return

    try {
      const success = await NotificationService.markAsRead(notificationId)

      if (success) {
        // Mettre à jour la liste des notifications
        setNotifications((prev) =>
          prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif)),
        )

        // Mettre à jour le compteur
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error marking notification:", error)
    }
  }

  // Marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    if (!user) return

    try {
      const success = await NotificationService.markAllAsRead(user.id)

      if (success) {
        // Mettre à jour la liste des notifications
        setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))

        // Réinitialiser le compteur
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Error marking notifications:", error)
    }
  }

  // Gérer les demandes d'amitié
  const handleFriendRequest = async (notificationId: string, accept: boolean) => {
    if (!user) return

    try {
      // Trouver la notification
      const notification = notifications.find((n) => n.id === notificationId)
      if (!notification || notification.type !== "friend_request") return

      // Importer le service d'amitié dynamiquement pour éviter les dépendances circulaires
      const { FriendService } = await import("@/services/friend-service")

      // Récupérer l'ID de la demande d'amitié
      const { data: friendshipData, error: friendshipError } = await createClientComponentClient()
        .from("friendships")
        .select("id")
        .eq("user_id", notification.content.senderId)
        .eq("friend_id", user.id)
        .eq("status", "pending")
        .single()

      if (friendshipError) {
        console.error("Error retrieving friend request:", friendshipError)
        return
      }

      // Accepter ou rejeter la demande
      let success = false
      if (accept) {
        success = await FriendService.acceptFriendRequest(friendshipData.id)
        if (success) {
          toast.success(`You are now friends with ${notification.content.senderUsername}`)
          // Supprimer la notification de la base de données
          await NotificationService.deleteNotification(notificationId)
          // Supprimer immédiatement la notification de l'interface
          setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        }
      } else {
        success = await FriendService.rejectFriendRequest(friendshipData.id)
        if (success) {
          toast.info(`You have declined the friend request from ${notification.content.senderUsername}`)
          // Supprimer la notification de la base de données
          await NotificationService.deleteNotification(notificationId)
          // Supprimer immédiatement la notification de l'interface
          setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        }
      }
    } catch (error) {
      console.error("Error handling friend request:", error)
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        handleFriendRequest,
        handleSubscriptionInvitation,
        setNotifications,
        setUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)

  if (context === undefined) {
    throw new Error("useNotifications must be used inside a NotificationProvider")
  }

  return context
}

// Fonction utilitaire pour éviter les dépendances circulaires
function createClientComponentClient() {
  return require("@/lib/supabase").createClientComponentClient()
}
