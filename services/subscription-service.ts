import { createClientComponentClient } from "@/lib/supabase"
import type { User } from "./auth-service"

export interface Subscription {
  id: string
  name: string
  cost: number
  billingCycle: string
  dueDate: string
  ownerId: string
  logoUrl: string | null
  createdAt: string
  updatedAt: string
  members?: SubscriptionMember[]
  metadata?: {
    type: string
    userId: string
    username?: string
  }
}

export interface SubscriptionMember {
  id: string
  subscriptionId: string
  userId: string
  share: number
  paid: boolean
  createdAt: string
  updatedAt: string
  user?: User
}

export interface SubscriptionInvitation {
  id: string
  subscriptionId: string
  subscriptionName: string
  fromUserId: string
  fromUsername: string
  toUserId: string
  cost: number
  createdAt: string
}

// Helper function to transform database subscription to app format
function transformSubscription(data: any): Subscription {
  return {
    id: data.id,
    name: data.name,
    cost: Number(data.cost),
    billingCycle: data.billing_cycle,
    dueDate: data.due_date,
    ownerId: data.owner_id,
    logoUrl: data.logo_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export const SubscriptionService = {
  // Get all subscriptions for a user
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      const supabase = createClientComponentClient()

      // Get subscriptions where user is owner
      const { data: ownedSubscriptions, error: ownedError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("owner_id", userId)

      if (ownedError) {
        console.error("Error retrieving owned subscriptions:", ownedError)
        return []
      }

      // Get subscriptions where user is member
      const { data: memberSubscriptions, error: memberError } = await supabase
        .from("subscription_members")
        .select(`
          subscription_id,
          subscriptions (*)
        `)
        .eq("user_id", userId)

      if (memberError) {
        console.error("Error retrieving shared subscriptions:", memberError)
        return []
      }

      // Transform data
      const owned = ownedSubscriptions.map(transformSubscription)
      const shared = memberSubscriptions
        .filter((item: any) => item.subscriptions)
        .map((item: any) => transformSubscription(item.subscriptions))

      // Merge and deduplicate subscriptions
      const allSubscriptions = [...owned]
      shared.forEach((sub: Subscription) => {
        if (!allSubscriptions.some((s) => s.id === sub.id)) {
          allSubscriptions.push(sub)
        }
      })

      // Get members for each subscription
      for (const subscription of allSubscriptions) {
        subscription.members = await this.getSubscriptionMembers(subscription.id)
      }

      return allSubscriptions
    } catch (error) {
      console.error("Error retrieving subscriptions:", error)
      return []
    }
  },

  // Get subscription members
  async getSubscriptionMembers(subscriptionId: string): Promise<SubscriptionMember[]> {
    try {
      const supabase = createClientComponentClient()
      const user = await supabase.auth.getUser()
      const userId = user?.data?.user?.id

      if (!userId) {
        console.error("No user id found in session")
        return []
      }

      // 1. Récupère les groupes où l'utilisateur courant est membre
      const { data: myMemberships, error: membershipsError } = await supabase
        .from("subscription_members")
        .select("subscription_id")
        .eq("user_id", userId)

      if (membershipsError) {
        console.error("Error loading memberships:", membershipsError)
        return []
      }

      const myGroupIds = myMemberships ? myMemberships.map((m: any) => m.subscription_id) : []

      // 2. Récupère la subscription pour vérifier si l'utilisateur est owner
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("owner_id")
        .eq("id", subscriptionId)
        .maybeSingle()

      if (subError) {
        console.error("Error loading subscription:", subError)
        return []
      }

      const isMember = myGroupIds.includes(subscriptionId)
      const isOwner = subscription && subscription.owner_id === userId

      if (!isMember && !isOwner) {
        // L'utilisateur n'a pas le droit de voir les membres
        return []
      }

      // 3. Récupère les membres du groupe
      const { data, error } = await supabase
        .from("subscription_members")
        .select(`*, user:users (id, username, email, avatar_url)`)
        .eq("subscription_id", subscriptionId)

      if (error) {
        console.error("Error retrieving subscription members:", error)
        return []
      }

      return data.map((member: any) => ({
        id: member.id,
        subscriptionId: member.subscription_id,
        userId: member.user_id,
        share: Number(member.share),
        paid: member.paid,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
        user: member.user,
      }))
    } catch (error) {
      console.error("Error retrieving subscription members:", error)
      return []
    }
  },

  // Create new subscription
  async createSubscription(
    ownerId: string,
    name: string,
    cost: number,
    dueDate: string,
    billingCycle = "monthly",
    logoUrl?: string,
  ): Promise<Subscription | null> {
    try {
      const supabase = createClientComponentClient()

      // Create subscription
      const { data, error } = await supabase
        .from("subscriptions")
        .insert([
          {
            name,
            cost,
            due_date: dueDate,
            billing_cycle: billingCycle,
            owner_id: ownerId,
            logo_url: logoUrl,
          },
        ])
        .select()
        .maybeSingle()

      if (error) {
        console.error("Error creating subscription:", error)
        return null
      }

      if (!data) {
        console.error('No data found for this query')
        return null
      }

      // Add owner as member
      const { error: memberError } = await supabase.from("subscription_members").insert({
          subscription_id: data.id,
          user_id: ownerId,
          share: cost,
          paid: true,
      })

      if (memberError) {
        console.error("Error adding owner as member:", memberError)
      }

      // Get the complete subscription with members
      const subscription = transformSubscription(data)
      subscription.members = await this.getSubscriptionMembers(data.id)

      // Notify about the change
      this.notifySubscriptionChange()

      return subscription
    } catch (error) {
      console.error("Error creating subscription:", error)
      return null
    }
  },

  // Update subscription
  async updateSubscription(
    subscriptionId: string,
    updates: {
      name?: string
      cost?: number
      dueDate?: string
      billingCycle?: string
      logoUrl?: string
    },
  ): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      const updateData: any = {}
      if (updates.name) updateData.name = updates.name
      if (updates.cost) updateData.cost = updates.cost
      if (updates.dueDate) updateData.due_date = updates.dueDate
      if (updates.billingCycle) updateData.billing_cycle = updates.billingCycle
      if (updates.logoUrl) updateData.logo_url = updates.logoUrl

      const { error } = await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("id", subscriptionId)

      if (error) {
        console.error("Error updating subscription:", error)
        return false
      }

      // Recalculate shares if cost was updated
      if (updates.cost) {
        await this.recalculateShares(subscriptionId)
      }

      return true
    } catch (error) {
      console.error("Error updating subscription:", error)
      return false
    }
  },

  // Recalculate shares for all members
  async recalculateShares(subscriptionId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Get subscription cost
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("cost")
        .eq("id", subscriptionId)
        .maybeSingle()

      if (subError) {
        console.error("Error retrieving subscription:", subError)
        return false
      }

      if (!subscription) {
        console.error('No data found for this query')
        return false
      }

      // Get all members
      const { data: members, error: membersError } = await supabase
        .from("subscription_members")
        .select("id")
        .eq("subscription_id", subscriptionId)

      if (membersError) {
        console.error("Error retrieving members:", membersError)
        return false
      }

      // Calculate new share amount
      const shareAmount = subscription.cost / members.length

      // Update all members' shares
      const { error: updateError } = await supabase
        .from("subscription_members")
        .update({ share: shareAmount })
        .eq("subscription_id", subscriptionId)

      if (updateError) {
        console.error("Error updating shares:", updateError)
        return false
      }

      return true
    } catch (error) {
      console.error("Error recalculating shares:", error)
      return false
    }
  },

  // Invite friend to subscription
  async inviteFriendToSubscription(
    subscriptionId: string,
    friendId: string,
    currentUserId: string,
    currentUsername: string,
  ): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Get subscription info
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("name, cost")
        .eq("id", subscriptionId)
        .maybeSingle()

      if (subError) {
        console.error("Error retrieving subscription:", subError)
        return false
      }

      if (!subscription) {
        console.error('No data found for this query')
        return false
      }

      // Create notification for invitation
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: friendId,
        type: "subscription_invitation",
        content: JSON.stringify({
          subscriptionId,
          subscriptionName: subscription.name,
          fromUserId: currentUserId,
          fromUsername: currentUsername,
          cost: subscription.cost,
        }),
        metadata: JSON.stringify({
          subscriptionId,
          fromUserId: currentUserId,
        }),
        read: false,
      })

      if (notifError) {
        console.error("Error sending invitation:", notifError)
        return false
      }

      return true
    } catch (error) {
      console.error("Error inviting friend to subscription:", error)
      return false
    }
  },

  // Accept subscription invitation
  async acceptSubscriptionInvitation(notificationId: string, userId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Get notification
      const { data: notification, error: notifError } = await supabase
        .from("notifications")
        .select("content")
        .eq("id", notificationId)
        .eq("user_id", userId)
        .maybeSingle()

      if (notifError) {
        console.error("Error retrieving invitation:", notifError)
        return false
      }

      if (!notification) {
        console.error('No data found for this query')
        return false
      }

      // Extract invitation info
      const content = JSON.parse(notification.content)
      const subscriptionId = content.subscriptionId

      // Get subscription cost
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("cost")
        .eq("id", subscriptionId)
        .maybeSingle()

      if (subError) {
        console.error("Error retrieving subscription:", subError)
        return false
      }

      if (!subscription) {
        console.error('No data found for this query')
        return false
      }

      // Get current member count
      const { data: members, error: membersError } = await supabase
        .from("subscription_members")
        .select("id")
        .eq("subscription_id", subscriptionId)

      if (membersError) {
        console.error("Error retrieving members:", membersError)
        return false
      }

      // Calculate share amount
      const memberCount = members.length + 1
      const share = subscription.cost / memberCount

      // Add friend as member
      const { error: insertError } = await supabase.from("subscription_members").insert({
        subscription_id: subscriptionId,
        user_id: userId,
        share,
        paid: false,
      })

      if (insertError) {
        console.error("Error adding member to subscription:", insertError)
        return false
      }

      // Mark notification as read
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)

      if (updateError) {
        console.error("Error marking notification as read:", updateError)
      }

      return true
    } catch (error) {
      console.error("Error accepting subscription invitation:", error)
      return false
    }
  },

  // Get subscription invitations for user
  async getSubscriptionInvitations(userId: string): Promise<SubscriptionInvitation[]> {
    try {
      const supabase = createClientComponentClient()

      const { data, error } = await supabase
        .from("notifications")
        .select("id, content, created_at")
        .eq("user_id", userId)
        .eq("type", "subscription_invitation")
        .eq("read", false)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error retrieving subscription invitations:", error)
        return []
      }

      return data.map((item: { id: string; content: string; created_at: string }) => {
        const content = JSON.parse(item.content)
        return {
          id: item.id,
          subscriptionId: content.subscriptionId,
          subscriptionName: content.subscriptionName,
          fromUserId: content.fromUserId,
          fromUsername: content.fromUsername,
          toUserId: userId,
          cost: content.cost,
          createdAt: item.created_at,
        }
      })
    } catch (error) {
      console.error("Error retrieving subscription invitations:", error)
      return []
    }
  },

  // Delete subscription
  async deleteSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Get subscription details and all members before deletion
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('name, cost')
        .eq('id', subscriptionId)
        .maybeSingle()

      if (subError) {
        console.error('Error getting subscription:', subError)
        return false
      }

      if (!subscription) {
        console.error('No data found for this query')
        return false
      }

      // Get all members
      const { data: members, error: membersError } = await supabase
        .from('subscription_members')
        .select('user_id')
        .eq('subscription_id', subscriptionId)

      if (membersError) {
        console.error('Error getting members:', membersError)
        return false
      }

      // Create notifications for all members
      for (const member of members) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: member.user_id,
            type: 'subscription_deleted',
            content: {
              subscriptionId,
              subscriptionName: subscription.name,
              message: `The subscription ${subscription.name} has been deleted`
            },
            read: false
          })

        if (notifError) {
          console.error('Error creating deletion notification:', notifError)
          // Continue even if notification creation fails
        }
      }

      // Delete all members first
      const { error: deleteMembersError } = await supabase
        .from('subscription_members')
        .delete()
        .eq('subscription_id', subscriptionId)

      if (deleteMembersError) {
        console.error('Error deleting subscription members:', deleteMembersError)
        return false
      }

      // Delete the subscription
      const { error: deleteSubError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subscriptionId)

      if (deleteSubError) {
        console.error('Error deleting subscription:', deleteSubError)
        return false
      }

      // Notify all members about the change
      this.notifySubscriptionChange()
      return true
    } catch (error) {
      console.error('Error deleting subscription:', error)
      return false
    }
  },

  // Notify subscription changes
  notifySubscriptionChange() {
    // Dispatch a custom event that components can listen to
    window.dispatchEvent(new CustomEvent("subscription-change"))
  },

  async leaveSubscription(subscriptionId: string, userId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Get subscription and user details
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('name, cost, owner_id')
        .eq('id', subscriptionId)
        .maybeSingle()

      if (subError) {
        console.error('Error getting subscription:', subError)
        throw subError
      }

      if (!subscription) {
        console.error('No data found for this query')
        throw new Error('No data found for this query')
      }

      // Si c'est le propriétaire qui quitte, on doit d'abord transférer la propriété
      if (subscription.owner_id === userId) {
        // Trouver un autre membre pour devenir propriétaire
        const { data: members, error: membersError } = await supabase
          .from('subscription_members')
          .select('user_id')
          .eq('subscription_id', subscriptionId)
          .neq('user_id', userId)

        if (membersError) {
          console.error('Error getting members:', membersError)
          throw membersError
        }

        if (members && members.length > 0) {
          // Transférer la propriété au premier membre trouvé
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ owner_id: members[0].user_id })
            .eq('id', subscriptionId)

          if (updateError) {
            console.error('Error transferring ownership:', updateError)
            throw updateError
          }
        } else {
          // Si c'est le dernier membre, supprimer la souscription
          return await this.deleteSubscription(subscriptionId)
        }
      }

      const { data: leavingMember, error: memberError } = await supabase
        .from('users')
        .select('username')
        .eq('id', userId)
        .maybeSingle()

      if (memberError) {
        console.error('Error getting member details:', memberError)
        throw memberError
      }

      if (!leavingMember) {
        console.error('No data found for this query')
        throw new Error('No data found for this query')
      }

      // Get all current members to notify them
      const { data: currentMembers, error: membersError } = await supabase
        .from('subscription_members')
        .select('user_id')
        .eq('subscription_id', subscriptionId)

      if (membersError) {
        console.error('Error getting current members:', membersError)
        throw membersError
      }

      // Supprimer les notifications d'invitation pour le membre qui part
      const { error: notificationError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('type', 'subscription_invitation')
        .contains('metadata', { subscriptionId })

      if (notificationError) {
        console.error('Error deleting notifications:', notificationError)
        // Continue even if notification deletion fails
      }

      // Delete the member from the subscription
      const { error: deleteError } = await supabase
        .from('subscription_members')
        .delete()
        .match({ subscription_id: subscriptionId, user_id: userId })

      if (deleteError) {
        console.error('Error removing member:', deleteError)
        throw deleteError
      }

      // Get the remaining members
      const { data: remainingMembers } = await supabase
        .from('subscription_members')
        .select('*')
        .eq('subscription_id', subscriptionId)

      if (remainingMembers) {
        // Recalculate shares for remaining members
        const newShare = subscription.cost / remainingMembers.length

        // Update shares for all remaining members
        for (const member of remainingMembers) {
          const { error: updateError } = await supabase
            .from('subscription_members')
            .update({ share: newShare })
            .match({ subscription_id: subscriptionId, user_id: member.user_id })

          if (updateError) {
            console.error('Error updating member share:', updateError)
            throw updateError
          }

          // Create notification for each remaining member
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: member.user_id,
              type: 'subscription_member_left',
              content: {
                subscriptionId,
                subscriptionName: subscription.name,
                leavingMemberId: userId,
                leavingMemberUsername: leavingMember.username,
                message: `${leavingMember.username} has left ${subscription.name}`
              },
              read: false
            })

          if (notifError) {
            console.error('Error creating leave notification:', notifError)
            // Continue even if notification creation fails
          }
        }
      }

      // Create notification for the leaving member
      const { error: leavingNotifError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'subscription_left',
          content: {
            subscriptionId,
            subscriptionName: subscription.name,
            message: `You have left ${subscription.name}`
          },
          read: false
        })

      if (leavingNotifError) {
        console.error('Error creating leave notification for leaving member:', leavingNotifError)
        // Continue even if notification creation fails
      }

      // Notify all members about the change
      this.notifySubscriptionChange()
      return true
    } catch (error) {
      console.error('Error leaving subscription:', error)
      return false
    }
  },

  async removeMember(subscriptionId: string, memberId: string, ownerId: string): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Verify that the user is the owner
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('name, cost, owner_id')
        .eq('id', subscriptionId)
        .maybeSingle()

      if (subError) {
        console.error('Error getting subscription:', subError)
        throw subError
      }

      if (!subscription) {
        console.error('No data found for this query')
        throw new Error('No data found for this query')
      }

      if (subscription.owner_id !== ownerId) {
        console.error('Only the owner can remove members')
        throw new Error('Only the owner can remove members')
      }

      const { data: removedMember, error: memberError } = await supabase
        .from('users')
        .select('username')
        .eq('id', memberId)
        .maybeSingle()

      if (memberError) {
        console.error('Error getting member details:', memberError)
        throw memberError
      }

      if (!removedMember) {
        console.error('No data found for this query')
        throw new Error('No data found for this query')
      }

      // Get all current members to notify them
      const { data: currentMembers, error: membersError } = await supabase
        .from('subscription_members')
        .select('user_id')
        .eq('subscription_id', subscriptionId)

      if (membersError) {
        console.error('Error getting current members:', membersError)
        throw membersError
      }

      // Delete all notifications related to this subscription for the removed member
      const { error: notificationError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', memberId)
        .eq('type', 'subscription_invitation')
        .contains('metadata', { subscriptionId })

      if (notificationError) {
        console.error('Error deleting notifications:', notificationError)
        // Continue even if notification deletion fails
      }

      // Delete the member from the subscription
      const { error: deleteError } = await supabase
        .from('subscription_members')
        .delete()
        .match({ subscription_id: subscriptionId, user_id: memberId })

      if (deleteError) {
        console.error('Error removing member:', deleteError)
        throw deleteError
      }

      // Get the remaining members
      const { data: remainingMembers } = await supabase
        .from('subscription_members')
        .select('*')
        .eq('subscription_id', subscriptionId)

      if (remainingMembers) {
        // Recalculate shares for remaining members
        const newShare = subscription.cost / remainingMembers.length

        // Update shares for all remaining members
        for (const member of remainingMembers) {
          const { error: updateError } = await supabase
            .from('subscription_members')
            .update({ share: newShare })
            .match({ subscription_id: subscriptionId, user_id: member.user_id })

          if (updateError) {
            console.error('Error updating member share:', updateError)
            throw updateError
          }

          // Create notification for each remaining member
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: member.user_id,
              type: 'subscription_member_removed',
              content: {
                subscriptionId,
                subscriptionName: subscription.name,
                removedMemberId: memberId,
                removedMemberUsername: removedMember.username,
                message: `${removedMember.username} has been removed from ${subscription.name} by the owner`
              },
              metadata: JSON.stringify({
                subscriptionId,
                removedMemberId: memberId
              }),
              read: false
            })

          if (notifError) {
            console.error('Error creating removal notification:', notifError)
            // Continue even if notification creation fails
          }
        }
      }

      // Create notification for the removed member
      const { error: removedNotifError } = await supabase
        .from('notifications')
        .insert({
          user_id: memberId,
          type: 'subscription_removed',
          content: {
            subscriptionId,
            subscriptionName: subscription.name,
            message: `You have been removed from ${subscription.name} by the owner`
          },
          metadata: JSON.stringify({
            subscriptionId
          }),
          read: false
        })

      if (removedNotifError) {
        console.error('Error creating removal notification for removed member:', removedNotifError)
        // Continue even if notification deletion fails
      }

      // Notify all members about the change
      this.notifySubscriptionChange()
      return true
    } catch (error) {
      console.error('Error removing member:', error)
      return false
    }
  },

  // Subscribe to subscription changes
  subscribeToSubscriptionChanges(userId: string, callback: (subscription: Subscription) => void) {
    const supabase = createClientComponentClient()

    // Subscribe to subscription_members changes
    const subscriptionMembersChannel = supabase
      .channel('subscription_members_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscription_members',
        },
        async (payload: any) => {
          try {
            // For DELETE events, we need to check if the user was a member
            if (payload.eventType === 'DELETE') {
              const { data: wasMember } = await supabase
                .from('subscription_members')
                .select('subscription_id')
                .eq('subscription_id', payload.old.subscription_id)
                .eq('user_id', userId)
                .maybeSingle()

              if (wasMember) {
                // Get the user who left
                const { data: userData } = await supabase
                  .from('users')
                  .select('username')
                  .eq('id', payload.old.user_id)
                  .maybeSingle()

                callback({
                  id: payload.old.subscription_id,
                  metadata: {
                    type: 'member_left',
                    userId: payload.old.user_id,
                    username: userData?.username || 'Unknown user'
                  }
                } as Subscription)
              }
            } else {
              // For other events, check if the user is currently a member
              const { data: memberCheck } = await supabase
                .from('subscription_members')
                .select('*')
                .eq('subscription_id', payload.new.subscription_id)
                .eq('user_id', userId)
                .maybeSingle()

              if (memberCheck) {
                const { data: subscription } = await supabase
                  .from('subscriptions')
                  .select('*')
                  .eq('id', payload.new.subscription_id)
                  .maybeSingle()

                if (subscription) {
                  const transformedSubscription = transformSubscription(subscription)
                  transformedSubscription.members = await this.getSubscriptionMembers(subscription.id)
                  callback(transformedSubscription)
                }
              }
            }
          } catch (error) {
            console.error('Error handling subscription change:', error)
          }
        }
      )
      .subscribe()

    // Subscribe to subscriptions changes
    const subscriptionsChannel = supabase
      .channel('subscriptions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        },
        async (payload: any) => {
          try {
            if (payload.eventType === 'DELETE') {
              // Check if the user was a member
              const { data: wasMember } = await supabase
                .from('subscription_members')
                .select('subscription_id')
                .eq('subscription_id', payload.old.id)
                .eq('user_id', userId)
                .maybeSingle()

              if (wasMember) {
                callback({
                  id: payload.old.id,
                  metadata: {
                    type: 'subscription_deleted'
                  }
                } as Subscription)
              }
            } else {
              // Check if the user is currently a member
              const { data: memberCheck } = await supabase
                .from('subscription_members')
                .select('*')
                .eq('subscription_id', payload.new.id)
                .eq('user_id', userId)
                .maybeSingle()

              if (memberCheck) {
                const { data: subscription } = await supabase
                  .from('subscriptions')
                  .select('*')
                  .eq('id', payload.new.id)
                  .maybeSingle()

                if (subscription) {
                  const transformedSubscription = transformSubscription(subscription)
                  transformedSubscription.members = await this.getSubscriptionMembers(subscription.id)
                  callback(transformedSubscription)
                }
              }
            }
          } catch (error) {
            console.error('Error handling subscription change:', error)
          }
        }
      )
      .subscribe()

    // Return cleanup function
    return () => {
      subscriptionMembersChannel.unsubscribe()
      subscriptionsChannel.unsubscribe()
    }
  },
}
