import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { Award } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } } };

export default function Promocion() {
  const utils = trpc.useUtils();
  const [confirmando, setConfirmando] = useState(false);
  const { data, isLoading } = trpc.promocion.miElegibilidad.useQuery();

  const inscribirMut = trpc.promocion.inscribirme.useMutation({
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

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold text-gray-900">Inscripción a Promoción</h1>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl bg-white p-8 text-center shadow-card-rest border border-gray-100">
        <Award className="mx-auto h-10 w-10 text-primary-300" />

        {data.yaInscrito ? (
          <>
            <p className="mt-3 font-medium text-gray-700">Tu inscripción fue registrada</p>
            <p className="mt-1 text-sm text-gray-500">Te avisaremos cuando haya novedades.</p>
          </>
        ) : data.elegible ? (
          <>
            <p className="mt-3 font-medium text-gray-700">Cumples el requisito para inscribirte a Promoción</p>
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="mt-4 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
            >
              Inscribirme a Promoción
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 font-medium text-gray-700">Todavía no cumples el requisito</p>
            <p className="mt-1 text-sm text-gray-500">Necesitas aprobar 2 cursos con calificación mínima de 70.</p>
          </>
        )}
      </motion.div>

      <ConfirmModal
        open={confirmando}
        variant="warning"
        title="¿Confirmas tu inscripción?"
        message="No podrás cancelarla después."
        confirmLabel="Sí, inscribirme"
        loading={inscribirMut.isPending}
        onCancel={() => setConfirmando(false)}
        onConfirm={() => inscribirMut.mutate()}
      />
    </motion.div>
  );
}
