import { describe, it, expect } from 'vitest';
import prisma from '@/lib/prisma';
import {
  getOrCreateSession,
  updateSessionStep,
  calculateAndSaveAssessment,
  getDifferentiatedQuizResult,
  AppError,
} from '@/lib/services/quizService';
import { processPaymentCallback } from '@/lib/services/subscriptionService';

describe('Integration Test: Auth, Desensitization & Payment Lifecycle (订阅鉴权、脱敏与支付全生命周期)', () => {
  it('端到端验证：未付费脱敏 -> /pay支付回调 -> 会员完整数据解锁', async () => {
    // 1. 创建完整测评流程数据
    const { session } = await getOrCreateSession();
    const sessionId = session.id;

    await updateSessionStep(sessionId, {
      gender: 'FEMALE',
      primaryGoal: 'LOSE_WEIGHT',
      age: 26,
      heightCm: 168,
      currentWeightKg: 68,
      targetWeightKg: 58,
      activityLevel: 'MODERATE',
    });

    // 2. 提交计算健康指标
    await calculateAndSaveAssessment(sessionId);

    // 3. 【非会员状态验证】：必须在服务端严格脱敏
    const unsubscribedResult = await getDifferentiatedQuizResult(sessionId);

    expect(unsubscribedResult.isSubscribed).toBe(false);
    expect(unsubscribedResult.subscriptionStatus).toBe('INACTIVE');
    expect(unsubscribedResult.paywall?.isLocked).toBe(true);

    // 核心安全红线断言：非会员绝对拿不到受保护的预测曲线和营养微调
    expect(unsubscribedResult.protectedData.projectionCurve).toBeNull();
    expect(unsubscribedResult.protectedData.macroSplit).toBeNull();

    // 基础公开信息正常返回
    expect(unsubscribedResult.summary.bmi).toBeGreaterThan(0);
    expect(unsubscribedResult.summary.projectedDays).toBeGreaterThan(0);

    // 4. 【模拟支付调用】：调用 /pay 回调
    const payResult = await processPaymentCallback({
      sessionId,
      planType: 'MONTHLY',
    });

    expect(payResult.success).toBe(true);
    expect(payResult.transaction.status).toBe('ACTIVE');
    expect(payResult.transaction.transactionId).toMatch(/^tx_sim_/);
    expect(payResult.transaction.paidAt).toBeInstanceOf(Date);

    // 验证数据库状态真实变更为 ACTIVE
    const dbSub = await prisma.subscription.findUnique({ where: { sessionId } });
    expect(dbSub?.status).toBe('ACTIVE');
    expect(dbSub?.paidAt).not.toBeNull();

    // 5. 【会员状态验证】：同一会话再次查询，返回完整数据
    const subscribedResult = await getDifferentiatedQuizResult(sessionId);

    expect(subscribedResult.isSubscribed).toBe(true);
    expect(subscribedResult.subscriptionStatus).toBe('ACTIVE');
    expect(subscribedResult.paywall?.isLocked).toBe(false);

    // 核心断言：受保护字段此时完整解锁且结构符合规范
    expect(Array.isArray(subscribedResult.protectedData.projectionCurve)).toBe(true);
    expect(subscribedResult.protectedData.projectionCurve!.length).toBeGreaterThan(1);
    expect(subscribedResult.protectedData.projectionCurve![0]).toHaveProperty('projectedWeightKg', 68);

    expect(subscribedResult.protectedData.macroSplit).toHaveProperty('proteinGrams');
    expect(subscribedResult.protectedData.macroSplit).toHaveProperty('carbsGrams');
    expect(subscribedResult.protectedData.macroSplit).toHaveProperty('fatGrams');
  });

  it('安全防线：未完成计算的会话尝试查询结果应抛出明确异常', async () => {
    const { session } = await getOrCreateSession();
    await expect(getDifferentiatedQuizResult(session.id)).rejects.toThrow(AppError);
  });

  it('安全防线：伪造不存在的 Session ID 查询或支付应被 404 拦截', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await expect(getDifferentiatedQuizResult(fakeId)).rejects.toThrow(AppError);
    await expect(processPaymentCallback({ sessionId: fakeId })).rejects.toThrow(AppError);
  });
});
