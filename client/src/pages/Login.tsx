// ============================================
// Controle de Extras — Tela de Login
// ============================================

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock4, Loader2, Lock, Mail, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { entrar, recuperarSenha } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [modoRecuperar, setModoRecuperar] = useState(false);

  const traduzirErro = (codigo: string): string => {
    const mapa: Record<string, string> = {
      "auth/invalid-credential": "E-mail ou senha incorretos. Verifique e tente novamente.",
      "auth/user-not-found": "Usuário não encontrado.",
      "auth/wrong-password": "Senha incorreta.",
      "auth/invalid-email": "E-mail inválido.",
      "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      "auth/network-request-failed": "Falha de conexão. Verifique sua internet.",
    };
    return mapa[codigo] || "Não foi possível entrar. Verifique suas credenciais.";
  };

  const handleEntrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await entrar(email.trim(), senha);
    } catch (err: unknown) {
      const codigo = (err as { code?: string })?.code || "";
      setErro(traduzirErro(codigo));
    } finally {
      setCarregando(false);
    }
  };

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErro("Informe seu e-mail para recuperar a senha.");
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      await recuperarSenha(email.trim());
      toast.success("E-mail de recuperação enviado!", {
        description: "Verifique sua caixa de entrada e spam.",
      });
      setModoRecuperar(false);
    } catch (err: unknown) {
      const codigo = (err as { code?: string })?.code || "";
      setErro(traduzirErro(codigo));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100">
      {/* Painel lateral decorativo (desktop) */}
      <div className="hidden lg:flex w-[45%] bg-[oklch(0.26_0.06_162)] text-white flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <Clock4 className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div>
              <p className="font-display font-bold text-lg leading-tight">Controle de Extras</p>
              <p className="text-emerald-200/70 text-xs">Gestão de Horas Extras</p>
            </div>
          </div>
        </div>
        <div className="relative space-y-6">
          <h2 className="font-display text-3xl font-bold leading-tight">
            Controle, conferência e análise de horas extras em um só lugar.
          </h2>
          <p className="text-emerald-100/70 text-sm leading-relaxed max-w-md">
            Importe relatórios em PDF e Excel, cruze informações, identifique
            divergências, acompanhe pagamentos e gere relatórios gerenciais com
            precisão e rastreabilidade.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <p className="font-display text-2xl font-bold text-emerald-300 num">PDF + Excel</p>
              <p className="text-xs text-emerald-100/60 mt-1">Conferência cruzada</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-emerald-300 num">100%</p>
              <p className="text-xs text-emerald-100/60 mt-1">Rastreável</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-emerald-300 num">Tempo real</p>
              <p className="text-xs text-emerald-100/60 mt-1">Dashboard gerencial</p>
            </div>
          </div>
        </div>
        <p className="relative text-[11px] text-emerald-100/40">
          Plataforma independente de controle e gestão de horas extras.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[oklch(0.38_0.09_162)] text-white">
              <Clock4 className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div>
              <p className="font-display font-bold text-lg leading-tight text-foreground">Controle de Extras</p>
              <p className="text-muted-foreground text-xs">Gestão de Horas Extras</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-emerald-900/5 border border-slate-200/80 p-8">
            <h1 className="font-display text-xl font-bold text-foreground">
              {modoRecuperar ? "Recuperar senha" : "Acessar o sistema"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              {modoRecuperar
                ? "Informe seu e-mail para receber o link de redefinição."
                : "Entre com suas credenciais para continuar."}
            </p>

            {erro && (
              <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <form onSubmit={modoRecuperar ? handleRecuperar : handleEntrar} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px] font-medium">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-11"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {!modoRecuperar && (
                <div className="space-y-1.5">
                  <Label htmlFor="senha" className="text-[13px] font-medium">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="senha"
                      type="password"
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="pl-9 h-11"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={carregando}
                className="w-full h-11 bg-[oklch(0.38_0.09_162)] hover:bg-[oklch(0.33_0.09_162)] text-white font-semibold text-[14px] transition-all active:scale-[0.98]"
              >
                {carregando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : modoRecuperar ? (
                  "Enviar link de recuperação"
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setModoRecuperar(!modoRecuperar);
                  setErro("");
                }}
                className="text-[13px] font-medium text-[oklch(0.38_0.09_162)] hover:underline"
              >
                {modoRecuperar ? "Voltar para o login" : "Esqueci minha senha"}
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-[11.5px] text-muted-foreground leading-relaxed">
            Acesso restrito a usuários autorizados.
            <br />
            Todas as ações são registradas em auditoria.
          </p>
        </div>
      </div>
    </div>
  );
}
