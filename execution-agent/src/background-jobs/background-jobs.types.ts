export const MIGRATION_QUEUE = 'migration-queue';

export interface MigrationFieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
  transformation?: string;
  required?: boolean;
  type?: string;
}

export interface MigrationItem {
  id: string;
  name: string;
  description?: string | null;
  source_type: string;
  source_schema?: string;
  source_database?: string | null;
  source_table?: string | null;
  source_file_path?: string | null;
  target_type: string;
  target_schema?: string;
  target_database?: string;
  target_table?: string;
  mappings?: MigrationFieldMapping[];
  status?: string;
  projectId: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  project?: {
    id: string;
    name: string;
    organizationId: string;
  };
  [key: string]: any;
}

export interface MigrationJobData {
  agentId: string;
  organizationId: string;
  projectId: string;
  migration: MigrationItem;
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
