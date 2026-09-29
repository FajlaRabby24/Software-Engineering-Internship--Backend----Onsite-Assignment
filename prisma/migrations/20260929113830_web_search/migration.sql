-- CreateTable
CREATE TABLE "search_histories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sources" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_caches" (
    "id" TEXT NOT NULL,
    "queryKey" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sources" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_caches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_histories_userId_idx" ON "search_histories"("userId");

-- CreateIndex
CREATE INDEX "search_histories_query_idx" ON "search_histories"("query");

-- CreateIndex
CREATE UNIQUE INDEX "search_caches_queryKey_key" ON "search_caches"("queryKey");

-- CreateIndex
CREATE INDEX "search_caches_queryKey_idx" ON "search_caches"("queryKey");

-- AddForeignKey
ALTER TABLE "search_histories" ADD CONSTRAINT "search_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
