-- Review request state per shop
ALTER TABLE "ShopState" ADD COLUMN "reviewAskedAt" DATETIME;
ALTER TABLE "ShopState" ADD COLUMN "reviewHidden" BOOLEAN NOT NULL DEFAULT false;
