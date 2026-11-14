import { useState } from "react";
import {
  Printer,
  Download,
  Save,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { PayloadRubrik } from "../types/rubrik";
import { MODUL_4_BUKU_NILAI_URL } from "../lib/supabase";

interface Step4PreviewAndRelayProps {
  payloadRubrik: PayloadRubrik;
  selectedRpsId: string | null;
  onSaveOnly: () => Promise<{ ok: boolean; savedRpsId: string | null; error: string | null }>;
  onSaveAndRelay: () => Promise<{ ok: boolean; savedRpsId: string | null; error: string | null }>;
  onPrev: () => void;
}

export function Step4PreviewAndRelay({
  payloadRubrik,
  selectedRpsId,
  onSaveOnly,
  onSaveAndRelay,
  onPrev,
}: Step4PreviewAndRelayProps) {
  const [isSaving, setIsSaving] = useState<"only" | "relay" | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: "success" | "warning" | "error";
    message: string;
    relayUrl?: string;
  } | null>(null);

  const totalBobot = payloadRubrik.daftar_instrumen.reduce(
    (sum, i) => sum + (Number(i.bobot_persen) || 0),
    0
  );

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(payloadRubrik, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const codeSlug = (payloadRubrik.identitas_mk.kode_mk || "SIRUBRIK").replace(/\s+/g, "_");
    a.download = `payload_rubrik_${codeSlug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveOnlyClick = async () => {
    setIsSaving("only");
    setSaveFeedback(null);
    const res = await onSaveOnly();
    setIsSaving(null);

    if (res.ok) {
      setSaveFeedback({
        type: res.error ? "warning" : "success",
        message: res.error
          ? `Rubrik berhasil disimpan ke tabel obe_rubrik (${res.error})`
          : "Rubrik berhasil disimpan ke Supabase (obe_rubrik) dan status RPS diperbarui menjadi '3_rubrik_selesai'.",
      });
    } else {
      setSaveFeedback({
        type: "error",
        message: res.error || "Gagal menyimpan rubrik.",
      });
    }
  };

  const handleSaveAndRelayClick = async () => {
    setIsSaving("relay");
    setSaveFeedback(null);
    const res = await onSaveAndRelay();
    setIsSaving(null);

    const targetId = res.savedRpsId || selectedRpsId || "";
    const relayUrl = `${MODUL_4_BUKU_NILAI_URL}?rps_id=${encodeURIComponent(targetId)}`;

    if (res.ok) {
      setSaveFeedback({
        type: "success",
        message:
          "Rubrik berhasil disimpan ke ekosistem SIMPEL-OBE! Mengarahkan ke Modul 4 (Buku Nilai & Portofolio)...",
        relayUrl,
      });

      if (!MODUL_4_BUKU_NILAI_URL.includes("[MASUKKAN_")) {
        setTimeout(() => {
          window.location.href = relayUrl;
        }, 1200);
      }
    } else {
      setSaveFeedback({
        type: "error",
        message: res.error || "Gagal menyimpan rubrik sebelum estafet ke Modul 4.",
        relayUrl,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Control Bar */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0f172a]">
            04. Pratinjau Dokumen Resmi &amp; Estafet ke Modul 4
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Verifikasi keterhubungan instrumen terhadap CPMK/Sub-CPMK sebelum dikirim ke Modul 4 (Buku Nilai &amp; Portofolio).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#0b3d91]" />
            <span>Cetak / Ekspor PDF</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            className="px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#0b3d91]" />
            <span>Unduh JSON</span>
          </button>

          <button
            type="button"
            onClick={handleSaveOnlyClick}
            disabled={isSaving !== null}
            className="px-4 py-2.5 rounded-lg border border-[#0b3d91] bg-white hover:bg-[#0b3d91]/5 text-[#0b3d91] text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            {isSaving === "only" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Simpan Rubrik Saja (Tetap di SIRUBRIK)</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndRelayClick}
            disabled={isSaving !== null}
            className="px-5 py-2.5 rounded-lg bg-[#ffcc00] hover:bg-[#eab308] text-[#0f172a] border border-[#eab308] text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm cursor-pointer disabled:opacity-60"
          >
            {isSaving === "relay" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>Simpan Rubrik ke Ekosistem &amp; Lanjut ke Buku Nilai &amp; Portofolio →</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {saveFeedback && (
        <div
          className={`no-print rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
            saveFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : saveFeedback.type === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-red-50 border-red-200 text-red-900"
          }`}
        >
          <div className="flex items-start sm:items-center gap-2.5 text-sm font-medium">
            {saveFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <span>{saveFeedback.message}</span>
          </div>

          {saveFeedback.relayUrl && (
            <button
              type="button"
              onClick={() => {
                window.location.href = saveFeedback.relayUrl!;
              }}
              className="px-3.5 py-2 rounded-lg bg-[#0b3d91] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Buka Modul 4 ({saveFeedback.relayUrl})</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#ffcc00]" />
            </button>
          )}
        </div>
      )}

      {/* Printable Official Document */}
      <article className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-8">
        {/* Official Unpatti Document Header */}
        <div className="border-b-2 border-[#0b3d91] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#0b3d91] uppercase">
              Universitas Pattimura · Sistem Pengelolaan Pembelajaran OBE (SIMPEL-OBE)
            </p>
            <h3 className="font-display text-2xl font-bold text-[#0f172a] mt-1">
              Rancangan Instrumen Evaluasi &amp; Matriks Rubrik Analitis
            </h3>
            <p className="text-sm text-slate-600 mt-0.5">
              {payloadRubrik.identitas_mk.fakultas || "Universitas Pattimura"} · Program Studi{" "}
              {payloadRubrik.identitas_mk.prodi || "-"}
            </p>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-600 space-y-1">
            <div className="font-mono font-bold text-sm text-[#0b3d91]">
              {payloadRubrik.identitas_mk.kode_mk || "KODE-MK"}
            </div>
            <div>{payloadRubrik.identitas_mk.nama_mk || "Mata Kuliah"}</div>
            <div className="tabular-nums">
              {payloadRubrik.identitas_mk.sks} SKS · Smt {payloadRubrik.identitas_mk.semester} · TA{" "}
              {payloadRubrik.identitas_mk.tahun_akademik}
            </div>
            <div>Dosen: {payloadRubrik.identitas_mk.dosen_pengampu || "-"}</div>
          </div>
        </div>

        {/* Summary Mapping Table for Modul 4 & Modul 5 */}
        <section className="print-break-inside-avoid space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-base font-bold text-[#0f172a]">
              1. Rekapitulasi Kolom Asesmen (Siap Integrasi Modul 4 Buku Nilai &amp; Modul 5 Evaluasi)
            </h4>
            <span className="font-mono text-xs font-bold text-[#0b3d91] tabular-nums">
              Total Bobot: {totalBobot}%
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#0b3d91] text-white">
                  <th className="py-2.5 px-3 font-semibold">Kode</th>
                  <th className="py-2.5 px-3 font-semibold">Nama Instrumen</th>
                  <th className="py-2.5 px-3 font-semibold">Bentuk Asesmen</th>
                  <th className="py-2.5 px-3 font-semibold">CPMK</th>
                  <th className="py-2.5 px-3 font-semibold">Sub-CPMK</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Kriteria</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Bobot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payloadRubrik.daftar_instrumen.map((ins) => (
                  <tr key={ins.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#0b3d91]">
                      {ins.kode_instrumen}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {ins.nama_instrumen}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{ins.bentuk_asesmen}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-800">
                      {ins.kode_cpmk}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-800">
                      {ins.kode_sub_cpmk}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {ins.indikator_rubrik.length}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#0f172a]">
                      {ins.bobot_persen}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed Analytic Rubrics per Instrument */}
        <section className="space-y-6">
          <h4 className="font-display text-base font-bold text-[#0f172a]">
            2. Detail Kisi-Kisi Soal &amp; Matriks Rubrik Analitis per Instrumen
          </h4>

          {payloadRubrik.daftar_instrumen.map((ins, idx) => (
            <div
              key={ins.id}
              className="print-break-inside-avoid border border-slate-200 rounded-xl overflow-hidden"
            >
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="font-display font-bold text-sm text-[#0f172a]">
                  {idx + 1}. [{ins.kode_instrumen}] {ins.nama_instrumen}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
                  <span>{ins.bentuk_asesmen}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {ins.kode_cpmk} / {ins.kode_sub_cpmk}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-bold text-[#0b3d91] tabular-nums">
                    Bobot {ins.bobot_persen}%
                  </span>
                </div>
              </div>

              {/* Kisi-Kisi Summary */}
              {ins.kisi_kisi_soal.length > 0 && (
                <div className="px-5 py-3 border-b border-slate-200 bg-white space-y-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Kisi-Kisi &amp; Tugas / Soal
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {ins.kisi_kisi_soal.map((k) => (
                      <li key={k.id} className="flex gap-2">
                        <span className="font-mono font-semibold text-[#0b3d91] shrink-0">
                          #{k.nomor_butir} ({k.bobot_butir}%)
                        </span>
                        <span>
                          <strong>{k.topik_tiu_tkd || "Topik"}:</strong>{" "}
                          {k.pertanyaan_atau_tugas || k.indikator_soal || "-"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Analytic Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="py-2.5 px-3 font-semibold w-48">
                        Kriteria Penilaian (Bobot)
                      </th>
                      {payloadRubrik.skala_penilaian.map((s) => (
                        <th key={s.skor} className="py-2.5 px-3 font-semibold">
                          Skor {s.skor}: {s.label}{" "}
                          <span className="font-mono font-normal text-slate-500">
                            ({s.rentang_nilai})
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ins.indikator_rubrik.map((krit) => (
                      <tr key={krit.id} className="align-top">
                        <td className="p-3 bg-slate-50/50">
                          <div className="font-mono text-[11px] text-[#0b3d91] font-semibold">
                            {krit.kode_kriteria}
                          </div>
                          <div className="font-semibold text-slate-900 mt-0.5">
                            {krit.nama_kriteria || "Kriteria"}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 tabular-nums mt-1">
                            Bobot: {krit.bobot_kriteria}%
                          </div>
                        </td>
                        {payloadRubrik.skala_penilaian.map((s) => (
                          <td key={s.skor} className="p-3 text-slate-700 leading-relaxed">
                            {krit.deskriptor[String(s.skor) as "4" | "3" | "2" | "1"] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      </article>

      {/* Bottom Back Button */}
      <div className="no-print flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrev}
          className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Langkah 3</span>
        </button>
      </div>
    </div>
  );
}
