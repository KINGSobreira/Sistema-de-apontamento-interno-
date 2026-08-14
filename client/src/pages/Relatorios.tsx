// ============================================
// Controle de Extras — Relatórios gerenciais
// Exportação em PDF (jsPDF) e Excel (xlsx)
// ============================================

import { useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/Layout";
import { BarraFiltros, aplicarFiltros } from "@/components/FiltrosGlobais";
import type { FiltrosGlobais, Extra } from "@/lib/types";
import { formatarMoeda, formatarNumero, hojeISO } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Mapeamento de classificações para nomes descritivos
const NOMES_CLASSIFICACOES: Record<number, string> = {
  // Vigilância (Segurança, Verde, RN, SP)
  1: "Capital Diurno",
  2: "Capital Noturno",
  3: "Interior Diurno",
  4: "Interior Noturno",
  5: "Hora Extra ADM",
  
  // Facilities
  6: "Porteiro Noturno Comercial",
  7: "Porteiro Noturno SDF",
  8: "Porteiro Diurno Comercial",
  9: "Porteiro Diurno SDF",
  10: "Porteiro Diurno 8h",
  11: "Porteiro Diurno SDF 8h",
  14: "Facilities Diurno",
  16: "Porteiro Diurno Comercial",
  20: "Porteiro Diurno 4h",
  21: "Porteiro Diurno 6h",
  22: "Porteiro Diurno 6h",
  
  // Terceirização
  30: "ASG Diurno 8h",
  31: "ASG Diurno 4h",
  32: "ASG Diurno 6h",
  33: "Porteiro Diurno 8h",
  34: "Porteiro Diurno 6h",
};

// Função para obter nome da classificação
function getNomeClassificacao(codigo: number): string {
  return NOMES_CLASSIFICACOES[codigo] || `Classificação ${codigo}`;
}

type TipoRelatorio =
  | "financeiro"
  | "operacional"
  | "motivo"
  | "colaborador"
  | "posto"
  | "atrasadas"
  | "divergencias";

const TIPOS: { id: TipoRelatorio; nome: string; descricao: string }[] = [
  { id: "financeiro", nome: "Relatório Financeiro", descricao: "Valores totais, pagos, pendentes, por mês e por classificação." },
  { id: "operacional", nome: "Relatório Operacional", descricao: "Quantidades, unidades, colaboradores e postos." },
  { id: "motivo", nome: "Por Motivo", descricao: "Quantidade e valor agrupados por motivo." },
  { id: "colaborador", nome: "Por Colaborador", descricao: "Quantidade e valor por colaborador (substituto)." },
  { id: "posto", nome: "Por Posto", descricao: "Quantidade e valor por posto de serviço." },
  { id: "atrasadas", nome: "Extras Atrasadas", descricao: "Data, DataInput, usuário, dias de atraso e valor." },
  { id: "divergencias", nome: "Divergências", descricao: "Registros com diferenças entre PDF e Excel." },
];

export default function Relatorios() {
  const { extras, configuracoes } = useData();
  const { registrarAcao } = useAuth();
  const [filtros, setFiltros] = useState<FiltrosGlobais>({});
  const [gerando, setGerando] = useState<string | null>(null);

  const filtrados = useMemo(() => aplicarFiltros(extras, filtros), [extras, filtros]);

  const agregarPor = (lista: Extra[], campo: keyof Extra) => {
    const mapa = new Map<string, { qtd: number; unidades: number; valor: number }>();
    for (const e of lista) {
      const chave = String(e[campo] || "Não informado");
      if (!mapa.has(chave)) mapa.set(chave, { qtd: 0, unidades: 0, valor: 0 });
      const a = mapa.get(chave)!;
      a.qtd += 1;
      a.unidades += e.quantidade;
      a.valor += e.totalGeral;
    }
    return Array.from(mapa.entries()).sort((a, b) => b[1].valor - a[1].valor);
  };

  const montarDados = (tipo: TipoRelatorio): { cabecalho: string[]; linhas: (string | number)[][] } => {
    switch (tipo) {
      case "financeiro": {
        const pago = filtrados.filter((e) => e.status === "pago").reduce((s, e) => s + e.totalGeral, 0);
        const pendente = filtrados.filter((e) => e.status === "pendente").reduce((s, e) => s + e.totalGeral, 0);
        const conferido = filtrados.filter((e) => e.status === "conferido").reduce((s, e) => s + e.totalGeral, 0);
        const divergencia = filtrados.filter((e) => e.status === "divergencia").reduce((s, e) => s + e.totalGeral, 0);
        const total = filtrados.reduce((s, e) => s + e.totalGeral, 0);
        const linhas: (string | number)[][] = [
          ["Valor total geral", formatarMoeda(total)],
          ["Valor pago", formatarMoeda(pago)],
          ["Valor conferido", formatarMoeda(conferido)],
          ["Valor pendente", formatarMoeda(pendente)],
          ["Valor em divergência", formatarMoeda(divergencia)],
          [],
          ["POR MÊS", ""],
        ];
        const porMes = new Map<string, number>();
        for (const e of filtrados) {
          const c = e.dataISO.slice(0, 7);
          porMes.set(c, (porMes.get(c) || 0) + e.totalGeral);
        }
        Array.from(porMes.entries()).sort().forEach(([m, v]) => linhas.push([m, formatarMoeda(v)]));
        linhas.push([], ["POR CLASSIFICAÇÃO", ""]);
        agregarPor(filtrados, "classificacao").forEach(([c, d]) => linhas.push([getNomeClassificacao(Number(c)), formatarMoeda(d.valor)]));
        return { cabecalho: ["Indicador", "Valor"], linhas };
      }
      case "operacional": {
        const colaboradores = new Set(filtrados.map((e) => e.substituto)).size;
        const postos = new Set(filtrados.map((e) => e.posto)).size;
        return {
          cabecalho: ["Indicador", "Valor"],
          linhas: [
            ["Quantidade de extras", filtrados.length],
            ["Unidades/horas", formatarNumero(filtrados.reduce((s, e) => s + e.quantidade, 0))],
            ["Colaboradores (substitutos)", colaboradores],
            ["Postos de serviço", postos],
            ["Valor total", formatarMoeda(filtrados.reduce((s, e) => s + e.totalGeral, 0))],
          ],
        };
      }
      case "motivo":
        return {
          cabecalho: ["Motivo", "Extras", "Unidades", "Valor total"],
          linhas: agregarPor(filtrados, "motivo").map(([m, d]) => [m, d.qtd, formatarNumero(d.unidades), formatarMoeda(d.valor)]),
        };
      case "colaborador":
        return {
          cabecalho: ["Colaborador", "Extras", "Unidades", "Valor total"],
          linhas: agregarPor(filtrados, "substituto").map(([m, d]) => [m, d.qtd, formatarNumero(d.unidades), formatarMoeda(d.valor)]),
        };
      case "posto":
        return {
          cab
