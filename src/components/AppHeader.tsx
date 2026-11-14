import { useState } from "react";
import { Check, ClipboardList, Layers, Sparkles, FileCheck2 } from "lucide-react";
import type { WorkflowStep } from "../types/rubrik";

const UNPATTI_LOGO_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Logo_Universitas_Pattimura_Terbaru.png/330px-Logo_Universitas_Pattimura_Terbaru.png";

interface AppHeaderProps {
  activeStep: WorkflowStep;
  onStepChange: (step: WorkflowStep) => void;
  totalBobotInstrumen: number;
  jumlahInstrumen: number;
  namaMk: string;
  kodeMk: string;
}

const STEPS: {
  step: WorkflowStep;
  shortTitle: string;
  label: string;
  icon: typeof ClipboardList;
}[] = [
  { step: 1, shortTitle: "01. Identitas & CPMK", label: "Identitas MK & Pemetaan CPMK", icon: ClipboardList },
  { step: 2, shortTitle: "02. Instrumen & Bobot", label: "Rancangan Instrumen (100%)", icon: Layers },
  { step: 3, shortTitle: "03. Matriks Rubrik", label: "Kisi-Kisi & Rubrik Analitis", icon: Sparkles },
  { step: 4, shortTitle: "04. Pratinjau & Estafet", label: "Dokumen & Kirim ke Modul 4", icon: FileCheck2 },
];

export function AppHeader({
  activeStep,
  onStepChange,
  totalBobotInstrumen,
  jumlahInstrumen,
  namaMk,
  kodeMk,
}: AppHeaderProps) {
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="no-print bg-white border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Brand Identity */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 shrink-0">
              {!logoError ? (
                <img
                  src={UNPATTI_LOGO_URL}
                  alt="Logo Universitas Pattimura"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <svg
                  viewBox="0 0 64 64"
                  className="w-10 h-10 text-[#0b3d91]"
                  fill="none"
                  aria-label="Lambang Universitas Pattimura"
                >
                  <path
                    d="M32 6L54 14V30C54 44 44.5 54 32 58C19.5 54 10 44 10 30V14L32 6Z"
                    fill="#0b3d91"
                    stroke="#ffcc00"
                    strokeWidth="3"
                  />
                  <path d="M22 26H42M32 18V44" stroke="#ffcc00" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a] whitespace-nowrap">
                  SIMPEL-OBE 03: SIRUBRIK UNPATTI
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#0b3d91] text-[#ffcc00] border border-[#0b3d91] whitespace-nowrap shrink-0">
                  Tahap 3 • Asesmen (Do)
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-0.5">
                Desain Instrumen Evaluasi &amp; Matriks Rubrik Analitis Berbasis OBE
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Universitas Pattimura</span>
                {namaMk ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[#0b3d91] font-medium">
                      {kodeMk || "MK"} — {namaMk}
                    </span>
                  </>
                ) : null}
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {jumlahInstrumen} Instrumen ({totalBobotInstrumen}% bobot)
                </span>
              </div>
            </div>
          </div>

          {/* Step Navigation */}
          <nav aria-label="Tahapan Penyusunan Rubrik" className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {STEPS.map((item) => {
              const Icon = item.icon;
              const isActive = activeStep === item.step;
              const isPassed = activeStep > item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => onStepChange(item.step)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 border cursor-pointer ${
                    isActive
                      ? "bg-[#0b3d91] text-white border-[#0b3d91] shadow-sm"
                      : isPassed
                      ? "bg-slate-50 text-[#0b3d91] border-slate-200 hover:bg-slate-100"
                      : "bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {isPassed ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#ffcc00]" : "text-slate-400"}`} />
                  )}
                  <span>{item.shortTitle}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
