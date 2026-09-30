-- A/B tests
ALTER TABLE "Popup" ADD COLUMN "abEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Popup" ADD COLUMN "abStartedAt" DATETIME;
ALTER TABLE "Popup" ADD COLUMN "abVariant" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "Event" ADD COLUMN "variant" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Claim" ADD COLUMN "variant" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AttributedOrder" ADD COLUMN "variant" TEXT NOT NULL DEFAULT '';
CREATE INDEX "Event_popupId_variant_type_idx" ON "Event"("popupId", "variant", "type");
