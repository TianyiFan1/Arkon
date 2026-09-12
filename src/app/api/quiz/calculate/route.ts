import { expectedVersionSchema } from '@/lib/validations/quiz';
import { NextRequest } from 'next/server';
import { calculateAndSaveAssessment, AppError } from '@/lib/services/quizService';
import { successResponse, errorResponse, extractSessionId } from '@/lib/apiResponse';

/**
 * POST /api/quiz/calculate
 * 提交整套测评数据，触发服务端健康评估算法，将结果持久化入库
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let sessionId = extractSessionId(req, searchParams);

    let body;
    try { body = await req.json(); }
    catch { throw new AppError('INVALID_JSON', 'Request body must be valid JSON', 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError('INVALID_BODY', 'Request body must be a JSON object', 400);
    if (!sessionId && typeof body.sessionId === 'string') sessionId = body.sessionId;
    const version = expectedVersionSchema.safeParse(body.expectedVersion);
    if (!version.success) throw new AppError('VALIDATION_ERROR', 'expectedVersion must be a non-negative integer', 400);

    if (!sessionId) {
      throw new AppError('MISSING_SESSION_ID', 'Session ID is required via x-session-id header or body', 400);
    }

    const savedAssessment = await calculateAndSaveAssessment(sessionId, version.data);

    return successResponse(
      {
        sessionId,
        assessmentId: savedAssessment.id,
        bmi: savedAssessment.bmi,
        bmiCategory: savedAssessment.bmiCategory,
        bmr: savedAssessment.bmr,
        tdee: savedAssessment.tdee,
        recommendedDailyCalories: savedAssessment.recommendedDailyCalories,
        projectedDays: savedAssessment.projectedDays,
        projectedTargetDate: savedAssessment.projectedTargetDate,
        calculatedAt: savedAssessment.calculatedAt,
      },
      200,
      'Assessment calculated and saved successfully'
    );
  } catch (error) {
    return errorResponse(error);
  }
}
