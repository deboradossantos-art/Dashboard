interface KpiCardProps {
  label: string;
  value: string;
  meta: string;
  color: "blue" | "green" | "red" | "orange";
}

const borderColors = {
  blue: "border-l-[#1B7E91]",
  green: "border-l-[#10B981]",
  red: "border-l-[#EF4444]",
  orange: "border-l-[#F59E0B]",
};

const KpiCard = ({ label, value, meta, color }: KpiCardProps) => {
  const hasValue = value?.trim().length > 0;
  return (
    <div className={`bg-card rounded-lg p-6 shadow-sm border-l-4 ${borderColors[color]}`}>
      <div className="text-sm font-medium text-muted-foreground mb-2">{label}</div>
      <div className={`text-3xl font-bold mb-2 ${hasValue ? "text-foreground" : "text-muted-foreground/50"}`}>
        {hasValue ? value : "—"}
      </div>
      <div className="text-xs text-muted-foreground/70">
        {hasValue ? meta : "Sem dado importado para este período"}
      </div>
    </div>
  );
};

export default KpiCard;
