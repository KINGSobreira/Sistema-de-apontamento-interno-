// ============================================
// Controle de Extras — Importação de PDF e Excel
// Fluxo: selecionar arquivo -> processar -> prévia ->
// duplicidade -> (opcional) cruzamento -> confirmar
// ============================================

import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, BadgeOrigem } from "@/components/Layout";
import { processarPdf, type ResultadoPdf } from "@/lib/parserPdf";
import { processarExcel, type ResultadoExcel } from "@/lib/parserExcel";
import { cruzarRegistros } from "@/lib/cruzamento";
import { salvarExtrasEmLote, registrarImportacao } from "@/lib/firestore";
import type { RegistroImportado, Extra, ResultadoConferencia } from "@/lib/types";
import {
  formatarMoeda,
  formatarNumero,
  agoraISO,
  diffDias,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FileUp,
  FileSpreadsheet,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Upload,
  GitCompareArrows,
} from "lucide-react";
import { toast } from "sonner";

type Etapa = "selecao" | "previa" | "cruzamento" | "concluido";

export default function Importar() {
  const { extras, configuracoes, recarregar } = useData();
  const { usuario, registrarAcao } = useAuth();

  const [etapa, setEtapa] = useState<Etapa>("selecao");
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [tipoArquivo, setTipoArquivo] = useState<"pdf" | "excel">("pdf");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [resultadoPdf, setResultadoPdf] = useState<ResultadoPdf | null>(null);
  const [resultadoExcel, setResultadoExcel] = useState<ResultadoExcel | null>(null);
  const [registros, setRegistros] = useState<RegistroImportado[]>([]);
  const [conferencia, setConferencia] = useState<ResultadoConferencia | null>(null);
  const [modoCruzamento, setModoCruzamento] = useState(false);

  // ---------- Seleção e processamento ----------

  const handleArquivo = async (e: React.ChangeEvent<HTMLInputElement>, tipo: "pdf" | "excel") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessando(true);
    setNomeArquivo(file.name);
    setTipoArquivo(tipo);
    setConferencia(null);
    setModoCruzamento(false);

    try {
      if (tipo === "pdf") {
        const res = await processarPdf(file);
        setResultadoPdf(res);
        setResultadoExcel(null);
        setRegistros(res.registros);
        if (res.registros.length === 0) {
          toast.error("Nenhum registro encontrado no PDF.", {
            description: "Verifique se o arquivo é um Mapa de Cobertura válido.",
          });
          setProcessando(false);
          return;
        }
        toast.success(`PDF processado: ${res.registros.length} registros encontrados.`);
      } else {
        const res = await processarExcel(file, configuracoes.classificacoes);
        setResultadoExcel(res);
        setResultadoPdf(null);
        setRegistros(res.registros);
        if (res.registros.length === 0) {
          toast.error("Nenhum registro encontrado no Excel.");
          setProcessando(false);
          return;
        }
        toast.success(`Excel processado: ${res.registros.length} registros encontrados.`);
      }
      setEtapa("previa");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar o arquivo.", {
        description: "Verifique o formato e tente novamente.",
      });
    } finally {
      setProcessando(false);
      e.target.value = "";
    }
  };

  // ---------- Duplicidade ----------

  const analiseDuplicidade = useMemo(() => {
    const chavesExistentes = new Set(extras.map((e) => e.chave));
    const chavesNovas = new Set<string>();
    let novos = 0;
    let duplicados = 0;
    for (const r of registros) {
      if (chavesExistentes.has(r.chave) || chavesNovas.has(r.chave)) {
        duplicados++;
      } else {
        chavesNovas.add(r.chave);
        novos++;
      }
    }
    return { novos, duplicados, total: registros.length };
  }, [registros, extras]);

  // ---------- Cruzamento PDF × Excel ----------

  const iniciarCruzamento = () => {
    if (!resultadoPdf) {
      toast.error("Importe primeiro o PDF para cruzar com o Excel.");
      return;
    }
    setProcessando(true);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (!file) {
        setProcessando(false);
        return;
      }
      try {
        const resExcel = await processarExcel(file, configuracoes.classificacoes);
        const conf = cruzarRegistros(resultadoPdf.registros, resExcel.registros);
        setResultadoExcel(resExcel);
        setConferencia(conf);
        setModoCruzamento(true);
        setEtapa("cruzamento");
        toast.success("Conferência cruzada concluída.");
      } catch (err) {
        console.error(err);
        toast.error("Erro ao processar o Excel para cruzamento.");
      } finally {
        setProcessando(false);
      }
    };
    input.click();
    setProcessando(false);
  };

  // ---------- Confirmação ----------

  const confirmarImportacao = async (somenteNovos: boolean) => {
    if (!usuario) return;
    setSalvando(true);
    try {
      const chavesExistentes = new Set(extras.map((e) => e.chave));
      const chavesNovas = new Set<string>();

      let registrosFinais: RegistroImportado[] = [];

      if (modoCruzamento && conferencia && resultadoPdf && resultadoExcel) {
        // No cruzamento: registros coincidentes viram pdf_excel
        const chavesSomentePdf = new Set(conferencia.somentePdf.map((r) => r.chave));
        const chavesSomenteExcel = new Set(conferencia.somenteExcel.map((r) => r.chave));
        const divergentes = new Set(
          [...conferencia.divergenciaValor, ...conferencia.divergenciaQuantidade, ...conferencia.divergenciaClassificacao].map(
            (d) => d.registroPdf.chave
          )
        );

        const todosPdf = resultadoPdf.registros.map((r) => ({
          ...r,
          _origem: chavesSomentePdf.has(r.chave) ? ("pdf" as const) : ("pdf_excel" as const),
          _divergente: divergentes.has(r.chave),
        }));
        const todosExcel = conferencia.somenteExcel.map((r) => ({
          ...r,
          _origem: "excel" as const,
          _divergente: false,
        }));
        registrosFinais = [...todosPdf, ...todosExcel];
        void chavesSomenteExcel;
      } else {
        registrosFinais = registros.map((r) => ({ ...r, _origem: tipoArquivo, _divergente: false }));
      }

      const paraSalvar: Omit<Extra, "id">[] = [];
      let novosCount = 0;
      let duplicadosCount = 0;

      for (const r of registrosFinais) {
        const reg = r as RegistroImportado & { _origem: Extra["origem"]; _divergente: boolean };
        if (chavesExistentes.has(reg.chave) || chavesNovas.has(reg.chave)) {
          duplicadosCount++;
          if (somenteNovos) continue;
          // Se não for "somente novos", ainda assim não duplica — apenas ignora
          continue;
        }
        chavesNovas.add(reg.chave);
        novosCount++;

        const diasParaLancamento =
          reg.dataInputISO && reg.dataISO ? diffDias(reg.dataISO, reg.dataInputISO) : undefined;

        paraSalvar.push({
          chave: reg.chave,
          data: reg.data,
          dataISO: reg.dataISO,
          dataInput: reg.dataInput,
          dataInputISO: reg.dataInputISO,
          filial: reg.filial,
          codigoFilial: reg.codigoFilial,
          substituto: reg.substituto,
          codigoSubstituto: reg.codigoSubstituto,
          colaborador: reg.colaborador,
          codigoColaborador: reg.codigoColaborador,
          posto: reg.posto,
          codigoPosto: reg.codigoPosto,
          motivo: reg.motivo,
          classificacao: reg.classificacao,
          quantidade: reg.quantidade,
          valorUnitario: reg.valorUnitario,
          valorTotal: reg.valorTotal,
          vt: reg.vt,
          va: reg.va,
          totalGeral: reg.totalGeral,
          usuario: reg.usuario,
          origem: reg._origem,
          arquivoOrigem: nomeArquivo,
          importacaoId: "",
          importadoEm: agoraISO(),
          status: reg._divergente ? "divergencia" : "pendente",
          observacao: reg.observacao,
          revisaoNecessaria: reg.revisaoNecessaria,
          diasParaLancamento,
        });
      }

      const totalQtd = paraSalvar.reduce((s, r) => s + r.quantidade, 0);
      const totalValor = paraSalvar.reduce((s, r) => s + r.totalGeral, 0);
      const totalDivergencias = conferencia
        ? conferencia.divergenciaValor.length +
          conferencia.divergenciaQuantidade.length +
          conferencia.divergenciaClassificacao.length +
          conferencia.somentePdf.length +
          conferencia.somenteExcel.length
        : 0;

      const importacaoId = await registrarImportacao({
        dataImportacao: agoraISO(),
        arquivo: nomeArquivo,
        tipo: tipoArquivo,
        filial: resultadoPdf?.filial || resultadoExcel?.filial || "Não informado",
        periodo: resultadoPdf?.periodo || "Não informado",
        quantidadeRegistros: registros.length,
        quantidadeNovos: novosCount,
        quantidadeDuplicados: duplicadosCount,
        quantidadeDivergencias: totalDivergencias,
        valorTotal: totalValor,
        quantidadeTotal: totalQtd,
        usuarioResponsavel: usuario.nome,
      });

      // Atualiza importacaoId nos registros
      const comImportacao = paraSalvar.map((r) => ({ ...r, importacaoId }));
      await salvarExtrasEmLote(comImportacao);

      registrarAcao(
        `Importou arquivo ${tipoArquivo.toUpperCase()} "${nomeArquivo}" (${novosCount} novos registros)`,
        "Importação"
      );

      await recarregar();
      setEtapa("concluido");
      toast.success("Importação concluída com sucesso!", {
        description: `${novosCount} registros novos importados.`,
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar os dados.", {
        description: "Verifique sua conexão e as regras do Firestore.",
      });
    } finally {
      setSalvando(false);
    }
  };

  const reiniciar = () => {
    setEtapa("selecao");
    setResultadoPdf(null);
    setResultadoExcel(null);
    setRegistros([]);
    setConferencia(null);
    setModoCruzamento(false);
    setNomeArquivo("");
  };

  // ---------- Render ----------

  const totalQtd = registros.reduce((s, r) => s + r.quantidade, 0);
  const totalValor = registros.reduce((s, r) => s + r.totalGeral, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Importar Relatórios"
        descricao="Importe o Mapa de Cobertura em PDF e/ou a planilha Excel para conferência e registro."
      />

      {/* ETAPA 1 — Seleção */}
      {etapa === "selecao" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label
            htmlFor="input-pdf"
            className="group cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-card p-10 text-center transition-all hover:border-emerald-500 hover:bg-emerald-50/40"
          >
            <input
              id="input-pdf"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => handleArquivo(e, "pdf")}
              disabled={processando}
            />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 transition-transform group-hover:scale-110">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="font-display mt-4 text-lg font-bold">Importar Relatório PDF</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Mapa de Cobertura (.pdf)
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
              <FileUp className="h-4 w-4" /> Selecionar arquivo
            </p>
          </label>

          <label
            htmlFor="input-excel"
            className="group cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-card p-10 text-center transition-all hover:border-emerald-500 hover:bg-emerald-50/40"
          >
            <input
              id="input-excel"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => handleArquivo(e, "excel")}
              disabled={processando}
            />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 transition-transform group-hover:scale-110">
              <FileSpreadsheet className="h-8 w-8" />
            </div>
            <h3 className="font-display mt-4 text-lg font-bold">Importar Excel</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Planilha de coberturas (.xlsx, .xls)
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
              <FileUp className="h-4 w-4" /> Selecionar arquivo
            </p>
          </label>

          {processando && (
            <div className="md:col-span-2 flex items-center justify-center gap-3 rounded-xl border bg-card p-8">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
              <p className="text-sm font-medium">Processando arquivo...</p>
            </div>
          )}

          <div className="md:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
            <h4 className="flex items-center gap-2 text-[13.5px] font-bold text-emerald-900">
              <GitCompareArrows className="h-4 w-4" />
              Conferência cruzada PDF × Excel
            </h4>
            <p className="mt-1 text-[13px] text-emerald-800/80 leading-relaxed">
              Para cruzar os dados, importe primeiro o <strong>PDF</strong>. Na tela de prévia,
              você poderá anexar o Excel do mesmo período para identificar coincidências,
              registros exclusivos e divergências de valor, quantidade e classificação.
            </p>
          </div>
        </div>
      )}

      {/* ETAPA 2 — Prévia */}
      {etapa === "previa" && (
        <div className="space-y-5">
          {/* Resumo */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tipoArquivo === "pdf" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
                  {tipoArquivo === "pdf" ? <FileText className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-[14px] font-bold">{nomeArquivo}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {resultadoPdf?.filial || resultadoExcel?.filial}
                    {resultadoPdf?.periodo && ` • Período: ${resultadoPdf.periodo}`}
                  </p>
                </div>
              </div>
              <BadgeOrigem origem={tipoArquivo} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { rotulo: "Registros", valor: String(registros.length) },
                { rotulo: "Unidades/horas", valor: formatarNumero(totalQtd) },
                { rotulo: "Valor total", valor: formatarMoeda(totalValor) },
                { rotulo: "Novos", valor: String(analiseDuplicidade.novos), cor: "text-emerald-700" },
                { rotulo: "Duplicados", valor: String(analiseDuplicidade.duplicados), cor: analiseDuplicidade.duplicados > 0 ? "text-amber-600" : undefined },
                {
                  rotulo: "Revisão necessária",
                  valor: String(registros.filter((r) => r.revisaoNecessaria).length),
                  cor: registros.some((r) => r.revisaoNecessaria) ? "text-red-600" : undefined,
                },
              ].map((k) => (
                <div key={k.rotulo} className="rounded-lg bg-slate-50 border p-3 text-center">
                  <p className={`num font-display text-xl font-bold ${k.cor || "text-foreground"}`}>{k.valor}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{k.rotulo}</p>
                </div>
              ))}
            </div>

            {/* Validação com total do PDF */}
            {resultadoPdf && resultadoPdf.totalGeralValor > 0 && (
              <div className={`mt-4 flex items-center gap-2.5 rounded-lg border px-4 py-3 text-[13px] font-medium ${
                Math.abs(totalValor - resultadoPdf.totalGeralValor) < 0.05
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}>
                {Math.abs(totalValor - resultadoPdf.totalGeralValor) < 0.05 ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span>
                  Total do relatório: <strong className="num">{formatarNumero(resultadoPdf.totalGeralQtd)} unidades</strong> /{" "}
                  <strong className="num">{formatarMoeda(resultadoPdf.totalGeralValor)}</strong>
                  {Math.abs(totalValor - resultadoPdf.totalGeralValor) < 0.05
                    ? " — Conferido e batendo com a importação."
                    : ` — Diferença de ${formatarMoeda(Math.abs(totalValor - resultadoPdf.totalGeralValor))} detectada.`}
                </span>
              </div>
            )}

            {/* Avisos do parser */}
            {((resultadoPdf?.avisos.length || 0) > 0 || (resultadoExcel?.avisos.length || 0) > 0) && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                {(resultadoPdf?.avisos || resultadoExcel?.avisos || []).map((a, i) => (
                  <p key={i} className="text-[12.5px] text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> {a}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Tabela de prévia */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-slate-50/60">
              <h3 className="text-[14px] font-bold">Registros encontrados</h3>
            </div>
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-[12.5px]">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">Data</th>
                    <th className="px-4 py-2.5 font-semibold">Substituto</th>
                    <th className="px-4 py-2.5 font-semibold">Substituído</th>
                    <th className="px-4 py-2.5 font-semibold">Posto</th>
                    <th className="px-4 py-2.5 font-semibold">Motivo</th>
                    <th className="px-4 py-2.5 font-semibold text-center">Cl.</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Qtd</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Valor</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.slice(0, 200).map((r, i) => (
                    <tr key={i} className={`border-b last:border-0 hover:bg-slate-50/70 ${r.revisaoNecessaria ? "bg-red-50/50" : ""}`}>
                      <td className="px-4 py-2 num whitespace-nowrap">{r.data}</td>
                      <td className="px-4 py-2 max-w-[180px] truncate font-medium">{r.substituto}</td>
                      <td className="px-4 py-2 max-w-[160px] truncate text-muted-foreground">{r.colaborador}</td>
                      <td className="px-4 py-2 max-w-[200px] truncate">{r.posto}</td>
                      <td className="px-4 py-2 max-w-[150px] truncate">{r.motivo}</td>
                      <td className="px-4 py-2 text-center num">{r.classificacao || "—"}</td>
                      <td className="px-4 py-2 text-right num">{formatarNumero(r.quantidade)}</td>
                      <td className="px-4 py-2 text-right num">{formatarMoeda(r.valorUnitario)}</td>
                      <td className="px-4 py-2 text-right num font-semibold">{formatarMoeda(r.totalGeral)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {registros.length > 200 && (
                <p className="px-4 py-3 text-center text-[12px] text-muted-foreground border-t">
                  Exibindo 200 de {registros.length} registros.
                </p>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={reiniciar} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Cancelar
            </Button>
            {tipoArquivo === "pdf" && (
              <Button variant="outline" onClick={iniciarCruzamento} disabled={processando} className="gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                <GitCompareArrows className="h-4 w-4" /> Cruzar com Excel
              </Button>
            )}
            <div className="flex-1" />
            <Button
              onClick={() => confirmarImportacao(true)}
              disabled={salvando || analiseDuplicidade.novos === 0}
              className="gap-2 bg-[oklch(0.38_0.09_162)] hover:bg-[oklch(0.33_0.09_162)] text-white"
            >
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Confirmar importação ({analiseDuplicidade.novos} novos)
            </Button>
          </div>
          {analiseDuplicidade.duplicados > 0 && (
            <p className="text-[12.5px] text-amber-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {analiseDuplicidade.duplicados} registro(s) já existem no banco e serão ignorados automaticamente (sem duplicação).
            </p>
          )}
        </div>
      )}

      {/* ETAPA 3 — Cruzamento */}
      {etapa === "cruzamento" && conferencia && (
        <div className="space-y-5">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="font-display text-[16px] font-bold mb-4 flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5 text-emerald-700" />
              Resultado da conferência cruzada
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { rotulo: "Coincidentes", valor: conferencia.coincidentes, cor: "text-emerald-700" },
                { rotulo: "Somente no PDF", valor: conferencia.somentePdf.length, cor: conferencia.somentePdf.length ? "text-amber-600" : undefined },
                { rotulo: "Somente no Excel", valor: conferencia.somenteExcel.length, cor: conferencia.somenteExcel.length ? "text-amber-600" : undefined },
                { rotulo: "Diverg. valor", valor: conferencia.divergenciaValor.length, cor: conferencia.divergenciaValor.length ? "text-red-600" : undefined },
                { rotulo: "Diverg. quantidade", valor: conferencia.divergenciaQuantidade.length, cor: conferencia.divergenciaQuantidade.length ? "text-red-600" : undefined },
                { rotulo: "Diverg. classificação", valor: conferencia.divergenciaClassificacao.length, cor: conferencia.divergenciaClassificacao.length ? "text-red-600" : undefined },
              ].map((k) => (
                <div key={k.rotulo} className="rounded-lg bg-slate-50 border p-3 text-center">
                  <p className={`num font-display text-xl font-bold ${k.cor || "text-foreground"}`}>{k.valor}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{k.rotulo}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detalhes das divergências */}
          {[...conferencia.divergenciaValor, ...conferencia.divergenciaQuantidade, ...conferencia.divergenciaClassificacao].length > 0 && (
            <div className="rounded-xl border border-red-200 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b bg-red-50/60">
                <h3 className="text-[14px] font-bold text-red-800">Divergências encontradas</h3>
              </div>
              <div className="divide-y">
                {[...conferencia.divergenciaValor, ...conferencia.divergenciaQuantidade, ...conferencia.divergenciaClassificacao].map((d, i) => (
                  <div key={i} className="px-5 py-3.5 flex flex-wrap items-center gap-x-6 gap-y-1">
                    <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 uppercase">
                      {d.tipo === "valor" ? "Divergência de valor" : d.tipo === "quantidade" ? "Divergência de quantidade" : "Divergência de classificação"}
                    </span>
                    <span className="text-[13px] font-semibold">{d.colaborador}</span>
                    <span className="text-[12.5px] text-muted-foreground num">{d.data}</span>
                    <span className="text-[12.5px] text-muted-foreground max-w-[220px] truncate">{d.posto}</span>
                    <span className="text-[12.5px] font-medium text-red-700 num">{d.descricao}</span>
                    {d.diferenca !== undefined && d.tipo === "valor" && (
                      <span className="text-[12.5px] font-bold text-red-800 num">Diferença: {formatarMoeda(d.diferenca)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Somente PDF / Somente Excel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-amber-50/60">
                <h3 className="text-[13.5px] font-bold text-amber-800">Somente no PDF ({conferencia.somentePdf.length})</h3>
              </div>
              <div className="max-h-[260px] overflow-y-auto divide-y">
                {conferencia.somentePdf.length === 0 && <p className="px-5 py-4 text-[13px] text-muted-foreground">Nenhum registro exclusivo do PDF.</p>}
                {conferencia.somentePdf.map((r, i) => (
                  <div key={i} className="px-5 py-2.5 text-[12.5px] flex flex-wrap gap-x-4">
                    <span className="num">{r.data}</span>
                    <span className="font-medium max-w-[180px] truncate">{r.substituto}</span>
                    <span className="text-muted-foreground max-w-[160px] truncate">{r.posto}</span>
                    <span className="num ml-auto font-semibold">{formatarMoeda(r.totalGeral)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-amber-50/60">
                <h3 className="text-[13.5px] font-bold text-amber-800">Somente no Excel ({conferencia.somenteExcel.length})</h3>
              </div>
              <div className="max-h-[260px] overflow-y-auto divide-y">
                {conferencia.somenteExcel.length === 0 && <p className="px-5 py-4 text-[13px] text-muted-foreground">Nenhum registro exclusivo do Excel.</p>}
                {conferencia.somenteExcel.map((r, i) => (
                  <div key={i} className="px-5 py-2.5 text-[12.5px] flex flex-wrap gap-x-4">
                    <span className="num">{r.data}</span>
                    <span className="font-medium max-w-[180px] truncate">{r.substituto}</span>
                    <span className="text-muted-foreground max-w-[160px] truncate">{r.posto}</span>
                    <span className="num ml-auto font-semibold">{formatarMoeda(r.totalGeral)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={reiniciar} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Cancelar
            </Button>
            <div className="flex-1" />
            <Button
              onClick={() => confirmarImportacao(true)}
              disabled={salvando}
              className="gap-2 bg-[oklch(0.38_0.09_162)] hover:bg-[oklch(0.33_0.09_162)] text-white"
            >
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Confirmar e salvar dados
            </Button>
          </div>
        </div>
      )}

      {/* ETAPA 4 — Concluído */}
      {etapa === "concluido" && (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-9 w-9 text-emerald-700" />
          </div>
          <h3 className="font-display mt-5 text-xl font-bold">Importação concluída!</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Os dados foram armazenados com sucesso e o dashboard já está atualizado.
            Registros duplicados foram ignorados automaticamente.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" onClick={reiniciar}>Nova importação</Button>
            <Button asChild className="bg-[oklch(0.38_0.09_162)] hover:bg-[oklch(0.33_0.09_162)] text-white">
              <a href="/">Ir para o Dashboard</a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
