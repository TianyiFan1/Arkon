import { NextRequest } from 'next/server';
import { processPaymentCallback } from '@/lib/services/subscriptionService';
import { successResponse, errorResponse } from '@/lib/apiResponse';
import { AppError } from '@/lib/services/quizService';

/**
 * POST /api/pay
 * 模拟支付回调接口：
 * - 验证入参 sessionId
 * - 事务性将 Subscription 状态变更为 ACTIVE
 * - 记录交易流水与支付时间
 */
export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new AppError('INVALID_JSON', 'Request body must be valid JSON', 400);
    }

    const result = await processPaymentCallback(body);
    return successResponse(result, 200, 'Payment simulated successfully');
  } catch (error) {
    return errorResponse(error);
  }
}
