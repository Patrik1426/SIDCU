import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  ClipboardCheck,
  X,
  CheckCircle2,
  XCircle,
  Award,
  Clock,
  User,
  BookOpen,
  Building2,
} from "lucide-react";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

type Estado = "" | "pendiente" | "aprobada" | "rechazada" | "completada";

const ESTADOS: { value: Estado; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "aprobada", label: "Aprobadas" },
  { value: "rechazada", label: "Rechazadas" },
  { value: "completada", label: "Completadas" },
];

const estadoBadge: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  aprobada: "bg-emerald-50 text-emerald-700",
  rechazada: "bg-rose-50 text-rose-700",
  completada: "bg-indigo-50 text-indigo-700",
};

type ModalState =
  | { type: "closed" }
  | { type: "aprobar"; solicitudId: number; cursoId: number; userName: string; cursoNombre: string }
  | { type: "rechazar"; solicitudId: number; userName: string; cursoNombre: string }
  | { type: "completar"; solicitudId: number; userName: string; cursoNombre: string };

function formatFecha(date: string | Date) {
  const d = new Date(date);
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function GestionSolicitudes() {
  const utils = trpc.useUtils();
  const [estadoFilter, setEstadoFilter] = useState<Estado>("");
  const [modal, setModal] = useState<ModalState>({ type: "closed" });
  const [notasAdmin, setNotasAdmin] = useState("");
  const [cursoInstitucionId, setCursoInstitucionId] = useState<number>(0);

  const { data: solicitudes, isLoading } = trpc.solicitudes.listar.useQuery({
    estado: estadoFilter || undefined,
  });

  // Fetch course details for approval modal to get available institutions
  const cursoIdForModal = modal.type === "aprobar" ? modal.cursoId : 0;
  const { data: cursoDetalle } = trpc.cursos.obtener.useQuery(
    { id: cursoIdForModal },
    { enabled: cursoIdForModal > 0 }
  );

  const aprobarMut = trpc.solicitudes.aprobar.useMutation({
    onSuccess: () => {
      utils.solicitudes.listar.invalidate();
      setModal({ type: "closed" });
      setNotasAdmin("");
      setCursoInstitucionId(0);
    },
  });

  const rechazarMut = trpc.solicitudes.rechazar.useMutation({
    onSuccess: () => {
      utils.solicitudes.listar.invalidate();
      setModal({ type: "closed" });
      setNotasAdmin("");
    },
  });

  const completarMut = trpc.solicitudes.completar.useMutation({
    onSuccess: () => {
      utils.solicitudes.listar.invalidate();
      setModal({ type: "closed" });
    },
  });

  const handleAprobar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal.type !== "aprobar" || !cursoInstitucionId) return;
    await aprobarMut.mutateAsync({
      id: modal.solicitudId,
      cursoInstitucionId,
      notasAdmin: notasAdmin || undefined,
    } as any);
  };

  const handleRechazar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal.type !== "rechazar" || !notasAdmin.trim()) return;
    await rechazarMut.mutateAsync({
      id: modal.solicitudId,
      notasAdmin,
    });
  };

  const handleCompletar = async () => {
    if (modal.type !== "completar") return;
    await completarMut.mutateAsync({ id: modal.solicitudId });
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 outline-none transition-all focus:border-primary-300 focus:ring-2 focus:ring-primary-100";

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Solicitudes de Capacitacion
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Revisa y gestiona las solicitudes de los servidores
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-xl bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-600 sm:flex">
          <ClipboardCheck size={14} />
          {solicitudes?.length ?? 0} solicitudes
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        {ESTADOS.map((est) => {
          const active = estadoFilter === est.value;
          return (
            <button
              key={est.value}
              onClick={() => setEstadoFilter(est.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                active
                  ? "bg-primary-500 text-white shadow-sm shadow-primary-500/25"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {est.label}
            </button>
          );
        })}
      </motion.div>

      {/* Solicitudes list */}
      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-primary-500" />
        </div>
      ) : !solicitudes?.length ? (
        <motion.div variants={fadeUp} className="flex flex-col items-center py-16 text-center">
          <div className="rounded-2xl bg-slate-50 p-5">
            <ClipboardCheck size={28} className="text-slate-300" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-400">No hay solicitudes</p>
        </motion.div>
      ) : (
        <motion.div variants={stagger} className="space-y-3">
          {solicitudes.map((item: any, index: number) => {
            const solicitud = item.solicitudes_curso ?? item;
            const curso = item.cursos ?? {};
            const usuario = item.users ?? {};
            const estado = solicitud.estado ?? "pendiente";

            return (
              <motion.div
                key={solicitud.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="group rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-200"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${estadoBadge[estado] ?? "bg-slate-50 text-slate-500"}`}>
                        {estado}
                      </span>
                      {solicitud.createdAt && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock size={11} />
                          {formatFecha(solicitud.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-col gap-1">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <User size={14} className="text-slate-400" />
                        {usuario.nombre ?? usuario.email ?? `Usuario #${solicitud.usuarioId}`}
                      </p>
                      <p className="flex items-center gap-2 text-sm text-slate-500">
                        <BookOpen size={14} className="text-slate-400" />
                        {curso.nombre ?? `Curso #${solicitud.cursoId}`}
                      </p>
                    </div>

                    {solicitud.notasAdmin && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
                        Notas: {solicitud.notasAdmin}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 gap-2">
                    {estado === "pendiente" && (
                      <>
                        <button
                          onClick={() =>
                            setModal({
                              type: "aprobar",
                              solicitudId: solicitud.id,
                              cursoId: solicitud.cursoId,
                              userName: usuario.nombre ?? usuario.email ?? `#${solicitud.usuarioId}`,
                              cursoNombre: curso.nombre ?? `Curso #${solicitud.cursoId}`,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                        >
                          <CheckCircle2 size={14} />
                          Aprobar
                        </button>
                        <button
                          onClick={() =>
                            setModal({
                              type: "rechazar",
                              solicitudId: solicitud.id,
                              userName: usuario.nombre ?? usuario.email ?? `#${solicitud.usuarioId}`,
                              cursoNombre: curso.nombre ?? `Curso #${solicitud.cursoId}`,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                        >
                          <XCircle size={14} />
                          Rechazar
                        </button>
                      </>
                    )}
                    {estado === "aprobada" && (
                      <button
                        onClick={() =>
                          setModal({
                            type: "completar",
                            solicitudId: solicitud.id,
                            userName: usuario.nombre ?? usuario.email ?? `#${solicitud.usuarioId}`,
                            cursoNombre: curso.nombre ?? `Curso #${solicitud.cursoId}`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                      >
                        <Award size={14} />
                        Marcar Completado
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Aprobar Modal */}
      {modal.type === "aprobar" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl border border-slate-200/60 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Aprobar Solicitud</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {modal.userName} - {modal.cursoNombre}
                </p>
              </div>
              <button
                onClick={() => { setModal({ type: "closed" }); setNotasAdmin(""); setCursoInstitucionId(0); }}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAprobar} className="space-y-4 p-5">
              {aprobarMut.error && (
                <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
                  {aprobarMut.error.message}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Institucion y Horario *
                </label>
                {cursoDetalle?.instituciones && cursoDetalle.instituciones.length > 0 ? (
                  <select
                    required
                    value={cursoInstitucionId}
                    onChange={(e) => setCursoInstitucionId(Number(e.target.value))}
                    className={inputClass}
                  >
                    <option value={0}>Seleccionar sede...</option>
                    {cursoDetalle.instituciones.map((ci: any) => (
                      <option key={ci.id} value={ci.id}>
                        {ci.institucion?.nombre ?? `Institucion #${ci.institucionId}`}
                        {ci.horario ? ` - ${ci.horario}` : ""}
                        {ci.cupoMaximo ? ` (Cupo: ${ci.cupoMaximo})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-600">
                    Este curso no tiene instituciones asignadas. Asigna una desde Gestion de Cursos antes de aprobar.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Notas (opcional)</label>
                <textarea
                  value={notasAdmin}
                  onChange={(e) => setNotasAdmin(e.target.value)}
                  className={`${inputClass} min-h-[70px] resize-y`}
                  placeholder="Notas para el solicitante..."
                />
              </div>

              <div className="flex gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => { setModal({ type: "closed" }); setNotasAdmin(""); setCursoInstitucionId(0); }}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={aprobarMut.isPending || !cursoInstitucionId}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  {aprobarMut.isPending ? "Aprobando..." : "Aprobar"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Rechazar Modal */}
      {modal.type === "rechazar" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl border border-slate-200/60 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Rechazar Solicitud</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {modal.userName} - {modal.cursoNombre}
                </p>
              </div>
              <button
                onClick={() => { setModal({ type: "closed" }); setNotasAdmin(""); }}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRechazar} className="space-y-4 p-5">
              {rechazarMut.error && (
                <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
                  {rechazarMut.error.message}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Motivo del rechazo *</label>
                <textarea
                  required
                  value={notasAdmin}
                  onChange={(e) => setNotasAdmin(e.target.value)}
                  className={`${inputClass} min-h-[100px] resize-y`}
                  placeholder="Explica el motivo del rechazo..."
                />
              </div>

              <div className="flex gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => { setModal({ type: "closed" }); setNotasAdmin(""); }}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={rechazarMut.isPending || !notasAdmin.trim()}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-600/20 transition-colors hover:bg-rose-700 disabled:opacity-50"
                >
                  {rechazarMut.isPending ? "Rechazando..." : "Rechazar"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Completar confirmation modal */}
      {modal.type === "completar" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl border border-slate-200/60 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-800">Confirmar Completado</h2>
              <button
                onClick={() => setModal({ type: "closed" })}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {completarMut.error && (
                <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
                  {completarMut.error.message}
                </div>
              )}

              <div className="rounded-xl bg-indigo-50 p-4 text-center">
                <Award size={24} className="mx-auto text-indigo-500" />
                <p className="mt-2 text-sm font-semibold text-indigo-800">
                  {modal.userName}
                </p>
                <p className="text-xs text-indigo-600 mt-0.5">{modal.cursoNombre}</p>
              </div>

              <p className="text-sm text-slate-600 text-center">
                Esto subira el nivel del usuario. Esta accion no se puede deshacer.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModal({ type: "closed" })}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCompletar}
                  disabled={completarMut.isPending}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {completarMut.isPending ? "Completando..." : "Completar"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
