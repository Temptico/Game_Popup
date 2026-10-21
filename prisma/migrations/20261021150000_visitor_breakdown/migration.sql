-- Device, storefront country and traffic source for analytics breakdowns
ALTER TABLE "Event" ADD COLUMN "device" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Event" ADD COLUMN "country" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Claim" ADD COLUMN "device" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Claim" ADD COLUMN "country" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AttributedOrder" ADD COLUMN "device" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AttributedOrder" ADD COLUMN "country" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AttributedOrder" ADD COLUMN "source" TEXT NOT NULL DEFAULT '';
