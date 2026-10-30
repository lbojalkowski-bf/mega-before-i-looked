// The digest's contract. Every part of plan § 2 builds against this file only.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One job's night, folded from all its lines in runs/<night>.jsonl.
export type DigestRow = {
  job: string;
  owner: string | null; // null in the log; views show it as `—`
  runs: number; // lines for this job
  retries: number; // lines with status `retry`
  lastStatus: RunStatus;
  lastError: string | null; // the newest `error` seen for this job, if any
  firstAt: string; // `at` as written in the log, offset kept
  lastAt: string;
};

export type DigestNight = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that didn't parse; counted, never thrown
};

// Returns null when the night has no file (or isn't a YYYY-MM-DD name).
export type ReadNight = (runsDir: string, night: string) => DigestNight | null;
