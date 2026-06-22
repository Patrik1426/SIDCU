import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  Pencil,
  X,
  BookOpen,
  Building2,
  Calendar,
  Clock,
  Users,
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

const CATEGORIAS = ["obligatorio", "optativo", "especializado"];
const MODALIDADES = ["presencial", "virtual", "mixto"];
const NIVELES_GOBIERNO = ["federal", "estatal", "municipal", "otro"];

type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; id: number }
  | { type: "assign"; cursoId: number; cursoNombre: string };

interface CursoFormData {
  nombre: string;
  descripcion: string;
  nivelRequerido: number;
  nivelGobierno: string;
  categoria: string;
  duracionHoras: number;
  modalidad: string;
}

const emptyForm: CursoFormData = {
  nombre: "",
  descripcion: "",
  nivelRequerido: 1,
  nivelGobierno: "",
  categoria: "obligatorio",
  duracionHoras: 1,
  modalidad: "presencial",
};

export default function GestionCursos() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [modal, setModal] = useState<ModalState>({ type: "closed" });
  const [form, setForm] = useState<CursoFormData>(emptyForm);
  const [showImport, setShowImport] = useState(false);

  // Assignment form state
  const [assignForm, setAssignForm] = useState({
    institucionId: 0,
    cupoMaximo: 30,
    dias: [] as string[],
    horaInicio: "09:00",
    horaFin: "11:00",
    fechaInicio: "",
    fechaFin: "",
  });

  const { data: cursos, isLoading } = trpc.cursos.listar.useQuery();
  const { data: instituciones } = trpc.instituciones.listar.useQuery({ soloActivas: true });

  // Fetch course details when editing
  const { data: cursoDetalle } = trpc.cursos.obtener.useQuery(
    { id: modal.type === "edit" ? modal.id : modal.type === "assign" ? modal.cursoId : 0 },
    { enabled: modal.type === "edit" || modal.type === "assign" }
  );

  const crearMut = trpc.cursos.crear.useMutation({
    onSuccess: () => {
      utils.cursos.listar.invalidate();
      setModal({ type: "closed" });
    },
  });

  const actualizarMut = trpc.cursos.actualizar.useMutation({
    onSuccess: () => {
      utils.cursos.listar.invalidate();
      utils.cursos.obtener.invalidate();
      setModal({ type: "closed" });
    },
  });

  const toggleActivoMut = trpc.cursos.toggleActivo.useMutation({
    onSuccess: () => {
      utils.cursos.listar.invalidate();
    },
  });

  const asignarMut = trpc.cursos.asignarInstitucion.useMutation({
    onSuccess: () => {
      utils.cursos.obtener.invalidate();
      setAssignForm({ institucionId: 0, cupoMaximo: 30, dias: [], horaInicio: "09:00", horaFin: "11:00", fechaInicio: "", fechaFin: "" });
    },
  });

  const importarCursosMut = trpc.cursos.importar.useMutation();

  const desasignarMut = trpc.cursos.desasignarInstitucion.useMutation({
    onSuccess: () => {
      utils.cursos.obtener.invalidate();
      utils.cursos.listar.invalidate();
    },
    onError: (err) => {
      alert("Error al desasignar: " + err.message);
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setModal({ type: "create" });
  };

  const openEdit = (curso: any) => {
    setForm({
      nombre: curso.nombre,
      descripcion: curso.descripcion ?? "",
      nivelRequerido: curso.nivelRequerido,
      nivelGobierno: curso.nivelGobierno ?? "",
      categoria: curso.categoria,
      duracionHoras: curso.duracionHoras,
      modalidad: curso.modalidad,
    });
    setModal({ type: "edit", id: curso.id });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || undefined,
      nivelRequerido: Number(form.nivelRequerido),
      nivelGobierno: form.nivelGobierno || undefined,
      categoria: form.categoria,
      duracionHoras: Number(form.duracionHoras),
      modalidad: form.modalidad as "presencial" | "virtual" | "mixto",
    };
    if (modal.type === "create") {
      await crearMut.mutateAsync(payload);
    } else if (modal.type === "edit") {
      await actualizarMut.mutateAsync({ id: modal.id!, ...payload });
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal.type !== "assign" || !assignForm.institucionId) return;
    const horarioParts: string[] = [];
    if (assignForm.dias.length > 0) horarioParts.push(assignForm.dias.join(", "));
    if (assignForm.horaInicio && assignForm.horaFin) horarioParts.push(`${assignForm.horaInicio} - ${assignForm.horaFin}`);
    const horario = horarioParts.join(" · ") || undefined;
    await asignarMut.mutateAsync({
      cursoId: modal.cursoId,
      institucionId: assignForm.institucionId,
      cupoMaximo: assignForm.cupoMaximo,
      horario,
      fechaInicio: assignForm.fechaInicio ? new Date(assignForm.fechaInicio) : undefined,
      fechaFin: assignForm.fechaFin ? new Date(assignForm.fechaFin) : undefined,
    } as any);
  };

  const modalidadLabel = (m: string) => {
    const map: Record<string, string> = { presencial: "Presencial", en_linea: "En Línea", hibrido: "Híbrido" };
    return map[m] ?? m;
  };

  const modalidadColor = (m: string) => {
    const map: Record<string, string> = {
      presencial: "bg-blue-50 text-blue-700",
      en_linea: "bg-violet-50 text-violet-700",
      hibrido: "bg-amber-50 text-amber-700",
    };
    return map[m] ?? "bg-slate-50 text-slate-600";
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 outline-none transition-all focus:border-primary-300 focus:ring-2 focus:ring-primary-100";

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Gestion de Cursos
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Administra el catalogo de capacitaciones
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
            Crear Curso
          </button>
        </div>
      </motion.div>

      {/* Course list */}
      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-primary-500" />
        </div>
      ) : !cursos?.length ? (
        <motion.div variants={fadeUp} className="flex flex-col items-center py-16 text-center">
          <div className="rounded-2xl bg-slate-50 p-5">
            <BookOpen size={28} className="text-slate-300" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-400">No hay cursos registrados</p>
        </motion.div>
      ) : (
        <motion.div variants={stagger} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cursos.map((curso: any) => (
            <motion.div
              key={curso.id}
              variants={fadeUp}
              className="group rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-200"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-800 leading-snug">
                  {curso.nombre}
                </h3>
                <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${modalidadColor(curso.modalidad)}`}>
                  {modalidadLabel(curso.modalidad)}
                </span>
              </div>

              {curso.descripcion && (
                <p className="mt-2 line-clamp-2 text-xs text-slate-400">
                  {curso.descripcion}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <BookOpen size={11} />
                  Nivel {curso.nivelRequerido}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {curso.duracionHoras}h
                </span>
                <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  {curso.categoria}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                {/* Toggle activo */}
                <button
                  onClick={() => toggleActivoMut.mutate({ id: curso.id })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    curso.activo ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      curso.activo ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>

                <div className="flex gap-1">
                  <button
                    onClick={() => setModal({ type: "assign", cursoId: curso.id, cursoNombre: curso.nombre })}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-primary-500"
                    title="Asignar Institucion"
                  >
                    <Building2 size={15} />
                  </button>
                  <button
                    onClick={() => openEdit(curso)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-primary-500"
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create/Edit Modal */}
      {(modal.type === "create" || modal.type === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/60 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-800">
                {modal.type === "create" ? "Crear Curso" : "Editar Curso"}
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
                  placeholder="Nombre del curso"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Descripcion</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className={`${inputClass} min-h-[80px] resize-y`}
                  placeholder="Descripcion del curso (opcional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Nivel Requerido (1-4) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={4}
                    value={form.nivelRequerido}
                    onChange={(e) => setForm({ ...form, nivelRequerido: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Duracion (horas) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.duracionHoras}
                    onChange={(e) => setForm({ ...form, duracionHoras: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Categoria *</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className={inputClass}
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Modalidad *</label>
                  <select
                    value={form.modalidad}
                    onChange={(e) => setForm({ ...form, modalidad: e.target.value })}
                    className={inputClass}
                  >
                    {MODALIDADES.map((m) => (
                      <option key={m} value={m}>
                        {modalidadLabel(m)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Nivel de Gobierno</label>
                <select
                  value={form.nivelGobierno}
                  onChange={(e) => setForm({ ...form, nivelGobierno: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Sin especificar</option>
                  {NIVELES_GOBIERNO.map((n) => (
                    <option key={n} value={n}>
                      {n.charAt(0).toUpperCase() + n.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned institutions (edit mode only) */}
              {modal.type === "edit" && cursoDetalle?.instituciones && cursoDetalle.instituciones.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-500">Instituciones Asignadas</label>
                  <div className="space-y-2">
                    {cursoDetalle.instituciones.map((inst: any) => {
                      const ci = inst.cursos_instituciones ?? inst;
                      const instData = inst.instituciones ?? inst;
                      return (
                        <div key={ci.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <Building2 size={12} className="text-slate-400" />
                          <span className="flex-1 font-medium">{instData.nombre ?? `Institución #${ci.institucionId}`}</span>
                          <span className="text-slate-400">· Cupo: {ci.cupoMaximo}</span>
                          {ci.horario && <span className="text-slate-400">· {ci.horario}</span>}
                          <button
                            type="button"
                            onClick={() => {
                              if (!confirm(`¿Eliminar asignación de "${instData.nombre}"?`)) return;
                              desasignarMut.mutate({ id: ci.id });
                            }}
                            className="ml-1 rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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

      {/* Assign Institution Modal */}
      {modal.type === "assign" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/60 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Asignar Institucion</h2>
                <p className="text-xs text-slate-400 mt-0.5">{modal.cursoNombre}</p>
              </div>
              <button
                onClick={() => setModal({ type: "closed" })}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Already assigned */}
            {cursoDetalle?.instituciones && cursoDetalle.instituciones.length > 0 && (
              <div className="border-b border-slate-100 px-5 py-4 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Asignaciones actuales</p>
                {cursoDetalle.instituciones.map((inst: any) => {
                  const ci = inst.cursos_instituciones ?? inst;
                  const instData = inst.instituciones ?? inst;
                  return (
                    <div key={ci.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <Building2 size={12} className="text-slate-400" />
                      <span className="flex-1 font-medium">{instData.nombre ?? `#${ci.institucionId}`}</span>
                      <span className="text-slate-400">· Cupo: {ci.cupoMaximo}</span>
                      {ci.horario && <span className="text-slate-400">· {ci.horario}</span>}
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirm(`¿Eliminar asignación de "${instData.nombre}"?`)) return;
                          desasignarMut.mutate({ id: ci.id });
                        }}
                        className="ml-1 rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <form onSubmit={handleAssign} className="space-y-4 p-5">
              {asignarMut.error && (
                <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
                  {asignarMut.error.message}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Institucion *</label>
                <select
                  required
                  value={assignForm.institucionId}
                  onChange={(e) => setAssignForm({ ...assignForm, institucionId: Number(e.target.value) })}
                  className={inputClass}
                >
                  <option value={0}>Seleccionar institucion...</option>
                  {instituciones?.map((inst: any) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Cupo Máximo *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={assignForm.cupoMaximo}
                  onChange={(e) => setAssignForm({ ...assignForm, cupoMaximo: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Días</label>
                <div className="flex flex-wrap gap-1.5">
                  {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((dia) => {
                    const selected = assignForm.dias.includes(dia);
                    return (
                      <button
                        key={dia}
                        type="button"
                        onClick={() => {
                          setAssignForm({
                            ...assignForm,
                            dias: selected
                              ? assignForm.dias.filter((d) => d !== dia)
                              : [...assignForm.dias, dia],
                          });
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                          selected
                            ? "bg-primary-500 text-white shadow-sm"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Hora Inicio</label>
                  <input
                    type="time"
                    value={assignForm.horaInicio}
                    onChange={(e) => setAssignForm({ ...assignForm, horaInicio: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Hora Fin</label>
                  <input
                    type="time"
                    value={assignForm.horaFin}
                    onChange={(e) => setAssignForm({ ...assignForm, horaFin: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Fecha Inicio</label>
                  <input
                    type="date"
                    value={assignForm.fechaInicio}
                    onChange={(e) => setAssignForm({ ...assignForm, fechaInicio: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Fecha Fin</label>
                  <input
                    type="date"
                    value={assignForm.fechaFin}
                    onChange={(e) => setAssignForm({ ...assignForm, fechaFin: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModal({ type: "closed" })}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={asignarMut.isPending || !assignForm.institucionId}
                  className="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition-colors hover:bg-primary-700 disabled:opacity-50"
                >
                  {asignarMut.isPending ? "Asignando..." : "Asignar"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Import CSV Modal */}
      {showImport && (
        <ImportarCSVModal
          titulo="Cursos"
          columnas={[
            { key: "nombre", label: "Nombre", ejemplo: "Ética en el servicio público" },
            { key: "descripcion", label: "Descripción", ejemplo: "Curso de ética profesional" },
            { key: "categoria", label: "Categoría", ejemplo: "obligatorio" },
            { key: "modalidad", label: "Modalidad", ejemplo: "presencial" },
            { key: "duracionHoras", label: "Duración (hrs)", ejemplo: "20" },
            { key: "nivelRequerido", label: "Nivel requerido", ejemplo: "1" },
            { key: "nivelGobierno", label: "Nivel gobierno", ejemplo: "municipal" },
          ]}
          onImportar={(registros) => importarCursosMut.mutateAsync({ registros })}
          onClose={() => setShowImport(false)}
          onSuccess={() => utils.cursos.listar.invalidate()}
        />
      )}
    </motion.div>
  );
}
