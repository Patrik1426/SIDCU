import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { BookOpen, ClipboardList, ArrowRight, Clock, CheckCircle2, Award, LogOut, AlertTriangle, X } from "lucide-react";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

const NIVEL_LABELS: Record<string, string> = {
  federal: "Federal",
  estatal: "Estatal",
  municipal: "Municipal",
  otro: "Otro",
};

export default function Portal() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [motivoBaja, setMotivoBaja] = useState("");
  const [bajaMsg, setBajaMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: perfil, isLoading: perfilLoading } = trpc.perfil.obtener.useQuery();
  const { data: solicitudes } = trpc.solicitudes.misSolicitudes.useQuery();
  const utils = trpc.useUtils();

  const solicitarBajaMut = trpc.perfil.solicitarBaja.useMutation({
    onSuccess: () => {
      setBajaMsg({ type: "success", text: "Solicitud de baja enviada. El administrador la revisará." });
      setShowBajaModal(false);
      setMotivoBaja("");
      utils.perfil.obtener.invalidate();
    },
    onError: (err) => {
      setBajaMsg({ type: "error", text: err.message });
    },
  });

  const cancelarBajaMut = trpc.perfil.cancelarBaja.useMutation({
    onSuccess: () => {
      setBajaMsg(null);
      utils.perfil.obtener.invalidate();
    },
  });

  if (!perfilLoading && perfil === null) {
    navigate("/onboarding");
    return null;
  }

  if (perfilLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  const pendientes = solicitudes?.filter((s: any) => (s.solicitudes_curso ?? s).estado === "pendiente").length ?? 0;
  const aprobadas = solicitudes?.filter((s: any) => (s.solicitudes_curso ?? s).estado === "aprobada").length ?? 0;
  const completados = solicitudes?.filter((s: any) => (s.solicitudes_curso ?? s).estado === "completada").length ?? 0;

  const nivelActual = perfil?.nivelProgresion ?? 1;
  const nivelMax = 4;
  const progreso = (nivelActual / nivelMax) * 100;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Portal de Capacitación</h1>
        <p className="mt-1 text-sm text-slate-400">Bienvenido a tu espacio de formación profesional</p>
      </motion.div>

      {/* Baja pendiente banner */}
      {perfil?.solicitudBaja && (
        <motion.div variants={fadeUp} className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Solicitud de baja pendiente</p>
              <p className="text-xs text-amber-600">Tu solicitud está siendo revisada por el administrador</p>
            </div>
          </div>
          <button
            onClick={() => cancelarBajaMut.mutate()}
            disabled={cancelarBajaMut.isPending}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
          >
            Cancelar solicitud
          </button>
        </motion.div>
      )}

      {/* Success/error message */}
      <AnimatePresence>
        {bajaMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl p-4 text-sm font-medium ${
              bajaMsg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {bajaMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Card */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user?.nombre ?? "Usuario"}</h2>
            {perfil?.cargo && <p className="text-sm text-slate-600">{perfil.cargo}</p>}
            {perfil?.dependencia && <p className="text-sm text-slate-400">{perfil.dependencia}</p>}
          </div>
          {perfil?.nivelGobierno && (
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
              {NIVEL_LABELS[perfil.nivelGobierno] ?? perfil.nivelGobierno}
            </span>
          )}
        </div>

        {/* Level Progression */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">Nivel {nivelActual} de {nivelMax}</span>
            <span className="text-sm text-slate-400">{progreso.toFixed(0)}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600"
              initial={{ width: 0 }}
              animate={{ width: `${progreso}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{pendientes}</p>
              <p className="text-xs font-medium text-slate-400">Pendientes</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{aprobadas}</p>
              <p className="text-xs font-medium text-slate-400">Aprobadas</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <Award className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{completados}</p>
              <p className="text-xs font-medium text-slate-400">Completados</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Links */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => navigate("/portal/cursos")}
          className="group flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm hover:border-primary-200 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
              <BookOpen className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Ver Catálogo de Cursos</p>
              <p className="text-sm text-slate-400">Explora cursos disponibles</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary-600 transition-colors" />
        </button>

        <button
          onClick={() => navigate("/portal/solicitudes")}
          className="group flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm hover:border-primary-200 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
              <ClipboardList className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Mis Solicitudes</p>
              <p className="text-sm text-slate-400">Revisa el estado de tus inscripciones</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary-600 transition-colors" />
        </button>
      </motion.div>

      {/* Solicitar Baja */}
      {!perfil?.solicitudBaja && (
        <motion.div variants={fadeUp}>
          <button
            onClick={() => setShowBajaModal(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Solicitar baja del sistema
          </button>
        </motion.div>
      )}

      {/* Baja Modal */}
      <AnimatePresence>
        {showBajaModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowBajaModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Solicitar Baja</h2>
                </div>
                <button onClick={() => setShowBajaModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-slate-500 mb-4">
                Esta solicitud será revisada por el administrador. Tu cuenta permanecerá activa hasta que sea aprobada.
              </p>

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Motivo de la baja *
                </label>
                <textarea
                  value={motivoBaja}
                  onChange={(e) => setMotivoBaja(e.target.value)}
                  placeholder="Describe el motivo de tu solicitud..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-300 focus:ring-2 focus:ring-primary-100 focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBajaModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => solicitarBajaMut.mutate({ motivo: motivoBaja })}
                  disabled={solicitarBajaMut.isPending || motivoBaja.trim().length < 5}
                  className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-50 transition-colors"
                >
                  {solicitarBajaMut.isPending ? "Enviando..." : "Enviar Solicitud"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
