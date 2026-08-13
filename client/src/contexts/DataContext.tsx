// ============================================
// Controle de Extras — Contexto de dados (extras, config, importações)
// ============================================

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Extra, Configuracoes, Importacao } from "@/lib/types";
import {
  carregarExtras,
  carregarConfiguracoes,
  carregarImportacoes,
  CONFIG_PADRAO,
} from "@/lib/firestore";
import { useAuth } from "./AuthContext";

interface DataContextData {
  extras: Extra[];
  configuracoes: Configuracoes;
  importacoes: Importacao[];
  carregandoDados: boolean;
  recarregar: () => Promise<void>;
  setExtras: React.Dispatch<React.SetStateAction<Extra[]>>;
  setConfiguracoes: React.Dispatch<React.SetStateAction<Configuracoes>>;
}

const DataContext = createContext<DataContextData>({} as DataContextData);

export function DataProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [extras, setExtras] = useState<Extra[]>([]);
  const [configuracoes, setConfiguracoes] = useState<Configuracoes>(CONFIG_PADRAO);
  const [importacoes, setImportacoes] = useState<Importacao[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(false);

  const recarregar = useCallback(async () => {
    if (!usuario) return;
    setCarregandoDados(true);
    try {
      const [ex, cfg, imp] = await Promise.all([
        carregarExtras(),
        carregarConfiguracoes(),
        carregarImportacoes(),
      ]);
      setExtras(ex);
      setConfiguracoes(cfg);
      setImportacoes(imp);
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setCarregandoDados(false);
    }
  }, [usuario]);

  useEffect(() => {
    if (usuario) {
      recarregar();
    } else {
      setExtras([]);
      setImportacoes([]);
    }
  }, [usuario, recarregar]);

  return (
    <DataContext.Provider
      value={{
        extras,
        configuracoes,
        importacoes,
        carregandoDados,
        recarregar,
        setExtras,
        setConfiguracoes,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
