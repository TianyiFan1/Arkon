import { expectedVersionSchema } from '@/lib/validations/quiz';
import { NextRequest } from 'next/server';
import {
  getOrCreateSession,
  getSessionProgress,
  updateSessionStep,
  AppError,
} from '@/lib/services/quizService';
import { successResponse, errorResponse, extractSessionId } from '@/lib/apiResponse';

/**
 * POST /api/quiz/session
 * 创建新会话或根据传入的 sessionId 获取会话
 */
export async function POST(req: NextRequest) {
  try {
    let requestedSessionId: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.sessionId === 'string') {
        requestedSessionId = body.sessionId;
      }
    } catch {
      // 请求体为空或非 JSON 时忽略，直接创建全新会话
    }

    const { session, isNew } = await getOrCreateSession(requestedSessionId);

    return successResponse(
      {
        sessionId: session.id,
        version: session.version,
        currentStep: session.currentStep,
        isCompleted: session.isCompleted,
        isNew,
        subscriptionStatus: session.subscription?.status || 'INACTIVE',
      },
      isNew ? 201 : 200,
      isNew ? 'Session created successfully' : 'Session retrieved successfully'
    );
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * GET /api/quiz/session
 * 进度恢复：查询当前 Session 的填写进度与已持久化数据
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = extractSessionId(req, searchParams);

    if (!sessionId) {
      throw new AppError('MISSING_SESSION_ID', 'Session ID is required via x-session-id header or query param', 400);
    }

    const progress = await getSessionProgress(sessionId);
    return successResponse(progress, 200);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * PATCH /api/quiz/session
 * 分步增量保存：支持单步、多步、乱序保存与状态合并
 */
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let sessionId = extractSessionId(req, searchParams);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      throw new AppError('INVALID_JSON', 'Request body must be valid JSON', 400);
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new AppError('INVALID_BODY', 'Request body must be a JSON object', 400);
    }

    if (!sessionId && typeof body.sessionId === 'string') {
      sessionId = body.sessionId;
    }

    if (!sessionId) {
      throw new AppError('MISSING_SESSION_ID', 'Session ID is required via x-session-id header or body', 400);
    }

    // 从 body 中剥离 sessionId 后传入服务层校验与持久化
    const version = expectedVersionSchema.safeParse(body.expectedVersion);
    if (!version.success) throw new AppError('VALIDATION_ERROR', 'expectedVersion must be a non-negative integer', 400);
    const stepData = { ...body };
    delete stepData.sessionId;
    delete stepData.expectedVersion;

    const result = await updateSessionStep(sessionId, stepData, version.data);
    return successResponse(result, 200, 'Step data saved successfully');
  } catch (error) {
    return errorResponse(error);
  }
}
