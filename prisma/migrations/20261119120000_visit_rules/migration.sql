-- Who sees the popup: visitors with another code, visit sources, scroll trigger.
ALTER TABLE "Popup" ADD COLUMN "hideWithCode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Popup" ADD COLUMN "sourceFirst" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Popup" ADD COLUMN "sourceAll" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Popup" ADD COLUMN "scrollPct" INTEGER NOT NULL DEFAULT 50;
