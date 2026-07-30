import { Users2, Plane } from "lucide-react";

export interface EmployeeSummary {
  name: string;
  receitaReativada: number;
  conversao: number | null;
  mensagensChatter: number;
  ligacoesRealizadas: number;
  boletosEnviados?: number;
  boletosPagos?: number;
  isLeticia?: boolean;
  vacationInfo?: string | null;
}

interface EmployeeSummaryCardsProps {
  summaries: EmployeeSummary[];
  period: string;
}

function fmtBRL(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const EmployeeSummaryCards = ({ summaries, period }: EmployeeSummaryCardsProps) => {
  return (
    <div className="glass-card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Users2 className="h-4 w-4 text-primary" /> Resumo por Funcionária
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Principais números individuais</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-1 rounded-full whitespace-nowrap">{period}</span>
      </div>

      <div className="space-y-3">
        {summaries.map((s) => {
          const taxaBoletos = s.boletosEnviados && s.boletosPagos && s.boletosEnviados > 0
            ? (s.boletosPagos / s.boletosEnviados) * 100
            : null;
          const hasDataLeticia = (s.mensagensChatter ?? 0) > 0 || (s.boletosEnviados ?? 0) > 0;
          const hasDataPadrao = s.receitaReativada > 0 || s.mensagensChatter > 0 || s.ligacoesRealizadas > 0;
          const hasData = s.isLeticia ? hasDataLeticia : hasDataPadrao;

          return (
            <div key={s.name} data-pdf-atomic className="rounded-xl border border-border/70 bg-background/40 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm text-foreground">{s.name}</div>
                {s.vacationInfo && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-info/10 text-info px-2 py-0.5 text-[10px] font-semibold">
                    <Plane className="h-3 w-3" /> {s.vacationInfo}
                  </div>
                )}
              </div>
              {!hasData ? (
                <p className="text-xs text-muted-foreground">
                  {s.vacationInfo ? "sem dados no período (período de férias)" : "sem dados no período"}
                </p>
              ) : s.isLeticia ? (
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Chatter</div>
                    <div className="font-bold text-foreground text-sm">{s.mensagensChatter > 0 ? s.mensagensChatter.toLocaleString("pt-BR") : "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Taxa de Boletos</div>
                    <div className="font-bold text-success text-sm">{taxaBoletos !== null ? `${taxaBoletos.toFixed(1)}%` : "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Boletos Enviados</div>
                    <div className="font-bold text-foreground text-sm">{s.boletosEnviados ? s.boletosEnviados.toLocaleString("pt-BR") : "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Boletos Pagos</div>
                    <div className="font-bold text-foreground text-sm">{s.boletosPagos ? s.boletosPagos.toLocaleString("pt-BR") : "—"}</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Receita Reativada</div>
                    <div className="font-bold text-success text-sm">{s.receitaReativada > 0 ? fmtBRL(s.receitaReativada) : "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Conversão</div>
                    <div className="font-bold text-foreground text-sm">{s.conversao !== null ? `${s.conversao.toFixed(1)}%` : "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Chatter</div>
                    <div className="font-bold text-foreground text-sm">{s.mensagensChatter > 0 ? s.mensagensChatter.toLocaleString("pt-BR") : "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ligações</div>
                    <div className="font-bold text-foreground text-sm">{s.ligacoesRealizadas > 0 ? s.ligacoesRealizadas.toLocaleString("pt-BR") : "—"}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeeSummaryCards;
