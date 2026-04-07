import React, { useState } from 'react';
import { Database, Copy, Check, AlertCircle, Download, Loader2 } from 'lucide-react';

export const DbDumper: React.FC = () => {
  const [limit, setLimit] = useState(2);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDump = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/chel/dump?limit=${limit}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Неизвестная ошибка при создании дампа');
      }
      setData(json.dump);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (data) {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          <Database className="text-indigo-600" />
          Дамп базы данных (Челябинск)
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <p className="text-slate-600 mb-6">
          Этот инструмент позволяет выгрузить первые несколько строк из <strong>каждой таблицы</strong> базы данных WordPress. 
          Это поможет нам понять реальную структуру таблиц и полей, если стандартные запросы не работают.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-8">
          <div className="w-full sm:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Количество строк на таблицу
            </label>
            <select 
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value={1}>1 строка</option>
              <option value={2}>2 строки</option>
              <option value={3}>3 строки</option>
              <option value={5}>5 строк</option>
              <option value={10}>10 строк</option>
            </select>
          </div>

          <button
            onClick={handleDump}
            disabled={loading}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Сгенерировать дамп
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="font-semibold text-sm">Ошибка подключения к БД</h4>
              <p className="text-sm mt-1 break-all font-mono text-xs">{error}</p>
              <p className="text-sm mt-2">
                Скорее всего, хостинг Beget блокирует внешние подключения к MySQL. 
                Убедитесь, что в панели управления Beget разрешен внешний доступ к базе данных, или скопируйте эту ошибку разработчику.
              </p>
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">
                Результат (найдено таблиц: {Object.keys(data).length})
              </h3>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  copied 
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Скопировано!' : 'Скопировать JSON'}
              </button>
            </div>
            
            <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-emerald-400 text-xs font-mono leading-relaxed">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
