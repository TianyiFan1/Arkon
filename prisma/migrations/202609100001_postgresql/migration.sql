-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizResponse" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "gender" TEXT,
    "age" INTEGER,
    "primaryGoal" TEXT,
    "heightCm" DOUBLE PRECISION,
    "currentWeightKg" DOUBLE PRECISION,
    "targetWeightKg" DOUBLE PRECISION,
    "activityLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthAssessment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "bmi" DOUBLE PRECISION NOT NULL,
    "bmiCategory" TEXT NOT NULL,
    "bmr" DOUBLE PRECISION NOT NULL,
    "tdee" DOUBLE PRECISION NOT NULL,
    "recommendedDailyCalories" INTEGER NOT NULL,
    "calorieDeficit" DOUBLE PRECISION NOT NULL,
    "projectedDays" INTEGER NOT NULL,
    "projectedTargetDate" TIMESTAMP(3) NOT NULL,
    "projectionCurveJson" TEXT NOT NULL,
    "macroSplitJson" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "planType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "paidAt" TIMESTAMP(3),
    "transactionId" TEXT,
    "amount" DECIMAL(8,2) NOT NULL DEFAULT 29.99,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSession_createdAt_idx" ON "UserSession"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuizResponse_sessionId_key" ON "QuizResponse"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthAssessment_sessionId_key" ON "HealthAssessment"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_sessionId_key" ON "Subscription"("sessionId");

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthAssessment" ADD CONSTRAINT "HealthAssessment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
