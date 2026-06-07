import { NextResponse } from 'next/server';

// 이 라우트는 더 이상 사용되지 않습니다.
// GitHub Issues 방식에서 대시보드 체크리스트 방식으로 변경되었습니다.
// 플랜 생성은 /api/dashboard/plan 에서 직접 처리됩니다.
export async function POST() {
  return NextResponse.json({ deprecated: true, message: 'Use /api/dashboard/plan instead' }, { status: 410 });
}
