import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { Award } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import BuscadorEvaluador from "@/components/BuscadorEvaluador";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } };

type Seleccion = { servidorId: number; nombre: string; correo: string } | null;

function CampoEvaluador({
  etiqueta, rol, seleccion, onElegir, onCorreo,
}: {
  etiqueta: string;
  rol: "jefe" | "companero";
  seleccion: Seleccion;
  onElegir: (servidorId: number, nombre: string) => void;
  onCorreo: (correo: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700">{etiqueta}</label>
      {!seleccion ? (
        <BuscadorEvaluador rol={rol} onElegir={onElegir} placeholder={`Buscar ${etiqueta.toLowerCase()}...`} />
      ) : (
        <div className="mt-1 space-y-2">
          <p className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-700">{seleccion.nombre}</p>
          <input
            type="email"
            value={seleccion.correo}
            onChange={(e) => onCorreo(e.target.value)}
            placeholder="Correo de contacto"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      )}
    </div>
  );
}

export default function Promocion() {
  const utils = trpc.useUtils();
  const [confirmando, setConfirmando] = useState(false);
  const [jefe, setJefe] = useState<Seleccion>(null);
  const [companero1, setCompanero1] = useState<Seleccion>(null);
  const [companero2, setCompanero2] = useState<Seleccion>(null);

  const { data, isLoading } = trpc.promocion.miElegibilidad.useQuery();

  // El backend ya rechaza (SELECCION_INVALIDA) si 2 de los 3 slots terminan
  // con el mismo servidorId -- este check es solo para no dejar que el
  // trabajador llegue hasta "Confirmar" y se entere del error hasta ahi.
  function elegirSiNoEstaRepetido(
    servidorId: number,
    nombre: string,
    yaElegidos: number[],
    setter: (s: Seleccion) => void,
  ) {
    if (yaElegidos.includes(servidorId)) {
      toast.error("Esa persona ya está elegida en otro lugar de esta inscripción.");
      return;
    }
    setter({ servidorId, nombre, correo: "" });
  }

  const confirmarMut = trpc.promocion.confirmarInscripcion.useMutation({
    onSuccess: () => {
      utils.promocion.miElegibilidad.invalidate();
      setConfirmando(false);
      toast.success("Tu inscripción fue registrada");
    },
    onError: (err) => {
      setConfirmando(false);
      toast.error(err.message);
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  const listoParaConfirmar = jefe?.correo && companero1?.correo && companero2?.correo;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold text-gray-900">Inscripción a Promoción</h1>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl bg-white p-8 shadow-card-rest border border-gray-100">
        <div className="text-center">
          <Award className="mx-auto h-10 w-10 text-primary-300" />
        </div>

        {data.yaInscrito ? (
          <p className="mt-3 text-center font-medium text-gray-700">Tu inscripción fue registrada</p>
        ) : data.elegible ? (
          <div className="mt-6 space-y-5">
            <CampoEvaluador etiqueta="Jefe Inmediato" rol="jefe" seleccion={jefe}
              onElegir={(servidorId, nombre) => elegirSiNoEstaRepetido(servidorId, nombre, [companero1?.servidorId, companero2?.servidorId].filter((x): x is number => !!x), setJefe)}
              onCorreo={(correo) => setJefe((s) => s && { ...s, correo })} />
            <CampoEvaluador etiqueta="Compañero 1" rol="companero" seleccion={companero1}
              onElegir={(servidorId, nombre) => elegirSiNoEstaRepetido(servidorId, nombre, [jefe?.servidorId, companero2?.servidorId].filter((x): x is number => !!x), setCompanero1)}
              onCorreo={(correo) => setCompanero1((s) => s && { ...s, correo })} />
            <CampoEvaluador etiqueta="Compañero 2" rol="companero" seleccion={companero2}
              onElegir={(servidorId, nombre) => elegirSiNoEstaRepetido(servidorId, nombre, [jefe?.servidorId, companero1?.servidorId].filter((x): x is number => !!x), setCompanero2)}
              onCorreo={(correo) => setCompanero2((s) => s && { ...s, correo })} />

            <button
              type="button"
              disabled={!listoParaConfirmar}
              onClick={() => setConfirmando(true)}
              className="w-full rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              Confirmar inscripción
            </button>
          </div>
        ) : (
          <>
            <p className="mt-3 text-center font-medium text-gray-700">Todavía no cumples el requisito</p>
            <p className="mt-1 text-center text-sm text-gray-500">Necesitas aprobar 2 cursos con calificación mínima de 70.</p>
          </>
        )}
      </motion.div>

      <ConfirmModal
        open={confirmando}
        variant="warning"
        title="¿Confirmas esta selección?"
        message="No podrás cambiarla después salvo que el administrador reasigne un lugar por baja."
        confirmLabel="Sí, confirmar"
        loading={confirmarMut.isPending}
        onCancel={() => setConfirmando(false)}
        onConfirm={() => {
          if (!jefe || !companero1 || !companero2) return;
          confirmarMut.mutate({
            jefe: { servidorId: jefe.servidorId, correo: jefe.correo },
            companero1: { servidorId: companero1.servidorId, correo: companero1.correo },
            companero2: { servidorId: companero2.servidorId, correo: companero2.correo },
          });
        }}
      />
    </motion.div>
  );
}
