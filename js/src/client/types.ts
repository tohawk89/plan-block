/**
 * The JSON contract shared with the Laravel package. Keep in sync with
 * PlanTree::serialize() and contract/plan-response.json.
 */

export type BlockId = string;

export interface Progress {
  state: 'none' | 'some' | 'all';
  done: number;
  total: number;
}

export interface BlockData {
  id: BlockId;
  type: string;
  parent: BlockId | null;
  order: number;
  source: BlockId | null;
  attachable: { type: string; id: string } | null;
  payload: Record<string, unknown>;
  checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
  excluded: boolean;
  done: boolean;
  progress: Progress | null;
  day: { number: number; date: string | null } | null;
}

export interface PlanData {
  id: string;
  title: string;
  start_date: string | null;
  version: number;
}

export interface PlanResponse {
  plan: PlanData;
  blocks: BlockData[];
}

export interface FieldManifest {
  name: string;
  type: 'text' | 'textarea' | 'url' | 'number' | 'date' | 'time' | 'select' | 'toggle';
  label: string;
  required: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  options?: Array<{ value: string | number; label: string }>;
}

export type GroupRule = 'all' | 'any' | 'count' | 'none';

export interface TypeManifest {
  key: string;
  label: string;
  icon: string | null;
  structural: boolean;
  root: boolean;
  checkable: boolean;
  countable: boolean;
  rule: GroupRule;
  fields: FieldManifest[];
  parents: string[] | null;
  children: { allow: string[]; any_content: boolean; max: Record<string, number> };
  renderers: Record<string, string>;
}

export interface Manifest {
  version: number;
  types: Record<string, TypeManifest>;
}

export type CommandType =
  | 'create'
  | 'update'
  | 'move'
  | 'check'
  | 'uncheck'
  | 'check_all'
  | 'uncheck_all'
  | 'exclude'
  | 'include'
  | 'link'
  | 'delete'
  | 'restore';

export interface Command {
  id: string;
  type: CommandType;
  block: BlockId;
  args?: Record<string, unknown>;
}

export interface CommandSuccess {
  ok: true;
  version: number;
  full: boolean;
  blocks: BlockData[];
  deleted: BlockId[];
}

export interface CommandError {
  command?: string;
  reason: string;
  message: string;
  errors?: Record<string, string[]>;
}

export interface DeleteImpact {
  block: BlockId;
  descendants: number;
  links: Array<{
    id: BlockId;
    source: BlockId | null;
    parent: BlockId | null;
    parent_type: string | null;
    day: { number: number; date: string | null } | null;
  }>;
}
