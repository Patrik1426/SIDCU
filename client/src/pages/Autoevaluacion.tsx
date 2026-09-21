import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ListChecks, CheckCircle2 } from "lucide-react";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } };

const LIKERT_LABELS: Record<string, string> = {
  siempre: "Siempre",
  frecuente: "Frecuente",
  algunas_veces: "Algunas veces",
  nunca: "Nunca",
};
const LIKERT_OPCIONES = ["siempre", "frecuente", "algunas_veces", "nunca"] as const;

export default function Autoevaluacion() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.autoevaluacion.miEstado.useQuery();
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});

  const iniciarMut = trpc.autoevaluacion.iniciar.useMutation({
    onSuccess: () => { utils.autoevaluacion.miEstado.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const enviarMut = trpc.autoevaluacion.enviar.useMutation({
    onSuccess: () => {
      utils.autoevaluacion.miEstado.invalidate();
      toast.success("Tu autoevaluación fue enviada");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  const handleEnviar = () => {
    if (data.estado !== "borrador") return;
    const faltantes = data.preguntas.filter((p) => !respuestas[p.preguntaId] && !p.respuestaElegida);
    if (faltantes.length > 0) {
      toast.error(`Faltan ${faltantes.length} preguntas por contestar`);
      return;
    }
    enviarMut.mutate({
      respuestas: data.preguntas.map((p) => ({
        preguntaId: p.preguntaId,
        respuestaElegida: (respuestas[p.preguntaId] ?? p.respuestaElegida) as typeof LIKERT_OPCIONES[number],
      })),
    });
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold text-gray-900">Autoevaluación</h1>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl bg-white p-8 shadow-card-rest border border-gray-100">
        {data.estado === "sin_promocion" && (
          <div className="text-center">
            <ListChecks className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 font-medium text-gray-700">Todavía no puedes hacer tu autoevaluación</p>
            <p className="mt-1 text-sm text-gray-500">Necesitas tener una inscripción a Promoción confirmada.</p>
          </div>
        )}

        {data.estado === "no_iniciada" && (
          <div className="text-center">
            <ListChecks className="mx-auto h-10 w-10 text-primary-300" />
            <p className="mt-3 font-medium text-gray-700">Tu autoevaluación está lista para empezar</p>
            <p className="mt-1 text-sm text-gray-500">Son 28 preguntas, una sola vez.</p>
            <button
              type="button"
              onClick={() => iniciarMut.mutate()}
              disabled={iniciarMut.isPending}
              className="mt-4 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {iniciarMut.isPending ? "Iniciando..." : "Iniciar autoevaluación"}
            </button>
          </div>
        )}

        {data.estado === "borrador" && (
          <div className="space-y-5">
            {data.preguntas.map((p, i) => (
              <div key={p.preguntaId} className="rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-medium text-gray-800">{i + 1}. {p.texto}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {LIKERT_OPCIONES.map((opcion) => {
                    const elegida = respuestas[p.preguntaId] ?? p.respuestaElegida;
                    return (
                      <button
                        key={opcion}
                        type="button"
                        onClick={() => setRespuestas((prev) => ({ ...prev, [p.preguntaId]: opcion }))}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          elegida === opcion
                            ? "border-primary-500 bg-primary-50 text-primary-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {LIKERT_LABELS[opcion]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleEnviar}
              disabled={enviarMut.isPending}
              className="w-full rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {enviarMut.isPending ? "Enviando..." : "Enviar autoevaluación"}
            </button>
          </div>
        )}

        {data.estado === "enviado" && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="mt-3 font-medium text-gray-700">Tu autoevaluación fue enviada</p>
            <p className="mt-1 text-sm text-gray-500">Puntaje: {data.puntaje}/28</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
