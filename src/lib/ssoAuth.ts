import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export const SSO_COOKIE_NAME = "simpatti_sso_session";
export const SSO_COOKIE_DOMAIN = ".simpatti.site";

export const SIMPATTI_PORTAL_URL = "https://obe.simpatti.site";

export const SIMPATTI_MODULES = {
  portal: "https://obe.simpatti.site",
  kurikulum: "https://kurikulum.simpatti.site",
  rps: "https://rps.simpatti.site",
  bukuajar: "https://bukuajar.simpatti.site",
  rubrik: "https://rubrik.simpatti.site",
  portofolio: "https://portofolio.simpatti.site",
  cpl: "https://cpl.simpatti.site",
  cqi: "https://cqi.simpatti.site",
} as const;

export interface SsoUserProfile {
  id: string;
  email: string;
  fullName: string;
  prodi: string;
}

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

function parseTokenPayload(raw: string): TokenPair | null {
  if (!raw || raw.trim() === "") return null;
  const trimmed = raw.trim();

  // Attempt 1: URI-decoded JSON
  const candidates = [trimmed];
  try {
    candidates.push(decodeURIComponent(trimmed));
  } catch {
    // ignore decode errors
  }

  for (const candidate of candidates) {
    // JSON string
    if (candidate.startsWith("{")) {
      try {
        const parsed = JSON.parse(candidate) as Record<string, unknown>;
        if (
          typeof parsed.access_token === "string" &&
          typeof parsed.refresh_token === "string"
        ) {
          return {
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          };
        }
      } catch {
        // continue
      }
    }

    // Base64-encoded JSON
    try {
      const decoded = atob(candidate);
      if (decoded.startsWith("{")) {
        const parsed = JSON.parse(decoded) as Record<string, unknown>;
        if (
          typeof parsed.access_token === "string" &&
          typeof parsed.refresh_token === "string"
        ) {
          return {
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          };
        }
      }
    } catch {
      // continue
    }

    // Query-style key=value (access_token=...&refresh_token=...)
    if (candidate.includes("access_token=") && candidate.includes("refresh_token=")) {
      const sp = new URLSearchParams(candidate);
      const access_token = sp.get("access_token");
      const refresh_token = sp.get("refresh_token");
      if (access_token && refresh_token) {
        return { access_token, refresh_token };
      }
    }
  }

  return null;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (const cookie of cookies) {
    const idx = cookie.indexOf("=");
    if (idx === -1) continue;
    const key = cookie.slice(0, idx).trim();
    if (key === name) {
      return cookie.slice(idx + 1).trim();
    }
  }
  return null;
}

export function writeSsoCookie(session: Session): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const payload = encodeURIComponent(
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  );
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  const isSimpattiDomain = window.location.hostname.endsWith("simpatti.site");
  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  const domainPart = isSimpattiDomain ? `; domain=${SSO_COOKIE_DOMAIN}` : "";
  document.cookie = `${SSO_COOKIE_NAME}=${payload}; path=/${domainPart}; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
}

export function clearSsoCookie(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  document.cookie = `${SSO_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  if (window.location.hostname.endsWith("simpatti.site")) {
    document.cookie = `${SSO_COOKIE_NAME}=; path=/; domain=${SSO_COOKIE_DOMAIN}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

export function extractUserProfile(user: User | null | undefined): SsoUserProfile | null {
  if (!user) return null;
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.nama_lengkap === "string" && meta.nama_lengkap.trim()) ||
    user.email ||
    "Dosen Pengampu";
  const prodi =
    (typeof meta.prodi === "string" && meta.prodi.trim()) ||
    (typeof meta.program_studi === "string" && meta.program_studi.trim()) ||
    "";

  return {
    id: user.id,
    email: user.email || "",
    fullName,
    prodi,
  };
}

function cleanHashFromUrl(): void {
  if (typeof window === "undefined") return;
  if (window.location.hash) {
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
  }
}

export async function detectSsoSession(): Promise<{
  session: Session | null;
  user: SsoUserProfile | null;
  source: "supabase_session" | "url_hash" | "sso_cookie" | "none";
  error: string | null;
}> {
  try {
    // 1. Check active native Supabase session
    const { data: activeData } = await supabase.auth.getSession();
    if (activeData.session) {
      writeSsoCookie(activeData.session);
      return {
        session: activeData.session,
        user: extractUserProfile(activeData.session.user),
        source: "supabase_session",
        error: null,
      };
    }

    // 2. Check URL hash #sso_token=...
    if (typeof window !== "undefined" && window.location.hash) {
      const hashStr = window.location.hash.replace(/^#/, "");
      const hashParams = new URLSearchParams(hashStr);
      const ssoTokenRaw = hashParams.get("sso_token");
      const hashPair = ssoTokenRaw
        ? parseTokenPayload(ssoTokenRaw)
        : parseTokenPayload(hashStr);

      if (hashPair) {
        const { data, error } = await supabase.auth.setSession({
          access_token: hashPair.access_token,
          refresh_token: hashPair.refresh_token,
        });
        cleanHashFromUrl();
        if (!error && data.session) {
          writeSsoCookie(data.session);
          return {
            session: data.session,
            user: extractUserProfile(data.session.user),
            source: "url_hash",
            error: null,
          };
        }
      } else {
        cleanHashFromUrl();
      }
    }

    // 3. Check cross-subdomain cookie simpatti_sso_session
    const cookieRaw = readCookie(SSO_COOKIE_NAME);
    if (cookieRaw) {
      const cookiePair = parseTokenPayload(cookieRaw);
      if (cookiePair) {
        const { data, error } = await supabase.auth.setSession({
          access_token: cookiePair.access_token,
          refresh_token: cookiePair.refresh_token,
        });
        if (!error && data.session) {
          return {
            session: data.session,
            user: extractUserProfile(data.session.user),
            source: "sso_cookie",
            error: null,
          };
        }
      }
    }

    return { session: null, user: null, source: "none", error: null };
  } catch (err) {
    return {
      session: null,
      user: null,
      source: "none",
      error: err instanceof Error ? err.message : "Gagal memeriksa sesi SSO.",
    };
  }
}

export async function signInSsoQuick(
  email: string,
  password: string
): Promise<{
  session: Session | null;
  user: SsoUserProfile | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.session) {
      return {
        session: null,
        user: null,
        error: error?.message || "Email atau kata sandi tidak valid.",
      };
    }
    writeSsoCookie(data.session);
    return {
      session: data.session,
      user: extractUserProfile(data.session.user),
      error: null,
    };
  } catch (err) {
    return {
      session: null,
      user: null,
      error: err instanceof Error ? err.message : "Gagal melakukan login SSO.",
    };
  }
}

export async function signOutSso(): Promise<void> {
  clearSsoCookie();
  await supabase.auth.signOut();
}

export async function buildModuleRelayUrl(
  targetBaseUrl: string,
  rpsId: string | null
): Promise<string> {
  const cleanBase = targetBaseUrl.replace(/\/+$/, "");
  const query = rpsId ? `?rps_id=${encodeURIComponent(rpsId)}` : "";
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      writeSsoCookie(data.session);
      const tokenPayload = encodeURIComponent(
        JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
      );
      return `${cleanBase}${query}#sso_token=${tokenPayload}`;
    }
  } catch {
    // fallback without hash token
  }
  return `${cleanBase}${query}`;
}
