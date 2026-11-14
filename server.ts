import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "2mb" }));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "GEMINI_API_KEY belum dikonfigurasi pada environment server. Silakan periksa Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      }
    }
  }
  throw lastError;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "simpel-obe-03-sirubrik" });
});

app.post("/api/gemini/generate-instruments", async (req, res) => {
  try {
    const { identitas_mk, daftar_cpmk, daftar_sub_cpmk, konteks_buku_ajar } = req.body ?? {};
    if (!identitas_mk?.nama_mk || !Array.isArray(daftar_sub_cpmk) || daftar_sub_cpmk.length === 0) {
      return res.status(400).json({
        error: "Nama mata kuliah dan minimal satu Sub-CPMK diperlukan untuk merancang instrumen.",
      });
    }

    const ai = getGeminiClient();

    const prompt = `Anda adalah pakar kurikulum Outcome-Based Education (OBE) Universitas Pattimura.
Rancang paket instrumen evaluasi yang seimbang dengan TOTAL BOBOT TEPAT 100% untuk mata kuliah berikut:
- Kode & Nama MK: ${identitas_mk.kode_mk || "-"} - ${identitas_mk.nama_mk}
- Program Studi: ${identitas_mk.prodi || "-"}
- Semester / SKS: ${identitas_mk.semester || "-"} / ${identitas_mk.sks || "-"} SKS

Daftar CPMK:
${JSON.stringify(daftar_cpmk || [], null, 2)}

Daftar Sub-CPMK (gunakan kode_cpmk dan kode_sub_cpmk persis seperti ini):
${JSON.stringify(daftar_sub_cpmk, null, 2)}

${
  konteks_buku_ajar
    ? `Konteks Buku Ajar / Kisi-Kisi TIU-TKD (Modul 2):
${JSON.stringify(konteks_buku_ajar, null, 2)}`
    : ""
}

Ketentuan:
1. Buat 4 hingga 6 instrumen evaluasi beragam yang realistis untuk perkuliahan OBE (misal kombinasi: TGS-01, KUIS-01, PBL-01 / CBL-01, UTS, UAS).
2. Setiap instrumen WAJIB memetakan kode_cpmk dan kode_sub_cpmk yang paling relevan dari daftar di atas.
3. Jumlah seluruh bobot_persen instrumen HARUS tepat 100 (bilangan bulat).
4. Gunakan bahasa Indonesia akademik yang baku dan operasional.`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction:
            "Anda menghasilkan rancangan instrumen asesmen OBE dalam format JSON terstruktur sesuai schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              instrumen: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    kode_instrumen: {
                      type: Type.STRING,
                      description: "Kode singkat seperti TGS-01, KUIS-01, PBL-01, UTS, UAS",
                    },
                    nama_instrumen: { type: Type.STRING },
                    bentuk_asesmen: {
                      type: Type.STRING,
                      description:
                        "Salah satu: Tugas Terstruktur, Kuis, Proyek CBL/PBL, Praktikum / Unjuk Kerja, Presentasi / Seminar, UTS, UAS",
                    },
                    kode_cpmk: { type: Type.STRING },
                    kode_sub_cpmk: { type: Type.STRING },
                    bobot_persen: { type: Type.INTEGER },
                    minggu_pelaksanaan: { type: Type.STRING },
                  },
                  required: [
                    "kode_instrumen",
                    "nama_instrumen",
                    "bentuk_asesmen",
                    "kode_cpmk",
                    "kode_sub_cpmk",
                    "bobot_persen",
                    "minggu_pelaksanaan",
                  ],
                },
              },
            },
            required: ["instrumen"],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? "{}").trim());
    return res.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghasilkan instrumen AI.";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/gemini/generate-rubric", async (req, res) => {
  try {
    const { identitas_mk, instrumen, sub_cpmk, cpmk, konteks_buku_ajar } = req.body ?? {};
    if (!instrumen?.nama_instrumen) {
      return res.status(400).json({ error: "Data instrumen evaluasi tidak lengkap." });
    }

    const ai = getGeminiClient();

    const prompt = `Anda adalah pakar asesmen Outcome-Based Education (OBE) Universitas Pattimura.
Susunlah (1) Kisi-kisi & Butir Soal/Tugas serta (2) Matriks Rubrik Analitis Skala 4 yang terukur dan operasional untuk instrumen berikut:

Mata Kuliah: ${identitas_mk?.kode_mk || ""} ${identitas_mk?.nama_mk || ""} (${identitas_mk?.prodi || ""})
Instrumen: ${instrumen.kode_instrumen} - ${instrumen.nama_instrumen}
Bentuk Asesmen: ${instrumen.bentuk_asesmen}
Bobot Instrumen pada MK: ${instrumen.bobot_persen}%
CPMK Terkait: ${instrumen.kode_cpmk} ${cpmk?.deskripsi_cpmk ? `(${cpmk.deskripsi_cpmk})` : ""}
Sub-CPMK Terukur: ${instrumen.kode_sub_cpmk} ${sub_cpmk?.deskripsi_sub_cpmk ? `(${sub_cpmk.deskripsi_sub_cpmk})` : ""}
Level Taksonomi: ${sub_cpmk?.taksonomi_bloom || "C4-C6 / Analitis"}

${
  konteks_buku_ajar
    ? `Referensi TIU/TKD & Materi Buku Ajar (Modul 2):
${JSON.stringify(konteks_buku_ajar, null, 2)}`
    : ""
}

Ketentuan Wajib:
1. Buat 2 hingga 3 butir kisi_kisi_soal dengan total bobot_butir = 100. Pertanyaan atau instruksi tugas harus jelas, kontekstual, dan mengukur Sub-CPMK di atas.
2. Buat 3 hingga 5 kriteria indikator_rubrik dengan total bobot_kriteria = 100.
3. Setiap kriteria WAJIB memiliki 4 deskriptor bergradasi jelas dan terukur:
   - skor_4 (Sangat Baik, 85-100): capaian sangat tuntas, akurat, argumentatif/orisinal.
   - skor_3 (Baik, 70-84): capaian tepat sesuai standar, kekurangan minor.
   - skor_2 (Cukup, 55-69): capaian dasar terpenuhi namun masih ada kekeliruan konseptual/teknis.
   - skor_1 (Kurang, <55): belum menunjukkan penguasaan indikator yang diminta.
4. Bahasa Indonesia akademik yang lugas dan dapat langsung dipakai dosen menilai mahasiswa.`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction:
            "Anda menghasilkan kisi-kisi soal dan matriks rubrik analitis OBE skala 4 dalam format JSON terstruktur.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              kisi_kisi_soal: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nomor_butir: { type: Type.INTEGER },
                    topik_tiu_tkd: { type: Type.STRING },
                    indikator_soal: { type: Type.STRING },
                    level_kognitif: { type: Type.STRING },
                    pertanyaan_atau_tugas: { type: Type.STRING },
                    bobot_butir: { type: Type.INTEGER },
                  },
                  required: [
                    "nomor_butir",
                    "topik_tiu_tkd",
                    "indikator_soal",
                    "level_kognitif",
                    "pertanyaan_atau_tugas",
                    "bobot_butir",
                  ],
                },
              },
              indikator_rubrik: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    kode_kriteria: { type: Type.STRING },
                    nama_kriteria: { type: Type.STRING },
                    bobot_kriteria: { type: Type.INTEGER },
                    skor_4: { type: Type.STRING },
                    skor_3: { type: Type.STRING },
                    skor_2: { type: Type.STRING },
                    skor_1: { type: Type.STRING },
                  },
                  required: [
                    "kode_kriteria",
                    "nama_kriteria",
                    "bobot_kriteria",
                    "skor_4",
                    "skor_3",
                    "skor_2",
                    "skor_1",
                  ],
                },
              },
            },
            required: ["kisi_kisi_soal", "indikator_rubrik"],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? "{}").trim());
    return res.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghasilkan rubrik AI.";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/gemini/refine-descriptor", async (req, res) => {
  try {
    const { nama_kriteria, deskripsi_sub_cpmk, bentuk_asesmen, deskriptor_saat_ini } =
      req.body ?? {};
    if (!nama_kriteria) {
      return res.status(400).json({ error: "Nama kriteria diperlukan." });
    }

    const ai = getGeminiClient();

    const prompt = `Sempurnakan deskriptor rubrik analitis Skala 4 berikut agar menggunakan kata kerja operasional (KKO) yang terukur, objektif, dan membedakan gradasi kualitas secara tegas:
- Bentuk Asesmen: ${bentuk_asesmen || "-"}
- Kriteria Penilaian: ${nama_kriteria}
- Sub-CPMK Terkait: ${deskripsi_sub_cpmk || "-"}
- Deskriptor Awal: ${JSON.stringify(deskriptor_saat_ini || {})}`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              skor_4: { type: Type.STRING },
              skor_3: { type: Type.STRING },
              skor_2: { type: Type.STRING },
              skor_1: { type: Type.STRING },
            },
            required: ["skor_4", "skor_3", "skor_2", "skor_1"],
          },
        },
      })
    );

    const parsed = JSON.parse((response.text ?? "{}").trim());
    return res.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyempurnakan deskriptor.";
    return res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SIMPEL-OBE 03: SIRUBRIK UNPATTI berjalan pada http://0.0.0.0:${PORT}`);
  });
}

startServer();
