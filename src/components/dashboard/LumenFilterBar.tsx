import { useState } from "react";
import { Megaphone, ChevronDown, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FilterDropdownProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

const FilterDropdown = ({ label, options, selected, onChange }: FilterDropdownProps) => {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter((o) => o !== opt));
    else onChange([...selected, opt]);
  };
  const allSelected = selected.length === 0 || selected.length === options.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="lumen-pill inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium">
        {label}
        <ChevronDown className="h-3 w-3 opacity-80" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt}
            checked={allSelected ? true : selected.includes(opt)}
            onCheckedChange={() => toggle(opt)}
          >
            {opt}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface CanalGrupo {
  label: string;
  canais: readonly string[];
}

interface CanalFilterDropdownProps {
  label: string;
  grupos: CanalGrupo[];
  selected: string[];
  onChange: (next: string[]) => void;
}

/**
 * Igual ao FilterDropdown, mas agrupado — grupos com mais de 1 canal (hoje só
 * "Membros Ser Feliz": Missas + Café Inspirador) marcam/desmarcam os dois
 * juntos ao clicar no grupo, e podem ser expandidos pra marcar cada canal
 * separado.
 */
const CanalFilterDropdown = ({ label, grupos, selected, onChange }: CanalFilterDropdownProps) => {
  const totalCanais = grupos.reduce((n, g) => n + g.canais.length, 0);
  const allSelected = selected.length === 0 || selected.length === totalCanais;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const isCanalSelected = (canal: string) => (allSelected ? true : selected.includes(canal));
  const isGrupoFullySelected = (g: CanalGrupo) => g.canais.every((c) => isCanalSelected(c));

  const toggleCanal = (canal: string) => {
    const base = allSelected ? grupos.flatMap((g) => g.canais) : selected;
    if (base.includes(canal)) onChange(base.filter((c) => c !== canal));
    else onChange([...base, canal]);
  };

  const toggleGrupo = (g: CanalGrupo) => {
    const base = allSelected ? grupos.flatMap((gg) => gg.canais) : selected;
    const fully = isGrupoFullySelected(g);
    if (fully) onChange(base.filter((c) => !g.canais.includes(c)));
    else onChange([...new Set([...base, ...g.canais])]);
  };

  const toggleExpand = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="lumen-pill inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium">
        {label}
        <ChevronDown className="h-3 w-3 opacity-80" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {grupos.map((g) => {
          const hasChildren = g.canais.length > 1;
          const isOpen = expanded.has(g.label);
          return (
            <div key={g.label}>
              <div className="flex items-center">
                <DropdownMenuCheckboxItem
                  className="flex-1"
                  checked={isGrupoFullySelected(g)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => toggleGrupo(g)}
                >
                  {g.label}
                </DropdownMenuCheckboxItem>
                {hasChildren && (
                  <button
                    type="button"
                    className="pr-2 text-muted-foreground hover:text-foreground"
                    onClick={() => toggleExpand(g.label)}
                    aria-label={isOpen ? `Recolher ${g.label}` : `Expandir ${g.label}`}
                  >
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
              {hasChildren && isOpen && (
                <div className="pl-3">
                  {g.canais.map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c}
                      className="pl-8 text-xs"
                      checked={isCanalSelected(c)}
                      onCheckedChange={() => toggleCanal(c)}
                    >
                      {c}
                    </DropdownMenuCheckboxItem>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface LumenFilterBarProps {
  responsavel: string;
  periodoLabel: string;
  canalGrupos: CanalGrupo[];
  canalSelecionado: string[];
  onCanalChange: (v: string[]) => void;
  modalidades: readonly string[];
  modalidadeSelecionada: string[];
  onModalidadeChange: (v: string[]) => void;
}

/**
 * Cabeçalho navy com os filtros de operação (Canal de Origem, Período,
 * Modalidade), replicando o padrão visual do painel de referência (Lumen).
 * "Período" fica como rótulo informativo (o mês já é escolhido no seletor
 * global do dashboard, no topo da página) para não duplicar navegação.
 */
const LumenFilterBar = ({
  responsavel, periodoLabel, canalGrupos, canalSelecionado, onCanalChange, modalidades, modalidadeSelecionada, onModalidadeChange,
}: LumenFilterBarProps) => {
  return (
    <div className="lumen-header-bar rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-white/10 grid place-items-center shrink-0">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm sm:text-base font-bold tracking-tight uppercase">
            Painel de Operação e Arrecadação | Lumen
          </div>
          <div className="text-[11px] text-gold font-semibold">Responsável: {responsavel}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CanalFilterDropdown label="Canal de Origem" grupos={canalGrupos} selected={canalSelecionado} onChange={onCanalChange} />
        <span className="lumen-pill rounded-lg px-3 py-2 text-xs font-medium">{periodoLabel}</span>
        <FilterDropdown label="Modalidade" options={modalidades} selected={modalidadeSelecionada} onChange={onModalidadeChange} />
      </div>
    </div>
  );
};

export default LumenFilterBar;
