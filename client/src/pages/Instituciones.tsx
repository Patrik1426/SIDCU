import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Pencil,
  X,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Upload,
} from "lucide-react";
import ImportarCSVModal from "@/components/ImportarCSVModal";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; id: number };

interface InstFormData {
  nombre: string;
  direccion: string;
  contacto: string;
  telefono: string;
  email: string;
}

const emptyForm: InstFormData = {
  nombre: "",
  direccion: "",
  contacto: "",
  telefono: "",
  email: "",
};

export default function Instituciones() {
  const utils = trpc.useUtils();
  const [modal, setModal] = useState<ModalState>({ type: "closed" });
  const [form, setForm] = useState<InstFormData>(emptyForm);
  const [showImport, setShowImport] = useState(false);

  const { data: instituciones, isLoading } = trpc.instituciones.listar.useQuery({ soloActivas: false });

  const crearMut = trpc.instituciones.crear.useMutation({
    onSuccess: () => {
      utils.instituciones.listar.invalidate();
      setModal({ type: "closed" });
    },
  });

  const actualizarMut = trpc.instituciones.actualizar.useMutation({
    onSuccess: () => {
      utils.instituciones.listar.invalidate();
      setModal({ type: "closed" });
    },
  });

  const toggleActivoMut = trpc.instituciones.toggleActivo.useMutation({
    onSuccess: () => {
      utils.instituciones.listar.invalidate();
    },
  });

  const importarMut = trpc.instituciones.importar.useMutation();

  const openCreate = () => {
    setForm(emptyForm);
    setModal({ type: "create" });
  };

  const openEdit = (inst: any) => {
    setForm({
      nombre: inst.nombre,
      direccion: inst.direccion ?? "",
      contacto: inst.contacto ?? "",
      telefono: inst.telefono ?? "",
      email: inst.email ?? "",
    });
    setModal({ type: "edit", id: inst.id });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      direccion: form.direccion || undefined,
      contacto: form.contacto || undefined,
      telefono: form.telefono || undefined,
      email: form.email || undefined,
    };
    if (modal.type === "create") {
      await crearMut.mutateAsync(payload as any);
    } else if (modal.type === "edit") {
      await actualizarMut.mutateAsync({ id: modal.id, ...payload } as any);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 outline-none transition-all focus:border-primary-300 focus:ring-2 focus:ring-primary-100";

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Instituciones
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Gestiona las instituciones de capacitacion
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Upload size={16} />
            Importar CSV
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition-colors hover:bg-primary-700"
          >
            <Plus size={16} />
            Crear Institución
          </button>
        </div>
      </motion.div>

      {/* Institution list */}
      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-primary-500" />
        </div>
      ) : !instituciones?.length ? (
        <motion.div variants={fadeUp} className="flex flex-col items-center py-16 text-center">
          <div className="rounded-2xl bg-slate-50 p-5">
            <Building2 size={28} className="text-slate-300" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-400">No hay instituciones registradas</p>
        </motion.div>
      ) : (
        <motion.div variants={stagger} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instituciones.map((inst: any) => (
            <motion.div
              key={inst.id}
              variants={fadeUp}
              className="group rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-200"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-800 leading-snug">
                  {inst.nombre}
                </h3>
                <button
                  onClick={() => openEdit(inst)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-slate-50 hover:text-primary-500 group-hover:opacity-100"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
              </div>

              <div className="mt-3 space-y-1.5">
                {inst.direccion && (
                  <p className="flex items-start gap-2 text-xs text-slate-400">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{inst.direccion}</span>
                  </p>
                )}
                {inst.contacto && (
                  <p className="flex items-center gap-2 text-xs text-slate-400">
                    <User size={12} className="shrink-0" />
                    {inst.contacto}
                  </p>
                )}
                {inst.telefono && (
                  <p className="flex items-center gap-2 text-xs text-slate-400">
                    <Phone size={12} className="shrink-0" />
                    {inst.telefono}
                  </p>
                )}
                {inst.email && (
                  <p className="flex items-center gap-2 text-xs text-slate-400">
                    <Mail size={12} className="shrink-0" />
                    {inst.email}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  onClick={() => toggleActivoMut.mutate({ id: inst.id })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    inst.activo ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      inst.activo ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${inst.activo ? "text-emerald-500" : "text-slate-400"}`}>
                  {inst.activo ? "Activa" : "Inactiva"}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create/Edit Modal */}
      {modal.type !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/60 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-800">
                {modal.type === "create" ? "Crear Institucion" : "Editar Institucion"}
              </h2>
              <button
                onClick={() => setModal({ type: "closed" })}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              {(crearMut.error || actualizarMut.error) && (
                <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
                  {(crearMut.error || actualizarMut.error)?.message}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Nombre *</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className={inputClass}
                  placeholder="Nombre de la institucion"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Direccion</label>
                <textarea
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  className={`${inputClass} min-h-[70px] resize-y`}
                  placeholder="Direccion completa"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Contacto</label>
                <input
                  type="text"
                  value={form.contacto}
                  onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                  className={inputClass}
                  placeholder="Persona de contacto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Telefono</label>
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className={inputClass}
                    placeholder="(000) 000-0000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModal({ type: "closed" })}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={crearMut.isPending || actualizarMut.isPending}
                  className="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition-colors hover:bg-primary-700 disabled:opacity-50"
                >
                  {crearMut.isPending || actualizarMut.isPending
                    ? "Guardando..."
                    : modal.type === "create"
                    ? "Crear"
                    : "Actualizar"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Import CSV Modal */}
      {showImport && (
        <ImportarCSVModal
          titulo="Instituciones"
          columnas={[
            { key: "nombre", label: "Nombre", ejemplo: "Universidad Autónoma" },
            { key: "direccion", label: "Dirección", ejemplo: "Av. Principal #123" },
            { key: "contacto", label: "Contacto", ejemplo: "Juan Pérez" },
            { key: "telefono", label: "Teléfono", ejemplo: "6141234567" },
            { key: "email", label: "Email", ejemplo: "contacto@universidad.edu.mx" },
          ]}
          onImportar={(registros) => importarMut.mutateAsync({ registros })}
          onClose={() => setShowImport(false)}
          onSuccess={() => utils.instituciones.listar.invalidate()}
        />
      )}
    </motion.div>
  );
}
