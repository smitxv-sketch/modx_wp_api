export type ReportStatus = 'success' | 'warning' | 'error' | 'neutral';

export interface ReportMetric {
  label: string;
  value: string | number;
  status?: ReportStatus;
}

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportTable {
  columns: ReportColumn[];
  rows: Record<string, any>[];
}

export interface ReportSection {
  id: string;
  title: string;
  description?: string;
  metrics?: ReportMetric[];
  table?: ReportTable;
}

export interface SeoReportData {
  title: string;
  date: string;
  summary: {
    title: string;
    metrics: ReportMetric[];
  };
  sections: ReportSection[];
}
