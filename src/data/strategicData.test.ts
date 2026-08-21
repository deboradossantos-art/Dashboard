import { describe, it, expect } from "vitest";
import {
  calcTaxaAtivacao,
  calcTaxaRecorrenciaCartao,
  calcIndiceConciliacao,
  calcDeltaPct,
  fmtBRLOrDash,
  fmtPctOrDash,
  type StrategicKpiReport,
} from "./strategicData";

const baseReport: StrategicKpiReport = {
  mes: "2026-07",
  arrecadacao_ativa: 1000,
  doadores_ativos: 80,
  doadores_base: 100,
  doadores_cartao_recorrente: 20,
  doacoes_identificadas: 95,
  doacoes_total: 100,
};

describe("calcTaxaAtivacao", () => {
  it("calcula ativos / base em %", () => {
    expect(calcTaxaAtivacao(baseReport)).toBe(80);
  });
  it("retorna null quando o relatório é null/undefined", () => {
    expect(calcTaxaAtivacao(null)).toBeNull();
    expect(calcTaxaAtivacao(undefined)).toBeNull();
  });
  it("retorna null quando doadores_ativos ou doadores_base é 0 (tratado como ausente)", () => {
    expect(calcTaxaAtivacao({ ...baseReport, doadores_base: 0 })).toBeNull();
    expect(calcTaxaAtivacao({ ...baseReport, doadores_ativos: 0 })).toBeNull();
  });
});

describe("calcTaxaRecorrenciaCartao", () => {
  it("calcula cartão recorrente / ativos em %", () => {
    expect(calcTaxaRecorrenciaCartao(baseReport)).toBe(25);
  });
  it("retorna null quando faltam dados", () => {
    expect(calcTaxaRecorrenciaCartao({ ...baseReport, doadores_ativos: null })).toBeNull();
  });
});

describe("calcIndiceConciliacao", () => {
  it("calcula identificadas / total em %", () => {
    expect(calcIndiceConciliacao(baseReport)).toBe(95);
  });
  it("retorna null quando faltam dados", () => {
    expect(calcIndiceConciliacao({ ...baseReport, doacoes_total: null })).toBeNull();
  });
});

describe("calcDeltaPct", () => {
  it("calcula a variação percentual entre dois valores", () => {
    expect(calcDeltaPct(120, 100)).toBe(20);
  });
  it("retorna null se current, prev forem null ou prev for 0", () => {
    expect(calcDeltaPct(null, 100)).toBeNull();
    expect(calcDeltaPct(100, null)).toBeNull();
    expect(calcDeltaPct(100, 0)).toBeNull();
  });
});

describe("fmtBRLOrDash", () => {
  it("formata valores positivos em Real", () => {
    expect(fmtBRLOrDash(1500)).toBe("R$ 1.500,00");
  });
  it('retorna "—" para null, undefined, 0 ou negativo', () => {
    expect(fmtBRLOrDash(null)).toBe("—");
    expect(fmtBRLOrDash(undefined)).toBe("—");
    expect(fmtBRLOrDash(0)).toBe("—");
    expect(fmtBRLOrDash(-10)).toBe("—");
  });
});

describe("fmtPctOrDash", () => {
  it("formata com 1 casa decimal por padrão", () => {
    expect(fmtPctOrDash(45.678)).toBe("45.7%");
  });
  it("respeita o número de casas decimais informado", () => {
    expect(fmtPctOrDash(45.678, 0)).toBe("46%");
  });
  it('retorna "—" para null/NaN', () => {
    expect(fmtPctOrDash(null)).toBe("—");
    expect(fmtPctOrDash(NaN)).toBe("—");
  });
});
