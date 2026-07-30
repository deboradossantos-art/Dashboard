import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function logAudit(userEmail: string, action: string, details?: string) {
  try {
    // Salvar no banco
    await supabase.from("audit_log").insert({
      user_email: userEmail,
      action,
      details: details ?? null,
    });

    // Enviar email via Edge Function
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ user_email: userEmail, action, details }),
    });
  } catch (err) {
    console.error("[useAudit] Erro ao registrar auditoria:", err);
  }
}
