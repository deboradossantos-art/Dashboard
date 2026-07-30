import { useEffect, useRef, useState } from "react";

/**
 * Anima um valor numérico extraído de uma string formatada (ex: "R$ 1.234,56", "5.307", "12.5%").
 * Mantém o prefixo/sufixo intactos e só anima a parte numérica.
 * Se o valor não puder ser extraído (ex: "—", "sem dados"), retorna a string original sem animar.
 */
export function useAnimatedValue(displayValue: string, durationMs = 700) {
  const [output, setOutput] = useState(displayValue);
  const prevValueRef = useRef<string>(displayValue);
  const rafRef = useRef<number>();

  useEffect(() => {
    // Extrai o número da string (mantendo separador de milhar/decimal pt-BR)
    const match = displayValue.match(/^([^\d-]*)(-?[\d.,]+)(.*)$/);
    if (!match) {
      setOutput(displayValue);
      prevValueRef.current = displayValue;
      return;
    }

    const [, prefix, numStr, suffix] = match;
    const hasDecimal = numStr.includes(",");
    const decimals = hasDecimal ? (numStr.split(",")[1]?.length ?? 0) : 0;
    const targetNum = parseFloat(numStr.replace(/\./g, "").replace(",", "."));

    if (!Number.isFinite(targetNum)) {
      setOutput(displayValue);
      prevValueRef.current = displayValue;
      return;
    }

    // Se o valor anterior era diferente em formato, começa de 0; senão começa do valor anterior (transições suaves)
    const prevMatch = prevValueRef.current.match(/^([^\d-]*)(-?[\d.,]+)(.*)$/);
    const startNum = prevMatch ? parseFloat(prevMatch[2].replace(/\./g, "").replace(",", ".")) || 0 : 0;

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startNum + (targetNum - startNum) * eased;

      const formatted = current.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      setOutput(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = displayValue;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayValue, durationMs]);

  return output;
}
