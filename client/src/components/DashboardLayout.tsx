import { type ReactNode, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Upload,
  FileText,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "capturista", "consultor", "user"] },
  { label: "Servidores", href: "/servidores", icon: Users, roles: ["admin", "capturista"] },
  { label: "Archivos", href: "/archivos", icon: Upload, roles: ["admin", "capturista"] },
  { label: "Usuarios", href: "/usuarios", icon: UserCog, roles: ["admin"] },
  { label: "Auditoría", href: "/auditoria", icon: ClipboardList, roles: ["admin"] },
  { label: "Reportes", href: "/reportes", icon: FileText, roles: ["admin", "consultor"] },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  capturista: "Capturista",
  consultor: "Consultor",
  user: "Usuario",
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = user?.role ?? "user";
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    await logout({});
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-slate-200/80 bg-white transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-xs font-extrabold text-white shadow-md shadow-primary-500/20">
            CC
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold text-slate-900">
              Casa de la Cultura
            </span>
            <span className="block text-[10px] font-medium text-slate-400">
              Panel de gestión
            </span>
          </div>
        </div>

        <div className="mx-5 h-px bg-slate-100" />

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleItems.map((item) => {
            const active = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
                  active
                    ? "bg-primary-50 text-primary-600 shadow-sm shadow-primary-500/5"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon
                  size={18}
                  className={active ? "text-primary-500" : "text-slate-400 group-hover:text-slate-600"}
                />
                {item.label}
                {active && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-xs font-bold text-white">
              {user?.nombre?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {user?.nombre}
              </p>
              <p className="text-[10px] font-medium text-slate-400">
                {ROLE_LABELS[role] ?? role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b border-slate-200/80 bg-white px-5 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
            <Menu size={22} />
          </button>
          <span className="text-sm font-bold text-slate-800">Casa de la Cultura</span>
        </header>
        <main className="flex-1 overflow-y-auto p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
