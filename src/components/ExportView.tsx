import React, { useState } from 'react';
import { Download, Loader2, FileJson, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export const ExportView: React.FC<{ handleTabChange: (tab: string) => void }> = ({ handleTabChange }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; files?: string[]; message?: string; error?: string; output?: string } | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/export/run', { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => handleTabChange("overview")}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <Download className="text-indigo-600" />
            Экспорт данных (JSON Dump)
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <p className="text-slate-600 mb-6">
          Этот инструмент генерирует полные JSON-дампы всех сущностей сайта, а также строит графы связей, дерево сайта и манифест ассетов. Данные извлекаются из базы данных MODX, 
          включая сложные поля MIGX (FAQ, галереи, блоки статей), прайс-листы из кастомных таблиц и медиафайлы.
          Эти файлы предназначены для передачи AI-агенту для проектирования новой платформы и настройки синхронизации.
        </p>

        <div className="mb-8">
          <button
            onClick={handleExport}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            {loading ? 'Генерация файлов...' : 'Сгенерировать JSON файлы'}
          </button>
        </div>

        {result && result.success && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100 flex items-start gap-3">
              <CheckCircle2 className="shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold">Экспорт успешно завершен</h4>
                <p className="text-sm mt-1">{result.message}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-800">Сгенерированные файлы:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {result.files?.map((file, idx) => (
                  <a 
                    key={idx} 
                    href={file} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`flex items-center gap-3 p-4 border rounded-lg transition-colors group ${
                      file.endsWith('.md') 
                        ? 'border-amber-200 bg-amber-50 hover:border-amber-300 hover:bg-amber-100' 
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <FileJson className={file.endsWith('.md') ? 'text-amber-500' : 'text-indigo-500 group-hover:text-indigo-600'} size={24} />
                    <span className={`font-medium truncate ${file.endsWith('.md') ? 'text-amber-800' : 'text-slate-700 group-hover:text-indigo-700'}`}>
                      {file.split('/').pop()}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {result.output && (
              <div className="mt-8">
                <h4 className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wider">Лог выполнения</h4>
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                  {result.output}
                </pre>
              </div>
            )}
          </div>
        )}

        {result && !result.success && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold">Ошибка экспорта</h4>
              <p className="text-sm mt-1">{result.error}</p>
              {result.output && (
                <pre className="mt-4 bg-red-900/10 p-3 rounded text-xs font-mono overflow-x-auto">
                  {result.output}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
