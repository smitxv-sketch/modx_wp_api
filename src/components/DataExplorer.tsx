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
  const [showLLMReport, setShowLLMReport] = useState(false);
  const [llmReportContent, setLlmReportContent] = useState('');

  const generateLLMReport = () => {
    let report = `# Структура сайта и данные для LLM\n\n`;
    report += `Этот документ содержит выгрузку структуры данных сайта, включая шаблоны, поля и примеры реальных данных. Он предназначен для анализа и проектирования нового сайта или синхронизации.\n\n`;

    report += `## 1. Общая статистика\n`;
    report += `- Всего страниц: ${entities.resources?.length || 0}\n`;
    report += `- Врачей: ${doctors?.length || 0}\n`;
    report += `- Услуг: ${services?.length || 0}\n`;
    report += `- Статей/Акций: ${entities.articles?.length || 0}\n`;
    report += `- Локаций: ${entities.locations?.length || 0}\n\n`;

    report += `## 2. Структура шаблонов и полей (Рентген)\n\n`;
    xrayData.forEach(tpl => {
      report += `### ${tpl.name} (ID шаблона: ${tpl.id})\n`;
      report += `Количество страниц: ${tpl.count}\n`;
      if (tpl.samplePages.length > 0) {
        report += `Примеры страниц: ${tpl.samplePages.map(p => p.title).join(', ')}\n`;
      }
      report += `\nПоля данных:\n`;
      
      const fields = Object.entries(tpl.fields)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.filledCount - a.filledCount);

      const mappedFields = fields.filter(f => f.mapped && f.filledCount > 0);
      const unmappedFields = fields.filter(f => !f.mapped && f.filledCount > 0);

      report += `**Используемые поля (Mapped):**\n`;
      if (mappedFields.length === 0) report += `- Нет\n`;
      mappedFields.forEach(f => {
        const type = guessType(f.sample).type;
        report += `- ${f.name} (${type}) - Заполнено на ${Math.round((f.filledCount / tpl.count) * 100)}%\n`;
      });

      report += `\n**Потерянные/Неиспользуемые поля (Unmapped):**\n`;
      if (unmappedFields.length === 0) report += `- Нет\n`;
      unmappedFields.forEach(f => {
        const type = guessType(f.sample).type;
        report += `- ${f.name} (${type}) - Заполнено на ${Math.round((f.filledCount / tpl.count) * 100)}%\n`;
      });
      report += `\n---\n\n`;
    });

    report += `## 3. Примеры данных (JSON)\n\n`;
    report += `Ниже приведены примеры реальных данных (по 3 записи каждого основного типа), чтобы показать взаимосвязи (например, через поля tvs.loc, tvs.specListAction и т.д.).\n\n`;

    const getExamples = (arr: any[], limit = 3) => {
      if (!arr || !Array.isArray(arr)) return [];
      return arr.slice(0, limit).map(item => {
        // Убираем слишком длинные текстовые поля (контент), чтобы не засорять отчет
        const cleanItem = { ...item };
        if (cleanItem.content && cleanItem.content.length > 500) {
          cleanItem.content = cleanItem.content.substring(0, 500) + '... [TRUNCATED]';
        }
        return cleanItem;
      });
    };

    report += `### Примеры Врачей (Doctors)\n`;
    report += "```json\n" + JSON.stringify(getExamples(doctors), null, 2) + "\n```\n\n";

    report += `### Примеры Услуг (Services)\n`;
    report += "```json\n" + JSON.stringify(getExamples(services), null, 2) + "\n```\n\n";

    report += `### Примеры Статей/Акций (Articles)\n`;
    report += "```json\n" + JSON.stringify(getExamples(entities.articles), null, 2) + "\n```\n\n";

    report += `### Примеры Локаций (Locations)\n`;
    report += "```json\n" + JSON.stringify(getExamples(entities.locations), null, 2) + "\n```\n\n";

    report += `## 4. REST API Endpoints\n\n`;
    report += `Для получения этих данных из старой базы MODX доступны следующие REST API эндпоинты:\n\n`;

    report += `### 1. \`GET /api/sync/full-graph\`\n`;
    report += `**Описание:** Основной эндпоинт, который возвращает полный граф всех сущностей сайта. Идеально подходит для полной синхронизации или миграции.\n`;
    report += `**Параметры:** \`?include_excluded=true\` (опционально, для включения исключенных из выгрузки ресурсов).\n`;
    report += `**Формат ответа (структура):**\n`;
    report += "```json\n{\n  \"timestamp\": \"2026-04-02T...\",\n  \"entities\": {\n    \"resources\": [...], // Все страницы\n    \"doctors\": [...], // Только врачи (шаблон 7)\n    \"services\": [...], // Только услуги (шаблоны 6, 32)\n    \"articles\": [...], // Статьи, новости, акции (шаблоны 4, 19, 25)\n    \"locations\": [...], // Уникальные локации\n    \"price_items\": [...], // Прайс-лист\n    \"media\": [...], // Файлы и картинки (ms2_product_files)\n    \"redirects\": [...] // Таблица редиректов\n  }\n}\n```\n\n";

    report += `### 2. \`GET /api/doctors\`\n`;
    report += `**Описание:** Возвращает готовый, отформатированный список врачей. Все TV-параметры (tvs) уже извлечены и привязаны к каждому врачу.\n`;
    report += `**Формат ответа:** Массив объектов (см. примеры врачей выше).\n\n`;

    report += `### 3. \`GET /api/services\`\n`;
    report += `**Описание:** Возвращает готовый список услуг. Включает привязку к родительской категории, извлеченные TV-параметры и вложенный массив \`price_items\` (цены на эту услугу).\n`;
    report += `**Формат ответа:** Массив объектов (см. примеры услуг выше).\n\n`;

    report += `### 4. \`GET /api/export/schema\`\n`;
    report += `**Описание:** Возвращает конфигурацию схемы экспорта (какие шаблоны и поля отмечены для выгрузки, их алиасы и типы данных).\n`;
    report += `**Формат ответа:** \`{ "templates": [...], "fields": [...] }\`\n\n`;

    report += `## 5. Предлагаемые TypeScript интерфейсы (Draft)\n\n`;
    report += `Основываясь на данных, вот примерные интерфейсы для нового фронтенда:\n\n`;
    report += "```typescript\n";
    report += "export interface Doctor {\n  id: number;\n  name: string;\n  alias: string;\n  rank?: string;\n  specialization?: string;\n  experience?: string;\n  education?: string;\n  description?: string;\n  photo?: string;\n  seo?: { title: string; description: string };\n  tvs?: Record<string, any>;\n}\n\n";
    report += "export interface Service {\n  id: number;\n  pagetitle: string;\n  alias: string;\n  parent_id: number;\n  category?: { id: number; pagetitle: string };\n  price_items: Array<{ id: number; name: string; price: number; [key: string]: any }>;\n  description?: string;\n  image?: string;\n  seo?: { title: string; description: string };\n  tvs?: Record<string, any>;\n}\n";
    report += "```\n\n";

    setLlmReportContent(report);
    setShowLLMReport(true);
  };

  const downloadFullDump = async () => {
    try {
      const res = await fetch('/api/sync/full-graph');
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      
      // Enrich resources with connections for machine-readable export
      if (data && data.entities && data.entities.resources) {
        const resources = data.entities.resources;
        resources.forEach((res: any) => {
          const incoming: any[] = [];
          const outgoing: any[] = [];
          
          // Outgoing
          if (res.tvs) {
            Object.entries(res.tvs).forEach(([key, value]) => {
              if (typeof value === 'string' || typeof value === 'number') {
                const strVal = String(value);
                const ids = strVal.split('||').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                ids.forEach(id => {
                  const linkedRes = resources.find((r: any) => r.id === id);
                  if (linkedRes) {
                    outgoing.push({ id: linkedRes.id, title: linkedRes.pagetitle, field: key });
                  }
                });
              }
            });
          }
          
          // Incoming
          resources.forEach((otherRes: any) => {
            if (otherRes.id === res.id) return;
            if (otherRes.tvs) {
              Object.entries(otherRes.tvs).forEach(([key, value]) => {
                if (typeof value === 'string' || typeof value === 'number') {
                  const strVal = String(value);
                  const ids = strVal.split('||').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
                  if (ids.includes(res.id)) {
                    incoming.push({ id: otherRes.id, title: otherRes.pagetitle, field: key });
                  }
                }
              });
            }
          });
          
          res._connections = { incoming, outgoing };
        });
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `modx_full_dump_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Ошибка при скачивании дампа. Возможно, база слишком большая.');
    }
  };

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

  // 1. Extract known keys from processed entities
  const knownKeys = useMemo(() => {
    const keys = new Set<string>();
    // Add standard resource fields
    ['id', 'pagetitle', 'longtitle', 'description', 'alias', 'published', 'deleted', 'template', 'parent', 'content'].forEach(k => keys.add(k));
    
    const extractKeys = (items: any[]) => {
      if (items && items.length > 0) {
        items.forEach(item => {
          Object.keys(item).forEach(k => keys.add(k));
          if (item.tvs) Object.keys(item.tvs).forEach(k => keys.add(k));
        });
      }
    };

    extractKeys(doctors);
    extractKeys(services);
    extractKeys(entities.news || []);
    extractKeys(entities.promotions || []);
    extractKeys(entities.articles || []);
    extractKeys(entities.pages || []);
    extractKeys(entities.reviews || []);
    extractKeys(entities.programs || []);
    extractKeys(entities.branches || []);
    extractKeys(entities.equipment || []);
    extractKeys(entities.vacancies || []);
    
    return keys;
  }, [doctors, services, entities]);

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
    entities.news?.forEach((n: any) => usedTemplates.add(n.template));
    entities.promotions?.forEach((p: any) => usedTemplates.add(p.template));
    entities.articles?.forEach((a: any) => usedTemplates.add(a.template));
    entities.pages?.forEach((p: any) => usedTemplates.add(p.template));
    entities.reviews?.forEach((r: any) => usedTemplates.add(r.template));
    entities.programs?.forEach((p: any) => usedTemplates.add(p.template));
    entities.branches?.forEach((b: any) => usedTemplates.add(b.template));
    entities.equipment?.forEach((e: any) => usedTemplates.add(e.template));
    entities.vacancies?.forEach((v: any) => usedTemplates.add(v.template));
    
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
        else if (entities.reviews?.some((r: any) => r.template === tpl)) name = 'Отзывы';
        else if (services?.some(s => s.template === tpl)) name = 'Услуги';
        else if (entities.news?.some((n: any) => n.template === tpl)) name = 'Новости';
        else if (entities.promotions?.some((p: any) => p.template === tpl)) name = 'Акции';
        else if (entities.articles?.some((a: any) => a.template === tpl)) name = 'Статьи';
        else if (entities.pages?.some((p: any) => p.template === tpl)) name = 'Статические страницы';
        else if (entities.programs?.some((p: any) => p.template === tpl)) name = 'Программы';
        else if (entities.branches?.some((b: any) => b.template === tpl)) name = 'Филиалы';
        else if (entities.equipment?.some((e: any) => e.template === tpl)) name = 'Оборудование / Диагностика';
        else if (entities.vacancies?.some((v: any) => v.template === tpl)) name = 'Вакансии';
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h2 className="text-2xl sm:text-3xl font-medium tracking-tight flex items-center gap-3 text-slate-800">
          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600">
            <Database size={24} />
          </div>
          Анализатор полноты данных
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={downloadFullDump}
            className="flex items-center gap-2 bg-white/60 hover:bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-md"
            title="Скачать всю базу в одном JSON файле"
          >
            <Database size={16} />
            Скачать JSON-дамп
          </button>
          <button 
            onClick={generateLLMReport}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300"
          >
            <FileText size={16} />
            Сгенерировать отчет для LLM
          </button>
          <button onClick={() => handleTabChange("overview")} className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors px-2">
            ← На главную
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex overflow-x-auto hide-scrollbar bg-white/40 backdrop-blur-xl border border-white/60 p-1.5 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] w-max max-w-full">
        <button
          onClick={() => setActiveTab('schema')}
          className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-2 rounded-xl cursor-pointer ${
            activeTab === 'schema' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <Database size={16} /> 
          Схема экспорта (API)
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-2 rounded-xl cursor-pointer ${
            activeTab === 'insights' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <Lightbulb size={16} className={activeTab === 'insights' ? 'text-amber-500' : ''} /> 
          Инсайты ({insights.length})
        </button>
        <button
          onClick={() => setActiveTab('tvs')}
          className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-2 rounded-xl cursor-pointer ${
            activeTab === 'tvs' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <Search size={16} /> 
          Маппинг полей (TV)
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-2 rounded-xl cursor-pointer ${
            activeTab === 'templates' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <LayoutTemplate size={16} /> 
          Анализ шаблонов
        </button>
        <button
          onClick={() => setActiveTab('xray')}
          className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-2 rounded-xl cursor-pointer ${
            activeTab === 'xray' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <Search size={16} /> 
          Рентген страниц
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-2 rounded-xl cursor-pointer ${
            activeTab === 'overview' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
        >
          <Database size={16} /> 
          Сырые таблицы
        </button>
      </div>

      <div className="bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 sm:p-8">
        
        {/* INSIGHTS TAB */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="bg-indigo-50/60 border border-indigo-200/60 rounded-2xl p-5 mb-6 backdrop-blur-md shadow-sm">
              <p className="text-sm text-indigo-800/90">
                Алгоритм автоматически сопоставил сырые данные сайта с теми, которые мы уже выводим в разделах "Врачи" и "Услуги". 
                Здесь собраны главные выводы о том, <strong className="font-medium text-indigo-900">какой контент мы потенциально теряем</strong>.
              </p>
            </div>

            {insights.length === 0 ? (
              <div className="text-center py-12 text-slate-500 flex flex-col items-center">
                <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                <h3 className="text-xl font-medium tracking-tight text-slate-800">Всё отлично!</h3>
                <p className="mt-1">Алгоритм не нашел критичных неиспользуемых данных.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border shadow-sm backdrop-blur-md ${
                    insight.type === 'danger' ? 'bg-red-50/60 border-red-200/60' :
                    insight.type === 'warning' ? 'bg-amber-50/60 border-amber-200/60' :
                    insight.type === 'success' ? 'bg-emerald-50/60 border-emerald-200/60' :
                    'bg-indigo-50/60 border-indigo-200/60'
                  }`}>
                    <div className="flex items-start gap-3">
                      {insight.type === 'danger' && <AlertTriangle className="text-red-600 shrink-0 mt-1" size={20} />}
                      {insight.type === 'warning' && <AlertTriangle className="text-amber-600 shrink-0 mt-1" size={20} />}
                      {insight.type === 'success' && <CheckCircle2 className="text-emerald-600 shrink-0 mt-1" size={20} />}
                      {insight.type === 'info' && <Lightbulb className="text-indigo-600 shrink-0 mt-1" size={20} />}
                      
                      <div>
                        <h3 className={`font-medium tracking-tight mb-1 ${
                          insight.type === 'danger' ? 'text-red-900' :
                          insight.type === 'warning' ? 'text-amber-900' :
                          insight.type === 'success' ? 'text-emerald-900' :
                          'text-indigo-900'
                        }`}>{insight.title}</h3>
                        <p className={`text-sm mb-3 ${
                          insight.type === 'danger' ? 'text-red-800/80' :
                          insight.type === 'warning' ? 'text-amber-800/80' :
                          insight.type === 'success' ? 'text-emerald-800/80' :
                          'text-indigo-800/80'
                        }`}>{insight.description}</p>
                        
                        {insight.details.length > 0 && (
                          <ul className="text-xs space-y-2 opacity-90 list-disc pl-4 mt-2">
                            {insight.details.map((d: any, i) => (
                              <li key={i} className="bg-white/60 p-2.5 rounded-xl border border-white/80 shadow-sm">
                                {typeof d === 'string' ? d : (
                                  <>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className="font-medium">{d.label}</span>
                                      {d.templateId && d.templateId !== 0 && (
                                        <a 
                                          href={`https://cispb.com/manager/?a=element/template/update&id=${d.templateId}`} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          className="text-indigo-600 hover:text-indigo-800 text-[10px] flex items-center gap-1 bg-indigo-50/50 hover:bg-indigo-100/50 px-2 py-1 rounded-lg border border-indigo-200/50 transition-colors font-medium"
                                          title="Открыть этот шаблон в админке MODX"
                                        >
                                          <ExternalLink size={10} /> Админка
                                        </a>
                                      )}
                                      {d.sample && (
                                        <button 
                                          onClick={() => setSelectedSample({name: d.label.split('"')[1] || 'Поле', value: d.sample, template: 'Инсайт'})}
                                          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-[10px] font-medium bg-indigo-50/50 hover:bg-indigo-100/50 px-2 py-1 rounded-lg transition-colors border border-indigo-200/50"
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
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-white/60 hover:bg-white/80 rounded-lg border border-slate-200/60 text-indigo-600 hover:text-indigo-800 transition-colors shadow-sm"
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
              <div>
                <h3 className="text-xl font-medium tracking-tight text-slate-800">Маппинг дополнительных полей (TV)</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Зеленые поля мы уже парсим. Желтые — содержат данные, но мы их игнорируем. Серые — абсолютно пустые.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm bg-white/50 px-4 py-2 rounded-xl border border-white/60 shadow-sm">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div> Используются</span>
                <span className="flex items-center gap-1.5 text-slate-600 font-medium"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm"></div> Потеряны</span>
                <span className="flex items-center gap-1.5 text-slate-600 font-medium"><div className="w-2.5 h-2.5 rounded-full bg-slate-300 shadow-sm"></div> Пустые</span>
              </div>
            </div>
            
            <div className="overflow-x-auto bg-white/40 rounded-2xl border border-white/60 shadow-sm backdrop-blur-md">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-white/50 border-b border-white/60">
                  <tr>
                    <th className="px-5 py-4 font-semibold tracking-wider">Статус</th>
                    <th className="px-5 py-4 font-semibold tracking-wider">Название поля (TV)</th>
                    <th className="px-5 py-4 font-semibold tracking-wider">Заполненность</th>
                    <th className="px-5 py-4 font-semibold tracking-wider">Тип контента</th>
                    <th className="px-5 py-4 font-semibold tracking-wider">Пример данных</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {tvAnalysis.map((tv, idx) => (
                    <tr key={idx} className={`hover:bg-white/50 transition-colors ${
                      tv.count === 0 ? 'opacity-50' : ''
                    }`}>
                      <td className="px-5 py-4">
                        {tv.mapped ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/80 text-emerald-800 text-xs font-medium rounded-lg border border-emerald-200/60 shadow-sm">
                            <CheckCircle2 size={12} /> В работе
                          </span>
                        ) : tv.count > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100/80 text-amber-800 text-xs font-medium rounded-lg border border-amber-200/60 shadow-sm">
                            <AlertTriangle size={12} /> Игнор
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/80 text-slate-600 text-xs font-medium rounded-lg border border-slate-200/60 shadow-sm">
                            <XCircle size={12} /> Пусто
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-800 font-medium">{tv.name}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-slate-200/60 rounded-full h-2 max-w-[100px] shadow-inner overflow-hidden">
                            <div className={`h-2 rounded-full ${tv.mapped ? 'bg-emerald-500' : tv.count > 0 ? 'bg-amber-500' : 'bg-slate-400'}`} style={{ width: `${tv.fillPercentage}%` }}></div>
                          </div>
                          <span className="text-xs font-medium text-slate-500">{tv.fillPercentage}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1.5 text-slate-600 bg-white/60 px-2 py-1 rounded-md border border-white/80 shadow-sm w-fit text-xs font-medium">
                          {guessType(tv.sample).icon} {tv.dominantType}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-mono text-xs text-slate-500 truncate max-w-xs bg-white/50 px-2 py-1 rounded border border-white/60" title={tv.sample ? String(tv.sample) : ''}>
                            {tv.sample ? String(tv.sample).substring(0, 60) + (String(tv.sample).length > 60 ? '...' : '') : '—'}
                          </div>
                          {tv.sample && String(tv.sample).length > 60 && (
                            <button 
                              onClick={() => setSelectedSample({name: tv.name, value: tv.sample, template: 'Маппинг TV'})}
                              className="text-indigo-600 hover:text-indigo-800 flex-shrink-0 bg-indigo-50/50 hover:bg-indigo-100/50 p-1 rounded-md transition-colors"
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
                                className="inline-flex items-center gap-1 px-2 py-1 bg-white/60 hover:bg-white/80 text-slate-500 hover:text-indigo-600 rounded-lg border border-slate-200/60 transition-colors text-[10px] shadow-sm"
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
            <h3 className="text-xl font-medium tracking-tight text-slate-800 mb-4">Анализ шаблонов (Templates)</h3>
            <p className="text-sm text-slate-500 mb-6">
              Зеленые шаблоны мы уже обрабатываем (например, Врачи и Услуги). Желтые — это шаблоны, страницы которых мы пока не выводим в отдельные списки.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templateAnalysis.map((tpl) => (
                <div key={tpl.id} className={`p-5 rounded-2xl border shadow-sm backdrop-blur-md ${
                  tpl.mapped ? 'bg-emerald-50/60 border-emerald-200/60' : 'bg-amber-50/60 border-amber-200/60'
                }`}>
                  <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">Шаблон ID: {tpl.id}</span>
                      {tpl.id !== 0 && (
                        <a 
                          href={`https://cispb.com/manager/?a=element/template/update&id=${tpl.id}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-indigo-600 hover:text-indigo-800 text-[10px] flex items-center gap-1 bg-indigo-50/50 hover:bg-indigo-100/50 px-2 py-1 rounded-lg border border-indigo-200/50 transition-colors font-medium"
                          title="Открыть этот шаблон в админке MODX"
                        >
                          <ExternalLink size={10} /> Админка
                        </a>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm border ${
                      tpl.mapped ? 'bg-emerald-100/80 text-emerald-800 border-emerald-200/60' : 'bg-amber-100/80 text-amber-800 border-amber-200/60'
                    }`}>
                      {tpl.count} стр.
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    {tpl.samplePages.length > 0 ? (
                      <>
                        <p className="font-medium mb-1.5 text-slate-700">Примеры страниц:</p>
                        <ul className="space-y-1.5">
                          {tpl.samplePages.map((page, i) => (
                            <li key={i} className="flex items-center gap-2 truncate">
                              <a 
                                href={`https://cispb.com${(page.uri || '').startsWith('/') ? '' : '/'}${page.uri || ''}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 hover:underline truncate transition-colors"
                                title={page.title}
                              >
                                {page.title}
                              </a>
                              <span className="text-slate-400 text-[10px] bg-white/50 px-1.5 py-0.5 rounded border border-white/60">ID: {page.id}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : tpl.referencedIn.length > 0 ? (
                      <>
                        <p className="font-medium mb-1.5 text-amber-700">Справочник (выводится на):</p>
                        <ul className="space-y-1.5">
                          {tpl.referencedIn.map((page, i) => (
                            <li key={i} className="flex items-center gap-2 truncate">
                              <a 
                                href={`https://cispb.com${(page.uri || '').startsWith('/') ? '' : '/'}${page.uri || ''}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 hover:underline truncate transition-colors"
                                title={page.title}
                              >
                                {page.title}
                              </a>
                              <span className="text-slate-400 text-[10px] bg-white/50 px-1.5 py-0.5 rounded border border-white/60">ID: {page.id}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="text-slate-400 italic">Нет публичных страниц</p>
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
            <div className="bg-indigo-50/60 border border-indigo-200/60 rounded-2xl p-5 mb-6 backdrop-blur-md shadow-sm">
              <p className="text-sm text-indigo-800/90">
                <strong className="font-medium text-indigo-900">Рентген страниц (Обратный аудит):</strong> Выберите тип страницы (шаблон), чтобы увидеть <strong className="font-medium text-indigo-900">все</strong> данные, которые хранятся в базе для этого типа страниц. 
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
                  <div key={idx} className="border border-white/60 rounded-2xl bg-white/40 shadow-sm overflow-hidden backdrop-blur-md">
                    <div className="bg-white/50 px-5 py-4 border-b border-white/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                            {tpl.name}
                          </h3>
                          <span className="text-xs font-medium text-slate-500 bg-white/60 px-2.5 py-1 rounded-full border border-white/80 shadow-sm">ID: {tpl.id}</span>
                          {tpl.id !== 0 && (
                            <a 
                              href={`https://cispb.com/manager/?a=element/template/update&id=${tpl.id}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1 bg-indigo-50/50 hover:bg-indigo-100/50 px-2.5 py-1 rounded-lg border border-indigo-200/50 transition-colors"
                              title="Открыть этот шаблон в админке MODX"
                            >
                              <ExternalLink size={12} /> Админка MODX
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-2 flex items-center gap-1.5">
                          <FileText size={14} /> {tpl.count} страниц(ы). 
                          {tpl.samplePages.length > 0 && (
                            <span className="ml-1 text-slate-400">Например: {tpl.samplePages.map(p => p.title).join(', ')}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2 text-xs font-medium w-full sm:w-auto">
                        <span className="text-emerald-700 bg-emerald-50/80 px-3 py-1.5 rounded-lg border border-emerald-200/60 whitespace-nowrap shadow-sm">{mappedFields.length} в работе</span>
                        {unmappedFields.length > 0 && <span className="text-amber-700 bg-amber-50/80 px-3 py-1.5 rounded-lg border border-amber-200/60 whitespace-nowrap shadow-sm">{unmappedFields.length} теряется</span>}
                      </div>
                    </div>
                    
                    <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Unmapped (Lost) Fields */}
                      <div>
                        <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2 border-b border-amber-100 pb-2">
                          <AlertTriangle size={16} /> Потерянные данные (Игнор)
                        </h4>
                        {unmappedFields.length === 0 ? (
                          <p className="text-sm text-slate-500 italic bg-white/40 p-3 rounded-xl border border-slate-100/60">Все заполненные поля используются!</p>
                        ) : (
                          <div className="space-y-3">
                            {unmappedFields.map((f, i) => {
                              const dataType = getDataType(f.sample);
                              return (
                                <div key={i} className="bg-amber-50/40 border border-amber-200/50 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm font-bold text-amber-900">{f.name}</span>
                                      <span className="text-[10px] text-slate-500 bg-white/60 border border-slate-200/60 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                                        {dataType === 'JSON' && <FileJson size={10} />}
                                        {dataType === 'HTML' && <Code size={10} />}
                                        {dataType}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-medium text-amber-700 bg-amber-100/80 px-2 py-1 rounded-md whitespace-nowrap shadow-sm border border-amber-200/50">Заполнено: {Math.round((f.filledCount / tpl.count) * 100)}%</span>
                                  </div>
                                  
                                  <div className="bg-white/60 border border-amber-100/60 rounded-xl p-3 mb-3 shadow-inner">
                                    <div className="text-xs text-slate-600 font-mono truncate mb-1.5" title={String(f.sample)}>
                                      {String(f.sample)}
                                    </div>
                                    {String(f.sample).length > 60 && (
                                      <button 
                                        onClick={() => setSelectedSample({name: f.name, value: f.sample, template: tpl.name})}
                                        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 text-xs font-medium bg-indigo-50/50 hover:bg-indigo-100/50 border border-indigo-200/50 px-3 py-1.5 rounded-lg transition-colors w-full justify-center sm:w-auto sm:justify-start mt-3"
                                      >
                                        <Eye size={14} /> Посмотреть весь контент
                                      </button>
                                    )}
                                  </div>

                                  {f.samplePages.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {f.samplePages.map((page, j) => (
                                        <a 
                                          key={j} 
                                          href={`https://cispb.com${(page.uri || '').startsWith('/') ? '' : '/'}${page.uri || ''}`} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          className="inline-flex items-center gap-1 px-2 py-1 bg-white/60 hover:bg-amber-100/50 text-amber-700 rounded-md border border-amber-200/50 transition-colors text-[10px] font-medium shadow-sm"
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
                        <h4 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2 border-b border-emerald-200/50 pb-2">
                          <CheckCircle2 size={16} /> Используются в приложении
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {mappedFields.map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50/80 text-emerald-700 border border-emerald-200/60 rounded-lg text-xs font-mono shadow-sm">
                              {f.name}
                            </span>
                          ))}
                        </div>
                        
                        <h4 className="font-semibold text-slate-500 mt-6 mb-3 flex items-center gap-2 border-b border-slate-200/60 pb-2">
                          <XCircle size={16} /> Пустые поля (Мусор)
                        </h4>
                        <div className="flex flex-wrap gap-2 opacity-70">
                          {emptyFields.map((f, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/50 text-slate-500 border border-slate-200/60 rounded-lg text-xs font-mono shadow-sm">
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
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-xl font-medium tracking-tight text-slate-800">Схема экспорта (Data Mapping)</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Настройте, какие данные будут отдаваться по REST API. Выберите шаблоны и поля, задайте им удобные имена (алиасы) и типы данных.
                </p>
              </div>
            </div>

            {loadingSchema ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="space-y-8">
                {xrayData.map((tpl) => {
                  const tplSchema = schema.templates.find(t => t.template_id === tpl.id) || { is_exportable: 1, alias: '' };
                  const isExportable = tplSchema.is_exportable === 1;

                  return (
                    <div key={tpl.id} className={`rounded-2xl overflow-hidden shadow-sm backdrop-blur-md transition-all ${isExportable ? 'border border-indigo-200/60 bg-white/40' : 'border border-slate-200/60 bg-white/20 opacity-70'}`}>
                      {/* Template Header */}
                      <div className={`p-5 flex flex-wrap gap-4 justify-between items-center border-b ${isExportable ? 'bg-indigo-50/50 border-indigo-100/60' : 'bg-slate-50/50 border-slate-100/60'}`}>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={isExportable}
                              onChange={(e) => updateTemplateSchema(tpl.id, { is_exportable: e.target.checked ? 1 : 0, alias: tplSchema.alias })}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 transition-colors"
                            />
                            <span className="font-medium text-slate-800 group-hover:text-indigo-700 transition-colors">Шаблон: {tpl.name || `Шаблон ${tpl.id}`} (ID: {tpl.id})</span>
                          </label>
                          <span className="text-xs font-medium text-slate-500 bg-white/60 px-2 py-1 rounded-md border border-white/80 shadow-sm">{tpl.count} страниц</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-slate-600">API Alias:</span>
                          <input 
                            type="text" 
                            value={tplSchema.alias || ''}
                            onChange={(e) => updateTemplateSchema(tpl.id, { is_exportable: tplSchema.is_exportable, alias: e.target.value })}
                            placeholder={(tpl.name || `template_${tpl.id}`).toLowerCase().replace(/[^a-z0-9]/g, '_')}
                            className="text-sm bg-white/60 border border-slate-200/60 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-1.5 transition-all disabled:opacity-50 disabled:bg-slate-50"
                            disabled={!isExportable}
                          />
                        </div>
                      </div>

                      {/* Template Fields */}
                      {isExportable && (
                        <div className="p-0 overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-white/50 border-b border-slate-200/60">
                              <tr>
                                <th className="px-5 py-4 font-semibold tracking-wider w-10">Экспорт</th>
                                <th className="px-5 py-4 font-semibold tracking-wider">Поле (MODX)</th>
                                <th className="px-5 py-4 font-semibold tracking-wider">API Alias (Новое имя)</th>
                                <th className="px-5 py-4 font-semibold tracking-wider">Тип данных (Cast)</th>
                                <th className="px-5 py-4 font-semibold tracking-wider">Пример данных</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
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
                                    <tr key={fieldName} className={`hover:bg-white/50 transition-colors ${!isFieldExportable ? 'opacity-50 bg-slate-50/30' : ''}`}>
                                      <td className="px-5 py-4">
                                        <input 
                                          type="checkbox" 
                                          checked={isFieldExportable}
                                          onChange={(e) => updateFieldSchema(tpl.id, fieldName, { is_exportable: e.target.checked ? 1 : 0, alias: fieldSchema.alias, cast_type: currentCast })}
                                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer transition-colors"
                                        />
                                      </td>
                                      <td className="px-5 py-4 font-mono text-slate-800 font-medium">
                                        {fieldName}
                                        <div className="text-[10px] text-slate-500 font-sans mt-1">Заполнено: {fieldData.filledCount}</div>
                                      </td>
                                      <td className="px-5 py-4">
                                        <input 
                                          type="text" 
                                          value={fieldSchema.alias || ''}
                                          onChange={(e) => updateFieldSchema(tpl.id, fieldName, { is_exportable: fieldSchema.is_exportable, alias: e.target.value, cast_type: currentCast })}
                                          placeholder={fieldName}
                                          className="text-sm bg-white/60 border border-slate-200/60 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-1.5 w-full max-w-[200px] transition-all disabled:opacity-50 disabled:bg-slate-50"
                                          disabled={!isFieldExportable}
                                        />
                                      </td>
                                      <td className="px-5 py-4">
                                        <select
                                          value={currentCast}
                                          onChange={(e) => updateFieldSchema(tpl.id, fieldName, { is_exportable: fieldSchema.is_exportable, alias: fieldSchema.alias, cast_type: e.target.value })}
                                          className="text-sm bg-white/60 border border-slate-200/60 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-1.5 transition-all disabled:opacity-50 disabled:bg-slate-50"
                                          disabled={!isFieldExportable}
                                        >
                                          <option value="string">String (Строка)</option>
                                          <option value="number">Number (Число)</option>
                                          <option value="boolean">Boolean (Да/Нет)</option>
                                          <option value="json">JSON (Массив/Объект)</option>
                                          <option value="html">HTML (Текст с тегами)</option>
                                        </select>
                                      </td>
                                      <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                          <div className="font-mono text-xs text-slate-500 truncate max-w-[200px] bg-white/50 px-2 py-1 rounded border border-white/60" title={fieldData.sample ? String(fieldData.sample) : ''}>
                                            {fieldData.sample ? String(fieldData.sample).substring(0, 40) + (String(fieldData.sample).length > 40 ? '...' : '') : '—'}
                                          </div>
                                          {fieldData.sample && String(fieldData.sample).length > 40 && (
                                            <button 
                                              onClick={() => setSelectedSample({name: fieldName, value: fieldData.sample, template: tpl.name})}
                                              className="text-indigo-600 hover:text-indigo-800 flex-shrink-0 bg-indigo-50/50 hover:bg-indigo-100/50 p-1 rounded-md transition-colors"
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
            <h3 className="text-xl font-medium tracking-tight text-slate-800 mb-4">Корневые сущности в базе данных</h3>
            <p className="text-sm text-slate-500 mb-6">
              Все таблицы и массивы, которые отдал скрипт выгрузки.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rootEntities.map((entity) => (
                <div key={entity.name} className="flex justify-between items-center p-5 border border-slate-200/60 rounded-2xl bg-white/40 hover:bg-white/60 transition-colors shadow-sm backdrop-blur-md">
                  <span className="font-mono text-sm text-slate-800 font-medium">{entity.name}</span>
                  <span className="bg-indigo-50/80 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-100/60 shadow-sm">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-[0_20px_60px_rgb(0,0,0,0.1)] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/40 flex justify-between items-center bg-white/40">
              <div>
                <h3 className="text-xl font-medium tracking-tight text-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600">
                    <FileText size={20} />
                  </div>
                  Содержимое поля: <span className="font-mono bg-white/60 px-2.5 py-1 rounded-lg border border-white/80 shadow-sm text-sm">{selectedSample.name}</span>
                </h3>
                <p className="text-sm text-slate-500 mt-2 ml-12">Шаблон: {selectedSample.template}</p>
              </div>
              <button 
                onClick={() => setSelectedSample(null)}
                className="p-2 hover:bg-white/80 bg-white/50 border border-white/60 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-0 overflow-hidden flex-1 flex flex-col bg-slate-900">
              <div className="bg-slate-800/80 px-6 py-3 flex justify-between items-center border-b border-slate-700/50 backdrop-blur-md">
                <span className="text-xs text-slate-400 font-mono">
                  Тип данных: {getDataType(selectedSample.value)}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Длина: {String(selectedSample.value).length} симв.
                </span>
              </div>
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <pre className="whitespace-pre-wrap text-sm font-mono text-emerald-400 break-words">
                  {getDataType(selectedSample.value) === 'JSON' 
                    ? JSON.stringify(JSON.parse(String(selectedSample.value)), null, 2) 
                    : String(selectedSample.value)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal for LLM Report */}
      {showLLMReport && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50 animate-in fade-in duration-300">
          <div className="bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-[0_20px_60px_rgb(0,0,0,0.1)] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-white/40 bg-white/40">
              <h3 className="text-xl font-medium tracking-tight flex items-center gap-3 text-slate-800">
                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600">
                  <FileText size={20} />
                </div>
                Отчет для LLM (Схема и примеры данных)
              </h3>
              <button onClick={() => setShowLLMReport(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-white/50 hover:bg-white/80 p-2 rounded-full border border-white/60">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-hidden flex flex-col gap-4">
              <p className="text-sm text-slate-600">
                Скопируйте этот текст и отправьте его в ChatGPT, Claude или другую LLM. Это поможет модели понять структуру вашего сайта, связи между сущностями и спроектировать правильную архитектуру или синхронизацию.
              </p>
              <textarea 
                className="w-full flex-1 p-5 font-mono text-sm border border-white/60 rounded-2xl bg-white/50 shadow-inner focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none resize-none text-slate-700"
                value={llmReportContent}
                readOnly
              />
            </div>
            <div className="p-6 border-t border-white/40 bg-white/40 flex justify-end gap-3">
              <button 
                onClick={() => setShowLLMReport(false)}
                className="px-5 py-2.5 bg-white/60 border border-white/80 shadow-sm rounded-xl text-slate-700 hover:bg-white/90 transition-colors font-medium text-sm"
              >
                Закрыть
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(llmReportContent);
                  alert('Отчет скопирован в буфер обмена!');
                }}
                className="px-5 py-2.5 bg-indigo-600 text-white shadow-md shadow-indigo-500/20 rounded-xl hover:bg-indigo-700 transition-all duration-300 flex items-center gap-2 font-medium text-sm"
              >
                <Code size={16} />
                Скопировать весь текст
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
