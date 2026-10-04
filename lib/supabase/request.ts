import "server-only";
import { createClient as createTokenClient } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * Supabase client for an API request.
 *
 * - Website: the session comes from cookies.
 * - Mobile app: the session comes from an `Authorization: Bearer <access token>` header.
 *
 * Either way, queries run as that user, so Row Level Security applies.
 */
export async function createRequestClient(request: Request) {
  const header = request.headers.get("authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (token) {
    const supabase = createTokenClient(env.supabaseUrl, env.supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    return { supabase, user };
  }

  const supabase = await createCookieClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
