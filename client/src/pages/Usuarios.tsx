import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  UserCog,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  Clock,
  Mail,
  ChevronDown,
  UserPlus,
  X,
  Lock,
  User,
  AlertTriangle,
  LogOut,
  Check,
} from "lucide-react";

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; color: string }> = {
  admin: { label: "Administrador", bg: "bg-indigo-50", text: "text-indigo-600", color: "#6366f1" },
  capturista: { label: "Capturista", bg: "bg-sky-50", text: "text-sky-600", color: "#0ea5e9" },
  consultor: { label: "Consultor", bg: "bg-amber-50", text: "text-amber-600", color: "#f59e0b" },
  user: { label: "Usuario", bg: "bg-slate-100", text: "text-slate-500", color: "#94a3b8" },
};

const ROLES = ["admin", "capturista", "consultor", "user"] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

function formatFecha(date: string | Date | null) {
  if (!date) return "Nunca";
  const d = new Date(date);
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [roleDropdown, setRoleDropdown] = useState<number | null>(null);
  const [showCrear, setShowCrear] = useState(false);
  const utils = trpc.useUtils();

  const { data: usuarios, isLoading } = trpc.usuarios.listar.useQuery(
    { search: search || undefined },
    { retry: false }
  );

  const crearMut = trpc.usuarios.crear.useMutation({
    onSuccess: () => {
      utils.usuarios.listar.invalidate();
      setShowCrear(false);
    },
  });

  const cambiarRolMut = trpc.usuarios.cambiarRol.useMutation({
    onSuccess: () => {
      utils.usuarios.listar.invalidate();
      setRoleDropdown(null);
    },
  });

  const toggleActivoMut = trpc.usuarios.toggleActivo.useMutation({
    onSuccess: () => {
      utils.usuarios.listar.invalidate();
    },
  });

  const handleCambiarRol = (id: number, role: typeof ROLES[number]) => {
    if (id === currentUser?.id) {
      alert("No puedes cambiar tu propio rol");
      return;
    }
    cambiarRolMut.mutate({ id, role });
  };

  const handleToggleActivo = (id: number, nombre: string, isActive: boolean) => {
    if (id === currentUser?.id) {
      alert("No puedes desactivar tu propia cuenta");
      return;
    }
    const action = isActive ? "desactivar" : "activar";
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} a "${nombre}"?`)) return;
    toggleActivoMut.mutate({ id });
  };

  const totalActivos = usuarios?.filter((u: any) => u.isActive).length ?? 0;
  const totalInactivos = usuarios?.filter((u: any) => !u.isActive).length ?? 0;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Gestión de Usuarios
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Administrar roles y accesos del sistema
          </p>
        </div>
        <button
          onClick={() => setShowCrear(true)}
          className="flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-primary-500/25 transition-colors hover:bg-primary-600"
        >
          <UserPlus size={16} />
          Crear usuario
        </button>
      </motion.div>

      {/* Summary */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-extrabold text-slate-800">{usuarios?.length ?? 0}</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Total</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
          <p className="text-2xl font-extrabold text-emerald-600">{totalActivos}</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Activos</p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-center">
          <p className="text-2xl font-extrabold text-rose-600">{totalInactivos}</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-400">Inactivos</p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp} className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 outline-none transition-all focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
        />
      </motion.div>

      {/* Solicitudes de baja */}
      <SolicitudesBajaSection />

      {/* Users list */}
      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-primary-500" />
        </div>
      ) : !usuarios?.length ? (
        <motion.div variants={fadeUp} className="flex flex-col items-center py-16 text-center">
          <div className="rounded-2xl bg-slate-50 p-5">
            <UserCog size={28} className="text-slate-300" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-400">
            {search ? "Sin resultados para esa búsqueda" : "Sin usuarios registrados"}
          </p>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="space-y-2">
          {(usuarios as any[]).map((usr, index) => {
            const roleConfig = ROLE_CONFIG[usr.role] ?? ROLE_CONFIG.user;
            const isSelf = usr.id === currentUser?.id;

            return (
              <motion.div
                key={usr.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03, duration: 0.3 }}
                className={`group relative flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
                  usr.isActive ? "border-slate-200/60" : "border-rose-200/60 bg-rose-50/30"
                }`}
              >
                {/* Avatar */}
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${
                  usr.isActive
                    ? "bg-gradient-to-br from-primary-500 to-accent-500"
                    : "bg-slate-300"
                }`}>
                  {usr.nombre?.charAt(0)?.toUpperCase() ?? "U"}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {usr.nombre}
                      {isSelf && (
                        <span className="ml-2 text-[10px] font-medium text-primary-400">(tú)</span>
                      )}
                    </p>
                    {!usr.isActive && (
                      <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-500">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Mail size={11} />
                      {usr.email}
                    </span>
                    <span className="hidden items-center gap-1 sm:flex">
                      <Clock size={11} />
                      {formatFecha(usr.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Role selector */}
                <div className="relative">
                  <button
                    onClick={() => setRoleDropdown(roleDropdown === usr.id ? null : usr.id)}
                    disabled={isSelf}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${roleConfig.bg} ${roleConfig.text} ${
                      isSelf ? "opacity-60 cursor-not-allowed" : "hover:shadow-sm cursor-pointer"
                    }`}
                  >
                    <ShieldCheck size={12} />
                    {roleConfig.label}
                    {!isSelf && <ChevronDown size={10} />}
                  </button>

                  {roleDropdown === usr.id && !isSelf && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setRoleDropdown(null)}
                      />
                      <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                        {ROLES.map((r) => {
                          const rc = ROLE_CONFIG[r];
                          return (
                            <button
                              key={r}
                              onClick={() => handleCambiarRol(usr.id, r)}
                              disabled={cambiarRolMut.isPending}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-slate-50 ${
                                usr.role === r ? "bg-slate-50 font-bold" : ""
                              }`}
                            >
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: rc.color }}
                              />
                              {rc.label}
                              {usr.role === r && <span className="ml-auto text-primary-500">●</span>}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Toggle active */}
                <button
                  onClick={() => handleToggleActivo(usr.id, usr.nombre, usr.isActive)}
                  disabled={isSelf || toggleActivoMut.isPending}
                  title={usr.isActive ? "Desactivar usuario" : "Activar usuario"}
                  className={`shrink-0 rounded-lg p-2 transition-all ${
                    isSelf
                      ? "opacity-30 cursor-not-allowed text-slate-300"
                      : usr.isActive
                        ? "text-emerald-500 hover:bg-emerald-50"
                        : "text-rose-400 hover:bg-rose-50"
                  }`}
                >
                  {usr.isActive ? <UserCheck size={16} /> : <UserX size={16} />}
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Modal crear usuario */}
      {showCrear && (
        <CrearUsuarioModal
          onClose={() => setShowCrear(false)}
          onSubmit={async (data) => {
            await crearMut.mutateAsync(data);
          }}
          loading={crearMut.isPending}
          error={crearMut.error?.message ?? null}
        />
      )}
    </motion.div>
  );
}

function SolicitudesBajaSection() {
  const { data: bajas, isLoading } = trpc.perfil.listarBajas.useQuery();
  const utils = trpc.useUtils();

  const aprobarMut = trpc.perfil.aprobarBaja.useMutation({
    onSuccess: () => {
      utils.perfil.listarBajas.invalidate();
      utils.usuarios.listar.invalidate();
    },
  });

  if (isLoading || !bajas?.length) return null;

  return (
    <motion.div variants={fadeUp} className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={16} className="text-amber-600" />
        <h2 className="text-sm font-bold text-amber-800">
          Solicitudes de Baja ({bajas.length})
        </h2>
      </div>
      <div className="space-y-2">
        {(bajas as any[]).map((item) => {
          const perfil = item.perfiles_servidor;
          const user = item.users;
          return (
            <div
              key={perfil.id}
              className="flex items-center justify-between rounded-xl border border-amber-200/60 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{user.nombre}</p>
                <p className="text-xs text-slate-400">{user.email} — {perfil.cargo}</p>
                <p className="mt-1 text-xs text-amber-700">
                  <LogOut size={10} className="mr-1 inline" />
                  {perfil.motivoBaja}
                </p>
                {perfil.fechaSolicitudBaja && (
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Solicitado: {formatFecha(perfil.fechaSolicitudBaja)}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  if (!confirm(`¿Aprobar baja de "${user.nombre}"? Se desactivará su cuenta y registro de servidor.`)) return;
                  aprobarMut.mutate({ userId: perfil.userId });
                }}
                disabled={aprobarMut.isPending}
                className="ml-3 flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50 transition-colors"
              >
                <Check size={12} />
                Aprobar baja
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function CrearUsuarioModal({
  onClose,
  onSubmit,
  loading,
  error,
}: {
  onClose: () => void;
  onSubmit: (data: { nombre: string; email: string; password: string; role: "admin" | "capturista" | "consultor" | "user" }) => Promise<void>;
  loading: boolean;
  error: string | null;
}) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "capturista" | "consultor" | "user">("user");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ nombre, email, password, role });
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 outline-none transition-all focus:border-primary-300 focus:ring-2 focus:ring-primary-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 w-full max-w-md rounded-2xl border border-slate-200/60 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-primary-500" />
            <span className="text-sm font-bold text-slate-800">Crear usuario</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-600">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Nombre completo
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan Pérez"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Contraseña
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Rol
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => {
                const rc = ROLE_CONFIG[r];
                const selected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                      selected
                        ? "border-primary-300 bg-primary-50 text-primary-600 ring-2 ring-primary-100"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: rc.color }}
                    />
                    {rc.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-500 py-2.5 text-sm font-bold text-white shadow-sm shadow-primary-500/25 transition-colors hover:bg-primary-600 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <UserPlus size={14} />
                  Crear
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
