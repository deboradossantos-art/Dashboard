import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface ExportPdfButtonProps {
  targetId: string;
  fileName: string;
  title?: string;
  className?: string;
  label?: string;
}

const ExportPdfButton = ({
  targetId,
  fileName,
  title,
  className = "",
  label = "Exportar PDF",
}: ExportPdfButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    setLoading(true);
    try {
      const { exportElementToPdf } = await import("@/lib/exportPdf");
      await exportElementToPdf(el, fileName, title);
    } catch (e) {
      console.error("Erro ao gerar PDF", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      data-export-ignore
      className={`inline-flex items-center gap-2 bg-[#10B981] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#10B981]/90 transition-colors disabled:opacity-60 ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {loading ? "Gerando..." : label}
    </button>
  );
};

export default ExportPdfButton;
