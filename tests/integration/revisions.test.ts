import { describe, it, expect } from 'vitest';
import prisma from '../../src/lib/prisma';
import { getOrCreateSession, updateSessionStep, calculateAndSaveAssessment, getDifferentiatedQuizResult, getSessionProgress } from '../../src/lib/services/quizService';
import { processPaymentCallback } from '../../src/lib/services/subscriptionService';
import { withSession } from '../../src/lib/services/sessionTransaction';

const answers = { gender: 'MALE', primaryGoal: 'LOSE_WEIGHT', age: 30, heightCm: 180, currentWeightKg: 85, targetWeightKg: 75, activityLevel: 'LIGHT' };
async function complete() {
  const { session } = await getOrCreateSession();
  await updateSessionStep(session.id, answers, 0);
  return session.id;
}

describe('PostgreSQL revisions, locking and invalidation', () => {
  it('invalidates results atomically after an answer edit, preserving subscription', async () => {
    const id = await complete();
    await calculateAndSaveAssessment(id, 1);
    await processPaymentCallback({ sessionId: id });
    await updateSessionStep(id, { currentWeightKg: 90 }, 1);
    const progress = await getSessionProgress(id);
    expect(progress).toMatchObject({ version: 2, hasAssessment: false, isCompleted: false, subscriptionStatus: 'ACTIVE' });
    await expect(getDifferentiatedQuizResult(id)).rejects.toMatchObject({ code: 'ASSESSMENT_NOT_CALCULATED' });
    const assessment = await calculateAndSaveAssessment(id, 2);
    expect(assessment.bmi).toBe(27.8);
    const result = await getDifferentiatedQuizResult(id);
    expect(result.summary.currentWeightKg).toBe(90);
    expect(result.protectedData.projectionCurve[0].projectedWeightKg).toBe(90);
  });

  it('preserves results and timestamps for exact retries', async () => {
    const id = await complete();
    const first = await calculateAndSaveAssessment(id, 1);
    await updateSessionStep(id, answers, 0);
    const second = await calculateAndSaveAssessment(id, 1);
    expect(second).toEqual(first);
    expect((await getSessionProgress(id)).version).toBe(1);
  });

  it('rejects an older conflicting write without overwriting a newer answer', async () => {
    const id = await complete();
    await updateSessionStep(id, { age: 31 }, 1);
    await expect(updateSessionStep(id, { age: 32 }, 1)).rejects.toMatchObject({ code: 'VERSION_CONFLICT', statusCode: 409 });
    expect((await getSessionProgress(id)).answers?.age).toBe(31);
  });

  it('allows exactly one of two conflicting concurrent edits', async () => {
    const id = await complete();
    const outcomes = await Promise.allSettled([updateSessionStep(id, { age: 31 }, 1), updateSessionStep(id, { age: 32 }, 1)]);
    expect(outcomes.filter(x => x.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter(x => x.status === 'rejected')).toHaveLength(1);
    expect((await getSessionProgress(id)).version).toBe(2);
  });

  it('serializes partial writes and keeps the stored progress correct', async () => {
    const { session } = await getOrCreateSession();
    await Promise.all(Object.entries(answers).map(([key, value]) => updateSessionStep(session.id, { [key]: value })));
    const stored = await prisma.userSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(stored.currentStep).toBe(5);
    expect((await getSessionProgress(session.id)).answers).toMatchObject(answers);
  });

  it('serializes calculations with answer changes; no stale assessment survives', async () => {
    const id = await complete();
    const [calculation, update] = await Promise.allSettled([
      calculateAndSaveAssessment(id, 1), updateSessionStep(id, { currentWeightKg: 90 }, 1),
    ]);
    expect(update.status).toBe('fulfilled');
    if (calculation.status === 'rejected') expect(calculation.reason.code).toBe('VERSION_CONFLICT');
    expect(await prisma.healthAssessment.findUnique({ where: { sessionId: id } })).toBeNull();
    expect((await getSessionProgress(id)).isCompleted).toBe(false);
  });

  it('rolls back partial database writes on transaction failure', async () => {
    const id = await complete();
    await expect(withSession(id, async tx => {
      await tx.quizResponse.update({ where: { sessionId: id }, data: { age: 99 } });
      throw new Error('simulated failure');
    })).rejects.toThrow('simulated failure');
    expect((await getSessionProgress(id)).answers?.age).toBe(30);
  });
});

describe('Payment prices and replay', () => {
  it.each([['MONTHLY', 29.99], ['QUARTERLY', 59.99], ['ANNUAL', 99.99]])('charges the configured %s price', async (planType, price) => {
    const id = await complete();
    const result = await processPaymentCallback({ sessionId: id, planType });
    expect(result.transaction.amount).toBe(price);
    expect(Number((await prisma.subscription.findUniqueOrThrow({ where: { sessionId: id } })).amount)).toBe(price);
  });
  it('replays concurrent same-plan payments without creating new transactions', async () => {
    const id = await complete();
    const results = await Promise.all(Array.from({ length: 4 }, () => processPaymentCallback({ sessionId: id, planType: 'ANNUAL' })));
    for (const result of results) expect(result).toEqual(results[0]);
  });
});
