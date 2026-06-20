import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { BookOpen, ClipboardList, ArrowRight, Clock, CheckCircle2, Award } from "lucide-react";

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

  const { data: perfil, isLoading: perfilLoading } = trpc.perfil.obtener.useQuery();
  const { data: solicitudes } = trpc.solicitudes.misSolicitudes.useQuery();

  // Redirect to onboarding if no profile
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

  // Compute stats from solicitudes
  const pendientes = solicitudes?.filter((s) => s.solicitudes_curso.estatus === "pendiente").length ?? 0;
  const aprobadas = solicitudes?.filter((s) => s.solicitudes_curso.estatus === "aprobada").length ?? 0;
  const completados = solicitudes?.filter((s) => s.solicitudes_curso.estatus === "completada").length ?? 0;

  // Level progression
  const nivelActual = perfil?.nivelCapacitacion ?? 1;
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
        <h1 className="text-2xl font-bold text-gray-900">Portal de Capacitacion</h1>
        <p className="mt-1 text-gray-500">Bienvenido a tu espacio de formacion profesional</p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.nombre ?? "Usuario"}</h2>
            {perfil?.cargo && <p className="text-gray-600">{perfil.cargo}</p>}
            {perfil?.dependencia && <p className="text-sm text-gray-500">{perfil.dependencia}</p>}
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
            <span className="text-sm font-medium text-gray-700">
              Nivel {nivelActual} de {nivelMax}
            </span>
            <span className="text-sm text-gray-500">{progreso.toFixed(0)}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
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
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendientes}</p>
              <p className="text-sm text-gray-500">Pendientes</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{aprobadas}</p>
              <p className="text-sm text-gray-500">Aprobadas</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <Award className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{completados}</p>
              <p className="text-sm text-gray-500">Completados</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Links */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          onClick={() => navigate("/portal/cursos")}
          className="group flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
              <BookOpen className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Ver Catalogo de Cursos</p>
              <p className="text-sm text-gray-500">Explora los cursos disponibles</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
        </button>

        <button
          onClick={() => navigate("/portal/solicitudes")}
          className="group flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
              <ClipboardList className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Mis Solicitudes</p>
              <p className="text-sm text-gray-500">Revisa el estado de tus inscripciones</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
        </button>
      </motion.div>
    </motion.div>
  );
}
