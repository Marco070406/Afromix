import { z } from "zod";

export const registerSchema = z.object({
  email: z.email("Email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Au moins une majuscule requise")
    .regex(/[0-9]/, "Au moins un chiffre requis"),
  displayName: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(50, "Le nom ne peut pas dépasser 50 caractères"),
  role: z.enum(["USER", "ARTIST"]).default("USER"),
});

export const loginSchema = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const verifyEmailSchema = z.object({
  email: z.email("Email invalide"),
  code: z.string().regex(/^\d{6}$/, "Le code contient 6 chiffres"),
});

export const resendVerificationSchema = z.object({
  email: z.email("Email invalide"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
