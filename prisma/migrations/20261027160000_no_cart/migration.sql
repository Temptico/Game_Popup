-- Do not open for shoppers with something in the cart
ALTER TABLE "Popup" ADD COLUMN "noCart" BOOLEAN NOT NULL DEFAULT false;
