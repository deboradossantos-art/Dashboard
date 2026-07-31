interface ChartEmptyStateProps {
  height?: number;
  message?: string;
}

/** Placeholder exibido no lugar do gráfico quando não há dados para o período selecionado. */
const ChartEmptyState = ({ height = 250, message = "Sem dados para este período" }: ChartEmptyStateProps) => (
  <div
    className="flex flex-col items-center justify-center gap-1 text-center text-muted-foreground"
    style={{ height }}
  >
    <span className="text-sm font-medium">{message}</span>
    <span className="text-xs text-muted-foreground/70">
      Importe os dados desse período na página de Upload
    </span>
  </div>
);

export default ChartEmptyState;
