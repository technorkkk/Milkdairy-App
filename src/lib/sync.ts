/**
 * Offline Sync Engine
 * 
 * Handles offline-first operations:
 * - Detects online/offline status
 * - Queues mutations when offline
 * - Replays queued mutations when connection returns
 * - Manages sync state and conflict resolution
 */

export type SyncOperation = "create" | "update" | "delete";

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  entity: string;
  entityId: string;
  payload: string; // JSON
  createdAt: string;
  attempts: number;
  lastAttempt: string | null;
  status: "pending" | "processing" | "failed" | "completed";
  error: string | null;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  errors: string[];
}

const MAX_RETRIES = 3;

/**
 * Generate a temporary ID for offline-created entities
 */
export function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if an ID is a temporary offline ID
 */
export function isOfflineId(id: string): boolean {
  return id.startsWith("offline_");
}

/**
 * Create a sync queue item
 */
export function createSyncQueueItem(
  operation: SyncOperation,
  entity: string,
  entityId: string,
  payload: Record<string, unknown>
): SyncQueueItem {
  return {
    id: generateOfflineId(),
    operation,
    entity,
    entityId,
    payload: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastAttempt: null,
    status: "pending",
    error: null,
  };
}

/**
 * Process the sync queue - sends pending items to the server
 */
export async function processSyncQueue(
  queue: SyncQueueItem[],
  apiCall: (item: SyncQueueItem) => Promise<{ success: boolean; serverId?: string; error?: string }>
): Promise<{
  updatedQueue: SyncQueueItem[];
  completedIds: string[];
  failedIds: string[];
  idMappings: Array<{ offlineId: string; serverId: string }>;
}> {
  const updatedQueue = [...queue];
  const completedIds: string[] = [];
  const failedIds: string[] = [];
  const idMappings: Array<{ offlineId: string; serverId: string }> = [];

  const pendingItems = updatedQueue.filter(
    (item) => item.status === "pending" || (item.status === "failed" && item.attempts < MAX_RETRIES)
  );

  for (const item of pendingItems) {
    const queueIndex = updatedQueue.findIndex((q) => q.id === item.id);
    if (queueIndex === -1) continue;

    updatedQueue[queueIndex] = {
      ...updatedQueue[queueIndex],
      status: "processing",
      attempts: updatedQueue[queueIndex].attempts + 1,
      lastAttempt: new Date().toISOString(),
    };

    try {
      const result = await apiCall(updatedQueue[queueIndex]);
      if (result.success) {
        updatedQueue[queueIndex] = {
          ...updatedQueue[queueIndex],
          status: "completed",
        };
        completedIds.push(item.id);
        if (result.serverId && isOfflineId(item.entityId)) {
          idMappings.push({ offlineId: item.entityId, serverId: result.serverId });
        }
      } else {
        updatedQueue[queueIndex] = {
          ...updatedQueue[queueIndex],
          status: updatedQueue[queueIndex].attempts >= MAX_RETRIES ? "failed" : "pending",
          error: result.error || "Unknown error",
        };
        if (updatedQueue[queueIndex].attempts >= MAX_RETRIES) {
          failedIds.push(item.id);
        }
      }
    } catch (error) {
      updatedQueue[queueIndex] = {
        ...updatedQueue[queueIndex],
        status: updatedQueue[queueIndex].attempts >= MAX_RETRIES ? "failed" : "pending",
        error: error instanceof Error ? error.message : "Network error",
      };
      if (updatedQueue[queueIndex].attempts >= MAX_RETRIES) {
        failedIds.push(item.id);
      }
    }
  }

  return { updatedQueue, completedIds, failedIds, idMappings };
}
