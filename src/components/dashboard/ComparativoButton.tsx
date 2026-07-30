import { useState, useEffect } from "react";
import { GitCompare, X, Download, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";

const LUMEN_TEAL = [27, 126, 145] as const;
const LUMEN_YELLOW = [253, 186, 116] as const;

const MESES_LABELS: Record<string, string> = {
  "2026-01": "Jan 2026", "2026-02": "Fev 2026", "2026-03": "Mar 2026",
  "2026-04": "Abr 2026", "2026-05": "Mai 2026", "2026-06": "Jun 2026",
  "2026-07": "Jul 2026", "2026-08": "Ago 2026", "2026-09": "Set 2026",
  "2026-10": "Out 2026", "2026-11": "Nov 2026", "2026-12": "Dez 2026",
};

function fmtBRL(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function pctDiff(a: number, b: number): string {
  if (!b) return "—";
  const diff = ((a - b) / b) * 100;
  return `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`;
}

interface MonthData {
  mes: string;
  receita_relacionamento: number;
  receita_real: number;
  cadastros_ativos: number;
}

interface ChatterData {
  mes: string;
  total_mensagens: number;
  mensagens_raqueline: number;
  mensagens_leticia: number;
  mensagens_aline: number;
  mensagens_evila: number;
  boletos_leticia: number;
}

export default function ComparativoButton() {
  const [open, setOpen] = useState(false);
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && mesesDisponiveis.length === 0) {
      supabase.from("monthly_reports").select("mes").order("mes", { ascending: false })
        .then(({ data }) => {
          if (data) setMesesDisponiveis(data.map((r) => r.mes));
        });
    }
  }, [open]);

  const toggleMes = (mes: string) => {
    setSelecionados((prev) =>
      prev.includes(mes) ? prev.filter((m) => m !== mes) : [...prev, mes]
    );
  };

  const gerarPDF = async () => {
    if (selecionados.length < 2) return;
    setLoading(true);

    try {
      const [{ data: monthly }, { data: chatter }] = await Promise.all([
        supabase.from("monthly_reports").select("*").in("mes", selecionados).order("mes"),
        supabase.from("chatter_reports").select("*").in("mes", selecionados).order("mes"),
      ]);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Capa
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageW, pageH, "F");
      pdf.setFillColor(...LUMEN_TEAL);
      pdf.rect(0, 0, pageW, 50, "F");
      pdf.setFillColor(...LUMEN_YELLOW);
      pdf.rect(0, 48, pageW, 4, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(255, 255, 255);
      pdf.text("Relatório Comparativo", pageW / 2, 20, { align: "center" });

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const periodos = selecionados.map((m) => MESES_LABELS[m] ?? m).join(" × ");
      pdf.text(periodos, pageW / 2, 30, { align: "center" });
      pdf.text("Dashboard de Relacionamento • Obra Lumen Ser Feliz", pageW / 2, 40, { align: "center" });

      // Conteúdo
      pdf.addPage();

      // Cabeçalho página
      pdf.setFillColor(...LUMEN_TEAL);
      pdf.rect(0, 0, pageW, 12, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      pdf.text("Comparativo de Períodos", 10, 8);
      pdf.setFont("helvetica", "normal");
      pdf.text(periodos, pageW - 10, 8, { align: "right" });

      let y = 20;

      // Função para desenhar tabela
      const drawTable = (titulo: string, linhas: { label: string; values: string[]; highlight?: boolean }[]) => {
        if (y > pageH - 60) { pdf.addPage(); y = 20; }

        // Título da seção
        pdf.setFillColor(...LUMEN_TEAL);
        pdf.rect(10, y, pageW - 20, 8, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(255, 255, 255);
        pdf.text(titulo, 14, y + 5.5);
        y += 10;

        // Cabeçalho colunas
        const colW = (pageW - 20) / (selecionados.length + 1);
        pdf.setFillColor(240, 248, 250);
        pdf.rect(10, y, pageW - 20, 7, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(50, 50, 50);
        pdf.text("Métrica", 14, y + 5);
        selecionados.forEach((mes, i) => {
          pdf.text(MESES_LABELS[mes] ?? mes, 10 + colW * (i + 1) + colW / 2, y + 5, { align: "center" });
        });
        if (selecionados.length === 2) {
          pdf.text("Variação", pageW - 10, y + 5, { align: "right" });
        }
        y += 8;

        // Linhas
        linhas.forEach((linha, idx) => {
          if (y > pageH - 20) { pdf.addPage(); y = 20; }
          if (idx % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(10, y, pageW - 20, 7, "F");
          }
          pdf.setFont("helvetica", linha.highlight ? "bold" : "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(linha.highlight ? 27 : 60, linha.highlight ? 126 : 60, linha.highlight ? 145 : 60);
          pdf.text(linha.label, 14, y + 5);

          linha.values.forEach((val, i) => {
            pdf.setTextColor(50, 50, 50);
            pdf.text(val, 10 + colW * (i + 1) + colW / 2, y + 5, { align: "center" });
          });

          // Variação
          if (selecionados.length === 2 && linha.values.length === 2) {
            const v1 = parseFloat(linha.values[0].replace(/[^0-9,.-]/g, "").replace(",", "."));
            const v2 = parseFloat(linha.values[1].replace(/[^0-9,.-]/g, "").replace(",", "."));
            if (!isNaN(v1) && !isNaN(v2) && v2 > 0) {
              const diff = ((v1 - v2) / v2) * 100;
              pdf.setTextColor(diff >= 0 ? 16 : 220, diff >= 0 ? 185 : 50, diff >= 0 ? 129 : 50);
              pdf.setFont("helvetica", "bold");
              pdf.text(`${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`, pageW - 10, y + 5, { align: "right" });
            }
          }
          y += 7;
        });
        y += 5;
      };

      // Seção Financeira
      const linhasFinanceiro = [
        {
          label: "Receita de Relacionamento",
          values: selecionados.map((mes) => fmtBRL((monthly as MonthData[])?.find(r => r.mes === mes)?.receita_relacionamento ?? 0)),
          highlight: true,
        },
        {
          label: "Receita Real (Ativos)",
          values: selecionados.map((mes) => fmtBRL((monthly as MonthData[])?.find(r => r.mes === mes)?.receita_real ?? 0)),
          highlight: true,
        },
        {
          label: "Cadastros Ativos",
          values: selecionados.map((mes) => ((monthly as MonthData[])?.find(r => r.mes === mes)?.cadastros_ativos ?? 0).toLocaleString("pt-BR")),
        },
      ];
      drawTable("Financeiro", linhasFinanceiro);

      // Seção Chatter
      const linhasChatter = [
        {
          label: "Total de Mensagens",
          values: selecionados.map((mes) => ((chatter as ChatterData[])?.find(r => r.mes === mes)?.total_mensagens ?? 0).toLocaleString("pt-BR")),
          highlight: true,
        },
        {
          label: "Mensagens Raqueline",
          values: selecionados.map((mes) => ((chatter as ChatterData[])?.find(r => r.mes === mes)?.mensagens_raqueline ?? 0).toLocaleString("pt-BR")),
        },
        {
          label: "Mensagens Letícia",
          values: selecionados.map((mes) => ((chatter as ChatterData[])?.find(r => r.mes === mes)?.mensagens_leticia ?? 0).toLocaleString("pt-BR")),
        },
        {
          label: "Mensagens Aline",
          values: selecionados.map((mes) => ((chatter as ChatterData[])?.find(r => r.mes === mes)?.mensagens_aline ?? 0).toLocaleString("pt-BR")),
        },
        {
          label: "Mensagens Évila",
          values: selecionados.map((mes) => ((chatter as ChatterData[])?.find(r => r.mes === mes)?.mensagens_evila ?? 0).toLocaleString("pt-BR")),
        },
        {
          label: "Boletos Enviados (Letícia)",
          values: selecionados.map((mes) => ((chatter as ChatterData[])?.find(r => r.mes === mes)?.boletos_leticia ?? 0).toLocaleString("pt-BR")),
        },
      ];
      drawTable("Chatter", linhasChatter);

      // Rodapé
      pdf.setFillColor(245, 245, 245);
      pdf.rect(0, pageH - 8, pageW, 8, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text("Dashboard Relacionamento • Obra Lumen Ser Feliz", pageW / 2, pageH - 3, { align: "center" });
      pdf.text(`Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })}`, 10, pageH - 3);

      pdf.save(`comparativo-${selecionados.join("-vs-")}.pdf`);
      setOpen(false);
      setSelecionados([]);
    } catch (err) {
      console.error("Erro ao gerar comparativo:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-export-ignore
        className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-primary/40 hover:bg-muted/30 transition-colors"
      >
        <GitCompare className="h-4 w-4" />
        <span className="hidden sm:inline">Comparar Meses</span>
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "80px",
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: "16px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); setSelecionados([]); } }}
        >
          <div style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
            width: "100%",
            maxWidth: "420px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            color: "#111827",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0 }}>Relatório Comparativo</h2>
                <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>Selecione 2 ou mais meses para comparar</p>
              </div>
              <button
                onClick={() => { setOpen(false); setSelecionados([]); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#9ca3af", borderRadius: "8px" }}
              >
                <X style={{ width: "20px", height: "20px" }} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontSize: "11px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Meses disponíveis</p>
              {mesesDisponiveis.length === 0 ? (
                <p style={{ fontSize: "14px", color: "#9ca3af" }}>Nenhum mês importado ainda.</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {mesesDisponiveis.map((mes) => (
                    <button
                      key={mes}
                      onClick={() => toggleMes(mes)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "999px",
                        fontSize: "13px",
                        fontWeight: "500",
                        cursor: "pointer",
                        border: selecionados.includes(mes) ? "1px solid #1B7E91" : "1px solid #d1d5db",
                        backgroundColor: selecionados.includes(mes) ? "#1B7E91" : "#ffffff",
                        color: selecionados.includes(mes) ? "#ffffff" : "#374151",
                        transition: "all 0.15s",
                      }}
                    >
                      {MESES_LABELS[mes] ?? mes}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selecionados.length > 0 && (
              <div style={{ borderRadius: "8px", backgroundColor: "#f0fafa", border: "1px solid #b2e0e8", padding: "10px 14px" }}>
                <p style={{ fontSize: "11px", color: "#0e7490", margin: "0 0 2px 0" }}>Comparando:</p>
                <p style={{ fontSize: "13px", fontWeight: "600", color: "#164e63", margin: 0 }}>
                  {selecionados.map((m) => MESES_LABELS[m] ?? m).join(" × ")}
                </p>
              </div>
            )}

            <button
              onClick={gerarPDF}
              disabled={selecionados.length < 2 || loading}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                backgroundColor: selecionados.length < 2 ? "#9ca3af" : "#1B7E91",
                color: "#ffffff",
                height: "44px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "500",
                border: "none",
                cursor: selecionados.length < 2 ? "not-allowed" : "pointer",
                transition: "opacity 0.15s",
              }}
            >
              {loading ? <><Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} /> Gerando PDF...</> : <><Download style={{ width: "16px", height: "16px" }} /> Gerar PDF Comparativo</>}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
