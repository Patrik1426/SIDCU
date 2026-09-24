import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ListChecks, Upload, Pencil, X } from "lucide-react";
import ImportarCSVModal from "@/components/ImportarCSVModal";
import { PREGUNTAS_AUTOEVALUACION } from "@shared/const";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } };

const COLUMNAS_IMPORT = [
  { key: "texto", label: "Texto de la pregunta", ejemplo: "¿Llegas puntual a tu jornada laboral?" },
  { key: "respuesta_correcta", label: "Respuesta correcta", ejemplo: "siempre" },
];

const LIKERT_LABELS: Record<string, string> = {
  siempre: "Siempre",
  frecuente: "Frecuente",
  algunas_veces: "Algunas veces",
  nunca: "Nunca",
};
const LIKERT_OPCIONES = ["siempre", "frecuente", "algunas_veces", "nunca"] as const;

export default function GestionAutoevaluacion() {
  const utils = trpc.useUtils();
  const [importando, setImportando] = useState(false);
  const [editando, setEditando] = useState<{ id: number; texto: string; respuestaCorrecta: string; activo: boolean } | null>(null);

  const { data: activas, isLoading } = trpc.autoevaluacion.contarActivas.useQuery();
  const { data: preguntas, isLoading: cargandoPreguntas } = trpc.autoevaluacion.listarPreguntas.useQuery();
  const importarMut = trpc.autoevaluacion.importarPreguntas.useMutation();
  const actualizarMut = trpc.autoevaluacion.actualizarPregunta.useMutation({
    onSuccess: () => {
      utils.autoevaluacion.listarPreguntas.invalidate();
      utils.autoevaluacion.contarActivas.invalidate();
      setEditando(null);
      toast.success("Pregunta actualizada");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold text-gray-900">Autoevaluación — Banco de preguntas</h1>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl bg-white p-6 shadow-card-rest border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
              <ListChecks className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">
                {isLoading ? "Cargando..." : `${activas ?? 0} preguntas activas en el banco`}
              </p>
              <p className="text-sm text-gray-500">Se sortean {PREGUNTAS_AUTOEVALUACION} por autoevaluación.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setImportando(true)}
            className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            <Upload size={15} />
            Importar CSV
          </button>
        </div>
        {!isLoading && (activas ?? 0) < PREGUNTAS_AUTOEVALUACION && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">
            ⚠️ Menos de {PREGUNTAS_AUTOEVALUACION} preguntas activas — nadie puede completar su autoevaluación hasta que se corrija
          </p>
        )}
      </motion.div>

      <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card-rest">
        <div className="max-h-[520px] overflow-y-auto">
          {cargandoPreguntas ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">Cargando...</div>
          ) : preguntas?.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">Banco vacío — importa un CSV para empezar.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 w-14">No</th>
                  <th className="px-4 py-2.5">Afirmación</th>
                  <th className="px-4 py-2.5 w-40">Respuesta correcta</th>
                  <th className="px-4 py-2.5 w-24">Estado</th>
                  <th className="px-4 py-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preguntas?.map((p, i) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2.5 text-gray-800">{p.texto}</td>
                    <td className="px-4 py-2.5 text-gray-600">{LIKERT_LABELS[p.respuestaCorrecta] ?? p.respuestaCorrecta}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${p.activo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.activo ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setEditando({ id: p.id, texto: p.texto, respuestaCorrecta: p.respuestaCorrecta, activo: p.activo })}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {importando && (
        <ImportarCSVModal
          titulo="Banco de Autoevaluación"
          columnas={COLUMNAS_IMPORT}
          onImportar={(registros) => importarMut.mutateAsync({ registros })}
          onClose={() => setImportando(false)}
          onSuccess={() => {
            utils.autoevaluacion.contarActivas.invalidate();
            utils.autoevaluacion.listarPreguntas.invalidate();
          }}
        />
      )}

      {editando && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setEditando(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Editar pregunta</h3>
              <button onClick={() => setEditando(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <label className="block text-xs font-semibold text-gray-500">Texto de la afirmación</label>
            <textarea
              value={editando.texto}
              onChange={(e) => setEditando({ ...editando, texto: e.target.value })}
              rows={3}
              maxLength={500}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />

            <label className="mt-3 block text-xs font-semibold text-gray-500">Respuesta correcta</label>
            <select
              value={editando.respuestaCorrecta}
              onChange={(e) => setEditando({ ...editando, respuestaCorrecta: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {LIKERT_OPCIONES.map((op) => (
                <option key={op} value={op}>{LIKERT_LABELS[op]}</option>
              ))}
            </select>

            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editando.activo}
                onChange={(e) => setEditando({ ...editando, activo: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Pregunta activa (se puede sortear)
            </label>

            <div className="mt-5 flex gap-3">
              <button onClick={() => setEditando(null)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={() => actualizarMut.mutate({
                  id: editando.id,
                  texto: editando.texto,
                  respuestaCorrecta: editando.respuestaCorrecta as (typeof LIKERT_OPCIONES)[number],
                  activo: editando.activo,
                })}
                disabled={!editando.texto.trim() || actualizarMut.isPending}
                className="flex-1 rounded-xl bg-primary-600 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {actualizarMut.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
