-- Winners' codes combine with product discounts; one-time update of codes already handed out.
ALTER TABLE "Popup" ADD COLUMN "combineProducts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ShopState" ADD COLUMN "codesCombinedAt" DATETIME;
