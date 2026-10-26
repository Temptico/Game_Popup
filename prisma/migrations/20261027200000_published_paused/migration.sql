-- Whether the published storefront config has the popups paused
ALTER TABLE "ShopState" ADD COLUMN "publishedPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ShopState" ADD COLUMN "publishedPlan" TEXT NOT NULL DEFAULT '';
