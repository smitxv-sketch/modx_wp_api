import React from 'react';

interface ConfigViewProps {
  allResources: any[];
  configFilter: number | "all";
  setConfigFilter: (filter: number | "all") => void;
  excludedIds: number[];
  toggleExclusion: (id: number, excluded: boolean) => void;
  setSelectedItem: (item: any) => void;
  handleTabChange: (tab: string) => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({
  allResources, configFilter, setConfigFilter, excludedIds, toggleExclusion, setSelectedItem, handleTabChange
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-medium tracking-tight text-slate-800">Конфигурация данных</h2>
        <button onClick={() => handleTabChange("overview")} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
          ← На главную
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button 
          onClick={() => setConfigFilter("all")}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all shadow-sm backdrop-blur-md ${configFilter === "all" ? "bg-indigo-600 text-white border border-indigo-700" : "bg-white/60 text-slate-600 border border-slate-200/60 hover:bg-white/80"}`}
        >
          Все данные
        </button>
        {[
          { id: 7, name: 'Врачи' },
          { id: 32, name: 'Услуги' },
          { id: 6, name: 'Категории услуг' },
          { id: 4, name: 'Новости' },
          { id: 19, name: 'Акции' },
          { id: 25, name: 'Блог' }
        ].map(tmpl => (
          <button 
            key={tmpl.id}
            onClick={() => setConfigFilter(tmpl.id)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all shadow-sm backdrop-blur-md ${configFilter === tmpl.id ? "bg-indigo-600 text-white border border-indigo-700" : "bg-white/60 text-slate-600 border border-slate-200/60 hover:bg-white/80"}`}
          >
            {tmpl.name}
          </button>
        ))}
      </div>
      
      <div className="bg-white/40 border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
        <div className="grid grid-cols-12 bg-slate-50/50 p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/60 gap-4">
          <div className="col-span-3 sm:col-span-2 text-center">Статус</div>
          <div className="hidden sm:block sm:col-span-1">ID</div>
          <div className="col-span-3 sm:col-span-2">Тип</div>
          <div className="col-span-6 sm:col-span-7">Название</div>
        </div>
        
        <div className="divide-y divide-slate-100/60 max-h-[60vh] overflow-y-auto">
          {allResources.filter(res => configFilter === "all" || res.template === configFilter).map((res: any) => {
            const isExcluded = excludedIds.includes(res.id);
            const isPublished = !isExcluded;
            const templateMap: Record<number, string> = {
              7: 'Врач', 4: 'Новость', 6: 'Категория услуг', 32: 'Услуга',
              25: 'Блог', 2: 'Текст', 19: 'Акция', 21: 'Цены', 8: 'Услуги'
            };
            const templateName = templateMap[res.template] || `Шаблон ${res.template}`;
            
            return (
              <div key={res.id} onClick={() => setSelectedItem({ type: 'Ресурс конфигурации', data: res })} className={`grid grid-cols-12 p-4 text-sm items-center gap-4 transition-colors cursor-pointer ${!isPublished ? 'bg-red-50/30 text-slate-500' : 'hover:bg-white/50'}`}>
                <div className="col-span-3 sm:col-span-2 flex justify-center">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleExclusion(res.id, isExcluded); }}
                    className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-full transition-colors shadow-sm border ${isPublished ? 'bg-emerald-100/80 text-emerald-800 border-emerald-200/60 hover:bg-emerald-200/80' : 'bg-red-100/80 text-red-800 border-red-200/60 hover:bg-red-200/80'}`}
                  >
                    {isPublished ? 'Включено' : 'Исключено'}
                  </button>
                </div>
                <div className="hidden sm:block sm:col-span-1 text-slate-400 font-mono text-xs">{res.id}</div>
                <div className="col-span-3 sm:col-span-2">
                  <span className="bg-white/60 text-slate-600 px-2 py-1 text-[10px] sm:text-xs rounded-md border border-slate-200/60 shadow-sm">{templateName}</span>
                </div>
                <div className="col-span-6 sm:col-span-7 truncate font-medium text-slate-800" title={res.pagetitle}>
                  {res.pagetitle}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
