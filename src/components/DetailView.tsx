import React from "react";

interface DetailViewProps {
  currentDetail: { type: string; data: any };
  setViewMode: (mode: "list" | "detail") => void;
  setCurrentDetail: (detail: any) => void;
  setSelectedItem: (item: any) => void;
  fullGraph?: any;
  schemaAnalysis?: any[];
}

export const DetailView: React.FC<DetailViewProps> = ({
  currentDetail,
  setViewMode,
  setCurrentDetail,
  setSelectedItem,
  fullGraph,
  schemaAnalysis = [],
}) => {
  const [displayMode, setDisplayMode] = React.useState<"human" | "tech">("human");

  // Create a dynamic mapping from schemaAnalysis
  const tvNameMapping: Record<string, string> = React.useMemo(() => {
    const mapping: Record<string, string> = {
      'dropdown-text-before': 'Текст до выпадающего списка',
      'dropdown-text-after': 'Текст после выпадающего списка',
      'first_block_title': 'Заголовок 1-го блока',
      'first_block_text': 'Текст 1-го блока',
      'second_block_title': 'Заголовок 2-го блока',
      'second_block_text': 'Текст 2-го блока',
      'third_block_title': 'Заголовок 3-го блока',
      'third_block_text': 'Текст 3-го блока',
      'uslugPre': 'Преимущества услуги (MIGX)',
      'action_form': 'Форма акции (MIGX)',
      'json_data': 'Данные JSON (Прайс-лист)',
      'button_txt': 'Текст кнопки',
      'categoryIs': 'Категория',
      'addnapravleniya': 'Дополнительные направления',
      'equipment_list': 'Оборудование (MIGX)',
      'faq_services': 'Частые вопросы (MIGX)',
      'indications': 'Показания',
      'contraindications': 'Противопоказания',
      'preparation': 'Подготовка',
      'advantages': 'Преимущества',
      'img': 'Изображение',
      'title': 'Заголовок (SEO)',
      'des': 'Описание (SEO)',
      'video': 'Видео',
      'gallery': 'Галерея'
    };

    schemaAnalysis.forEach(tv => {
      if (tv.caption) {
        mapping[tv.name] = tv.caption;
      }
    });

    return mapping;
  }, [schemaAnalysis]);

  const renderHumanReadableTV = (key: string, value: string) => {
    let parsed = null;
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      // Not JSON
    }

    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && (parsed[0].image || parsed[0].text || parsed[0].img)) {
         return (
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {parsed.map((item: any, idx: number) => (
               <div key={idx} className="bg-white/60 border border-slate-200/60 backdrop-blur-md shadow-sm p-3 rounded flex gap-3 items-start">
                 {(item.image || item.img) && (
                   <img src={((item.image || item.img).startsWith('http') ? (item.image || item.img) : `https://cispb.com/${(item.image || item.img).replace(/^\//, '')}`)} alt="" className="w-12 h-12 object-contain" />
                 )}
                 <div>
                   {(item.name || item.title) && <div className="font-bold text-sm">{item.name || item.title}</div>}
                   {(item.text || item.description) && <div className="text-xs text-slate-600">{item.text || item.description}</div>}
                 </div>
               </div>
             ))}
           </div>
         )
      }
      if (parsed.length > 0 && parsed[0].name) {
        return (
          <ul className="list-disc pl-5 space-y-1">
            {parsed.map((item: any, idx: number) => (
              <li key={idx} className="text-sm text-slate-700">
                {item.name} {item.price ? `- ${item.price} ₽` : ''}
              </li>
            ))}
          </ul>
        );
      }
      
      return (
        <pre className="text-xs bg-slate-100/60 backdrop-blur-md p-2 rounded overflow-auto">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    }

    return (
      <div
        className="prose prose-sm max-w-none text-slate-700"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  };

  const renderEquipmentList = () => {
    let eqList = currentDetail.data.tvs?.equipment_list;
    if (typeof eqList === 'string') {
      try {
        eqList = JSON.parse(eqList);
      } catch (e) {
        eqList = [];
      }
    }
    if (Array.isArray(eqList) && eqList.length > 0) {
      return (
        <div className="mb-8">
          <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Оборудование (equipment_list)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {eqList.map((eq: any, i: number) => (
              <div
                key={i}
                className="bg-white/60 border border-slate-200/60 backdrop-blur-md shadow-sm p-4 rounded-lg flex gap-4 items-start"
              >
                {eq.image && (
                  <img
                    src={eq.image.startsWith('http') ? eq.image : `https://cispb.com/${eq.image.replace(/^\//, '')}`}
                    alt={eq.title || eq.name || ''}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div>
                  <h5 className="font-bold text-sm">{eq.title || eq.name}</h5>
                  {(eq.description || eq.text) && (
                    <p className="text-xs text-slate-600 mt-1">
                      {eq.description || eq.text}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderFaqServices = () => {
    let faqList = currentDetail.data.tvs?.faq_services;
    if (typeof faqList === 'string') {
      try {
        faqList = JSON.parse(faqList);
      } catch (e) {
        faqList = [];
      }
    }
    if (Array.isArray(faqList) && faqList.length > 0) {
      return (
        <div className="mb-8">
          <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Частые вопросы (faq_services)
          </h4>
          <div className="space-y-3">
            {faqList.map((faq: any, i: number) => (
              <div
                key={i}
                className="bg-white/60 border border-slate-200/60 backdrop-blur-md shadow-sm p-4 rounded-lg"
              >
                <h5 className="font-bold text-sm mb-2">{faq.question}</h5>
                <div
                  className="prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{ __html: faq.reply || faq.answer || '' }}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderAdvantages = () => {
    let advList = currentDetail.data.tvs?.advantages;
    if (typeof advList === 'string') {
      try {
        advList = JSON.parse(advList);
      } catch (e) {
        advList = [];
      }
    }
    if (Array.isArray(advList) && advList.length > 0) {
      return (
        <div className="mb-8">
          <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Преимущества (advantages)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {advList.map((adv: any, i: number) => (
              <div
                key={i}
                className="bg-white/60 border border-slate-200/60 backdrop-blur-md shadow-sm p-4 rounded-lg flex flex-col items-center text-center gap-3"
              >
                {adv.image && (
                  <img
                    src={adv.image.startsWith('http') ? adv.image : `https://cispb.com/${adv.image.replace(/^\//, '')}`}
                    alt={adv.title || adv.name || ''}
                    className="w-16 h-16 object-contain"
                  />
                )}
                <h5 className="font-bold text-sm">{adv.title || adv.name}</h5>
                {(adv.description || adv.text) && (
                  <p className="text-xs text-slate-600">
                    {adv.description || adv.text}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    } else if (typeof currentDetail.data.tvs?.advantages === 'string' && currentDetail.data.tvs.advantages.trim() !== "") {
      return (
        <div className="mb-8">
          <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Преимущества (advantages)
          </h4>
          <div
            className="prose prose-sm max-w-none bg-white p-4 rounded-lg border border-slate-200"
            dangerouslySetInnerHTML={{
              __html: currentDetail.data.tvs.advantages,
            }}
          />
        </div>
      );
    }
    return null;
  };

  const renderInternalLinks = () => {
    const links: { url: string; text: string; source: string }[] = [];
    const linkRegex = /<a[^>]+href=\\?["']([^"'\\]+)\\?["'][^>]*>(.*?)<\/a>/gi;

    const searchInText = (text: string, sourceName: string) => {
      if (!text || typeof text !== 'string') return;
      let match;
      while ((match = linkRegex.exec(text)) !== null) {
        const url = match[1];
        const linkText = match[2].replace(/<[^>]+>/g, '').trim(); // strip inner tags
        // Only consider internal links (relative or starting with cispb.com)
        if (url.startsWith('/') || url.includes('cispb.com')) {
          links.push({ url, text: linkText, source: sourceName });
        }
      }
    };

    searchInText(currentDetail.data.content, 'Основной контент (content)');
    searchInText(currentDetail.data.introtext, 'Вводный текст (introtext)');
    searchInText(currentDetail.data.description, 'Описание (description)');

    if (currentDetail.data.tvs) {
      Object.entries(currentDetail.data.tvs).forEach(([key, value]) => {
        if (typeof value === 'string') {
          searchInText(value, `TV: ${key}`);
        }
      });
    }

    if (links.length === 0) return null;

    return (
      <div className="mt-8 pt-8 border-t border-slate-200">
        <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          SEO Перелинковка (Внутренние ссылки)
        </h4>
        <div className="bg-indigo-50/60 border border-indigo-100/60 backdrop-blur-md shadow-sm rounded-lg p-4">
          <p className="text-xs text-indigo-800 mb-3">
            Найдены следующие внутренние ссылки в контенте этой страницы. Это важно для сохранения SEO-веса при миграции.
          </p>
          <ul className="space-y-2">
            {links.map((link, idx) => (
              <li key={idx} className="text-sm flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 border-b border-indigo-100/50 pb-2 last:border-0 last:pb-0">
                <span className="font-medium text-indigo-900 min-w-[150px]">"{link.text}"</span>
                <a href={link.url.startsWith('http') ? link.url : `https://cispb.com${link.url.startsWith('/') ? '' : '/'}${link.url}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline break-all">
                  {link.url}
                </a>
                <span className="text-xs text-indigo-400 sm:ml-auto whitespace-nowrap">из: {link.source}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const getConnections = () => {
    const incoming: any[] = [];
    const outgoing: any[] = [];

    if (!fullGraph || !fullGraph.entities || !fullGraph.entities.resources) return { incoming, outgoing };
    
    const currentId = currentDetail.data.id;
    if (!currentId) return { incoming, outgoing };

    const resources = fullGraph.entities.resources;

    // Find outgoing connections (current entity references others)
    if (currentDetail.data.tvs) {
      Object.entries(currentDetail.data.tvs).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          const strVal = String(value);
          const ids = strVal.split('||').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
          
          ids.forEach(id => {
            const linkedRes = resources.find((r: any) => r.id === id);
            if (linkedRes) {
              outgoing.push({ res: linkedRes, field: key });
            }
          });
        }
      });
    }

    // Find incoming connections (other entities reference current)
    resources.forEach((res: any) => {
      if (res.id === currentId) return;
      if (res.tvs) {
        Object.entries(res.tvs).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            const strVal = String(value);
            const ids = strVal.split('||').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            if (ids.includes(currentId)) {
              incoming.push({ res, field: key });
            }
          }
        });
      }
    });

    return { incoming, outgoing };
  };

  const renderConnections = () => {
    const { incoming, outgoing } = getConnections();

    if (incoming.length === 0 && outgoing.length === 0) return null;

    return (
      <div className="mt-8 pt-8 border-t border-slate-200">
        <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-share-2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Граф связей (Отношения сущности)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Outgoing */}
          {outgoing.length > 0 && (
            <div className="bg-white/60 border border-slate-200/60 backdrop-blur-md shadow-sm rounded-xl p-5">
              <h5 className="font-bold text-sm text-slate-800 mb-3">Связанные объекты (Исходящие)</h5>
              <p className="text-xs text-slate-500 mb-4">Эта страница ссылается на следующие объекты через дополнительные поля (TV):</p>
              <ul className="space-y-3">
                {outgoing.map((conn, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-slate-50/60 rounded-lg border border-slate-100/60">
                    <div className="flex-1">
                      <div 
                        className="font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer text-sm mb-1"
                        onClick={() => setCurrentDetail({ type: 'Страница', data: conn.res })}
                      >
                        {conn.res.pagetitle}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">ID: {conn.res.id}</span>
                        <span>Поле: <strong>{conn.field}</strong></span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Incoming */}
          {incoming.length > 0 && (
            <div className="bg-white/60 border border-slate-200/60 backdrop-blur-md shadow-sm rounded-xl p-5">
              <h5 className="font-bold text-sm text-slate-800 mb-3">Где используется (Входящие)</h5>
              <p className="text-xs text-slate-500 mb-4">Следующие страницы ссылаются на этот объект через свои дополнительные поля (TV):</p>
              <ul className="space-y-3">
                {incoming.map((conn, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-slate-50/60 rounded-lg border border-slate-100/60">
                    <div className="flex-1">
                      <div 
                        className="font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer text-sm mb-1"
                        onClick={() => setCurrentDetail({ type: 'Страница', data: conn.res })}
                      >
                        {conn.res.pagetitle}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">ID: {conn.res.id}</span>
                        <span>Поле: <strong>{conn.field}</strong></span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleShowJson = () => {
    const { incoming, outgoing } = getConnections();
    const dataWithConnections = {
      ...currentDetail.data,
      _connections: {
        incoming: incoming.map(c => ({ id: c.res.id, title: c.res.pagetitle, field: c.field })),
        outgoing: outgoing.map(c => ({ id: c.res.id, title: c.res.pagetitle, field: c.field }))
      }
    };
    setSelectedItem({
      type: currentDetail.type,
      data: dataWithConnections,
    });
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => {
          setViewMode("list");
          setCurrentDetail(null);
        }}
        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#141414] transition-colors"
      >
        ← Назад к списку
      </button>

      <div className="bg-white/60 border border-slate-200/60 backdrop-blur-md shadow-sm rounded-xl p-6 md:p-10 relative shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold">
            {currentDetail.data.pagetitle ||
              currentDetail.data.name ||
              currentDetail.data.title ||
              currentDetail.data.old_url ||
              "Без названия"}
          </h2>
          <div className="flex bg-slate-100/60 backdrop-blur-md rounded-lg p-1 shrink-0">
            <button
              onClick={() => setDisplayMode("human")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                displayMode === "human"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Для человека
            </button>
            <button
              onClick={() => setDisplayMode("tech")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                displayMode === "tech"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Технический
            </button>
            <button
              onClick={handleShowJson}
              className="ml-2 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
            >
              JSON
            </button>
          </div>
        </div>

        {displayMode === "tech" ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold border-b pb-2 mb-4">Основные поля</h3>
            {Object.entries(currentDetail.data)
              .filter(([k]) => k !== 'tvs' && k !== 'category' && k !== 'price_items' && k !== 'doctors' && k !== 'locations')
              .map(([key, value]) => (
              <div key={key} className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/60 backdrop-blur-md shadow-sm">
                <h4 className="font-bold text-sm mb-2 text-slate-900">{key}</h4>
                <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words font-mono">
                  {value !== null && value !== undefined ? (typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)) : 'null'}
                </pre>
              </div>
            ))}
            
            {currentDetail.data.tvs && Object.keys(currentDetail.data.tvs).length > 0 && (
              <>
                <h3 className="text-lg font-bold border-b pb-2 mt-8 mb-4">Дополнительные поля (TVs)</h3>
                {Object.entries(currentDetail.data.tvs).map(([key, value]) => (
                  <div key={`tv-${key}`} className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/60 backdrop-blur-md shadow-sm">
                    <h4 className="font-bold text-sm mb-2 text-slate-900">
                      {key} 
                      {tvNameMapping[key] && <span className="text-slate-500 font-normal ml-2">— {tvNameMapping[key]}</span>}
                    </h4>
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words font-mono">
                      {value !== null && value !== undefined ? String(value) : 'null'}
                    </pre>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Левая колонка с фото, если есть */}
          {(currentDetail.data.photo ||
            currentDetail.data.mainImage ||
            currentDetail.data.image) && (
            <div className="md:col-span-1">
              <div className="bg-slate-100/60 backdrop-blur-md rounded-lg overflow-hidden aspect-[3/4]">
                <img
                  src={
                    String(
                      currentDetail.data.photo ||
                        currentDetail.data.mainImage ||
                        currentDetail.data.image,
                    ).startsWith("http")
                      ? String(
                          currentDetail.data.photo ||
                            currentDetail.data.mainImage ||
                            currentDetail.data.image,
                        )
                      : `https://cispb.com${String(currentDetail.data.photo || currentDetail.data.mainImage || currentDetail.data.image).startsWith("/") ? "" : "/"}${currentDetail.data.photo || currentDetail.data.mainImage || currentDetail.data.image}`
                  }
                  alt="Фото"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </div>
          )}

          {/* Правая колонка с данными */}
          <div
            className={`space-y-6 ${currentDetail.data.photo || currentDetail.data.mainImage || currentDetail.data.image ? "md:col-span-2" : "md:col-span-3"}`}
          >
            {currentDetail.type === "Врач" && (
              <>
                {currentDetail.data.specialization && (
                  <div>
                    <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Специализация
                    </h4>
                    <p className="text-lg">
                      {currentDetail.data.specialization}
                    </p>
                  </div>
                )}
                {currentDetail.data.experience && (
                  <div>
                    <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Опыт
                    </h4>
                    <p className="text-lg">{currentDetail.data.experience}</p>
                  </div>
                )}
                {currentDetail.data.education && (
                  <div>
                    <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Образование
                    </h4>
                    <p className="text-base">{currentDetail.data.education}</p>
                  </div>
                )}
              </>
            )}

            {currentDetail.type === "Услуга" && (
              <>
                {currentDetail.data.content &&
                  currentDetail.data.content.trim() !== "" && (
                    <div className="mb-8">
                      <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                        Основной контент (content)
                      </h4>
                      <div
                        className="prose prose-sm max-w-none bg-slate-50 p-4 rounded-lg border border-slate-100"
                        dangerouslySetInnerHTML={{
                          __html: currentDetail.data.content,
                        }}
                      />
                    </div>
                  )}

                {renderEquipmentList()}
                {renderFaqServices()}

                {currentDetail.data.tvs?.indications &&
                  currentDetail.data.tvs.indications.trim() !== "" && (
                    <div className="mb-8">
                      <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                        Показания (indications)
                      </h4>
                      <div
                        className="prose prose-sm max-w-none bg-white p-4 rounded-lg border border-slate-200"
                        dangerouslySetInnerHTML={{
                          __html: currentDetail.data.tvs.indications,
                        }}
                      />
                    </div>
                  )}

                {currentDetail.data.tvs?.contraindications &&
                  currentDetail.data.tvs.contraindications.trim() !== "" && (
                    <div className="mb-8">
                      <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                        Противопоказания (contraindications)
                      </h4>
                      <div
                        className="prose prose-sm max-w-none bg-white p-4 rounded-lg border border-slate-200"
                        dangerouslySetInnerHTML={{
                          __html: currentDetail.data.tvs.contraindications,
                        }}
                      />
                    </div>
                  )}

                {currentDetail.data.tvs?.preparation &&
                  currentDetail.data.tvs.preparation.trim() !== "" && (
                    <div className="mb-8">
                      <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                        Подготовка (preparation)
                      </h4>
                      <div
                        className="prose prose-sm max-w-none bg-white p-4 rounded-lg border border-slate-200"
                        dangerouslySetInnerHTML={{
                          __html: currentDetail.data.tvs.preparation,
                        }}
                      />
                    </div>
                  )}

                {renderAdvantages()}

                {currentDetail.data.price_items?.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                      Прайс-лист
                    </h4>
                    <div className="space-y-2 bg-white/60 border border-slate-200/60 backdrop-blur-md shadow-sm rounded-lg p-4">
                      {currentDetail.data.price_items.map(
                        (p: any, i: number) => (
                          <div
                            key={i}
                            className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                          >
                            <span className="text-sm">{p.name}</span>
                            <span className="font-bold whitespace-nowrap ml-4">
                              {p.price} ₽
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {currentDetail.type === "Цена" && (
              <div className="bg-white/60 border border-slate-200/60 backdrop-blur-md shadow-sm rounded-lg p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">Стоимость</h4>
                    <p className="text-2xl font-bold text-indigo-600">{currentDetail.data.price} ₽</p>
                  </div>
                  {currentDetail.data.doc_id && (
                    <div>
                      <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">Медицинский код</h4>
                      <p className="text-lg font-mono text-slate-700">{currentDetail.data.doc_id}</p>
                    </div>
                  )}
                  {currentDetail.data.category && (
                    <div>
                      <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">Категория</h4>
                      <p className="text-base text-slate-800">{currentDetail.data.category}</p>
                    </div>
                  )}
                  {currentDetail.data.tab && (
                    <div>
                      <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">Вкладка</h4>
                      <p className="text-base text-slate-800">{currentDetail.data.tab}</p>
                    </div>
                  )}
                  {currentDetail.data.resource_id && (
                    <div>
                      <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">ID Услуги</h4>
                      <p className="text-base font-mono text-slate-600">{currentDetail.data.resource_id}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Общие поля для других типов */}
            {currentDetail.data.introtext &&
              currentDetail.data.introtext.trim() !== "" && (
                <div className="mt-8 pt-8 border-t border-slate-200">
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                    Вводный текст (introtext)
                  </h4>
                  <div
                    className="text-sm text-slate-700"
                    dangerouslySetInnerHTML={{
                      __html: currentDetail.data.introtext,
                    }}
                  />
                </div>
              )}

            {currentDetail.data.description &&
              currentDetail.data.description.trim() !== "" && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    Описание
                  </h4>
                  <div
                    className="prose prose-sm max-w-none text-base"
                    dangerouslySetInnerHTML={{
                      __html: currentDetail.data.description,
                    }}
                  />
                </div>
              )}

            {currentDetail.data.seo?.description &&
              !currentDetail.data.description && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                    SEO Описание
                  </h4>
                  <p className="text-base">
                    {currentDetail.data.seo.description}
                  </p>
                </div>
              )}
            {/* Остальные TV поля */}
            {currentDetail.data.tvs && Object.entries(currentDetail.data.tvs).filter(([key, value]) => {
              const handledKeys = ['equipment_list', 'faq_services', 'indications', 'contraindications', 'preparation', 'advantages', 'img', 'title', 'des'];
              return !handledKeys.includes(key) && value && typeof value === 'string' && value.trim() !== '';
            }).length > 0 && (
              <div className="mt-8 pt-8 border-t border-slate-200">
                <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-4">
                  Дополнительные поля (TVs)
                </h4>
                <div className="space-y-6">
                  {Object.entries(currentDetail.data.tvs).filter(([key, value]) => {
                    const handledKeys = ['equipment_list', 'faq_services', 'indications', 'contraindications', 'preparation', 'advantages', 'img', 'title', 'des'];
                    return !handledKeys.includes(key) && value && typeof value === 'string' && value.trim() !== '';
                  }).map(([key, value]) => {
                    const analysis = schemaAnalysis.find(a => a.name === key);
                    const typeLabel = analysis ? (analysis.type === 'superboxselect' || analysis.type === 'listbox' ? 'Связь' : analysis.type) : null;
                    
                    return (
                      <div key={key}>
                        <h5 className="font-bold text-sm mb-2 flex items-center gap-2">
                          {tvNameMapping[key] || key}
                          {typeLabel && (
                            <span className="text-[10px] font-normal bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                              {typeLabel}
                            </span>
                          )}
                        </h5>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                          {renderHumanReadableTV(key, value as string)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {renderInternalLinks()}
            {renderConnections()}

          </div>
        </div>
        )}
      </div>
    </div>
  );
};
