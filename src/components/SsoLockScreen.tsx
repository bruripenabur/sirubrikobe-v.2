import { useState, type FormEvent } from "react";
import { Lock, ExternalLink, LogIn, AlertCircle, Loader2 } from "lucide-react";
import { SIMPATTI_PORTAL_URL, signInSsoQuick, type SsoUserProfile } from "../lib/ssoAuth";
import type { Session } from "@supabase/supabase-js";

const UNPATTI_LOGO_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Logo_Universitas_Pattimura_Terbaru.png/330px-Logo_Universitas_Pattimura_Terbaru.png";

interface SsoLockScreenProps {
  onLoginSuccess: (session: Session, user: SsoUserProfile) => void;
  initialError?: string | null;
}

export function SsoLockScreen({ onLoginSuccess, initialError }: SsoLockScreenProps) {
  const [logoError, setLogoError] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const portalLoginUrl =
    typeof window !== "undefined"
      ? `${SIMPATTI_PORTAL_URL}?redirect=${encodeURIComponent(window.location.href)}`
      : SIMPATTI_PORTAL_URL;

  const handleQuickLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Masukkan email dan kata sandi akun SIMPATTI-OBE Anda.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const res = await signInSsoQuick(email, password);
    setIsSubmitting(false);

    if (res.error || !res.session || !res.user) {
      setError(res.error || "Login gagal. Periksa kembali kredensial Anda.");
      return;
    }
    onLoginSuccess(res.session, res.user);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border-2 border-[#ffcc00] shadow-2xl overflow-hidden">
        {/* Navy Header Band */}
        <div className="bg-[#0b3d91] px-6 py-6 text-white border-b-2 border-[#ffcc00]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0">
              {!logoError ? (
                <img
                  src={UNPATTI_LOGO_URL}
                  alt="Logo Universitas Pattimura"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Lock className="w-6 h-6 text-[#0b3d91]" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#ffcc00]">
                Ekosistem SIMPEL-OBE Universitas Pattimura
              </p>
              <h1 className="font-display text-lg font-bold leading-snug">
                SIMPEL-OBE 03: SIRUBRIK UNPATTI
              </h1>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="rounded-xl bg-[#0b3d91]/5 border border-[#0b3d91]/20 p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-[#0b3d91] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-sm font-bold text-[#0f172a]">
                Sesi SSO Diperlukan — Silakan Login Terlebih Dahulu melalui Portal Ekosistem OBE
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Autentikasi terpusat melindungi data RPS, rubrik analitis, dan portofolio nilai mata kuliah Anda lintas modul SIMPATTI.
              </p>
            </div>
          </div>

          <a
            href={portalLoginUrl}
            className="w-full py-3 px-4 rounded-xl bg-[#ffcc00] hover:bg-[#eab308] text-[#0f172a] font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Login via Portal Utama (https://obe.simpatti.site)</span>
            <ExternalLink className="w-4 h-4 shrink-0" />
          </a>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200" />
            <span className="shrink mx-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Atau Login Cepat di Tempat
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleQuickLogin} className="space-y-3.5">
            <div>
              <label
                htmlFor="sso-email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Email Dosen / Akun SIMPATTI
              </label>
              <input
                id="sso-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dosen@unpatti.ac.id"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/25 focus:border-[#0b3d91]"
              />
            </div>

            <div>
              <label
                htmlFor="sso-password"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Kata Sandi
              </label>
              <input
                id="sso-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3d91]/25 focus:border-[#0b3d91]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0b3d91] hover:bg-[#092f73] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4 text-[#ffcc00]" />
              )}
              <span>{isSubmitting ? "Memverifikasi Sesi..." : "Masuk ke SIRUBRIK"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
