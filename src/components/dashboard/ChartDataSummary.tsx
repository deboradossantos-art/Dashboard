interface ChartDataSummaryProps {
  items: { name: string; value: string; color?: string }[];
}

/**
 * Legenda textual com valores numéricos — aparece abaixo do gráfico
 * para garantir que os números também apareçam no PDF exportado.
 */
const ChartDataSummary = ({ items }: ChartDataSummaryProps) => {
  if (!items || items.length === 0) return null;
  return (
    <div
      data-pdf-only
      className="mt-3 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs hidden"
    >
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 min-w-0">
          {it.color && (
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: it.color }}
            />
          )}
          <span className="text-muted-foreground truncate">{it.name}:</span>
          <span className="font-semibold text-foreground">{it.value}</span>
        </div>
      ))}
    </div>
  );
};

export default ChartDataSummary;
