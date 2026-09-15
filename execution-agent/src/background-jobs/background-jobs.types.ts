export const MIGRATION_QUEUE = 'migration-queue';

export interface MigrationJobData {
  migrationId?: string;
  agentId?: string;
  organizationId?: string;
  projectId?: string;
  count?: number;
  migrations?: any[];
  limit?: number;
  batchSize?: number;
  ecoMode?: boolean;
  gzip?: boolean;
  metadata?: Record<string, any>;
}

export interface MigrationJobResult {
  success: boolean;
  migrationId?: string;
  rowsInserted: number;
  totalInserted: number;
  elapsedSeconds?: string;
  message?: string;
  error?: string;
}

export interface MigrationJobProgress {
  percentage: number;
  rowsProcessed: number;
  totalRows?: number;
  stage: string;
  message?: string;
}
