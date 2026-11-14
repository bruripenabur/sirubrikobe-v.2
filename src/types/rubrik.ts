export interface IdentitasMK {
  kode_mk: string;
  nama_mk: string;
  prodi: string;
  fakultas: string;
  sks: number;
  semester: string;
  tahun_akademik: string;
  dosen_pengampu: string;
}

export interface CpmkItem {
  kode_cpmk: string;
  deskripsi_cpmk: string;
  cpl_terkait: string;
}

export interface SubCpmkItem {
  kode_sub_cpmk: string;
  kode_cpmk: string;
  deskripsi_sub_cpmk: string;
  bobot_rps_persen: number;
  taksonomi_bloom: string;
}

export interface KisiKisiItem {
  id: string;
  nomor_butir: number;
  topik_tiu_tkd: string;
  indikator_soal: string;
  level_kognitif: string;
  pertanyaan_atau_tugas: string;
  bobot_butir: number;
}

export interface TingkatanSkor {
  skor: 4 | 3 | 2 | 1;
  label: string;
  rentang_nilai: string;
  deskripsi: string;
}

export interface IndikatorRubrik {
  id: string;
  kode_kriteria: string;
  nama_kriteria: string;
  bobot_kriteria: number;
  kode_sub_cpmk: string;
  deskriptor: {
    "4": string;
    "3": string;
    "2": string;
    "1": string;
  };
  tingkatan_skor: TingkatanSkor[];
}

export interface InstrumenEvaluasi {
  id: string;
  kode_instrumen: string;
  nama_instrumen: string;
  bentuk_asesmen: string;
  kode_cpmk: string;
  kode_sub_cpmk: string;
  bobot_persen: number;
  minggu_pelaksanaan: string;
  kisi_kisi_soal: KisiKisiItem[];
  indikator_rubrik: IndikatorRubrik[];
}

export interface SkalaRubrikItem {
  skor: 4 | 3 | 2 | 1;
  label: string;
  rentang_nilai: string;
}

export interface MatriksRubrikEntry {
  kode_instrumen: string;
  nama_instrumen: string;
  bentuk_asesmen: string;
  kode_cpmk: string;
  kode_sub_cpmk: string;
  bobot_persen: number;
  indikator_rubrik: IndikatorRubrik[];
}

export interface RingkasanBobotCpmk {
  kode_cpmk: string;
  total_bobot_persen: number;
  sub_cpmk_terukur: string[];
  jumlah_instrumen: number;
}

export interface PayloadRubrik {
  versi_skema: string;
  rps_id: string | null;
  identitas_mk: IdentitasMK;
  daftar_cpmk: CpmkItem[];
  daftar_sub_cpmk: SubCpmkItem[];
  skala_penilaian: SkalaRubrikItem[];
  daftar_instrumen: InstrumenEvaluasi[];
  matriks_rubrik: MatriksRubrikEntry[];
  ringkasan_bobot_cpmk: RingkasanBobotCpmk[];
  updated_at: string;
}

export interface ObeRpsSummary {
  id: string;
  kode_mk: string;
  nama_mk: string;
  prodi: string;
  tahun_akademik: string;
  dosen_pengampu: string;
  status_siklus?: string | null;
  updated_at?: string | null;
}

export interface ObeRpsRow extends ObeRpsSummary {
  payload_rps?: Record<string, unknown> | null;
  fakultas?: string | null;
  sks?: number | null;
  semester?: string | null;
}

export interface BukuAjarTopikItem {
  bab: string;
  judul_bab: string;
  tiu: string;
  tkd: string;
  sub_cpmk_kode?: string;
  kisi_kisi_latihan?: string;
}

export interface BukuAjarKonteks {
  id: string;
  rps_id: string;
  judul_buku?: string;
  daftar_tiu_tkd: BukuAjarTopikItem[];
  raw_payload?: Record<string, unknown> | null;
}

export interface ObeRubrikRow {
  id?: string;
  rps_id: string | null;
  payload_rubrik: PayloadRubrik;
  updated_at?: string;
}

export type WorkflowStep = 1 | 2 | 3 | 4;
export type AppMode = "sync" | "manual";
