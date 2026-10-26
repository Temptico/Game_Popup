-- Save winners' codes on the Shopify customer (code reminder)
ALTER TABLE "Claim" ADD COLUMN "customerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Popup" ADD COLUMN "saveCode" BOOLEAN NOT NULL DEFAULT false;
