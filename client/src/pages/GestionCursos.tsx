import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import ConfirmModal from "@/components/ConfirmModal";
import ComboInput from "@/components/ComboInput";
import { SkeletonCard, SkeletonTable } from "@/components/Skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  LayoutGrid,
  List,
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

const MODALIDADES = ["presencial", "virtual", "mixto"];
const TIPOS_PROGRAMA = ["PAC", "CERT", "SDPC", "OTRO"];

type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; id: number };

interface CursoFormData {
  nombre: string;
  descripcion: string;
  nivelGobierno: string;
  duracionHoras: number;
  modalidad: string;
  tipoPrograma: string;
  bloque: string;
  finalidad: string;
}

const emptyForm: CursoFormData = {
  nombre: "",
  descripcion: "",
  nivelGobierno: "federal",
  duracionHoras: 1,
  modalidad: "presencial",
  tipoPrograma: "OTRO",
  bloque: "",
  finalidad: "",
};


export default function GestionCursos() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [modal, setModal] = useState<ModalState>({ type: "closed" });
  const [form, setForm] = useState<CursoFormData>(emptyForm);
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [confirmDelete, setConfirmDelete] = useState<{ type: "single"; id: number; nombre: string } | { type: "bulk" } | null>(null);
  const [confirmDesasignar, setConfirmDesasignar] = useState<{ id: number; nombre: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"detalles" | "instituciones">("detalles");

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

  const { data: cursos, isLoading } = trpc.cursos.listar.useQuery(undefined, {
    placeholderData: (prev) => prev,
  });
  const { data: instituciones } = trpc.instituciones.listar.useQuery({ soloActivas: true });
  const { data: finalidades } = trpc.cursos.listarFinalidades.useQuery();

  // Fetch course details when editing
  const { data: cursoDetalle } = trpc.cursos.obtener.useQuery(
    { id: modal.type === "edit" ? modal.id : 0 },
    { enabled: modal.type === "edit" }
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

  const eliminarCursoMut = trpc.cursos.eliminar.useMutation({
    onSuccess: () => {
      utils.cursos.listar.invalidate();
    },
  });

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!cursos) return;
    if (selected.size === cursos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(cursos.map((c: any) => c.id)));
    }
  };

  const eliminarSeleccionados = async () => {
    for (const id of selected) {
      await eliminarCursoMut.mutateAsync({ id });
    }
    setSelected(new Set());
    setConfirmDelete(null);
  };

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
    setActiveTab("detalles");
    setModal({ type: "create" });
  };

  const openEdit = (curso: any) => {
    setForm({
      nombre: curso.nombre,
      descripcion: curso.descripcion ?? "",
      nivelGobierno: curso.nivelGobierno ?? "federal",
      duracionHoras: curso.duracionHoras,
      modalidad: curso.modalidad,
      tipoPrograma: curso.tipoPrograma ?? "OTRO",
      bloque: curso.bloque?.toString() ?? "",
      finalidad: curso.finalidad ?? "",
    });
    setActiveTab("detalles");
    setModal({ type: "edit", id: curso.id });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion || undefined,
      nivelGobierno: "federal" as const,
      duracionHoras: Number(form.duracionHoras),
      modalidad: form.modalidad as "presencial" | "virtual" | "mixto",
      tipoPrograma: form.tipoPrograma as "PAC" | "CERT" | "SDPC" | "OTRO",
      bloque: form.bloque ? Number(form.bloque) : undefined,
      finalidad: form.finalidad || undefined,
    };
    if (modal.type === "create") {
      await crearMut.mutateAsync(payload as any);
    } else if (modal.type === "edit") {
      await actualizarMut.mutateAsync({ id: modal.id!, ...payload } as any);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal.type !== "edit" || !assignForm.institucionId) return;
    const horarioParts: string[] = [];
    if (assignForm.dias.length > 0) horarioParts.push(assignForm.dias.join(", "));
    if (assignForm.horaInicio && assignForm.horaFin) horarioParts.push(`${assignForm.horaInicio} - ${assignForm.horaFin}`);
    const horario = horarioParts.join(" · ") || undefined;
    await asignarMut.mutateAsync({
      cursoId: modal.id,
      institucionId: assignForm.institucionId,
      cupoMaximo: assignForm.cupoMaximo,
      horario,
      fechaInicio: assignForm.fechaInicio ? new Date(assignForm.fechaInicio) : undefined,
      fechaFin: assignForm.fechaFin ? new Date(assignForm.fechaFin) : undefined,
    } as any);
  };

  const modalidadLabel = (m: string) => {
    const map: Record<string, string> = { presencial: "Presencial", virtual: "Virtual", mixto: "Mixto" };
    return map[m] ?? m;
  };

  const modalidadColor = (m: string) => {
    const map: Record<string, string> = {
      presencial: "bg-blue-50 text-blue-700",
      virtual: "bg-violet-50 text-violet-700",
      mixto: "bg-amber-50 text-amber-700",
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
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-2 transition-colors ${viewMode === "grid" ? "bg-primary-500 text-white" : "text-slate-400 hover:text-slate-600"}`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-md p-2 transition-colors ${viewMode === "list" ? "bg-primary-500 text-white" : "text-slate-400 hover:text-slate-600"}`}
            >
              <List size={15} />
            </button>
          </div>
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

      {/* Selection bar */}
      {selected.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="text-caption font-semibold text-primary-600 hover:underline"
            >
              {selected.size === cursos?.length ? "Deseleccionar todos" : "Seleccionar todos"}
            </button>
            <span className="text-caption text-primary-500">
              {selected.size} seleccionado{selected.size > 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={() => setConfirmDelete({ type: "bulk" })}
            disabled={eliminarCursoMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-caption font-semibold text-white hover:bg-rose-600 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={13} />
            Eliminar {selected.size}
          </button>
        </motion.div>
      )}

      {/* Course list */}
      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <SkeletonTable rows={8} cols={8} />
        )
      ) : !cursos?.length ? (
        <motion.div variants={fadeUp} className="flex flex-col items-center py-16 text-center">
          <div className="rounded-2xl bg-slate-50 p-5">
            <BookOpen size={28} className="text-slate-300" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-400">No hay cursos registrados</p>
        </motion.div>
      ) : (
        viewMode === "grid" ? (
          <motion.div variants={stagger} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cursos.map((curso: any) => (
              <motion.div
                key={curso.id}
                variants={fadeUp}
                className="group rounded-2xl border border-slate-200/60 bg-white p-5 shadow-card-rest transition-all hover:shadow-card-hover hover:border-slate-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(curso.id)}
                      onChange={() => toggleSelect(curso.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500/20 cursor-pointer"
                    />
                    <h3 className="text-sm font-bold text-slate-800 leading-snug">
                      {curso.nombre}
                    </h3>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2 py-0.5 text-micro font-bold uppercase tracking-wider ${modalidadColor(curso.modalidad)}`}>
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
                    <Clock size={11} />
                    {curso.duracionHoras}h
                  </span>
                  <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-micro font-semibold text-slate-500">
                    {curso.tipoPrograma}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <button
                    onClick={() => toggleActivoMut.mutate({ id: curso.id })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      curso.activo ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${curso.activo ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(curso)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-primary-500" title="Editar">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setConfirmDelete({ type: "single", id: curso.id, nombre: curso.nombre })} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="Eliminar">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white shadow-card-rest">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={cursos.length > 0 && selected.size === cursos.length}
                      onChange={selectAll}
                      className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500/20 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500">Nombre</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500">Categoría</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500">Modalidad</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500">Duración</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500">Estado</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cursos.map((curso: any) => (
                  <tr key={curso.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(curso.id)}
                        onChange={() => toggleSelect(curso.id)}
                        className="h-4 w-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500/20 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800 max-w-62.5 truncate">{curso.nombre}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{curso.tipoPrograma}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${modalidadColor(curso.modalidad)}`}>{modalidadLabel(curso.modalidad)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{curso.duracionHoras}h</td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => toggleActivoMut.mutate({ id: curso.id })}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${curso.activo ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
                      >
                        {curso.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-0.5">
                        <button onClick={() => openEdit(curso)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-500" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmDelete({ type: "single", id: curso.id, nombre: curso.nombre })} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
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

            <div className="flex border-b border-slate-100 px-5">
              <button
                type="button"
                onClick={() => setActiveTab("detalles")}
                className={`border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === "detalles" ? "border-primary-600 text-primary-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Detalles del curso
              </button>
              <button
                type="button"
                onClick={() => modal.type === "edit" && setActiveTab("instituciones")}
                disabled={modal.type !== "edit"}
                title={modal.type !== "edit" ? "Guarda el curso primero para asignar instituciones" : undefined}
                className={`border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  activeTab === "instituciones" ? "border-primary-600 text-primary-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Instituciones
              </button>
            </div>

            {activeTab === "detalles" && (
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
                  className={`${inputClass} min-h-20 resize-y`}
                  placeholder="Descripcion del curso (opcional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Tipo de Programa</label>
                  <ComboInput
                    value={form.tipoPrograma}
                    onChange={(v) => setForm({ ...form, tipoPrograma: v })}
                    options={TIPOS_PROGRAMA}
                    className={inputClass}
                    placeholder="PAC, CERT, SDPC..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Bloque</label>
                  <input
                    type="number"
                    min={1}
                    value={form.bloque}
                    onChange={(e) => setForm({ ...form, bloque: e.target.value })}
                    className={inputClass}
                    placeholder="Ej. 1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Duración (horas) *</label>
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

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Finalidad</label>
                <ComboInput
                  value={form.finalidad}
                  onChange={(v) => setForm({ ...form, finalidad: v })}
                  options={finalidades ?? []}
                  className={inputClass}
                  placeholder="Finalidad del curso (opcional)"
                />
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
            )}

            {activeTab === "instituciones" && modal.type === "edit" && (
            <div>
              {/* Already assigned */}
              {cursoDetalle?.instituciones && cursoDetalle.instituciones.length > 0 && (
                <div className="border-b border-slate-100 px-5 py-4 space-y-2">
                  <p className="text-micro font-semibold uppercase tracking-widest text-slate-400">Asignaciones actuales</p>
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
                          onClick={() => setConfirmDesasignar({ id: ci.id, nombre: instData.nombre ?? `Institución #${ci.institucionId}` })}
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
            </div>
            )}
          </motion.div>
        </div>
      )}
      {/* Import CSV Modal */}
      {showImport && (
        <ImportarCSVModal
          titulo="Cursos"
          camposHeredables={[
            "bloque",
            "institucionResponsable",
            "finalidad",
            "modalidad",
            "fechaInicio",
            "fechaTermino",
            "horarioTexto",
            "duracionHoras",
            "fechaEvaluacion",
            "horarioEvaluacion",
            "duracionEvaluacion",
          ]}
          columnas={[
            { key: "bloque", label: "Bloque", ejemplo: "1" },
            { key: "numero", label: "No.", ejemplo: "1" },
            { key: "nombre", label: "Nombre del Curso", ejemplo: "Ética en el servicio público" },
            { key: "institucionResponsable", label: "Institución Responsable", ejemplo: "INAP" },
            { key: "finalidad", label: "Finalidad", ejemplo: "Fortalecer valores institucionales" },
            { key: "modalidad", label: "Modalidad", ejemplo: "presencial" },
            { key: "fechaInicio", label: "Fecha de Inicio", ejemplo: "2026-03-01" },
            { key: "fechaTermino", label: "Fecha de Término", ejemplo: "2026-03-15" },
            { key: "horarioTexto", label: "Horario", ejemplo: "09:00 - 13:00" },
            { key: "duracionHoras", label: "Duración (Horas)", ejemplo: "20" },
            { key: "fechaEvaluacion", label: "Fecha de Evaluación", ejemplo: "2026-03-20" },
            { key: "horarioEvaluacion", label: "Horario de Evaluación", ejemplo: "10:00 - 12:00" },
            { key: "duracionEvaluacion", label: "Duración de Evaluación", ejemplo: "2" },
          ]}
          onImportar={(registros) => importarCursosMut.mutateAsync({ registros })}
          onClose={() => setShowImport(false)}
          onSuccess={() => utils.cursos.listar.invalidate()}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={!!confirmDelete}
        title={confirmDelete?.type === "bulk" ? `Eliminar ${selected.size} cursos` : "Eliminar curso"}
        message={
          confirmDelete?.type === "bulk"
            ? `¿Eliminar ${selected.size} curso${selected.size > 1 ? "s" : ""} seleccionado${selected.size > 1 ? "s" : ""}? Esta acción no se puede deshacer.`
            : `¿Eliminar "${confirmDelete?.type === "single" ? confirmDelete.nombre : ""}"? Esta acción no se puede deshacer.`
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={eliminarCursoMut.isPending}
        onConfirm={() => {
          if (confirmDelete?.type === "single") {
            eliminarCursoMut.mutate({ id: confirmDelete.id }, {
              onSuccess: () => setConfirmDelete(null),
            });
          } else {
            eliminarSeleccionados();
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Confirm Desasignar Modal */}
      <ConfirmModal
        open={!!confirmDesasignar}
        title="Eliminar asignación"
        message={`¿Eliminar asignación de "${confirmDesasignar?.nombre ?? ""}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        loading={desasignarMut.isPending}
        onConfirm={() => {
          if (!confirmDesasignar) return;
          desasignarMut.mutate({ id: confirmDesasignar.id }, {
            onSuccess: () => setConfirmDesasignar(null),
          });
        }}
        onCancel={() => setConfirmDesasignar(null)}
      />
    </motion.div>
  );
}
