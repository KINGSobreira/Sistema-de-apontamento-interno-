// ============================================
// Controle de Extras — Camada de acesso ao Firestore
// ============================================

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  writeBatch,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Extra,
  Importacao,
  LogAuditoria,
  Configuracoes,
  Usuario,
  StatusPagamento,
} from "./types";
import { agoraISO } from "./utils";

// ---------- Configurações ----------

export const CONFIG_PADRAO: Configuracoes = {
  classificacoes: [
    { codigo: 1, local: "Capital", periodo: "Diurno", descricao: "Capital — Diurno", valor: 145.72 },
    { codigo: 2, local: "Capital", periodo: "Noturno", descricao: "Capital — Noturno", valor: 170.54 },
    { codigo: 3, local: "Interior", periodo: "Diurno", descricao: "Interior — Diurno", valor: 136.72 },
    { codigo: 4, local: "Interior", periodo: "Noturno", descricao: "Interior — Noturno", valor: 161.54 },
  ],
  regrasAtraso: { atencaoMin: 2, atrasoMin: 4 },
  dataInicioAcompanhamento: "2026-05-22",
};

export async function carregarConfiguracoes(): Promise<Configuracoes> {
  try {
    const snap = await getDoc(doc(db, "configuracoes", "geral"));
    if (snap.exists()) {
      const data = snap.data();
      return {
        classificacoes: data.classificacoes || CONFIG_PADRAO.classificacoes,
        regrasAtraso: data.regrasAtraso || CONFIG_PADRAO.regrasAtraso,
        dataInicioAcompanhamento: data.dataInicioAcompanhamento || CONFIG_PADRAO.dataInicioAcompanhamento,
      };
    }
  } catch (e) {
    console.warn("Erro ao carregar configurações, usando padrão:", e);
  }
  return CONFIG_PADRAO;
}

export async function salvarConfiguracoes(config: Configuracoes): Promise<void> {
  await setDoc(doc(db, "configuracoes", "geral"), config);
}

// ---------- Extras ----------

export async function carregarExtras(): Promise<Extra[]> {
  const snap = await getDocs(query(collection(db, "extras"), orderBy("dataISO", "desc"), limit(5000)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Extra);
}

export async function salvarExtrasEmLote(extras: Omit<Extra, "id">[]): Promise<void> {
  const CHUNK = 450;
  for (let i = 0; i < extras.length; i += CHUNK) {
    const batch = writeBatch(db);
    const fatia = extras.slice(i, i + CHUNK);
    for (const extra of fatia) {
      const ref = doc(collection(db, "extras"));
      batch.set(ref, extra);
    }
    await batch.commit();
  }
}

export async function atualizarStatusExtra(id: string, status: StatusPagamento): Promise<void> {
  await updateDoc(doc(db, "extras", id), { status });
}

export async function atualizarExtra(id: string, dados: Partial<Extra>): Promise<void> {
  await updateDoc(doc(db, "extras", id), { ...dados });
}

export async function excluirExtra(id: string): Promise<void> {
  await deleteDoc(doc(db, "extras", id));
}

// ---------- Importações ----------

export async function carregarImportacoes(): Promise<Importacao[]> {
  const snap = await getDocs(query(collection(db, "importacoes"), orderBy("dataImportacao", "desc"), limit(500)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Importacao);
}

export async function registrarImportacao(imp: Omit<Importacao, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "importacoes"), imp);
  return ref.id;
}

// ---------- Auditoria ----------

export async function registrarLog(log: Omit<LogAuditoria, "id">): Promise<void> {
  try {
    await addDoc(collection(db, "auditoria"), log);
  } catch (e) {
    console.warn("Falha ao registrar log:", e);
  }
}

export async function carregarLogs(limite = 300): Promise<LogAuditoria[]> {
  const snap = await getDocs(query(collection(db, "auditoria"), orderBy("dataHora", "desc"), limit(limite)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LogAuditoria);
}

// ---------- Usuários (perfis) ----------

export async function carregarPerfil(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (snap.exists()) return { id: snap.id, ...snap.data() } as Usuario;
  return null;
}

export async function salvarPerfil(usuario: Usuario): Promise<void> {
  await setDoc(doc(db, "usuarios", usuario.id), { ...usuario });
}

export async function carregarUsuarios(): Promise<Usuario[]> {
  const snap = await getDocs(collection(db, "usuarios"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Usuario);
}

export async function atualizarUsuario(id: string, dados: Partial<Usuario>): Promise<void> {
  await updateDoc(doc(db, "usuarios", id), { ...dados });
}

export async function excluirUsuario(id: string): Promise<void> {
  await deleteDoc(doc(db, "usuarios", id));
}

export async function registrarAcesso(uid: string): Promise<void> {
  try {
    await updateDoc(doc(db, "usuarios", uid), { ultimoAcesso: agoraISO() });
  } catch {
    /* perfil pode não existir ainda */
  }
}

export { Timestamp, where };
