import { useState } from "react";
import {
  Plus,
  Trash2,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Scale,
  Loader2,
} from "lucide-react";
import type {
  BukuAjarKonteks,
  CpmkItem,
  IdentitasMK,
  InstrumenEvaluasi,
  SubCpmkItem,
} from "../types/rubrik";
import {
  BENTUK_ASESMEN_OPTIONS,
  createEmptyInstrumen,
} from "../utils/rubrikBuilder";

interface Step2InstrumentsProps {
  identitas: IdentitasMK;
  cpmkList: CpmkItem[];
  subCpmkList: SubCpmkItem[];
  bukuAjar: BukuAjarKonteks | null;
  instrumenList: InstrumenEvaluasi[];
  onInstrumenChange: (next: InstrumenEvaluasi[]) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function Step2Instruments({
  identitas,
  cpmkList,
  subCpmkList,
  bukuAjar,
  instrumenList,
  onInstrumenChange,
  onPrev,
  onNext,
}: Step2InstrumentsProps) {
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const totalBobot = instrumenList.reduce(
    (sum, item) => sum + (Number(item.bobot_persen) || 0),
    0
  );
  const isWeightExact = totalBobot === 100;

  const handleAddInstrumen = () => {
    const nextIdx = instrumenList.length + 1;
    const defaultCpmk = cpmkList[0]?.kode_cpmk || "CPMK-01";
    const defaultSub = subCpmkList[0]?.kode_sub_cpmk || "Sub-CPMK-01.1";
    onInstrumenChange([
      ...instrumenList,
      createEmptyInstrumen(nextIdx, defaultCpmk, defaultSub, 0),
    ]);
  };

  const handleRemoveInstrumen = (id: string) => {
    if (instrumenList.length <= 1) return;
    onInstrumenChange(instrumenList.filter((i) => i.id !== id));
  };

  const handleDistributeEvenly = () => {
    if (instrumenList.length === 0) return;
    const count = instrumenList.length;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    onInstrumenChange(
      instrumenList.map((item, idx) => ({
        ...item,
        bobot_persen: idx === 0 ? base + remainder : base,
      }))
    );
  };

  const handleGenerateWithAi = async () => {
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const response = await fetch("/api/gemini/generate-instruments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identitas_mk: identitas,
          daftar_cpmk: cpmkList,
          daftar_sub_cpmk: subCpmkList,
          konteks_buku_ajar: bukuAjar?.daftar_tiu_tkd ?? null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal merancang instrumen dengan AI.");
      }

      const generated = Array.isArray(data.instrumen) ? data.instrumen : [];
      if (generated.length === 0) {
        throw new Error("AI tidak mengembalikan daftar instrumen.");
      }

      const mapped: InstrumenEvaluasi[] = generated.map(
        (
          item: {
            kode_instrumen: string;
            nama_instrumen: string;
            bentuk_asesmen: string;
            kode_cpmk: string;
            kode_sub_cpmk: string;
            bobot_persen: number;
            minggu_pelaksanaan: string;
          },
          idx: number
        ) => {
          const base = createEmptyInstrumen(
            idx + 1,
            item.kode_cpmk || cpmkList[0]?.kode_cpmk || "CPMK-01",
            item.kode_sub_cpmk || subCpmkList[0]?.kode_sub_cpmk || "Sub-CPMK-01.1",
            Number(item.bobot_persen) || 20,
            item.kode_instrumen,
            item.bentuk_asesmen
          );
          return {
            ...base,
            nama_instrumen: item.nama_instrumen || base.nama_instrumen,
            minggu_pelaksanaan: item.minggu_pelaksanaan || base.minggu_pelaksanaan,
          };
        }
      );

      onInstrumenChange(mapped);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memanggil Gemini AI."
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0f172a]">
            02. Rancangan Instrumen Evaluasi &amp; Pembobotan (100%)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Petakan setiap instrumen evaluasi (Tugas, Kuis, Proyek CBL/PBL, UTS, UAS) ke CPMK &amp; Sub-CPMK agar Modul 4 &amp; Modul 5 dapat menghitung ketercapaian secara otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDistributeEvenly}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 text-[#0b3d91]" />
            <span>Ratakan Bobot 100%</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateWithAi}
            disabled={isGeneratingAi}
            className="px-4 py-2 rounded-lg bg-[#ffcc00] hover:bg-[#eab308] text-[#0f172a] text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            {isGeneratingAi ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>
              {isGeneratingAi
                ? "Merancang Paket Instrumen..."
                : "Rancang Paket Instrumen Otomatis (AI)"}
            </span>
          </button>
        </div>
      </div>

      {/* Weight Verification Bar */}
      <div
        className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
          isWeightExact
            ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
            : "bg-amber-50/70 border-amber-200 text-amber-900"
        }`}
      >
        <div className="flex items-center gap-2.5 text-sm font-medium">
          {isWeightExact ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          )}
          <span className="tabular-nums">
            Total Bobot Keseluruhan Instrumen: <strong>{totalBobot}%</strong> / 100% —{" "}
            {isWeightExact
              ? "Sesuai standar bobot RPS (Siap untuk Modul 4)."
              : totalBobot < 100
              ? `Kurang ${100 - totalBobot}% lagi untuk mencapai 100%.`
              : `Melebihi ${totalBobot - 100}% dari batas 100%.`}
          </span>
        </div>

        <div className="w-full sm:w-56 h-2.5 bg-white/90 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all ${
              isWeightExact
                ? "bg-emerald-600"
                : totalBobot > 100
                ? "bg-red-600"
                : "bg-[#0b3d91]"
            }`}
            style={{ width: `${Math.min(totalBobot, 100)}%` }}
          />
        </div>
      </div>

      {aiError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{aiError}</span>
        </div>
      )}

      {/* Instruments Table */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="font-display text-base font-semibold text-[#0f172a]">
            Matriks Instrumen Evaluasi ({instrumenList.length} Kolom Penilaian Modul 4)
          </h3>
          <button
            type="button"
            onClick={handleAddInstrumen}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#0b3d91] transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Instrumen
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-3 w-28">Kode</th>
                <th className="py-2.5 px-3 min-w-[200px]">Nama Instrumen Evaluasi</th>
                <th className="py-2.5 px-3 w-44">Bentuk Asesmen</th>
                <th className="py-2.5 px-3 w-36">CPMK Terukur</th>
                <th className="py-2.5 px-3 w-44">Sub-CPMK Terukur</th>
                <th className="py-2.5 px-3 w-36">Waktu</th>
                <th className="py-2.5 px-3 w-24 text-right">Bobot (%)</th>
                <th className="py-2.5 px-3 w-12 text-center">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {instrumenList.map((ins, idx) => {
                const matchingSubs = subCpmkList.filter(
                  (s) => s.kode_cpmk === ins.kode_cpmk
                );
                const subOptions = matchingSubs.length > 0 ? matchingSubs : subCpmkList;

                return (
                  <tr key={ins.id} className="align-top hover:bg-slate-50/50">
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={ins.kode_instrumen}
                        onChange={(e) => {
                          const next = [...instrumenList];
                          next[idx] = { ...ins, kode_instrumen: e.target.value };
                          onInstrumenChange(next);
                        }}
                        placeholder="TGS-01"
                        className="w-full h-9 px-2.5 rounded-md border border-slate-300 text-xs font-mono font-semibold text-[#0b3d91] focus:outline-none focus:border-[#0b3d91]"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={ins.nama_instrumen}
                        onChange={(e) => {
                          const next = [...instrumenList];
                          next[idx] = { ...ins, nama_instrumen: e.target.value };
                          onInstrumenChange(next);
                        }}
                        placeholder="Nama tugas / proyek / ujian"
                        className="w-full h-9 px-2.5 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
                      />
                    </td>
                    <td className="p-2.5">
                      <select
                        value={ins.bentuk_asesmen}
                        onChange={(e) => {
                          const next = [...instrumenList];
                          next[idx] = { ...ins, bentuk_asesmen: e.target.value };
                          onInstrumenChange(next);
                        }}
                        className="w-full h-9 px-2 rounded-md border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0b3d91]"
                      >
                        {BENTUK_ASESMEN_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        {!BENTUK_ASESMEN_OPTIONS.includes(ins.bentuk_asesmen) && (
                          <option value={ins.bentuk_asesmen}>{ins.bentuk_asesmen}</option>
                        )}
                      </select>
                    </td>
                    <td className="p-2.5">
                      <select
                        value={ins.kode_cpmk}
                        onChange={(e) => {
                          const newCpmk = e.target.value;
                          const firstSub =
                            subCpmkList.find((s) => s.kode_cpmk === newCpmk)?.kode_sub_cpmk ||
                            ins.kode_sub_cpmk;
                          const next = [...instrumenList];
                          next[idx] = {
                            ...ins,
                            kode_cpmk: newCpmk,
                            kode_sub_cpmk: firstSub,
                          };
                          onInstrumenChange(next);
                        }}
                        className="w-full h-9 px-2 rounded-md border border-slate-300 text-xs font-mono text-slate-800 bg-white focus:outline-none focus:border-[#0b3d91]"
                      >
                        {cpmkList.map((c) => (
                          <option key={c.kode_cpmk} value={c.kode_cpmk}>
                            {c.kode_cpmk}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2.5">
                      <select
                        value={ins.kode_sub_cpmk}
                        onChange={(e) => {
                          const newSub = e.target.value;
                          const next = [...instrumenList];
                          next[idx] = {
                            ...ins,
                            kode_sub_cpmk: newSub,
                            indikator_rubrik: ins.indikator_rubrik.map((k) => ({
                              ...k,
                              kode_sub_cpmk: newSub,
                            })),
                          };
                          onInstrumenChange(next);
                        }}
                        className="w-full h-9 px-2 rounded-md border border-slate-300 text-xs font-mono text-slate-800 bg-white focus:outline-none focus:border-[#0b3d91]"
                      >
                        {subOptions.map((s) => (
                          <option key={s.kode_sub_cpmk} value={s.kode_sub_cpmk}>
                            {s.kode_sub_cpmk}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={ins.minggu_pelaksanaan}
                        onChange={(e) => {
                          const next = [...instrumenList];
                          next[idx] = { ...ins, minggu_pelaksanaan: e.target.value };
                          onInstrumenChange(next);
                        }}
                        placeholder="Minggu ke-4"
                        className="w-full h-9 px-2.5 rounded-md border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-[#0b3d91]"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={ins.bobot_persen}
                        onChange={(e) => {
                          const next = [...instrumenList];
                          next[idx] = {
                            ...ins,
                            bobot_persen: Number(e.target.value) || 0,
                          };
                          onInstrumenChange(next);
                        }}
                        className="w-full h-9 px-2.5 rounded-md border border-slate-300 text-xs font-mono tabular-nums text-right font-semibold text-slate-900 focus:outline-none focus:border-[#0b3d91]"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveInstrumen(ins.id)}
                        disabled={instrumenList.length <= 1}
                        title="Hapus instrumen"
                        className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrev}
          className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Langkah 1</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-5 py-2.5 rounded-lg bg-[#0b3d91] hover:bg-[#092f73] text-white text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <span>Lanjut ke Langkah 3: Matriks Rubrik Analitis</span>
          <ArrowRight className="w-4 h-4 text-[#ffcc00]" />
        </button>
      </div>
    </div>
  );
}
