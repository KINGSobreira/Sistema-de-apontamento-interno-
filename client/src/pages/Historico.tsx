// ============================================
// Controle de Extras — Histórico de Importações
// ============================================

import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { PageHeader, BadgeStatus } from "@/components/Layout";
import type { Importacao } from "@/lib/types";
import { formatarMoeda, formatarDataHora } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eye, FileText, FileSpreadsheet } from "lucide-react";

export default function Historico() {
  const { importacoes, extras } = useData();
  const [detalhe, setDetalhe] = useState<Importacao | null>(null);

  const registrosDaImportacao = (importacaoId: string) =>
    extras.filter((e) => e.importacaoId === importacaoId);

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Histórico de Importações"
        descricao="Rastreabilidade completa de todos os arquivos importados."
      />

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Data/Hora</th>
                <th className="px-4 py-2.5 font-semibold">Arquivo</th>
                <th className="px-4 py-2.5 font-semibold">Tipo</th>
                <th className="px-4 py-2.5 font-semibold">Filial</th>
                <th className="px-4 py-2.5 font-semibold">Período</th>
                <th className="px-4 py-2.5 font-semibold text-right">Registros</th>
                <th className="px-4 py-2.5 font-semibold text-right">Novos</th>
                <th className="px-4 py-2.5 font-semibold text-right">Duplicados</th>
                <th className="px-4 py-2.5 font-semibold text-right">Divergências</th>
                <th className="px-4 py-2.5 font-semibold text-right">Valor total</th>
                <th className="px-4 py-2.5 font-semibold">Responsável</th>
                <th className="px-4 py-2.5 font-semibold text-center">Ver</th>
              </tr>
            </thead>
            <tbody>
              {importacoes.map((imp) => (
                <tr key={imp.id} className="border-b last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 num whitespace-nowrap">{formatarDataHora(imp.dataImportacao)}</td>
                  <td className="px-4 py-2.5 max-w-[220px] truncate font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {imp.tipo === "pdf" ? (
                        <FileText className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      ) : (
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      )}
                      {imp.arquivo}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 uppercase text-[11px] font-bold">{imp.tipo}</td>
                  <td className="px-4 py-2.5 max-w-[180px] truncate">{imp.filial}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{imp.periodo}</td>
                  <td className="px-4 py-2.5 text-right num">{imp.quantidadeRegistros}</td>
                  <td className="px-4 py-2.5 text-right num text-emerald-700 font-semibold">{imp.quantidadeNovos}</td>
                  <td className="px-4 py-2.5 text-right num">{imp.quantidadeDuplicados}</td>
                  <td className="px-4 py-2.5 text-right num">{imp.quantidadeDivergencias}</td>
                  <td className="px-4 py-2.5 text-right num font-semibold">{formatarMoeda(imp.valorTotal)}</td>
                  <td className="px-4 py-2.5">{imp.usuarioResponsavel}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetalhe(imp)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {importacoes.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    Nenhuma importação registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!detalhe} onOpenChange={() => setDetalhe(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Registros da importação</DialogTitle>
            <DialogDescription>
              {detalhe?.arquivo} • {detalhe && formatarDataHora(detalhe.dataImportacao)}
            </DialogDescription>
          </DialogHeader>
          {detalhe && (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Data</th>
                    <th className="px-3 py-2 font-semibold">Substituto</th>
                    <th className="px-3 py-2 font-semibold">Posto</th>
                    <th className="px-3 py-2 font-semibold">Motivo</th>
                    <th className="px-3 py-2 font-semibold text-right">Qtd</th>
                    <th className="px-3 py-2 font-semibold text-right">Total</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {extras
                    .filter((e) => e.importacaoId === detalhe.id)
                    .map((e) => (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="px-3 py-2 num">{e.data}</td>
                        <td className="px-3 py-2 max-w-[160px] truncate">{e.substituto}</td>
                        <td className="px-3 py-2 max-w-[160px] truncate">{e.posto}</td>
                        <td className="px-3 py-2 max-w-[130px] truncate">{e.motivo}</td>
                        <td className="px-3 py-2 text-right num">{e.quantidade}</td>
                        <td className="px-3 py-2 text-right num font-semibold">{formatarMoeda(e.totalGeral)}</td>
                        <td className="px-3 py-2"><BadgeStatus status={e.status} /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
