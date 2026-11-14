import { Plus, Trash2, BookOpen, ArrowRight, Link2 } from "lucide-react";
import type {
  AppMode,
  BukuAjarKonteks,
  CpmkItem,
  IdentitasMK,
  SubCpmkItem,
} from "../types/rubrik";
import { TAKSONOMI_BLOOM_OPTIONS } from "../utils/rubrikBuilder";

interface Step1CourseAndCpmkProps {
  mode: AppMode;
  selectedRpsId: string;
  identitas: IdentitasMK;
  onIdentitasChange: (next: IdentitasMK) => void;
  cpmkList: CpmkItem[];
  onCpmkChange: (next: CpmkItem[]) => void;
  subCpmkList: SubCpmkItem[];
  onSubCpmkChange: (next: SubCpmkItem[]) => void;
  bukuAjar: BukuAjarKonteks | null;
  onNext: () => void;
}

export function Step1CourseAndCpmk({
  mode,
  selectedRpsId,
  identitas,
  onIdentitasChange,
  cpmkList,
  onCpmkChange,
  subCpmkList,
  onSubCpmkChange,
  bukuAjar,
  onNext,
}: Step1CourseAndCpmkProps) {
  const totalBobotSubRps = subCpmkList.reduce(
    (sum, item) => sum + (Number(item.bobot_rps_persen) || 0),
    0
  );

  const updateIdentitasField = <K extends keyof IdentitasMK>(key: K, val: IdentitasMK[K]) => {
    onIdentitasChange({ ...identitas, [key]: val });
  };

  const addCpmk = () => {
    const num = cpmkList.length + 1;
    onCpmkChange([
      ...cpmkList,
      {
        kode_cpmk: `CPMK-${String(num).padStart(2, "0")}`,
        deskripsi_cpmk: "",
        cpl_terkait: "CPL-1",
      },
    ]);
  };

  const removeCpmk = (index: number) => {
    if (cpmkList.length <= 1) return;
    onCpmkChange(cpmkList.filter((_, i) => i !== index));
  };

  const addSubCpmk = () => {
    const num = subCpmkList.length + 1;
    const defaultParent = cpmkList[0]?.kode_cpmk || "CPMK-01";
    onSubCpmkChange([
      ...subCpmkList,
      {
        kode_sub_cpmk: `Sub-CPMK-${String(num).padStart(2, "0")}`,
        kode_cpmk: defaultParent,
        deskripsi_sub_cpmk: "",
        bobot_rps_persen: 0,
        taksonomi_bloom: "C4 - Menganalisis",
      },
    ]);
  };

  const removeSubCpmk = (index: number) => {
    if (subCpmkList.length <= 1) return;
    onSubCpmkChange(subCpmkList.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0f172a]">
            01. Identitas Mata Kuliah &amp; Pemetaan CPMK / Sub-CPMK
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Verifikasi identitas mata kuliah serta daftar CPMK dan Sub-CPMK sebagai acuan pemetaan instrumen evaluasi.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600 shrink-0">
          <Link2 className="w-4 h-4 text-[#0b3d91]" />
          <span>
            {mode === "sync" && selectedRpsId
              ? "Tersinkron dari Modul 1 (obe_rps)"
              : "Mode Penyusunan Mandiri"}
          </span>
        </div>
      </div>

      {/* Course Identity Form */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h3 className="font-display text-base font-semibold text-[#0f172a]">
            Identitas Mata Kuliah
          </h3>
          {identitas.kode_mk && (
            <span className="font-mono text-xs font-medium text-[#0b3d91]">
              {identitas.kode_mk}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Kode Mata Kuliah
            </label>
            <input
              type="text"
              value={identitas.kode_mk}
              onChange={(e) => updateIdentitasField("kode_mk", e.target.value)}
              placeholder="Misal: IKP304"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/25 focus:border-[#0b3d91]"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Nama Mata Kuliah
            </label>
            <input
              type="text"
              value={identitas.nama_mk}
              onChange={(e) => updateIdentitasField("nama_mk", e.target.value)}
              placeholder="Misal: Teknologi Pengolahan Hasil Perikanan Tropis"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/25 focus:border-[#0b3d91]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Bobot SKS
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={identitas.sks}
              onChange={(e) => updateIdentitasField("sks", Number(e.target.value) || 0)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/25 focus:border-[#0b3d91]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Program Studi
            </label>
            <input
              type="text"
              value={identitas.prodi}
              onChange={(e) => updateIdentitasField("prodi", e.target.value)}
              placeholder="Misal: Teknologi Hasil Perikanan"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/25 focus:border-[#0b3d91]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Fakultas / Unit
            </label>
            <input
              type="text"
              value={identitas.fakultas}
              onChange={(e) => updateIdentitasField("fakultas", e.target.value)}
              placeholder="Universitas Pattimura"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/25 focus:border-[#0b3d91]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Semester &amp; Tahun Akademik
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={identitas.semester}
                onChange={(e) => updateIdentitasField("semester", e.target.value)}
                placeholder="Ganjil / 3"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/25 focus:border-[#0b3d91]"
              />
              <input
                type="text"
                value={identitas.tahun_akademik}
                onChange={(e) => updateIdentitasField("tahun_akademik", e.target.value)}
                placeholder="2025/2026"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/25 focus:border-[#0b3d91]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Dosen Pengampu / Koordinator
            </label>
            <input
              type="text"
              value={identitas.dosen_pengampu}
              onChange={(e) => updateIdentitasField("dosen_pengampu", e.target.value)}
              placeholder="Nama lengkap & gelar"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/25 focus:border-[#0b3d91]"
            />
          </div>
        </div>
      </section>

      {/* Modul 2 Buku Ajar Context if present */}
      {bukuAjar && (
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-[#0b3d91]" />
              <h3 className="font-display text-base font-semibold text-[#0f172a]">
                Konteks Modul 2 (Buku Ajar &amp; Kisi-Kisi TIU/TKD)
              </h3>
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              {bukuAjar.judul_buku || "Buku Ajar Terhubung"} · {bukuAjar.daftar_tiu_tkd.length} Topik
            </span>
          </div>

          {bukuAjar.daftar_tiu_tkd.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold w-28">Bab</th>
                    <th className="py-2.5 px-3 font-semibold">Judul Topik</th>
                    <th className="py-2.5 px-3 font-semibold">TIU (Tujuan Umum)</th>
                    <th className="py-2.5 px-3 font-semibold">TKD (Tujuan Khusus)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bukuAjar.daftar_tiu_tkd.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono text-xs text-[#0b3d91] align-top">
                        {item.bab}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 align-top">
                        {item.judul_bab}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 align-top">{item.tiu}</td>
                      <td className="py-2.5 px-3 text-slate-600 align-top">{item.tkd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Dokumen Modul 2 ditemukan untuk RPS ini dan akan dijadikan konteks tambahan saat penyusunan kisi-kisi AI.
            </p>
          )}
        </section>
      )}

      {/* CPMK List */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-base font-semibold text-[#0f172a]">
              Daftar Capaian Pembelajaran Mata Kuliah (CPMK)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dipetakan ke CPL Program Studi agar rekap ketercapaian pada Modul 5 akurat.
            </p>
          </div>
          <button
            type="button"
            onClick={addCpmk}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#0b3d91] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah CPMK
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-3 w-36">Kode CPMK</th>
                <th className="py-2.5 px-3 w-36">CPL Terkait</th>
                <th className="py-2.5 px-3">Rumusan / Deskripsi CPMK</th>
                <th className="py-2.5 px-3 w-14 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {cpmkList.map((cpmk, idx) => (
                <tr key={idx} className="align-top">
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={cpmk.kode_cpmk}
                      onChange={(e) => {
                        const next = [...cpmkList];
                        next[idx] = { ...cpmk, kode_cpmk: e.target.value };
                        onCpmkChange(next);
                      }}
                      className="w-full h-9 px-2.5 rounded-md border border-slate-300 text-xs font-mono font-medium text-[#0b3d91] focus:outline-none focus:border-[#0b3d91]"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={cpmk.cpl_terkait}
                      onChange={(e) => {
                        const next = [...cpmkList];
                        next[idx] = { ...cpmk, cpl_terkait: e.target.value };
                        onCpmkChange(next);
                      }}
                      placeholder="CPL-1"
                      className="w-full h-9 px-2.5 rounded-md border border-slate-300 text-xs font-mono text-slate-700 focus:outline-none focus:border-[#0b3d91]"
                    />
                  </td>
                  <td className="p-2.5">
                    <textarea
                      rows={2}
                      value={cpmk.deskripsi_cpmk}
                      onChange={(e) => {
                        const next = [...cpmkList];
                        next[idx] = { ...cpmk, deskripsi_cpmk: e.target.value };
                        onCpmkChange(next);
                      }}
                      placeholder="Tuliskan rumusan capaian pembelajaran mata kuliah..."
                      className="w-full p-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeCpmk(idx)}
                      disabled={cpmkList.length <= 1}
                      title="Hapus CPMK"
                      className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sub-CPMK List */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-base font-semibold text-[#0f172a]">
              Daftar Sub-CPMK &amp; Bobot RPS
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Akumulasi bobot Sub-CPMK pada RPS saat ini: {totalBobotSubRps}%
            </p>
          </div>
          <button
            type="button"
            onClick={addSubCpmk}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#0b3d91] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Sub-CPMK
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-3 w-40">Kode Sub-CPMK</th>
                <th className="py-2.5 px-3 w-36">Induk CPMK</th>
                <th className="py-2.5 px-3">Kemampuan Akhir yang Direncanakan</th>
                <th className="py-2.5 px-3 w-44">Taksonomi Bloom</th>
                <th className="py-2.5 px-3 w-28 text-right">Bobot RPS (%)</th>
                <th className="py-2.5 px-3 w-14 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {subCpmkList.map((sub, idx) => (
                <tr key={idx} className="align-top">
                  <td className="p-2.5">
                    <input
                      type="text"
                      value={sub.kode_sub_cpmk}
                      onChange={(e) => {
                        const next = [...subCpmkList];
                        next[idx] = { ...sub, kode_sub_cpmk: e.target.value };
                        onSubCpmkChange(next);
                      }}
                      className="w-full h-9 px-2.5 rounded-md border border-slate-300 text-xs font-mono font-medium text-[#0b3d91] focus:outline-none focus:border-[#0b3d91]"
                    />
                  </td>
                  <td className="p-2.5">
                    <select
                      value={sub.kode_cpmk}
                      onChange={(e) => {
                        const next = [...subCpmkList];
                        next[idx] = { ...sub, kode_cpmk: e.target.value };
                        onSubCpmkChange(next);
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
                    <textarea
                      rows={2}
                      value={sub.deskripsi_sub_cpmk}
                      onChange={(e) => {
                        const next = [...subCpmkList];
                        next[idx] = { ...sub, deskripsi_sub_cpmk: e.target.value };
                        onSubCpmkChange(next);
                      }}
                      placeholder="Tuliskan indikator kemampuan akhir mahasiswa..."
                      className="w-full p-2 rounded-md border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#0b3d91]"
                    />
                  </td>
                  <td className="p-2.5">
                    <select
                      value={sub.taksonomi_bloom}
                      onChange={(e) => {
                        const next = [...subCpmkList];
                        next[idx] = { ...sub, taksonomi_bloom: e.target.value };
                        onSubCpmkChange(next);
                      }}
                      className="w-full h-9 px-2 rounded-md border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0b3d91]"
                    >
                      {TAKSONOMI_BLOOM_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      {!TAKSONOMI_BLOOM_OPTIONS.includes(sub.taksonomi_bloom) && (
                        <option value={sub.taksonomi_bloom}>{sub.taksonomi_bloom}</option>
                      )}
                    </select>
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={sub.bobot_rps_persen}
                      onChange={(e) => {
                        const next = [...subCpmkList];
                        next[idx] = {
                          ...sub,
                          bobot_rps_persen: Number(e.target.value) || 0,
                        };
                        onSubCpmkChange(next);
                      }}
                      className="w-full h-9 px-2.5 rounded-md border border-slate-300 text-xs font-mono tabular-nums text-right text-slate-900 focus:outline-none focus:border-[#0b3d91]"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeSubCpmk(idx)}
                      disabled={subCpmkList.length <= 1}
                      title="Hapus Sub-CPMK"
                      className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom Step Action */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onNext}
          className="px-5 py-2.5 rounded-lg bg-[#0b3d91] hover:bg-[#092f73] text-white text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <span>Lanjut ke Langkah 2: Rancangan Instrumen</span>
          <ArrowRight className="w-4 h-4 text-[#ffcc00]" />
        </button>
      </div>
    </div>
  );
}
