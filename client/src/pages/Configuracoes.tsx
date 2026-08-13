// ============================================
// Controle de Extras — Configurações (admin)
// Classificações, regras de atraso, motivos, filiais
// ============================================

import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/Layout";
import { salvarConfiguracoes } from "@/lib/firestore";
import { formatarMoeda } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Configuracoes() {
  const { configuracoes, setConfiguracoes, extras } = useData();
  const { registrarAcao } = useAuth();
  const [salvando, setSalvando] = useState(false);

  const [classificacoes, setClassificacoes] = useState(configuracoes.classificacoes);
  const [regras, setRegras] = useState(configuracoes.regrasAtraso);
  const [dataInicio, setDataInicio] = useState(configuracoes.dataInicioAcompanhamento);

  // Motivos e filiais derivados dos dados
  const motivosExistentes = Array.from(new Set(extras.map((e) => e.motivo))).sort();
  const filiaisExistentes = Array.from(new Set(extras.map((e) => e.filial))).sort();

  const salvar = async () => {
    setSalvando(true);
    try {
      const nova = {
        classificacoes,
        regrasAtraso: regras,
        dataInicioAcompanhamento: dataInicio,
      };
      await salvarConfiguracoes(nova);
      setConfiguracoes(nova);
      registrarAcao("Atualizou as configurações do sistema", "Configurações");
      toast.success("Configurações salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setSalvando(false);
    }
  };

  const atualizarClassificacao = (idx: number, campo: string, valor: string | number) => {
    setClassificacoes((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [campo]: valor } : c))
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Configurações"
        descricao="Classificações, regras de atraso e parâmetros gerais do sistema."
        acoes={
          <Button onClick={salvar} disabled={salvando} className="gap-1.5 bg-[oklch(0.38_0.09_162)] hover:bg-[oklch(0.33_0.09_162)] text-white">
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alterações
          </Button>
        }
      />

      <Tabs defaultValue="classificacoes">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="classificacoes">Classificações</TabsTrigger>
          <TabsTrigger value="atraso">Prazo de Lançamento</TabsTrigger>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="motivos">Motivos</TabsTrigger>
          <TabsTrigger value="filiais">Filiais</TabsTrigger>
        </TabsList>

        {/* Classificações */}
        <TabsContent value="classificacoes" className="mt-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="font-display text-[15px] font-bold mb-1">Tabela de classificações</h3>
            <p className="text-[12.5px] text-muted-foreground mb-4">
              Os valores são usados para calcular automaticamente o valor de cada extra e identificar a classificação nos arquivos Excel.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">Código</th>
                    <th className="px-4 py-2.5 font-semibold">Local</th>
                    <th className="px-4 py-2.5 font-semibold">Período</th>
                    <th className="px-4 py-2.5 font-semibold">Descrição</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {classificacoes.map((c, i) => (
                    <tr key={c.codigo} className="border-b last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-[12px] font-bold text-emerald-800 num">{c.codigo}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Input value={c.local} onChange={(e) => atualizarClassificacao(i, "local", e.target.value)} className="h-8 w-[110px] text-[12.5px]" />
                      </td>
                      <td className="px-4 py-2.5">
                        <Input value={c.periodo} onChange={(e) => atualizarClassificacao(i, "periodo", e.target.value)} className="h-8 w-[110px] text-[12.5px]" />
                      </td>
                      <td className="px-4 py-2.5">
                        <Input value={c.descricao} onChange={(e) => atualizarClassificacao(i, "descricao", e.target.value)} className="h-8 text-[12.5px]" />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={c.valor}
                          onChange={(e) => atualizarClassificacao(i, "valor", parseFloat(e.target.value) || 0)}
                          className="h-8 w-[120px] text-[12.5px] text-right num ml-auto"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 border p-4 text-[12.5px] text-muted-foreground">
              <strong className="text-foreground">Exemplo de cálculo:</strong> Classificação 1 × quantidade 2 = {formatarMoeda((classificacoes[0]?.valor || 0) * 2)} •
              Classificação 1 × quantidade 0,90 = {formatarMoeda((classificacoes[0]?.valor || 0) * 0.9)}
            </div>
          </div>
        </TabsContent>

        {/* Regras de atraso */}
        <TabsContent value="atraso" className="mt-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm max-w-xl">
            <h3 className="font-display text-[15px] font-bold mb-1">Prazo para lançamento</h3>
            <p className="text-[12.5px] text-muted-foreground mb-5">
              Dias para lançamento = DataInput − Data da extra.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-[13px]">Atenção a partir de (dias)</Label>
                  <Input type="number" min={1} value={regras.atencaoMin} onChange={(e) => setRegras({ ...regras, atencaoMin: parseInt(e.target.value) || 2 })} className="num" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-[13px]">Atrasada a partir de (dias)</Label>
                  <Input type="number" min={2} value={regras.atrasoMin} onChange={(e) => setRegras({ ...regras, atrasoMin: parseInt(e.target.value) || 4 })} className="num" />
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 border p-4 text-[12.5px] space-y-1">
                <p><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 mr-2" />0 a {regras.atencaoMin - 1} dia(s) → <strong>Dentro do prazo</strong></p>
                <p><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 mr-2" />{regras.atencaoMin} a {regras.atrasoMin - 1} dias → <strong>Atenção</strong></p>
                <p><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 mr-2" />{regras.atrasoMin}+ dias → <strong>Extra atrasada</strong></p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Geral */}
        <TabsContent value="geral" className="mt-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm max-w-xl">
            <h3 className="font-display text-[15px] font-bold mb-1">Parâmetros gerais</h3>
            <p className="text-[12.5px] text-muted-foreground mb-5">
              Data de início do acompanhamento — os indicadores pessoais do dashboard consideram apenas registros a partir desta data.
            </p>
            <div className="space-y-1.5 max-w-[220px]">
              <Label className="text-[13px]">Início do acompanhamento</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="num" />
            </div>
          </div>
        </TabsContent>

        {/* Motivos */}
        <TabsContent value="motivos" className="mt-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="font-display text-[15px] font-bold mb-1">Motivos identificados</h3>
            <p className="text-[12.5px] text-muted-foreground mb-4">
              Os motivos são absorvidos automaticamente dos arquivos importados.
            </p>
            <div className="flex flex-wrap gap-2">
              {motivosExistentes.map((m) => (
                <span key={m} className="inline-flex items-center rounded-lg bg-slate-100 border px-3 py-1.5 text-[12.5px] font-medium">
                  {m}
                </span>
              ))}
              {motivosExistentes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum motivo registrado ainda.</p>}
            </div>
          </div>
        </TabsContent>

        {/* Filiais */}
        <TabsContent value="filiais" className="mt-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="font-display text-[15px] font-bold mb-1">Filiais identificadas</h3>
            <p className="text-[12.5px] text-muted-foreground mb-4">
              As filiais são identificadas automaticamente nos arquivos importados.
            </p>
            <div className="space-y-2">
              {filiaisExistentes.map((f) => (
                <div key={f} className="rounded-lg bg-slate-50 border px-4 py-2.5 text-[13px] font-medium">{f}</div>
              ))}
              {filiaisExistentes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma filial registrada ainda.</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
