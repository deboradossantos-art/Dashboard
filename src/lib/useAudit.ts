import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// A Edge Function `send-notification` não vem neste repositório (ver README) —
// só existe no projeto Supabase original. Cada fork precisa criá-la e então
// habilitar esta flag; caso contrário toda ação geraria uma chamada fadada a 404.
const NOTIFICATIONS_ENABLED = import.meta.env.VITE_AUDIT_NOTIFICATIONS_ENABLED === "true";

export async function logAudit(userEmail: string, action: string, details?: string) {
  try {
    await supabase.from("audit_log").insert({
      user_email: userEmail,
      action,
      details: details ?? null,
    });
  } catch (err) {
    console.error("[useAudit] Erro ao registrar auditoria:", err);
  }

  if (!NOTIFICATIONS_ENABLED) return;

  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ user_email: userEmail, action, details }),
    });
  } catch (err) {
    console.error("[useAudit] Erro ao enviar notificação por email:", err);
  }
}
