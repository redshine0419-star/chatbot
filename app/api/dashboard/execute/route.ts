import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCycle, saveCycle, updateCycleIssues, type CycleIssue } from '@/lib/cycle-store';

const REPO_MAP: Record<string, string> = {
  marketerops: 'saasclaude',
  flavorsync: 'done',
  taskgrid: 'taskflow',
  askhistory: 'history',
};

const LABEL_MAP: Record<string, string> = {
  action: '🎯 핵심액션',
  plan: '📅 2주플랜',
  warning: '⚠️ 주의신호',
};

async function createIssue(repo: string, title: string, body: string, label: string): Promise<{ number: number; html_url: string } | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  const res = await fetch(`https://api.github.com/repos/redshine0419-star/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `[AI PM] ${title}`,
      body: `> 🤖 AI PM 자동 생성 이슈\n\n${body}\n\n---\n*생성일: ${new Date().toLocaleString('ko-KR')}*`,
      labels: [label],
    }),
  });

  if (!res.ok) {
    // 라벨이 없어서 실패하면 라벨 없이 재시도
    const res2 = await fetch(`https://api.github.com/repos/redshine0419-star/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `[AI PM] ${title}`,
        body: `> 🤖 AI PM 자동 생성 이슈\n\n${body}\n\n---\n*생성일: ${new Date().toLocaleString('ko-KR')}*`,
      }),
    });
    if (!res2.ok) return null;
    return res2.json();
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { cycleId, plan } = await req.json();

    const cycle = await getCurrentCycle();
    if (!cycle || cycle.id !== cycleId) {
      return NextResponse.json({ error: '사이클을 찾을 수 없습니다' }, { status: 404 });
    }

    const tasks: Array<{ service: string; title: string; body: string; category: 'action' | 'plan' | 'warning' }> = [
      ...((plan.actions ?? []).map((a: { service: string; title: string; body: string }) => ({ ...a, category: 'action' as const }))),
      ...((plan.twoWeekPlan ?? []).map((a: { service: string; title: string; body: string }) => ({ ...a, category: 'plan' as const }))),
      ...((plan.warnings ?? []).map((a: { service: string; title: string; body: string }) => ({ ...a, category: 'warning' as const }))),
    ];

    const issues: CycleIssue[] = [];
    for (const task of tasks) {
      const repo = REPO_MAP[task.service];
      if (!repo) continue;
      const label = LABEL_MAP[task.category];
      const result = await createIssue(repo, task.title, task.body, label);
      if (result) {
        issues.push({
          service: task.service,
          repo,
          issueNumber: result.number,
          title: task.title,
          category: task.category,
          url: result.html_url,
          status: 'open',
        });
      }
    }

    await updateCycleIssues(cycleId, issues);
    return NextResponse.json({ ok: true, issueCount: issues.length, issues });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
