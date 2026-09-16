-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "vpa" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "balance" DECIMAL(19,2) NOT NULL DEFAULT 1000.00,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "packetHash" TEXT NOT NULL,
    "senderVpa" TEXT NOT NULL,
    "receiverVpa" TEXT NOT NULL,
    "amount" DECIMAL(19,2) NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL,
    "bridgeNodeId" TEXT NOT NULL,
    "hopCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_vpa_key" ON "users"("vpa");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_packetHash_key" ON "transactions"("packetHash");

