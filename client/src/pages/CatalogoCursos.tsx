import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Search, Clock, Users, X, BookOpen, CheckCircle2 } from "lucide-react";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

const MODALIDAD_COLORS: Record<string, string> = {
  presencial: "bg-emerald-50 text-emerald-700",
  virtual: "bg-blue-50 text-blue-700",
  mixto: "bg-purple-50 text-purple-700",
};

const MODALIDAD_OPTIONS = ["Todos", "Presencial", "Virtual", "Mixto"] as const;

export default function CatalogoCursos() {
  const [, navigate] = useLocation();
  const [categoria, setCategoria] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [selectedCursoId, setSelectedCursoId] = useState<number | null>(null);
  const [solicitudMsg, setSolicitudMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: perfil, isLoading: perfilLoading } = trpc.perfil.obtener.useQuery();

  // Redirect to onboarding if no profile
  if (!perfilLoading && perfil === null) {
    navigate("/onboarding");
    return null;
  }

  const { data: cursos, isLoading: cursosLoading } = trpc.cursos.listar.useQuery({
    categoria: categoria || undefined,
    modalidad: modalidad || undefined,
  });

  const { data: cursoDetalle } = trpc.cursos.obtener.useQuery(
    { id: selectedCursoId! },
    { enabled: selectedCursoId !== null }
  );

  const solicitarMut = trpc.solicitudes.crear.useMutation({
    onSuccess: () => {
      setSolicitudMsg({ type: "success", text: "Solicitud enviada exitosamente" });
      setTimeout(() => setSolicitudMsg(null), 3000);
    },
    onError: (err) => {
      const msg = err.message.includes("activa")
        ? "Ya tienes una solicitud activa para este curso"
        : err.message;
      setSolicitudMsg({ type: "error", text: msg });
      setTimeout(() => setSolicitudMsg(null), 4000);
    },
  });

  const handleSolicitar = (cursoId: number) => {
    setSolicitudMsg(null);
    solicitarMut.mutate({ cursoId });
  };

  if (perfilLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold text-gray-900">Catalogo de Cursos</h1>
        <p className="mt-1 text-gray-500">Encuentra cursos de capacitacion disponibles para tu nivel</p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por categoria..."
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div className="flex gap-2">
          {MODALIDAD_OPTIONS.map((opt) => {
            const val = opt === "Todos" ? "" : opt.toLowerCase();
            const isActive = modalidad === val;
            return (
              <button
                key={opt}
                onClick={() => setModalidad(val)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Solicitud message */}
      <AnimatePresence>
        {solicitudMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-xl p-4 text-sm font-medium ${
              solicitudMsg.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {solicitudMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Course Grid */}
      {cursosLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : !cursos?.length ? (
        <motion.div variants={fadeUp} className="rounded-2xl bg-white p-12 text-center shadow-sm border border-gray-100">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-gray-500">No se encontraron cursos con los filtros seleccionados</p>
        </motion.div>
      ) : (
        <motion.div variants={stagger} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cursos.map((curso: any) => (
            <motion.div
              key={curso.id}
              variants={fadeUp}
              onClick={() => setSelectedCursoId(curso.id)}
              className="cursor-pointer rounded-2xl bg-white p-5 shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-gray-900 line-clamp-1">{curso.nombre}</h3>
              {curso.descripcion && (
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{curso.descripcion}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {curso.duracionHoras && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    <Clock className="h-3 w-3" />
                    {curso.duracionHoras} horas
                  </span>
                )}
                {curso.modalidad && (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${MODALIDAD_COLORS[curso.modalidad] ?? "bg-gray-100 text-gray-600"}`}>
                    {curso.modalidad.charAt(0).toUpperCase() + curso.modalidad.slice(1)}
                  </span>
                )}
                {curso.nivelRequerido != null && (
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                    Nivel {curso.nivelRequerido}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedCursoId !== null && cursoDetalle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setSelectedCursoId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-bold text-gray-900">{cursoDetalle.nombre}</h2>
                <button
                  onClick={() => setSelectedCursoId(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {cursoDetalle.descripcion && (
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{cursoDetalle.descripcion}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {cursoDetalle.duracionHoras && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    <Clock className="h-3 w-3" />
                    {cursoDetalle.duracionHoras} horas
                  </span>
                )}
                {cursoDetalle.modalidad && (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${MODALIDAD_COLORS[cursoDetalle.modalidad] ?? "bg-gray-100 text-gray-600"}`}>
                    {cursoDetalle.modalidad.charAt(0).toUpperCase() + cursoDetalle.modalidad.slice(1)}
                  </span>
                )}
                {cursoDetalle.nivelRequerido != null && (
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                    Nivel {cursoDetalle.nivelRequerido}
                  </span>
                )}
              </div>

              {/* Instituciones */}
              {cursoDetalle.instituciones && cursoDetalle.instituciones.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Instituciones disponibles</h3>
                  <div className="space-y-3">
                    {cursoDetalle.instituciones.map((inst: any, idx: number) => (
                      <div key={idx} className="rounded-xl bg-gray-50 p-4 text-sm">
                        <p className="font-medium text-gray-900">{inst.nombre ?? `Institucion ${idx + 1}`}</p>
                        {inst.horario && (
                          <p className="mt-1 text-gray-500">Horario: {inst.horario}</p>
                        )}
                        {inst.cupoDisponible != null && (
                          <p className="mt-1 text-gray-500">
                            <Users className="inline h-3.5 w-3.5 mr-1" />
                            {inst.cupoDisponible} cupos disponibles
                          </p>
                        )}
                        {inst.fechaInicio && (
                          <p className="mt-1 text-gray-500">
                            Inicio: {new Date(inst.fechaInicio).toLocaleDateString("es-MX")}
                            {inst.fechaFin && ` - Fin: ${new Date(inst.fechaFin).toLocaleDateString("es-MX")}`}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Solicitar button */}
              <div className="mt-6">
                <button
                  onClick={() => handleSolicitar(cursoDetalle.id)}
                  disabled={solicitarMut.isPending}
                  className="w-full rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {solicitarMut.isPending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Solicitar Inscripcion
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
