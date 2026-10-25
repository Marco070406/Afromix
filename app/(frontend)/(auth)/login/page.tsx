"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { Button } from "@/app/(frontend)/components/ui/button";
import { Input } from "@/app/(frontend)/components/ui/input";
import { ApiError } from "@/app/(frontend)/lib/api/client";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { AfromixSymbol } from "@/app/(frontend)/components/brand/afromix-logo";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { tr } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      await login(data.email, data.password);
      toast.success(tr("Connexion réussie !", "Logged in!"));
      const from = searchParams.get("from") ?? "/";
      router.push(from);
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.details as { code?: string } | undefined;
        if (err.status === 401) toast.error(tr("Email ou mot de passe incorrect", "Incorrect email or password"));
        else if (err.status === 403 && details?.code === "EMAIL_NOT_VERIFIED") {
          toast.info(tr("Confirmez d'abord votre adresse : un code vient de vous être envoyé.", "Please confirm your email first: a code has just been sent to you."));
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        }
        else if (err.status === 403) toast.error(tr("Compte suspendu", "Account suspended"));
        else if (err.status === 429) toast.error(tr("Trop de tentatives, réessayez dans une minute.", "Too many attempts, try again in a minute."));
        else toast.error(tr("Impossible de se connecter", "Could not log in"));
      } else {
        toast.error(tr("Une erreur est survenue", "Something went wrong"));
      }
    }
  };

  return (
    <div className="py-12 px-4 flex items-center justify-center min-h-[calc(100vh-14rem)]">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/3 h-72 w-72 rounded-full bg-pink-600/10 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header Logo */}
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <Link href="/" aria-label="AfroMix">
            <AfromixSymbol size={64} />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{tr("Connexion", "Log in")}</h1>
            <p className="text-sm text-zinc-400 mt-1">{tr("Bienvenue sur votre espace streaming AfroMix", "Welcome to your AfroMix streaming space")}</p>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-3xl bg-[#111318]/90 border border-white/[0.08] p-7 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label={tr("Adresse Email", "Email address")}
              type="email"
              placeholder="dj@afromix.io"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register("email")}
            />

            <div>
              <Input
                label={tr("Mot de passe", "Password")}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    tabIndex={-1}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register("password")}
              />

              <div className="flex justify-end mt-2">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {tr("Mot de passe oublié ?", "Forgot password?")}
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 font-bold text-sm text-white hover:opacity-95 transition-opacity shadow-lg shadow-purple-600/30 mt-2"
            >
              <span>{tr("Se connecter", "Log in")}</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-zinc-400 mt-6">
          {tr("Pas encore de compte ?", "No account yet?")}{" "}
          <Link
            href="/register"
            className="text-purple-400 hover:text-purple-300 font-bold transition-colors ml-1"
          >
            {tr("S'inscrire gratuitement", "Sign up for free")}
          </Link>
        </p>
      </div>
    </div>
  );
}
