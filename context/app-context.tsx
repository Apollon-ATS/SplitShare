"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "react-hot-toast"

export interface Member {
  id: string
  name: string
  paid: boolean
  share: number
}

export interface Subscription {
  id: string
  name: string
  cost: number
  dueDate: string
  ownerId: string
  members: Member[]
  logo?: string
}

// Mettre à jour l'interface Friend pour inclure le statut de la requête
export interface Friend {
  id: string
  name: string
  email: string
  walletAddress?: string
  subscriptions: string[]
  status: "pending" | "accepted" | "rejected" | "none"
}

// Ajouter une interface pour les notifications
export interface Notification {
  id: string
  type: "friend_request" | "friend_response" | "payment_reminder" | "payment_received"
  from: string
  to: string
  message: string
  date: string
  read: boolean
  data?: any
}

interface AppContextType {
  subscriptions: Subscription[]
  setSubscriptions: React.Dispatch<React.SetStateAction<Subscription[]>>
  friends: Friend[]
  setFriends: React.Dispatch<React.SetStateAction<Friend[]>>
  notifications: Notification[]
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>
  addSubscription: (subscription: Omit<Subscription, "id" | "members">) => void
  removeSubscription: (id: string) => void
  addFriend: (friend: Omit<Friend, "id" | "subscriptions" | "status">) => void
  removeFriend: (id: string) => void
  addFriendToSubscription: (subscriptionId: string, friendEmail: string) => void
  removeFriendFromSubscription: (subscriptionId: string, memberId: string) => void
  sendFriendRequest: (email: string) => void
  respondToFriendRequest: (friendId: string, accept: boolean) => void
  markNotificationAsRead: (notificationId: string) => void
  getUnreadNotificationsCount: () => number
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// Initial data
const initialSubscriptions: Subscription[] = [
  {
    id: "netflix",
    name: "Netflix",
    cost: 15.99,
    dueDate: "2024-05-15",
    ownerId: "1",
    members: [
      { id: "1", name: "You", paid: true, share: 5.33 },
      { id: "2", name: "Alex", paid: true, share: 5.33 },
      { id: "3", name: "Sam", paid: false, share: 5.33 },
    ],
    logo: "/placeholder.svg?height=40&width=40",
  },
  {
    id: "spotify",
    name: "Spotify Family",
    cost: 14.99,
    dueDate: "2024-05-20",
    ownerId: "1",
    members: [
      { id: "1", name: "You", paid: true, share: 3.75 },
      { id: "4", name: "Jamie", paid: true, share: 3.75 },
      { id: "5", name: "Taylor", paid: true, share: 3.75 },
      { id: "6", name: "Jordan", paid: false, share: 3.75 },
    ],
    logo: "/placeholder.svg?height=40&width=40",
  },
]

// Mettre à jour les amis initiaux pour inclure le statut
const initialFriends: Friend[] = [
  {
    id: "2",
    name: "Alex Johnson",
    email: "alex@example.com",
    walletAddress: "0x123...456",
    subscriptions: ["netflix"],
    status: "accepted",
  },
  {
    id: "3",
    name: "Sam Wilson",
    email: "sam@example.com",
    walletAddress: "0x789...012",
    subscriptions: ["netflix"],
    status: "accepted",
  },
  {
    id: "4",
    name: "Jamie Lee",
    email: "jamie@example.com",
    walletAddress: "0x345...678",
    subscriptions: ["spotify"],
    status: "accepted",
  },
  {
    id: "5",
    name: "Taylor Smith",
    email: "taylor@example.com",
    walletAddress: "0x901...234",
    subscriptions: ["spotify"],
    status: "accepted",
  },
  {
    id: "6",
    name: "Jordan Casey",
    email: "jordan@example.com",
    walletAddress: "0x567...890",
    subscriptions: ["spotify"],
    status: "accepted",
  },
]

// Ajouter des notifications initiales vides
const initialNotifications: Notification[] = []

export function AppProvider({ children }: { children: React.ReactNode }) {
  // In the AppProvider function, modify the useState initializations to check for first-time users

  // Try to load from localStorage on initial render
  const [isFirstTimeUser, setIsFirstTimeUser] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ats-user-initialized") !== "true"
    }
    return true
  })

  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ats-subscriptions")
      // Only load initial data if not a first-time user and no saved data exists
      if (saved) {
        return JSON.parse(saved)
      } else if (!isFirstTimeUser) {
        return initialSubscriptions
      }
    }
    return [] // Empty array for first-time users
  })

  const [friends, setFriends] = useState<Friend[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ats-friends")
      // Only load initial data if not a first-time user and no saved data exists
      if (saved) {
        return JSON.parse(saved)
      } else if (!isFirstTimeUser) {
        return initialFriends
      }
    }
    return [] // Empty array for first-time users
  })

  // Ajouter l'état pour les notifications
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ats-notifications")
      if (saved) {
        return JSON.parse(saved)
      } else if (!isFirstTimeUser) {
        return initialNotifications
      }
    }
    return []
  })

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (subscriptions.length === 0) {
      localStorage.removeItem("ats-subscriptions")
    } else {
      localStorage.setItem("ats-subscriptions", JSON.stringify(subscriptions))
    }
  }, [subscriptions])

  useEffect(() => {
    localStorage.setItem("ats-friends", JSON.stringify(friends))
  }, [friends])

  // Sauvegarder les notifications dans localStorage
  useEffect(() => {
    localStorage.setItem("ats-notifications", JSON.stringify(notifications))
  }, [notifications])

  // Mark user as initialized after first interaction
  useEffect(() => {
    if (isFirstTimeUser && (subscriptions.length > 0 || friends.length > 0)) {
      localStorage.setItem("ats-user-initialized", "true")
      setIsFirstTimeUser(false)
    }
  }, [isFirstTimeUser, subscriptions.length, friends.length])

  // Add a new subscription
  const addSubscription = (subscription: Omit<Subscription, "id" | "members">) => {
    const newSubscription: Subscription = {
      id: `sub-${Date.now()}`,
      ...subscription,
      members: [{ id: "1", name: "You", paid: true, share: Number.parseFloat(subscription.cost.toString()) }],
    }
    setSubscriptions((prev) => [...prev, newSubscription])
  }

  // Remove a subscription
  const removeSubscription = (id: string) => {
    setSubscriptions((prev) => prev.filter((sub) => sub.id !== id))

    // Also update friends' subscriptions
    setFriends((prev) =>
      prev.map((friend) => ({
        ...friend,
        subscriptions: friend.subscriptions.filter((subId) => subId !== id),
      })),
    )
  }

  // Mettre à jour la fonction addFriend pour inclure le statut
  const addFriend = (friend: Omit<Friend, "id" | "subscriptions" | "status">) => {
    const newFriend: Friend = {
      id: `friend-${Date.now()}`,
      ...friend,
      subscriptions: [],
      status: "accepted",
    }
    setFriends((prev) => [...prev, newFriend])
  }

  // Remove a friend
  const removeFriend = (id: string) => {
    setFriends((prev) => prev.filter((friend) => friend.id !== id))

    // Also remove from subscriptions
    setSubscriptions((prev) =>
      prev.map((sub) => ({
        ...sub,
        members: sub.members.filter((member) => member.id !== id),
      })),
    )
  }

  // Add a friend to a subscription
  const addFriendToSubscription = (subscriptionId: string, friendEmail: string) => {
    // Find the friend by email
    const friend = friends.find((f) => f.email === friendEmail)

    if (!friend) {
      // If friend doesn't exist, create a new one with minimal info
      const newFriendName = friendEmail.split("@")[0]
      const newFriend: Friend = {
        id: `friend-${Date.now()}`,
        name: newFriendName,
        email: friendEmail,
        subscriptions: [subscriptionId],
        status: "none",
      }
      setFriends((prev) => [...prev, newFriend])

      // Update subscription with new member
      setSubscriptions((prev) =>
        prev.map((sub) => {
          if (sub.id === subscriptionId) {
            const newMember: Member = {
              id: newFriend.id,
              name: newFriendName,
              paid: false,
              share: Number((sub.cost / (sub.members.length + 1)).toFixed(2)),
            }

            // Recalculate shares for all members
            const updatedMembers = [...sub.members, newMember].map((member) => ({
              ...member,
              share: Number((sub.cost / (sub.members.length + 1)).toFixed(2)),
            }))

            return {
              ...sub,
              members: updatedMembers,
            }
          }
          return sub
        }),
      )
    } else {
      // If friend exists, add subscription to their list
      setFriends((prev) =>
        prev.map((f) => {
          if (f.id === friend.id) {
            return {
              ...f,
              subscriptions: [...f.subscriptions, subscriptionId],
            }
          }
          return f
        }),
      )

      // Update subscription with existing friend
      setSubscriptions((prev) =>
        prev.map((sub) => {
          if (sub.id === subscriptionId) {
            // Check if friend is already a member
            if (sub.members.some((member) => member.id === friend.id)) {
              return sub
            }

            const newMember: Member = {
              id: friend.id,
              name: friend.name,
              paid: false,
              share: Number((sub.cost / (sub.members.length + 1)).toFixed(2)),
            }

            // Recalculate shares for all members
            const updatedMembers = [...sub.members, newMember].map((member) => ({
              ...member,
              share: Number((sub.cost / (sub.members.length + 1)).toFixed(2)),
            }))

            return {
              ...sub,
              members: updatedMembers,
            }
          }
          return sub
        }),
      )
    }
  }

  // Remove a friend from a subscription
  const removeFriendFromSubscription = (subscriptionId: string, memberId: string) => {
    // Update subscription by removing the member
    setSubscriptions((prev) =>
      prev.map((sub) => {
        if (sub.id === subscriptionId) {
          const updatedMembers = sub.members.filter((member) => member.id !== memberId)

          // Recalculate shares for remaining members
          const recalculatedMembers = updatedMembers.map((member) => ({
            ...member,
            share: Number((sub.cost / updatedMembers.length).toFixed(2)),
          }))

          return {
            ...sub,
            members: recalculatedMembers,
          }
        }
        return sub
      }),
    )

    // Update friend by removing the subscription
    setFriends((prev) =>
      prev.map((friend) => {
        if (friend.id === memberId) {
          return {
            ...friend,
            subscriptions: friend.subscriptions.filter((subId) => subId !== subscriptionId),
          }
        }
        return friend
      }),
    )
  }

  // Ajouter une fonction pour envoyer une requête d'ami
  const sendFriendRequest = (email: string) => {
    // Vérifier si l'ami existe déjà
    const existingFriend = friends.find((f) => f.email === email)
    if (existingFriend) {
      if (existingFriend.status === "accepted") {
        toast.error("Cette personne est déjà dans votre liste d'amis")
        return
      } else if (existingFriend.status === "pending") {
        toast.error("Une invitation est déjà en attente pour cet utilisateur")
        return
      }
    }

    // Créer un nouvel ami avec le statut "pending"
    const newFriendName = email.split("@")[0]
    const newFriendId = `friend-${Date.now()}`
    const newFriend: Friend = {
      id: newFriendId,
      name: newFriendName,
      email: email,
      subscriptions: [],
      status: "pending",
    }
    setFriends((prev) => [...prev, newFriend])

    // Créer une notification pour l'ami
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      type: "friend_request",
      from: "You",
      to: newFriendId,
      message: `Vous avez reçu une invitation de la part de You pour rejoindre SplitShare`,
      date: new Date().toISOString(),
      read: false,
      data: { friendId: newFriendId },
    }
    setNotifications((prev) => [...prev, newNotification])

    toast.success(`Invitation envoyée à ${email}`)
  }

  // Ajouter une fonction pour répondre à une requête d'ami
  const respondToFriendRequest = (friendId: string, accept: boolean) => {
    // Mettre à jour le statut de l'ami
    setFriends((prev) =>
      prev.map((friend) => {
        if (friend.id === friendId) {
          return {
            ...friend,
            status: accept ? "accepted" : "rejected",
          }
        }
        return friend
      }),
    )

    // Trouver l'ami pour obtenir son nom
    const friend = friends.find((f) => f.id === friendId)
    const friendName = friend ? friend.name : "Utilisateur"

    // Créer une notification pour l'utilisateur qui a envoyé la requête
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      type: "friend_response",
      from: friendId,
      to: "You",
      message: accept ? `${friendName} a accepté votre invitation` : `${friendName} a refusé votre invitation`,
      date: new Date().toISOString(),
      read: false,
    }
    setNotifications((prev) => [...prev, newNotification])

    toast.success(
      accept ? `Vous avez accepté l'invitation de ${friendName}` : `Vous avez refusé l'invitation de ${friendName}`,
    )
  }

  // Ajouter une fonction pour marquer une notification comme lue
  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notification) => {
        if (notification.id === notificationId) {
          return {
            ...notification,
            read: true,
          }
        }
        return notification
      }),
    )
  }

  // Ajouter une fonction pour compter les notifications non lues
  const getUnreadNotificationsCount = () => {
    return notifications.filter((notification) => !notification.read).length
  }

  return (
    <AppContext.Provider
      value={{
        subscriptions,
        setSubscriptions,
        friends,
        setFriends,
        notifications,
        setNotifications,
        addSubscription,
        removeSubscription,
        addFriend,
        removeFriend,
        addFriendToSubscription,
        removeFriendFromSubscription,
        sendFriendRequest,
        respondToFriendRequest,
        markNotificationAsRead,
        getUnreadNotificationsCount,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider")
  }
  return context
}
