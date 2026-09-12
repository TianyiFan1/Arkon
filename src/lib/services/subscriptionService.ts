import { paymentSchema } from '../validations/quiz';
import { AppError } from '../errors';
import { randomUUID } from 'crypto';
import { withSession } from './sessionTransaction';

const prices = { MONTHLY: 29.99, QUARTERLY: 59.99, ANNUAL: 99.99 };

export async function processPaymentCallback(rawData: unknown) {
  const parsed = paymentSchema.safeParse(rawData);
  if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid payment payload', 400, parsed.error.format());
  const { sessionId, planType } = parsed.data;
  return withSession(sessionId, async (tx) => {
    const existing = await tx.subscription.findUnique({ where: { sessionId } });
    // Replaying the same plan preserves transaction ID, amount and paidAt.
    const data = { status: 'ACTIVE', planType, amount: prices[planType], paidAt: new Date(), transactionId: `tx_sim_${randomUUID()}` };
    const subscription = existing?.status === 'ACTIVE' && existing.planType === planType
      ? existing
      : await tx.subscription.upsert({ where: { sessionId }, create: { sessionId, ...data }, update: data });
    return {
      success: true,
      message: 'Simulated subscription is active.',
      transaction: {
        transactionId: subscription.transactionId, sessionId, status: subscription.status,
        planType: subscription.planType, paidAt: subscription.paidAt, amount: Number(subscription.amount),
      },
    };
  });
}
