import { NextResponse } from 'next/server';
import { AppError } from './errors';

export function successResponse<T>(data: T, status: number = 200, message?: string) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message ? { message } : {}),
    },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

export function errorResponse(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.statusCode }
    );
  }

  const message = 'Internal Server Error';
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message,
      },
    },
    { status: 500 }
  );
}

/**
 * 辅助函数：从 Request 中安全提取 sessionId
 * 支持 Header `x-session-id`、Query Param `sessionId`，以及可选的 Body
 */
export function extractSessionId(req: Request, searchParams?: URLSearchParams): string | null {
  const headerId = req.headers.get('x-session-id');
  if (headerId && headerId.trim()) return headerId.trim();

  if (searchParams) {
    const queryId = searchParams.get('sessionId');
    if (queryId && queryId.trim()) return queryId.trim();
  }

  return null;
}
