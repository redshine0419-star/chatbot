import { NextResponse } from 'next/server';
import { getCurrentCycle, updateCycleIssues, markCycleComplete, type CycleIssue } from '@/lib/cycle-store';

async function getIssueStatus(repo: string, issueNumber: number): Promise<'open' | 'closed'> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/redshine0419-star/${repo}/issues/${issueNumber}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
        cache: 'no-store',
      },
    );
    if (!res.ok) return 'open';
    const data = await res.json();
    return data.state === 'closed' ? 'closed' : 'open';
  } catch {
    return 'open';
  }
}

export async function GET() {
  try {
    const cycle = await getCurrentCycle();
    if (!cycle) return NextResponse.json({ hasCycle: false });

    if (cycle.issues.length === 0) {
      return NextResponse.json({ hasCycle: true, cycle, allDone: false });
    }

    // GitHub에서 최신 이슈 상태 조회
    const updatedIssues: CycleIssue[] = await Promise.all(
      cycle.issues.map(async (issue) => ({
        ...issue,
        status: await getIssueStatus(issue.repo, issue.issueNumber),
      })),
    );

    await updateCycleIssues(cycle.id, updatedIssues);

    const allDone = updatedIssues.length > 0 && updatedIssues.every((i) => i.status === 'closed');
    if (allDone && !cycle.completedAt) {
      await markCycleComplete(cycle.id);
    }

    return NextResponse.json({
      hasCycle: true,
      cycle: { ...cycle, issues: updatedIssues },
      allDone,
      openCount: updatedIssues.filter((i) => i.status === 'open').length,
      closedCount: updatedIssues.filter((i) => i.status === 'closed').length,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
