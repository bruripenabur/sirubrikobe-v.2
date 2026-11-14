import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  BukuAjarKonteks,
  BukuAjarTopikItem,
  CpmkItem,
  IdentitasMK,
  IndikatorRubrik,
  InstrumenEvaluasi,
  KisiKisiItem,
  ObeRpsRow,
  ObeRpsSummary,
  ObeRubrikRow,
  PayloadRubrik,
  SkalaRubrikItem,
  SubCpmkItem,
  TingkatanSkor,
} from "../types/rubrik";

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://eysccwxpgdcoqfvaalye.supabase.co";

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "[MASUKKAN_PUBLISHABLE_KEY_SUPABASE_ANDA]";

export const MODUL_4_BUKU_NILAI_URL =
  import.meta.env.VITE_MODUL_4_URL || "[MASUKKAN_URL_MODUL_4_BUKU_NILAI]";

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_ANON_KEY.includes("[MASUKKAN_") &&
    SUPABASE_ANON_KEY.trim().length > 10
  );
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      },
    });
  }
  return cachedClient;
}

export const supabase = getSupabaseClient();

export const DEFAULT_SKALA_PENILAIAN: SkalaRubrikItem[] = [
  { skor: 4, label: "Sangat Baik", rentang_nilai: "85 - 100" },
  { skor: 3, label: "Baik", rentang_nilai: "70 - 84" },
  { skor: 2, label: "Cukup", rentang_nilai: "55 - 69" },
  { skor: 1, label: "Kurang", rentang_nilai: "0 - 54" },
];

export function buildTingkatanSkor(
  deskriptor: { "4": string; "3": string; "2": string; "1": string },
  skala: SkalaRubrikItem[] = DEFAULT_SKALA_PENILAIAN
): TingkatanSkor[] {
  return skala.map((s) => ({
    skor: s.skor,
    label: s.label,
    rentang_nilai: s.rentang_nilai,
    deskripsi: deskriptor[String(s.skor) as "4" | "3" | "2" | "1"] || "",
  }));
}

export async function fetchRpsList(): Promise<{
  data: ObeRpsSummary[];
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      data: [],
      error:
        "Kunci publik Supabase (VITE_SUPABASE_ANON_KEY) belum diisi. Anda tetap dapat menggunakan Mode Input Manual.",
    };
  }

  try {
    const { data, error } = await supabase
      .from("obe_rps")
      .select("id, kode_mk, nama_mk, prodi, tahun_akademik, dosen_pengampu, status_siklus, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      return { data: [], error: `Gagal memuat daftar RPS: ${error.message}` };
    }

    return {
      data: (data as ObeRpsSummary[]) ?? [],
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Terjadi kesalahan jaringan saat menghubungi Supabase.",
    };
  }
}

export interface EcosystemBundle {
  rps: ObeRpsRow;
  identitas: IdentitasMK;
  cpmk: CpmkItem[];
  subCpmk: SubCpmkItem[];
  bukuAjar: BukuAjarKonteks | null;
  existingRubrik: PayloadRubrik | null;
}

function asRecord(val: unknown): Record<string, unknown> {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    return val as Record<string, unknown>;
  }
  return {};
}

function asArray(val: unknown): unknown[] {
  return Array.isArray(val) ? val : [];
}

function pickStr(obj: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    if (typeof v === "number") return String(v);
  }
  return fallback;
}

function pickNum(obj: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return fallback;
}

export function extractRpsData(rpsRow: ObeRpsRow): {
  identitas: IdentitasMK;
  cpmk: CpmkItem[];
  subCpmk: SubCpmkItem[];
} {
  const payload = asRecord(rpsRow.payload_rps);
  const identPayload = asRecord(
    payload.identitas_mk ?? payload.identitas ?? payload.mata_kuliah ?? payload.info_mk
  );

  const identitas: IdentitasMK = {
    kode_mk: rpsRow.kode_mk || pickStr(identPayload, ["kode_mk", "kode"], ""),
    nama_mk: rpsRow.nama_mk || pickStr(identPayload, ["nama_mk", "nama", "mata_kuliah"], ""),
    prodi: rpsRow.prodi || pickStr(identPayload, ["prodi", "program_studi"], ""),
    fakultas:
      (typeof rpsRow.fakultas === "string" ? rpsRow.fakultas : "") ||
      pickStr(identPayload, ["fakultas"], "Universitas Pattimura"),
    sks:
      (typeof rpsRow.sks === "number" ? rpsRow.sks : 0) ||
      pickNum(identPayload, ["sks", "bobot_sks"], 3),
    semester:
      (typeof rpsRow.semester === "string" ? rpsRow.semester : "") ||
      pickStr(identPayload, ["semester", "smt"], "Ganjil / 3"),
    tahun_akademik:
      rpsRow.tahun_akademik || pickStr(identPayload, ["tahun_akademik", "ta"], "2025/2026"),
    dosen_pengampu:
      rpsRow.dosen_pengampu ||
      pickStr(identPayload, ["dosen_pengampu", "dosen", "koordinator"], ""),
  };

  // Extract CPMK
  const rawCpmkList = asArray(
    payload.daftar_cpmk ?? payload.cpmk ?? payload.list_cpmk ?? payload.capaian_pembelajaran
  );
  const cpmk: CpmkItem[] = [];
  const subCpmk: SubCpmkItem[] = [];

  rawCpmkList.forEach((item, idx) => {
    const rec = asRecord(item);
    const kodeCpmk = pickStr(rec, ["kode_cpmk", "kode", "id"], `CPMK-0${idx + 1}`);
    const deskripsi = pickStr(rec, ["deskripsi_cpmk", "deskripsi", "uraian", "rumusan"], "");
    const cplTerkait = pickStr(rec, ["cpl_terkait", "kode_cpl", "cpl"], "CPL-1");
    cpmk.push({
      kode_cpmk: kodeCpmk,
      deskripsi_cpmk: deskripsi,
      cpl_terkait: cplTerkait,
    });

    // Check if sub_cpmk nested inside cpmk
    const nestedSubs = asArray(rec.sub_cpmk ?? rec.daftar_sub_cpmk ?? rec.subCpmk);
    nestedSubs.forEach((sub, sIdx) => {
      const sRec = asRecord(sub);
      subCpmk.push({
        kode_sub_cpmk: pickStr(
          sRec,
          ["kode_sub_cpmk", "kode", "id"],
          `Sub-${kodeCpmk}.${sIdx + 1}`
        ),
        kode_cpmk: kodeCpmk,
        deskripsi_sub_cpmk: pickStr(
          sRec,
          ["deskripsi_sub_cpmk", "deskripsi", "uraian", "kemampuan_akhir"],
          ""
        ),
        bobot_rps_persen: pickNum(sRec, ["bobot_rps_persen", "bobot_persen", "bobot"], 0),
        taksonomi_bloom: pickStr(sRec, ["taksonomi_bloom", "taksonomi", "level_kognitif"], "C4"),
      });
    });
  });

  // Extract top-level Sub-CPMK if present
  const rawSubList = asArray(
    payload.daftar_sub_cpmk ?? payload.sub_cpmk ?? payload.subCpmk ?? payload.sub_capaian
  );
  if (rawSubList.length > 0 && subCpmk.length === 0) {
    rawSubList.forEach((sub, idx) => {
      const sRec = asRecord(sub);
      const parentCpmk = pickStr(
        sRec,
        ["kode_cpmk", "cpmk_kode", "parent_cpmk"],
        cpmk[0]?.kode_cpmk || "CPMK-01"
      );
      subCpmk.push({
        kode_sub_cpmk: pickStr(
          sRec,
          ["kode_sub_cpmk", "kode", "id"],
          `Sub-CPMK-${String(idx + 1).padStart(2, "0")}`
        ),
        kode_cpmk: parentCpmk,
        deskripsi_sub_cpmk: pickStr(
          sRec,
          ["deskripsi_sub_cpmk", "deskripsi", "uraian", "kemampuan_akhir"],
          ""
        ),
        bobot_rps_persen: pickNum(sRec, ["bobot_rps_persen", "bobot_persen", "bobot"], 0),
        taksonomi_bloom: pickStr(sRec, ["taksonomi_bloom", "taksonomi", "level_kognitif"], "C4"),
      });
    });
  }

  // Fallback: extract from weekly plan (rencana_pembelajaran / pertemuan / matriks_penilaian) if sub_cpmk still empty
  if (subCpmk.length === 0) {
    const weekly = asArray(
      payload.rencana_pembelajaran ?? payload.pertemuan ?? payload.mingguan ?? payload.rps_mingguan
    );
    const seen = new Set<string>();
    weekly.forEach((w, idx) => {
      const wRec = asRecord(w);
      const kodeSub = pickStr(wRec, ["kode_sub_cpmk", "sub_cpmk_kode"], "");
      const descSub = pickStr(wRec, ["sub_cpmk", "kemampuan_akhir", "deskripsi_sub_cpmk"], "");
      if ((kodeSub || descSub) && !seen.has(kodeSub || descSub)) {
        seen.add(kodeSub || descSub);
        subCpmk.push({
          kode_sub_cpmk: kodeSub || `Sub-CPMK-${String(subCpmk.length + 1).padStart(2, "0")}`,
          kode_cpmk: pickStr(
            wRec,
            ["kode_cpmk", "cpmk"],
            cpmk[idx % Math.max(cpmk.length, 1)]?.kode_cpmk || "CPMK-01"
          ),
          deskripsi_sub_cpmk: descSub,
          bobot_rps_persen: pickNum(wRec, ["bobot", "bobot_persen"], 0),
          taksonomi_bloom: pickStr(wRec, ["taksonomi", "level"], "C4"),
        });
      }
    });
  }

  // Ensure default CPMK/Sub-CPMK if RPS had none
  if (cpmk.length === 0) {
    cpmk.push({
      kode_cpmk: "CPMK-01",
      deskripsi_cpmk: `Mampu menguasai konsep inti dan aplikasi pada mata kuliah ${identitas.nama_mk || "terkait"}.`,
      cpl_terkait: "CPL-1",
    });
  }
  if (subCpmk.length === 0) {
    subCpmk.push({
      kode_sub_cpmk: "Sub-CPMK-01.1",
      kode_cpmk: cpmk[0].kode_cpmk,
      deskripsi_sub_cpmk: `Mampu menganalisis dan menerapkan capaian utama ${identitas.nama_mk || "mata kuliah"}.`,
      bobot_rps_persen: 100,
      taksonomi_bloom: "C4",
    });
  }

  return { identitas, cpmk, subCpmk };
}

export function extractBukuAjarContext(row: Record<string, unknown> | null): BukuAjarKonteks | null {
  if (!row) return null;
  const payload = asRecord(
    row.payload_buku_ajar ?? row.payload ?? row.konten_buku_ajar ?? row
  );

  const rawBab = asArray(
    payload.daftar_bab ??
      payload.bab ??
      payload.kisi_kisi ??
      payload.tiu_tkd ??
      payload.materi ??
      row.kisi_kisi
  );

  const daftar_tiu_tkd: BukuAjarTopikItem[] = rawBab.map((b, idx) => {
    const rec = asRecord(b);
    return {
      bab: pickStr(rec, ["bab", "nomor_bab", "kode"], `Bab ${idx + 1}`),
      judul_bab: pickStr(rec, ["judul_bab", "judul", "topik", "nama_bab"], `Topik ${idx + 1}`),
      tiu: pickStr(rec, ["tiu", "tujuan_instruksional_umum", "capaian_umum"], "-"),
      tkd: pickStr(rec, ["tkd", "tik", "tujuan_instruksional_khusus", "indikator"], "-"),
      sub_cpmk_kode: pickStr(rec, ["sub_cpmk", "kode_sub_cpmk"], ""),
      kisi_kisi_latihan: pickStr(rec, ["kisi_kisi", "soal_latihan", "asesmen"], ""),
    };
  });

  // Also check top-level tiu / tkd strings
  const topTiu = pickStr(payload, ["tiu", "tujuan_instruksional_umum"], "");
  const topTkd = pickStr(payload, ["tkd", "tujuan_instruksional_khusus"], "");
  if (daftar_tiu_tkd.length === 0 && (topTiu || topTkd)) {
    daftar_tiu_tkd.push({
      bab: "Umum",
      judul_bab: pickStr(payload, ["judul_buku", "judul"], "Referensi Buku Ajar"),
      tiu: topTiu || "-",
      tkd: topTkd || "-",
    });
  }

  return {
    id: pickStr(row, ["id"], ""),
    rps_id: pickStr(row, ["rps_id"], ""),
    judul_buku: pickStr(payload, ["judul_buku", "judul", "nama_buku"], "Buku Ajar Terkait RPS"),
    daftar_tiu_tkd,
    raw_payload: payload,
  };
}

export function normalizePayloadRubrik(
  rawPayload: unknown,
  fallbackIdentitas: IdentitasMK,
  fallbackCpmk: CpmkItem[],
  fallbackSubCpmk: SubCpmkItem[],
  rpsId: string | null
): PayloadRubrik | null {
  const rec = asRecord(rawPayload);
  if (Object.keys(rec).length === 0) return null;

  const skalaRaw = asArray(rec.skala_penilaian);
  const skala_penilaian: SkalaRubrikItem[] =
    skalaRaw.length === 4
      ? (skalaRaw as SkalaRubrikItem[])
      : DEFAULT_SKALA_PENILAIAN;

  const rawInstrumen = asArray(rec.daftar_instrumen ?? rec.instrumen ?? rec.matriks_rubrik);
  const daftar_instrumen: InstrumenEvaluasi[] = rawInstrumen.map((item, idx) => {
    const iRec = asRecord(item);
    const rawKisi = asArray(iRec.kisi_kisi_soal ?? iRec.kisi_kisi);
    const kisi_kisi_soal: KisiKisiItem[] = rawKisi.map((k, kIdx) => {
      const kRec = asRecord(k);
      return {
        id: pickStr(kRec, ["id"], `kisi-${idx}-${kIdx}`),
        nomor_butir: pickNum(kRec, ["nomor_butir", "no"], kIdx + 1),
        topik_tiu_tkd: pickStr(kRec, ["topik_tiu_tkd", "topik", "tiu_tkd"], ""),
        indikator_soal: pickStr(kRec, ["indikator_soal", "indikator"], ""),
        level_kognitif: pickStr(kRec, ["level_kognitif", "level", "bloom"], "C4"),
        pertanyaan_atau_tugas: pickStr(
          kRec,
          ["pertanyaan_atau_tugas", "pertanyaan", "butir_soal"],
          ""
        ),
        bobot_butir: pickNum(kRec, ["bobot_butir", "bobot"], 100),
      };
    });

    const rawRubrik = asArray(iRec.indikator_rubrik ?? iRec.kriteria ?? iRec.rubrik);
    const kodeSubDefault = pickStr(
      iRec,
      ["kode_sub_cpmk", "sub_cpmk"],
      fallbackSubCpmk[0]?.kode_sub_cpmk || "Sub-CPMK-01.1"
    );

    const indikator_rubrik: IndikatorRubrik[] = rawRubrik.map((r, rIdx) => {
      const rRec = asRecord(r);
      const dRec = asRecord(rRec.deskriptor);
      const deskriptor = {
        "4": pickStr(dRec, ["4"], pickStr(rRec, ["skor_4"], "")),
        "3": pickStr(dRec, ["3"], pickStr(rRec, ["skor_3"], "")),
        "2": pickStr(dRec, ["2"], pickStr(rRec, ["skor_2"], "")),
        "1": pickStr(dRec, ["1"], pickStr(rRec, ["skor_1"], "")),
      };
      return {
        id: pickStr(rRec, ["id"], `krit-${idx}-${rIdx}`),
        kode_kriteria: pickStr(rRec, ["kode_kriteria", "kode"], `KRIT-0${rIdx + 1}`),
        nama_kriteria: pickStr(rRec, ["nama_kriteria", "kriteria", "nama"], "Kriteria Penilaian"),
        bobot_kriteria: pickNum(rRec, ["bobot_kriteria", "bobot"], 25),
        kode_sub_cpmk: pickStr(rRec, ["kode_sub_cpmk"], kodeSubDefault),
        deskriptor,
        tingkatan_skor: buildTingkatanSkor(deskriptor, skala_penilaian),
      };
    });

    return {
      id: pickStr(iRec, ["id"], `inst-${idx + 1}`),
      kode_instrumen: pickStr(iRec, ["kode_instrumen", "kode"], `INS-0${idx + 1}`),
      nama_instrumen: pickStr(iRec, ["nama_instrumen", "nama"], `Instrumen ${idx + 1}`),
      bentuk_asesmen: pickStr(iRec, ["bentuk_asesmen", "bentuk", "jenis"], "Tugas Terstruktur"),
      kode_cpmk: pickStr(
        iRec,
        ["kode_cpmk", "cpmk"],
        fallbackCpmk[0]?.kode_cpmk || "CPMK-01"
      ),
      kode_sub_cpmk: kodeSubDefault,
      bobot_persen: pickNum(iRec, ["bobot_persen", "bobot", "bobot_instrumen_persen"], 0),
      minggu_pelaksanaan: pickStr(iRec, ["minggu_pelaksanaan", "minggu"], "Minggu ke-4"),
      kisi_kisi_soal,
      indikator_rubrik,
    };
  });

  const ident = asRecord(rec.identitas_mk);
  const identitas_mk: IdentitasMK = {
    kode_mk: pickStr(ident, ["kode_mk"], fallbackIdentitas.kode_mk),
    nama_mk: pickStr(ident, ["nama_mk"], fallbackIdentitas.nama_mk),
    prodi: pickStr(ident, ["prodi"], fallbackIdentitas.prodi),
    fakultas: pickStr(ident, ["fakultas"], fallbackIdentitas.fakultas),
    sks: pickNum(ident, ["sks"], fallbackIdentitas.sks),
    semester: pickStr(ident, ["semester"], fallbackIdentitas.semester),
    tahun_akademik: pickStr(ident, ["tahun_akademik"], fallbackIdentitas.tahun_akademik),
    dosen_pengampu: pickStr(ident, ["dosen_pengampu"], fallbackIdentitas.dosen_pengampu),
  };

  const cpmkList = (asArray(rec.daftar_cpmk) as CpmkItem[]);
  const subCpmkList = (asArray(rec.daftar_sub_cpmk) as SubCpmkItem[]);

  return {
    versi_skema: pickStr(rec, ["versi_skema"], "1.0"),
    rps_id: rpsId,
    identitas_mk,
    daftar_cpmk: cpmkList.length > 0 ? cpmkList : fallbackCpmk,
    daftar_sub_cpmk: subCpmkList.length > 0 ? subCpmkList : fallbackSubCpmk,
    skala_penilaian,
    daftar_instrumen,
    matriks_rubrik: daftar_instrumen.map((d) => ({
      kode_instrumen: d.kode_instrumen,
      nama_instrumen: d.nama_instrumen,
      bentuk_asesmen: d.bentuk_asesmen,
      kode_cpmk: d.kode_cpmk,
      kode_sub_cpmk: d.kode_sub_cpmk,
      bobot_persen: d.bobot_persen,
      indikator_rubrik: d.indikator_rubrik,
    })),
    ringkasan_bobot_cpmk: [],
    updated_at: pickStr(rec, ["updated_at"], new Date().toISOString()),
  };
}

export async function fetchEcosystemBundleByRpsId(rpsId: string): Promise<{
  bundle: EcosystemBundle | null;
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      bundle: null,
      error: "Supabase belum dikonfigurasi dengan VITE_SUPABASE_ANON_KEY.",
    };
  }

  try {
    const [rpsRes, bukuAjarRes, rubrikRes] = await Promise.all([
      supabase.from("obe_rps").select("*").eq("id", rpsId).single(),
      supabase.from("obe_buku_ajar").select("*").eq("rps_id", rpsId).maybeSingle(),
      supabase.from("obe_rubrik").select("*").eq("rps_id", rpsId).maybeSingle(),
    ]);

    if (rpsRes.error || !rpsRes.data) {
      return {
        bundle: null,
        error: `RPS tidak ditemukan: ${rpsRes.error?.message || "Data kosong"}`,
      };
    }

    const rpsRow = rpsRes.data as ObeRpsRow;
    const { identitas, cpmk, subCpmk } = extractRpsData(rpsRow);
    const bukuAjar = extractBukuAjarContext(
      (bukuAjarRes.data as Record<string, unknown> | null) ?? null
    );

    const existingRubrikRow = rubrikRes.data as ObeRubrikRow | null;
    const existingRubrik = existingRubrikRow?.payload_rubrik
      ? normalizePayloadRubrik(existingRubrikRow.payload_rubrik, identitas, cpmk, subCpmk, rpsId)
      : null;

    return {
      bundle: {
        rps: rpsRow,
        identitas,
        cpmk,
        subCpmk,
        bukuAjar,
        existingRubrik,
      },
      error: null,
    };
  } catch (err) {
    return {
      bundle: null,
      error: err instanceof Error ? err.message : "Gagal menarik paket data ekosistem.",
    };
  }
}

export async function saveRubrikToEcosystem(
  rpsId: string | null,
  payloadRubrik: PayloadRubrik
): Promise<{ ok: boolean; savedRpsId: string | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      savedRpsId: rpsId,
      error:
        "VITE_SUPABASE_ANON_KEY belum dikonfigurasi sehingga penyimpanan ke Supabase dilewati. Anda tetap dapat mengekspor JSON atau mencetak dokumen.",
    };
  }

  try {
    if (rpsId) {
      const { error: upsertError } = await supabase.from("obe_rubrik").upsert(
        {
          rps_id: rpsId,
          payload_rubrik: payloadRubrik,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "rps_id" }
      );

      if (upsertError) {
        return {
          ok: false,
          savedRpsId: rpsId,
          error: `Gagal menyimpan ke tabel obe_rubrik: ${upsertError.message}`,
        };
      }

      const { error: updateRpsError } = await supabase
        .from("obe_rps")
        .update({ status_siklus: "3_rubrik_selesai" })
        .eq("id", rpsId);

      if (updateRpsError) {
        return {
          ok: true,
          savedRpsId: rpsId,
          error: `Rubrik tersimpan, namun pembaruan status_siklus pada obe_rps terkendala: ${updateRpsError.message}`,
        };
      }

      return { ok: true, savedRpsId: rpsId, error: null };
    } else {
      const { data, error: insertError } = await supabase
        .from("obe_rubrik")
        .insert({
          rps_id: null,
          payload_rubrik: payloadRubrik,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        return {
          ok: false,
          savedRpsId: null,
          error: `Gagal menyimpan rubrik manual ke obe_rubrik: ${insertError.message}`,
        };
      }

      return { ok: true, savedRpsId: (data?.id as string) ?? null, error: null };
    }
  } catch (err) {
    return {
      ok: false,
      savedRpsId: rpsId,
      error: err instanceof Error ? err.message : "Kesalahan jaringan saat menyimpan ke Supabase.",
    };
  }
}
