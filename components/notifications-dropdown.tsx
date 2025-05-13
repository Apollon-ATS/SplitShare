"use client"

import { useState, useRef, useEffect } from "react"
import { Bell, Check, X, Clock, CreditCard, UserPlus, UserCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { useNotifications, NotificationType } from "@/context/notification-context"
import { createClientComponentClient } from "@/lib/supabase"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { NotificationService } from "@/services/notification-service"

export function NotificationsDropdown() {
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, handleFriendRequest, handleSubscriptionInvitation, setNotifications, setUnreadCount } = useNotifications()
  const [open, setOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const supabase = createClientComponentClient()
  const [dropdownRef, setDropdownRef] = useState<HTMLDivElement | null>(null)

  // Référence pour l'animation
  const notificationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (notifications.length > 0 && !notifications[0].read) {
      // Déclencher l'animation
      if (notificationRef.current) {
        NotificationService.triggerNotificationAnimation(notificationRef.current)
      }
    }
  }, [notifications])

  // Marquer les notifications comme lues lorsque le menu est ouvert
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen && unreadCount > 0) {
      markAllAsRead()
    }
  }

  // Effacer toutes les notifications
  const handleClearAllNotifications = async () => {
    if (!user) return

    try {
      setIsClearing(true)
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      toast.success('All notifications have been cleared')
      window.dispatchEvent(new CustomEvent('notification-change'))
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error('Error clearing notifications:', error)
      toast.error('Failed to clear notifications')
    } finally {
      setIsClearing(false)
    }
  }

  // Formater la date relative
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr })
    } catch (error) {
      return "recently"
    }
  }

  // Obtenir l'initiale pour l'avatar
  const getInitial = (name: string) => {
    return name?.charAt(0).toUpperCase() || "U"
  }

  // Obtenir l'icône en fonction du type de notification
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request":
        return <UserPlus className="h-4 w-4 text-blue-500" />
      case "friend_accepted":
        return <UserCheck className="h-4 w-4 text-green-500" />
      case "payment_reminder":
        return <Clock className="h-4 w-4 text-orange-500" />
      case "payment_received":
        return <CreditCard className="h-4 w-4 text-green-500" />
      case "friend_removed":
        return <X className="h-4 w-4 text-red-500" />
      case "subscription_invitation":
        return <CreditCard className="h-4 w-4 text-blue-500" />
      case "subscription_member_removed":
        return <X className="h-4 w-4 text-red-500" />
      case "subscription_removed":
        return <X className="h-4 w-4 text-red-500" />
      case "subscription_member_left":
        return <UserPlus className="h-4 w-4 text-orange-500" />
      case "subscription_left":
        return <UserPlus className="h-4 w-4 text-orange-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative rounded-full border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          <Bell className="h-4 w-4" />
          {notifications.some((n) => !n.read) && (
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500" ref={notificationRef} />
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => markAllAsRead()}>
                Mark all as read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleClearAllNotifications}
                disabled={isClearing}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {isClearing ? "Clearing..." : "Clear all"}
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No notifications at the moment</div>
          ) : (
            <DropdownMenuGroup>
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`p-3 cursor-pointer ${!notification.read ? "bg-gray-50" : ""}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {getInitial(
                          notification.content.senderUsername || 
                          notification.content.fromUsername || 
                          notification.content.leavingMemberUsername || 
                          notification.content.removedMemberUsername || 
                          notification.content.senderId
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getNotificationIcon(notification.type)}
                        <p className="text-sm font-medium">
                          {notification.type === "friend_request" && "Friend Request"}
                          {notification.type === "friend_accepted" && "Request Accepted"}
                          {notification.type === "payment_reminder" && "Payment Reminder"}
                          {notification.type === "payment_received" && "Payment Received"}
                          {notification.type === "friend_removed" && "Friend Removed"}
                          {notification.type === "subscription_invitation" && "Subscription Invitation"}
                          {notification.type === "subscription_member_removed" && "Member Removed"}
                          {notification.type === "subscription_removed" && "Subscription Removed"}
                          {notification.type === "subscription_member_left" && "Member Left"}
                          {notification.type === "subscription_left" && "Subscription Left"}
                        </p>
                      </div>
                      <p className="text-sm">
                        {notification.type === "friend_request" &&
                          `${notification.content.senderUsername} sent you a friend request`}
                        {notification.type === "friend_accepted" &&
                          `${notification.content.senderUsername} accepted your friend request`}
                        {notification.type === "payment_reminder" &&
                          `${notification.content.senderUsername} sent you a payment reminder for ${notification.content.subscriptionName}`}
                        {notification.type === "payment_received" &&
                          `${notification.content.senderUsername} sent you a payment of ${notification.content.amount} for ${notification.content.subscriptionName}`}
                        {notification.type === "friend_removed" &&
                          notification.content.message}
                        {notification.type === "subscription_invitation" &&
                          `${notification.content.fromUsername} invited you to join ${notification.content.subscriptionName} ($${notification.content.cost}/month)`}
                        {notification.type === "subscription_member_removed" &&
                          notification.content.message}
                        {notification.type === "subscription_removed" &&
                          notification.content.message}
                        {notification.type === "subscription_member_left" &&
                          notification.content.message}
                        {notification.type === "subscription_left" &&
                          notification.content.message}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(notification.createdAt)}</p>

                      {notification.type === "friend_request" && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            className="h-7 bg-primary text-white hover:bg-primary/90"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleFriendRequest(notification.id, true)
                            }}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleFriendRequest(notification.id, false)
                            }}
                          >
                            <X className="mr-1 h-3 w-3" />
                            Decline
                          </Button>
                        </div>
                      )}

                      {notification.type === "subscription_invitation" && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            className="h-7 bg-primary text-white hover:bg-primary/90"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSubscriptionInvitation(notification.id, true)
                            }}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSubscriptionInvitation(notification.id, false)
                            }}
                          >
                            <X className="mr-1 h-3 w-3" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                    {!notification.read && <div className="h-2 w-2 rounded-full bg-blue-500"></div>}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
