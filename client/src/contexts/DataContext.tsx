// ============================================
// Controle de Extras — Contexto de Dados
// ============================================

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import type { Extra, Importacao, Configuracoes } from "@/lib/types";
import { carregarExtras, carregarImportacoes, carregarConfiguracoes, CONFIG_PADRAO } from "@/lib/firestore";
import { useAuth } from "./AuthContext";

interface DataContextType {
  extras: Extra[];
  importacoes: Importacao[];
  configuracoes: Configuracoes;
  carregando: boolean;
  recarregar: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [extras, setExtras] = useState<Extra[]>([]);
  const [importacoes, setImportacoes] = useState<Importacao[]>([]);
  const [configuracoes, setConfiguracoes] = useState<Configuracoes>(CONFIG_PADRAO);
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    if (!usuario) {
      setCarregando(false);
      return;
    }
    
    try {
      setCarregando(true);
      const [extrasData, importacoesData, configData] = await Promise.all([
        carregarExtras(),
        carregarImportacoes(),
        carregarConfiguracoes(),
      ]);
      
      setExtras(extrasData);
      setImportacoes(importacoesData);
      // Se não tem configuração salva, usa a padrão
      setConfiguracoes(configData || CONFIG_PADRAO);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      // Em caso de erro, usa configuração padrão
      setConfiguracoes(CONFIG_PADRAO);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [usuario]);

  const value = useMemo(() => ({
    extras,
    importacoes,
    configuracoes,
    carregando,
    recarregar: carregar,
  }), [extras, importacoes, configuracoes, carregando]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData deve ser usado dentro de DataProvider");
  }
  return context;
}
