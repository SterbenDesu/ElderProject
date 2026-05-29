import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const missingSupabaseEnvMessage =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local for local development and to Vercel environment variables for deployment.";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): {
  supabase: SupabaseClient | null;
  envError: string | null;
} {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return {
      supabase: null,
      envError: missingSupabaseEnvMessage,
    };
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }

  return {
    supabase: browserClient,
    envError: null,
  };
}
