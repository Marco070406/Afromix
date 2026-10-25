"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useState } from "react";
import { authApi } from "@/app/(frontend)/lib/api/auth";
import { Button } from "@/app/(frontend)/components/ui/button";
import { Input } from "@/app/(frontend)/components/ui/input";
import { useI18n } from "@/app/(frontend)/providers/i18n-provider";
import { AfromixSymbol } from "@/app/(frontend)/components/brand/afromix-logo";

const schema = z.object({ email: z.email("Email invalide") });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { tr } = useI18n();
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await authApi.forgotPassword(data.email);
      setSubmitted(true);
    } catch {
      // La réponse est toujours la même pour éviter l'énumération
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08090D] px-4">
      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Link href="/" aria-label="AfroMix">
            <AfromixSymbol size={56} />
          </Link>
          <h1 className="text-2xl font-bold text-white">{tr("Mot de passe oublié", "Forgot password")}</h1>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <p className="text-white font-medium">{tr("Email envoyé", "Email sent")}</p>
              <p className="text-sm text-zinc-500">
                {tr("Si cet email est enregistré, vous recevrez un lien de réinitialisation sous peu.", "If this email is registered, you'll receive a reset link shortly.")}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <p className="text-sm text-zinc-400">
                {tr("Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.", "Enter your email and we'll send you a link to reset your password.")}
              </p>
              <Input
                label="Email"
                type="email"
                placeholder="dj@example.com"
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register("email")}
              />
              <Button type="submit" isLoading={isSubmitting} className="w-full">
                {tr("Envoyer le lien", "Send link")}
              </Button>
            </form>
          )}
        </div>

        <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 mt-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {tr("Retour à la connexion", "Back to login")}
        </Link>
      </div>
    </div>
  );
}
