import React, { useState, useMemo } from 'react';
import { Search, Link as LinkIcon, FileText, AlertTriangle, CheckCircle2, Image as ImageIcon, ArrowRightLeft, Share2, Download } from 'lucide-react';
import { SeoReportTemplate } from './seo/SeoReportTemplate';
import { SeoReportData } from '../types/seo-report';

interface SeoAnalyticsProps {
  fullGraph: any;
  handleTabChange: (tab: string) => void;
}

export const SeoAnalytics: React.FC<SeoAnalyticsProps> = ({ fullGraph, handleTabChange }) => {
  const [activeSubTab, setActiveSubTab] = useState<'links' | 'meta' | 'images' | 'redirects' | 'tech'>('links');
  const [linksViewMode, setLinksViewMode] = useState<'all' | 'summary'>('all');

  // 1. Извлечение внутренних ссылок (Перелинковка)
  const linksData = useMemo(() => {
    const links: { anchor: string, target: string, sourceId: number, sourceTitle: string, sourceUrl: string, sourceField: string }[] = [];
    const resources = fullGraph?.entities?.resources || [];
    
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi;
    
    const extractLinks = (text: string, res: any, fieldName: string) => {
      if (!text || typeof text !== 'string') return;
      let match;
      while ((match = linkRegex.exec(text)) !== null) {
        const target = match[2];
        const anchor = match[3].replace(/<[^>]*>?/gm, '').trim(); // Убираем вложенные теги из анкора
        
        // Фильтруем только внутренние ссылки (начинаются с / или относительные, или содержат домен)
        if (target.startsWith('/') || target.includes('cispb.com') || !target.startsWith('http')) {
          links.push({
            anchor: anchor || '[Без текста]',
            target: target,
            sourceId: res.id,
            sourceTitle: res.pagetitle,
            sourceUrl: res.uri || res.alias || String(res.id),
            sourceField: fieldName
          });
        }
      }
    };

    resources.forEach((res: any) => {
      extractLinks(res.content, res, 'content');
      extractLinks(res.introtext, res, 'introtext');
      extractLinks(res.description, res, 'description');
      
      if (res.tvs) {
        Object.entries(res.tvs).forEach(([key, value]) => {
          if (typeof value === 'string') {
            extractLinks(value, res, `TV: ${key}`);
          }
        });
      }
    });
    
    return links;
  }, [fullGraph]);

  const anchorSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    linksData.forEach(link => {
      const anchor = link.anchor.toLowerCase();
      summary[anchor] = (summary[anchor] || 0) + 1;
    });
    return Object.entries(summary)
      .map(([anchor, count]) => ({ anchor, count }))
      .sort((a, b) => b.count - a.count);
  }, [linksData]);

  // 2. Анализ мета-тегов
  const metaData = useMemo(() => {
    const resources = fullGraph?.entities?.resources || [];
    return resources.map((res: any) => {
      // Ищем Title в разных возможных полях MODX
      const seoTitle = 
        res.seo?.title || 
        res.tvs?.seo_title || 
        res.tvs?.meta_title || 
        res.tvs?.title || 
        res.longtitle || 
        res.pagetitle;

      // Ищем Description в разных возможных полях MODX
      const seoDesc = 
        res.seo?.description || 
        res.tvs?.seo_description || 
        res.tvs?.seo_desc || 
        res.tvs?.meta_description || 
        res.tvs?.meta_desc || 
        res.tvs?.description || 
        res.tvs?.des || 
        res.description || 
        res.introtext || 
        '';

      // Ищем Keywords в разных возможных полях MODX
      const seoKeywords = 
        res.seo?.keywords || 
        res.tvs?.seo_keywords || 
        res.tvs?.meta_keywords || 
        res.tvs?.keywords || 
        res.tvs?.keyw || 
        res.tvs?.key || 
        '';

      const h1 = res.longtitle || res.pagetitle;
      
      return {
        id: res.id,
        url: res.uri || res.alias || String(res.id),
        pagetitle: res.pagetitle,
        h1: h1,
        seoTitle: seoTitle,
        seoDesc: seoDesc,
        seoKeywords: seoKeywords,
        hasTitle: !!seoTitle,
        hasDesc: !!seoDesc,
        hasKeywords: !!seoKeywords,
        descLength: seoDesc.length
      };
    });
  }, [fullGraph]);

  // 3. Анализ изображений (Alt-тексты)
  const imagesData = useMemo(() => {
    const images: { url: string, alt: string, sourceId: number, sourceTitle: string, sourceField: string }[] = [];
    const resources = fullGraph?.entities?.resources || [];
    
    const imgRegex = /<img\s+([^>]*?)>/gi;
    const srcRegex = /src=(["'])(.*?)\1/i;
    const altRegex = /alt=(["'])(.*?)\1/i;
    
    const extractImages = (text: string, res: any, fieldName: string) => {
      if (!text || typeof text !== 'string') return;
      let match;
      while ((match = imgRegex.exec(text)) !== null) {
        const imgTag = match[1];
        const srcMatch = srcRegex.exec(imgTag);
        const altMatch = altRegex.exec(imgTag);
        
        if (srcMatch) {
          images.push({
            url: srcMatch[2],
            alt: altMatch ? altMatch[2] : '',
            sourceId: res.id,
            sourceTitle: res.pagetitle,
            sourceField: fieldName
          });
        }
      }
    };

    resources.forEach((res: any) => {
      extractImages(res.content, res, 'content');
      extractImages(res.introtext, res, 'introtext');
      extractImages(res.description, res, 'description');
      
      if (res.tvs) {
        Object.entries(res.tvs).forEach(([key, value]) => {
          if (typeof value === 'string') {
            extractImages(value, res, `TV: ${key}`);
          }
        });
      }
    });
    
    return images;
  }, [fullGraph]);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = 'SEO-Analytics-Report';
    window.print();
    document.title = originalTitle;
  };

  const reportData: SeoReportData = useMemo(() => {
    const totalPages = metaData.length;
    const missingTitle = metaData.filter(m => !m.hasTitle).length;
    const missingDesc = metaData.filter(m => !m.hasDesc).length;
    const missingAlt = imagesData.filter(i => !i.alt).length;
    const totalRedirects = fullGraph?.entities?.redirects?.length || 0;

    return {
      title: 'SEO Аналитика сайта',
      date: new Date().toLocaleDateString('ru-RU'),
      summary: {
        title: 'Сводка',
        metrics: [
          { label: 'Всего страниц', value: totalPages, status: 'neutral' },
          { label: 'Без Title', value: missingTitle, status: missingTitle > 0 ? 'error' : 'success' },
          { label: 'Без Description', value: missingDesc, status: missingDesc > 0 ? 'warning' : 'success' },
          { label: 'Изображений без Alt', value: missingAlt, status: missingAlt > 0 ? 'warning' : 'success' },
          { label: 'Внутренних ссылок', value: linksData.length, status: 'neutral' },
          { label: 'Редиректов', value: totalRedirects, status: 'neutral' }
        ]
      },
      sections: [
        {
          id: 'meta',
          title: 'Мета-теги (Title, Description)',
          description: 'Анализ заполненности мета-тегов на страницах сайта.',
          metrics: [
            { label: 'Страниц с Title', value: totalPages - missingTitle, status: 'success' },
            { label: 'Страниц с Description', value: totalPages - missingDesc, status: 'success' }
          ],
          table: {
            columns: [
              { key: 'url', label: 'URL' },
              { key: 'title', label: 'Title' },
              { key: 'desc', label: 'Description' },
              { key: 'h1', label: 'H1' }
            ],
            rows: metaData.map(m => ({
              url: m.url,
              title: m.hasTitle ? m.seoTitle : 'ОТСУТСТВУЕТ',
              desc: m.hasDesc ? m.seoDesc : 'ОТСУТСТВУЕТ',
              h1: m.h1 || 'ОТСУТСТВУЕТ'
            }))
          }
        },
        {
          id: 'images',
          title: 'Атрибуты Alt изображений',
          description: 'Анализ изображений на наличие атрибута alt.',
          table: {
            columns: [
              { key: 'url', label: 'URL изображения' },
              { key: 'alt', label: 'Alt-текст' },
              { key: 'source', label: 'Где найдено' }
            ],
            rows: imagesData.map(img => ({
              url: img.url,
              alt: img.alt || 'ОТСУТСТВУЕТ',
              source: `${img.sourceTitle} (${img.sourceField})`
            }))
          }
        },
        {
          id: 'links',
          title: 'Внутренняя перелинковка',
          description: 'Анализ внутренних ссылок в контенте.',
          table: {
            columns: [
              { key: 'anchor', label: 'Анкор' },
              { key: 'target', label: 'Куда ведет' },
              { key: 'source', label: 'Где находится' }
            ],
            rows: linksData.map(link => ({
              anchor: link.anchor,
              target: link.target,
              source: link.sourceTitle
            }))
          }
        },
        {
          id: 'redirects',
          title: 'Редиректы (301)',
          description: 'Список настроенных перенаправлений.',
          table: {
            columns: [
              { key: 'old', label: 'Старый URL' },
              { key: 'new', label: 'Новый URL' }
            ],
            rows: (fullGraph?.entities?.redirects || []).map((red: any) => ({
              old: red.old_url,
              new: red.new_slug
            }))
          }
        }
      ]
    };
  }, [metaData, imagesData, linksData, fullGraph]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Search className="text-indigo-600" />
          SEO Аналитика
        </h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => handlePrint()} 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Download size={16} />
            Скачать PDF-отчет
          </button>
          <button onClick={() => handleTabChange("overview")} className="text-sm font-medium hover:underline cursor-pointer">
            ← На главную
          </button>
        </div>
      </div>

      {/* Hidden Printable Report */}
      <div id="print-section" className="hidden print:block">
        <SeoReportTemplate data={reportData} />
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar bg-white rounded-t-lg">
        <button
          onClick={() => setActiveSubTab('links')}
          className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'links' ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <LinkIcon size={16} /> Перелинковка ({linksData.length})
        </button>
        <button
          onClick={() => setActiveSubTab('meta')}
          className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'meta' ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText size={16} /> Мета-теги ({metaData.length})
        </button>
        <button
          onClick={() => setActiveSubTab('images')}
          className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'images' ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ImageIcon size={16} /> Изображения (Alt) ({imagesData.length})
        </button>
        <button
          onClick={() => setActiveSubTab('redirects')}
          className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'redirects' ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ArrowRightLeft size={16} /> Редиректы ({fullGraph?.entities?.redirects?.length || 0})
        </button>
        <button
          onClick={() => setActiveSubTab('tech')}
          className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'tech' ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle size={16} /> Чек-лист миграции
        </button>
      </div>

      {/* Content */}
      <div className="bg-white/60 border border-slate-200/60 backdrop-blur-md shadow-sm rounded-b-lg rounded-tr-lg p-6 shadow-sm">
        
        {activeSubTab === 'links' && (
          <div className="space-y-4">
            <div className="bg-indigo-50/60 p-4 rounded-xl text-sm text-indigo-800/90 border border-indigo-100/60 backdrop-blur-md shadow-sm mb-6">
              <p><strong>Перелинковка</strong> — это система внутренних ссылок на сайте. Она помогает распределять SEO-вес между страницами и улучшает навигацию для пользователей. Здесь собраны все ссылки, найденные в контенте страниц.</p>
            </div>
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setLinksViewMode('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  linksViewMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100/60 backdrop-blur-md text-slate-700 hover:bg-slate-200'
                }`}
              >
                Все ссылки
              </button>
              <button
                onClick={() => setLinksViewMode('summary')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  linksViewMode === 'summary' ? 'bg-indigo-600 text-white' : 'bg-slate-100/60 backdrop-blur-md text-slate-700 hover:bg-slate-200'
                }`}
              >
                Сводка по анкорам
              </button>
            </div>

            {linksViewMode === 'all' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <th className="p-3 font-medium">Анкор (Текст ссылки)</th>
                      <th className="p-3 font-medium">Куда ведет (Target)</th>
                      <th className="p-3 font-medium">Где находится (Source)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {linksData.map((link, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-indigo-900">"{link.anchor}"</td>
                        <td className="p-3 text-slate-600 break-all">{link.target}</td>
                        <td className="p-3 text-slate-500">
                          <div className="truncate max-w-[200px]" title={link.sourceTitle}>{link.sourceTitle}</div>
                          <div className="text-xs text-slate-400">ID: {link.sourceId} ({link.sourceField})</div>
                        </td>
                      </tr>
                    ))}
                    {linksData.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-500">Внутренние ссылки не найдены в контенте.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <th className="p-3 font-medium">Анкор (Слово/фраза)</th>
                      <th className="p-3 font-medium">Количество использований</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {anchorSummary.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-indigo-900">"{item.anchor}"</td>
                        <td className="p-3 text-slate-600">
                          <span className="inline-flex items-center justify-center bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                            {item.count}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {anchorSummary.length === 0 && (
                      <tr>
                        <td colSpan={2} className="p-8 text-center text-slate-500">Внутренние ссылки не найдены в контенте.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'meta' && (
          <div className="space-y-4">
            <div className="bg-indigo-50/60 p-4 rounded-xl text-sm text-indigo-800/90 border border-indigo-100/60 backdrop-blur-md shadow-sm mb-6">
              <p><strong>Мета-теги</strong> (Title, Description) и заголовки H1 критически важны для поисковых систем. Здесь показан срез по всем страницам для выявления пустых или проблемных тегов.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="p-3 font-medium">Страница</th>
                    <th className="p-3 font-medium">Title (SEO)</th>
                    <th className="p-3 font-medium">Description (SEO)</th>
                    <th className="p-3 font-medium">Keywords</th>
                    <th className="p-3 font-medium">H1 (Заголовок)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {metaData.map((meta, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-medium text-slate-900 truncate max-w-[200px]" title={meta.pagetitle}>{meta.pagetitle}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[200px]" title={meta.url}>{meta.url}</div>
                      </td>
                      <td className="p-3">
                        {meta.hasTitle ? (
                          <span className="text-slate-800 line-clamp-2" title={meta.seoTitle}>{meta.seoTitle}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><AlertTriangle size={14} /> Нет Title</span>
                        )}
                      </td>
                      <td className="p-3">
                        {meta.hasDesc ? (
                          <div>
                            <span className="text-slate-800 line-clamp-2" title={meta.seoDesc}>{meta.seoDesc}</span>
                            <span className={`text-xs mt-1 block ${meta.descLength < 50 || meta.descLength > 160 ? 'text-orange-500' : 'text-emerald-600'}`}>
                              {meta.descLength} симв.
                            </span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><AlertTriangle size={14} /> Нет Description</span>
                        )}
                      </td>
                      <td className="p-3">
                        {meta.hasKeywords ? (
                          <span className="text-slate-800 line-clamp-2" title={meta.seoKeywords}>{meta.seoKeywords}</span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Нет Keywords</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">
                        <span className="line-clamp-2" title={meta.h1}>{meta.h1}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'images' && (
          <div className="space-y-4">
            <div className="bg-indigo-50/60 p-4 rounded-xl text-sm text-indigo-800/90 border border-indigo-100/60 backdrop-blur-md shadow-sm mb-6">
              <p><strong>Атрибут Alt</strong> у изображений помогает поисковикам понять, что изображено на картинке. Это важно для поиска по картинкам и доступности.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="p-3 font-medium">Изображение (URL)</th>
                    <th className="p-3 font-medium">Alt-текст</th>
                    <th className="p-3 font-medium">Где используется</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {imagesData.map((img, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-600 break-all max-w-[300px]">{img.url}</td>
                      <td className="p-3">
                        {img.alt ? (
                          <span className="text-emerald-700 font-medium flex items-center gap-1"><CheckCircle2 size={14} /> {img.alt}</span>
                        ) : (
                          <span className="text-red-500 font-medium flex items-center gap-1"><AlertTriangle size={14} /> Пусто</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500">
                        <div className="truncate max-w-[200px]" title={img.sourceTitle}>{img.sourceTitle}</div>
                        <div className="text-xs text-slate-400">ID: {img.sourceId} ({img.sourceField})</div>
                      </td>
                    </tr>
                  ))}
                  {imagesData.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500">Изображения в контенте не найдены.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'redirects' && (
          <div className="space-y-4">
            <div className="bg-indigo-50/60 p-4 rounded-xl text-sm text-indigo-800/90 border border-indigo-100/60 backdrop-blur-md shadow-sm mb-6">
              <p><strong>301 Редиректы</strong> необходимы для сохранения SEO-веса при изменении URL-адресов страниц. Здесь показаны все настроенные перенаправления.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="p-3 font-medium">Старый URL (Откуда)</th>
                    <th className="p-3 font-medium">Новый URL (Куда)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {fullGraph?.entities?.redirects?.map((red: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 text-red-600 break-all">{red.old_url}</td>
                      <td className="p-3 text-emerald-600 font-medium break-all">{red.new_slug}</td>
                    </tr>
                  ))}
                  {(!fullGraph?.entities?.redirects || fullGraph.entities.redirects.length === 0) && (
                    <tr>
                      <td colSpan={2} className="p-8 text-center text-slate-500">Редиректы не настроены.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'tech' && (
          <div className="space-y-6">
            <div className="bg-indigo-50/60 p-4 rounded-xl text-sm text-indigo-800/90 border border-indigo-100/60 backdrop-blur-md shadow-sm">
              <p><strong>Техническое SEO и Чек-лист миграции</strong>. Помимо контента и мета-тегов, SEO-специалисты работают с серверными файлами и микроразметкой. Эти элементы обычно не хранятся в базе данных контента, поэтому при переносе сайта их нужно перенести вручную.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-lg p-5">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><FileText className="text-slate-500" size={20}/> Файл robots.txt</h3>
                <p className="text-sm text-slate-600 mb-3">Указывает поисковым роботам, какие страницы можно индексировать, а какие нет. Защищает технические страницы от попадания в поиск.</p>
                <div className="bg-slate-50 p-3 rounded text-xs font-mono text-slate-700">
                  Что делать: Скопировать файл robots.txt из корня старого сайта в корень нового. Убедиться, что директива Host (если есть) указывает на правильный домен.
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-5">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Share2 className="text-slate-500" size={20}/> Sitemap.xml (Карта сайта)</h3>
                <p className="text-sm text-slate-600 mb-3">XML-файл со списком всех важных страниц сайта. Помогает поисковикам быстрее находить и индексировать новые страницы.</p>
                <div className="bg-slate-50 p-3 rounded text-xs font-mono text-slate-700">
                  Что делать: Настроить автоматическую генерацию sitemap.xml на новом сайте, чтобы она включала все актуальные URL (врачи, услуги, статьи).
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-5">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><LinkIcon className="text-slate-500" size={20}/> Canonical URL</h3>
                <p className="text-sm text-slate-600 mb-3">Тег <code>&lt;link rel="canonical"&gt;</code> указывает основную версию страницы, если контент дублируется по разным адресам.</p>
                <div className="bg-slate-50 p-3 rounded text-xs font-mono text-slate-700">
                  Что делать: Убедиться, что CMS нового сайта корректно генерирует канонические ссылки для каждой страницы, чтобы избежать санкций за дубли.
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-5">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Search className="text-slate-500" size={20}/> Микроразметка (Schema.org)</h3>
                <p className="text-sm text-slate-600 mb-3">Специальный код (обычно JSON-LD), который помогает поисковикам красиво выводить сайт в поиске (звездочки рейтинга, цены, контакты).</p>
                <div className="bg-slate-50 p-3 rounded text-xs font-mono text-slate-700">
                  Что делать: Проверить старый сайт через валидатор микроразметки. Перенести разметку для Организации (контакты), Врачей (Person), Услуг (Product/Service) и Хлебных крошек (BreadcrumbList).
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
