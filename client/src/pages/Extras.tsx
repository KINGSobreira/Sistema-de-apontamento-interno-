// ============================================
// Controle de Extras — Todas as Extras (tabela completa)
// ============================================

import { useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, BadgeStatus, BadgeOrigem } from "@/components/Layout";
import { BarraFiltros, aplicarFiltros } from "@/components/FiltrosGlobais";
import type { FiltrosGlobais, Extra, StatusPagamento } from "@/lib/types";
import { formatarMoeda, formatarNumero } from "@/lib/utils";
import { atualizarStatusExtra, excluirExtra } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Eye, Trash2, ArrowUpDown, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const POR_PAGINA = 25;

export default function Extras() {
  const { extras, recarregar } = useData();
  const { isAdmin, registrarAcao } = useAuth();
  const [filtros, setFiltros] = useState<FiltrosGlobais>({});
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [ordenacao, setOrdenacao] = useState<{ campo: keyof Extra; dir: "asc" | "desc" }>({ campo: "dataISO", dir: "desc" });
  const [detalhe, setDetalhe] = useState<Extra | null>(null);

  const filtrados = useMemo(() => {
    let lista = aplicarFiltros(extras, filtros);
    if (busca.trim()) {
      const b = busca.toUpperCase();
      lista = lista.filter((e) =>
        `${e.substituto} ${e.colaborador} ${e.posto} ${e.motivo} ${e.filial}`.toUpperCase().includes(b)
      );
    }
    const dir = ordenacao.dir === "asc" ? 1 : -1;
    return [...lista].sort((a, b) => {
      const va = a[ordenacao.campo];
      const vb = b[ordenacao.campo];
      if (va === undefined || vb === undefined) return 0;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [extras, filtros, busca, ordenacao]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const totais = useMemo(() => ({
    qtd: filtrados.reduce((s, e) => s + e.quantidade, 0),
    valor: filtrados.reduce((s, e) => s + e.totalGeral, 0),
  }), [filtrados]);

  const alternarOrdenacao = (campo: keyof Extra) => {
    setOrdenacao((o) => ({ campo, dir: o.campo === campo && o.dir === "desc" ? "asc" : "desc" }));
  };

  const mudarStatus = async (extra: Extra, status: StatusPagamento) => {
    try {
      await atualizarStatusExtra(extra.id, status);
      registrarAcao(`Alterou status de "${extra.substituto}" (${extra.data}) para ${status}`, "Extras");
      await recarregar();
      toast.success("Status atualizado.");
    } catch {
      toast.error("Erro ao atualizar status.");
    }
  };

  const excluir = async (extra: Extra) => {
    if (!confirm(`Excluir o registro de ${extra.substituto} em ${extra.data}?`)) return;
    try {
      await excluirExtra(extra.id);
      registrarAcao(`Excluiu registro de "${extra.substituto}" (${extra.data})`, "Extras");
      await recarregar();
      toast.success("Registro excluído.");
    } catch {
      toast.error("Erro ao excluir registro.");
    }
  };

  const exportarExcel = () => {
    const dados = filtrados.map((e) => ({
      Data: e.data,
      Filial: e.filial,
      Posto: e.posto,
      Substituto: e.substituto,
      Substituído: e.colaborador,
      Motivo: e.motivo,
      Classificação: e.classificacao,
      Quantidade: e.quantidade,
      "Valor Unitário": e.valorUnitario,
      Total: e.totalGeral,
      DataInput: e.dataInput || "",
      Usuário: e.usuario || "",
      Status: e.status,
      Origem: e.origem,
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Extras");
    XLSX.writeFile(wb, `extras_${new Date().toISOString().slice(0, 10)}.xlsx`);
    registrarAcao("Exportou tabela de extras em Excel", "Extras");
  };

  const Th = ({ campo, children, className = "" }: { campo?: keyof Extra; children: React.ReactNode; className?: string }) => (
    <th
      className={`px-3 py-2.5 font-semibold text-left text-[11px] uppercase tracking-wide text-muted-foreground ${campo ? "cursor-pointer select-none hover:text-foreground" : ""} ${className}`}
      onClick={campo ? () => alternarOrdenacao(campo) : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {campo && <ArrowUpDown className="h-3 w-3 opacity-50" />}
      </span>
    </th>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Todas as Extras"
        descricao={`${filtrados.length} registros • ${formatarNumero(totais.qtd)} unidades • ${formatarMoeda(totais.valor)}`}
        acoes={
          <Button variant="outline" size="sm" onClick={exportarExcel} className="gap-1.5">
            <Download className="h-4 w-4" /> Exportar Excel
          </Button>
        }
      />

      <BarraFiltros filtros={filtros} onChange={(f) => { setFiltros(f); setPagina(1); }} compacto />

      <div className="relative">
        <Input
          placeholder="Pesquisar por nome, posto, motivo, filial..."
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
          className="h-10"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <Th campo="dataISO">Data</Th>
                <Th campo="posto">Posto</Th>
                <Th campo="substituto">Substituto</Th>
                <Th campo="colaborador">Substituído</Th>
                <Th campo="motivo">Motivo</Th>
                <Th campo="classificacao" className="text-center">Cl.</Th>
                <Th campo="quantidade" className="text-right">Qtd</Th>
                <Th campo="totalGeral" className="text-right">Total</Th>
                <Th campo="dataInput">DataInput</Th>
                <Th campo="usuario">Usuário</Th>
                <Th>Status</Th>
                <Th>Origem</Th>
                <Th className="text-center">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {paginados.map((e) => (
                <tr key={e.id} className={`border-b last:border-0 hover:bg-slate-50/70 ${e.status === "divergencia" ? "bg-red-50/40" : ""}`}>
                  <td className="px-3 py-2.5 num whitespace-nowrap">{e.data}</td>
                  <td className="px-3 py-2.5 max-w-[180px] truncate">{e.posto}</td>
                  <td className="px-3 py-2.5 max-w-[170px] truncate font-medium">{e.substituto}</td>
                  <td className="px-3 py-2.5 max-w-[150px] truncate text-muted-foreground">{e.colaborador}</td>
                  <td className="px-3 py-2.5 max-w-[140px] truncate">{e.motivo}</td>
                  <td className="px-3 py-2.5 text-center num">{e.classificacao || "—"}</td>
                  <td className="px-3 py-2.5 text-right num">{formatarNumero(e.quantidade)}</td>
                  <td className="px-3 py-2.5 text-right num font-semibold">{formatarMoeda(e.totalGeral)}</td>
                  <td className="px-3 py-2.5 num whitespace-nowrap text-muted-foreground">{e.dataInput || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground max-w-[100px] truncate">{e.usuario || "—"}</td>
                  <td className="px-3 py-2.5">
                    {isAdmin ? (
                      <Select value={e.status} onValueChange={(v) => mudarStatus(e, v as StatusPagamento)}>
                        <SelectTrigger className="h-7 w-[120px] text-[11px] border-0 bg-transparent p-0 shadow-none focus:ring-0">
                          <SelectValue><BadgeStatus status={e.status} /></SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="conferido">Conferido</SelectItem>
                          <SelectItem value="pago">Pago</SelectItem>
                          <SelectItem value="divergencia">Divergência</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <BadgeStatus status={e.status} />
                    )}
                  </td>
                  <td className="px-3 py-2.5"><BadgeOrigem origem={e.origem} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setDetalhe(e)} className="p-1.5 rounded-md hover:bg-slate-100 text-muted-foreground hover:text-foreground" title="Detalhes">
                        <Eye className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => excluir(e)} className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600" title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginados.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    Nenhum registro encontrado. {extras.length === 0 && "Importe um relatório para começar."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between border-t px-4 py-3 bg-slate-50/60">
          <p className="text-[12px] text-muted-foreground">
            Página {paginaAtual} de {totalPaginas} • {filtrados.length} registros
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de detalhes */}
      <Dialog open={!!detalhe} onOpenChange={() => setDetalhe(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Detalhes do registro</DialogTitle>
            <DialogDescription>Informações completas da hora extra.</DialogDescription>
          </DialogHeader>
          {detalhe && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
              {[
                ["Data", detalhe.data],
                ["Data de lançamento", detalhe.dataInput || "Não informado"],
                ["Filial", detalhe.filial],
                ["Substituto", detalhe.substituto],
                ["Mat. substituto", detalhe.codigoSubstituto || "—"],
                ["Substituído", detalhe.colaborador],
                ["Mat. substituído", detalhe.codigoColaborador || "—"],
                ["Posto", detalhe.posto],
                ["Cód. posto", detalhe.codigoPosto || "—"],
                ["Motivo", detalhe.motivo],
                ["Classificação", detalhe.classificacao ? `Classif. ${detalhe.classificacao}` : "Não identificada"],
                ["Quantidade", formatarNumero(detalhe.quantidade)],
                ["Valor unitário", formatarMoeda(detalhe.valorUnitario)],
                ["Subtotal", formatarMoeda(detalhe.valorTotal)],
                ["VT", formatarMoeda(detalhe.vt)],
                ["VA", formatarMoeda(detalhe.va)],
                ["Total geral", formatarMoeda(detalhe.totalGeral)],
                ["Usuário (lançamento)", detalhe.usuario || "Não informado"],
                ["Arquivo de origem", detalhe.arquivoOrigem],
                ["Dias p/ lançamento", detalhe.diasParaLancamento !== undefined ? `${detalhe.diasParaLancamento} dia(s)` : "—"],
              ].map(([rotulo, valor]) => (
                <div key={rotulo as string}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{rotulo}</p>
                  <p className="mt-0.5 font-medium break-words">{valor}</p>
                </div>
              ))}
              {detalhe.observacao && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Observação</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed">{detalhe.observacao}</p>
                </div>
              )}
              <div className="col-span-2 flex items-center gap-2 pt-1">
                <BadgeStatus status={detalhe.status} />
                <BadgeOrigem origem={detalhe.origem} />
                {detalhe.revisaoNecessaria && (
                  <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    Revisão necessária
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
