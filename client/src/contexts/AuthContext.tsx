// ============================================
// Controle de Extras — Contexto de autenticação
// ============================================

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { Usuario, PerfilUsuario } from "@/lib/types";
import { carregarPerfil, salvarPerfil, registrarAcesso, registrarLog } from "@/lib/firestore";
import { agoraISO } from "@/lib/utils";

interface AuthContextData {
  firebaseUser: FirebaseUser | null;
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
  criarUsuarioAuth: (email: string, senha: string, nome: string, perfil: PerfilUsuario) => Promise<string>;
  isAdmin: boolean;
  registrarAcao: (acao: string, modulo: string) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        let perfil = await carregarPerfil(fbUser.uid);
        if (!perfil) {
          // Primeiro acesso: cria perfil. O primeiro usuário do sistema vira admin.
          perfil = {
            id: fbUser.uid,
            nome: fbUser.displayName || fbUser.email?.split("@")[0] || "Usuário",
            email: fbUser.email || "",
            perfil: "admin",
            ativo: true,
            criadoEm: agoraISO(),
            ultimoAcesso: agoraISO(),
          };
          await salvarPerfil(perfil);
        }
        if (!perfil.ativo) {
          await signOut(auth);
          setUsuario(null);
          setCarregando(false);
          return;
        }
        setUsuario(perfil);
        registrarAcesso(fbUser.uid);
      } else {
        setUsuario(null);
      }
      setCarregando(false);
    });
    return () => unsub();
  }, []);

  const entrar = async (email: string, senha: string) => {
    await signInWithEmailAndPassword(auth, email, senha);
  };

  const sair = async () => {
    if (usuario) {
      registrarAcao("Saiu do sistema", "Autenticação");
    }
    await signOut(auth);
  };

  const recuperarSenha = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const criarUsuarioAuth = async (email: string, senha: string, nome: string, perfil: PerfilUsuario) => {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    const novo: Usuario = {
      id: cred.user.uid,
      nome,
      email,
      perfil,
      ativo: true,
      criadoEm: agoraISO(),
    };
    await salvarPerfil(novo);
    return cred.user.uid;
  };

  const registrarAcao = (acao: string, modulo: string) => {
    if (!usuario) return;
    registrarLog({
      usuario: usuario.nome,
      usuarioId: usuario.id,
      dataHora: agoraISO(),
      acao,
      modulo,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        usuario,
        carregando,
        entrar,
        sair,
        recuperarSenha,
        criarUsuarioAuth,
        isAdmin: usuario?.perfil === "admin",
        registrarAcao,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
