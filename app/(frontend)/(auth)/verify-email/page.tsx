"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Mail, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/app/(frontend)/lib/api/auth";
import { ApiError } from "@/app/(frontend)/lib/api/client";
import { Button } from "@/app/(frontend)/components/ui/button";
import { Input } from "@/app/(frontend)/components/ui/input";
import { AfromixSymbol } from "@/app/(frontend)/components/brand/afromix-logo";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { cn } from "@/app/(frontend)/lib/utils";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_S = 60;

type VerifyErrorDetails = { reason?: string; attemptsLeft?: number };

function VerifyEmailContent() {
  const { tr } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [emailConfirmed, setEmailConfirmed] = useState(!!searchParams.get("email"));
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Un code vient d'être envoyé (inscription ou connexion) : renvoi possible après le délai
  const [cooldown, setCooldown] = useState(emailConfirmed ? RESEND_COOLDOWN_S : 0);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = async (code: string) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await authApi.verifyEmail(email, code);
      await refresh();
      toast.success(tr("Adresse confirmée, bienvenue sur AfroMix !", "Email confirmed, welcome to AfroMix!"));
      router.push("/");
    } catch (err) {
      const details = (err instanceof ApiError ? err.details : undefined) as VerifyErrorDetails | undefined;
      if (err instanceof ApiError && err.status === 429) {
        setError(tr("Trop de tentatives. Réessayez dans quelques minutes.", "Too many attempts. Try again in a few minutes."));
      } else if (details?.reason === "invalid") {
        setError(
          tr(
            `Code incorrect. Il vous reste ${details.attemptsLeft} essai${details.attemptsLeft === 1 ? "" : "s"}.`,
            `Wrong code. ${details.attemptsLeft} attempt${details.attemptsLeft === 1 ? "" : "s"} left.`
          )
        );
      } else if (details?.reason === "too_many_attempts") {
        setError(tr("Trop d'essais erronés : demandez un nouveau code.", "Too many wrong attempts: request a new code."));
      } else if (details?.reason === "already_verified") {
        toast.info(tr("Cette adresse est déjà confirmée, vous pouvez vous connecter.", "This email is already confirmed, you can log in."));
        router.push("/login");
        return;
      } else if (details?.reason === "expired") {
        setError(tr("Code expiré ou introuvable : demandez un nouveau code.", "Code expired or not found: request a new code."));
      } else {
        setError(tr("Une erreur est survenue. Réessayez.", "Something went wrong. Please try again."));
      }
      setDigits(Array(CODE_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const setDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((x, i) => (i === index ? "" : x)));
      return;
    }
    // Saisie de plusieurs chiffres d'un coup (collage, remplissage automatique du code)
    const next = [...digits];
    for (let i = 0; i < clean.length && index + i < CODE_LENGTH; i++) next[index + i] = clean[i];
    setDigits(next);
    const filled = next.findIndex((d) => !d);
    inputs.current[filled === -1 ? CODE_LENGTH - 1 : filled]?.focus();
    if (next.every(Boolean)) submit(next.join(""));
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
    if (e.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const resend = async () => {
    if (cooldown > 0 || !email) return;
    try {
      await authApi.resendVerification(email);
      toast.success(tr("Si un compte est en attente pour cette adresse, un nouveau code vient d'être envoyé.", "If an account is pending for this email, a new code has been sent."));
      setError(null);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 429
          ? tr("Trop de demandes. Réessayez plus tard.", "Too many requests. Try again later.")
          : tr("Impossible d'envoyer le code.", "Could not send the code.")
      );
    } finally {
      setCooldown(RESEND_COOLDOWN_S);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-12">
      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <Link href="/" aria-label="AfroMix">
            <AfromixSymbol size={56} />
          </Link>
          <h1 className="text-2xl font-bold text-white">{tr("Confirmez votre adresse", "Confirm your email")}</h1>
          {emailConfirmed && (
            <p className="text-sm text-muted">
              {tr("Entrez le code à 6 chiffres envoyé à", "Enter the 6-digit code sent to")}{" "}
              <span className="font-semibold text-white break-all">{email}</span>
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-surface border border-line p-6">
          {!emailConfirmed ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) setEmailConfirmed(true);
              }}
              className="flex flex-col gap-4"
            >
              <p className="text-sm text-muted">
                {tr("Indiquez l'adresse utilisée à l'inscription.", "Enter the email you signed up with.")}
              </p>
              <Input
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                placeholder="dj@example.com"
                leftIcon={<Mail className="h-4 w-4" />}
              />
              <Button type="submit" className="w-full">{tr("Continuer", "Continue")}</Button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (digits.every(Boolean)) submit(digits.join(""));
              }}
              className="flex flex-col gap-5"
            >
              <div className="flex justify-between gap-2" role="group" aria-label={tr("Code de vérification", "Verification code")}>
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputs.current[i] = el; }}
                    value={digit}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    autoFocus={i === 0}
                    maxLength={i === 0 ? CODE_LENGTH : 1}
                    disabled={submitting}
                    aria-label={tr(`Chiffre ${i + 1}`, `Digit ${i + 1}`)}
                    className={cn(
                      "h-14 w-full min-w-0 rounded-xl bg-surface-2 border text-center text-2xl font-bold text-white tabular-nums outline-none transition-colors",
                      "focus:border-brand focus:ring-2 focus:ring-brand/30",
                      error ? "border-red-500/60" : "border-line-strong"
                    )}
                  />
                ))}
              </div>

              {error && <p className="text-sm text-red-400 text-center" role="alert">{error}</p>}

              <Button type="submit" isLoading={submitting} disabled={!digits.every(Boolean)} className="w-full">
                {tr("Vérifier", "Verify")}
              </Button>

              <div className="flex flex-col items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={resend}
                  disabled={cooldown > 0}
                  className="inline-flex items-center gap-1.5 font-medium text-brand hover:text-white disabled:text-subtle disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  {cooldown > 0
                    ? tr(`Renvoyer le code dans ${cooldown} s`, `Resend code in ${cooldown}s`)
                    : tr("Renvoyer le code", "Resend code")}
                </button>
                <button
                  type="button"
                  onClick={() => { setEmailConfirmed(false); setError(null); }}
                  className="text-subtle hover:text-white transition-colors"
                >
                  {tr("Changer d'adresse", "Use another email")}
                </button>
              </div>
              <p className="text-xs text-subtle text-center">
                {tr("Le code expire au bout de 10 minutes. Pensez à vérifier vos spams.", "The code expires after 10 minutes. Check your spam folder.")}
              </p>
            </form>
          )}
        </div>

        <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-subtle hover:text-white mt-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {tr("Retour à la connexion", "Back to login")}
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
