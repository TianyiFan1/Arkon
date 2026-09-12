import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as handleSessionPost, GET as handleSessionGet, PATCH as handleSessionPatch } from '@/app/api/quiz/session/route';
import { POST as handleCalculatePost } from '@/app/api/quiz/calculate/route';
import { GET as handleResultsGet } from '@/app/api/quiz/results/route';
import { POST as handlePayPost } from '@/app/api/pay/route';

describe('Route handler integration: Full Quiz Funnel API Workflow (全流程闭环 API 端到端测试)', () => {
  const baseUrl = 'http://localhost:3000';

  it('走通全链路：创建会话 -> 逐步增量保存 -> 掉线进度恢复 -> 服务端计算 -> 非会员脱敏验证 -> /pay模拟支付 -> 会员全量数据解锁', async () => {
    // ----------------------------------------------------------------
    // 1. 创建会话 (POST /api/quiz/session)
    // ----------------------------------------------------------------
    const createReq = new NextRequest(`${baseUrl}/api/quiz/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const createRes = await handleSessionPost(createReq);
    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    expect(createJson.success).toBe(true);
    const sessionId = createJson.data.sessionId;
    expect(sessionId).toBeDefined();

    // ----------------------------------------------------------------
    // 2. 分步提交 Step 1: 性别与目标 (PATCH /api/quiz/session)
    // ----------------------------------------------------------------
    const patchStep1Req = new NextRequest(`${baseUrl}/api/quiz/session`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
      },
      body: JSON.stringify({
        expectedVersion: 0,
        gender: 'MALE',
        primaryGoal: 'LOSE_WEIGHT',
      }),
    });
    const patchStep1Res = await handleSessionPatch(patchStep1Req);
    expect(patchStep1Res.status).toBe(200);
    const patchStep1Json = await patchStep1Res.json();
    expect(patchStep1Json.data.currentStep).toBe(2);

    // ----------------------------------------------------------------
    // 3. 分步提交 Step 2: 年龄
    // ----------------------------------------------------------------
    const patchStep2Req = new NextRequest(`${baseUrl}/api/quiz/session`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
      },
      body: JSON.stringify({ age: 31, expectedVersion: 1 }),
    });
    const patchStep2Res = await handleSessionPatch(patchStep2Req);
    expect(patchStep2Res.status).toBe(200);
    const patchStep2Json = await patchStep2Res.json();
    expect(patchStep2Json.data.currentStep).toBe(3);

    // ----------------------------------------------------------------
    // 4. 模拟掉线恢复：GET /api/quiz/session
    // ----------------------------------------------------------------
    const recoverReq = new NextRequest(`${baseUrl}/api/quiz/session`, {
      method: 'GET',
      headers: { 'x-session-id': sessionId },
    });
    const recoverRes = await handleSessionGet(recoverReq);
    expect(recoverRes.status).toBe(200);
    const recoverJson = await recoverRes.json();
    expect(recoverJson.data.currentStep).toBe(3);
    expect(recoverJson.data.answers.gender).toBe('MALE');
    expect(recoverJson.data.answers.age).toBe(31);

    // ----------------------------------------------------------------
    // 5. 补齐后续步骤：身体数据与运动习惯
    // ----------------------------------------------------------------
    const patchRemainingReq = new NextRequest(`${baseUrl}/api/quiz/session`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
      },
      body: JSON.stringify({
        expectedVersion: 2,
        heightCm: 180,
        currentWeightKg: 86,
        targetWeightKg: 76,
        activityLevel: 'MODERATE',
      }),
    });
    const patchRemainingRes = await handleSessionPatch(patchRemainingReq);
    expect(patchRemainingRes.status).toBe(200);

    // ----------------------------------------------------------------
    // 6. 提交全量答卷并触发服务端计算 (POST /api/quiz/calculate)
    // ----------------------------------------------------------------
    const calcReq = new NextRequest(`${baseUrl}/api/quiz/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
      },
      body: JSON.stringify({ expectedVersion: 3 }),
    });
    const calcRes = await handleCalculatePost(calcReq);
    expect(calcRes.status).toBe(200);
    const calcJson = await calcRes.json();
    expect(calcJson.success).toBe(true);
    expect(calcJson.data.bmi).toBeGreaterThan(0);
    expect(calcJson.data.recommendedDailyCalories).toBeGreaterThan(1200);

    // ----------------------------------------------------------------
    // 7. 查询结果：未付费状态（GET /api/quiz/results）
    // ----------------------------------------------------------------
    const resultsBeforePayReq = new NextRequest(`${baseUrl}/api/quiz/results`, {
      method: 'GET',
      headers: { 'x-session-id': sessionId },
    });
    const resultsBeforePayRes = await handleResultsGet(resultsBeforePayReq);
    expect(resultsBeforePayRes.status).toBe(200);
    const resultsBeforePayJson = await resultsBeforePayRes.json();

    expect(resultsBeforePayJson.data.isSubscribed).toBe(false);
    expect(resultsBeforePayJson.data.paywall.isLocked).toBe(true);
    // 核心安全验证：非会员无法拿到受保护数据
    expect(resultsBeforePayJson.data.protectedData.projectionCurve).toBeNull();
    expect(resultsBeforePayJson.data.protectedData.macroSplit).toBeNull();

    // ----------------------------------------------------------------
    // 8. 模拟支付回调 (POST /api/pay)
    // ----------------------------------------------------------------
    const payReq = new NextRequest(`${baseUrl}/api/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        planType: 'MONTHLY',
      }),
    });
    const payRes = await handlePayPost(payReq);
    expect(payRes.status).toBe(200);
    const payJson = await payRes.json();
    expect(payJson.success).toBe(true);
    expect(payJson.data.transaction.status).toBe('ACTIVE');

    // ----------------------------------------------------------------
    // 9. 查询结果：已付费状态，验证全量解锁（GET /api/quiz/results）
    // ----------------------------------------------------------------
    const resultsAfterPayReq = new NextRequest(`${baseUrl}/api/quiz/results`, {
      method: 'GET',
      headers: { 'x-session-id': sessionId },
    });
    const resultsAfterPayRes = await handleResultsGet(resultsAfterPayReq);
    expect(resultsAfterPayRes.status).toBe(200);
    const resultsAfterPayJson = await resultsAfterPayRes.json();

    expect(resultsAfterPayJson.data.isSubscribed).toBe(true);
    expect(resultsAfterPayJson.data.paywall.isLocked).toBe(false);
    // 核心解锁验证：曲线数据与微量元素分配完整下发
    expect(Array.isArray(resultsAfterPayJson.data.protectedData.projectionCurve)).toBe(true);
    expect(resultsAfterPayJson.data.protectedData.projectionCurve.length).toBeGreaterThan(0);
    expect(resultsAfterPayJson.data.protectedData.macroSplit.proteinGrams).toBeGreaterThan(0);
  });
});
