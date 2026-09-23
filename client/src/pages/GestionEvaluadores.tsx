import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { ListChecks, Upload, Briefcase, Users } from "lucide-react";
import ImportarCSVModal from "@/components/ImportarCSVModal";
import { PREGUNTAS_EVALUADOR } from "@shared/const";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } };

const COLUMNAS_IMPORT = [
  { key: "texto", label: "Texto de la pregunta", ejemplo: "¿Delega tareas con claridad?" },
  { key: "respuesta_correcta", label: "Respuesta correcta", ejemplo: "siempre" },
];

const ROLES = [
  { rol: "jefe" as const, label: "Jefe", icon: Briefcase },
  { rol: "companero" as const, label: "Compañero", icon: Users },
];

export default function GestionEvaluadores() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<"jefe" | "companero">("jefe");
  const [importando, setImportando] = useState(false);
  const { data: activas, isLoading } = trpc.evaluadores.contarActivas.useQuery({ rol: tab });
  const importarMut = trpc.evaluadores.importarPreguntas.useMutation();

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold text-gray-900">Evaluadores — Bancos de preguntas</h1>
      </motion.div>

      <motion.div variants={fadeUp} className="flex gap-2">
        {ROLES.map(({ rol, label, icon: Icon }) => (
          <button
            key={rol}
            type="button"
            onClick={() => setTab(rol)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tab === rol ? "bg-primary-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl bg-white p-6 shadow-card-rest border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
              <ListChecks className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">
                {isLoading ? "Cargando..." : `${activas ?? 0} preguntas activas en el banco de ${ROLES.find((r) => r.rol === tab)?.label}`}
              </p>
              <p className="text-sm text-gray-500">Se sortean {PREGUNTAS_EVALUADOR} por evaluación.</p>
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
        {!isLoading && (activas ?? 0) < PREGUNTAS_EVALUADOR && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">
            ⚠️ Menos de {PREGUNTAS_EVALUADOR} preguntas activas en el banco de {ROLES.find((r) => r.rol === tab)?.label} — nadie puede completar su evaluación de este rol hasta que se corrija
          </p>
        )}
      </motion.div>

      {importando && (
        <ImportarCSVModal
          titulo={`Banco de Evaluadores — ${ROLES.find((r) => r.rol === tab)?.label}`}
          columnas={COLUMNAS_IMPORT}
          onImportar={(registros) => importarMut.mutateAsync({ rol: tab, registros })}
          onClose={() => setImportando(false)}
          onSuccess={() => utils.evaluadores.contarActivas.invalidate({ rol: tab })}
        />
      )}
    </motion.div>
  );
}
