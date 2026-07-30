import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const LUMEN_TEAL = [27, 126, 145] as const;
const LUMEN_YELLOW = [253, 186, 116] as const;

function addHeader(pdf: jsPDF, title: string, mes: string) {
  const pageW = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(...LUMEN_TEAL);
  pdf.rect(0, 0, pageW, 12, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.text(title, 10, 8);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(mes, pageW - 10, 8, { align: "right" });
}

function addFooter(pdf: jsPDF) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setFillColor(245, 245, 245);
  pdf.rect(0, pageH - 8, pageW, 8, "F");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(150, 150, 150);
  pdf.text("Dashboard Relacionamento • Obra Lumen Ser Feliz", pageW / 2, pageH - 3, { align: "center" });
  pdf.text(`Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })}`, 10, pageH - 3);
}

function addCoverPage(pdf: jsPDF, title: string, mes: string, subtitle?: string) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageW, pageH, "F");
  pdf.setFillColor(...LUMEN_TEAL);
  pdf.rect(0, 0, pageW, 50, "F");
  pdf.setFillColor(...LUMEN_YELLOW);
  pdf.rect(0, 48, pageW, 4, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(255, 255, 255);
  pdf.text(title, pageW / 2, 22, { align: "center" });

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text(subtitle ?? "Dashboard de Relacionamento", pageW / 2, 32, { align: "center" });

  pdf.setFontSize(10);
  pdf.text(mes, pageW / 2, 41, { align: "center" });

  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(20, 70, pageW - 40, 80, 4, 4, "F");
  pdf.setDrawColor(...LUMEN_TEAL);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(20, 70, pageW - 40, 80, 4, 4, "S");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(...LUMEN_TEAL);
  pdf.text("Obra Lumen Ser Feliz", pageW / 2, 95, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text("Coordenação de Relacionamento", pageW / 2, 105, { align: "center" });
  pdf.text("Fazendo o Outro Feliz", pageW / 2, 113, { align: "center" });

  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    `Documento gerado em ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "long", year: "numeric" })}`,
    pageW / 2, 170, { align: "center" }
  );

  addFooter(pdf);
}

export async function exportElementToPdf(
  element: HTMLElement,
  fileName: string,
  title?: string
) {
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  await new Promise((r) => setTimeout(r, 250));

  // Forçar modo claro para o PDF
  const html = document.documentElement;
  const wasdark = html.classList.contains("dark");
  if (wasdark) {
    html.classList.remove("dark");
    await new Promise((r) => setTimeout(r, 300)); // aguardar re-render
  }

  const ignored = Array.from(element.querySelectorAll<HTMLElement>("[data-export-ignore]"));
  const prevDisplay = ignored.map((el) => el.style.display);
  ignored.forEach((el) => (el.style.display = "none"));

  const pdfOnly = Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-only]"));
  const prevPdfOnlyDisplay = pdfOnly.map((el) => el.style.display);
  const prevPdfOnlyClass = pdfOnly.map((el) => el.classList.contains("hidden"));
  pdfOnly.forEach((el) => { el.classList.remove("hidden"); el.style.display = "grid"; });

  try {
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: element.scrollWidth,
      onclone: (clonedDoc) => {
        // Garantir fundo branco em todos os elementos do clone
        const clonedEl = clonedDoc.body;
        clonedEl.style.background = "#ffffff";
        clonedDoc.documentElement.classList.remove("dark");
        // Forçar cores nos cards
        clonedDoc.querySelectorAll<HTMLElement>("[class*='glass-card'], [class*='bg-card'], [class*='bg-background']").forEach((el) => {
          el.style.backgroundColor = "#ffffff";
          el.style.color = "#111827";
        });
      }
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const headerH = 14;
    const footerH = 10;
    const contentW = pageW - margin * 2;
    const availableH = pageH - headerH - footerH - margin;

    const mes = title?.replace("Visão Geral - ", "").replace("Funcionárias - ", "") ?? "";

    // Capa
    addCoverPage(pdf, title?.includes("Funcionárias") ? "Relatório de Funcionárias" : "Relatório de Relacionamento", mes);
    pdf.addPage();

    const pxPerMm = canvas.width / contentW;
    const availableHpx = availableH * pxPerMm;

    // Mapeia os blocos que não podem ser cortados ao meio (cards, gráficos) para
    // coordenadas de pixel do canvas, usando a posição real deles na tela —
    // assim a paginação só corta nos espaços ENTRE os blocos, nunca dentro de um.
    const elementRect = element.getBoundingClientRect();
    const scaleFactor = canvas.width / element.scrollWidth;
    const atomicBlocks = Array.from(
      element.querySelectorAll<HTMLElement>(".glass-card, .bg-card.rounded-lg.shadow-sm, [data-pdf-atomic]")
    )
      // mantém só os blocos "folha" (sem outro bloco atômico aninhado dentro dele),
      // senão um card-mãe gigante (ex: "Resumo por Funcionária") vira um bloco
      // intocável maior que uma página inteira
      .filter((el) => !el.querySelector(".glass-card, .bg-card.rounded-lg.shadow-sm, [data-pdf-atomic]"))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          top: (r.top - elementRect.top) * scaleFactor,
          bottom: (r.bottom - elementRect.top) * scaleFactor,
        };
      })
      .sort((a, b) => a.top - b.top);

    function findSliceEnd(consumedPx: number): number {
      const idealEnd = Math.min(consumedPx + availableHpx, canvas.height);
      // procura um bloco que o corte ideal atravessaria
      const offending = atomicBlocks.find((b) => b.top < idealEnd - 1 && b.bottom > idealEnd + 1);
      if (!offending) return idealEnd;
      // se o bloco já começou antes desta página (é maior que uma página inteira),
      // não tem como evitar o corte — deixa passar como estava
      if (offending.top <= consumedPx + 1) return idealEnd;
      return offending.top;
    }

    let consumedPx = 0;
    let pageNum = 2;

    while (consumedPx < canvas.height) {
      addHeader(pdf, title ?? "Dashboard", mes);
      addFooter(pdf);

      const sliceEndPx = findSliceEnd(consumedPx);
      const slicePx = sliceEndPx - consumedPx;
      const sliceMm = slicePx / pxPerMm;

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.ceil(slicePx);
      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) break;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, consumedPx, canvas.width, slicePx, 0, 0, canvas.width, slicePx);

      const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(sliceData, "JPEG", margin, headerH, contentW, sliceMm);

      consumedPx += slicePx;
      if (consumedPx < canvas.height) {
        pdf.addPage();
        pageNum++;
      }
    }

    pdf.save(fileName);
  } finally {
    // Restaurar modo escuro se estava ativo
    if (wasdark) html.classList.add("dark");
    ignored.forEach((el, i) => (el.style.display = prevDisplay[i]));
    pdfOnly.forEach((el, i) => {
      el.style.display = prevPdfOnlyDisplay[i];
      if (prevPdfOnlyClass[i]) el.classList.add("hidden");
    });
  }
}
