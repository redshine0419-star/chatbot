import { NextRequest, NextResponse } from 'next/server'
import { toggleTask } from '@/lib/cycle-store'

export async function POST(req: NextRequest) {
  try {
    const { cycleId, taskId } = await req.json() as { cycleId: string | number; taskId: string }
    if (!cycleId || !taskId) return NextResponse.json({ error: 'cycleId, taskId required' }, { status: 400 })

    const tasks = await toggleTask(Number(cycleId), taskId)
    const doneCount = tasks.filter(t => t.done).length
    const allDone = tasks.length > 0 && tasks.every(t => t.done)
    return NextResponse.json({ ok: true, tasks, doneCount, allDone })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
