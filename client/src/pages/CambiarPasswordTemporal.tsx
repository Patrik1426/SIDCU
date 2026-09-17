import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export default function CambiarPasswordTemporal({ onListo }: { onListo: () => void }) {
  const [password, setPassword] = useState("");
  const cambiarMut = trpc.auth.cambiarPasswordTemporal.useMutation({
    onSuccess: () => {
      toast.success("Contraseña actualizada");
      onListo();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-card-rest border border-gray-100 text-center">
        <KeyRound className="mx-auto h-10 w-10 text-primary-300" />
        <h1 className="mt-3 text-lg font-bold text-gray-900">Cambia tu contraseña temporal</h1>
        <p className="mt-1 text-sm text-gray-500">Fuiste dado de alta como evaluador. Antes de continuar, define una contraseña propia.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña (mínimo 8 caracteres)"
          className="mt-4 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        <button
          type="button"
          disabled={password.length < 8 || cambiarMut.isPending}
          onClick={() => cambiarMut.mutate({ nuevoPassword: password })}
          className="mt-4 w-full rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          Guardar y continuar
        </button>
      </div>
    </div>
  );
}
