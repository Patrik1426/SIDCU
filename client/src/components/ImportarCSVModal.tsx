import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileSpreadsheet, Download, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ImportarCSVModalProps {
  titulo: string;
  columnas: { key: string; label: string; ejemplo: string }[];
  onImportar: (registros: Record<string, any>[]) => Promise<{ totalProcesados: number; creados: number; errores: { fila: number; error: string }[] }>;
  onClose: () => void;
  onSuccess: () => void;
}

function limpiarTexto(text: string): string {
  return text
    .replace(/�/g, "")
    .replace(/Ã¡/g, "á").replace(/Ã©/g, "é").replace(/Ã­/g, "í").replace(/Ã³/g, "ó").replace(/Ãº/g, "ú")
    .replace(/Ã±/g, "ñ").replace(/Ã¼/g, "ü").replace(/Ã'/g, "Ñ")
    .replace(/Ã\x81/g, "Á").replace(/Ã\x89/g, "É").replace(/Ã\x8D/g, "Í").replace(/Ã\x93/g, "Ó").replace(/Ã\x9A/g, "Ú")
    .trim();
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]).map((h) => limpiarTexto(h.replace(/^"|"$/g, "")));
  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const values = splitCSVLine(line).map((v) => limpiarTexto(v.replace(/^"|"$/g, "")));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? "";
    });
    return obj;
  });
}

export default function ImportarCSVModal({ titulo, columnas, onImportar, onClose, onSuccess }: ImportarCSVModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Record<string, any>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ creados: number; errores: { fila: number; error: string }[] } | null>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      let text = e.target?.result as string;
      if (text.includes("�") || text.includes("Ã¡") || text.includes("Ã©")) {
        const readerLatin = new FileReader();
        readerLatin.onload = (e2) => {
          const textLatin = e2.target?.result as string;
          setPreview(parseCSV(textLatin));
        };
        readerLatin.readAsText(file, "latin1");
        return;
      }
      setPreview(parseCSV(text));
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) handleFile(file);
  };

  const handleImport = async () => {
    if (!preview?.length) return;
    setImporting(true);
    try {
      const res = await onImportar(preview);
      setResult({ creados: res.creados, errores: res.errores });
      if (res.creados > 0) {
        onSuccess();
        if (res.errores.length === 0) {
          setTimeout(onClose, 1000);
        }
      }
    } catch (err: any) {
      setResult({ creados: 0, errores: [{ fila: 0, error: err.message }] });
    } finally {
      setImporting(false);
    }
  };

  const descargarPlantilla = () => {
    const header = columnas.map((c) => c.key).join(",");
    const ejemplo = columnas.map((c) => c.ejemplo).join(",");
    const blob = new Blob([header + "\n" + ejemplo + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plantilla_${titulo.toLowerCase().replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-primary-500" />
            <h2 className="text-base font-bold text-slate-800">Importar {titulo}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Download template */}
          <button
            onClick={descargarPlantilla}
            className="flex items-center gap-2 rounded-xl border border-dashed border-primary-300 bg-primary-50/50 px-4 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors w-full justify-center"
          >
            <Download size={14} />
            Descargar plantilla CSV
          </button>

          {/* Drop zone */}
          {!preview && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center hover:border-primary-300 hover:bg-primary-50/30 transition-all"
            >
              <Upload size={28} className="text-slate-300" />
              <div>
                <p className="text-sm font-semibold text-slate-600">Arrastra tu archivo CSV aquí</p>
                <p className="text-xs text-slate-400 mt-1">o haz clic para seleccionar</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          )}

          {/* Column reference */}
          {!preview && (
            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
              <p className="text-micro font-semibold uppercase tracking-widest text-slate-400 mb-2">Columnas esperadas</p>
              <div className="grid grid-cols-2 gap-1.5">
                {columnas.map((c) => (
                  <div key={c.key} className="text-xs text-slate-600">
                    <span className="font-mono font-semibold text-slate-800">{c.key}</span>
                    <span className="text-slate-400"> — {c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {fileName} — {preview.length} registro{preview.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => { setPreview(null); setFileName(""); setResult(null); }}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  Cambiar archivo
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">#</th>
                      {columnas.map((c) => (
                        <th key={c.key} className="px-3 py-2 text-left font-semibold text-slate-500">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                        {columnas.map((c) => (
                          <td key={c.key} className="px-3 py-2 text-slate-700 max-w-37.5 truncate">
                            {row[c.key] ?? <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <p className="border-t border-slate-100 px-3 py-2 text-center text-micro text-slate-400">
                    ...y {preview.length - 10} más
                  </p>
                )}
              </div>
            </>
          )}

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                {result.creados > 0 && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                    <CheckCircle2 size={16} />
                    <span className="font-medium">{result.creados} registros importados correctamente</span>
                  </div>
                )}
                {result.errores.length > 0 && (
                  <div className="rounded-xl bg-rose-50 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
                      <AlertTriangle size={14} />
                      {result.errores.length} error{result.errores.length !== 1 ? "es" : ""}
                    </div>
                    {result.errores.slice(0, 5).map((err, i) => (
                      <p key={i} className="text-xs text-rose-600">
                        {err.fila > 0 ? `Fila ${err.fila}: ` : ""}{err.error}
                      </p>
                    ))}
                    {result.errores.length > 5 && (
                      <p className="text-xs text-rose-400">...y {result.errores.length - 5} más</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cerrar
          </button>
          {preview && !result?.creados && (
            <button
              onClick={handleImport}
              disabled={importing || !preview.length}
              className="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {importing ? "Importando..." : `Importar ${preview.length} registros`}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
