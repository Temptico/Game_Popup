-- Scheduled pause: the popup does not show between these instants.
ALTER TABLE "Popup" ADD COLUMN "pauseFrom" DATETIME;
ALTER TABLE "Popup" ADD COLUMN "pauseUntil" DATETIME;
