import { NextResponse } from 'next/server';
import { getCurrentCycle } from '@/lib/cycle-store';

export async function GET() {
  try {
    const cycle = await getCurrentCycle();
    if (!cycle) return NextResponse.json({ hasCycle: false });

    const doneCount  = cycle.tasks.filter(t => t.done).length;
    const totalCount = cycle.tasks.length;
    const allDone    = totalCount > 0 && doneCount === totalCount;

    return NextResponse.json({ hasCycle: true, cycle, allDone, doneCount, totalCount });
  } catch (e) {
    console.error('cycle-status error:', e);
    return NextResponse.json({ error: (e as Error).message, hasCycle: false }, { status: 500 });
  }
}
