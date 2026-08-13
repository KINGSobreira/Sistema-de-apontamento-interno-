import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import { Layout } from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Importar from "./pages/Importar";
import Extras from "./pages/Extras";
import Pagamentos from "./pages/Pagamentos";
import Analises from "./pages/Analises";
import Atrasadas from "./pages/Atrasadas";
import Divergencias from "./pages/Divergencias";
import Relatorios from "./pages/Relatorios";
import Historico from "./pages/Historico";
import Usuarios from "./pages/Usuarios";
import Configuracoes from "./pages/Configuracoes";
import Auditoria from "./pages/Auditoria";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

function RotaProtegida({
  component: Component,
  adminOnly = false,
}: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { usuario, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (adminOnly && !isAdmin) {
      setLocation("/");
    }
  }, [adminOnly, isAdmin, setLocation]);

  if (adminOnly && !isAdmin) return null;
  if (!usuario) return null;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"}>
        <RotaProtegida component={Dashboard} />
      </Route>
      <Route path={"/importar"}>
        <RotaProtegida component={Importar} adminOnly />
      </Route>
      <Route path={"/extras"}>
        <RotaProtegida component={Extras} />
      </Route>
      <Route path={"/pagamentos"}>
        <RotaProtegida component={Pagamentos} />
      </Route>
      <Route path={"/analises"}>
        <RotaProtegida component={Analises} />
      </Route>
      <Route path={"/atrasadas"}>
        <RotaProtegida component={Atrasadas} />
      </Route>
      <Route path={"/divergencias"}>
        <RotaProtegida component={Divergencias} />
      </Route>
      <Route path={"/relatorios"}>
        <RotaProtegida component={Relatorios} />
      </Route>
      <Route path={"/historico"}>
        <RotaProtegida component={Historico} adminOnly />
      </Route>
      <Route path={"/usuarios"}>
        <RotaProtegida component={Usuarios} adminOnly />
      </Route>
      <Route path={"/configuracoes"}>
        <RotaProtegida component={Configuracoes} adminOnly />
      </Route>
      <Route path={"/auditoria"}>
        <RotaProtegida component={Auditoria} adminOnly />
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ConteudoApp() {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[oklch(0.38_0.09_162)]" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return <Login />;
  }

  return (
    <DataProvider>
      <Layout>
        <Router />
      </Layout>
    </DataProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <Toaster richColors position="top-right" />
            <ConteudoApp />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
