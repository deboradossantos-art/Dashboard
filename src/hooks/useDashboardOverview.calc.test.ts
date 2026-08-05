import { describe, it, expect } from "vitest";
import {
  presente,
  finExtra,
  parseDisplayNumber,
  parseKpiNumber,
  pctDelta,
  fmtBRL,
  valueOrFallback,
  getKpiValue,
} from "./useDashboardOverview";

describe("presente", () => {
  it("trata 0 como ausente (zero falso da importação, não dado real)", () => {
    expect(presente(0)).toBeNull();
  });
  it("trata null/undefined como ausente", () => {
    expect(presente(null)).toBeNull();
    expect(presente(undefined)).toBeNull();
  });
  it("trata NaN/Infinity como ausente", () => {
    expect(presente(NaN)).toBeNull();
    expect(presente(Infinity)).toBeNull();
  });
  it("retorna o valor quando é um número positivo válido", () => {
    expect(presente(42)).toBe(42);
  });
  it("trata negativos como ausentes", () => {
    expect(presente(-5)).toBeNull();
  });
});

describe("finExtra", () => {
  it("soma cora + stone + asaas", () => {
    expect(finExtra({ cora: 100, stone: 50, asaas: 25 })).toBe(175);
  });
  it("trata campos ausentes como 0", () => {
    expect(finExtra({ cora: 100 })).toBe(100);
    expect(finExtra({})).toBe(0);
    expect(finExtra(null)).toBe(0);
    expect(finExtra(undefined)).toBe(0);
  });
});

describe("parseDisplayNumber", () => {
  it("interpreta formato BRL (ponto de milhar, vírgula decimal)", () => {
    expect(parseDisplayNumber("R$ 1.234,56", null)).toBeCloseTo(1234.56);
  });
  it("interpreta número simples", () => {
    expect(parseDisplayNumber("42", null)).toBe(42);
  });
  it("cai no fallback quando vazio/undefined", () => {
    expect(parseDisplayNumber(undefined, 99)).toBe(99);
    expect(parseDisplayNumber("   ", 99)).toBe(99);
  });
  it("cai no fallback quando o resultado não é um número válido (ex: dois pontos decimais)", () => {
    expect(parseDisplayNumber("12.34.56", 7)).toBe(7);
  });
  // "—" (usado como placeholder de "sem dado" em vários KPIs) é removido pelo
  // regex antes da conversão, virando string vazia. Sem tratamento explícito
  // isso cairia em Number("") = 0 (finito), disfarçando "sem dado" como zero
  // real; por isso cai no fallback em vez de 0.
  it('cai no fallback com "—" (placeholder de "sem dado"), não trata como 0', () => {
    expect(parseDisplayNumber("—", 7)).toBe(7);
  });
});

describe("parseKpiNumber", () => {
  const kpis = [{ label: "Volume", value: "1.500", meta: "" }] as unknown as Parameters<typeof parseKpiNumber>[0];
  it("lê o valor do KPI pelo label", () => {
    expect(parseKpiNumber(kpis, "Volume", 0)).toBe(1500);
  });
  it("usa o fallback quando o label não existe", () => {
    expect(parseKpiNumber(kpis, "Inexistente", 10)).toBe(10);
  });
});

describe("pctDelta", () => {
  it("calcula variação percentual", () => {
    expect(pctDelta(150, 100)).toBe(50);
    expect(pctDelta(50, 100)).toBe(-50);
  });
  it("retorna null quando current ou prev são null", () => {
    expect(pctDelta(null, 100)).toBeNull();
    expect(pctDelta(100, null)).toBeNull();
  });
  it("retorna null quando prev é 0 (evita divisão por zero)", () => {
    expect(pctDelta(100, 0)).toBeNull();
  });
});

describe("fmtBRL", () => {
  it("formata em Real com 2 casas decimais", () => {
    expect(fmtBRL(1234.5)).toBe("R$ 1.234,50");
  });
  it("formata zero corretamente", () => {
    expect(fmtBRL(0)).toBe("R$ 0,00");
  });
});

describe("valueOrFallback", () => {
  it("usa o valor quando não está vazio", () => {
    expect(valueOrFallback("abc", "fallback")).toBe("abc");
  });
  it("usa o fallback quando undefined ou só espaços", () => {
    expect(valueOrFallback(undefined, "fallback")).toBe("fallback");
    expect(valueOrFallback("   ", "fallback")).toBe("fallback");
  });
});

describe("getKpiValue", () => {
  const kpis = [{ label: "CSAT", value: "4.5", meta: "" }] as unknown as Parameters<typeof getKpiValue>[0];
  it("retorna o value do card com o label buscado", () => {
    expect(getKpiValue(kpis, "CSAT", "—")).toBe("4.5");
  });
  it("retorna o fallback quando o label não existe", () => {
    expect(getKpiValue(kpis, "Outro", "—")).toBe("—");
  });
});
