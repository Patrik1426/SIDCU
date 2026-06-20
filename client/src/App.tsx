import { Route, Switch, Redirect, useLocation } from "wouter";
import { useAuthState } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import Home from "@/pages/Home";
import RecuperarContrasena from "@/pages/RecuperarContrasena";
import RestablecerContrasena from "@/pages/RestablecerContrasena";
import NotFound from "@/pages/NotFound";
import Servidores from "@/pages/Servidores";
import Dashboard from "@/pages/Dashboard";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-500">Esta sección está en construcción.</p>
    </div>
  );
}

function ProtectedRoute({
  component: Component,
  path: routePath,
  isAuthenticated,
  isLoading,
}: {
  component: React.ComponentType<any>;
  path: string;
  isAuthenticated: boolean;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Route path={routePath}>
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      </Route>
    );
  }

  if (!isAuthenticated) {
    return (
      <Route path={routePath}>
        <Redirect to="/" />
      </Route>
    );
  }

  return (
    <Route path={routePath}>
      <DashboardLayout>
        <Component />
      </DashboardLayout>
    </Route>
  );
}

function AuthRoute({ isAuthenticated, isLoading }: { isAuthenticated: boolean; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return <Home />;
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuthState();

  return (
    <ThemeProvider>
      <Switch>
        <Route path="/">
          <AuthRoute isAuthenticated={isAuthenticated} isLoading={isLoading} />
        </Route>
        <ProtectedRoute
          path="/dashboard"
          component={Dashboard}
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
        />
        <ProtectedRoute
          path="/servidores"
          component={Servidores}
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
        />
        <ProtectedRoute
          path="/archivos"
          component={() => <PlaceholderPage title="Carga de Archivos" />}
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
        />
        <ProtectedRoute
          path="/usuarios"
          component={() => <PlaceholderPage title="Gestión de Usuarios" />}
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
        />
        <ProtectedRoute
          path="/auditoria"
          component={() => <PlaceholderPage title="Auditoría" />}
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
        />
        <ProtectedRoute
          path="/reportes"
          component={() => <PlaceholderPage title="Reportes" />}
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
        />
        <Route path="/recuperar-contrasena" component={RecuperarContrasena} />
        <Route path="/restablecer-contrasena/:token" component={RestablecerContrasena} />
        <Route component={NotFound} />
      </Switch>
    </ThemeProvider>
  );
}
