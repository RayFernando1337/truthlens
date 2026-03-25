const FULL_PASS_SCHEDULE_MS = [
  45_000,
  3 * 60_000,
  5 * 60_000,
  10 * 60_000,
];

const FULL_PASS_REPEAT_MS = 5 * 60_000;

export function getSlidingWindowSize(segmentCount: number): number {
  if (segmentCount <= 6) return segmentCount;
  if (segmentCount <= 20) return 8;
  if (segmentCount <= 60) return 10;
  return 12;
}

export function getAnalysisIntervalMs(segmentCount: number): number {
  if (segmentCount < 6) return 16_000;
  if (segmentCount < 20) return 30_000;
  if (segmentCount < 60) return 60_000;
  return 2 * 60_000;
}

export function shouldRunRollingAnalysis(
  segmentCount: number,
  lastRunAtMs: number | null,
  nowMs: number
): boolean {
  if (segmentCount === 0) return false;
  if (lastRunAtMs === null) return true;
  return nowMs - lastRunAtMs >= getAnalysisIntervalMs(segmentCount);
}

function getNextScheduledFullPassMs(elapsedMs: number): number {
  for (const scheduledAt of FULL_PASS_SCHEDULE_MS) {
    if (elapsedMs < scheduledAt) return scheduledAt;
  }

  const lastMilestone = FULL_PASS_SCHEDULE_MS[FULL_PASS_SCHEDULE_MS.length - 1];
  const extraWindows = Math.floor((elapsedMs - lastMilestone) / FULL_PASS_REPEAT_MS) + 1;
  return lastMilestone + extraWindows * FULL_PASS_REPEAT_MS;
}

export function shouldRunFullPass(
  elapsedMs: number,
  lastFullPassAtMs: number | null
): boolean {
  const checkpoint = getNextScheduledFullPassMs(lastFullPassAtMs ?? 0);
  return elapsedMs >= checkpoint;
}

export function getFullPassSchedule(): number[] {
  return [...FULL_PASS_SCHEDULE_MS];
}
