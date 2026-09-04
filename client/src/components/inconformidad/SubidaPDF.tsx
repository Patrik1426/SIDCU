import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { UploadCloud, FileCheck2, RotateCcw, X } from "lucide-react";
import { MAX_PDF_BYTES, TIPO_PDF } from "@shared/const";

type Estado =
  | { tipo: "idle" }
  | { tipo: "subiendo"; archivo: File; progreso: number; putListo: boolean; factorId: number; archivoId?: number; s3Key?: string }
  | { tipo: "confirmando"; archivo: File }
  | { tipo: "error"; mensaje: string; recuperable: boolean; archivo: File | null; retomar: (() => void) | null }
  | { tipo: "completado"; nombreOriginal: string };

function subirConProgreso(url: string, archivo: File, onProgreso: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", TIPO_PDF);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgreso(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`PUT falló: ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Error de red durante la subida"));
    xhr.send(archivo);
  });
}

export default function SubidaPDF({
  factorId,
  archivoActual,
  onSubido,
}: {
  factorId: number;
  archivoActual: { nombreOriginal: string } | null;
  onSubido: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>(
    archivoActual ? { tipo: "completado", nombreOriginal: archivoActual.nombreOriginal } : { tipo: "idle" },
  );

  const presignarMut = trpc.inconformidad.presignarSubida.useMutation();
  const confirmarMut = trpc.inconformidad.confirmarSubida.useMutation();

  async function iniciarSubida(archivo: File) {
    if (archivo.type !== TIPO_PDF) {
      setEstado({ tipo: "error", mensaje: "Solo se aceptan archivos PDF.", recuperable: false, archivo: null, retomar: null });
      return;
    }
    if (archivo.size > MAX_PDF_BYTES) {
      setEstado({ tipo: "error", mensaje: "El archivo excede el límite de 10MB.", recuperable: false, archivo: null, retomar: null });
      return;
    }

    setEstado({ tipo: "subiendo", archivo, progreso: 0, putListo: false, factorId });
    try {
      const { archivoId, url, s3Key } = await presignarMut.mutateAsync({
        factorId, nombreOriginal: archivo.name, tipoArchivo: TIPO_PDF, tamanoBytes: archivo.size,
      });
      setEstado({ tipo: "subiendo", archivo, progreso: 0, putListo: false, factorId, archivoId, s3Key });

      await subirConProgreso(url, archivo, (pct) =>
        setEstado((prev) => (prev.tipo === "subiendo" ? { ...prev, progreso: pct } : prev)),
      );
      setEstado({ tipo: "confirmando", archivo });

      await confirmarMut.mutateAsync({ factorId, archivoId }); // s3Key ya no se manda -- el router lo lee de la DB (fix de seguridad de Task 6, ver ledger)
      setEstado({ tipo: "completado", nombreOriginal: archivo.name });
      toast.success("PDF subido correctamente");
      onSubido();
    } catch (err: any) {
      const putYaTermino = estado.tipo === "subiendo" && estado.putListo;
      setEstado({
        tipo: "error",
        mensaje: err.message ?? "No se pudo subir el archivo",
        recuperable: true,
        archivo,
        retomar: () => iniciarSubida(archivo),
      });
      void putYaTermino;
    }
  }

  if (estado.tipo === "completado") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <FileCheck2 size={16} className="shrink-0" />
        <span className="flex-1 truncate">{estado.nombreOriginal}</span>
        <button
          type="button"
          onClick={() => {
            setEstado({ tipo: "idle" });
            inputRef.current?.click();
          }}
          className="shrink-0 text-xs font-semibold underline"
        >
          Reemplazar
        </button>
      </div>
    );
  }

  if (estado.tipo === "subiendo" || estado.tipo === "confirmando") {
    const progreso = estado.tipo === "subiendo" ? estado.progreso : 100;
    return (
      <div role="status" aria-live="polite" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
        <div className="flex items-center justify-between text-slate-600">
          <span>{estado.tipo === "confirmando" ? "Confirmando..." : "Subiendo..."}</span>
          <span>{progreso}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${progreso}%` }} />
        </div>
      </div>
    );
  }

  if (estado.tipo === "error") {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        <div className="flex items-start justify-between gap-2">
          <span className="flex-1">{estado.mensaje}</span>
          <button type="button" onClick={() => setEstado({ tipo: "idle" })} className="shrink-0 text-rose-400 hover:text-rose-600">
            <X size={14} />
          </button>
        </div>
        {estado.recuperable && estado.retomar ? (
          <button
            type="button"
            onClick={estado.retomar}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold underline"
          >
            <RotateCcw size={12} /> Reintentar
          </button>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="mt-2 text-xs font-semibold underline">
            Elegir otro archivo
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-3 py-3 text-sm font-medium text-slate-500 hover:border-primary-300 hover:text-primary-600">
        <UploadCloud size={16} />
        Subir PDF de respaldo (opcional, máx. 10MB)
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) iniciarSubida(archivo);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
