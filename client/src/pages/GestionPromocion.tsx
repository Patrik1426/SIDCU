import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import ImportarCSVModal from "@/components/ImportarCSVModal";
import BuscadorEvaluador from "@/components/BuscadorEvaluador";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } };

type Rol = "jefe" | "companero1" | "companero2";

export default function GestionPromocion() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalJefes, setModalJefes] = useState(false);
  const [modalCompaneros, setModalCompaneros] = useState(false);
  const [reasignando, setReasignando] = useState<{ promocionId: number; rol: Rol; nuevoUserId: number; nuevoNombre: string } | null>(null);

  const { data, isLoading } = trpc.promocion.listarInscripciones.useQuery({ search: search || undefined, page, limit: 20 });

  const importarJefesMut = trpc.promocion.importarJefes.useMutation();
  const importarCompanerosMut = trpc.promocion.importarCompaneros.useMutation();
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
          <button onClick={() => setModalJefes(true)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Importar Jefes
          </button>
          <button onClick={() => setModalCompaneros(true)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Importar Compañeros
          </button>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar trabajador..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className={`${inputClass} pl-9 w-full`}
        />
      </motion.div>

      <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card-rest">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Trabajador</th>
              <th className="px-4 py-3">Jefe</th>
              <th className="px-4 py-3">Compañero 1</th>
              <th className="px-4 py-3">Compañero 2</th>
              <th className="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
            ) : data?.items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin inscripciones</td></tr>
            ) : (
              data?.items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{item.trabajadorNombre}</div>
                    <div className="text-xs text-gray-400">{item.trabajadorCurp}</div>
                  </td>
                  {(["jefe", "companero1", "companero2"] as const).map((rol) => (
                    <td key={rol} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{(rol === "jefe" ? item.jefeNombre : rol === "companero1" ? item.companero1Nombre : item.companero2Nombre) ?? "— (cuenta no encontrada)"}</span>
                        <button
                          type="button"
                          title="Reasignar"
                          onClick={() => setReasignando({ promocionId: item.id, rol, nuevoUserId: 0, nuevoNombre: "" })}
                          className="text-gray-300 hover:text-primary-500"
                        >
                          <RefreshCw size={13} />
                        </button>
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-gray-500">{new Date(item.enviadoAt).toLocaleDateString("es-MX")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-gray-600">
            <span>Mostrando página {data.page} de {data.totalPages} ({data.total} resultados)</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {modalJefes && (
        <ImportarCSVModal
          titulo="Jefes"
          columnas={[
            { key: "curp_trabajador", label: "CURP Trabajador", ejemplo: "AAAA000101HDFXXX01" },
            { key: "curp_jefe", label: "CURP Jefe", ejemplo: "BBBB000101HDFXXX02" },
          ]}
          onImportar={(registros) => importarJefesMut.mutateAsync({ registros })}
          onClose={() => setModalJefes(false)}
          onSuccess={() => utils.promocion.listarInscripciones.invalidate()}
        />
      )}

      {modalCompaneros && (
        <ImportarCSVModal
          titulo="Compañeros"
          columnas={[{ key: "curp", label: "CURP", ejemplo: "CCCC000101HDFXXX03" }]}
          onImportar={(registros) => importarCompanerosMut.mutateAsync({ registros })}
          onClose={() => setModalCompaneros(false)}
          onSuccess={() => utils.promocion.listarInscripciones.invalidate()}
        />
      )}

      {reasignando && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setReasignando(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Reasignar {reasignando.rol}</h3>
            <BuscadorEvaluador onElegir={(userId, nombre) => setReasignando({ ...reasignando, nuevoUserId: userId, nuevoNombre: nombre })} />
            {reasignando.nuevoUserId > 0 && (
              <p className="mt-2 text-xs text-slate-500">Elegido: {reasignando.nuevoNombre}</p>
            )}
            <div className="mt-4 flex gap-3">
              <button onClick={() => setReasignando(null)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={() => reasignarMut.mutate({ promocionId: reasignando.promocionId, rol: reasignando.rol, nuevoUserId: reasignando.nuevoUserId })}
                disabled={reasignando.nuevoUserId === 0 || reasignarMut.isPending}
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
