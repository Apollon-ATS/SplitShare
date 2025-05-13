import { createClientComponentClient } from "@/lib/supabase"

export interface User {
  id: string
  walletAddress: string
  username: string | null
  email: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export const AuthService = {
  // Enregistrer ou mettre à jour un utilisateur après connexion avec Phantom
  async registerOrUpdateUser(walletAddress: string, username?: string, email?: string): Promise<User | null> {
    try {
      const supabase = createClientComponentClient()

      console.log("Attempting registration/update for:", walletAddress)

      // Vérifier si l'utilisateur existe déjà
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("wallet_address", walletAddress)
        .maybeSingle()

      if (fetchError) {
        console.error("Error searching for user:", fetchError)
        // Si l'erreur est due aux RLS policies, essayons une approche différente
        if (fetchError.code === "PGRST301" || fetchError.message.includes("permission denied")) {
          console.log("Permission error, trying with an RPC function...")
          // Utiliser une fonction RPC pour contourner les RLS
          const { data: rpcData, error: rpcError } = await supabase.rpc("get_user_by_wallet", {
            wallet_addr: walletAddress,
          })

          if (rpcError) {
            console.error("RPC Error:", rpcError)
            return null
          }

          if (rpcData) {
            return transformUser(rpcData)
          }
        } else {
          return null
        }
      }

      if (existingUser) {
        console.log("Existing user found:", existingUser)
        // Mettre à jour l'utilisateur uniquement si des nouvelles valeurs sont fournies
        if (username || email) {
          const updateData: any = {}
          if (username) updateData.username = username
          if (email) updateData.email = email

          console.log("Updating user with:", updateData)
          const { data: updatedUser, error: updateError } = await supabase
            .from("users")
            .update(updateData)
            .eq("wallet_address", walletAddress)
            .select()
            .single()

          if (updateError) {
            console.error("Error updating user:", updateError)
            // Si l'erreur est due aux RLS policies
            if (updateError.code === "PGRST301" || updateError.message.includes("permission denied")) {
              console.log("Permission error, trying with an RPC function...")
              // Utiliser une fonction RPC pour contourner les RLS
              const { data: rpcData, error: rpcError } = await supabase.rpc("update_user", {
                wallet_addr: walletAddress,
                user_name: username,
                user_email: email,
              })

              if (rpcError) {
                console.error("RPC Error:", rpcError)
                return null
              }

              if (rpcData) {
                return transformUser(rpcData)
              }
            }
            return null
          }

          console.log("User updated:", updatedUser)
          return transformUser(updatedUser)
        }

        // Retourner l'utilisateur existant sans modification
        return transformUser(existingUser)
      } else {
        // Créer un nouvel utilisateur
        console.log("Creating a new user")

        // Vérifier si username et email sont fournis pour les nouveaux comptes
        if (!username || !email) {
          console.error("Username and email are required for new accounts")
          return null
        }

        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert([
            {
              wallet_address: walletAddress,
              username: username,
              email: email,
            },
          ])
          .select()
          .single()

        if (insertError) {
          console.error("Error creating user:", insertError)
          // Si l'erreur est due aux RLS policies
          if (insertError.code === "PGRST301" || insertError.message.includes("permission denied")) {
            console.log("Permission error, trying with an RPC function...")
            // Utiliser une fonction RPC pour contourner les RLS
            const { data: rpcData, error: rpcError } = await supabase.rpc("create_user", {
              wallet_addr: walletAddress,
              user_name: username,
              user_email: email,
            })

            if (rpcError) {
              console.error("RPC Error:", rpcError)
              return null
            }

            if (rpcData) {
              return transformUser(rpcData)
            }
          }
          return null
        }

        console.log("New user created:", newUser)
        return transformUser(newUser)
      }
    } catch (error) {
      console.error("Error during user registration/update:", error)
      return null
    }
  },

  // Récupérer un utilisateur par son adresse de wallet
  async getUserByWalletAddress(walletAddress: string): Promise<User | null> {
    try {
      const supabase = createClientComponentClient()

      console.log("Searching for user by wallet:", walletAddress)
      const { data, error } = await supabase.from("users").select("*").eq("wallet_address", walletAddress).maybeSingle()

      if (error) {
        console.error("Error retrieving user:", error)
        // Si l'erreur est due aux RLS policies
        if (error.code === "PGRST301" || error.message.includes("permission denied")) {
          console.log("Permission error, trying with an RPC function...")
          // Utiliser une fonction RPC pour contourner les RLS
          const { data: rpcData, error: rpcError } = await supabase.rpc("get_user_by_wallet", {
            wallet_addr: walletAddress,
          })

          if (rpcError) {
            console.error("RPC Error:", rpcError)
            return null
          }

          if (rpcData) {
            return transformUser(rpcData)
          }
        }
        return null
      }

      if (!data) {
        console.log("No user found with this wallet address")
        return null
      }

      console.log("User found:", data)
      return transformUser(data)
    } catch (error) {
      console.error("Error retrieving user:", error)
      return null
    }
  },
}

// Fonction utilitaire pour transformer les données de la base de données en objet User
function transformUser(dbUser: any): User {
  return {
    id: dbUser.id,
    walletAddress: dbUser.wallet_address,
    username: dbUser.username,
    email: dbUser.email,
    avatarUrl: dbUser.avatar_url,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
  }
}
