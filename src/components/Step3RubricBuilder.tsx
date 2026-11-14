import { useState } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  Wand2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Scale,
  BookOpen,
} from "lucide-react";
import type {
  BukuAjarKonteks,
  CpmkItem,
  IdentitasMK,
  IndikatorRubrik,
  InstrumenEvaluasi,
  SkalaRubrikItem,
  SubCpmkItem,
} from "../types/rubrik";
import { buildTingkatanSkor } from "../lib/supabase";
import {
  TAKSONOMI_BLOOM_OPTIONS,
  createEmptyKisiKisi,
  createEmptyKriteria,
} from "../utils/rubrikBuilder";

interface Step3RubricBuilderProps {
  identitas: IdentitasMK;
  cpmkList: CpmkItem[];
  subCpmkList: SubCpmkItem[];
  bukuAjar: BukuAjarKonteks | null;
  skala: SkalaRubrikItem[];
  onSkalaChange: (next: SkalaRubrikItem[]) => void;
  instrumenList: InstrumenEvaluasi[];
  onInstrumenChange: (next: InstrumenEvaluasi[]) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function Step3RubricBuilder({
  identitas,
  cpmkList,
  subCpmkList,
  bukuAjar,
  skala,
  onSkalaChange,
  instrumenList,
  onInstrumenChange,
  onPrev,
  onNext,
}: Step3RubricBuilderProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
  const [refiningKritId, setRefiningKritId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const safeIdx = Math.min(selectedIdx, Math.max(instrumenList.length - 1, 0));
  const activeIns = instrumenList[safeIdx];

  if (!activeIns) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <p className="text-sm text-slate-600">Belum ada instrumen evaluasi pada Langkah 2.</p>
      </div>
    );
  }

  const linkedCpmk = cpmkList.find((c) => c.kode_cpmk === activeIns.kode_cpmk);
  const linkedSub = subCpmkList.find((s) => s.kode_sub_cpmk === activeIns.kode_sub_cpmk);

  const totalKriteriaBobot = activeIns.indikator_rubrik.reduce(
    (s, k) => s + (Number(k.bobot_kriteria) || 0),
    0
  );

  const updateActiveInstrument = (updater: (ins: InstrumenEvaluasi) => InstrumenEvaluasi) => {
    onInstrumenChange(
      instrumenList.map((item, idx) => (idx === safeIdx ? updater(item) : item))
    );
  };

  const handleRatakanBobotKriteria = () => {
    const count = activeIns.indikator_rubrik.length;
    if (count === 0) return;
    const base = Math.floor(100 / count);
    const rem = 100 - base * count;
    updateActiveInstrument((ins) => ({
      ...ins,
      indikator_rubrik: ins.indikator_rubrik.map((k, idx) => ({
        ...k,
        bobot_kriteria: idx === 0 ? base + rem : base,
      })),
    }));
  };

  const handleGenerateRubricAi = async () => {
    setIsGeneratingRubric(true);
    setAiError(null);
    try {
      const response = await fetch("/api/gemini/generate-rubric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identitas_mk: identitas,
          instrumen: activeIns,
          cpmk: linkedCpmk,
          sub_cpmk: linkedSub,
          konteks_buku_ajar: bukuAjar?.daftar_tiu_tkd ?? null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menghasilkan rubrik dengan AI.");
      }

      const rawKisi = Array.isArray(data.kisi_kisi_soal) ? data.kisi_kisi_soal : [];
      const rawRubrik = Array.isArray(data.indikator_rubrik) ? data.indikator_rubrik : [];

      updateActiveInstrument((ins) => ({
        ...ins,
        kisi_kisi_soal:
          rawKisi.length > 0
            ? rawKisi.map(
                (
                  k: {
                    nomor_butir: number;
                    topik_tiu_tkd: string;
                    indikator_soal: string;
                    level_kognitif: string;
                    pertanyaan_atau_tugas: string;
                    bobot_butir: number;
                  },
                  kIdx: number
                ) => ({
                  id: `kisi-ai-${Date.now()}-${kIdx}`,
                  nomor_butir: Number(k.nomor_butir) || kIdx + 1,
                  topik_tiu_tkd: k.topik_tiu_tkd || "",
                  indikator_soal: k.indikator_soal || "",
                  level_kognitif: k.level_kognitif || linkedSub?.taksonomi_bloom || "C4",
                  pertanyaan_atau_tugas: k.pertanyaan_atau_tugas || "",
                  bobot_butir: Number(k.bobot_butir) || 50,
                })
              )
            : ins.kisi_kisi_soal,
        indikator_rubrik:
          rawRubrik.length > 0
            ? rawRubrik.map(
                (
                  r: {
                    kode_kriteria: string;
                    nama_kriteria: string;
                    bobot_kriteria: number;
                    skor_4: string;
                    skor_3: string;
                    skor_2: string;
                    skor_1: string;
                  },
                  rIdx: number
                ): IndikatorRubrik => {
                  const deskriptor = {
                    "4": r.skor_4 || "",
                    "3": r.skor_3 || "",
                    "2": r.skor_2 || "",
                    "1": r.skor_1 || "",
                  };
                  return {
                    id: `krit-ai-${Date.now()}-${rIdx}`,
                    kode_kriteria: r.kode_kriteria || `KRIT-0${rIdx + 1}`,
                    nama_kriteria: r.nama_kriteria || "Kriteria",
                    bobot_kriteria: Number(r.bobot_kriteria) || 25,
                    kode_sub_cpmk: ins.kode_sub_cpmk,
                    deskriptor,
                    tingkatan_skor: buildTingkatanSkor(deskriptor, skala),
                  };
                }
              )
            : ins.indikator_rubrik,
      }));
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memanggil Gemini AI."
      );
    } finally {
      setIsGeneratingRubric(false);
    }
  };

  const handleRefineDescriptorAi = async (krit: IndikatorRubrik) => {
    setRefiningKritId(krit.id);
    setAiError(null);
    try {
      const response = await fetch("/api/gemini/refine-descriptor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_kriteria: krit.nama_kriteria || "Kriteria Penilaian",
          deskripsi_sub_cpmk: linkedSub?.deskripsi_sub_cpmk || "",
          bentuk_asesmen: activeIns.bentuk_asesmen,
          deskriptor_saat_ini: krit.deskriptor,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gagal menyempurnakan deskriptor.");
      }
      const nextDeskriptor = {
        "4": data.skor_4 || krit.deskriptor["4"],
        "3": data.skor_3 || krit.deskriptor["3"],
        "2": data.skor_2 || krit.deskriptor["2"],
        "1": data.skor_1 || krit.deskriptor["1"],
      };
      updateActiveInstrument((ins) => ({
        ...ins,
        indikator_rubrik: ins.indikator_rubrik.map((item) =>
          item.id === krit.id
            ? {
                ...item,
                deskriptor: nextDeskriptor,
                tingkatan_skor: buildTingkatanSkor(nextDeskriptor, skala),
              }
            : item
        ),
      }));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Gagal memanggil Gemini AI.");
    } finally {
      setRefiningKritId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0f172a]">
            03. Penyusunan Kisi-Kisi Soal &amp; Matriks Rubrik Analitis
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Lengkapi butir soal/tugas dan deskriptor bergradasi Skala 4 untuk setiap instrumen evaluasi.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateRubricAi}
          disabled={isGeneratingRubric}
          className="px-4 py-2.5 rounded-lg bg-[#ffcc00] hover:bg-[#eab308] text-[#0f172a] text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
        >
          {isGeneratingRubric ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>
            {isGeneratingRubric
              ? "Menyusun Soal & Rubrik..."
              : `Generate Kisi-Kisi & Rubrik (${activeIns.kode_instrumen}) dengan AI`}
          </span>
        </button>
      </div>

      {aiError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{aiError}</span>
        </div>
      )}

      {/* Two-Zone Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Instrument Selector */}
        <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 space-y-2">
          <h3 className="font-display text-xs font-bold text-slate-500 uppercase tracking-wider px-2 pb-1">
            Daftar Instrumen ({instrumenList.length})
          </h3>
          <div className="space-y-1.5">
            {instrumenList.map((ins, idx) => {
              const isSelected = idx === safeIdx;
              const sumKrit = ins.indikator_rubrik.reduce(
                (s, k) => s + (Number(k.bobot_kriteria) || 0),
                0
              );
              const hasFilled = ins.indikator_rubrik.some(
                (k) => k.nama_kriteria.trim() !== "" && k.deskriptor["4"].trim() !== ""
              );
              return (
                <button
                  key={ins.id}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#0b3d91] text-white border-[#0b3d91]"
                      : "bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-mono text-xs font-bold ${
                        isSelected ? "text-[#ffcc00]" : "text-[#0b3d91]"
                      }`}
                    >
                      {ins.kode_instrumen}
                    </span>
                    <span className="font-mono text-xs tabular-nums">
                      {ins.bobot_persen}%
                    </span>
                  </div>
                  <p className="text-xs font-medium mt-1 truncate">{ins.nama_instrumen}</p>
                  <div
                    className={`mt-1.5 flex items-center justify-between text-[11px] ${
                      isSelected ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    <span className="font-mono truncate">{ins.kode_sub_cpmk}</span>
                    <span className="tabular-nums shrink-0">
                      {hasFilled ? `${ins.indikator_rubrik.length} Krit · ${sumKrit}%` : "Draf"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Workspace */}
        <div className="lg:col-span-9 space-y-6">
          {/* Active Instrument Context Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-[#0b3d91]">
                    {activeIns.kode_instrumen}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeIns.bentuk_asesmen}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">Bobot MK: {activeIns.bobot_persen}%</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeIns.minggu_pelaksanaan}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#0f172a] mt-1">
                  {activeIns.nama_instrumen}
                </h3>
              </div>

              <div className="text-xs text-right">
                <div className="font-mono font-semibold text-[#0b3d91]">
                  {activeIns.kode_cpmk} / {activeIns.kode_sub_cpmk}
                </div>
                <div className="text-slate-500 mt-0.5 max-w-sm">
                  {linkedSub?.deskripsi_sub_cpmk || "Sub-CPMK terukur pada instrumen ini"}
                </div>
              </div>
            </div>
          </div>

          {/* Section A: Kisi-Kisi & Butir Soal */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="font-display text-base font-semibold text-[#0f172a]">
                  A. Kisi-Kisi &amp; Butir Soal / Instruksi Tugas
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rincian soal atau skenario tugas terhubung ke TIU/TKD dan Sub-CPMK.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateActiveInstrument((ins) => ({
                    ...ins,
                    kisi_kisi_soal: [
                      ...ins.kisi_kisi_soal,
                      createEmptyKisiKisi(ins.kisi_kisi_soal.length + 1),
                    ],
                  }))
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#0b3d91] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Butir Soal
              </button>
            </div>

            <div className="space-y-4">
              {activeIns.kisi_kisi_soal.map((kisi, kIdx) => (
                <div
                  key={kisi.id}
                  className="border border-slate-200 rounded-lg p-4 bg-slate-50/40 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-xs font-bold text-[#0b3d91]">
                      Butir #{kisi.nomor_butir}
                    </span>

                    <div className="flex items-center gap-2">
                      {bukuAjar && bukuAjar.daftar_tiu_tkd.length > 0 && (
                        <select
                          value=""
                          onChange={(e) => {
                            const selectedBab = bukuAjar.daftar_tiu_tkd[Number(e.target.value)];
                            if (!selectedBab) return;
                            updateActiveInstrument((ins) => ({
                              ...ins,
                              kisi_kisi_soal: ins.kisi_kisi_soal.map((item, idx) =>
                                idx === kIdx
                                  ? {
                                      ...item,
                                      topik_tiu_tkd: `${selectedBab.bab}: ${selectedBab.judul_bab}`,
                                      indikator_soal: selectedBab.tkd !== "-" ? selectedBab.tkd : selectedBab.tiu,
                                    }
                                  : item
                              ),
                            }));
                          }}
                          className="h-8 px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-700 max-w-[240px]"
                        >
                          <option value="">Ambil Topik Modul 2 (Buku Ajar)...</option>
                          {bukuAjar.daftar_tiu_tkd.map((t, tIdx) => (
                            <option key={tIdx} value={tIdx}>
                              {t.bab} — {t.judul_bab}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (activeIns.kisi_kisi_soal.length <= 1) return;
                          updateActiveInstrument((ins) => ({
                            ...ins,
                            kisi_kisi_soal: ins.kisi_kisi_soal.filter((_, idx) => idx !== kIdx),
                          }));
                        }}
                        disabled={activeIns.kisi_kisi_soal.length <= 1}
                        className="p-1.5 rounded text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Topik / TIU-TKD
                      </label>
                      <input
                        type="text"
                        value={kisi.topik_tiu_tkd}
                        onChange={(e) =>
                          updateActiveInstrument((ins) => ({
                            ...ins,
                            kisi_kisi_soal: ins.kisi_kisi_soal.map((item, idx) =>
                              idx === kIdx ? { ...item, topik_tiu_tkd: e.target.value } : item
                            ),
                          }))
                        }
                        placeholder="Topik bahasan / TKD"
                        className="w-full h-9 px-2.5 rounded-md border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#0b3d91]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Level Kognitif (Bloom)
                      </label>
                      <select
                        value={kisi.level_kognitif}
                        onChange={(e) =>
                          updateActiveInstrument((ins) => ({
                            ...ins,
                            kisi_kisi_soal: ins.kisi_kisi_soal.map((item, idx) =>
                              idx === kIdx ? { ...item, level_kognitif: e.target.value } : item
                            ),
                          }))
                        }
                        className="w-full h-9 px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0b3d91]"
                      >
                        {TAKSONOMI_BLOOM_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        {!TAKSONOMI_BLOOM_OPTIONS.includes(kisi.level_kognitif) && (
                          <option value={kisi.level_kognitif}>{kisi.level_kognitif}</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Bobot Butir (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={kisi.bobot_butir}
                        onChange={(e) =>
                          updateActiveInstrument((ins) => ({
                            ...ins,
                            kisi_kisi_soal: ins.kisi_kisi_soal.map((item, idx) =>
                              idx === kIdx
                                ? { ...item, bobot_butir: Number(e.target.value) || 0 }
                                : item
                            ),
                          }))
                        }
                        className="w-full h-9 px-2.5 rounded-md border border-slate-300 bg-white text-xs font-mono tabular-nums text-right text-slate-900 focus:outline-none focus:border-[#0b3d91]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Indikator Soal
                      </label>
                      <textarea
                        rows={2}
                        value={kisi.indikator_soal}
                        onChange={(e) =>
                          updateActiveInstrument((ins) => ({
                            ...ins,
                            kisi_kisi_soal: ins.kisi_kisi_soal.map((item, idx) =>
                              idx === kIdx ? { ...item, indikator_soal: e.target.value } : item
                            ),
                          }))
                        }
                        placeholder="Mahasiswa mampu menganalisis..."
                        className="w-full p-2 rounded-md border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#0b3d91]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Redaksi Pertanyaan / Instruksi Penugasan
                      </label>
                      <textarea
                        rows={2}
                        value={kisi.pertanyaan_atau_tugas}
                        onChange={(e) =>
                          updateActiveInstrument((ins) => ({
                            ...ins,
                            kisi_kisi_soal: ins.kisi_kisi_soal.map((item, idx) =>
                              idx === kIdx
                                ? { ...item, pertanyaan_atau_tugas: e.target.value }
                                : item
                            ),
                          }))
                        }
                        placeholder="Tuliskan soal atau instruksi proyek/tugas mahasiswa..."
                        className="w-full p-2 rounded-md border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#0b3d91]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section B: Matriks Rubrik Analitis Skala 4 */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="font-display text-base font-semibold text-[#0f172a]">
                  B. Matriks Rubrik Analitis Bergradasi (Skala 4)
                </h4>
                <div className="flex items-center gap-2 text-xs mt-0.5">
                  {totalKriteriaBobot === 100 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium tabular-nums">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Total Bobot Kriteria: {totalKriteriaBobot}% (Valid)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-medium tabular-nums">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Total Bobot Kriteria: {totalKriteriaBobot}% (Target: 100%)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRatakanBobotKriteria}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5 text-[#0b3d91]" />
                  Ratakan Kriteria 100%
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateActiveInstrument((ins) => ({
                      ...ins,
                      indikator_rubrik: [
                        ...ins.indikator_rubrik,
                        createEmptyKriteria(
                          ins.indikator_rubrik.length + 1,
                          ins.kode_sub_cpmk,
                          skala
                        ),
                      ],
                    }))
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#0b3d91] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Kriteria
                </button>
              </div>
            </div>

            {/* Skala Header Configuration */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {skala.map((s, sIdx) => (
                <div
                  key={s.skor}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                >
                  <div className="flex items-center justify-between font-mono font-bold text-[#0b3d91] mb-1">
                    <span>Skor {s.skor}</span>
                    <input
                      type="text"
                      value={s.rentang_nilai}
                      onChange={(e) => {
                        const next = [...skala];
                        next[sIdx] = { ...s, rentang_nilai: e.target.value };
                        onSkalaChange(next);
                      }}
                      className="w-16 text-right bg-white border border-slate-200 rounded px-1 py-0.5 text-[11px] font-mono text-slate-700"
                    />
                  </div>
                  <input
                    type="text"
                    value={s.label}
                    onChange={(e) => {
                      const next = [...skala];
                      next[sIdx] = { ...s, label: e.target.value };
                      onSkalaChange(next);
                    }}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800"
                  />
                </div>
              ))}
            </div>

            {/* Criteria Matrix */}
            <div className="space-y-4">
              {activeIns.indikator_rubrik.map((krit, rIdx) => (
                <div
                  key={krit.id}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
                      <input
                        type="text"
                        value={krit.kode_kriteria}
                        onChange={(e) =>
                          updateActiveInstrument((ins) => ({
                            ...ins,
                            indikator_rubrik: ins.indikator_rubrik.map((item, idx) =>
                              idx === rIdx ? { ...item, kode_kriteria: e.target.value } : item
                            ),
                          }))
                        }
                        className="w-24 h-8 px-2 rounded border border-slate-300 bg-white font-mono text-xs font-bold text-[#0b3d91]"
                      />
                      <input
                        type="text"
                        value={krit.nama_kriteria}
                        onChange={(e) =>
                          updateActiveInstrument((ins) => ({
                            ...ins,
                            indikator_rubrik: ins.indikator_rubrik.map((item, idx) =>
                              idx === rIdx ? { ...item, nama_kriteria: e.target.value } : item
                            ),
                          }))
                        }
                        placeholder="Nama Kriteria (misal: Ketepatan Metodologi & Analisis)"
                        className="flex-1 min-w-[200px] h-8 px-2.5 rounded border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-xs text-slate-600">Bobot (%):</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={krit.bobot_kriteria}
                        onChange={(e) =>
                          updateActiveInstrument((ins) => ({
                            ...ins,
                            indikator_rubrik: ins.indikator_rubrik.map((item, idx) =>
                              idx === rIdx
                                ? { ...item, bobot_kriteria: Number(e.target.value) || 0 }
                                : item
                            ),
                          }))
                        }
                        className="w-16 h-8 px-2 rounded border border-slate-300 bg-white font-mono text-xs tabular-nums text-right font-semibold text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => handleRefineDescriptorAi(krit)}
                        disabled={refiningKritId === krit.id}
                        title="Perhalus deskriptor kriteria dengan AI Gemini"
                        className="h-8 px-2.5 rounded border border-[#0b3d91]/30 bg-white hover:bg-[#0b3d91]/5 text-[#0b3d91] text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {refiningKritId === krit.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Perhalus AI</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (activeIns.indikator_rubrik.length <= 1) return;
                          updateActiveInstrument((ins) => ({
                            ...ins,
                            indikator_rubrik: ins.indikator_rubrik.filter((_, idx) => idx !== rIdx),
                          }));
                        }}
                        disabled={activeIns.indikator_rubrik.length <= 1}
                        className="p-1.5 rounded text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 4-Level Descriptors Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white">
                    {skala.map((s) => {
                      const key = String(s.skor) as "4" | "3" | "2" | "1";
                      return (
                        <div key={s.skor} className="p-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#0f172a]">
                              Skor {s.skor}: {s.label}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                              {s.rentang_nilai}
                            </span>
                          </div>
                          <textarea
                            rows={4}
                            value={krit.deskriptor[key]}
                            onChange={(e) => {
                              const nextDesk = {
                                ...krit.deskriptor,
                                [key]: e.target.value,
                              };
                              updateActiveInstrument((ins) => ({
                                ...ins,
                                indikator_rubrik: ins.indikator_rubrik.map((item, idx) =>
                                  idx === rIdx
                                    ? {
                                        ...item,
                                        deskriptor: nextDesk,
                                        tingkatan_skor: buildTingkatanSkor(nextDesk, skala),
                                      }
                                    : item
                                ),
                              }));
                            }}
                            placeholder={`Deskriptor capaian tingkat ${s.label}...`}
                            className="w-full p-2 rounded border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-[#0b3d91]"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrev}
          className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Langkah 2</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-5 py-2.5 rounded-lg bg-[#0b3d91] hover:bg-[#092f73] text-white text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <span>Lanjut ke Langkah 4: Pratinjau &amp; Estafet Ekosistem</span>
          <ArrowRight className="w-4 h-4 text-[#ffcc00]" />
        </button>
      </div>
    </div>
  );
}
