import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { UploadCloud, FileCheck2, RotateCcw, X } from "lucide-react";
import { MAX_PDF_BYTES, TIPO_PDF } from "@shared/const";

type Estado =
  | { tipo: "idle" }
  | { tipo: "subiendo"; archivo: File; progreso: number; factorId: number }
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
  // Input persistente fuera de las ramas de estado -- si viviera solo dentro
  // del JSX de "idle", React lo desmonta al cambiar de estado y el ref queda
  // null, dejando "Elegir otro archivo"/"Reemplazar" sin efecto (bug real
  // encontrado en revisión de Task 8).
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>(
    archivoActual ? { tipo: "completado", nombreOriginal: archivoActual.nombreOriginal } : { tipo: "idle" },
  );

  const presignarMut = trpc.inconformidad.presignarSubida.useMutation();
  const confirmarMut = trpc.inconformidad.confirmarSubida.useMutation();

  async function reintentarConfirmacion(archivo: File, archivoId: number) {
    setEstado({ tipo: "confirmando", archivo });
    try {
      await confirmarMut.mutateAsync({ factorId, archivoId });
      setEstado({ tipo: "completado", nombreOriginal: archivo.name });
      toast.success("PDF subido correctamente");
      onSubido();
    } catch (err: any) {
      setEstado({
        tipo: "error",
        mensaje: err.message ?? "No se pudo confirmar la subida",
        recuperable: true,
        archivo,
        retomar: () => reintentarConfirmacion(archivo, archivoId),
      });
    }
  }

  async function iniciarSubida(archivo: File) {
    if (archivo.type !== TIPO_PDF) {
      setEstado({ tipo: "error", mensaje: "Solo se aceptan archivos PDF.", recuperable: false, archivo: null, retomar: null });
      return;
    }
    if (archivo.size > MAX_PDF_BYTES) {
      setEstado({ tipo: "error", mensaje: "El archivo excede el límite de 10MB.", recuperable: false, archivo: null, retomar: null });
      return;
    }

    // Variables locales (no estado de React) para saber, dentro del mismo
    // catch, exactamente hasta donde llego el intento -- evita el bug de
    // closure obsoleto que tenia la version anterior (leia `estado` de render,
    // nunca se actualizaba a tiempo dentro de la misma llamada async).
    let archivoIdActual: number | undefined;
    let putTerminado = false;

    setEstado({ tipo: "subiendo", archivo, progreso: 0, factorId });
    try {
      const { archivoId, url } = await presignarMut.mutateAsync({
        factorId, nombreOriginal: archivo.name, tipoArchivo: TIPO_PDF, tamanoBytes: archivo.size,
      });
      archivoIdActual = archivoId;

      await subirConProgreso(url, archivo, (pct) =>
        setEstado((prev) => (prev.tipo === "subiendo" ? { ...prev, progreso: pct } : prev)),
      );
      putTerminado = true;
      setEstado({ tipo: "confirmando", archivo });

      await confirmarMut.mutateAsync({ factorId, archivoId }); // s3Key ya no se manda -- el router lo lee de la DB (fix de seguridad de Task 6, ver ledger)
      setEstado({ tipo: "completado", nombreOriginal: archivo.name });
      toast.success("PDF subido correctamente");
      onSubido();
    } catch (err: any) {
      if (putTerminado && archivoIdActual !== undefined) {
        // El PUT a S3 ya termino -- solo fallo confirmarSubida. Reintentar
        // NO debe resubir el archivo, solo reintentar la confirmacion con el
        // mismo archivoId ya emitido.
        setEstado({
          tipo: "error",
          mensaje: err.message ?? "No se pudo confirmar la subida",
          recuperable: true,
          archivo,
          retomar: () => reintentarConfirmacion(archivo, archivoIdActual!),
        });
      } else {
        setEstado({
          tipo: "error",
          mensaje: err.message ?? "No se pudo subir el archivo",
          recuperable: true,
          archivo,
          retomar: () => iniciarSubida(archivo),
        });
      }
    }
  }

  function elegirArchivo() {
    inputRef.current?.click();
  }

  let contenido: React.ReactNode;

  if (estado.tipo === "completado") {
    contenido = (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <FileCheck2 size={16} className="shrink-0" />
        <span className="flex-1 truncate">{estado.nombreOriginal}</span>
        <button type="button" onClick={elegirArchivo} className="shrink-0 text-xs font-semibold underline">
          Reemplazar
        </button>
      </div>
    );
  } else if (estado.tipo === "subiendo" || estado.tipo === "confirmando") {
    const progreso = estado.tipo === "subiendo" ? estado.progreso : 100;
    contenido = (
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
  } else if (estado.tipo === "error") {
    contenido = (
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
          <button type="button" onClick={elegirArchivo} className="mt-2 text-xs font-semibold underline">
            Elegir otro archivo
          </button>
        )}
      </div>
    );
  } else {
    contenido = (
      <label
        htmlFor="subida-pdf-input"
        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-3 py-3 text-sm font-medium text-slate-500 hover:border-primary-300 hover:text-primary-600"
      >
        <UploadCloud size={16} />
        Subir PDF de respaldo (opcional, máx. 10MB)
      </label>
    );
  }

  return (
    <div>
      {contenido}
      <input
        id="subida-pdf-input"
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
    </div>
  );
}
