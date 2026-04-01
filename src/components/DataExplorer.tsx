import React, { useState, useMemo } from 'react';
import { Database, Search, LayoutTemplate, FileJson, AlertTriangle, ArrowRightLeft, CheckCircle2, XCircle, HelpCircle, Lightbulb, Image as ImageIcon, FileText, Hash, Eye, X, ExternalLink, Code } from 'lucide-react';

interface DataExplorerProps {
  fullGraph: any;
  doctors: any[];
  services: any[];
  handleTabChange: (tab: string) => void;
}

// Helper to guess content type
const guessType = (val: any): { type: string, icon: React.ReactNode } => {
  if (val === null || val === undefined || val === '') return { type: 'Empty', icon: <XCircle size={14} /> };
  if (typeof val === 'number') return { type: 'Number', icon: <Hash size={14} /> };
  if (typeof val !== 'string') return { type: 'Unknown', icon: <HelpCircle size={14} /> };
  
  const t = val.trim();
  if (t.startsWith('[') && t.endsWith(']')) return { type: 'JSON Array', icon: <FileJson size={14} /> };
  if (t.startsWith('{') && t.endsWith('}')) return { type: 'JSON Object', icon: <FileJson size={14} /> };
  if (t.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) return { type: 'Image', icon: <ImageIcon size={14} /> };
  if (t.includes('<') && t.includes('>')) return { type: 'HTML', icon: <FileText size={14} /> };
  if (!isNaN(Number(t))) return { type: 'Number', icon: <Hash size={14} /> };
  if (t.length > 100) return { type: 'Long Text', icon: <FileText size={14} /> };
  return { type: 'Text', icon: <FileText size={14} /> };
};

const getDataType = (val: any): string => {
  if (val === null || val === undefined || val === '') return 'Empty';
  if (typeof val === 'number') return 'Number';
  if (typeof val !== 'string') return typeof val;
  const t = val.trim();
  if ((t.startsWith('[') && t.endsWith(']')) || (t.startsWith('{') && t.endsWith('}'))) return 'JSON';
  if (t.includes('<') && t.includes('>')) return 'HTML';
  if (!isNaN(Number(t))) return 'Number';
  return 'String';
};

export const DataExplorer: React.FC<DataExplorerProps> = ({ fullGraph, doctors, services, handleTabChange }) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'tvs' | 'templates' | 'overview' | 'xray' | 'schema'>('schema');
  const [selectedSample, setSelectedSample] = useState<{name: string, value: any, template: string} | null>(null);
  const [schema, setSchema] = useState<{templates: any[], fields: any[]}>({ templates: [], fields: [] });
  const [loadingSchema, setLoadingSchema] = useState(false);

  // Fetch schema on mount
  React.useEffect(() => {
    const fetchSchema = async () => {
      setLoadingSchema(true);
      try {
        const res = await fetch('/api/export/schema');
        if (res.ok) {
          const data = await res.json();
          setSchema(data);
        }
      } catch (e) {
        console.error("Failed to fetch schema", e);
      } finally {
        setLoadingSchema(false);
      }
    };
    fetchSchema();
  }, []);

  const updateTemplateSchema = async (templateId: number, updates: any) => {
    try {
      const res = await fetch('/api/export/schema/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId, ...updates })
      });
      if (res.ok) {
        setSchema(prev => {
          const exists = prev.templates.find(t => t.template_id === templateId);
          if (exists) {
            return { ...prev, templates: prev.templates.map(t => t.template_id === templateId ? { ...t, ...updates } : t) };
          }
          return { ...prev, templates: [...prev.templates, { template_id: templateId, ...updates }] };
        });
      }
    } catch (e) {
      console.error("Failed to update template schema", e);
    }
  };

  const updateFieldSchema = async (templateId: number, fieldName: string, updates: any) => {
    try {
      const res = await fetch('/api/export/schema/field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId, field_name: fieldName, ...updates })
      });
      if (res.ok) {
        setSchema(prev => {
          const exists = prev.fields.find(f => f.template_id === templateId && f.field_name === fieldName);
          if (exists) {
            return { ...prev, fields: prev.fields.map(f => (f.template_id === templateId && f.field_name === fieldName) ? { ...f, ...updates } : f) };
          }
          return { ...prev, fields: [...prev.fields, { template_id: templateId, field_name: fieldName, ...updates }] };
        });
      }
    } catch (e) {
      console.error("Failed to update field schema", e);
    }
  };

  const entities = fullGraph?.entities || {};
  const resources = entities.resources || [];

  // 1. Extract known keys from processed entities (Doctors & Services)
  const knownKeys = useMemo(() => {
    const keys = new Set<string>();
    // Add standard resource fields
    ['id', 'pagetitle', 'longtitle', 'description', 'alias', 'published', 'deleted', 'template', 'parent', 'content'].forEach(k => keys.add(k));
    
    // Add keys from processed doctors
    if (doctors && doctors.length > 0) {
      Object.keys(doctors[0]).forEach(k => keys.add(k));
      if (doctors[0].tvs) Object.keys(doctors[0].tvs).forEach(k => keys.add(k));
    }
    // Add keys from processed services
    if (services && services.length > 0) {
      Object.keys(services[0]).forEach(k => keys.add(k));
      if (services[0].tvs) Object.keys(services[0].tvs).forEach(k => keys.add(k));
    }
    return keys;
  }, [doctors, services]);

  // 2. Analyze all TVs across all resources
  const tvAnalysis = useMemo(() => {
    const tvStats: Record<string, { count: number, total: number, mapped: boolean, types: Record<string, number>, sample: any, samplePages: { id: number, title: string, uri: string }[] }> = {};
    
    resources.forEach((res: any) => {
      if (res.tvs) {
        Object.entries(res.tvs).forEach(([key, value]) => {
          if (!tvStats[key]) {
            // Check if the key is mapped (either directly or without 'tv.' prefix)
            const isMapped = knownKeys.has(key) || knownKeys.has(key.replace(/^tv\./, ''));
            tvStats[key] = { count: 0, total: 0, mapped: isMapped, types: {}, sample: null, samplePages: [] };
          }
          
          tvStats[key].total++;
          
          if (value !== null && value !== undefined && value !== '') {
            tvStats[key].count++;
            const typeInfo = guessType(value);
            tvStats[key].types[typeInfo.type] = (tvStats[key].types[typeInfo.type] || 0) + 1;
            if (!tvStats[key].sample || String(value).length > String(tvStats[key].sample).length) {
              tvStats[key].sample = value; // Keep the longest sample
            }
            if (tvStats[key].samplePages.length < 3) {
              tvStats[key].samplePages.push({ id: res.id, title: res.pagetitle, uri: res.uri });
            }
          }
        });
      }
    });
    
    return Object.entries(tvStats)
      .map(([name, stats]) => {
        // Find dominant type
        let dominantType = 'Empty';
        let maxCount = 0;
        Object.entries(stats.types).forEach(([t, c]) => {
          if (c > maxCount) { maxCount = c; dominantType = t; }
        });
        
        return {
          name,
          ...stats,
          dominantType,
          fillPercentage: stats.total > 0 ? Math.round((stats.count / stats.total) * 100) : 0
        };
      })
      .sort((a, b) => {
        // Sort by unmapped first, then by fill percentage
        if (a.mapped !== b.mapped) return a.mapped ? 1 : -1;
        return b.fillPercentage - a.fillPercentage;
      });
  }, [resources, knownKeys]);

  // 2.5 Build a reverse index to find where resources are referenced in TVs
  const reverseIndex = useMemo(() => {
    const index: Record<string, { id: number, title: string, uri: string }[]> = {};
    resources.forEach((res: any) => {
      if (res.tvs) {
        Object.values(res.tvs).forEach((val: any) => {
          if (val !== null && val !== undefined && val !== '') {
            const strVal = String(val);
            // Extract potential IDs (numbers) from the value
            const matches = strVal.match(/\b\d+\b/g);
            if (matches) {
              matches.forEach(m => {
                if (!index[m]) index[m] = [];
                // Avoid self-references and keep max 3
                if (m !== String(res.id) && index[m].length < 3 && !index[m].find(r => r.id === res.id)) {
                  index[m].push({ id: res.id, title: res.pagetitle, uri: res.uri });
                }
              });
            }
          }
        });
      }
    });
    return index;
  }, [resources]);

  // 3. Analyze Templates
  const templateAnalysis = useMemo(() => {
    const usedTemplates = new Set<number>();
    doctors?.forEach(d => usedTemplates.add(d.template));
    services?.forEach(s => usedTemplates.add(s.template));
    
    const templateCounts: Record<number, { count: number, mapped: boolean, samplePages: { id: number, title: string, uri: string }[], referencedIn: { id: number, title: string, uri: string }[] }> = {};
    resources.forEach((res: any) => {
      const tpl = res.template || 0;
      if (!templateCounts[tpl]) {
        templateCounts[tpl] = { count: 0, mapped: usedTemplates.has(tpl), samplePages: [], referencedIn: [] };
      }
      templateCounts[tpl].count++;
      
      if (res.uri && templateCounts[tpl].samplePages.length < 3) {
        templateCounts[tpl].samplePages.push({ id: res.id, title: res.pagetitle, uri: res.uri });
      }

      // Check if this resource is referenced elsewhere (useful for dictionaries)
      if (reverseIndex[res.id]) {
        reverseIndex[res.id].forEach(ref => {
          if (templateCounts[tpl].referencedIn.length < 3 && !templateCounts[tpl].referencedIn.find(r => r.id === ref.id)) {
            templateCounts[tpl].referencedIn.push(ref);
          }
        });
      }
    });
    
    return Object.entries(templateCounts)
      .map(([id, stats]) => ({ id: parseInt(id), ...stats }))
      .sort((a, b) => b.count - a.count);
  }, [resources, doctors, services, reverseIndex]);

  // 4. Generate Actionable Insights
  const insights = useMemo(() => {
    const items = [];
    
    // Insight 1: Unmapped Templates with many pages
    const unmappedTemplates = templateAnalysis.filter(t => !t.mapped && t.count > 5 && t.id !== 0);
    if (unmappedTemplates.length > 0) {
      items.push({
        type: 'warning',
        title: 'Найдены неучтенные разделы сайта',
        description: `Мы игнорируем ${unmappedTemplates.length} шаблон(ов), на которых создано много страниц. Возможно, это важные разделы (Новости, Акции, Филиалы).`,
        details: unmappedTemplates.map(t => ({
          label: `Шаблон ID ${t.id} (${t.count} стр.)`,
          links: t.samplePages.length > 0 ? t.samplePages : t.referencedIn,
          templateId: t.id
        }))
      });
    }

    // Insight 2: Unmapped JSON/MIGX arrays
    const unmappedJson = tvAnalysis.filter(tv => !tv.mapped && tv.dominantType.includes('JSON') && tv.count > 0);
    if (unmappedJson.length > 0) {
      items.push({
        type: 'danger',
        title: 'Потеряны сложные структуры данных (MIGX)',
        description: `Найдено ${unmappedJson.length} полей с JSON-массивами, которые мы не парсим. Обычно там хранятся галереи, списки врачей для услуги или прайс-листы.`,
        details: unmappedJson.map(tv => ({
          label: `Поле "${tv.name}" (заполнено на ${tv.fillPercentage}%)`,
          links: tv.samplePages,
          sample: tv.sample
        }))
      });
    }

    // Insight 3: Unmapped Images
    const unmappedImages = tvAnalysis.filter(tv => !tv.mapped && tv.dominantType === 'Image' && tv.count > 0);
    if (unmappedImages.length > 0) {
      items.push({
        type: 'info',
        title: 'Неиспользуемые изображения',
        description: `Найдено ${unmappedImages.length} полей с картинками, которые не выводятся в интерфейсе.`,
        details: unmappedImages.map(tv => ({
          label: `Поле "${tv.name}" (заполнено на ${tv.fillPercentage}%)`,
          links: tv.samplePages,
          sample: tv.sample
        }))
      });
    }

    // Insight 4: Empty TVs (Garbage)
    const emptyTvs = tvAnalysis.filter(tv => tv.count === 0);
    if (emptyTvs.length > 10) {
      items.push({
        type: 'success',
        title: 'Много мусорных полей',
        description: `${emptyTvs.length} дополнительных полей (TV) абсолютно пустые на всех страницах. Их можно смело игнорировать, они не засоряют нашу базу.`,
        details: []
      });
    }

    return items;
  }, [templateAnalysis, tvAnalysis]);

  // 4.5 Page X-Ray (Reverse Audit)
  const xrayData = useMemo(() => {
    const templates: Record<number, {
      id: number,
      name: string,
      count: number,
      samplePages: { id: number, title: string, uri: string }[],
      fields: Record<string, { mapped: boolean, filledCount: number, sample: any, samplePages: { id: number, title: string, uri: string }[] }>
    }> = {};

    resources.forEach((res: any) => {
      const tpl = res.template || 0;
      if (!templates[tpl]) {
        let name = `Шаблон ${tpl}`;
        if (doctors?.some(d => d.template === tpl)) name = 'Врачи';
        else if (services?.some(s => s.template === tpl)) name = 'Услуги';
        else if (tpl === 0) name = 'Без шаблона';
        
        templates[tpl] = { id: tpl, name, count: 0, samplePages: [], fields: {} };
      }
      
      templates[tpl].count++;
      if (res.uri && templates[tpl].samplePages.length < 3 && !templates[tpl].samplePages.find(p => p.id === res.id)) {
        templates[tpl].samplePages.push({ id: res.id, title: res.pagetitle, uri: res.uri });
      }

      const processField = (key: string, val: any, isTv: boolean) => {
        const isMapped = knownKeys.has(key) || knownKeys.has(key.replace(/^tv\./, ''));
        
        if (!templates[tpl].fields[key]) {
          templates[tpl].fields[key] = { mapped: isMapped, filledCount: 0, sample: null, samplePages: [] };
        }
        
        if (val !== null && val !== undefined && val !== '') {
          templates[tpl].fields[key].filledCount++;
          if (!templates[tpl].fields[key].sample || String(val).length > String(templates[tpl].fields[key].sample).length) {
            templates[tpl].fields[key].sample = val;
          }
          if (templates[tpl].fields[key].samplePages.length < 3 && res.uri) {
            templates[tpl].fields[key].samplePages.push({ id: res.id, title: res.pagetitle, uri: res.uri });
          }
        }
      };

      ['pagetitle', 'longtitle', 'description', 'introtext', 'content'].forEach(key => {
        processField(key, res[key], false);
      });

      if (res.tvs) {
        Object.entries(res.tvs).forEach(([key, val]) => {
          processField(key, val, true);
        });
      }
    });

    return Object.values(templates)
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [resources, knownKeys, doctors, services]);

  // 5. Overview of all root entities
  const rootEntities = useMemo(() => {
    return Object.keys(entities).map(key => ({
      name: key,
      count: Array.isArray(entities[key]) ? entities[key].length : (typeof entities[key] === 'object' && entities[key] !== null ? Object.keys(entities[key]).length : 0)
    })).sort((a, b) => b.count - a.count);
  }, [entities]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Database className="text-blue-600" />
          Анализатор полноты данных (AI-Ассистент)
        </h2>
        <button onClick={() => handleTabChange("overview")} className="text-sm font-medium hover:underline cursor-pointer">
          ← На главную
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto hide-scrollbar bg-white rounded-t-lg">
        <button
          onClick={() => setActiveTab('schema')}
          className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'schema' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Database size={16} /> 
          Схема экспорта (API)
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'insights' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Lightbulb size={16} className={activeTab === 'insights' ? 'text-amber-500' : ''} /> 
          Инсайты ({insights.length})
        </button>
        <button
          onClick={() => setActiveTab('tvs')}
          className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'tvs' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Search size={16} /> 
          Маппинг полей (TV)
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'templates' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <LayoutTemplate size={16} /> 
          Анализ шаблонов
        </button>
        <button
          onClick={() => setActiveTab('xray')}
          className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'xray' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Search size={16} /> 
          Рентген страниц
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Database size={16} /> 
          Сырые таблицы
        </button>
      </div>

      <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg p-6">
        
        {/* INSIGHTS TAB */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                Алгоритм автоматически сопоставил сырые данные сайта с теми, которые мы уже выводим в разделах "Врачи" и "Услуги". 
                Здесь собраны главные выводы о том, <strong>какой контент мы потенциально теряем</strong>.
              </p>
            </div>

            {insights.length === 0 ? (
              <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                <CheckCircle2 size={48} className="text-green-500 mb-4" />
                <h3 className="text-xl font-medium text-gray-900">Всё отлично!</h3>
                <p>Алгоритм не нашел критичных неиспользуемых данных.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, idx) => (
                  <div key={idx} className={`p-5 rounded-lg border ${
                    insight.type === 'danger' ? 'bg-red-50 border-red-200' :
                    insight.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                    insight.type === 'success' ? 'bg-green-50 border-green-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      {insight.type === 'danger' && <AlertTriangle className="text-red-600 shrink-0 mt-1" size={20} />}
                      {insight.type === 'warning' && <AlertTriangle className="text-amber-600 shrink-0 mt-1" size={20} />}
                      {insight.type === 'success' && <CheckCircle2 className="text-green-600 shrink-0 mt-1" size={20} />}
                      {insight.type === 'info' && <Lightbulb className="text-blue-600 shrink-0 mt-1" size={20} />}
                      
                      <div>
                        <h3 className={`font-bold mb-1 ${
                          insight.type === 'danger' ? 'text-red-900' :
                          insight.type === 'warning' ? 'text-amber-900' :
                          insight.type === 'success' ? 'text-green-900' :
                          'text-blue-900'
                        }`}>{insight.title}</h3>
                        <p className={`text-sm mb-3 ${
                          insight.type === 'danger' ? 'text-red-800' :
                          insight.type === 'warning' ? 'text-amber-800' :
                          insight.type === 'success' ? 'text-green-800' :
                          'text-blue-800'
                        }`}>{insight.description}</p>
                        
                        {insight.details.length > 0 && (
                          <ul className="text-xs space-y-2 opacity-90 list-disc pl-4 mt-2">
                            {insight.details.map((d: any, i) => (
                              <li key={i} className="bg-white/50 p-2 rounded border border-black/5">
                                {typeof d === 'string' ? d : (
                                  <>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className="font-medium">{d.label}</span>
                                      {d.templateId && d.templateId !== 0 && (
                                        <a 
                                          href={`https://cispb.com/manager/?a=element/template/update&id=${d.templateId}`} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          className="text-blue-600 hover:text-blue-800 text-[10px] flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition-colors"
                                          title="Открыть этот шаблон в админке MODX"
                                        >
                                          <ExternalLink size={10} /> Админка
                                        </a>
                                      )}
                                      {d.sample && (
                                        <button 
                                          onClick={() => setSelectedSample({name: d.label.split('"')[1] || 'Поле', value: d.sample, template: 'Инсайт'})}
                                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[10px] font-medium bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded transition-colors"
                                        >
                                          <Eye size={10} /> Посмотреть контент
                                        </button>
                                      )}
                                    </div>
                                    {d.links && d.links.length > 0 && (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {d.links.map((link: any, j: number) => (
                                          <a 
                                            key={j} 
                                            href={`https://cispb.com${(link.uri || '').startsWith('/') ? '' : '/'}${link.uri || ''}`} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/50 hover:bg-white rounded border border-black/10 text-blue-600 hover:text-blue-800 transition-colors"
                                            title={link.title}
                                          >
                                            <ArrowRightLeft size={10} /> {link.id}
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TVS MAPPING TAB */}
        {activeTab === 'tvs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-lg font-semibold">Маппинг дополнительных полей (TV)</h3>
                <p className="text-sm text-gray-600">
                  Зеленые поля мы уже парсим. Желтые — содержат данные, но мы их игнорируем. Серые — абсолютно пустые.
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Используются</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Потеряны</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-300"></div> Пустые</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3">Название поля (TV)</th>
                    <th className="px-4 py-3">Заполненность</th>
                    <th className="px-4 py-3">Тип контента</th>
                    <th className="px-4 py-3">Пример данных</th>
                  </tr>
                </thead>
                <tbody>
                  {tvAnalysis.map((tv, idx) => (
                    <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 ${
                      tv.count === 0 ? 'opacity-50' : ''
                    }`}>
                      <td className="px-4 py-3">
                        {tv.mapped ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            <CheckCircle2 size={12} /> В работе
                          </span>
                        ) : tv.count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                            <AlertTriangle size={12} /> Игнор
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                            <XCircle size={12} /> Пусто
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-900 font-medium">{tv.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                            <div className={`h-2 rounded-full ${tv.mapped ? 'bg-green-500' : tv.count > 0 ? 'bg-amber-500' : 'bg-gray-400'}`} style={{ width: `${tv.fillPercentage}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-500">{tv.fillPercentage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-gray-600">
                          {guessType(tv.sample).icon} {tv.dominantType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-mono text-xs text-gray-500 truncate max-w-xs" title={tv.sample ? String(tv.sample) : ''}>
                            {tv.sample ? String(tv.sample).substring(0, 60) + (String(tv.sample).length > 60 ? '...' : '') : '—'}
                          </div>
                          {tv.sample && String(tv.sample).length > 60 && (
                            <button 
                              onClick={() => setSelectedSample({name: tv.name, value: tv.sample, template: 'Маппинг TV'})}
                              className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                              title="Посмотреть контент полностью"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                        </div>
                        {tv.samplePages.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tv.samplePages.map((page, i) => (
                              <a 
                                key={i} 
                                href={`https://cispb.com${(page.uri || '').startsWith('/') ? '' : '/'}${page.uri || ''}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded border border-gray-200 transition-colors text-[10px]"
                                title={page.title}
                              >
                                <ArrowRightLeft size={10} /> {page.id}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Анализ шаблонов (Templates)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Зеленые шаблоны мы уже обрабатываем (например, Врачи и Услуги). Желтые — это шаблоны, страницы которых мы пока не выводим в отдельные списки.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templateAnalysis.map((tpl) => (
                <div key={tpl.id} className={`p-4 border rounded-lg ${
                  tpl.mapped ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">Шаблон ID: {tpl.id}</span>
                      {tpl.id !== 0 && (
                        <a 
                          href={`https://cispb.com/manager/?a=element/template/update&id=${tpl.id}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-blue-600 hover:text-blue-800 text-[10px] flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition-colors"
                          title="Открыть этот шаблон в админке MODX"
                        >
                          <ExternalLink size={10} /> Админка
                        </a>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      tpl.mapped ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {tpl.count} стр.
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {tpl.samplePages.length > 0 ? (
                      <>
                        <p className="font-medium mb-1">Примеры страниц:</p>
                        <ul className="space-y-1">
                          {tpl.samplePages.map((page, i) => (
                            <li key={i} className="flex items-center gap-2 truncate">
                              <a 
                                href={`https://cispb.com${(page.uri || '').startsWith('/') ? '' : '/'}${page.uri || ''}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-blue-600 hover:underline truncate"
                                title={page.title}
                              >
                                {page.title}
                              </a>
                              <span className="text-gray-400 text-[10px]">({page.id})</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : tpl.referencedIn.length > 0 ? (
                      <>
                        <p className="font-medium mb-1 text-amber-700">Справочник (выводится на):</p>
                        <ul className="space-y-1">
                          {tpl.referencedIn.map((page, i) => (
                            <li key={i} className="flex items-center gap-2 truncate">
                              <a 
                                href={`https://cispb.com${(page.uri || '').startsWith('/') ? '' : '/'}${page.uri || ''}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-blue-600 hover:underline truncate"
                                title={page.title}
                              >
                                {page.title}
                              </a>
                              <span className="text-gray-400 text-[10px]">({page.id})</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="text-gray-400 italic">Нет публичных страниц</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* X-RAY TAB */}
        {activeTab === 'xray' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Рентген страниц (Обратный аудит):</strong> Выберите тип страницы (шаблон), чтобы увидеть <strong>все</strong> данные, которые хранятся в базе для этого типа страниц. 
                Зеленым отмечено то, что мы уже выводим в приложении, желтым — то, что есть в базе, но мы пока теряем.
              </p>
            </div>

            <div className="space-y-4">
              {xrayData.map((tpl, idx) => {
                const fields = Object.entries(tpl.fields || {}).map(([name, data]) => ({ name, ...data }));
                const mappedFields = fields.filter(f => f.mapped && f.filledCount > 0);
                const unmappedFields = fields.filter(f => !f.mapped && f.filledCount > 0).sort((a, b) => b.filledCount - a.filledCount);
                const emptyFields = fields.filter(f => f.filledCount === 0);

                return (
                  <div key={idx} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            {tpl.name}
                          </h3>
                          <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">ID: {tpl.id}</span>
                          {tpl.id !== 0 && (
                            <a 
                              href={`https://cispb.com/manager/?a=element/template/update&id=${tpl.id}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                              title="Открыть этот шаблон в админке MODX"
                            >
                              <ExternalLink size={12} /> Админка MODX
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                          <FileText size={12} /> {tpl.count} страниц(ы). 
                          {tpl.samplePages.length > 0 && (
                            <span className="ml-1 text-gray-400">Например: {tpl.samplePages.map(p => p.title).join(', ')}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2 text-xs font-medium w-full sm:w-auto">
                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100 whitespace-nowrap">{mappedFields.length} в работе</span>
                        {unmappedFields.length > 0 && <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 whitespace-nowrap">{unmappedFields.length} теряется</span>}
                      </div>
                    </div>
                    
                    <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Unmapped (Lost) Fields */}
                      <div>
                        <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2 border-b border-amber-100 pb-2">
                          <AlertTriangle size={16} /> Потерянные данные (Игнор)
                        </h4>
                        {unmappedFields.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">Все заполненные поля используются!</p>
                        ) : (
                          <div className="space-y-3">
                            {unmappedFields.map((f, i) => {
                              const dataType = getDataType(f.sample);
                              return (
                                <div key={i} className="bg-amber-50/50 border border-amber-100 rounded p-3">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm font-bold text-amber-900">{f.name}</span>
                                      <span className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        {dataType === 'JSON' && <FileJson size={10} />}
                                        {dataType === 'HTML' && <Code size={10} />}
                                        {dataType}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded whitespace-nowrap">Заполнено: {Math.round((f.filledCount / tpl.count) * 100)}%</span>
                                  </div>
                                  
                                  <div className="bg-white border border-amber-100 rounded p-2 mb-2">
                                    <div className="text-xs text-gray-600 font-mono truncate mb-1.5" title={String(f.sample)}>
                                      {String(f.sample)}
                                    </div>
                                    <button 
                                      onClick={() => setSelectedSample({name: f.name, value: f.sample, template: tpl.name})}
                                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors w-full justify-center sm:w-auto sm:justify-start"
                                    >
                                      <Eye size={14} /> Посмотреть весь контент
                                    </button>
                                  </div>

                                  {f.samplePages.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {f.samplePages.map((page, j) => (
                                        <a 
                                          key={j} 
                                          href={`https://cispb.com${(page.uri || '').startsWith('/') ? '' : '/'}${page.uri || ''}`} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white hover:bg-amber-100 text-amber-700 rounded border border-amber-200 transition-colors text-[10px]"
                                          title={page.title}
                                        >
                                          <ArrowRightLeft size={10} /> {page.id}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Mapped Fields */}
                      <div>
                        <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2 border-b border-green-100 pb-2">
                          <CheckCircle2 size={16} /> Используются в приложении
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {mappedFields.map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-mono">
                              {f.name}
                            </span>
                          ))}
                        </div>
                        
                        <h4 className="font-semibold text-gray-500 mt-6 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                          <XCircle size={16} /> Пустые поля (Мусор)
                        </h4>
                        <div className="flex flex-wrap gap-2 opacity-60">
                          {emptyFields.map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-500 border border-gray-200 rounded text-xs font-mono">
                              {f.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'schema' && (
          <div className="space-y-4">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-lg font-semibold">Схема экспорта (Data Mapping)</h3>
                <p className="text-sm text-gray-600">
                  Настройте, какие данные будут отдаваться по REST API. Выберите шаблоны и поля, задайте им удобные имена (алиасы) и типы данных.
                </p>
              </div>
            </div>

            {loadingSchema ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-8">
                {xrayData.map((tpl) => {
                  const tplSchema = schema.templates.find(t => t.template_id === tpl.id) || { is_exportable: 1, alias: '' };
                  const isExportable = tplSchema.is_exportable === 1;

                  return (
                    <div key={tpl.id} className={`border rounded-lg overflow-hidden ${isExportable ? 'border-blue-200' : 'border-gray-200 opacity-70'}`}>
                      {/* Template Header */}
                      <div className={`p-4 flex flex-wrap gap-4 justify-between items-center ${isExportable ? 'bg-blue-50' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={isExportable}
                              onChange={(e) => updateTemplateSchema(tpl.id, { is_exportable: e.target.checked ? 1 : 0, alias: tplSchema.alias })}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="font-bold text-gray-900">Шаблон: {tpl.name || `Шаблон ${tpl.id}`} (ID: {tpl.id})</span>
                          </label>
                          <span className="text-sm text-gray-500">{tpl.count} страниц</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">API Alias:</span>
                          <input 
                            type="text" 
                            value={tplSchema.alias || ''}
                            onChange={(e) => updateTemplateSchema(tpl.id, { is_exportable: tplSchema.is_exportable, alias: e.target.value })}
                            placeholder={(tpl.name || `template_${tpl.id}`).toLowerCase().replace(/[^a-z0-9]/g, '_')}
                            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2 py-1"
                            disabled={!isExportable}
                          />
                        </div>
                      </div>

                      {/* Template Fields */}
                      {isExportable && (
                        <div className="p-0 overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-200">
                              <tr>
                                <th className="px-4 py-3 w-10">Экспорт</th>
                                <th className="px-4 py-3">Поле (MODX)</th>
                                <th className="px-4 py-3">API Alias (Новое имя)</th>
                                <th className="px-4 py-3">Тип данных (Cast)</th>
                                <th className="px-4 py-3">Пример данных</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(tpl.fields || {})
                                .sort(([, a], [, b]) => b.filledCount - a.filledCount)
                                .map(([fieldName, fieldData]) => {
                                  const fieldSchema = schema.fields.find(f => f.template_id === tpl.id && f.field_name === fieldName) || { is_exportable: 1, alias: '', cast_type: 'string' };
                                  const isFieldExportable = fieldSchema.is_exportable === 1;
                                  const guessedType = guessType(fieldData.sample).type;
                                  
                                  // Default cast type based on guessed type if not set
                                  let defaultCast = 'string';
                                  if (guessedType === 'Number') defaultCast = 'number';
                                  if (guessedType === 'JSON Array' || guessedType === 'JSON Object') defaultCast = 'json';
                                  if (guessedType === 'HTML') defaultCast = 'html';

                                  const currentCast = fieldSchema.cast_type || defaultCast;

                                  return (
                                    <tr key={fieldName} className={`border-b border-gray-100 hover:bg-gray-50 ${!isFieldExportable ? 'opacity-50 bg-gray-50/50' : ''}`}>
                                      <td className="px-4 py-3">
                                        <input 
                                          type="checkbox" 
                                          checked={isFieldExportable}
                                          onChange={(e) => updateFieldSchema(tpl.id, fieldName, { is_exportable: e.target.checked ? 1 : 0, alias: fieldSchema.alias, cast_type: currentCast })}
                                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                      </td>
                                      <td className="px-4 py-3 font-mono text-gray-900 font-medium">
                                        {fieldName}
                                        <div className="text-[10px] text-gray-500 font-sans mt-0.5">Заполнено: {fieldData.filledCount}</div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <input 
                                          type="text" 
                                          value={fieldSchema.alias || ''}
                                          onChange={(e) => updateFieldSchema(tpl.id, fieldName, { is_exportable: fieldSchema.is_exportable, alias: e.target.value, cast_type: currentCast })}
                                          placeholder={fieldName}
                                          className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2 py-1 w-full max-w-[200px]"
                                          disabled={!isFieldExportable}
                                        />
                                      </td>
                                      <td className="px-4 py-3">
                                        <select
                                          value={currentCast}
                                          onChange={(e) => updateFieldSchema(tpl.id, fieldName, { is_exportable: fieldSchema.is_exportable, alias: fieldSchema.alias, cast_type: e.target.value })}
                                          className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2 py-1"
                                          disabled={!isFieldExportable}
                                        >
                                          <option value="string">String (Строка)</option>
                                          <option value="number">Number (Число)</option>
                                          <option value="boolean">Boolean (Да/Нет)</option>
                                          <option value="json">JSON (Массив/Объект)</option>
                                          <option value="html">HTML (Текст с тегами)</option>
                                        </select>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <div className="font-mono text-xs text-gray-500 truncate max-w-[200px]" title={fieldData.sample ? String(fieldData.sample) : ''}>
                                            {fieldData.sample ? String(fieldData.sample).substring(0, 40) + (String(fieldData.sample).length > 40 ? '...' : '') : '—'}
                                          </div>
                                          {fieldData.sample && String(fieldData.sample).length > 40 && (
                                            <button 
                                              onClick={() => setSelectedSample({name: fieldName, value: fieldData.sample, template: tpl.name})}
                                              className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                                              title="Посмотреть контент полностью"
                                            >
                                              <Eye size={14} />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Корневые сущности в базе данных</h3>
            <p className="text-sm text-gray-600 mb-4">
              Все таблицы и массивы, которые отдал скрипт выгрузки.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rootEntities.map((entity) => (
                <div key={entity.name} className="flex justify-between items-center p-4 border border-gray-100 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span className="font-mono text-sm text-gray-800">{entity.name}</span>
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                    {entity.count} записей
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* MODAL FOR LONG TEXT */}
      {selectedSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  <FileText className="text-blue-600" />
                  Содержимое поля: <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{selectedSample.name}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">Шаблон: {selectedSample.template}</p>
              </div>
              <button 
                onClick={() => setSelectedSample(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-900"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-0 overflow-hidden flex-1 flex flex-col bg-gray-900 rounded-b-xl">
              <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                <span className="text-xs text-gray-400 font-mono">
                  Тип данных: {getDataType(selectedSample.value)}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  Длина: {String(selectedSample.value).length} симв.
                </span>
              </div>
              <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                <pre className="whitespace-pre-wrap text-sm font-mono text-green-400 break-words">
                  {getDataType(selectedSample.value) === 'JSON' 
                    ? JSON.stringify(JSON.parse(String(selectedSample.value)), null, 2) 
                    : String(selectedSample.value)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
