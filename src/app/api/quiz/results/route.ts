import { NextRequest } from 'next/server';
import { getDifferentiatedQuizResult, AppError } from '@/lib/services/quizService';
import { successResponse, errorResponse, extractSessionId } from '@/lib/apiResponse';

/**
 * GET /api/quiz/results
 * 结果页鉴权查询：
 * - 未付费（非会员）：仅返回基础概要，脱敏被保护的高阶预测曲线与营养配比，附带付费引导
 * - 已付费（会员）：返回完整算法数据
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = extractSessionId(req, searchParams);

    if (!sessionId) {
      throw new AppError('MISSING_SESSION_ID', 'Session ID is required via x-session-id header or query param', 400);
    }

    const result = await getDifferentiatedQuizResult(sessionId);
    return successResponse(result, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
