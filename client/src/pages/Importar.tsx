// ============================================
// Controle de Extras — Página de Importação
// ============================================

import { useState, useRef } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/Layout";
import { processarPdf, type ResultadoPdf } from "@/lib/parserPdf";
import { processarExcel, type ResultadoExcel } from "@/lib/parserExcel";
import { cruzarRegistros } from "@/lib/cruzamento";
import { salvarExtrasEmLote, registrarImportacao } from "@/lib/firestore";
import type { RegistroImportado, Extra, ResultadoConferencia } from "@/lib/types";
import { formatarMoeda, formatarNumero } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  GitCompareArrows,
} from "lucide-react";
import { toast } from "sonner";

type Etapa = "selecionar" | "previa" | "cruzamento" | "confirmar";

export default function Importar() {
  const { extras, configuracoes, recarregar } = useData();
  const { usuario, registrarAcao } = useAuth();
  const [etapa, setEtapa] = useState<Etapa>("selecionar");
  const [carregando, setCarregando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  
  // Dados do PDF
  const [resultadoPdf, setResultadoPdf] = useState<ResultadoPdf | null>(null);
  const [arquivoPdf, setArquivoPdf] = useState<File | null>(null);
  
  // Dados do Excel
  const [resultadoExcel, setResultadoExcel] = useState<ResultadoExcel | null>(null);
  const [arquivoExcel, setArquivoExcel] = useState<File | null>(null);
  
  // Cruzamento
  const [resultadoCruzamento, setResultadoCruzamento] = useState<ResultadoConferencia | null>(null);
  
  // Refs para inputs de arquivo
  const inputPdfRef = useRef<HTMLInputElement>(null);
  const inputExcelRef = useRef<HTMLInputElement>(null);

  // ---- Handlers ----

  const handleSelecionarPdf = () => {
    inputPdfRef.current?.click();
  };

  const handleSelecionarExcel = () => {
    inputExcelRef.current?.click();
  };

  const handleArquivoPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setArquivoPdf(file);
    setCarregando(true);
    setProgresso(10);
    
    try {
      const resultado = await processarPdf(file);
      setProgresso(100);
      
      // Verificar se encontrou registros
      if (!resultado.registros || resultado.registros.length === 0) {
        toast.error("Nenhum registro encontrado no PDF.", {
          description: "Verifique se o arquivo é um Mapa de Cobertura válido.",
        });
        setResultadoPdf(null);
        setCarregando(false);
        return;
      }
      
      setResultadoPdf(resultado);
      setEtapa("previa");
      
      toast.success(`PDF processado: ${resultado.registros.length} registros encontrados.`, {
        description: resultado.conferido 
          ? "Totais conferem com o relatório." 
          : "Atenção: totais calculados diferem do relatório.",
      });
    } catch (error) {
      console.error("Erro ao processar PDF:", error);
      toast.error("Erro ao processar o PDF.", {
        description: "Verifique se o arquivo não está corrompido ou protegido.",
      });
    } finally {
      setCarregando(false);
      setProgresso(0);
      // Limpar input
      if (inputPdfRef.current) inputPdfRef.current.value = "";
    }
  };

  const handleArquivoExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setArquivoExcel(file);
    setCarregando(true);
    setProgresso(10);
    
    try {
      const resultado = await processarExcel(file);
      setProgresso(100);
      
      // Verificar se encontrou registros
      if (!resultado.registros || resultado.registros.length === 0) {
        toast.error("Nenhum registro encontrado no Excel.", {
          description: "Verifique se o arquivo é uma planilha de cobertura válida.",
        });
        setResultadoExcel(null);
        setCarregando(false);
        return;
      }
      
      setResultadoExcel(resultado);
      
      // Se já tem PDF, fazer cruzamento
      if (resultadoPdf) {
        const cruzamento = cruzarRegistros(
          resultadoPdf.registros,
          resultado.registros,
          extras
        );
        setResultadoCruzamento(cruzamento);
        setEtapa("cruzamento");
        
        toast.success(`Cruzamento concluído: ${cruzamento.coincidentes.length} coincidentes.`);
      } else {
        // Se não tem PDF, mostrar prévia do Excel
        setEtapa("previa");
        toast.success(`Excel processado: ${resultado.registros.length} registros encontrados.`);
      }
    } catch (error) {
      console.error("Erro ao processar Excel:", error);
      toast.error("Erro ao processar o Excel.", {
        description: "Verifique se o arquivo não está corrompido.",
      });
    } finally {
      setCarregando(false);
      setProgresso(0);
      // Limpar input
      if (inputExcelRef.current) inputExcelRef.current.value = "";
    }
  };

  const handleCruzarComExcel = () => {
    handleSelecionarExcel();
  };

  const handleConfirmarImportacao = async () => {
    if (!resultadoPdf && !resultadoExcel) return;
    
    setCarregando(true);
    
    try {
      // Determinar quais registros salvar
      let registrosParaSalvar: RegistroImportado[] = [];
      let tipo: "pdf" | "excel" | "cruzado" = "pdf";
      
      if (resultadoCruzamento) {
        // Se fez cruzamento, salvar os coincidentes + somente PDF + somente Excel
        registrosParaSalvar = [
          ...resultadoCruzamento.coincidentes,
          ...resultadoCruzamento.somentePdf,
          ...resultadoCruzamento.somenteExcel,
        ];
        tipo = "cruzado";
      } else if (resultadoPdf) {
        registrosParaSalvar = resultadoPdf.registros;
        tipo = "pdf";
      } else if (resultadoExcel) {
        registrosParaSalvar = resultadoExcel.registros;
        tipo = "excel";
      }
      
      // Converter para formato Extra
      const novosExtras: Omit<Extra, "id">[] = registrosParaSalvar.map((r) => ({
        data: r.data,
        dataISO: r.dataISO,
        classificacao: r.classificacao,
        substituto: r.substituto,
        colaborador: r.colaborador,
        posto: r.posto,
        motivo: r.motivo,
        quantidade: r.quantidade,
        valorUnitario: r.valorUnitario,
        totalGeral: r.totalGeral,
        situacao: r.situacao,
        status: "pendente" as const,
        origem: tipo === "cruzado" ? "pdf_excel" as const : tipo,
        filial: resultadoPdf?.filial || resultadoExcel?.filial || "Não identificada",
        periodo: resultadoPdf?.periodo || resultadoExcel?.periodo || "",
        importacaoId: "", // Será preenchido depois
        criadoEm: new Date().toISOString(),
        criadoPor: usuario?.email || "sistema",
      }));
      
      // Salvar no Firestore
      const ids = await salvarExtrasEmLote(novosExtras);
      
      // Registrar importação
      await registrarImportacao({
        arquivo: arquivoPdf?.name || arquivoExcel?.name || "desconhecido",
        tipo,
        filial: resultadoPdf?.filial || resultadoExcel?.filial || "Não identificada",
        periodo: resultadoPdf?.periodo || resultadoExcel?.periodo || "",
        quantidadeRegistros: registrosParaSalvar.length,
        quantidadeNovos: ids.length,
        quantidadeDuplicados: registrosParaSalvar.length - ids.length,
        quantidadeDivergencias: resultadoCruzamento?.divergencias.length || 0,
        valorTotal: registrosParaSalvar.reduce((s, r) => s + r.totalGeral, 0),
        dataImportacao: new Date().toISOString(),
        usuarioResponsavel: usuario?.nome || usuario?.email || "sistema",
      });
      
      // Registrar ação
      registrarAcao(
        `Importou ${ids.length} registros de ${arquivoPdf?.name || arquivoExcel?.name}`,
        "Importação"
      );
      
      toast.success(`Importação concluída: ${ids.length} registros salvos.`, {
        description: registrosParaSalvar.length - ids.length > 0
          ? `${registrosParaSalvar.length - ids.length} duplicados ignorados.`
          : undefined,
      });
      
      // Recarregar dados
      await recarregar();
      
      // Resetar estado
      handleCancelar();
      
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar os dados.", {
        description: "Verifique sua conexão e as regras do Firestore.",
      });
    } finally {
      setCarregando(false);
    }
  };

  const handleCancelar = () => {
    setEtapa("selecionar");
    setResultadoPdf(null);
    setResultadoExcel(null);
    setResultadoCruzamento(null);
    setArquivoPdf(null);
    setArquivoExcel(null);
  };

  // ---- Renderização ----

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Importar Relatórios"
        descricao="Importe o Mapa de Cobertura em PDF e/ou a planilha Excel para conferência e registro."
      />

      {/* Inputs ocultos */}
      <input
        type="file"
        ref={inputPdfRef}
        onChange={handleArquivoPdf}
        accept=".pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={inputExcelRef}
        onChange={handleArquivoExcel}
        accept=".xlsx,.xls"
        className="hidden"
      />

      {/* Barra de progresso */}
      {carregando && (
        <div className="space-y-2">
          <Progress value={progresso} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            Processando arquivo...
          </p>
        </div>
      )}

      {/* Etapa: Selecionar arquivos */}
      {etapa === "selecionar" && !carregando && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card PDF */}
          <Card className="border-2 border-dashed border-red-200 bg-red-50/30 hover:border-red-300 transition-colors">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-xl">Importar Relatório PDF</CardTitle>
              <CardDescription>
                Mapa de Cobertura (.pdf)
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={handleSelecionarPdf}
                variant="outline"
                className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
              >
                <Upload className="h-4 w-4" />
                Selecionar arquivo
              </Button>
            </CardContent>
          </Card>

          {/* Card Excel */}
          <Card className="border-2 border-dashed border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 transition-colors">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
              </div>
              <CardTitle className="text-xl">Importar Excel</CardTitle>
              <CardDescription>
                Planilha de coberturas (.xlsx, .xls)
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={handleSelecionarExcel}
                variant="outline"
                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <Upload className="h-4 w-4" />
                Selecionar arquivo
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Etapa: Prévia do PDF */}
      {etapa === "previa" && resultadoPdf && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-red-600" />
                  Prévia do PDF
                </CardTitle>
                <CardDescription>
                  {arquivoPdf?.name} • {resultadoPdf.filial} • {resultadoPdf.periodo}
                </CardDescription>
              </div>
              <Badge variant={resultadoPdf.conferido ? "default" : "destructive"}>
                {resultadoPdf.conferido ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Conferido
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Divergência
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{resultadoPdf.registros.length}</p>
                <p className="text-sm text-muted-foreground">Registros</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{formatarNumero(resultadoPdf.totalCalculadoQtd)}</p>
                <p className="text-sm text-muted-foreground">Unidades</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{formatarMoeda(resultadoPdf.totalCalculadoValor)}</p>
                <p className="text-sm text-muted-foreground">Valor Total</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{formatarNumero(resultadoPdf.totalGeralQtd)}</p>
                <p className="text-sm text-muted-foreground">Total Relatório</p>
              </div>
            </div>

            {/* Alerta de divergência */}
            {!resultadoPdf.conferido && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Divergência nos totais</AlertTitle>
                <AlertDescription>
                  O total calculado ({formatarNumero(resultadoPdf.totalCalculadoQtd)} unidades / {formatarMoeda(resultadoPdf.totalCalculadoValor)}) 
                  difere do total do relatório ({formatarNumero(resultadoPdf.totalGeralQtd)} unidades / {formatarMoeda(resultadoPdf.totalGeralValor)}).
                  Verifique se o PDF está completo.
                </AlertDescription>
              </Alert>
            )}

            {/* Tabela de registros */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Data</th>
                      <th className="px-4 py-2 text-left font-semibold">Substituto</th>
                      <th className="px-4 py-2 text-left font-semibold">Posto</th>
                      <th className="px-4 py-2 text-left font-semibold">Motivo</th>
                      <th className="px-4 py-2 text-center font-semibold">Cl.</th>
                      <th className="px-4 py-2 text-right font-semibold">Qtd</th>
                      <th className="px-4 py-2 text-right font-semibold">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadoPdf.registros.map((r, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-2">{r.data}</td>
                        <td className="px-4 py-2 max-w-[150px] truncate">{r.substituto}</td>
                        <td className="px-4 py-2 max-w-[150px] truncate">{r.posto}</td>
                        <td className="px-4 py-2 max-w-[120px] truncate">{r.motivo}</td>
                        <td className="px-4 py-2 text-center">{r.classificacao}</td>
                        <td className="px-4 py-2 text-right">{formatarNumero(r.quantidade)}</td>
                        <td className="px-4 py-2 text-right font-medium">{formatarMoeda(r.totalGeral)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleCancelar}>
                Cancelar
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCruzarComExcel}
                  className="gap-2"
                >
                  <GitCompareArrows className="h-4 w-4" />
                  Cruzar com Excel
                </Button>
                <Button
                  onClick={handleConfirmarImportacao}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar Importação
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Etapa: Cruzamento */}
      {etapa === "cruzamento" && resultadoCruzamento && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5 text-blue-600" />
              Conferência Cruzada PDF × Excel
            </CardTitle>
            <CardDescription>
              Comparando registros do PDF com a planilha Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumo do cruzamento */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-200">
                <p className="text-2xl font-bold text-emerald-700">{resultadoCruzamento.coincidentes.length}</p>
                <p className="text-sm text-emerald-600">Coincidentes</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center border border-amber-200">
                <p className="text-2xl font-bold text-amber-700">{resultadoCruzamento.somentePdf.length}</p>
                <p className="text-sm text-amber-600">Somente PDF</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center border border-amber-200">
                <p className="text-2xl font-bold text-amber-700">{resultadoCruzamento.somenteExcel.length}</p>
                <p className="text-sm text-amber-600">Somente Excel</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                <p className="text-2xl font-bold text-red-700">{resultadoCruzamento.divergencias.length}</p>
                <p className="text-sm text-red-600">Divergências</p>
              </div>
            </div>

            {/* Tabs com detalhes */}
            <Tabs defaultValue="coincidentes">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="coincidentes">Coincidentes</TabsTrigger>
                <TabsTrigger value="somentePdf">Somente PDF</TabsTrigger>
                <TabsTrigger value="somenteExcel">Somente Excel</TabsTrigger>
                <TabsTrigger value="divergencias">Divergências</TabsTrigger>
              </TabsList>
              
              <TabsContent value="coincidentes" className="mt-4">
                <TabelaRegistros registros={resultadoCruzamento.coincidentes} />
              </TabsContent>
              
              <TabsContent value="somentePdf" className="mt-4">
                <TabelaRegistros registros={resultadoCruzamento.somentePdf} />
              </TabsContent>
              
              <TabsContent value="somenteExcel" className="mt-4">
                <TabelaRegistros registros={resultadoCruzamento.somenteExcel} />
              </TabsContent>
              
              <TabsContent value="divergencias" className="mt-4">
                <TabelaDivergencias divergencias={resultadoCruzamento.divergencias} />
              </TabsContent>
            </Tabs>

            {/* Botões */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleCancelar}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarImportacao}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmar Importação ({resultadoCruzamento.coincidentes.length + resultadoCruzamento.somentePdf.length + resultadoCruzamento.somenteExcel.length} registros)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações sobre conferência cruzada */}
      {etapa === "selecionar" && !carregando && (
        <Alert>
          <GitCompareArrows className="h-4 w-4" />
          <AlertTitle>Conferência cruzada PDF × Excel</AlertTitle>
          <AlertDescription>
            Para cruzar os dados, importe primeiro o PDF. Na tela de prévia, você poderá anexar o Excel do mesmo período 
            para identificar coincidências, registros exclusivos e divergências de valor, quantidade e classificação.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ---- Componentes auxiliares ----

function TabelaRegistros({ registros }: { registros: RegistroImportado[] }) {
  if (!registros || registros.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum registro nesta categoria.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="max-h-[300px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Data</th>
              <th className="px-4 py-2 text-left font-semibold">Substituto</th>
              <th className="px-4 py-2 text-left font-semibold">Posto</th>
              <th className="px-4 py-2 text-left font-semibold">Motivo</th>
              <th className="px-4 py-2 text-center font-semibold">Cl.</th>
              <th className="px-4 py-2 text-right font-semibold">Qtd</th>
              <th className="px-4 py-2 text-right font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r, i) => (
              <tr key={i} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2">{r.data}</td>
                <td className="px-4 py-2 max-w-[150px] truncate">{r.substituto}</td>
                <td className="px-4 py-2 max-w-[150px] truncate">{r.posto}</td>
                <td className="px-4 py-2 max-w-[120px] truncate">{r.motivo}</td>
                <td className="px-4 py-2 text-center">{r.classificacao}</td>
                <td className="px-4 py-2 text-right">{formatarNumero(r.quantidade)}</td>
                <td className="px-4 py-2 text-right font-medium">{formatarMoeda(r.totalGeral)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabelaDivergencias({ divergencias }: { divergencias: { pdf: RegistroImportado; excel: RegistroImportado; diferencas: string[] }[] }) {
  if (!divergencias || divergencias.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma divergência encontrada.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="max-h-[300px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Data</th>
              <th className="px-4 py-2 text-left font-semibold">Substituto</th>
              <th className="px-4 py-2 text-left font-semibold">Divergências</th>
              <th className="px-4 py-2 text-right font-semibold">PDF</th>
              <th className="px-4 py-2 text-right font-semibold">Excel</th>
            </tr>
          </thead>
          <tbody>
            {divergencias.map((d, i) => (
              <tr key={i} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2">{d.pdf.data}</td>
                <td className="px-4 py-2 max-w-[150px] truncate">{d.pdf.substituto}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {d.diferencas.map((diff, j) => (
                      <Badge key={j} variant="destructive" className="text-xs">
                        {diff}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2 text-right">{formatarMoeda(d.pdf.totalGeral)}</td>
                <td className="px-4 py-2 text-right">{formatarMoeda(d.excel.totalGeral)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
