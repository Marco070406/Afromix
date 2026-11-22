-- Forme d'onde du mix : 500 valeurs de 0 à 100

-- AlterTable
ALTER TABLE "mixes" ADD COLUMN     "waveform" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
