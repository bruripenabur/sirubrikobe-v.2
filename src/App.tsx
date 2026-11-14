import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, CheckCircle2, Info } from "lucide-react";
import { EcosystemSyncBar } from "./components/EcosystemSyncBar";
import { AppHeader } from "./components/AppHeader";
import { Step1CourseAndCpmk } from "./components/Step1CourseAndCpmk";
import { Step2Instruments } from "./components/Step2Instruments";
import { Step3RubricBuilder } from "./components/Step3RubricBuilder";
import { Step4PreviewAndRelay } from "./components/Step4PreviewAndRelay";
import { SsoLockScreen } from "./components/SsoLockScreen";
import {
  DEFAULT_SKALA_PENILAIAN,
  fetchEcosystemBundleByRpsId,
  fetchRpsList,
  isSupabaseConfigured,
  saveRubrikToEcosystem,
  supabase,
  verifySupabaseConnection,
} from "./lib/supabase";
import {
  detectSsoSession,
  extractUserProfile,
  signOutSso,
  writeSsoCookie,
  type SsoUserProfile,
} from "./lib/ssoAuth";
import type {
  AppMode,
  BukuAjarKonteks,
  CpmkItem,
  IdentitasMK,
  InstrumenEvaluasi,
  ObeRpsSummary,
  SkalaRubrikItem,
  SubCpmkItem,
  WorkflowStep,
} from "./types/rubrik";
import {
  buildStandardPayloadRubrik,
  createEmptyInstrumen,
  createInitialManualState,
} from "./utils/rubrikBuilder";

export default function App() {
  const initialManual = useMemo(() => createInitialManualState(), []);

  // SSO Auth State
  const [isCheckingSso, setIsCheckingSso] = useState<boolean>(true);
  const [ssoUser, setSsoUser] = useState<SsoUserProfile | null>(null);
  const [ssoError, setSsoError] = useState<string | null>(null);

  // Supabase Connection Status Badge State
  const [dbStatus, setDbStatus] = useState<{
    checked: boolean;
    connected: boolean;
    error: string | null;
  }>({ checked: false, connected: false, error: null });

  const [mode, setMode] = useState<AppMode>("sync");
  const [activeStep, setActiveStep] = useState<WorkflowStep>(1);

  // Supabase Ecosystem State
  const [rpsList, setRpsList] = useState<ObeRpsSummary[]>([]);
  const [selectedRpsId, setSelectedRpsId] = useState<string>("");
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false);
  const [isLoadingBundle, setIsLoadingBundle] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [bundleNotice, setBundleNotice] = useState<string | null>(null);
  const [hasExistingRubrik, setHasExistingRubrik] = useState<boolean>(false);
  const [bukuAjar, setBukuAjar] = useState<BukuAjarKonteks | null>(null);

  // SIRUBRIK Authoring State
  const [identitas, setIdentitas] = useState<IdentitasMK>(initialManual.identitas);
  const [cpmkList, setCpmkList] = useState<CpmkItem[]>(initialManual.cpmk);
  const [subCpmkList, setSubCpmkList] = useState<SubCpmkItem[]>(initialManual.subCpmk);
  const [skala, setSkala] = useState<SkalaRubrikItem[]>(DEFAULT_SKALA_PENILAIAN);
  const [instrumenList, setInstrumenList] = useState<InstrumenEvaluasi[]>(
    initialManual.instrumen
  );

  const applyUserAutoFill = useCallback(
    (profile: SsoUserProfile | null, baseIdentitas: IdentitasMK): IdentitasMK => {
      if (!profile) return baseIdentitas;
      return {
        ...baseIdentitas,
        dosen_pengampu: baseIdentitas.dosen_pengampu.trim()
          ? baseIdentitas.dosen_pengampu
          : profile.fullName,
        prodi: baseIdentitas.prodi.trim()
          ? baseIdentitas.prodi
          : profile.prodi || baseIdentitas.prodi,
      };
    },
    []
  );

  const loadRpsList = useCallback(async () => {
    setIsLoadingList(true);
    const { data, error } = await fetchRpsList();
    setRpsList(data);
    if (error) {
      setSyncError(error);
    } else {
      setSyncError(null);
    }
    setIsLoadingList(false);
  }, []);

  const handleSelectRps = useCallback(
    async (rpsId: string, activeProfile?: SsoUserProfile | null) => {
      if (!rpsId) return;
      const profileToUse = activeProfile ?? ssoUser;
      setMode("sync");
      setSelectedRpsId(rpsId);
      setIsLoadingBundle(true);
      setSyncError(null);
      setBundleNotice(null);

      const { bundle, error } = await fetchEcosystemBundleByRpsId(rpsId);
      setIsLoadingBundle(false);

      if (error || !bundle) {
        setSyncError(error || "Gagal memuat data RPS terpilih.");
        return;
      }

      setBukuAjar(bundle.bukuAjar);

      if (bundle.existingRubrik) {
        setHasExistingRubrik(true);
        setIdentitas(applyUserAutoFill(profileToUse, bundle.existingRubrik.identitas_mk));
        setCpmkList(bundle.existingRubrik.daftar_cpmk);
        setSubCpmkList(bundle.existingRubrik.daftar_sub_cpmk);
        setSkala(bundle.existingRubrik.skala_penilaian);
        setInstrumenList(
          bundle.existingRubrik.daftar_instrumen.length > 0
            ? bundle.existingRubrik.daftar_instrumen
            : [
                createEmptyInstrumen(
                  1,
                  bundle.cpmk[0]?.kode_cpmk || "CPMK-01",
                  bundle.subCpmk[0]?.kode_sub_cpmk || "Sub-CPMK-01.1",
                  100
                ),
              ]
        );
        setBundleNotice(
          `Data RPS (${bundle.identitas.kode_mk}) dan draf rubrik tersimpan dari tabel obe_rubrik berhasil dimuat untuk dilanjutkan.`
        );
      } else {
        setHasExistingRubrik(false);
        setIdentitas(applyUserAutoFill(profileToUse, bundle.identitas));
        setCpmkList(bundle.cpmk);
        setSubCpmkList(bundle.subCpmk);
        setSkala(DEFAULT_SKALA_PENILAIAN);

        const getCpmk = (i: number) =>
          bundle.subCpmk[i % bundle.subCpmk.length]?.kode_cpmk ||
          bundle.cpmk[0]?.kode_cpmk ||
          "CPMK-01";
        const getSub = (i: number) =>
          bundle.subCpmk[i % bundle.subCpmk.length]?.kode_sub_cpmk || "Sub-CPMK-01.1";

        setInstrumenList([
          createEmptyInstrumen(1, getCpmk(0), getSub(0), 20, "TGS-01", "Tugas Terstruktur"),
          createEmptyInstrumen(2, getCpmk(1), getSub(1), 15, "KUIS-01", "Kuis"),
          createEmptyInstrumen(3, getCpmk(2), getSub(2), 25, "PBL-01", "Proyek CBL/PBL"),
          createEmptyInstrumen(4, getCpmk(3), getSub(3), 20, "UTS", "UTS"),
          createEmptyInstrumen(5, getCpmk(4), getSub(4), 20, "UAS", "UAS"),
        ]);

        setBundleNotice(
          `Data RPS (${bundle.identitas.kode_mk} — ${bundle.identitas.nama_mk}) berhasil ditarik dari Modul 1${
            bundle.bukuAjar ? " beserta kisi-kisi TIU/TKD dari Modul 2" : ""
          }.`
        );
      }
    },
    [applyUserAutoFill, ssoUser]
  );

  // 1. SSO Session Detection on Mount + Supabase DB Verification
  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setIsCheckingSso(true);
      const [ssoResult, dbRes] = await Promise.all([
        detectSsoSession(),
        verifySupabaseConnection(),
      ]);

      if (!mounted) return;

      setDbStatus({ checked: true, connected: dbRes.connected, error: dbRes.error });

      if (ssoResult.user) {
        setSsoUser(ssoResult.user);
        setSsoError(null);
        setIdentitas((prev) => applyUserAutoFill(ssoResult.user, prev));
        setIsCheckingSso(false);

        await loadRpsList();
        const params = new URLSearchParams(window.location.search);
        const urlRpsId = params.get("rps_id");
        if (urlRpsId) {
          await handleSelectRps(urlRpsId, ssoResult.user);
        }
      } else {
        setSsoUser(null);
        setSsoError(ssoResult.error);
        setIsCheckingSso(false);
      }
    }

    void bootstrap();

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) {
        writeSsoCookie(session);
        const profile = extractUserProfile(session.user);
        setSsoUser(profile);
        setIdentitas((prev) => applyUserAutoFill(profile, prev));
      } else {
        setSsoUser(null);
      }
    });

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
    };
  }, [applyUserAutoFill, handleSelectRps, loadRpsList]);

  const handleModeChange = (nextMode: AppMode) => {
    setMode(nextMode);
    if (nextMode === "manual") {
      setSelectedRpsId("");
      setHasExistingRubrik(false);
      setBukuAjar(null);
      setIdentitas((prev) =>
        applyUserAutoFill(ssoUser, {
          ...prev,
          kode_mk: "",
          nama_mk: "",
          prodi: ssoUser?.prodi || prev.prodi,
          dosen_pengampu: ssoUser?.fullName || prev.dosen_pengampu,
        })
      );
      setBundleNotice("Mode Input Manual aktif. Identitas Dosen & Prodi diisi otomatis dari profil SSO Anda.");
    }
  };

  const handleLogout = async () => {
    await signOutSso();
    setSsoUser(null);
  };

  const payloadRubrik = useMemo(
    () =>
      buildStandardPayloadRubrik({
        rpsId: mode === "sync" && selectedRpsId ? selectedRpsId : null,
        identitas,
        cpmk: cpmkList,
        subCpmk: subCpmkList,
        skala,
        instrumen: instrumenList,
      }),
    [mode, selectedRpsId, identitas, cpmkList, subCpmkList, skala, instrumenList]
  );

  const totalBobotInstrumen = useMemo(
    () =>
      instrumenList.reduce((sum, item) => sum + (Number(item.bobot_persen) || 0), 0),
    [instrumenList]
  );

  const handleSaveToSupabase = async () => {
    const activeRpsId = mode === "sync" && selectedRpsId ? selectedRpsId : null;
    const res = await saveRubrikToEcosystem(activeRpsId, payloadRubrik);
    if (res.ok) {
      await loadRpsList();
    }
    return res;
  };

  // Bottom-right Supabase connectivity pill (Cara 1 verification)
  const renderSupabaseStatusPill = () => (
    <div className="no-print fixed bottom-4 right-4 z-50">
      {!dbStatus.checked ? (
        <div className="px-3 py-1.5 rounded-full bg-slate-800 text-white text-xs font-medium shadow-md border border-slate-700 flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin text-[#ffcc00]" />
          <span>Memeriksa koneksi Supabase...</span>
        </div>
      ) : dbStatus.connected ? (
        <div className="px-3.5 py-1.5 rounded-full bg-emerald-950/95 text-emerald-100 text-xs font-semibold shadow-md border border-emerald-600/60 flex items-center gap-1.5">
          <span aria-hidden="true">🟢</span>
          <span>Supabase Connected (SIMPEL-OBE DB)</span>
        </div>
      ) : (
        <div
          title={dbStatus.error || "Koneksi Supabase gagal"}
          className="px-3.5 py-1.5 rounded-full bg-red-950/95 text-red-100 text-xs font-semibold shadow-md border border-red-600/60 flex items-center gap-1.5 max-w-xs truncate"
        >
          <span aria-hidden="true">🔴</span>
          <span className="truncate">
            Supabase Error: {dbStatus.error || "Gagal terhubung"}
          </span>
        </div>
      )}
    </div>
  );

  if (isCheckingSso) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-white">
        <div className="bg-[#0b3d91] border-2 border-[#ffcc00] rounded-2xl px-8 py-6 flex items-center gap-3.5 shadow-xl">
          <Loader2 className="w-5 h-5 animate-spin text-[#ffcc00]" />
          <span className="font-display text-sm font-semibold">
            Memverifikasi Sesi SSO Ekosistem SIMPATTI-OBE...
          </span>
        </div>
        {renderSupabaseStatusPill()}
      </div>
    );
  }

  if (!ssoUser) {
    return (
      <>
        <SsoLockScreen
          initialError={ssoError}
          onLoginSuccess={async (_session, user) => {
            setSsoUser(user);
            setIdentitas((prev) => applyUserAutoFill(user, prev));
            await loadRpsList();
            const params = new URLSearchParams(window.location.search);
            const urlRpsId = params.get("rps_id");
            if (urlRpsId) {
              await handleSelectRps(urlRpsId, user);
            }
          }}
        />
        {renderSupabaseStatusPill()}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <EcosystemSyncBar
        mode={mode}
        onModeChange={handleModeChange}
        rpsList={rpsList}
        selectedRpsId={selectedRpsId}
        onSelectRps={(id) => void handleSelectRps(id)}
        onRefreshRpsList={loadRpsList}
        isLoadingList={isLoadingList}
        isLoadingBundle={isLoadingBundle}
        syncError={syncError}
        hasBukuAjar={Boolean(bukuAjar)}
        hasExistingRubrik={hasExistingRubrik}
        supabaseConfigured={isSupabaseConfigured()}
      />

      <AppHeader
        activeStep={activeStep}
        onStepChange={setActiveStep}
        totalBobotInstrumen={totalBobotInstrumen}
        jumlahInstrumen={instrumenList.length}
        namaMk={identitas.nama_mk}
        kodeMk={identitas.kode_mk}
        ssoUser={ssoUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isLoadingBundle && (
          <div className="mb-6 rounded-xl border border-[#0b3d91]/20 bg-white p-4 flex items-center gap-3 text-sm text-[#0b3d91] font-medium">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>
              Menarik data RPS (Modul 1), Buku Ajar (Modul 2), dan Draf Rubrik dari Supabase...
            </span>
          </div>
        )}

        {bundleNotice && !isLoadingBundle && (
          <div className="no-print mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm text-slate-700">
            <div className="flex items-center gap-2.5">
              {mode === "sync" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-[#0b3d91] shrink-0" />
              )}
              <span>{bundleNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setBundleNotice(null)}
              className="text-xs font-medium text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {activeStep === 1 && (
          <Step1CourseAndCpmk
            mode={mode}
            selectedRpsId={selectedRpsId}
            identitas={identitas}
            onIdentitasChange={setIdentitas}
            cpmkList={cpmkList}
            onCpmkChange={setCpmkList}
            subCpmkList={subCpmkList}
            onSubCpmkChange={setSubCpmkList}
            bukuAjar={bukuAjar}
            onNext={() => setActiveStep(2)}
          />
        )}

        {activeStep === 2 && (
          <Step2Instruments
            identitas={identitas}
            cpmkList={cpmkList}
            subCpmkList={subCpmkList}
            bukuAjar={bukuAjar}
            instrumenList={instrumenList}
            onInstrumenChange={setInstrumenList}
            onPrev={() => setActiveStep(1)}
            onNext={() => setActiveStep(3)}
          />
        )}

        {activeStep === 3 && (
          <Step3RubricBuilder
            identitas={identitas}
            cpmkList={cpmkList}
            subCpmkList={subCpmkList}
            bukuAjar={bukuAjar}
            skala={skala}
            onSkalaChange={setSkala}
            instrumenList={instrumenList}
            onInstrumenChange={setInstrumenList}
            onPrev={() => setActiveStep(2)}
            onNext={() => setActiveStep(4)}
          />
        )}

        {activeStep === 4 && (
          <Step4PreviewAndRelay
            payloadRubrik={payloadRubrik}
            selectedRpsId={mode === "sync" && selectedRpsId ? selectedRpsId : null}
            onSaveOnly={handleSaveToSupabase}
            onSaveAndRelay={handleSaveToSupabase}
            onPrev={() => setActiveStep(3)}
          />
        )}
      </main>

      <footer className="no-print border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            SIMPEL-OBE 03: SIRUBRIK UNPATTI · Universitas Pattimura
          </span>
          <span>
            Terhubung ke Ekosistem Modul 1 (RPS), Modul 2 (Buku Ajar), &amp; Modul 4 (Buku Nilai &amp; Portofolio)
          </span>
        </div>
      </footer>

      {renderSupabaseStatusPill()}
    </div>
  );
}
