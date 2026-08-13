// ============================================
// Controle de Extras — Serviço Firestore
// ============================================

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Extra, Importacao, Configuracoes, LogAuditoria, Usuario, StatusPagamento } from "./types";

// Remove campos undefined de um objeto (Firestore não aceita undefined)
function limparCampos<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const limpo: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      limpo[key as keyof T] = value;
    }
  }
  return limpo;
}

// ---- Configuração padrão ----

export const CONFIG_PADRAO: Configuracoes = {
  classificacoes: [
    // ============================================
    // VIGILÂNCIA — Servnac 01, RN 02, SP 03, Verde
    // ============================================
    { codigo: 1, local: "Capital", periodo: "Diurno", descricao: "EXTRA CAPITAL DIURNO", valor: 145.72 },
    { codigo: 2, local: "Capital", periodo: "Noturno", descricao: "EXTRA CAPITAL NOTURNO", valor: 170.54 },
    { codigo: 3, local: "Interior", periodo: "Diurno", descricao: "EXTRA INTERIOR DIURNO", valor: 136.72 },
    { codigo: 4, local: "Interior", periodo: "Noturno", descricao: "EXTRA INTERIOR NOTURNO", valor: 161.54 },
    { codigo: 5, local: "ADM", periodo: "Diurno", descricao: "HORA EXTRA ADM", valor: 8.27 },
    
    // ============================================
    // SERVNAC FACILITIES 04
    // ============================================
    { codigo: 6, local: "Facilities", periodo: "Noturno", descricao: "PORTEIROS NOTURNOS HORÁRIO COMERCIAL 11HRS UNIMED", valor: 227.78 },
    { codigo: 7, local: "Facilities", periodo: "Noturno", descricao: "PORTEIROS NOTURNOS SDF 100% 11HRS UNIMED", valor: 260.33 },
    { codigo: 8, local: "Facilities", periodo: "Diurno", descricao: "PORTEIROS DIURNOS HORÁRIO COMERCIAL 11HRS UNIMED", valor: 187.82 },
    { codigo: 9, local: "Facilities", periodo: "Diurno", descricao: "PORTEIROS DIURNO SDF 100% 11HRS UNIMED", valor: 214.65 },
    { codigo: 10, local: "Facilities", periodo: "Diurno", descricao: "PORTEIRO DIURNO H.COMERCIAL 8 UNIMED", valor: 136.56 },
    { codigo: 11, local: "Facilities", periodo: "Diurno", descricao: "PORTEIRO DIURNO SDF 8 HORAS UNIMED", valor: 156.08 },
    { codigo: 20, local: "Facilities", periodo: "Diurno", descricao: "PORTEIRO DIURNO FACILITES 4 HORAS", valor: 76.43 },
    { codigo: 21, local: "Facilities", periodo: "Diurno", descricao: "PORTEIRO DIURNO FACILITES 6HRS", valor: 102.91 },
    { codigo: 22, local: "Facilities", periodo: "Diurno", descricao: "PORTEIRO DIURNO FACILITES 6HRS", valor: 102.91 },
    
    // ============================================
    // SERVNAC TERCEIRIZAÇÃO 06
    // ============================================
    { codigo: 30, local: "Terceirização", periodo: "Diurno", descricao: "ASG DIURNO FACILITES 8HRS", valor: 97.97 },
    { codigo: 31, local: "Terceirização", periodo: "Diurno", descricao: "ASG DIURNO FACILITES 4HRS", valor: 38.14 },
    { codigo: 32, local: "Terceirização", periodo: "Diurno", descricao: "ASG DIURNO FACILITES 6HRS", valor: 84.30 },
    { codigo: 33, local: "Terceirização", periodo: "Diurno", descricao: "PORTEIRO DIURNO FACILITES 8HS", valor: 102.91 },
    { codigo: 34, local: "Terceirização", periodo: "Diurno", descricao: "PORTEIRO DIURNO FACILITES 6HS", valor: 88.00 },
  ],
  regrasAtraso: { atencaoMin: 2, atrasoMin: 4 },
  dataInicioAcompanhamento: "2026-05-22",
};


// ---- Extras ----

export async function salvarExtras(extras: Omit<Extra, "id">[]): Promise<string[]> {
  const batch = writeBatch(db);
  const ids: string[] = [];
  
  for (const extra of extras) {
    const ref = doc(collection(db, "extras"));
    const dadosLimpos = limparCampos(extra);
    batch.set(ref, dadosLimpos);
    ids.push(ref.id);
  }
  
  await batch.commit();
  return ids;
}

export const salvarExtrasEmLote = salvarExtras;

export async function carregarExtras(): Promise<Extra[]> {
  const q = query(collection(db, "extras"), orderBy("dataISO", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Extra));
}

export async function atualizarExtra(id: string, dados: Partial<Extra>): Promise<void> {
  const ref = doc(db, "extras", id);
  const dadosLimpos = limparCampos(dados);
  await updateDoc(ref, dadosLimpos);
}

export async function atualizarStatusExtra(id: string, status: StatusPagamento): Promise<void> {
  const ref = doc(db, "extras", id);
  await updateDoc(ref, { status });
}

export async function excluirExtra(id: string): Promise<void> {
  await deleteDoc(doc(db, "extras", id));
}

// ---- Importações ----

export async function salvarImportacao(importacao: Omit<Importacao, "id">): Promise<string> {
  const ref = doc(collection(db, "importacoes"));
  const dadosLimpos = limparCampos(importacao);
  await setDoc(ref, dadosLimpos);
  return ref.id;
}

export const registrarImportacao = salvarImportacao;

export async function carregarImportacoes(): Promise<Importacao[]> {
  const q = query(collection(db, "importacoes"), orderBy("dataImportacao", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Importacao));
}

// ---- Configurações ----

export async function carregarConfiguracoes(): Promise<Configuracoes | null> {
  const ref = doc(db, "configuracoes", "geral");
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return snapshot.data() as Configuracoes;
  }
  return null;
}

export async function salvarConfiguracoes(config: Configuracoes): Promise<void> {
  const ref = doc(db, "configuracoes", "geral");
  const dadosLimpos = limparCampos(config);
  await setDoc(ref, dadosLimpos);
}

// ---- Auditoria ----

export async function registrarLog(log: Omit<LogAuditoria, "id">): Promise<void> {
  const ref = doc(collection(db, "auditoria"));
  const dadosLimpos = limparCampos(log);
  await setDoc(ref, dadosLimpos);
}

export async function carregarLogs(limite: number = 500): Promise<LogAuditoria[]> {
  const q = query(
    collection(db, "auditoria"),
    orderBy("dataHora", "desc"),
    limit(limite)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as LogAuditoria));
}

// ---- Usuários (Perfis) ----

export async function carregarUsuarios(): Promise<Usuario[]> {
  const snapshot = await getDocs(collection(db, "usuarios"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Usuario));
}

export async function carregarUsuario(id: string): Promise<Usuario | null> {
  const ref = doc(db, "usuarios", id);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Usuario;
  }
  return null;
}

export async function criarUsuario(id: string, dados: Omit<Usuario, "id">): Promise<void> {
  const ref = doc(db, "usuarios", id);
  const dadosLimpos = limparCampos(dados);
  await setDoc(ref, dadosLimpos);
}

export async function atualizarUsuario(id: string, dados: Partial<Usuario>): Promise<void> {
  const ref = doc(db, "usuarios", id);
  const dadosLimpos = limparCampos(dados);
  await updateDoc(ref, dadosLimpos);
}

export async function excluirUsuario(id: string): Promise<void> {
  await deleteDoc(doc(db, "usuarios", id));
}

// ---- Funções de compatibilidade ----

export async function carregarPerfil(uid: string): Promise<Usuario | null> {
  return carregarUsuario(uid);
}

export async function salvarPerfil(uid: string, dados: Omit<Usuario, "id">): Promise<void> {
  return criarUsuario(uid, dados);
}

export async function registrarAcesso(uid: string): Promise<void> {
  const ref = doc(db, "usuarios", uid);
  await updateDoc(ref, { ultimoAcesso: new Date().toISOString() });
}
