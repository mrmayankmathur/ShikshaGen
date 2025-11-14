import { createBrowserClient } from "@supabase/ssr"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null
let isInitializing = false

export function createClient() {
  // Return existing instance
  if (supabaseClient) return supabaseClient

  // Prevent race conditions during initialization
  if (isInitializing) {
    // Wait a tick and try again
    while (isInitializing && !supabaseClient) {
      // Busy wait - minimal overhead
    }
    return supabaseClient!
  }

  isInitializing = true

  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  isInitializing = false
  return supabaseClient
}

export function getSupabaseClient() {
  return createClient()
}
