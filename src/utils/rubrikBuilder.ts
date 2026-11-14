import { DEFAULT_SKALA_PENILAIAN, buildTingkatanSkor } from "../lib/supabase";
import type {
  CpmkItem,
  IdentitasMK,
  IndikatorRubrik,
  InstrumenEvaluasi,
  KisiKisiItem,
  PayloadRubrik,
  RingkasanBobotCpmk,
  SkalaRubrikItem,
  SubCpmkItem,
} from "../types/rubrik";

export const BENTUK_ASESMEN_OPTIONS = [
  "Tugas Terstruktur",
  "Kuis",
  "Proyek CBL/PBL",
  "Praktikum / Unjuk Kerja",
  "Presentasi / Seminar",
  "UTS",
  "UAS",
  "Portofolio",
];

export const TAKSONOMI_BLOOM_OPTIONS = [
  "C1 - Mengingat",
  "C2 - Memahami",
  "C3 - Menerapkan",
  "C4 - Menganalisis",
  "C5 - Mengevaluasi",
  "C6 - Mencipta",
  "P3 - Presisi",
  "P4 - Artikulasi",
  "A4 - Mengorganisasikan",
];

export function createInitialManualState(): {
  identitas: IdentitasMK;
  cpmk: CpmkItem[];
  subCpmk: SubCpmkItem[];
  instrumen: InstrumenEvaluasi[];
} {
  const identitas: IdentitasMK = {
    kode_mk: "",
    nama_mk: "",
    prodi: "",
    fakultas: "Universitas Pattimura",
    sks: 3,
    semester: "Ganjil / 3",
    tahun_akademik: "2025/2026",
    dosen_pengampu: "",
  };

  const cpmk: CpmkItem[] = [
    {
      kode_cpmk: "CPMK-01",
      deskripsi_cpmk: "",
      cpl_terkait: "CPL-1",
    },
  ];

  const subCpmk: SubCpmkItem[] = [
    {
      kode_sub_cpmk: "Sub-CPMK-01.1",
      kode_cpmk: "CPMK-01",
      deskripsi_sub_cpmk: "",
      bobot_rps_persen: 100,
      taksonomi_bloom: "C4 - Menganalisis",
    },
  ];

  const instrumen: InstrumenEvaluasi[] = [
    createEmptyInstrumen(1, "CPMK-01", "Sub-CPMK-01.1", 20, "TGS-01", "Tugas Terstruktur"),
    createEmptyInstrumen(2, "CPMK-01", "Sub-CPMK-01.1", 15, "KUIS-01", "Kuis"),
    createEmptyInstrumen(3, "CPMK-01", "Sub-CPMK-01.1", 25, "PBL-01", "Proyek CBL/PBL"),
    createEmptyInstrumen(4, "CPMK-01", "Sub-CPMK-01.1", 20, "UTS", "UTS"),
    createEmptyInstrumen(5, "CPMK-01", "Sub-CPMK-01.1", 20, "UAS", "UAS"),
  ];

  return { identitas, cpmk, subCpmk, instrumen };
}

export function createEmptyKisiKisi(nomor: number): KisiKisiItem {
  return {
    id: `kisi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nomor_butir: nomor,
    topik_tiu_tkd: "",
    indikator_soal: "",
    level_kognitif: "C4 - Menganalisis",
    pertanyaan_atau_tugas: "",
    bobot_butir: 100,
  };
}

export function createEmptyKriteria(
  index: number,
  kodeSubCpmk: string,
  skala: SkalaRubrikItem[] = DEFAULT_SKALA_PENILAIAN
): IndikatorRubrik {
  const deskriptor = {
    "4": "",
    "3": "",
    "2": "",
    "1": "",
  };
  return {
    id: `krit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kode_kriteria: `KRIT-${String(index).padStart(2, "0")}`,
    nama_kriteria: "",
    bobot_kriteria: 25,
    kode_sub_cpmk: kodeSubCpmk,
    deskriptor,
    tingkatan_skor: buildTingkatanSkor(deskriptor, skala),
  };
}

export function createEmptyInstrumen(
  index: number,
  kodeCpmk: string,
  kodeSubCpmk: string,
  bobotPersen = 20,
  kodePreset?: string,
  bentukPreset = "Tugas Terstruktur"
): InstrumenEvaluasi {
  const kode = kodePreset || `INS-${String(index).padStart(2, "0")}`;
  const defaultNamaMap: Record<string, string> = {
    "TGS-01": "Tugas Analisis Kasus",
    "KUIS-01": "Kuis Penguasaan Konsep",
    "PBL-01": "Proyek Pemecahan Masalah (CBL/PBL)",
    UTS: "Ujian Tengah Semester",
    UAS: "Ujian Akhir Semester",
  };
  return {
    id: `inst-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    kode_instrumen: kode,
    nama_instrumen: defaultNamaMap[kode] || `Instrumen Evaluasi ${index}`,
    bentuk_asesmen: bentukPreset,
    kode_cpmk: kodeCpmk,
    kode_sub_cpmk: kodeSubCpmk,
    bobot_persen: bobotPersen,
    minggu_pelaksanaan: kode === "UTS" ? "Minggu ke-8" : kode === "UAS" ? "Minggu ke-16" : `Minggu ke-${index * 2 + 1}`,
    kisi_kisi_soal: [createEmptyKisiKisi(1)],
    indikator_rubrik: [
      createEmptyKriteria(1, kodeSubCpmk),
      createEmptyKriteria(2, kodeSubCpmk),
    ],
  };
}

export function buildStandardPayloadRubrik(params: {
  rpsId: string | null;
  identitas: IdentitasMK;
  cpmk: CpmkItem[];
  subCpmk: SubCpmkItem[];
  skala: SkalaRubrikItem[];
  instrumen: InstrumenEvaluasi[];
}): PayloadRubrik {
  const normalizedInstrumen: InstrumenEvaluasi[] = params.instrumen.map((ins) => ({
    ...ins,
    indikator_rubrik: ins.indikator_rubrik.map((krit) => ({
      ...krit,
      kode_sub_cpmk: krit.kode_sub_cpmk || ins.kode_sub_cpmk,
      tingkatan_skor: buildTingkatanSkor(krit.deskriptor, params.skala),
    })),
  }));

  const cpmkMap = new Map<string, RingkasanBobotCpmk>();
  for (const c of params.cpmk) {
    cpmkMap.set(c.kode_cpmk, {
      kode_cpmk: c.kode_cpmk,
      total_bobot_persen: 0,
      sub_cpmk_terukur: [],
      jumlah_instrumen: 0,
    });
  }

  for (const ins of normalizedInstrumen) {
    const entry = cpmkMap.get(ins.kode_cpmk) ?? {
      kode_cpmk: ins.kode_cpmk,
      total_bobot_persen: 0,
      sub_cpmk_terukur: [],
      jumlah_instrumen: 0,
    };
    entry.total_bobot_persen += Number(ins.bobot_persen) || 0;
    entry.jumlah_instrumen += 1;
    if (ins.kode_sub_cpmk && !entry.sub_cpmk_terukur.includes(ins.kode_sub_cpmk)) {
      entry.sub_cpmk_terukur.push(ins.kode_sub_cpmk);
    }
    cpmkMap.set(ins.kode_cpmk, entry);
  }

  return {
    versi_skema: "1.0",
    rps_id: params.rpsId,
    identitas_mk: params.identitas,
    daftar_cpmk: params.cpmk,
    daftar_sub_cpmk: params.subCpmk,
    skala_penilaian: params.skala,
    daftar_instrumen: normalizedInstrumen,
    matriks_rubrik: normalizedInstrumen.map((d) => ({
      kode_instrumen: d.kode_instrumen,
      nama_instrumen: d.nama_instrumen,
      bentuk_asesmen: d.bentuk_asesmen,
      kode_cpmk: d.kode_cpmk,
      kode_sub_cpmk: d.kode_sub_cpmk,
      bobot_persen: d.bobot_persen,
      indikator_rubrik: d.indikator_rubrik,
    })),
    ringkasan_bobot_cpmk: Array.from(cpmkMap.values()),
    updated_at: new Date().toISOString(),
  };
}
