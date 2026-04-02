/**
 * Job Persistence — saves jobs to a JSON file so they survive app restarts.
 * File is stored at <project-root>/data/jobs.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const JOBS_FILE = join(DATA_DIR, "jobs.json");

export interface PersistedJob {
  id: string;
  query: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  agent_type: string;
  agent_name: string;
  intent: string;
  sla_target_minutes: number;
  sla_deadline: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  submitted_by: string;
  result: unknown | null;
  error: string | null;
  retries: number;
  max_retries: number;
  [key: string]: unknown; // For review, comments, etc.
}

/** Load persisted jobs from disk. Returns empty array if file doesn't exist. */
export function loadJobs(): PersistedJob[] {
  try {
    if (!existsSync(JOBS_FILE)) return [];
    const raw = readFileSync(JOBS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (err) {
    console.warn("[job-persistence] Failed to load jobs:", err);
    return [];
  }
}

/** Save all jobs to disk. Call after any job mutation. */
export function saveJobs(jobs: Map<string, PersistedJob>): void {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    const arr = Array.from(jobs.values());
    writeFileSync(JOBS_FILE, JSON.stringify(arr, null, 2), "utf-8");
  } catch (err) {
    console.warn("[job-persistence] Failed to save jobs:", err);
  }
}
