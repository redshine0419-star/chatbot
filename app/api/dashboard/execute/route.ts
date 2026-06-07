import { NextRequest, NextResponse } from 'next/server';
import { saveCycle, updateCycleIssues, type CycleIssue } from '@/lib/cycle-store';

const REPO_MAP: Record<string, string> = {
  marketerops: 'saasclaude',
  flavorsync: 'done',
  taskgrid: 'taskflow',
  askhistory: 'history',
};

async function createIssue(repo: string, title: string, body: string): Promise<{ number: number; html_url: string } | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN not set');
    return null;
  }
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
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to create issue in ${repo}:`, res.status, err);
    return null;
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { cycleId, plan } = await req.json();
    if (!cycleId || !plan) {
      return NextResponse.json({ error: 'cycleId와 plan이 필요합니다' }, { status: 400 });
    }

    const tasks: Array<{ service: string; title: string; body: string; category: 'action' | 'plan' | 'warning' }> = [
      ...((plan.actions ?? []).map((a: { service: string; title: string; body: string }) => ({ ...a, category: 'action' as const }))),
      ...((plan.twoWeekPlan ?? []).map((a: { service: string; title: string; body: string }) => ({ ...a, category: 'plan' as const }))),
      ...((plan.warnings ?? []).map((a: { service: string; title: string; body: string }) => ({ ...a, category: 'warning' as const }))),
    ];

    console.log(`Creating ${tasks.length} issues for cycle ${cycleId}`);

    const issues: CycleIssue[] = [];
    const errors: string[] = [];

    for (const task of tasks) {
      const repo = REPO_MAP[task.service];
      if (!repo) {
        errors.push(`Unknown service: ${task.service}`);
        continue;
      }
      const result = await createIssue(repo, task.title, task.body);
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
        console.log(`Created issue #${result.number} in ${repo}: ${task.title}`);
      } else {
        errors.push(`Failed: ${task.service} - ${task.title}`);
      }
    }

    // DB에 저장
    await saveCycle({
      id: cycleId,
      planText: JSON.stringify(plan),
      issues,
      createdAt: new Date().toISOString(),
    });
    if (issues.length > 0) {
      await updateCycleIssues(cycleId, issues);
    }

    console.log(`Cycle ${cycleId}: ${issues.length} issues created, ${errors.length} errors`);

    // cycle 객체를 클라이언트에 바로 반환 (DB 재조회 불필요)
    const cycleForClient = {
      id: cycleId,
      issues,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      ok: true,
      issueCount: issues.length,
      issues,
      errors,
      cycle: cycleForClient,
    });
  } catch (e) {
    console.error('Execute error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
