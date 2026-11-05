-- Pages where the popup never opens (one path per line).
ALTER TABLE "Popup" ADD COLUMN "excludePages" TEXT NOT NULL DEFAULT '';
