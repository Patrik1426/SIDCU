import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, ChevronRight, RefreshCw, Briefcase, Users, AlertCircle } from "lucide-react";
import ImportarCSVModal from "@/components/ImportarCSVModal";
import BuscadorEvaluador from "@/components/BuscadorEvaluador";

type RolPool = "jefe" | "companero";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } };

type Rol = "jefe" | "companero1" | "companero2";

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

export default function GestionPromocion() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [modalImport, setModalImport] = useState<RolPool | null>(null);
  // M4: trabajadorUserId es a quien hay que EXCLUIR del pool al buscar
  // reemplazo (la propia persona de esta inscripcion), no al admin que esta
  // haciendo la reasignacion -- antes BuscadorEvaluador excluia
  // implicitamente a ctx.user.id (el admin) porque buscarEnPool no recibia
  // ningun override.
  const [reasignando, setReasignando] = useState<{ promocionId: number; rol: Rol; trabajadorUserId: number; nuevoServidorId: number; nuevoNombre: string; correo?: string } | null>(null);

  const { data, isLoading } = trpc.promocion.listarInscripciones.useQuery({ search: search || undefined, page, limit: 20 });
  const { data: correosFallidos } = trpc.promocion.listarCorreosFallidos.useQuery();

  const importarEvaluadoresMut = trpc.promocion.importarEvaluadores.useMutation();
  const reintentarMut = trpc.promocion.reintentarCorreo.useMutation({
    onSuccess: () => {
      utils.promocion.listarCorreosFallidos.invalidate();
      toast.success("Correo regresado a la cola de envío");
    },
    onError: (err) => toast.error(err.message),
  });
  const reasignarMut = trpc.promocion.reasignarEvaluador.useMutation({
    onSuccess: () => {
      utils.promocion.listarInscripciones.invalidate();
      setReasignando(null);
      toast.success("Evaluador reasignado");
    },
    onError: (err) => {
      setReasignando(null);
      toast.error(err.message);
    },
  });

  useEffect(() => {
    if (!reasignando) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReasignando(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reasignando]);

  const inputClass = "rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20";

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inscripciones a Promoción</h1>
          <p className="mt-0.5 text-sm text-gray-500">Catálogos y evaluadores asignados.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalImport("jefe")} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Importar Jefes
          </button>
          <button onClick={() => setModalImport("companero")} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Importar Compañeros
          </button>
        </div>
      </motion.div>

      {correosFallidos && correosFallidos.length > 0 && (
        <motion.div variants={fadeUp} className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-700">{correosFallidos.length} correo(s) sin poder enviarse</p>
          {correosFallidos.map((c) => (
            <div key={c.id} className="mt-2 flex items-center justify-between text-sm">
              <span className="text-rose-600">{c.destinatarioNombre} ({c.rol}) — {c.ultimoError}</span>
              <button
                onClick={() => reintentarMut.mutate({ id: c.id })}
                disabled={reintentarMut.isPending}
                className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Reintentar
              </button>
            </div>
          ))}
        </motion.div>
      )}

      {/* Panorama antes del detalle -- para no tener que escanear miles de
          filas para saber si algo necesita atencion */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card-rest">
          <p className="text-[22px] font-extrabold leading-none text-gray-900 tabular-nums">{data?.total ?? "—"}</p>
          <p className="mt-1 text-xs text-gray-500">Inscripciones totales</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card-rest">
          <p className="text-[22px] font-extrabold leading-none text-gray-900 tabular-nums">
            {data ? data.total - data.conReferenciaRota : "—"}
          </p>
          <p className="mt-1 text-xs text-gray-500">Con los 3 evaluadores completos</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card-rest">
          <p className={`text-[22px] font-extrabold leading-none tabular-nums ${data && data.conReferenciaRota > 0 ? "text-amber-700" : "text-gray-900"}`}>
            {data?.conReferenciaRota ?? "—"}
          </p>
          <p className="mt-1 text-xs text-gray-500">Con una referencia por revisar</p>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar trabajador por nombre o CURP..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={`${inputClass} pl-9 w-full`}
          />
        </div>
        <span className="text-xs text-gray-400">Clic en una fila para ver a los 3 evaluadores</span>
      </motion.div>

      <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card-rest">
        {isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-gray-400">Cargando...</div>
        ) : data?.items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-400">Sin inscripciones</div>
        ) : (
          data?.items.map((item) => {
            const evaluadores: { rol: Rol; label: string; nombre: string | null; icon: typeof Briefcase }[] = [
              { rol: "jefe", label: "Jefe inmediato", nombre: item.jefeNombre, icon: Briefcase },
              { rol: "companero1", label: "Compañero 1", nombre: item.companero1Nombre, icon: Users },
              { rol: "companero2", label: "Compañero 2", nombre: item.companero2Nombre, icon: Users },
            ];
            const completos = evaluadores.filter((e) => e.nombre).length;
            const abierto = expandido === item.id;

            return (
              <div key={item.id} className="border-t border-gray-100 first:border-t-0">
                <button
                  type="button"
                  onClick={() => setExpandido(abierto ? null : item.id)}
                  aria-expanded={abierto}
                  className="grid w-full grid-cols-[34px_1.7fr_1fr_88px_18px] items-center gap-3.5 px-4.5 py-2.5 text-left hover:bg-gray-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-primary-500 to-accent-500 text-[11px] font-bold text-white">
                    {iniciales(item.trabajadorNombre)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-gray-800">{item.trabajadorNombre}</span>
                    <span className="block text-[11.5px] text-gray-400 tabular-nums">{item.trabajadorCurp}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="flex shrink-0 gap-0.5">
                      {evaluadores.map((e) => (
                        <span key={e.rol} className={`h-1.5 w-1.5 rounded-full ${e.nombre ? "bg-emerald-600" : "bg-gray-200"}`} />
                      ))}
                    </span>
                    <span className={`truncate text-xs ${completos < 3 ? "font-semibold text-amber-700" : "text-gray-500"}`}>
                      {completos < 3 ? `${3 - completos} referencia${3 - completos > 1 ? "s" : ""} por revisar` : "3 evaluadores asignados"}
                    </span>
                  </span>
                  <span className="text-right text-xs text-gray-400 tabular-nums">{new Date(item.enviadoAt).toLocaleDateString("es-MX")}</span>
                  <ChevronRight size={16} className={`justify-self-end text-gray-300 transition-transform ${abierto ? "rotate-90" : ""}`} />
                </button>

                <AnimatePresence initial={false}>
                  {abierto && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden bg-gray-50/60"
                    >
                      <div className="grid grid-cols-1 gap-2.5 px-4.5 pb-4.5 pt-1 sm:grid-cols-3">
                        {evaluadores.map((e) => {
                          const roto = !e.nombre;
                          const Icon = e.icon;
                          return (
                            <div
                              key={e.rol}
                              className={`flex items-start gap-2.5 rounded-xl border p-3 ${roto ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-white"}`}
                            >
                              <span className={`flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg ${roto ? "bg-amber-100 text-amber-700" : "bg-primary-50 text-primary-600"}`}>
                                {roto ? <AlertCircle size={14} /> : <Icon size={14} />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[10.5px] font-bold uppercase tracking-wide text-gray-400">{e.label}</span>
                                <span className={`mt-0.5 block truncate text-[12.5px] font-semibold ${roto ? "text-amber-700" : "text-gray-800"}`}>
                                  {e.nombre ?? "— cuenta no encontrada"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setReasignando({ promocionId: item.id, rol: e.rol, trabajadorUserId: item.trabajadorUserId, nuevoServidorId: 0, nuevoNombre: "" })}
                                  className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary-500 hover:text-primary-600 hover:underline"
                                >
                                  <RefreshCw size={11} />
                                  Reasignar
                                </button>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-gray-600">
            <span>Mostrando página {data.page} de {data.totalPages} ({data.total} resultados)</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight size={16} className="rotate-180" />
              </button>
              <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {modalImport && (
        <ImportarCSVModal
          titulo={modalImport === "jefe" ? "Jefes" : "Compañeros"}
          columnas={[
            { key: "curp", label: "CURP", ejemplo: "AAAA000101HDFXXX01" },
            { key: "nombre", label: "Nombre", ejemplo: "Juan Pérez López" },
            { key: "correo", label: "Correo (opcional)", ejemplo: "juan.perez@example.com" },
          ]}
          onImportar={async (registros) => {
            const resultado = await importarEvaluadoresMut.mutateAsync({ rol: modalImport, registros });
            // M7: antes el toast siempre decia "revisa el nombre capturado"
            // sin importar la causa real -- importarFilaEvaluador tambien
            // genera advertencia cuando el correo del CSV es invalido (formato
            // o dominio sin MX), que no tiene nada que ver con el nombre.
            // Mostrar el texto real de cada advertencia en vez de adivinar.
            if (resultado.advertencias.length > 0) {
              const MAX_MOSTRADAS = 3;
              const detalle = resultado.advertencias
                .slice(0, MAX_MOSTRADAS)
                .map((a) => a.advertencia)
                .join(" — ");
              const resto = resultado.advertencias.length - MAX_MOSTRADAS;
              toast.warning(`${detalle}${resto > 0 ? ` (y ${resto} más)` : ""}`);
            }
            return resultado;
          }}
          onClose={() => setModalImport(null)}
          onSuccess={() => utils.promocion.listarInscripciones.invalidate()}
        />
      )}

      {reasignando && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setReasignando(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Reasignar {reasignando.rol}</h3>
            <BuscadorEvaluador
              rol={reasignando.rol === "jefe" ? "jefe" : "companero"}
              excluirUserId={reasignando.trabajadorUserId}
              onElegir={(servidorId, nombre, correoPrellenado) => setReasignando({ ...reasignando, nuevoServidorId: servidorId, nuevoNombre: nombre, correo: correoPrellenado ?? reasignando.correo })}
            />
            {reasignando.nuevoServidorId > 0 && (
              <>
                <p className="mt-2 text-xs text-slate-500">Elegido: {reasignando.nuevoNombre}</p>
                <input
                  type="email"
                  value={reasignando.correo ?? ""}
                  onChange={(e) => setReasignando({ ...reasignando, correo: e.target.value })}
                  placeholder="Correo de contacto"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </>
            )}
            <div className="mt-4 flex gap-3">
              <button onClick={() => setReasignando(null)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={() => reasignarMut.mutate({
                  promocionId: reasignando.promocionId,
                  rol: reasignando.rol,
                  nuevoServidorId: reasignando.nuevoServidorId,
                  correo: reasignando.correo ?? "",
                })}
                disabled={reasignando.nuevoServidorId === 0 || !reasignando.correo || reasignarMut.isPending}
                className="flex-1 rounded-xl bg-primary-600 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
