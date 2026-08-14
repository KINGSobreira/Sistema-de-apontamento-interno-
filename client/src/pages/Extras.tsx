// ============================================
// Controle de Extras — Todas as Extras
// ============================================
import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/Layout";
import { BarraFiltros, aplicarFiltros } from "@/components/FiltrosGlobais";
import type { Extra, StatusPagamento, FiltrosGlobais } from "@/lib/types";
import { formatarMoeda, formatarNumero, formatarData } from "@/lib/utils";
import { atualizarStatusExtra, excluirExtra } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  ChevronDown,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
const STATUS_OPTIONS: { value: StatusPagamento; label: string; icon: React.ElementType; color: string }[] = [
  { value: "pendente", label: "Pendente", icon: Clock, color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "conferido", label: "Conferido", icon: CheckCircle2, color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "pago", label: "Pago", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "divergencia", label: "Divergência", icon: AlertTriangle, color: "bg-red-100 text-red-800 border-red-200" },
];
export default function Extras() {
  const { extras, configuracoes, recarregar } = useData();
  const { usuario, registrarAcao } = useAuth();
  const [filtros, setFiltros] = useState<FiltrosGlobais>({});
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<{ campo: keyof Extra; direcao: "asc" | "desc" }>({
    campo: "dataISO",
    direcao: "desc",
  });
  
  // Seleção múltipla
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [statusEmMassa, setStatusEmMassa] = useState<StatusPagamento>("pendente");
  const [aplicandoStatus, setAplicandoStatus] = useState(false);
  
  // Modais
  const [extraParaExcluir, setExtraParaExcluir] = useState<Extra | null>(null);
  const [extraParaVer, setExtraParaVer] = useState<Extra | null>(null);

  // Filtrar e ordenar
  const extrasFiltrados = useMemo(() => {
    let resultado = aplicarFiltros(extras, filtros);
    
    // Busca
    if (busca) {
      const termo = busca.toLowerCase();
      resultado = resultado.filter(
        (e) =>
          e.substituto.toLowerCase().includes(termo) ||
          e.colaborador.toLowerCase().includes(termo) ||
          e.posto.toLowerCase().includes(termo) ||
          e.motivo.toLowerCase().includes(termo) ||
          e.filial.toLowerCase().includes(termo)
      );
    }
    
    // Ordenação
    resultado.sort((a, b) => {
      const aVal = a[ordenacao.campo];
      const bVal = b[ordenacao.campo];
      
      if (aVal === undefined || bVal === undefined) return 0;
      if (aVal === null || bVal === null) return 0;
      
      let comparacao = 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        comparacao = aVal.localeCompare(bVal);
      } else if (typeof aVal === "number" && typeof bVal === "number") {
        comparacao = aVal - bVal;
      }
      
      return ordenacao.direcao === "asc" ? comparacao : -comparacao;
    });
    
    return resultado;
  }, [extras, filtros, busca, ordenacao]);

  // Totais
  const totais = useMemo(() => {
    return {
      quantidade: extrasFiltrados.reduce((s, e) => s + e.quantidade, 0),
      valor: extrasFiltrados.reduce((s, e) => s + e.totalGeral, 0),
    };
  }, [extrasFiltrados]);

  // ---- Handlers de seleção ----

  const toggleSelecionarTodos = () => {
    if (selecionados.size === extrasFiltrados.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(extrasFiltrados.map((e) => e.id)));
    }
  };

  const toggleSelecionar = (id: string) => {
    const novo = new Set(selecionados);
    if (novo.has(id)) {
      novo.delete(id);
    } else {
      novo.add(id);
    }
    setSelecionados(novo);
  };

  const rotuloStatus = (s: StatusPagamento) =>
    STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

  const handleAplicarStatusEmMassa = async () => {
    if (selecionados.size === 0) return;
    
    setAplicandoStatus(true);
    try {
      const selecionadasExtras = extras.filter((e) => selecionados.has(e.id));
      const promises = selecionadasExtras.map((extra) =>
        atualizarStatusExtra(extra.id, statusEmMassa)
      );
      await Promise.all(promises);
      
      // Registra um log detalhado para cada extra alterada (de → para)
      for (const extra of selecionadasExtras) {
        registrarAcao(
          `Alterou status de "${rotuloStatus(extra.status)}" para "${rotuloStatus(statusEmMassa)}" — ${extra.substituto} (${extra.data}, ${formatarMoeda(extra.totalGeral)})`,
          "Extras"
        );
      }
      
      toast.success(`Status alterado para ${selecionados.size} extras!`);
      setSelecionados(new Set());
      await recarregar();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status.");
    } finally {
      setAplicandoStatus(false);
    }
  };

  const handleMudarStatusIndividual = async (extra: Extra, novoStatus: StatusPagamento) => {
    if (extra.status === novoStatus) return;
    try {
      await atualizarStatusExtra(extra.id, novoStatus);
      registrarAcao(
        `Alterou status de "${rotuloStatus(extra.status)}" para "${rotuloStatus(novoStatus)}" — ${extra.substituto} (${extra.data}, ${formatarMoeda(extra.totalGeral)})`,
        "Extras"
      );
      toast.success(`Status de ${extra.substituto} alterado para ${rotuloStatus(novoStatus)}.`);
      await recarregar();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status.");
    }
  };

  const handleExcluir = async () => {
    if (!extraParaExcluir) return;
    
    try {
      await excluirExtra(extraParaExcluir.id);
      registrarAcao(`Excluiu extra de ${extraParaExcluir.substituto}`, "Exclusão");
      toast.success("Extra excluída com sucesso!");
      setExtraParaExcluir(null);
      await recarregar();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir extra.");
    }
  };

  const handleOrdenar = (campo: keyof Extra) => {
    setOrdenacao((atual) => ({
      campo,
      direcao: atual.campo === campo && atual.direcao === "asc" ? "desc" : "asc",
    }));
  };

  const getStatusBadge = (status: StatusPagamento) => {
    const config = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
    const Icone = config.icon;
    return (
      <Badge variant="outline" className={`${config.color} gap-1`}>
        <Icone className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const todosSelecionados = extrasFiltrados.length > 0 && selecionados.size === extrasFiltrados.length;
  const algunsSelecionados = selecionados.size > 0 && selecionados.size < extrasFiltrados.length;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Todas as Extras"
        descricao="Gerencie todas as horas extras registradas no sistema."
      />

      <BarraFiltros filtros={filtros} onChange={setFiltros} />

      {/* Barra de ações em massa */}
      {selecionados.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="text-sm font-medium text-emerald-800">
            {selecionados.size} {selecionados.size === 1 ? "item selecionado" : "itens selecionados"}
          </span>
          
          <div className="flex items-center gap-2">
            <Select value={statusEmMassa} onValueChange={(v) => setStatusEmMassa(v as StatusPagamento)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex items-center gap-2">
                      <s.icon className="h-4 w-4" />
                      {s.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              onClick={handleAplicarStatusEmMassa}
              disabled={aplicandoStatus}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {aplicandoStatus ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aplicar a todos
                </>
              )}
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelecionados(new Set())}
            className="text-emerald-700"
          >
            Limpar seleção
          </Button>
        </div>
      )}

      {/* Busca e totais */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, posto, motivo, filial..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-4 text-sm">
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">{extrasFiltrados.length}</span> registros
          </div>
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">{formatarNumero(totais.quantidade)}</span> unidades
          </div>
          <div className="text-muted-foreground">
            <span className="font-medium text-emerald-700">{formatarMoeda(totais.valor)}</span> total
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={todosSelecionados}
                    onCheckedChange={toggleSelecionarTodos}
                    ref={(ref) => {
                      if (ref) {
                        (ref as HTMLButtonElement).indeterminate = algunsSelecionados;
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleOrdenar("data")}>
                  Data {ordenacao.campo === "data" && (ordenacao.direcao === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleOrdenar("substituto")}>
                  Substituído {ordenacao.campo === "substituto" && (ordenacao.direcao === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleOrdenar("motivo")}>
                  Motivo {ordenacao.campo === "motivo" && (ordenacao.direcao === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="cursor-pointer text-center" onClick={() => handleOrdenar("classificacao")}>
                  Cl. {ordenacao.campo === "classificacao" && (ordenacao.direcao === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleOrdenar("quantidade")}>
                  Qtd {ordenacao.campo === "quantidade" && (ordenacao.direcao === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleOrdenar("totalGeral")}>
                  Total {ordenacao.campo === "totalGeral" && (ordenacao.direcao === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead>DataInput</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extrasFiltrados.map((extra) => (
                <TableRow key={extra.id} className="hover:bg-slate-50">
                  <TableCell>
                    <Checkbox
                      checked={selecionados.has(extra.id)}
                      onCheckedChange={() => toggleSelecionar(extra.id)}
                    />
                  </TableCell>
                  <TableCell>{formatarData(extra.data)}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{extra.substituto}</TableCell>
                  <TableCell className="max-w-[120px] truncate">{extra.motivo}</TableCell>
                  <TableCell className="text-center">{extra.classificacao}</TableCell>
                  <TableCell className="text-right">{formatarNumero(extra.quantidade)}</TableCell>
                  <TableCell className="text-right font-medium">{formatarMoeda(extra.totalGeral)}</TableCell>
                  <TableCell>{extra.dataInput ? formatarData(extra.dataInput) : "—"}</TableCell>
                  <TableCell>{extra.usuarioLancamento || "—"}</TableCell>
                  <TableCell>{getStatusBadge(extra.status)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {extra.origem === "pdf" ? "PDF" : extra.origem === "excel" ? "Excel" : "PDF+Excel"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" title="Alterar status">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {STATUS_OPTIONS.map((s) => (
                            <DropdownMenuItem
                              key={s.value}
                              disabled={s.value === extra.status}
                              onClick={() => handleMudarStatusIndividual(extra, s.value)}
                            >
                              <s.icon className="h-4 w-4 mr-2" />
                              Marcar como {s.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExtraParaVer(extra)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExtraParaExcluir(extra)}
                        title="Excluir"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {extrasFiltrados.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma extra encontrada.
          </div>
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={!!extraParaExcluir} onOpenChange={() => setExtraParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a extra de <strong>{extraParaExcluir?.substituto}</strong> no dia{" "}
              <strong>{extraParaExcluir?.data}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de detalhes */}
      <AlertDialog open={!!extraParaVer} onOpenChange={() => setExtraParaVer(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Detalhes da Extra</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground">Data</p>
              <p className="font-medium">{extraParaVer?.data}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Classificação</p>
              <p className="font-medium">{extraParaVer?.classificacao}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Substituto</p>
              <p className="font-medium">{extraParaVer?.substituto}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Colaborador</p>
              <p className="font-medium">{extraParaVer?.colaborador}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Posto</p>
              <p className="font-medium">{extraParaVer?.posto}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Motivo</p>
              <p className="font-medium">{extraParaVer?.motivo}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quantidade</p>
              <p className="font-medium">{formatarNumero(extraParaVer?.quantidade || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Unitário</p>
              <p className="font-medium">{formatarMoeda(extraParaVer?.valorUnitario || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-medium text-emerald-700">{formatarMoeda(extraParaVer?.totalGeral || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{extraParaVer?.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Filial</p>
              <p className="font-medium">{extraParaVer?.filial}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Período</p>
              <p className="font-medium">{extraParaVer?.periodo}</p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
