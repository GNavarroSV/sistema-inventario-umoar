-- Conservar el valor de compra existente como valor unitario.
ALTER TABLE "assets" RENAME COLUMN "purchaseValue" TO "unitValue";

-- La fecha no siempre puede determinarse.
ALTER TABLE "assets" ALTER COLUMN "acquisitionDate" DROP NOT NULL;

-- Retirar los campos que dejaron de formar parte de la ficha del activo.
DROP INDEX IF EXISTS "assets_externalLegacyId_key";
ALTER TABLE "assets"
  DROP COLUMN "externalLegacyId",
  DROP COLUMN "purchaseDate",
  DROP COLUMN "currentValue";
