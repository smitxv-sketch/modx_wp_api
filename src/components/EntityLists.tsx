import React from 'react';
import { MapPin, FileText, Image as ImageIcon } from "lucide-react";
import { Doctor, Service } from '../types';

interface EntityListsProps {
  activeTab: string;
  doctors: Doctor[];
  services: Service[];
  fullGraph: any;
  handleTabChange: (tab: string) => void;
  setCurrentDetail: (detail: any) => void;
  setViewMode: (mode: "list" | "detail") => void;
}

const PricesTab: React.FC<{ fullGraph: any, setCurrentDetail: any, setViewMode: any }> = ({ fullGraph, setCurrentDetail, setViewMode }) => {
  const priceItems = fullGraph?.entities?.price_items || [];
  
  // Group by tab
  const groupedByTab = React.useMemo(() => {
    return priceItems.reduce((acc: any, item: any) => {
      const tab = item.tab || 'Прочее';
      if (!acc[tab]) acc[tab] = [];
      acc[tab].push(item);
      return acc;
    }, {});
  }, [priceItems]);

  const tabs = Object.keys(groupedByTab).sort();
  const [selectedPriceTab, setSelectedPriceTab] = React.useState(tabs[0] || '');

  // Update selected tab if tabs change and current is invalid
  React.useEffect(() => {
    if (tabs.length > 0 && !tabs.includes(selectedPriceTab)) {
      setSelectedPriceTab(tabs[0]);
    }
  }, [tabs, selectedPriceTab]);

  if (priceItems.length === 0) {
    return <div className="p-8 text-center text-gray-500">Прайс-лист пуст</div>;
  }

  const currentItems = groupedByTab[selectedPriceTab] || [];
  
  // Group current items by category
  const groupedByCategory = currentItems.reduce((acc: any, item: any) => {
    const cat = item.category || 'Без категории';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const categories = Object.keys(groupedByCategory).sort();

  return (
    <div className="flex flex-col h-full">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-200 overflow-x-auto hide-scrollbar bg-gray-50">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedPriceTab(tab)}
            className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
              selectedPriceTab === tab 
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-0 max-h-[70vh] overflow-y-auto">
        {categories.map(category => (
          <div key={category} className="mb-6 last:mb-0">
            <div className="bg-gray-100 px-6 py-3 font-bold text-gray-800 sticky top-0 z-10 shadow-sm">
              {category}
            </div>
            <div className="divide-y divide-gray-100">
              {groupedByCategory[category].map((price: any, i: number) => (
                <div 
                  key={i} 
                  onClick={() => { setCurrentDetail({ type: 'Цена', data: price }); setViewMode('detail'); }} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 hover:bg-blue-50 cursor-pointer transition-colors gap-2 sm:gap-4"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{price.name}</div>
                    {price.doc_id && <div className="text-xs text-gray-500 font-mono mt-1">Код: {price.doc_id}</div>}
                  </div>
                  <div className="font-bold text-lg whitespace-nowrap text-right">
                    {price.price} ₽
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EntityLists: React.FC<EntityListsProps> = ({
  activeTab, doctors, services, fullGraph, handleTabChange, setCurrentDetail, setViewMode
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold capitalize">
          {activeTab === 'doctors' && 'Врачи'}
          {activeTab === 'services' && 'Услуги'}
          {activeTab === 'prices' && 'Прайс-лист'}
          {activeTab === 'locations' && 'Локации'}
          {activeTab === 'articles' && 'Статьи'}
          {activeTab === 'media' && 'Медиафайлы'}
          {activeTab === 'redirects' && 'Редиректы'}
          {activeTab === 'pages' && 'Все страницы'}
        </h2>
        <button onClick={() => handleTabChange("overview")} className="text-sm font-medium hover:underline">
          ← На главную
        </button>
      </div>

      {activeTab === "doctors" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {doctors.map(doc => (
            <div key={doc.id} onClick={() => { setCurrentDetail({ type: 'Врач', data: doc }); setViewMode('detail'); }} className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col group cursor-pointer hover:shadow-md transition-all hover:border-blue-300">
              <div className="aspect-[3/4] bg-gray-100 overflow-hidden relative">
                <img src={doc.photo ? `https://cispb.com${String(doc.photo).startsWith('/') ? '' : '/'}${doc.photo}` : `https://picsum.photos/seed/${doc.id}/600/800`} alt={doc.pagetitle} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-lg leading-tight mb-1 group-hover:text-blue-600 transition-colors">{doc.pagetitle}</h3>
                <p className="text-xs text-gray-500 mb-4">{doc.specialization}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "services" && (
        <div className="space-y-8">
          {Object.entries(
            services.reduce((acc: any, service) => {
              const cat = service.category?.pagetitle || 'Без категории';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(service);
              return acc;
            }, {})
          ).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]: [string, any]) => (
            <div key={category}>
              <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">{category}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((service: any) => (
                  <div key={service.id} onClick={() => { setCurrentDetail({ type: 'Услуга', data: service }); setViewMode('detail'); }} className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col group cursor-pointer hover:shadow-md transition-all hover:border-blue-300">
                    <h4 className="font-bold text-lg mb-4 line-clamp-2 group-hover:text-blue-600 transition-colors">{service.pagetitle}</h4>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "articles" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {fullGraph?.entities?.articles?.map((article: any) => (
            <div key={article.id} onClick={() => { setCurrentDetail({ type: 'Статья', data: article }); setViewMode('detail'); }} className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col group cursor-pointer hover:shadow-md transition-all hover:border-blue-300">
              <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{article.pagetitle}</h3>
              <p className="text-sm text-gray-500 line-clamp-3 mb-4">{article.description || article.seo?.description || 'Нет описания'}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "prices" && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <PricesTab fullGraph={fullGraph} setCurrentDetail={setCurrentDetail} setViewMode={setViewMode} />
        </div>
      )}

      {activeTab === "locations" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {fullGraph?.entities?.locations?.map((loc: any) => (
            <div key={loc.id} onClick={() => { setCurrentDetail({ type: 'Локация', data: loc }); setViewMode('detail'); }} className="bg-white border border-gray-200 rounded-lg p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">{loc.name}</h3>
                <p className="text-xs text-gray-500">ID: {loc.id}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "media" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {fullGraph?.entities?.media?.map((med: any) => (
            <div key={med.id} onClick={() => { setCurrentDetail({ type: 'Медиафайл', data: med }); setViewMode('detail'); }} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all">
              <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center shrink-0">
                {med.type === "image" ? <ImageIcon size={24} className="text-gray-400" /> : <FileText size={24} className="text-gray-400" />}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-sm truncate">{med.original_path?.split('/').pop() || med.name}</p>
                <p className="text-xs text-gray-500 mt-1">{med.type}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "redirects" && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-2 bg-gray-50 p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <div>Старый URL</div>
            <div>Новый URL</div>
          </div>
          <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
            {fullGraph?.entities?.redirects?.map((red: any, i: number) => (
              <div key={i} onClick={() => { setCurrentDetail({ type: 'Редирект', data: red }); setViewMode('detail'); }} className="grid grid-cols-2 p-4 text-sm items-center hover:bg-gray-50 cursor-pointer gap-4">
                <div className="text-gray-500 break-all">{red.old_url}</div>
                <div className="font-medium break-all">{red.new_slug}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "pages" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {fullGraph?.entities?.resources?.map((res: any) => (
            <div key={res.id} onClick={() => { setCurrentDetail({ type: 'Страница', data: res }); setViewMode('detail'); }} className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col group cursor-pointer hover:shadow-md transition-all hover:border-blue-300">
              <div className="mb-3 flex justify-between items-center">
                <span className="text-[10px] uppercase bg-gray-100 text-gray-600 px-2 py-1 rounded">Шаблон {res.template}</span>
                <span className="text-xs text-gray-400">ID: {res.id}</span>
              </div>
              <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{res.pagetitle}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
