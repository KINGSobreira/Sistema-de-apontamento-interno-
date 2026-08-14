import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------- Formatação ----------

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarNumero(valor: number, casas = 2): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function formatarData(data: string): string {
  if (!data) return "—";
  const [dia, mes, ano] = data.split("/");
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataISO(iso?: string): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function dataParaISO(dataBR: string): string {
  // dd/mm/aaaa -> aaaa-mm-dd
  const partes = dataBR.split("/");
  if (partes.length !== 3) return "";
  return `${partes[2]}-${partes[1].padStart(2, "0")}-${partes[0].padStart(2, "0")}`;
}

export function parseNumeroBR(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) return 0;
  if (typeof valor === "number") return valor;
  const limpo = String(valor).trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function diffDias(dataISO1: string, dataISO2: string): number {
  const d1 = new Date(dataISO1 + "T00:00:00");
  const d2 = new Date(dataISO2 + "T00:00:00");
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function agoraISO(): string {
  return new Date().toISOString();
}

export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- Chave de duplicidade ----------

export function gerarChaveRegistro(r: {
  data: string;
  colaborador: string;
  substituto: string;
  posto: string;
  motivo: string;
  classificacao: number;
  quantidade: number;
}): string {
  return [
    r.data,
    normalizarTexto(r.colaborador),
    normalizarTexto(r.substituto),
    normalizarTexto(r.posto),
    normalizarTexto(r.motivo),
    r.classificacao,
    r.quantidade.toFixed(2),
  ].join("|");
}

// ---------- Classificação por valor unitário ----------

export function classificacaoPorValor(valorUnitario: number, tabela: { codigo: number; valor: number }[]): number {
  let melhor = 0;
  let menorDiff = Infinity;
  for (const c of tabela) {
    const diff = Math.abs(c.valor - valorUnitario);
    if (diff < menorDiff) {
      menorDiff = diff;
      melhor = c.codigo;
    }
  }
  return menorDiff < 0.5 ? melhor : 0; // 0 = não identificada
}

// ---------- ID simples ----------

export function gerarId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
