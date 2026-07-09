import { createClient } from "@supabase/supabase-js";

// Frontend CHỈ dùng anon key (đọc công khai theo RLS). Không bao giờ service_role.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});
