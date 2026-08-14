// ============================================
// Controle de Extras — Dashboard executivo
// ============================================

import { useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { PageHeader } from "@/components/Layout";
import { BarraFiltros, aplicarFiltros } from "@/components/FiltrosGlobais";
import type { FiltrosGlobais } from "@/lib/types";
import { formatarMoeda, formatarNumero, hojeISO } from "@/lib/utils";
import {
  Wallet,
  TrendingUp,
  Clock4,
  Users,
  MapPin,
  Calculator,
  Hourglass,
  AlertTriangle,
  AlarmClock,
  Banknote,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  17: "Porteiro Diurno 8h",
  18: "Porteiro Diurno 6h",
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
  return NOMES_CLASSIFICACOES[codigo] || `Classif. ${codigo}`;
}

const CORES_GRAFICO = ["#008163", "#005A39", "#16a34a", "#65a30d", "#0d9488", "#059669", "#4d7c0f", "#15803d"];

function KpiCard({
  titulo,
  valor,
  sub,
  icone: Icone,
  destaque,
}: {
  titulo: string;
  valor: string;
  sub?: string;
  icone: React.ElementType;
  destaque?: "verde" | "ambar" | "vermelho";
}) {
  const cores = {
    verde: "from-emerald-700 to-emerald-900 text-white",
    ambar: "bg-card border",
    vermelho: "bg-card border",
  };
  const corIcone = {
    verde: "bg-white/15 text-emerald-200",
    ambar: "bg-amber-100 text-amber-700",
    vermelho: "bg-red-100 text-red-700",
  };
  const principal = destaque === "verde";
  return (
    <div
      className={`rounded-xl p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 duration-200 ${
        principal ? `bg-gradient-to-br ${cores.verde}` : "bg-card border"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${principal ? "text-emerald-200/80" : "text-muted-foreground"}`}>
            {titulo}
          </p>
          <p className={`font-display num mt-1.5 text-[26px] font-bold leading-none tracking-tight ${principal ? "text-white" : "text-foreground"}`}>
            {valor}
          </p>
          {sub && (
            <p className={`mt-1.5 text-[11.5px] ${principal ? "text-emerald-200/70" : "text-muted-foreground"}`}>
              {sub}
            </p>
          )}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${principal ? corIcone.verde : destaque === "ambar" ? corIcone.ambar : destaque === "vermelho" ? corIcone.vermelho : "bg-emerald-100 text-emerald-700"}`}>
          <Icone className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { extras, configuracoes, carregandoDados } = useData();
  const [filtros, setFiltros] = useState<FiltrosGlobais>({});

  const filtrados = useMemo(() => aplicarFiltros(extras, filtros), [extras, filtros]);

  const kpis = useMemo(() => {
    const hoje = hojeISO();
    const inicioAcomp = configuracoes.dataInicioAcompanhamento;
    const agora = new Date();
    const mesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const mesAntAno = mesAnterior.getFullYear();
    const mesAntNum = mesAnterior.getMonth() + 1;
    const anoAtual = agora.getFullYear();

    // Base: respeita data de início do acompanhamento
    const base = filtrados.filter((e) => e.dataISO >= inicioAcomp && e.dataISO <= hoje);

    const pagoMesAnterior = base
      .filter((e) => {
        const [a, m] = e.dataISO.split("-").map(Number);
        return a === mesAntAno && m === mesAntNum && e.status === "pago";
      })
      .reduce((s, e) => s + e.totalGeral, 0);

    const pagoAno = base
      .filter((e) => e.dataISO.startsWith(String(anoAtual)) && e.status === "pago")
      .reduce((s, e) => s + e.totalGeral, 0);

    const totalGeral = base.reduce((s, e) => s + e.totalGeral, 0);
    const totalQtd = base.reduce((s, e) => s + e.quantidade, 0);
    const colaboradores = new Set(base.map((e) => e.substituto)).size;
    const postos = new Set(base.map((e) => e.posto)).size;
    const pendente = base.filter((e) => e.status === "pendente").reduce((s, e) => s + e.totalGeral, 0);
    const divergencia = base.filter((e) => e.status === "divergencia").length;
    const atrasadas = base.filter(
      (e) => e.diasParaLancamento !== undefined && e.diasParaLancamento >= configuracoes.regrasAtraso.atrasoMin
    ).length;

    return {
      pagoMesAnterior,
      pagoAno,
      totalGeral,
      totalQtd,
      totalRegistros: base.length,
      colaboradores,
      postos,
      valorMedio: base.length > 0 ? totalGeral / base.length : 0,
      pendente,
      divergencia,
      atrasadas,
    };
  }, [filtrados, configuracoes]);

  const evolucaoMensal = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const e of filtrados) {
      const chave = e.dataISO.slice(0, 7); // aaaa-mm
      mapa.set(chave, (mapa.get(chave) || 0) + e.totalGeral);
    }
    const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return Array.from(mapa.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([chave, valor]) => {
        const [ano, mes] = chave.split("-");
        return { mes: `${meses[parseInt(mes, 10) - 1]}/${ano.slice(2)}`, valor: Math.round(valor * 100) / 100 };
      });
  }, [filtrados]);

  const porClassificacao = useMemo(() => {
    const mapa = new Map<number, number>();
    for (const e of filtrados) {
      mapa.set(e.classificacao, (mapa.get(e.classificacao) || 0) + e.totalGeral);
    }
    return Array.from(mapa.entries())
      .sort((a, b) => b[1] - a[1]) // Ordena por valor (maior primeiro)
      .map(([c, valor]) => ({ nome: getNomeClassificacao(c), valor: Math.round(valor * 100) / 100 }));
  }, [filtrados]);

  const porMotivo = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const e of filtrados) {
      mapa.set(e.motivo, (mapa.get(e.motivo) || 0) + e.totalGeral);
    }
    return Array.from(mapa.entries())
      .map(([nome, valor]) => ({ nome, valor: Math.round(valor * 100) / 100 }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [filtrados]);

  const rankingPostos = useMemo(() => {
    const mapa = new Map<string, { valor: number; qtd: number }>();
    for (const e of filtrados) {
      const atual = mapa.get(e.posto) || { valor: 0, qtd: 0 };
      atual.valor += e.totalGeral;
      atual.qtd += 1;
      mapa.set(e.posto, atual);
    }
    return Array.from(mapa.entries())
      .map(([posto, d]) => ({ posto, ...d }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [filtrados]);

  const rankingColaboradores = useMemo(() => {
    const mapa = new Map<string, { valor: number; qtd: number }>();
    for (const e of filtrados) {
      const atual = mapa.get(e.substituto) || { valor: 0, qtd: 0 };
      atual.valor += e.totalGeral;
      atual.qtd += 1;
      mapa.set(e.substituto, atual);
    }
    return Array.from(mapa.entries())
      .map(([nome, d]) => ({ nome, ...d }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  }, [filtrados]);

  if (carregandoDados) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Carregando dados...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Dashboard"
        descricao={`Acompanhamento desde ${new Date(configuracoes.dataInicioAcompanhamento + "T00:00:00").toLocaleDateString("pt-BR")} até hoje`}
      />

      <BarraFiltros filtros={filtros} onChange={setFiltros} />

      {/* KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard titulo="Total pago no mês anterior" valor={formatarMoeda(kpis.pagoMesAnterior)} icone={Wallet} destaque="verde" sub="Somente status Pago" />
        <KpiCard titulo="Total pago no ano" valor={formatarMoeda(kpis.pagoAno)} icone={Banknote} destaque="verde" sub={`Ano de ${new Date().getFullYear()}`} />
        <KpiCard titulo="Valor total no período" valor={formatarMoeda(kpis.totalGeral)} icone={TrendingUp} sub={`${kpis.totalRegistros} registros`} />
        <KpiCard titulo="Total pendente" valor={formatarMoeda(kpis.pendente)} icone={Hourglass} destaque="ambar" sub="Aguardando pagamento" />
      </div>

      {/* KPIs secundários */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard titulo="Extras" valor={String(kpis.totalRegistros)} icone={Clock4} />
        <KpiCard titulo="Unidades/horas" valor={formatarNumero(kpis.totalQtd)} icone={Calculator} />
        <KpiCard titulo="Colaboradores" valor={String(kpis.colaboradores)} icone={Users} />
        <KpiCard titulo="Postos" valor={String(kpis.postos)} icone={MapPin} />
        <KpiCard titulo="Com divergência" valor={String(kpis.divergencia)} icone={AlertTriangle} destaque={kpis.divergencia > 0 ? "vermelho" : undefined} />
        <KpiCard titulo="Atrasadas" valor={String(kpis.atrasadas)} icone={AlarmClock} destaque={kpis.atrasadas > 0 ? "ambar" : undefined} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-display text-[15px] font-bold mb-4">Evolução mensal dos valores</h3>
          {evolucaoMensal.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={evolucaoMensal} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(1)}k`} />
                <Tooltip
                  formatter={(v: number) => [formatarMoeda(v), "Valor"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13 }}
                />
                <Bar dataKey="valor" fill="#008163" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">Nenhum dado no período selecionado.</p>
          )}
        </div>

        {/* Gráfico de classificação - BARRAS HORIZONTAIS */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-display text-[15px] font-bold mb-4">Por classificação</h3>
          {porClassificacao.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(300, porClassificacao.length * 40)}>
              <BarChart data={porClassificacao} layout="vertical" margin={{ top: 5, right: 30, left: 110, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(1)}k`} />
                <YAxis type="category" dataKey="nome" width={105} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [formatarMoeda(v), "Valor"]} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <Bar dataKey="valor" fill="#008163" radius={[0, 6, 6, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">Sem dados.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-display text-[15px] font-bold mb-4">Distribuição por motivo</h3>
          {porMotivo.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={porMotivo} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(1)}k`} />
                <YAxis type="category" dataKey="nome" width={170} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => [formatarMoeda(v), "Valor"]} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <Bar dataKey="valor" fill="#005A39" radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">Sem dados.</p>
          )}
        </div>

        {/* Rankings */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="font-display text-[15px] font-bold mb-3">Top postos (valor)</h3>
            <div className="space-y-2.5">
              {rankingPostos.map((p, i) => (
                <div key={p.posto} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-[11px] font-bold text-emerald-800 num">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium">{p.posto}</p>
                  </div>
                  <span className="num text-[12.5px] font-bold text-emerald-800">{formatarMoeda(p.valor)}</span>
                </div>
              ))}
              {rankingPostos.length === 0 && <p className="text-sm text-muted-foreground">Sem dados.</p>}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="font-display text-[15px] font-bold mb-3">Top colaboradores (valor)</h3>
            <div className="space-y-2.5">
              {rankingColaboradores.map((c, i) => (
                <div key={c.nome} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-[11px] font-bold text-emerald-800 num">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium">{c.nome}</p>
                  </div>
                  <span className="num text-[12.5px] font-bold text-emerald-800">{formatarMoeda(c.valor)}</span>
                </div>
              ))}
              {rankingColaboradores.length === 0 && <p className="text-sm text-muted-foreground">Sem dados.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
