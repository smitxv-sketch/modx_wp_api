import React, { useState, useEffect } from "react";
import { Users, Briefcase, Share2, MapPin, FileText, Image as ImageIcon, ArrowRightLeft, LayoutTemplate, Settings, Tag, Search, Database, Download } from "lucide-react";
import { Doctor, Service } from "./types";
import { Header } from "./components/Header";
import { EntityCard } from "./components/EntityCard";
import { JsonModal } from "./components/JsonModal";
import { DetailView } from "./components/DetailView";
import { GraphView } from "./components/GraphView";
import { ConfigView } from "./components/ConfigView";
import { SeoAnalytics } from "./components/SeoAnalytics";
import { EntityLists } from "./components/EntityLists";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DataExplorer } from "./components/DataExplorer";
import { DbDumper } from "./components/DbDumper";
import { SchemaBuilder } from "./components/SchemaBuilder";
import { ExportView } from "./components/ExportView";

export default function App() {
  const [city, setCity] = useState<"spb" | "chelyabinsk">("spb");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [fullGraph, setFullGraph] = useState<any>(null);
  const [allResources, setAllResources] = useState<any[]>([]);
  const [excludedIds, setExcludedIds] = useState<number[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [configFilter, setConfigFilter] = useState<number | "all">("all");
  const [selectedItem, setSelectedItem] = useState<{ type: string, data: any } | null>(null);
  const [currentDetail, setCurrentDetail] = useState<{ type: string, data: any } | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
  const [schemaAnalysis, setSchemaAnalysis] = useState<any[]>([]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setViewMode("list");
    setCurrentDetail(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const timestamp = new Date().getTime();
        
        // Fetch schema analysis
        fetch('/api/export/schema/analyze')
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setSchemaAnalysis(data.analysis);
            }
          })
          .catch(err => console.error("Failed to fetch analysis:", err));

        if (city === "chelyabinsk") {
          // Fetch Chelyabinsk data
          const [docsRes] = await Promise.all([
            fetch(`/api/chel/doctors?t=${timestamp}`)
          ]);
          
          if (!docsRes.ok) {
            const errData = await docsRes.json().catch(() => ({}));
            throw new Error(errData.error || "Ошибка получения данных из БД Челябинска.");
          }
          
          const chelDoctors = await docsRes.json();
          setDoctors(chelDoctors);
          setServices([]); // TODO: Fetch Chelyabinsk services
          setFullGraph({ entities: { doctors: chelDoctors, services: [], locations: [] } });
          setAllResources(chelDoctors);
        } else {
          // Fetch SPB data
          const [docsRes, servRes, graphRes, logsRes, excludedRes, allGraphRes] = await Promise.all([
            fetch(`/api/doctors?t=${timestamp}`),
            fetch(`/api/services?t=${timestamp}`),
            fetch(`/api/sync/full-graph?t=${timestamp}`),
            fetch(`/api/sync/logs?t=${timestamp}`),
            fetch(`/api/sync/settings/excluded?t=${timestamp}`),
            fetch(`/api/sync/full-graph?include_excluded=true&t=${timestamp}`)
          ]);
          
          if (!servRes.ok) {
            const errData = await servRes.json().catch(() => ({}));
            throw new Error(errData.error || "Ошибка получения данных из БД.");
          }

          setDoctors(await docsRes.json());
          setServices(await servRes.json());
          setFullGraph(await graphRes.json());
          setSyncLogs(await logsRes.json());
          setExcludedIds(await excludedRes.json());
          
          const allGraph = await allGraphRes.json();
          setAllResources(allGraph.entities?.resources || []);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Произошла непредвиденная ошибка.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [city]);

  useEffect(() => {
    if (fullGraph && fullGraph.entities) {
      const newNodes: any[] = [];
      const newLinks: any[] = [];
      const nodeIds = new Set<string>();

      const addNode = (id: string, name: string, group: number, val: number) => {
        if (!nodeIds.has(id)) {
          newNodes.push({ id, name, group, val });
          nodeIds.add(id);
        }
      };

      // Локации
      fullGraph.entities.locations?.forEach((l: any) => {
        addNode(`loc_${l.id}`, l.name || `Локация ${l.id}`, 3, 3);
      });

      // Врачи
      fullGraph.entities.doctors?.forEach((d: any) => {
        addNode(`doc_${d.id}`, d.pagetitle, 1, 2);
        
        if (d.tvs?.loc) {
           const locIds = Array.isArray(d.tvs.loc) ? d.tvs.loc : String(d.tvs.loc).split('||');
           locIds.forEach((locId: string) => {
              const lid = parseInt(locId);
              if (!isNaN(lid)) {
                 addNode(`loc_${lid}`, lid === 1 ? 'Финский пер., 4' : `Локация ${lid}`, 3, 3);
                 newLinks.push({ source: `doc_${d.id}`, target: `loc_${lid}` });
              }
           });
        }

        if (d.tvs?.uslugiPrice && Array.isArray(d.tvs.uslugiPrice)) {
           d.tvs.uslugiPrice.forEach((u: any) => {
              if (u.service) {
                 const sid = parseInt(u.service);
                 if (!isNaN(sid)) {
                    addNode(`srv_${sid}`, `Услуга ${sid}`, 2, 1.5);
                    newLinks.push({ source: `doc_${d.id}`, target: `srv_${sid}` });
                 }
              }
           });
        }
      });
      
      // Услуги
      fullGraph.entities.services?.forEach((s: any) => {
        addNode(`srv_${s.id}`, s.pagetitle, 2, 1.5);
        
        if (s.tvs?.loc) {
           const locIds = Array.isArray(s.tvs.loc) ? s.tvs.loc : String(s.tvs.loc).split('||');
           locIds.forEach((locId: string) => {
              const lid = parseInt(locId);
              if (!isNaN(lid)) {
                 addNode(`loc_${lid}`, lid === 1 ? 'Финский пер., 4' : `Локация ${lid}`, 3, 3);
                 newLinks.push({ source: `srv_${s.id}`, target: `loc_${lid}` });
              }
           });
        }
      });

      // Акции (Promotions)
      fullGraph.entities.articles?.forEach((a: any) => {
        if (a.template === 19) {
          addNode(`promo_${a.id}`, a.pagetitle, 4, 2);
          if (a.tvs?.specListAction) {
            const docIds = Array.isArray(a.tvs.specListAction) ? a.tvs.specListAction : String(a.tvs.specListAction).split('||');
            docIds.forEach((docId: string) => {
              const did = parseInt(docId);
              if (!isNaN(did)) {
                 newLinks.push({ source: `promo_${a.id}`, target: `doc_${did}` });
              }
            });
          }
        }
      });

      setGraphData({ nodes: newNodes, links: newLinks });
    } else {
      setGraphData({ nodes: [], links: [] });
    }
  }, [fullGraph]);

  const toggleExclusion = async (resourceId: number, currentExcluded: boolean) => {
    try {
      const res = await fetch("/api/sync/settings/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource_id: resourceId, exclude: !currentExcluded })
      });
      if (res.ok) {
        setExcludedIds(prev => 
          !currentExcluded 
            ? [...prev, resourceId] 
            : prev.filter(id => id !== resourceId)
        );
      }
    } catch (e) {
      console.error("Ошибка переключения исключения", e);
    }
  };

  return (
    <div className="min-h-screen font-sans">
      <Header city={city} setCity={setCity} handleTabChange={handleTabChange} error={error} />

      <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        {error && (
          <div className="mb-8 p-6 border border-red-500/30 bg-red-50 text-red-700 rounded-lg">
            <h2 className="text-xl font-bold mb-2">Ошибка подключения</h2>
            <p className="font-mono text-sm">{error}</p>
          </div>
        )}

        {loading && !error && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#141414]"></div>
          </div>
        )}

        {!loading && !error && activeTab === "overview" && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <EntityCard title="Врачи" count={doctors?.length || 0} icon={<Users size={24} />} onClick={() => handleTabChange("doctors")} />
              <EntityCard title="Отзывы" count={fullGraph?.entities?.reviews?.length || 0} icon={<FileText size={24} />} onClick={() => handleTabChange("reviews")} />
              <EntityCard title="Услуги" count={services?.length || 0} icon={<Briefcase size={24} />} onClick={() => handleTabChange("services")} />
              <EntityCard title="Программы" count={fullGraph?.entities?.programs?.length || 0} icon={<FileText size={24} />} onClick={() => handleTabChange("programs")} />
              <EntityCard title="Прайс-лист" count={fullGraph?.entities?.price_items?.length || 0} icon={<Tag size={24} />} onClick={() => handleTabChange("prices")} />
              <EntityCard title="Локации" count={fullGraph?.entities?.locations?.length || 0} icon={<MapPin size={24} />} onClick={() => handleTabChange("locations")} />
              <EntityCard title="Филиалы" count={fullGraph?.entities?.branches?.length || 0} icon={<MapPin size={24} />} onClick={() => handleTabChange("branches")} />
              <EntityCard title="Оборудование" count={fullGraph?.entities?.equipment?.length || 0} icon={<FileText size={24} />} onClick={() => handleTabChange("equipment")} />
              <EntityCard title="Вакансии" count={fullGraph?.entities?.vacancies?.length || 0} icon={<Briefcase size={24} />} onClick={() => handleTabChange("vacancies")} />
              <EntityCard title="Новости" count={fullGraph?.entities?.news?.length || 0} icon={<FileText size={24} />} onClick={() => handleTabChange("news")} />
              <EntityCard title="Акции" count={fullGraph?.entities?.promotions?.length || 0} icon={<FileText size={24} />} onClick={() => handleTabChange("promotions")} />
              <EntityCard title="Статьи" count={fullGraph?.entities?.articles?.length || 0} icon={<FileText size={24} />} onClick={() => handleTabChange("articles")} />
              <EntityCard title="Медиафайлы" count={fullGraph?.entities?.media?.length || 0} icon={<ImageIcon size={24} />} onClick={() => handleTabChange("media")} />
              <EntityCard title="Редиректы" count={fullGraph?.entities?.redirects?.length || 0} icon={<ArrowRightLeft size={24} />} onClick={() => handleTabChange("redirects")} />
              <EntityCard title="Все страницы" count={fullGraph?.entities?.resources?.length || 0} icon={<LayoutTemplate size={24} />} onClick={() => handleTabChange("pages")} />
              <EntityCard title="Граф связей" count={graphData.nodes.length} icon={<Share2 size={24} />} onClick={() => handleTabChange("graph")} />
              <EntityCard title="SEO Аналитика" count={fullGraph?.entities?.resources?.length || 0} icon={<Search size={24} />} onClick={() => handleTabChange("seo")} />
              <EntityCard title="Сырые данные" count={Object.keys(fullGraph?.entities || {}).length} icon={<Database size={24} />} onClick={() => handleTabChange("explorer")} />
              <EntityCard title="Дамп БД" count={city === 'chelyabinsk' ? 1 : 0} icon={<Database size={24} />} onClick={() => handleTabChange("dump")} />
              <EntityCard title="Экспорт JSON" count={30} icon={<Download size={24} />} onClick={() => handleTabChange("export")} />
              <EntityCard title="Схема (Strapi)" count={2} icon={<FileText size={24} />} onClick={() => handleTabChange("schema")} />
              <EntityCard title="Конфигурация" count={allResources.length} icon={<Settings size={24} />} onClick={() => handleTabChange("configuration")} />
            </div>
          </div>
        )}

        {/* Списки сущностей */}
        {!loading && !error && viewMode === "list" && activeTab !== "overview" && activeTab !== "graph" && activeTab !== "configuration" && activeTab !== "seo" && activeTab !== "explorer" && activeTab !== "dump" && activeTab !== "schema" && activeTab !== "export" && (
          <EntityLists 
            activeTab={activeTab} 
            doctors={doctors} 
            services={services} 
            fullGraph={fullGraph} 
            handleTabChange={handleTabChange} 
            setCurrentDetail={setCurrentDetail} 
            setViewMode={setViewMode} 
            schemaAnalysis={schemaAnalysis}
          />
        )}

        {!loading && !error && activeTab === "dump" && (
          <DbDumper />
        )}

        {!loading && !error && activeTab === "export" && (
          <ExportView handleTabChange={handleTabChange} />
        )}

        {!loading && !error && activeTab === "schema" && (
          <SchemaBuilder doctors={doctors} services={services} fullGraph={fullGraph} />
        )}

        {/* Детальный просмотр */}
        {!loading && !error && viewMode === "detail" && currentDetail && (
          <ErrorBoundary>
            <DetailView 
              currentDetail={currentDetail} 
              setViewMode={setViewMode} 
              setCurrentDetail={setCurrentDetail} 
              setSelectedItem={setSelectedItem} 
              fullGraph={fullGraph}
              schemaAnalysis={schemaAnalysis}
            />
          </ErrorBoundary>
        )}

        {/* Граф связей */}
        {!loading && !error && activeTab === "graph" && (
          <GraphView 
            graphData={graphData} 
            fullGraph={fullGraph} 
            doctors={doctors} 
            services={services} 
            setSelectedItem={setSelectedItem} 
            setActiveTab={setActiveTab} 
            setCurrentDetail={setCurrentDetail} 
            setViewMode={setViewMode} 
          />
        )}

        {/* Конфигурация */}
        {!loading && !error && activeTab === "configuration" && (
          <ConfigView 
            allResources={allResources} 
            configFilter={configFilter} 
            setConfigFilter={setConfigFilter} 
            excludedIds={excludedIds} 
            toggleExclusion={toggleExclusion} 
            setSelectedItem={setSelectedItem} 
            handleTabChange={handleTabChange} 
          />
        )}

        {/* SEO Аналитика */}
        {!loading && !error && activeTab === "seo" && (
          <SeoAnalytics 
            fullGraph={fullGraph} 
            handleTabChange={handleTabChange} 
          />
        )}

        {/* Сырые данные (Data Explorer) */}
        {!loading && !error && activeTab === "explorer" && (
          <DataExplorer 
            fullGraph={fullGraph} 
            doctors={doctors}
            services={services}
            handleTabChange={handleTabChange} 
          />
        )}
      </main>

      {/* Модальное окно для JSON */}
      {selectedItem && (
        <JsonModal selectedItem={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
