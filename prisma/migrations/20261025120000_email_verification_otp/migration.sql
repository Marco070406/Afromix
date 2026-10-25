-- Vérification d'e-mail par code OTP : compteur d'essais erronés
ALTER TABLE "email_verifications" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- Les anciens jetons de lien (format différent) ne sont plus utilisables
DELETE FROM "email_verifications";

-- Comptes créés avant la vérification obligatoire : considérés comme vérifiés
UPDATE "users" SET "emailVerified" = NOW() WHERE "emailVerified" IS NULL;
