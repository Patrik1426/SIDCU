import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface BuscadorEvaluadorProps {
  onElegir: (userId: number, nombre: string) => void;
  placeholder?: string;
}

// Mismo look que ComboInput, pero busca en el servidor en vez de filtrar una
// lista precargada -- ComboInput carga TODAS las opciones al cliente, no
// escala a miles de personas (ver spec, seccion "Frontend admin").
export default function BuscadorEvaluador({ onElegir, placeholder }: BuscadorEvaluadorProps) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: resultados } = trpc.promocion.buscarEvaluador.useQuery(
    { q },
    { enabled: q.length >= 2 },
  );

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
              key={r.userId}
              type="button"
              onClick={() => { onElegir(r.userId!, r.nombreCompleto); setQ(""); setOpen(false); }}
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
