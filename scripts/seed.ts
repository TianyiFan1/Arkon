import prisma from '../src/lib/prisma';
import { updateSessionStep, calculateAndSaveAssessment } from '../src/lib/services/quizService';
import { processPaymentCallback } from '../src/lib/services/subscriptionService';

async function main() {
  const examples = [
    { id: '11111111-2222-4333-8444-555555555555', paid: true, gender: 'FEMALE', age: 29, heightCm: 168, currentWeightKg: 68, targetWeightKg: 58, activityLevel: 'MODERATE' },
    { id: '99999999-8888-4777-8666-555555555555', paid: false, gender: 'MALE', age: 32, heightCm: 182, currentWeightKg: 88, targetWeightKg: 78, activityLevel: 'LIGHT' },
  ];
  for (const { id, paid, ...answers } of examples) {
    const existing = await prisma.userSession.findUnique({ where: { id } });
    if (existing) { console.log(`Preserved existing demo session: ${id}`); continue; }
    await prisma.userSession.create({ data: { id, subscription: { create: {} } } });
    await updateSessionStep(id, { ...answers, primaryGoal: 'LOSE_WEIGHT' }, 0);
    await calculateAndSaveAssessment(id, 1);
    if (paid) await processPaymentCallback({ sessionId: id, planType: 'MONTHLY' });
    console.log(`Created ${paid ? 'paid' : 'unpaid'} demo: ${id}`);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
