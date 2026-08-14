// ============================================
// Controle de Extras — Controle de Pagamentos
// ============================================

import { useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { PageHeader } from "@/components/Layout";
import { BarraFiltros, aplicarFiltros } from "@/components/FiltrosGlobais";
import type { FiltrosGlobais } from "@/lib/types";
import { formatarMoeda } from "@/lib/utils";
import { Wallet, Hourglass, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function Pagamentos() {
  const { extras } = useData();
  const [filtros, setFiltros] = useState<FiltrosGlobais>({});
  const filtrados = useMemo(() => aplicarFiltros(extras, filtros), [extras, filtros]);

  const totais = useMemo(() => {
    const soma = (status: string) =>
      filtrados.filter((e) => e.status === status).reduce((s, e) => s + e.totalGeral, 0);
    const pago = soma("pago");
    const conferido = soma("conferido");
    return {
      pago,
      pendente: soma("pendente"),
      conferido,
      divergencia: soma("divergencia"),
      jaConferido: pago + conferido, // tudo que já passou pela conferência (aguardando pagamento ou já pago)
      geral: filtrados.reduce((s, e) => s + e.totalGeral, 0),
    };
  }, [filtrados]);

  const porMes = useMemo(() => {
    const mapa = new Map<string, { pago: number; pendente: number; conferido: number; divergencia: number }>();
    for (const e of filtrados) {
      const chave = e.dataISO.slice(0, 7);
      if (!mapa.has(chave)) mapa.set(chave, { pago: 0, pendente: 0, conferido: 0, divergencia: 0 });
      const m = mapa.get(chave)!;
      m[e.status as keyof typeof m] += e.totalGeral;
    }
    const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return Array.from(mapa.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([chave, d]) => {
        const [ano, mes] = chave.split("-");
        return {
          mes: `${meses[parseInt(mes, 10) - 1]}/${ano.slice(2)}`,
          pago: Math.round(d.pago * 100) / 100,
          pendente: Math.round(d.pendente * 100) / 100,
          conferido: Math.round(d.conferido * 100) / 100,
          divergencia: Math.round(d.divergencia * 100) / 100,
        };
      });
  }, [filtrados]);

  const porAno = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const e of filtrados) {
      if (e.status !== "pago") continue;
      const ano = e.dataISO.slice(0, 4);
      mapa.set(ano, (mapa.get(ano) || 0) + e.totalGeral);
    }
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtrados]);

  const cards = [
    { titulo: "Total pago", valor: totais.pago, icone: Wallet, cor: "text-emerald-700", bg: "bg-emerald-100 text-emerald-700" },
    { titulo: "Total conferido", valor: totais.conferido, icone: CheckCircle2, cor: "text-sky-700", bg: "bg-sky-100 text-sky-700" },
    { titulo: "Total pendente", valor: totais.pendente, icone: Hourglass, cor: "text-amber-700", bg: "bg-amber-100 text-amber-700" },
    { titulo: "Em divergência", valor: totais.divergencia, icone: AlertTriangle, cor: "text-red-700", bg: "bg-red-100 text-red-700" },
  ];

  const cardAcumulado = {
    titulo: "Já passou por conferência",
    valor: totais.jaConferido,
    icone: ShieldCheck,
    cor: "text-teal-700",
    bg: "bg-teal-100 text-teal-700",
    sub: "Conferido + Pago (acumulado)",
  };

  return (
    <div className="space-y-5">
      <PageHeader titulo="Pagamentos" descricao="Acompanhamento dos valores pagos, pendentes e em divergência." />

      <BarraFiltros filtros={filtros} onChange={setFiltros} compacto />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {cards.map((c) => (
          <div key={c.titulo} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c.titulo}</p>
                <p className={`num font-display mt-1.5 text-2xl font-bold ${c.cor}`}>{formatarMoeda(c.valor)}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.bg}`}>
                <c.icone className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
        {/* Card acumulado: nunca zera quando o status muda para Pago */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-800">{cardAcumulado.titulo}</p>
              <p className={`num font-display mt-1.5 text-2xl font-bold ${cardAcumulado.cor}`}>{formatarMoeda(cardAcumulado.valor)}</p>
              <p className="mt-1 text-[11px] text-teal-700/80">{cardAcumulado.sub}</p>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cardAcumulado.bg}`}>
              <cardAcumulado.icone className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-display text-[15px] font-bold mb-4">Totais por mês</h3>
          {porMes.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={porMes} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(v: number) => formatarMoeda(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13 }} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="pago" name="Pago" stackId="a" fill="#008163" />
                <Bar dataKey="conferido" name="Conferido" stackId="a" fill="#0ea5e9" />
                <Bar dataKey="pendente" name="Pendente" stackId="a" fill="#f59e0b" />
                <Bar dataKey="divergencia" name="Divergência" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">Sem dados no período.</p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-display text-[15px] font-bold mb-4">Total pago por ano</h3>
          <div className="space-y-3">
            {porAno.map(([ano, valor]) => (
              <div key={ano} className="flex items-center justify-between rounded-lg bg-slate-50 border px-4 py-3">
                <span className="font-display text-lg font-bold num">{ano}</span>
                <span className="num text-[15px] font-bold text-emerald-800">{formatarMoeda(valor)}</span>
              </div>
            ))}
            {porAno.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>}
          </div>
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Valor geral (todos os status)</p>
            <p className="num font-display mt-1 text-xl font-bold text-emerald-900">{formatarMoeda(totais.geral)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
