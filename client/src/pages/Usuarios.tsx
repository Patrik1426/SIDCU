import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Search, ChevronDown } from "lucide-react";

type User = {
  id: number;
  nombre: string;
  email: string;
  role: "admin" | "capturista" | "consultor" | "user";
  isActive: boolean;
  lastSignedIn: Date | null;
  createdAt: Date;
};

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "capturista", label: "Capturista" },
  { value: "consultor", label: "Consultor" },
  { value: "user", label: "Usuario" },
];

export default function Usuarios() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Redirect non-admin users
  if (user && user.role !== "admin") {
    navigate("/dashboard");
    return null;
  }

  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);

  const { data: usuarios = [], isLoading } = trpc.usuarios.listar.useQuery({
    search: search || undefined,
  });

  const cambiarRolMut = trpc.usuarios.cambiarRol.useMutation({
    onSuccess: () => {
      utils.usuarios.listar.invalidate();
      setDropdownOpen(null);
    },
  });

  const toggleActivoMut = trpc.usuarios.toggleActivo.useMutation({
    onSuccess: () => {
      utils.usuarios.listar.invalidate();
    },
  });

  const handleChangeRole = async (userId: number, newRole: string) => {
    await cambiarRolMut.mutateAsync({
      id: userId,
      role: newRole as "admin" | "capturista" | "consultor" | "user",
    });
  };

  const handleToggleActivo = async (userId: number) => {
    await toggleActivoMut.mutateAsync({ id: userId });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Nunca";
    return new Date(date).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleLabel = (role: string) => {
    const found = ROLES.find((r) => r.value === role);
    return found?.label || role;
  };

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="mt-2 text-gray-600">
              Administra roles y estado de usuarios del sistema
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Cargando usuarios...</div>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">
                  {search
                    ? "No se encontraron usuarios con ese criterio"
                    : "No hay usuarios registrados"}
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Última Conexión
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(usuarios as User[]).map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {u.nombre}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setDropdownOpen(
                                dropdownOpen === u.id ? null : u.id,
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            {getRoleLabel(u.role)}
                            <ChevronDown size={16} />
                          </button>

                          {dropdownOpen === u.id && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
                              {ROLES.map((role) => (
                                <button
                                  key={role.value}
                                  onClick={() =>
                                    handleChangeRole(u.id, role.value)
                                  }
                                  disabled={
                                    cambiarRolMut.isPending ||
                                    u.role === role.value
                                  }
                                  className={`block w-full px-4 py-2 text-left text-sm ${
                                    u.role === role.value
                                      ? "bg-primary-50 font-medium text-primary-700"
                                      : "text-gray-700 hover:bg-gray-50"
                                  } disabled:opacity-50`}
                                >
                                  {role.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            u.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {u.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(u.lastSignedIn)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleToggleActivo(u.id)}
                          disabled={toggleActivoMut.isPending}
                          className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium ${
                            u.isActive
                              ? "bg-red-100 text-red-700 hover:bg-red-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          } disabled:opacity-50`}
                        >
                          {u.isActive ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
