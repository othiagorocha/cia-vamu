import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias.",
  );
}

/** Client público (anon key) — leitura de dados/arquivos publicados. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Client com service role — uso exclusivo no server (procedures autenticadas).
 * Bypassa RLS/policies do Storage; nunca importar em código client-side.
 */
export function createSupabaseServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não está definida.");
  }

  return createClient(supabaseUrl!, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
