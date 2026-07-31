/**
 * Dados históricos fixos do setor de Relacionamento da Ser Feliz (Jan–Jul de
 * 2026), usados por useDashboardOverview.ts como fallback quando um mês ainda
 * não tem registro correspondente nas tabelas do Supabase.
 *
 * ⚠️ Se você forkou este projeto para outro setor/organização: estes números
 * não fazem sentido para você. Assim que todas as tabelas do Supabase
 * estiverem populadas com o histórico real do seu setor, este arquivo pode
 * ser esvaziado (troque os arrays por `[]` e o `monthIndex` por `{}`) sem
 * quebrar o dashboard — ele só deixa de ter fallback para meses sem dado no
 * banco, que passam a cair no estado "sem dados" dos gráficos/KPIs.
 */

// Mapeia cada mês para a posição correspondente nos arrays de valuesByMonth
// abaixo (0 = mês mais recente da série, 5 = mais antigo).
export const monthIndex: Record<string, number> = {
  "2026-07": 0,
  "2026-06": 1,
  "2026-05": 2,
  "2026-04": 3,
  "2026-03": 4,
  "2026-02": 5,
  "2026-01": 6,
};

export const valuesByMonth = {
  vol: [132, 1897, 1451, 1560, 520, 639],
  resp: [null, null, null, 12.5, 11.7, 11.9] as (number | null)[],
  csat: [null, null, null, 4.5, 4.6, 4.4] as (number | null)[],
  receitaRel: [11855, 159828.77, 124117.28, 228580.55, 154022.46, 104248.81],
  receitaReal: [12250, 173223.77, 103086.28, 177720.13, 40699.61, 35615.01],
  receitaPrev: [329775.94, 327214.94, 295871.44, 240390.69, 161345, 161345],
  cadastros: [5307, 5276, 4846, 3936, 2796, 2768],
};
