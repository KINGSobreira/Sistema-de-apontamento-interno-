// ============================================
// Controle de Extras — Divergências
// Registros com status "divergencia" + somente PDF/Excel
// ============================================

import { useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { PageHeader, BadgeOrigem } from "@/components/Layout";
import { BarraFiltros, aplicarFiltros } from "@/components/FiltrosGlobais";
import type { FiltrosGlobais } from "@/lib/types";
import { formatarMoeda, formatarNumero } from "@/lib/utils";
import { GitCompareArrows, FileText, FileSpreadsheet, AlertTriangle } from "lucide-react";

export default function Divergencias() {
  const { extras } = useData();
  const [filtros, setFiltros] = useState<FiltrosGlobais>({});
  const filtrados = useMemo(() => aplicarFiltros(extras, filtros), [extras, filtros]);

  const divergentes = filtrados.filter((e) => e.status === "divergencia");
  const somentePdf = filtrados.filter((e) => e.origem === "pdf");
  const somenteExcel = filtrados.filter((e) => e.origem === "excel");
  const conferidos = filtrados.filter((e) => e.origem === "pdf_excel");

  const Tabela = ({ dados, cor }: { dados: typeof filtrados; cor: string }) => (
    <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
      <table className="w-full text-[12.5px]">
        <thead className={`sticky top-0 z-10 border-b ${cor}`}>
          <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 font-semibold">Data</th>
            <th className="px-4 py-2.5 font-semibold">Substituto</th>
            <th className="px-4 py-2.5 font-semibold">Posto</th>
            <th className="px-4 py-2.5 font-semibold">Motivo</th>
            <th className="px-4 py-2.5 font-semibold text-center">Cl.</th>
            <th className="px-4 py-2.5 font-semibold text-right">Qtd</th>
            <th className="px-4 py-2.5 font-semibold text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((e) => (
            <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50/70">
              <td className="px-4 py-2.5 num whitespace-nowrap">{e.data}</td>
              <td className="px-4 py-2.5 max-w-[180px] truncate font-medium">{e.substituto}</td>
              <td className="px-4 py-2.5 max-w-[180px] truncate">{e.posto}</td>
              <td className="px-4 py-2.5 max-w-[140px] truncate">{e.motivo}</td>
              <td className="px-4 py-2.5 text-center num">{e.classificacao || "—"}</td>
              <td className="px-4 py-2.5 text-right num">{formatarNumero(e.quantidade)}</td>
              <td className="px-4 py-2.5 text-right num font-semibold">{formatarMoeda(e.totalGeral)}</td>
            </tr>
          ))}
          {dados.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum registro nesta categoria.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Divergências"
        descricao="Resultado da conferência cruzada entre PDF e Excel: divergências, registros exclusivos e coincidentes."
      />

      <BarraFiltros filtros={filtros} onChange={setFiltros} compacto />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { titulo: "Com divergência", valor: divergentes.length, icone: AlertTriangle, cor: "bg-red-100 text-red-700", txt: "text-red-700" },
          { titulo: "Somente no PDF", valor: somentePdf.length, icone: FileText, cor: "bg-amber-100 text-amber-700", txt: "text-amber-700" },
          { titulo: "Somente no Excel", valor: somenteExcel.length, icone: FileSpreadsheet, cor: "bg-amber-100 text-amber-700", txt: "text-amber-700" },
          { titulo: "PDF + Excel conferidos", valor: conferidos.length, icone: GitCompareArrows, cor: "bg-emerald-100 text-emerald-700", txt: "text-emerald-700" },
        ].map((k) => (
          <div key={k.titulo} className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${k.cor}`}>
              <k.icone className="h-5 w-5" />
            </div>
            <div>
              <p className={`num font-display text-2xl font-bold ${k.txt}`}>{k.valor}</p>
              <p className="text-[11.5px] text-muted-foreground">{k.titulo}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Divergentes */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-red-50/60 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-red-800">Registros com divergência ({divergentes.length})</h3>
        </div>
        <Tabela dados={divergentes} cor="bg-red-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-amber-50/60">
            <h3 className="text-[14px] font-bold text-amber-800">Somente no PDF ({somentePdf.length})</h3>
          </div>
          <Tabela dados={somentePdf} cor="bg-amber-50" />
        </div>
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-amber-50/60">
            <h3 className="text-[14px] font-bold text-amber-800">Somente no Excel ({somenteExcel.length})</h3>
          </div>
          <Tabela dados={somenteExcel} cor="bg-amber-50" />
        </div>
      </div>

      {/* Conferidos */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-emerald-50/60 flex items-center gap-2">
          <h3 className="text-[14px] font-bold text-emerald-800">Registros coincidentes PDF + Excel ({conferidos.length})</h3>
          <BadgeOrigem origem="pdf_excel" />
        </div>
        <Tabela dados={conferidos} cor="bg-emerald-50" />
      </div>
    </div>
  );
}
