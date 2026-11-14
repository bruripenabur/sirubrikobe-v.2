import { RefreshCw, Database, PenLine, CheckCircle2, AlertTriangle, BookOpen } from "lucide-react";
import type { AppMode, ObeRpsSummary } from "../types/rubrik";

interface EcosystemSyncBarProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  rpsList: ObeRpsSummary[];
  selectedRpsId: string;
  onSelectRps: (rpsId: string) => void;
  onRefreshRpsList: () => void;
  isLoadingList: boolean;
  isLoadingBundle: boolean;
  syncError: string | null;
  hasBukuAjar: boolean;
  hasExistingRubrik: boolean;
  supabaseConfigured: boolean;
}

export function EcosystemSyncBar({
  mode,
  onModeChange,
  rpsList,
  selectedRpsId,
  onSelectRps,
  onRefreshRpsList,
  isLoadingList,
  isLoadingBundle,
  syncError,
  hasBukuAjar,
  hasExistingRubrik,
  supabaseConfigured,
}: EcosystemSyncBarProps) {
  return (
    <div className="no-print sticky top-0 z-40 w-full bg-[#0b3d91] text-white border-b-2 border-[#ffcc00] shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
        {/* Left: Ecosystem Selector */}
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <Database className="w-4 h-4 text-[#ffcc00]" />
            <span className="text-xs font-semibold tracking-wide text-[#ffcc00] whitespace-nowrap">
              Sinkronisasi Ekosistem
            </span>
          </div>

          <div className="flex-1 max-w-xl flex items-center gap-2">
            <label htmlFor="rps-selector" className="sr-only">
              Pilih Mata Kuliah / RPS Tersimpan
            </label>
            <select
              id="rps-selector"
              value={mode === "manual" ? "__MANUAL__" : selectedRpsId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__MANUAL__") {
                  onModeChange("manual");
                } else {
                  onModeChange("sync");
                  if (val) onSelectRps(val);
                }
              }}
              disabled={isLoadingList || isLoadingBundle}
              className="w-full h-9 px-3 rounded-lg bg-[#0f172a]/80 border border-white/25 text-xs sm:text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffcc00] truncate"
            >
              <option value="">
                {isLoadingList
                  ? "Memuat daftar RPS dari Supabase..."
                  : rpsList.length > 0
                  ? "-- Pilih Mata Kuliah / RPS Tersimpan --"
                  : "-- Belum ada RPS tersimpan / Mode Manual --"}
              </option>
              {rpsList.map((rps) => (
                <option key={rps.id} value={rps.id} className="bg-[#0f172a] text-white">
                  {rps.kode_mk} — {rps.nama_mk} · {rps.prodi} ({rps.tahun_akademik} · {rps.dosen_pengampu})
                </option>
              ))}
              <option value="__MANUAL__" className="bg-[#0f172a] text-[#ffcc00]">
                + Susun Rubrik Mandiri (Mode Input Manual)
              </option>
            </select>

            <button
              type="button"
              onClick={onRefreshRpsList}
              disabled={isLoadingList || isLoadingBundle}
              title="Segarkan daftar RPS dari Supabase"
              className="h-9 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors shrink-0 flex items-center gap-1.5 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList || isLoadingBundle ? "animate-spin" : ""}`} />
              <span className="hidden md:inline whitespace-nowrap">Muat Ulang</span>
            </button>
          </div>
        </div>

        {/* Right: Mode Toggle & Downstream/Upstream Status */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {mode === "sync" && selectedRpsId ? (
            <div className="hidden xl:flex items-center gap-2 text-xs text-slate-100">
              <span className="inline-flex items-center gap-1 text-[#ffcc00] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Modul 1 RPS
              </span>
              <span aria-hidden="true" className="text-white/40">
                ·
              </span>
              <span
                className={`inline-flex items-center gap-1 font-medium ${
                  hasBukuAjar ? "text-emerald-300" : "text-slate-300"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                {hasBukuAjar ? "Modul 2 Buku Ajar Terkait" : "Tanpa Buku Ajar"}
              </span>
              {hasExistingRubrik && (
                <>
                  <span aria-hidden="true" className="text-white/40">
                    ·
                  </span>
                  <span className="text-sky-200 font-medium">Draf Rubrik Dimuat</span>
                </>
              )}
            </div>
          ) : !supabaseConfigured || syncError ? (
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-[#ffcc00] max-w-xs truncate">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{syncError || "Supabase belum dikonfigurasi"}</span>
            </div>
          ) : null}

          <div className="flex items-center bg-[#0f172a]/70 p-0.5 rounded-lg border border-white/15">
            <button
              type="button"
              onClick={() => onModeChange("sync")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === "sync"
                  ? "bg-[#ffcc00] text-[#0f172a] font-semibold"
                  : "text-slate-200 hover:text-white"
              }`}
            >
              Sinkron RPS
            </button>
            <button
              type="button"
              onClick={() => onModeChange("manual")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer ${
                mode === "manual"
                  ? "bg-[#ffcc00] text-[#0f172a] font-semibold"
                  : "text-slate-200 hover:text-white"
              }`}
            >
              <PenLine className="w-3 h-3" />
              Input Manual
            </button>
          </div>
        </div>
      </div>

      {/* Compact error/info ribbon on smaller screens when syncError exists */}
      {syncError && (
        <div className="bg-[#0f172a] border-t border-white/10 px-4 sm:px-6 py-1.5 text-xs text-amber-200 flex items-center justify-between gap-2 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-[#ffcc00] shrink-0" />
            <span className="truncate">{syncError}</span>
          </div>
          <span className="text-slate-400 shrink-0 hidden sm:inline">
            Mode Input Manual tetap aktif sepenuhnya
          </span>
        </div>
      )}
    </div>
  );
}
