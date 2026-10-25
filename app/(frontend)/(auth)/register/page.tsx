"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, User, Mic2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/app/(frontend)/providers/auth-provider";
import { Button } from "@/app/(frontend)/components/ui/button";
import { Input } from "@/app/(frontend)/components/ui/input";
import { ApiError } from "@/app/(frontend)/lib/api/client";
import { cn } from "@/app/(frontend)/lib/utils";
import type { Translate } from "@/app/(frontend)/providers/i18n-provider";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { AfromixSymbol } from "@/app/(frontend)/components/brand/afromix-logo";

// Messages de validation dans la langue courante
const makeSchema = (tr: Translate) =>
  z.object({
    displayName: z.string().min(2, tr("Au moins 2 caractères", "At least 2 characters")).max(50),
    email: z.string().email(tr("Email invalide", "Invalid email")),
    password: z
      .string()
      .min(8, tr("Au moins 8 caractères", "At least 8 characters"))
      .regex(/[A-Z]/, tr("Au moins une majuscule", "At least one uppercase letter"))
      .regex(/[0-9]/, tr("Au moins un chiffre", "At least one number")),
    role: z.enum(["USER", "ARTIST"]),
  });

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

export default function RegisterPage() {
  const { tr } = useI18n();
  const router = useRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<"USER" | "ARTIST">("USER");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(makeSchema(tr)),
    defaultValues: { role: "USER" },
  });

  const handleRoleChange = (r: "USER" | "ARTIST") => {
    setRole(r);
    setValue("role", r);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const { authApi } = await import("@/app/(frontend)/lib/api/auth");
      await authApi.register(data);
      await login(data.email, data.password);
      toast.success(tr("Compte créé avec succès !", "Account created!"));
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) toast.error(tr("Cet email est déjà utilisé", "This email is already in use"));
        else toast.error(tr("Impossible de créer le compte", "Could not create the account"));
      } else {
        toast.error(tr("Une erreur est survenue", "Something went wrong"));
      }
    }
  };

  return (
    <div className="py-12 px-4 flex items-center justify-center min-h-[calc(100vh-14rem)]">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/3 h-[450px] w-[450px] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/3 h-72 w-72 rounded-full bg-pink-600/10 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <Link href="/" aria-label="AfroMix">
            <AfromixSymbol size={64} />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{tr("Créer un compte", "Create an account")}</h1>
            <p className="text-sm text-zinc-400 mt-1">{tr("Rejoignez la plus grande communauté musicale afro", "Join the biggest Afro music community")}</p>
          </div>
        </div>

        <div className="rounded-3xl bg-[#111318]/90 border border-white/[0.08] p-7 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Role selector */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-300">{tr("Type de profil", "Profile type")}</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "USER" as const, icon: User, label: "Auditeur", desc: tr("Écoute & découverte", "Listen & discover") },
                  { value: "ARTIST" as const, icon: Mic2, label: "DJ / Artiste", desc: tr("Création & partage", "Create & share") },
                ].map(({ value, icon: Icon, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleRoleChange(value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3.5 rounded-2xl border text-center transition-all",
                      role === value
                        ? "border-purple-500 bg-purple-500/15 text-white shadow-md shadow-purple-950/40"
                        : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                    )}
                  >
                    <Icon className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="text-xs font-bold">{label}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label={tr("Nom d'affichage ou Nom de scène", "Display name or stage name")}
              type="text"
              placeholder={role === "ARTIST" ? "DJ Kairo" : "Kwame"}
              leftIcon={<User className="h-4 w-4" />}
              error={errors.displayName?.message}
              {...register("displayName")}
            />

            <Input
              label={tr("Adresse Email", "Email address")}
              type="email"
              placeholder={tr("votre@email.com", "you@email.com")}
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label={tr("Mot de passe", "Password")}
              type={showPassword ? "text" : "password"}
              placeholder={tr("Min. 8 car., 1 maj, 1 chiffre", "Min. 8 chars, 1 uppercase, 1 number")}
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

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 font-bold text-sm text-white hover:opacity-95 transition-opacity shadow-lg shadow-purple-600/30 mt-2"
            >
              <span>{tr("Créer mon compte", "Create my account")}</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <p className="text-center text-xs text-zinc-500 pt-1">
              {tr("En créant un compte, vous acceptez nos", "By creating an account, you agree to our")}{" "}
              <Link href="/terms" className="text-zinc-400 hover:text-white underline">{tr("conditions générales", "terms of service")}</Link>.
            </p>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-400 mt-6">
          {tr("Déjà inscrit ?", "Already have an account?")}{" "}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-bold transition-colors ml-1">
            {tr("Se connecter", "Log in")}
          </Link>
        </p>
      </div>
    </div>
  );
}
