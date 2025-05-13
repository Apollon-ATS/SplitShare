import { createClient } from "@supabase/supabase-js"

// Singleton instance for client-side
let clientInstance = null

// Create a Supabase client for the client side (singleton pattern)
export const createClientComponentClient = () => {
  if (typeof window !== "undefined") {
    // Only create a new instance if one doesn't exist and we're in the browser
    if (!clientInstance) {
      clientInstance = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    }
    return clientInstance
  }

  // If we're on the server, always create a new instance
  // This avoids sharing state between requests
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// Create a Supabase client for the server side
// This is always a new instance since server components don't have shared state issues
export const createServerComponentClient = () => {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
