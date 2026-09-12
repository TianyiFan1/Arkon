import prisma from '../prisma';
import { stepUpdateSchema, fullQuizDataSchema } from '../validations/quiz';
import { calculateHealthAssessment } from '../algorithm/healthAssessment';
import { AppError } from '../errors';
import { withSession, assertVersion } from './sessionTransaction';
export { AppError } from '../errors';

export interface QuizAnswersInput {
  gender?: string | null;
  primaryGoal?: string | null;
  age?: number | null;
  heightCm?: number | null;
  currentWeightKg?: number | null;
  targetWeightKg?: number | null;
  activityLevel?: string | null;
}

/**
 * 推导当前用户所处步骤 (1 到 5)
 */
export function calculateCurrentStep(answers: QuizAnswersInput | null | undefined): number {
  if (!answers) return 1;
  const hasStep1 = Boolean(answers.gender && answers.primaryGoal);
  if (!hasStep1) return 1;

  const hasStep2 = typeof answers.age === 'number';
  if (!hasStep2) return 2;

  const hasStep3 =
    typeof answers.heightCm === 'number' &&
    typeof answers.currentWeightKg === 'number' &&
    typeof answers.targetWeightKg === 'number';
  if (!hasStep3) return 3;

  const hasStep4 = Boolean(answers.activityLevel);
  if (!hasStep4) return 4;

  return 5;
}

/**
 * 1. 获取或创建测评会话
 */
export async function getOrCreateSession(sessionId?: string) {
  if (sessionId) {
    const existing = await prisma.userSession.findUnique({
      where: { id: sessionId },
      include: {
        quizResponse: true,
        healthAssessment: true,
        subscription: true,
      },
    });

    if (existing) {
      return {
        session: existing,
        isNew: false,
      };
    }
  }

  // 创建新会话并默认绑定未激活的订阅记录
  const newSession = await prisma.userSession.create({
    data: {
      currentStep: 1,
      isCompleted: false,
      subscription: {
        create: {
          status: 'INACTIVE',
          planType: 'MONTHLY',
          amount: 29.99,
        },
      },
    },
    include: {
      quizResponse: true,
      healthAssessment: true,
      subscription: true,
    },
  });

  return {
    session: newSession,
    isNew: true,
  };
}

/**
 * 2. 进度恢复：获取当前会话进度与已填字段
 */
export async function getSessionProgress(sessionId: string) {
  return withSession(sessionId, async (tx) => {
    const session = await tx.userSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { quizResponse: true, subscription: true, healthAssessment: true },
    });
    return {
      sessionId: session.id,
      version: session.version,
      currentStep: calculateCurrentStep(session.quizResponse),
      isCompleted: session.isCompleted,
      hasAssessment: !!session.healthAssessment,
      subscriptionStatus: session.subscription?.status || 'INACTIVE',
      answers: session.quizResponse,
    };
  });
}

/** Save one revision atomically; exact retries preserve the assessment. */
export async function updateSessionStep(sessionId: string, rawData: unknown, expectedVersion?: number) {
  const parsed = stepUpdateSchema.safeParse(rawData);
  if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Validation failed for step update', 400, parsed.error.format());
  const patch = parsed.data;
  return withSession(sessionId, async (tx) => {
    const session = await tx.userSession.findUniqueOrThrow({ where: { id: sessionId }, include: { quizResponse: true } });
    const unchanged = session.quizResponse && Object.entries(patch).every(([key, value]) =>
      session.quizResponse![key as keyof typeof patch] === value);
    // An exact retry is safe even if its original response was lost.
    if (unchanged) return { sessionId, version: session.version, currentStep: session.currentStep, answers: session.quizResponse };
    assertVersion(session.version, expectedVersion);
    const answers = await tx.quizResponse.upsert({ where: { sessionId }, create: { sessionId, ...patch }, update: patch });
    await tx.healthAssessment.deleteMany({ where: { sessionId } });
    const currentStep = calculateCurrentStep(answers);
    const updated = await tx.userSession.update({
      where: { id: sessionId },
      data: { currentStep, isCompleted: false, version: { increment: 1 } },
    });
    return { sessionId, version: updated.version, currentStep, answers };
  });
}

/** Serialize computation with answer edits, including the input read. */
export async function calculateAndSaveAssessment(sessionId: string, expectedVersion?: number) {
  return withSession(sessionId, async (tx) => {
    const session = await tx.userSession.findUniqueOrThrow({
      where: { id: sessionId }, include: { quizResponse: true, healthAssessment: true },
    });
    assertVersion(session.version, expectedVersion);
    if (!session.quizResponse) throw new AppError('INCOMPLETE_QUIZ', 'No quiz responses found', 400);
    const parsed = fullQuizDataSchema.safeParse(session.quizResponse);
    if (!parsed.success) throw new AppError('INCOMPLETE_OR_INVALID_DATA', 'Quiz data is incomplete or contradictory', 400, parsed.error.format());
    // Stable retries do not shift the prediction date.
    if (session.healthAssessment) return session.healthAssessment;
    const { projectionCurve, macroSplit, ...metrics } = calculateHealthAssessment(parsed.data);
    const assessment = await tx.healthAssessment.create({ data: {
      sessionId, ...metrics,
      projectionCurveJson: JSON.stringify(projectionCurve),
      macroSplitJson: JSON.stringify(macroSplit),
    } });
    await tx.userSession.update({ where: { id: sessionId }, data: { isCompleted: true, currentStep: 5 } });
    return assessment;
  });
}

/**
 * 5. 结果页鉴权与差异化脱敏返回（核心安全要求）
 */
export async function getDifferentiatedQuizResult(sessionId: string) {
  return withSession(sessionId, async (tx) => {
  const session = await tx.userSession.findUnique({
    where: { id: sessionId },
    include: {
      healthAssessment: true,
      subscription: true,
      quizResponse: true,
    },
  });

  if (!session) {
    throw new AppError('SESSION_NOT_FOUND', `Session ${sessionId} does not exist`, 404);
  }

  if (!session.healthAssessment) {
    throw new AppError('ASSESSMENT_NOT_CALCULATED', 'Assessment has not been calculated yet', 404);
  }

  const assessment = session.healthAssessment;
  const isSubscribed = session.subscription?.status === 'ACTIVE';

  // 基础公开概要信息（所有用户均可见）
  const publicSummary = {
    sessionId: session.id,
    bmi: assessment.bmi,
    bmiCategory: assessment.bmiCategory,
    bmr: assessment.bmr,
    tdee: assessment.tdee,
    recommendedDailyCalories: assessment.recommendedDailyCalories,
    calorieDeficit: assessment.calorieDeficit,
    projectedDays: assessment.projectedDays,
    projectedTargetDate: assessment.projectedTargetDate,
    calculatedAt: assessment.calculatedAt,
    targetWeightKg: session.quizResponse?.targetWeightKg,
    currentWeightKg: session.quizResponse?.currentWeightKg,
  };

  if (!isSubscribed) {
    // 【非会员脱敏机制】：敏感高价值字段（详细预测曲线、三大营养素进阶分配）在服务端彻底置空
    return {
      isSubscribed: false,
      subscriptionStatus: 'INACTIVE',
      summary: publicSummary,
      protectedData: {
        projectionCurve: null,
        macroSplit: null,
      },
      paywall: {
        isLocked: true,
        message: 'Upgrade to Premium to unlock your personalized week-by-week weight loss projection curve and macro nutritional breakdown.',
        price: Number(session.subscription?.amount ?? 29.99),
        currency: 'USD',
        planType: session.subscription?.planType || 'MONTHLY',
      },
    };
  }

  // 【会员特权完整数据】
  return {
    isSubscribed: true,
    subscriptionStatus: 'ACTIVE',
    summary: publicSummary,
    protectedData: {
      projectionCurve: JSON.parse(assessment.projectionCurveJson),
      macroSplit: JSON.parse(assessment.macroSplitJson),
    },
    paywall: {
      isLocked: false,
      message: 'Active subscriber. Full features unlocked.',
    },
  };
  });
}


