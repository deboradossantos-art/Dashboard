/** Erros comuns do Postgres/Supabase que vale a pena traduzir para o usuário final. */
const POSTGRES_ERROR_MESSAGES: Record<string, string> = {
  "23505": "Já existe um registro com esses dados (conflito de valor único). Verifique se esse período já foi importado.",
  "23503": "Esse registro depende de outro dado que não existe. Confira se todos os cadastros relacionados já foram feitos.",
  "42501": "Sem permissão para esta ação. Confira se você está logado com o email correto.",
  "42703": "Uma coluna esperada não foi encontrada no banco de dados. Confira se a tabela do Supabase está com a estrutura esperada (ver README).",
  "PGRST301": "Sessão expirada. Atualize a página e faça login novamente.",
};

interface PostgrestLikeError {
  message?: string;
  code?: string;
  details?: string;
}

function isPostgrestLikeError(err: unknown): err is PostgrestLikeError {
  return typeof err === "object" && err !== null && ("message" in err || "code" in err);
}

/**
 * Traduz um erro cru (Supabase, fetch, parsing) para uma mensagem amigável em
 * português. Cai para a mensagem original quando não reconhece o erro, para
 * não esconder informação útil de quem for depurar.
 */
export function friendlyErrorMessage(err: unknown): string {
  if (err instanceof TypeError && /fetch/i.test(err.message)) {
    return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
  }

  if (isPostgrestLikeError(err)) {
    if (err.code && POSTGRES_ERROR_MESSAGES[err.code]) {
      return POSTGRES_ERROR_MESSAGES[err.code];
    }
    if (err.message) {
      return err.message;
    }
  }

  if (err instanceof Error) return err.message;

  return String(err);
}
