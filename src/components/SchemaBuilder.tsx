import React, { useState, useEffect } from 'react';
import { Database, Check, Copy, Loader2, FileJson, LogIn, Settings2, Eye, Link as LinkIcon, Type, BarChart3, Info } from 'lucide-react';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';

interface SchemaBuilderProps {
  doctors: any[];
  services: any[];
  fullGraph?: any;
}

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({ doctors, services, fullGraph }) => {
  const [schemaFields, setSchemaFields] = useState<Record<string, boolean>>({});
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [dumpData, setDumpData] = useState<any>(null);
  const [generatingDump, setGeneratingDump] = useState(false);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'result'>('config');
  const [exampleCount, setExampleCount] = useState<number>(2);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch analysis data from our new endpoint
    fetch('/api/export/schema/analyze')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAnalysis(data.analysis);
        }
      })
      .catch(err => console.error("Failed to fetch analysis:", err));

    const unsubscribe = onSnapshot(collection(db, 'export_fields'), (snapshot) => {
      const fields: Record<string, boolean> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        fields[`${data.templateId}-${data.fieldName}`] = data.isExportable;
      });
      setSchemaFields(fields);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const toggleField = async (templateId: number | string, fieldName: string, currentStatus: boolean) => {
    if (!user) return;
    const docId = `${templateId}_${fieldName}`;
    setSaving(`${templateId}-${fieldName}`);
    try {
      await setDoc(doc(db, 'export_fields', docId), {
        templateId,
        fieldName,
        isExportable: !currentStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const isFieldExportable = (templateId: number | string, fieldName: string, fillRate: number) => {
    const key = `${templateId}-${fieldName}`;
    if (schemaFields[key] !== undefined) return schemaFields[key];
    // По умолчанию: экспортируем базовые поля и те, которые хоть как-то заполнены
    return fillRate > 0 || ['id', 'pagetitle', 'alias'].includes(fieldName);
  };

  const generateDump = async () => {
    setGeneratingDump(true);
    try {
      const res = await fetch('/api/export/developer-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaFields, exampleCount })
      });
      const data = await res.json();
      if (data.success) {
        setDumpData(data.dump);
        setActiveTab('result'); // Автоматически переключаем на результат
      } else {
        console.error(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingDump(false);
    }
  };

  const handleCopy = () => {
    if (dumpData) {
      navigator.clipboard.writeText(JSON.stringify(dumpData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper to combine native fields with analyzed TVs
  const getEnrichedFields = (templateIds: number[], entities: any[]) => {
    const nativeFields = [
      { name: 'id', caption: 'ID (Идентификатор)', type: 'integer', fillRate: 100 },
      { name: 'pagetitle', caption: 'Заголовок страницы', type: 'text', fillRate: 100 },
      { name: 'alias', caption: 'URL (Алиас)', type: 'text', fillRate: 100 }
    ];

    const tvs = analysis.filter(a => templateIds.includes(a.templateId));
    
    // Deduplicate by name (since services use both 6 and 32)
    const uniqueTvs = Array.from(new Map(tvs.map(item => [item.name, item])).values());

    return [...nativeFields, ...uniqueTvs].map(meta => {
      // Find sample
      let sample = "";
      for (const e of entities) {
        const val = e[meta.name] !== undefined ? e[meta.name] : (e.tvs && e.tvs[meta.name]);
        if (val !== undefined && val !== null && val !== "") {
          sample = String(val);
          break;
        }
      }

      // Determine human-readable type
      let displayType = meta.type || "Unknown";
      let isRelation = false;
      let relationTarget = "";

      if (['superboxselect', 'listbox', 'resourcelist'].includes(meta.type)) {
        displayType = "Связь (Relation)";
        isRelation = true;
        if (meta.elements?.includes('template=6')) relationTarget = "Услуги";
        else if (meta.elements?.includes('template=7')) relationTarget = "Врачи";
        else relationTarget = "Справочник / Ресурсы";
      } else if (['migx', 'migxdb'].includes(meta.type)) {
        displayType = "Массив (JSON)";
      } else if (['image', 'file'].includes(meta.type)) {
        displayType = "Медиафайл";
      } else if (meta.type === 'richtext') {
        displayType = "HTML Текст";
      } else if (meta.type === 'checkbox') {
        displayType = "Флаг (Boolean)";
      } else if (meta.type === 'textarea') {
        displayType = "Текст";
      } else if (meta.type === 'text') {
        displayType = "Строка";
      }

      // Hardcoded fallbacks based on domain knowledge
      if (meta.name === 'loc') { displayType = "Связь"; isRelation = true; relationTarget = "Локации"; }
      if (meta.name === 'specListAction') { displayType = "Связь"; isRelation = true; relationTarget = "Акции"; }
      if (meta.name === 'price_items' || meta.name.includes('price')) { displayType = "Связь"; isRelation = true; relationTarget = "Прайс-лист"; }

      return {
        field: meta.name,
        caption: meta.caption,
        description: meta.description,
        fillRate: meta.fillRate,
        sample: sample.length > 80 ? sample.substring(0, 80) + '...' : sample,
        type: displayType,
        isRelation,
        relationTarget
      };
    });
  };

  const articles = fullGraph?.entities?.articles || [];
  const news = fullGraph?.entities?.news || [];
  const promotions = fullGraph?.entities?.promotions || [];
  const blog = articles;
  const pages = fullGraph?.entities?.pages || [];
  const reviews = fullGraph?.entities?.reviews || [];
  const programs = fullGraph?.entities?.programs || [];
  const branches = fullGraph?.entities?.branches || [];
  const equipment = fullGraph?.entities?.equipment || [];
  const vacancies = fullGraph?.entities?.vacancies || [];

  const doctorFields = getEnrichedFields([7], doctors);
  const serviceFields = getEnrichedFields([6, 32], services);
  const newsFields = getEnrichedFields([4], news);
  const promoFields = getEnrichedFields([19], promotions);
  const blogFields = getEnrichedFields([25], blog);
  const pageFields = getEnrichedFields([2], pages);
  const reviewFields = getEnrichedFields([7], reviews); // Note: template 7, but we might need to differentiate in the UI
  const programFields = getEnrichedFields([12], programs);
  const branchFields = getEnrichedFields([17], branches);
  const equipmentFields = getEnrichedFields([8, 20, 29], equipment);
  const vacancyFields = getEnrichedFields([3], vacancies);

  const priceFields = [
    { field: 'id', caption: 'Внутренний ID', description: 'ID в таблице', fillRate: 100, sample: '1', type: 'Integer', isRelation: false, relationTarget: '' },
    { field: 'resource_id', caption: 'ID Услуги', description: 'Связь с услугой', fillRate: 100, sample: '123', type: 'Связь', isRelation: true, relationTarget: 'Услуги' },
    { field: 'doc_id', caption: 'Код услуги', description: 'Медицинский код', fillRate: 90, sample: 'A16.07.008', type: 'String', isRelation: false, relationTarget: '' },
    { field: 'name', caption: 'Название', description: 'Название услуги', fillRate: 100, sample: 'Консультация врача', type: 'String', isRelation: false, relationTarget: '' },
    { field: 'price', caption: 'Цена', description: 'Стоимость в рублях', fillRate: 100, sample: '1500', type: 'String', isRelation: false, relationTarget: '' },
    { field: 'tab', caption: 'Вкладка', description: 'Группировка (вкладка)', fillRate: 100, sample: 'Терапия', type: 'String', isRelation: false, relationTarget: '' },
    { field: 'category', caption: 'Категория', description: 'Подгруппа', fillRate: 100, sample: 'Первичный прием', type: 'String', isRelation: false, relationTarget: '' },
  ];

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" /></div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
        <Database className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Требуется авторизация</h2>
        <p className="text-slate-600 mb-6">
          Для сохранения настроек схемы в облачной базе данных Firebase необходимо войти в систему.
        </p>
        <button
          onClick={handleLogin}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 w-full"
        >
          <LogIn size={18} />
          Войти через Google
        </button>
      </div>
    );
  }

  const renderFieldTable = (fields: any[], templateId: number | string) => {
    const activeFields = fields.filter(f => f.fillRate > 0);
    const emptyFields = fields.filter(f => f.fillRate === 0);

    const TableSection = ({ data, title, isDimmed }: { data: any[], title: string, isDimmed?: boolean }) => (
      <div className="mb-0">
        <div className={`px-5 py-3 border-y border-slate-200 flex items-center justify-between ${isDimmed ? 'bg-slate-50' : 'bg-indigo-50/50'}`}>
          <h4 className={`font-semibold text-sm flex items-center gap-2 ${isDimmed ? 'text-slate-500' : 'text-indigo-900'}`}>
            {title} 
            <span className={`px-2 py-0.5 rounded-full text-xs ${isDimmed ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-700'}`}>
              {data.length}
            </span>
          </h4>
          {isDimmed && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Info size={14} /> По умолчанию отключены
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-3 font-medium w-12 text-center">Экспорт</th>
                <th className="p-3 font-medium w-64">Поле (Название и Ключ)</th>
                <th className="p-3 font-medium w-48">Тип данных</th>
                <th className="p-3 font-medium w-32">Заполненность</th>
                <th className="p-3 font-medium">Пример из базы</th>
              </tr>
            </thead>
            <tbody>
              {data.map(({ field, caption, fillRate, sample, type, isRelation, relationTarget }) => {
                const isExportable = isFieldExportable(templateId, field, fillRate);
                const isSaving = saving === `${templateId}-${field}`;
                
                return (
                  <tr 
                    key={field} 
                    className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${!isExportable ? 'opacity-60 bg-slate-50/50' : 'bg-white'}`}
                  >
                    <td className="p-3 text-center align-top pt-4">
                      {isSaving ? (
                        <Loader2 size={16} className="animate-spin mx-auto text-indigo-600" />
                      ) : (
                        <input 
                          type="checkbox" 
                          checked={isExportable}
                          onChange={() => toggleField(templateId, field, isExportable)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      )}
                    </td>
                    <td className="p-3 align-top">
                      <div className="font-medium text-slate-800 text-sm mb-1">{caption || field}</div>
                      <div className="font-mono text-xs text-slate-500 bg-slate-100 inline-block px-1.5 py-0.5 rounded">{field}</div>
                    </td>
                    <td className="p-3 align-top pt-4">
                      {isRelation ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                          <LinkIcon size={12} /> {relationTarget}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                          <Type size={12} /> {type}
                        </span>
                      )}
                    </td>
                    <td className="p-3 align-top pt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${fillRate > 50 ? 'bg-emerald-500' : fillRate > 0 ? 'bg-amber-400' : 'bg-slate-300'}`}
                            style={{ width: `${fillRate}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${fillRate === 0 ? 'text-slate-400' : 'text-slate-600'}`}>
                          {fillRate}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="text-sm text-slate-600 truncate max-w-md bg-slate-50 border border-slate-100 p-2 rounded" title={sample}>
                        {sample || <span className="text-slate-400 italic">Нет данных</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );

    return (
      <div className="flex flex-col">
        {activeFields.length > 0 && <TableSection data={activeFields} title="Активные поля (используются на сайте)" />}
        {emptyFields.length > 0 && <TableSection data={emptyFields} title="Пустые поля (кандидаты на удаление)" isDimmed={true} />}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 flex justify-between items-center sticky top-4 z-10">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-6 py-3 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
              activeTab === 'config' 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Settings2 size={18} />
            Анализ и Настройка
          </button>
          <button
            onClick={() => setActiveTab('result')}
            className={`px-6 py-3 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
              activeTab === 'result' 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Eye size={18} />
            Готовый результат
          </button>
        </div>
        <div className="flex items-center gap-4 px-4">
          <button
            onClick={generateDump}
            disabled={generatingDump}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            {generatingDump ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
            Сгенерировать дамп
          </button>
          <div className="w-px h-6 bg-slate-200"></div>
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {user.email}
          </div>
        </div>
      </div>

      {/* Config Tab */}
      {activeTab === 'config' && (
        <div className="space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                  Схема: Врачи
                  <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-500">Шаблон 7</span>
                </h3>
                <p className="text-sm text-slate-500">Система проанализировала базу и сгруппировала поля по частоте использования.</p>
              </div>
            </div>
            {renderFieldTable(doctorFields, 7)}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                  Схема: Услуги
                  <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-500">Шаблоны 6, 32</span>
                </h3>
                <p className="text-sm text-slate-500">Система проанализировала базу и сгруппировала поля по частоте использования.</p>
              </div>
            </div>
            {renderFieldTable(serviceFields, 6)}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                  Схема: Новости
                  <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-500">Шаблон 4</span>
                </h3>
                <p className="text-sm text-slate-500">Настройки полей для новостей клиники.</p>
              </div>
            </div>
            {renderFieldTable(newsFields, 4)}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                  Схема: Акции
                  <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-500">Шаблон 19</span>
                </h3>
                <p className="text-sm text-slate-500">Настройки полей для акционных предложений.</p>
              </div>
            </div>
            {renderFieldTable(promoFields, 19)}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                  Схема: Отзывы
                  <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-500">Шаблон 7 (Папка 209)</span>
                </h3>
                <p className="text-sm text-slate-500">Настройки полей для отзывов пациентов.</p>
              </div>
            </div>
            {renderFieldTable(reviewFields, 7)}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                  Схема: Программы
                  <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-500">Шаблон 12</span>
                </h3>
                <p className="text-sm text-slate-500">Настройки полей для комплексных программ.</p>
              </div>
            </div>
            {renderFieldTable(programFields, 12)}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                  Схема: Филиалы
                  <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-500">Шаблон 17</span>
                </h3>
                <p className="text-sm text-slate-500">Настройки полей для филиалов и клиник.</p>
              </div>
            </div>
            {renderFieldTable(branchFields, 17)}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                  Схема: Оборудование
                  <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-500">Шаблоны 8, 20, 29</span>
                </h3>
                <p className="text-sm text-slate-500">Настройки полей для оборудования и диагностики.</p>
              </div>
            </div>
            {renderFieldTable(equipmentFields, 8)}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                  Схема: Вакансии
                  <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-500">Шаблон 3</span>
                </h3>
                <p className="text-sm text-slate-500">Настройки полей для вакансий.</p>
              </div>
            </div>
            {renderFieldTable(vacancyFields, 3)}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                  Схема: Статьи (Блог)
                  <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-500">Шаблон 25</span>
                </h3>
                <p className="text-sm text-slate-500">Настройки полей для статей в блоге.</p>
              </div>
            </div>
            {renderFieldTable(blogFields, 25)}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                  Схема: Статические страницы
                  <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-500">Шаблон 2</span>
                </h3>
                <p className="text-sm text-slate-500">Настройки полей для обычных текстовых страниц.</p>
              </div>
            </div>
            {renderFieldTable(pageFields, 2)}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                  Схема: Прайс-лист
                  <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-500">Таблица pricelist_items2</span>
                </h3>
                <p className="text-sm text-slate-500">Настройки полей для элементов прайс-листа.</p>
              </div>
            </div>
            {renderFieldTable(priceFields, 'price')}
          </div>
        </div>
      )}

      {/* Result Tab */}
      {activeTab === 'result' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Generator Settings */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileJson className="text-indigo-600" />
                Генерация JSON
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                Система соберет JSON-файл, который содержит описание схемы (типы полей, связи) и реальные примеры данных для импорта в Strapi.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Количество примеров (строк)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="50"
                    value={exampleCount}
                    onChange={(e) => setExampleCount(parseInt(e.target.value) || 2)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Сколько врачей и услуг добавить в дамп для примера.</p>
                </div>

                <button
                  onClick={generateDump}
                  disabled={generatingDump}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {generatingDump ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
                  Сгенерировать дамп
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: JSON Output */}
          <div className="lg:col-span-2">
            {dumpData ? (
              <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden h-full flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Check className="text-emerald-400" size={18} />
                    Готовый JSON
                  </h3>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copied 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Скопировано!' : 'Скопировать JSON'}
                  </button>
                </div>
                <div className="p-6 overflow-auto flex-1 max-h-[800px] custom-scrollbar">
                  <pre className="text-emerald-400 text-xs font-mono leading-relaxed">
                    {JSON.stringify(dumpData, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl border border-slate-200 border-dashed h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <FileJson size={48} className="mb-4 opacity-50" />
                <p className="font-medium text-slate-600 mb-1">JSON еще не сгенерирован</p>
                <p className="text-sm">Нажмите кнопку "Сгенерировать дамп" слева, чтобы получить результат.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
