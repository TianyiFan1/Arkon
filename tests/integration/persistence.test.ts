import { describe, it, expect } from 'vitest';
import prisma from '@/lib/prisma';
import {
  getOrCreateSession,
  getSessionProgress,
  updateSessionStep,
  AppError,
} from '@/lib/services/quizService';

describe('Integration Test: Persistence & State Recovery (分步保存与进度恢复)', () => {
  it('1. 中断后恢复测试：用户填完前两步离开，再次进入时能完整还原进度', async () => {
    // 1. 初始化会话
    const { session } = await getOrCreateSession();
    const sessionId = session.id;

    // 2. 填写 Step 1 (性别与目标)
    const step1Result = await updateSessionStep(sessionId, {
      gender: 'FEMALE',
      primaryGoal: 'LOSE_WEIGHT',
    });
    expect(step1Result.currentStep).toBe(2);

    // 3. 填写 Step 2 (年龄)
    const step2Result = await updateSessionStep(sessionId, {
      age: 27,
    });
    expect(step2Result.currentStep).toBe(3);

    // 4. 模拟用户关闭浏览器后重新访问：调用进度恢复接口
    const progress = await getSessionProgress(sessionId);

    expect(progress.sessionId).toBe(sessionId);
    expect(progress.currentStep).toBe(3);
    expect(progress.isCompleted).toBe(false);
    expect(progress.answers).not.toBeNull();
    expect(progress.answers?.gender).toBe('FEMALE');
    expect(progress.answers?.primaryGoal).toBe('LOSE_WEIGHT');
    expect(progress.answers?.age).toBe(27);
  });

  it('2. 乱序提交测试：先提交第3步身体数据，再补填第1步基础属性，数据正确合并', async () => {
    const { session } = await getOrCreateSession();
    const sessionId = session.id;

    // 先提交 Step 3 数据 (身高/体重)
    await updateSessionStep(sessionId, {
      heightCm: 175,
      currentWeightKg: 78,
      targetWeightKg: 68,
    });

    // 再补填 Step 1 数据 (性别与目标)
    await updateSessionStep(sessionId, {
      gender: 'MALE',
      primaryGoal: 'LOSE_WEIGHT',
    });

    // 查询数据库，验证多字段非破坏性合并
    const progress = await getSessionProgress(sessionId);
    expect(progress.answers?.heightCm).toBe(175);
    expect(progress.answers?.currentWeightKg).toBe(78);
    expect(progress.answers?.targetWeightKg).toBe(68);
    expect(progress.answers?.gender).toBe('MALE');
    expect(progress.answers?.primaryGoal).toBe('LOSE_WEIGHT');
  });

  it('3. 幂等性与重复提交测试：多次提交相同数据不会引起状态冲突或异常', async () => {
    const { session } = await getOrCreateSession();
    const sessionId = session.id;

    const payload = {
      gender: 'FEMALE' as const,
      primaryGoal: 'MAINTAIN' as const,
      age: 32,
    };

    // 连续调用3次相同请求
    const res1 = await updateSessionStep(sessionId, payload);
    const res2 = await updateSessionStep(sessionId, payload);
    const res3 = await updateSessionStep(sessionId, payload);

    expect(res1.currentStep).toBe(res2.currentStep);
    expect(res2.currentStep).toBe(res3.currentStep);

    // 数据库中关联记录严格为单条，不会产生冗余脏数据
    const count = await prisma.quizResponse.count({
      where: { sessionId },
    });
    expect(count).toBe(1);
  });

  it('4. 并发更新测试：模拟高并发下针对同一Session的不同字段更新', async () => {
    const { session } = await getOrCreateSession();
    const sessionId = session.id;

    // 并发提交不同的字段更新
    await Promise.all([
      updateSessionStep(sessionId, { gender: 'OTHER' }),
      updateSessionStep(sessionId, { primaryGoal: 'BUILD_MUSCLE' }),
      updateSessionStep(sessionId, { age: 24 }),
      updateSessionStep(sessionId, { heightCm: 182 }),
    ]);

    const progress = await getSessionProgress(sessionId);
    expect(progress.answers?.gender).toBe('OTHER');
    expect(progress.answers?.primaryGoal).toBe('BUILD_MUSCLE');
    expect(progress.answers?.age).toBe(24);
    expect(progress.answers?.heightCm).toBe(182);
  });

  it('5. 异常数据拦截测试：非法与越界数值注入必须被Zod拦截，不污染DB', async () => {
    const { session } = await getOrCreateSession();
    const sessionId = session.id;

    // 非法年龄（负数）
    await expect(
      updateSessionStep(sessionId, { age: -5 })
    ).rejects.toThrow(AppError);

    // 越界身高（>260cm）
    await expect(
      updateSessionStep(sessionId, { heightCm: 999 })
    ).rejects.toThrow(AppError);

    // 越界体重（<20kg）
    await expect(
      updateSessionStep(sessionId, { currentWeightKg: 10 })
    ).rejects.toThrow(AppError);

    // 非法枚举值
    await expect(
      updateSessionStep(sessionId, { gender: 'UNKNOWN_GENDER' })
    ).rejects.toThrow(AppError);
  });
});
