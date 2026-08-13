// ============================================
// Controle de Extras — Gerenciamento de Usuários (admin)
// ============================================

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/Layout";
import type { Usuario, PerfilUsuario } from "@/lib/types";
import { carregarUsuarios, atualizarUsuario, excluirUsuario } from "@/lib/firestore";
import { formatarDataHora } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserPlus, ShieldCheck, Eye, Ban, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Usuarios() {
  const { usuario: atual, criarUsuarioAuth, registrarAcao } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState<PerfilUsuario>("conferencia");

  const carregar = async () => {
    setCarregando(true);
    try {
      setUsuarios(await carregarUsuarios());
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSalvando(true);
    try {
      await criarUsuarioAuth(email.trim(), senha, nome.trim(), perfil);
      registrarAcao(`Criou usuário "${nome}" (${perfil})`, "Usuários");
      toast.success("Usuário criado com sucesso!");
      setModalAberto(false);
      setNome(""); setEmail(""); setSenha(""); setPerfil("conferencia");
      await carregar();
    } catch (err: unknown) {
      const codigo = (err as { code?: string })?.code || "";
      const msg =
        codigo === "auth/email-already-in-use"
          ? "Este e-mail já está em uso."
          : codigo === "auth/invalid-email"
          ? "E-mail inválido."
          : codigo === "auth/weak-password"
          ? "Senha fraca (mínimo 6 caracteres)."
          : "Erro ao criar usuário. Verifique os dados.";
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (u: Usuario) => {
    if (u.id === atual?.id) {
      toast.error("Você não pode bloquear sua própria conta.");
      return;
    }
    try {
      await atualizarUsuario(u.id, { ativo: !u.ativo });
      registrarAcao(`${u.ativo ? "Bloqueou" : "Desbloqueou"} usuário "${u.nome}"`, "Usuários");
      toast.success(u.ativo ? "Usuário bloqueado." : "Usuário desbloqueado.");
      await carregar();
    } catch {
      toast.error("Erro ao atualizar usuário.");
    }
  };

  const mudarPerfil = async (u: Usuario, perfil: PerfilUsuario) => {
    try {
      await atualizarUsuario(u.id, { perfil });
      registrarAcao(`Alterou perfil de "${u.nome}" para ${perfil}`, "Usuários");
      toast.success("Perfil atualizado.");
      await carregar();
    } catch {
      toast.error("Erro ao atualizar perfil.");
    }
  };

  const excluir = async (u: Usuario) => {
    if (u.id === atual?.id) {
      toast.error("Você não pode excluir sua própria conta.");
      return;
    }
    if (!confirm(`Excluir o usuário "${u.nome}"? Esta ação remove o perfil de acesso.`)) return;
    try {
      await excluirUsuario(u.id);
      registrarAcao(`Excluiu usuário "${u.nome}"`, "Usuários");
      toast.success("Usuário excluído.");
      await carregar();
    } catch {
      toast.error("Erro ao excluir usuário.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Usuários"
        descricao="Gerencie os usuários do sistema e suas permissões."
        acoes={
          <Button onClick={() => setModalAberto(true)} className="gap-1.5 bg-[oklch(0.38_0.09_162)] hover:bg-[oklch(0.33_0.09_162)] text-white">
            <UserPlus className="h-4 w-4" /> Novo usuário
          </Button>
        }
      />

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Nome</th>
                <th className="px-4 py-2.5 font-semibold">E-mail</th>
                <th className="px-4 py-2.5 font-semibold">Perfil</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Criado em</th>
                <th className="px-4 py-2.5 font-semibold">Último acesso</th>
                <th className="px-4 py-2.5 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-[12px] font-bold text-emerald-800">
                        {u.nome.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <Select value={u.perfil} onValueChange={(v) => mudarPerfil(u, v as PerfilUsuario)} disabled={u.id === atual?.id}>
                      <SelectTrigger className="h-8 w-[170px] text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-700" /> Administrador</span>
                        </SelectItem>
                        <SelectItem value="conferencia">
                          <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-sky-700" /> Conferência</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {u.ativo ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                        <Ban className="h-3 w-3" /> Bloqueado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 num text-muted-foreground">{formatarDataHora(u.criadoEm)}</td>
                  <td className="px-4 py-3 num text-muted-foreground">{u.ultimoAcesso ? formatarDataHora(u.ultimoAcesso) : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => alternarAtivo(u)} disabled={u.id === atual?.id}>
                        {u.ativo ? "Bloquear" : "Desbloquear"}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => excluir(u)} disabled={u.id === atual?.id}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!carregando && usuarios.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal novo usuário */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Novo usuário</DialogTitle>
            <DialogDescription>Crie um acesso ao sistema com perfil e senha.</DialogDescription>
          </DialogHeader>
          <form onSubmit={criar} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Nome completo</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Ex.: Samuel Silva" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="usuario@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Senha inicial</Label>
              <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Perfil de acesso</Label>
              <Select value={perfil} onValueChange={(v) => setPerfil(v as PerfilUsuario)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conferencia">Usuário de Conferência (somente consulta)</SelectItem>
                  <SelectItem value="admin">Administrador (acesso completo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando} className="bg-[oklch(0.38_0.09_162)] hover:bg-[oklch(0.33_0.09_162)] text-white">
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
