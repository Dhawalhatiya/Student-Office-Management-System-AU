import { createSeedDatabase } from '../data/seed';
import type { AuditAction, AuditLog, DatabaseState, UserRole } from '../types/domain';

export const DB_STORAGE_KEY = 'avu_soms_db_v1';
export const SESSION_STORAGE_KEY = 'avu_soms_session_v1';

let memoryDb: DatabaseState | null = null;
let simulatedDelayMs = 60;

export function setSimulatedDelayMs(ms: number): void {
  simulatedDelayMs = Math.max(0, ms);
}

export async function waitDelay(): Promise<void> {
  if (simulatedDelayMs <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, simulatedDelayMs));
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access errors in non-browser contexts
  }
  return null;
}

export function loadDatabase(): DatabaseState {
  if (memoryDb) return memoryDb;

  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(DB_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DatabaseState;
        if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.userAccounts)) {
          memoryDb = parsed;
          return memoryDb;
        }
      }
    } catch {
      // Fall back to fresh seed
    }
  }

  memoryDb = createSeedDatabase();
  saveDatabase(memoryDb);
  return memoryDb;
}

export function saveDatabase(db: DatabaseState): void {
  memoryDb = db;
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Ignore quota errors
    }
  }
}

export function resetDatabaseForTests(): DatabaseState {
  memoryDb = createSeedDatabase();
  saveDatabase(memoryDb);
  return memoryDb;
}

export function appendAuditEntry(params: {
  actorAccountId?: string;
  actorEmail: string;
  actorRole?: UserRole;
  action: AuditAction;
  targetRoute?: string;
  detail: string;
}): AuditLog {
  const db = loadDatabase();
  const entry: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    actorAccountId: params.actorAccountId,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    action: params.action,
    targetRoute: params.targetRoute,
    detail: params.detail,
  };
  db.auditLogs = [entry, ...db.auditLogs].slice(0, 200);
  saveDatabase(db);
  return entry;
}
