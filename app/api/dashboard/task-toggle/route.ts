import { NextRequest, NextResponse } from 'next/server';
import { toggleTask } from '@/lib/cycle-store';

export async function POST(req: NextRequest) {
  try {
    const { cycleId, taskId } = await req.json() as { cycleId: string; taskId: string };
    if (!cycleId || !taskId) return NextResponse.json({ error: 'cycleId, taskId required' }, { status: 400 });

    const result = await toggleTask(cycleId, taskId);
    if (!result) return NextResponse.json({ error: 'cycle not found' }, { status: 404 });

    const doneCount = result.tasks.filter(t => t.done).length;
    return NextResponse.json({ ok: true, tasks: result.tasks, doneCount, allDone: result.allDone });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
