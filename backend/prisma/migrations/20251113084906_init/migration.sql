-- CreateTable
CREATE TABLE "Word" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "example" TEXT,
    "partOfSpeech" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);
