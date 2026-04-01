import React, { forwardRef } from 'react';
import { SeoReportData, ReportStatus } from '../../types/seo-report';

interface SeoReportTemplateProps {
  data: SeoReportData;
}

const getStatusColor = (status?: ReportStatus) => {
  switch (status) {
    case 'success': return 'text-green-600 bg-green-50 border-green-200';
    case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'error': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-700 bg-gray-50 border-gray-200';
  }
};

export const SeoReportTemplate = forwardRef<HTMLDivElement, SeoReportTemplateProps>(({ data }, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-gray-900 font-sans max-w-5xl mx-auto print:p-0">
      {/* Header */}
      <div className="mb-8 border-b pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.title}</h1>
        <p className="text-gray-500">Дата формирования: {data.date}</p>
      </div>

      {/* Summary Dashboard */}
      <div className="mb-12 page-break-inside-avoid">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">{data.summary.title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.summary.metrics.map((metric, idx) => (
            <div key={idx} className={`p-4 rounded-lg border ${getStatusColor(metric.status)}`}>
              <div className="text-sm font-medium opacity-80 mb-1">{metric.label}</div>
              <div className="text-2xl font-bold">{metric.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Sections */}
      {data.sections.map((section, idx) => (
        <div key={section.id} className="mb-12" style={{ pageBreakInside: 'auto' }}>
          <div className="page-break-inside-avoid">
            <h2 className="text-xl font-semibold text-gray-800 mb-2 border-b pb-2">{section.title}</h2>
            {section.description && (
              <p className="text-gray-600 mb-4 text-sm">{section.description}</p>
            )}

            {/* Section Metrics */}
            {section.metrics && section.metrics.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-6">
                {section.metrics.map((metric, mIdx) => (
                  <div key={mIdx} className={`px-4 py-2 rounded-md border ${getStatusColor(metric.status)}`}>
                    <span className="text-sm font-medium mr-2">{metric.label}:</span>
                    <span className="text-lg font-bold">{metric.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section Table */}
          {section.table && section.table.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-200">
                    {section.table.columns.map((col) => (
                      <th key={col.key} className="p-3 font-semibold text-gray-700">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-gray-100 hover:bg-gray-50" style={{ pageBreakInside: 'avoid' }}>
                      {section.table.columns.map((col) => (
                        <td key={col.key} className="p-3 text-gray-800 align-top break-words max-w-xs">
                          {row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {section.table && section.table.rows.length === 0 && (
            <p className="text-gray-500 italic text-sm">Нет данных для отображения</p>
          )}
        </div>
      ))}
    </div>
  );
});

SeoReportTemplate.displayName = 'SeoReportTemplate';
