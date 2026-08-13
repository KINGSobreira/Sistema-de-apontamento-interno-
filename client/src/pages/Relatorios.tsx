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
        agregarPor(filtrados, "classificacao").forEach(([c, d]) => linhas.push([`Classificação ${c}`, formatarMoeda(d.valor)]));
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
          cabecalho: ["Posto", "Extras", "Unidades", "Valor total"],
          linhas: agregarPor(filtrados, "posto").map(([m, d]) => [m, d.qtd, formatarNumero(d.unidades), formatarMoeda(d.valor)]),
        };
      case "atrasadas": {
        const atrasadas = filtrados.filter(
          (e) => e.diasParaLancamento !== undefined && e.diasParaLancamento >= configuracoes.regrasAtraso.atrasoMin
        );
        return {
          cabecalho: ["Data", "DataInput", "Dias", "Substituto", "Posto", "Usuário", "Valor"],
          linhas: atrasadas.map((e) => [
            e.data, e.dataInput || "", e.diasParaLancamento || 0, e.substituto, e.posto, e.usuario || "—", formatarMoeda(e.totalGeral),
          ]),
        };
      }
      case "divergencias": {
        const div = filtrados.filter((e) => e.status === "divergencia" || e.origem !== "pdf_excel");
        return {
          cabecalho: ["Data", "Substituto", "Posto", "Motivo", "Origem", "Status", "Valor"],
          linhas: div.map((e) => [e.data, e.substituto, e.posto, e.motivo, e.origem, e.status, formatarMoeda(e.totalGeral)]),
        };
      }
    }
  };

  const gerarExcel = (tipo: TipoRelatorio) => {
    setGerando(tipo + "-xlsx");
    try {
      const { cabecalho, linhas } = montarDados(tipo);
      const nome = TIPOS.find((t) => t.id === tipo)!.nome;
      const dados = [cabecalho, ...linhas];
      const ws = XLSX.utils.aoa_to_sheet(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Relatório");
      XLSX.writeFile(wb, `relatorio_${tipo}_${hojeISO()}.xlsx`);
      registrarAcao(`Gerou relatório "${nome}" em Excel`, "Relatórios");
      toast.success("Relatório Excel gerado.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar Excel.");
    } finally {
      setGerando(null);
    }
  };

  const gerarPdf = (tipo: TipoRelatorio) => {
    setGerando(tipo + "-pdf");
    try {
      const { cabecalho, linhas } = montarDados(tipo);
      const nome = TIPOS.find((t) => t.id === tipo)!.nome;
      const doc = new jsPDF({ orientation: cabecalho.length > 5 ? "landscape" : "portrait" });

      // Cabeçalho
      doc.setFillColor(0, 90, 57);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Controle de Extras", 14, 10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(nome, 14, 17);
      doc.setFontSize(8);
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, doc.internal.pageSize.getWidth() - 14, 10, { align: "right" });
      doc.text(`${filtrados.length} registros no período filtrado`, doc.internal.pageSize.getWidth() - 14, 17, { align: "right" });

      autoTable(doc, {
        head: [cabecalho],
        body: linhas.map((l) => l.map((c) => String(c ?? ""))),
        startY: 28,
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [0, 90, 57], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 250, 245] },
      });

      doc.save(`relatorio_${tipo}_${hojeISO()}.pdf`);
      registrarAcao(`Gerou relatório "${nome}" em PDF`, "Relatórios");
      toast.success("Relatório PDF gerado.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF.");
    } finally {
      setGerando(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader titulo="Relatórios" descricao="Gere relatórios gerenciais com os filtros aplicados e exporte em PDF ou Excel." />

      <BarraFiltros filtros={filtros} onChange={setFiltros} compacto />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {TIPOS.map((t) => (
          <div key={t.id} className="rounded-xl border bg-card p-5 shadow-sm flex flex-col">
            <h3 className="font-display text-[15px] font-bold">{t.nome}</h3>
            <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed flex-1">{t.descricao}</p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => gerarPdf(t.id)}
                disabled={gerando !== null || filtrados.length === 0}
                className="gap-1.5 flex-1 text-red-700 border-red-200 hover:bg-red-50"
              >
                {gerando === t.id + "-pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => gerarExcel(t.id)}
                disabled={gerando !== null || filtrados.length === 0}
                className="gap-1.5 flex-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                {gerando === t.id + "-xlsx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                Excel
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filtrados.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          Nenhum registro disponível com os filtros atuais. Importe dados ou ajuste os filtros.
        </p>
      )}
    </div>
  );
}
