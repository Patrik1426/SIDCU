import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface BuscadorEvaluadorProps {
  // I2: correoPrellenado sigue la precedencia del spec (seccion 4) --
  // users.email -> correoSugerido -> servidoresPublicos.email -> null. El
  // caller decide que hacer si viene null (ej. Promocion.tsx cae a "").
  onElegir: (servidorId: number, nombre: string, correoPrellenado: string | null) => void;
  placeholder?: string;
  rol: "jefe" | "companero";
  // M4: a quien excluir de los resultados -- por defecto (sin pasar esto) el
  // backend excluye al propio llamante (ctx.user.id). El panel admin lo pasa
  // explicito para excluir al TRABAJADOR de la inscripcion, no al admin.
  excluirUserId?: number;
}

// Mismo look que ComboInput, pero busca en el servidor en vez de filtrar una
// lista precargada -- ComboInput carga TODAS las opciones al cliente, no
// escala a miles de personas (ver spec, seccion "Frontend admin"). Antes
// tambien soportaba una busqueda sin `rol` (todo el padron, para el admin) --
// se quito (M3, revision final de rama): esa variante (buscarEvaluador) ya no
// tenia ningun caller real, todos pasan rol y usan el pool curado.
export default function BuscadorEvaluador({ onElegir, placeholder, rol, excluirUserId }: BuscadorEvaluadorProps) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: resultados } = trpc.promocion.buscarEnPool.useQuery({ q, rol, excluirUserId }, { enabled: q.length >= 2 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? "Buscar por nombre o CURP..."}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
      {open && q.length >= 2 && resultados && resultados.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {resultados.map((r) => (
            <button
              key={r.servidorId}
              type="button"
              onClick={() => { onElegir(r.servidorId, r.nombreCompleto, r.correoPrellenado); setQ(""); setOpen(false); }}
              className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="font-medium text-slate-700">{r.nombreCompleto}</span>
              <span className="text-xs text-slate-400">{r.curp}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
