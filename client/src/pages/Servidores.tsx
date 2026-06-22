import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { ServidorForm, type ServidorFormData } from "@/components/ServidorForm";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { exportarExcel, exportarPDF } from "@/lib/exportar";

type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; id: number; data: Partial<ServidorFormData> };

const NIVELES = ["", "federal", "estatal", "municipal", "otro"];
const ESTATUS = ["", "activo", "inactivo"];
const GRUPOS = ["", "ADMO", "TECN", "SERV", "COMUN", "PROFE", "EDU"];

export default function Servidores() {
  const { user } = useAuth();
  const role = user?.role ?? "user";
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [dependencia, setDependencia] = useState("");
  const [nivel, setNivel] = useState("");
  const [estatus, setEstatus] = useState("");
  const [grupoFuncion, setGrupoFuncion] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>({ type: "closed" });

  const { data, isLoading } = trpc.servidores.listar.useQuery({
    search: search || undefined,
    dependencia: dependencia || undefined,
    nivel: nivel || undefined,
    estatus: estatus || undefined,
    grupoFuncion: grupoFuncion || undefined,
    page,
    limit: 20,
  });

  const crearMut = trpc.servidores.crear.useMutation({
    onSuccess: () => {
      utils.servidores.listar.invalidate();
      setModal({ type: "closed" });
    },
  });

  const actualizarMut = trpc.servidores.actualizar.useMutation({
    onSuccess: () => {
      utils.servidores.listar.invalidate();
      setModal({ type: "closed" });
    },
  });

  const eliminarMut = trpc.servidores.eliminar.useMutation({
    onSuccess: () => {
      utils.servidores.listar.invalidate();
    },
  });

  const canCreate = role === "admin" || role === "capturista";
  const canEdit = role === "admin";
  const canDelete = role === "admin";
  const canExport = role === "admin" || role === "consultor";

  const [exportando, setExportando] = useState<"excel" | "pdf" | null>(null);

  const handleExport = async (tipo: "excel" | "pdf") => {
    setExportando(tipo);
    try {
      const datos = await utils.servidores.exportarTodos.fetch({
        search: search || undefined,
        dependencia: dependencia || undefined,
        nivel: nivel || undefined,
        estatus: estatus || undefined,
        grupoFuncion: grupoFuncion || undefined,
      });
      if (datos && datos.length > 0) {
        if (tipo === "excel") {
          exportarExcel(datos as any);
        } else {
          exportarPDF(datos as any);
        }
      } else {
        alert("No hay datos para exportar");
      }
    } catch (err: any) {
      alert("Error al exportar: " + (err.message ?? "desconocido"));
    } finally {
      setExportando(null);
    }
  };

  const handleCreate = async (formData: ServidorFormData) => {
    await crearMut.mutateAsync({
      ...formData,
      fechaIngreso: new Date(formData.fechaIngreso),
      datosContacto: formData.datosContacto || null,
      observaciones: formData.observaciones || null,
    });
  };

  const handleEdit = async (formData: ServidorFormData) => {
    if (modal.type !== "edit") return;
    await actualizarMut.mutateAsync({
      id: modal.id,
      ...formData,
      fechaIngreso: new Date(formData.fechaIngreso),
      datosContacto: formData.datosContacto || null,
      observaciones: formData.observaciones || null,
    });
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar a "${nombre}"? Esta acción no se puede deshacer.`)) return;
    await eliminarMut.mutateAsync({ id });
  };

  const openEdit = (srv: any) => {
    setModal({
      type: "edit",
      id: srv.id,
      data: {
        nombreCompleto: srv.nombreCompleto,
        rfc: srv.rfc,
        curp: srv.curp,
        cargo: srv.cargo,
        dependencia: srv.dependencia,
        nivel: srv.nivel,
        fechaIngreso: srv.fechaIngreso
          ? new Date(srv.fechaIngreso).toISOString().split("T")[0]
          : "",
        datosContacto: srv.datosContacto ?? "",
        grupoFuncion: srv.grupoFuncion,
        estatus: srv.estatus,
        observaciones: srv.observaciones ?? "",
      },
    });
  };

  const inputClass =
    "rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20";

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Servidores Públicos
        </h1>
        <div className="flex gap-2">
          {canExport && (
            <>
              <button
                onClick={() => handleExport("excel")}
                disabled={exportando !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
              >
                <FileSpreadsheet size={16} />
                {exportando === "excel" ? "Exportando..." : "Excel"}
              </button>
              <button
                onClick={() => handleExport("pdf")}
                disabled={exportando !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
              >
                <FileText size={16} />
                {exportando === "pdf" ? "Exportando..." : "PDF"}
              </button>
            </>
          )}
          {canCreate && (
            <button
              onClick={() => setModal({ type: "create" })}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus size={16} />
              Nuevo Servidor
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className={`${inputClass} pl-9 w-full`}
          />
        </div>
        <input
          type="text"
          placeholder="Dependencia"
          value={dependencia}
          onChange={(e) => {
            setDependencia(e.target.value);
            setPage(1);
          }}
          className={`${inputClass} w-full`}
        />
        <select
          value={nivel}
          onChange={(e) => {
            setNivel(e.target.value);
            setPage(1);
          }}
          className={`${inputClass} w-full`}
        >
          <option value="">Todos los niveles</option>
          {NIVELES.filter(Boolean).map((n) => (
            <option key={n} value={n}>
              {n.charAt(0).toUpperCase() + n.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={estatus}
          onChange={(e) => {
            setEstatus(e.target.value);
            setPage(1);
          }}
          className={`${inputClass} w-full`}
        >
          <option value="">Todos los estatus</option>
          {ESTATUS.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={grupoFuncion}
          onChange={(e) => {
            setGrupoFuncion(e.target.value);
            setPage(1);
          }}
          className={`${inputClass} w-full`}
        >
          <option value="">Todos los grupos</option>
          {GRUPOS.filter(Boolean).map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">RFC</th>
              <th className="hidden px-4 py-3 md:table-cell">CURP</th>
              <th className="hidden px-4 py-3 lg:table-cell">Cargo</th>
              <th className="hidden px-4 py-3 lg:table-cell">Dependencia</th>
              <th className="px-4 py-3">Nivel</th>
              <th className="px-4 py-3">Estatus</th>
              {(canEdit || canDelete) && (
                <th className="px-4 py-3">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : !data?.items.length ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No se encontraron servidores públicos.
                </td>
              </tr>
            ) : (
              data.items.map((srv) => (
                <tr key={srv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {srv.nombreCompleto}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {srv.rfc}
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs md:table-cell">
                    {srv.curp}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {srv.cargo}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {srv.dependencia}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {srv.nivel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        srv.estatus === "activo"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {srv.estatus}
                    </span>
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {canEdit && (
                          <button
                            onClick={() => openEdit(srv)}
                            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() =>
                              handleDelete(srv.id, srv.nombreCompleto)
                            }
                            className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Paginación */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-gray-600">
            <span>
              Mostrando página {data.page} de {data.totalPages} ({data.total}{" "}
              resultados)
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.type !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {modal.type === "create"
                  ? "Nuevo Servidor Público"
                  : "Editar Servidor Público"}
              </h2>
              <button
                onClick={() => setModal({ type: "closed" })}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {crearMut.error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {crearMut.error.message}
              </div>
            )}
            {actualizarMut.error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {actualizarMut.error.message}
              </div>
            )}

            <ServidorForm
              initialData={modal.type === "edit" ? modal.data : undefined}
              onSubmit={modal.type === "create" ? handleCreate : handleEdit}
              onCancel={() => setModal({ type: "closed" })}
              loading={crearMut.isPending || actualizarMut.isPending}
              submitLabel={modal.type === "create" ? "Crear" : "Actualizar"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
