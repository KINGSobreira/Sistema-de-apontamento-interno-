// ============================================
// Controle de Extras — Auditoria de acessos e ações
// ============================================

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/Layout";
import type { LogAuditoria } from "@/lib/types";
import { carregarLogs } from "@/lib/firestore";
import { formatarDataHora } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollText, Search } from "lucide-react";

export default function Auditoria() {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarLogs(500)
      .then(setLogs)
      .finally(() => setCarregando(false));
  }, []);

  const filtrados = logs.filter((l) => {
    if (!busca.trim()) return true;
    const b = busca.toUpperCase();
    return `${l.usuario} ${l.acao} ${l.modulo}`.toUpperCase().includes(b);
  });

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Auditoria"
        descricao="Histórico de atividades e acessos ao sistema — rastreabilidade completa."
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por usuário, ação ou módulo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="divide-y">
          {filtrados.map((log) => (
            <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50/60">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 mt-0.5">
                <ScrollText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px]">
                  <strong className="font-semibold">{log.usuario}</strong>
                  <span className="text-muted-foreground"> — {log.acao}</span>
                </p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {formatarDataHora(log.dataHora)} • Módulo: {log.modulo}
                  {log.ip && ` • IP: ${log.ip}`}
                </p>
              </div>
            </div>
          ))}
          {!carregando && filtrados.length === 0 && (
            <p className="px-5 py-16 text-center text-sm text-muted-foreground">
              Nenhum registro de auditoria encontrado.
            </p>
          )}
          {carregando && (
            <p className="px-5 py-16 text-center text-sm text-muted-foreground">Carregando...</p>
          )}
        </div>
      </div>
    </div>
  );
}
