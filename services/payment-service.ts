import { createClientComponentClient } from "@/lib/supabase"
import { NotificationService } from "./notification-service"

export interface Payment {
  id: string
  subscriptionId: string
  senderId: string
  receiverId: string
  amount: number
  currency: string
  status: "pending" | "completed" | "failed"
  transactionHash?: string
  createdAt: string
  updatedAt: string
}

export const PaymentService = {
  // Récupérer l'historique des paiements d'un utilisateur
  async getUserPaymentHistory(userId: string): Promise<Payment[]> {
    try {
      const supabase = createClientComponentClient()

      // Récupérer les paiements envoyés
      const { data: sentPayments, error: sentError } = await supabase
        .from("payments")
        .select("*")
        .eq("sender_id", userId)

      if (sentError) {
        console.error("Error retrieving sent payments:", sentError)
        return []
      }

      // Récupérer les paiements reçus
      const { data: receivedPayments, error: receivedError } = await supabase
        .from("payments")
        .select("*")
        .eq("receiver_id", userId)

      if (receivedError) {
        console.error("Error retrieving received payments:", receivedError)
        return []
      }

      // Transformer et fusionner les données
      const sent = sentPayments.map(transformPayment)
      const received = receivedPayments.map(transformPayment)

      return [...sent, ...received].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      console.error("Error retrieving payment history:", error)
      return []
    }
  },

  // Créer un nouveau paiement
  async createPayment(
    subscriptionId: string,
    senderId: string,
    receiverId: string,
    amount: number,
    currency = "USD",
    transactionHash?: string,
  ): Promise<Payment | null> {
    try {
      const supabase = createClientComponentClient()

      // Créer le paiement
      const { data, error } = await supabase
        .from("payments")
        .insert([
          {
            subscription_id: subscriptionId,
            sender_id: senderId,
            receiver_id: receiverId,
            amount,
            currency,
            status: transactionHash ? "completed" : "pending",
            transaction_hash: transactionHash,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Error creating payment:", error)
        return null
      }

      // Si le paiement est complété, mettre à jour le statut de paiement du membre
      if (transactionHash) {
        // Récupérer l'ID du membre
        const { data: memberData, error: memberError } = await supabase
          .from("subscription_members")
          .select("id")
          .eq("subscription_id", subscriptionId)
          .eq("user_id", senderId)
          .single()

        if (!memberError && memberData) {
          // Marquer comme payé
          const { error: updateError } = await supabase
            .from("subscription_members")
            .update({ paid: true })
            .eq("id", memberData.id)

          if (updateError) {
            console.error("Error updating payment status:", updateError)
          }
        }

        // Récupérer le nom de l'abonnement
        const { data: subscriptionData, error: subError } = await supabase
          .from("subscriptions")
          .select("name")
          .eq("id", subscriptionId)
          .single()

        if (!subError && subscriptionData) {
          // Créer une notification de paiement reçu
          await NotificationService.createPaymentReceivedNotification(
            senderId,
            receiverId,
            subscriptionId,
            subscriptionData.name,
            amount,
            transactionHash,
          )
        }
      }

      return transformPayment(data)
    } catch (error) {
      console.error("Error creating payment:", error)
      return null
    }
  },

  // Mettre à jour le statut d'un paiement
  async updatePaymentStatus(
    paymentId: string,
    status: "completed" | "failed",
    transactionHash?: string,
  ): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Récupérer les informations du paiement
      const { data: payment, error: fetchError } = await supabase
        .from("payments")
        .select("subscription_id, sender_id, receiver_id, amount")
        .eq("id", paymentId)
        .single()

      if (fetchError) {
        console.error("Error retrieving payment:", fetchError)
        return false
      }

      // Mettre à jour le statut
      const updateData: any = { status }
      if (transactionHash) updateData.transaction_hash = transactionHash

      const { error } = await supabase.from("payments").update(updateData).eq("id", paymentId)

      if (error) {
        console.error("Error updating payment status:", error)
        return false
      }

      // Si le paiement est complété, mettre à jour le statut de paiement du membre
      if (status === "completed") {
        // Récupérer l'ID du membre
        const { data: memberData, error: memberError } = await supabase
          .from("subscription_members")
          .select("id")
          .eq("subscription_id", payment.subscription_id)
          .eq("user_id", payment.sender_id)
          .single()

        if (!memberError && memberData) {
          // Marquer comme payé
          const { error: updateError } = await supabase
            .from("subscription_members")
            .update({ paid: true })
            .eq("id", memberData.id)

          if (updateError) {
            console.error("Error updating payment status:", updateError)
          }
        }

        // Récupérer le nom de l'abonnement
        const { data: subscriptionData, error: subError } = await supabase
          .from("subscriptions")
          .select("name")
          .eq("id", payment.subscription_id)
          .single()

        if (!subError && subscriptionData) {
          // Créer une notification de paiement reçu
          await NotificationService.createPaymentReceivedNotification(
            payment.sender_id,
            payment.receiver_id,
            payment.subscription_id,
            subscriptionData.name,
            payment.amount,
            transactionHash,
          )
        }
      }

      return true
    } catch (error) {
      console.error("Error updating payment status:", error)
      return false
    }
  },

  // Envoyer un rappel de paiement
  async sendPaymentReminder(
    subscriptionId: string,
    senderId: string,
    receiverId: string,
    amount: number,
  ): Promise<boolean> {
    try {
      const supabase = createClientComponentClient()

      // Récupérer le nom de l'abonnement
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("name")
        .eq("id", subscriptionId)
        .single()

      if (subError) {
        console.error("Error retrieving subscription:", subError)
        return false
      }

      // Créer une notification de rappel de paiement
      return await NotificationService.createPaymentReminderNotification(
        senderId,
        receiverId,
        subscriptionId,
        subscription.name,
        amount,
      )
    } catch (error) {
      console.error("Error sending payment reminder:", error)
      return false
    }
  },
}

// Fonction utilitaire pour transformer les données de la base de données en objet Payment
function transformPayment(dbPayment: any): Payment {
  return {
    id: dbPayment.id,
    subscriptionId: dbPayment.subscription_id,
    senderId: dbPayment.sender_id,
    receiverId: dbPayment.receiver_id,
    amount: dbPayment.amount,
    currency: dbPayment.currency,
    status: dbPayment.status,
    transactionHash: dbPayment.transaction_hash,
    createdAt: dbPayment.created_at,
    updatedAt: dbPayment.updated_at,
  }
}
