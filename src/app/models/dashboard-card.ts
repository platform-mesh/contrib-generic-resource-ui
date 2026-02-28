import { Resource } from './resource';

// Card types matching DashboardCardSpec.Type enum from extension-manager-operator
export type DashboardCardType =
  | 'status-table'
  | 'count-card'
  | 'status-summary'
  | 'list'
  | 'bar-chart';

// Mirrors ResourceDefinition from dashboardcard_types.go
export interface CardResourceDefinition {
  group: string;
  version: string;
  kind: string;
  plural: string;
  scope: 'Cluster' | 'Namespaced';
}

// Mirrors DashboardCardSpec from dashboardcard_types.go
export interface DashboardCardSpec {
  type: DashboardCardType;
  title: string;
  description?: string;
  priority?: number;
  category?: string;
  resource?: CardResourceDefinition;
  dataQuery?: string;
  subscriptionQuery?: string;
  config?: StatusTableConfig | CountCardConfig | StatusSummaryConfig | ListCardConfig | BarChartConfig;
}

// Per-type config interfaces

export interface StatusTableConfig {
  columns?: StatusTableColumn[];
  pageSize?: number;
}

export interface StatusTableColumn {
  key: string;
  label: string;
  path: string;
  type?: 'text' | 'date' | 'status' | 'number' | 'boolean';
}

export interface CountCardConfig {
  showStatusBreakdown?: boolean;
  icon?: string;
}

export interface StatusSummaryConfig {
  showPercentages?: boolean;
}

export interface ListCardConfig {
  maxItems?: number;
  nameField?: string;
}

export interface BarChartConfig {
  groupBy?: string;
}

// Runtime state for card data
export interface CardData {
  resources: Resource[];
  loading: boolean;
  error: string | null;
  lastUpdated?: Date;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  percentage: number;
  color: string;
}
