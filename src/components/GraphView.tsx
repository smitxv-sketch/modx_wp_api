import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Doctor, Service } from '../types';
import { Info, Database, ArrowRight, GitMerge, Users, Briefcase, Tag, MapPin, Star, MousePointer2, Share2 } from 'lucide-react';

interface GraphViewProps {
  graphData: { nodes: any[], links: any[] };
  fullGraph: any;
  doctors: Doctor[];
  services: Service[];
  setSelectedItem: (item: any) => void;
  setActiveTab: (tab: string) => void;
  setCurrentDetail: (detail: any) => void;
  setViewMode: (mode: "list" | "detail") => void;
}

export const GraphView: React.FC<GraphViewProps> = ({ 
  graphData, fullGraph, doctors, services, setSelectedItem, setActiveTab, setCurrentDetail, setViewMode 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // Interactive states
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [hoverNode, setHoverNode] = useState<any | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Adjust physics to spread nodes out
  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force('charge').strength(-150);
      graphRef.current.d3Force('link').distance(40);
    }
  }, [graphData]);

  // Compute highlighted nodes and links based on hover or active category
  const { highlightedNodes, highlightedLinks } = useMemo(() => {
    const nodes = new Set<string>();
    const links = new Set<any>();

    if (hoverNode) {
      nodes.add(hoverNode.id);
      graphData.links.forEach(link => {
        const sId = typeof link.source === 'object' ? link.source.id : link.source;
        const tId = typeof link.target === 'object' ? link.target.id : link.target;
        if (sId === hoverNode.id || tId === hoverNode.id) {
          nodes.add(sId);
          nodes.add(tId);
          links.add(link);
        }
      });
    } else if (activeCategory !== null) {
      // First, find all nodes of the active category
      graphData.nodes.forEach(n => {
        if (n.group === activeCategory) nodes.add(n.id);
      });
      // Then, find all links connected to these nodes, and add the neighbor nodes
      graphData.links.forEach(link => {
        const sId = typeof link.source === 'object' ? link.source.id : link.source;
        const tId = typeof link.target === 'object' ? link.target.id : link.target;
        const sNode = graphData.nodes.find(n => n.id === sId);
        const tNode = graphData.nodes.find(n => n.id === tId);
        
        if (sNode?.group === activeCategory || tNode?.group === activeCategory) {
          nodes.add(sId);
          nodes.add(tId);
          links.add(link);
        }
      });
    }

    return { highlightedNodes: nodes, highlightedLinks: links };
  }, [graphData, hoverNode, activeCategory]);

  const isHighlighting = hoverNode !== null || activeCategory !== null;

  const handleNodeHover = useCallback((node: any) => {
    setHoverNode(node || null);
  }, []);

  const getNodeColor = (node: any) => {
    const isDimmed = isHighlighting && !highlightedNodes.has(node.id);
    let baseColor = '#999';
    if (node.group === 1) baseColor = '#f97316'; // Врачи
    if (node.group === 2) baseColor = '#3b82f6'; // Услуги
    if (node.group === 3) baseColor = '#22c55e'; // Локации
    if (node.group === 4) baseColor = '#eab308'; // Акции
    
    if (isDimmed) return 'rgba(100, 100, 100, 0.1)';
    return baseColor;
  };

  const getLinkColor = (link: any) => {
    if (!isHighlighting) return 'rgba(255,255,255,0.15)';
    if (highlightedLinks.has(link)) {
      const sId = typeof link.source === 'object' ? link.source.id : link.source;
      const sNode = graphData.nodes.find(n => n.id === sId);
      if (sNode?.group === 1) return 'rgba(249, 115, 22, 0.6)'; // Врачи -> Услуги/Локации
      if (sNode?.group === 4) return 'rgba(234, 179, 8, 0.6)'; // Акции -> Врачи
      if (sNode?.group === 2) return 'rgba(59, 130, 246, 0.6)'; // Услуги -> Локации
      return 'rgba(255,255,255,0.5)';
    }
    return 'rgba(255,255,255,0.02)';
  };

  // Helper for rendering interactive cards
  const renderCard = (group: number, icon: React.ReactNode, title: string, desc: React.ReactNode, activeClass: string) => {
    const isActive = activeCategory === group;
    return (
      <div 
        onClick={() => setActiveCategory(isActive ? null : group)}
        className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${isActive ? activeClass : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50 shadow-sm'}`}
      >
        <h4 className="font-bold text-sm flex items-center gap-2 text-slate-800">
          {icon} {title}
        </h4>
        <p className="text-sm text-slate-600 leading-relaxed mt-2">
          {desc}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          <Share2 className="text-indigo-600" />
          Граф связей
        </h2>
        <button onClick={() => setActiveTab('overview')} className="text-sm font-medium hover:underline text-indigo-600">
          ← На главную
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-[calc(100vh-200px)] lg:h-[80vh]">
        {/* Граф */}
        <div 
          ref={containerRef}
          className="bg-[#141414] rounded-xl overflow-hidden relative w-full flex-1 lg:flex-1 shadow-sm border border-slate-200 shrink-0 min-h-[40%]"
        >
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <button onClick={() => setSelectedItem({ type: 'Сырые данные графа', data: fullGraph })} className="bg-white/10 text-white px-3 py-1.5 text-xs font-medium rounded hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10 w-fit">
              JSON Графа
            </button>
            <div className="bg-black/60 p-3 rounded-lg border border-white/10 text-xs text-white space-y-2 pointer-events-none backdrop-blur-md w-fit mt-2">
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-orange-500 rounded-full"></span> Врачи</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-indigo-500 rounded-full"></span> Услуги</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Локации</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-yellow-500 rounded-full"></span> Акции</div>
            </div>
          </div>
        
        <div className="absolute inset-0">
          {graphData.nodes.length > 0 ? (
            <ForceGraph2D
              ref={graphRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeLabel="name"
              nodeColor={getNodeColor}
              linkColor={getLinkColor}
              linkWidth={link => (isHighlighting && highlightedLinks.has(link)) ? 2 : 1}
              linkDirectionalParticles={link => (isHighlighting && highlightedLinks.has(link)) ? 2 : 0}
              linkDirectionalParticleWidth={2}
              backgroundColor="#141414"
              onNodeHover={handleNodeHover}
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const label = node.name;
                const fontSize = 12 / globalScale;
                ctx.font = `${fontSize}px Sans-Serif`;
                
                // Draw node circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
                ctx.fillStyle = getNodeColor(node);
                ctx.fill();

                // Only draw text if zoomed in enough or if node is highlighted
                const isHighlighted = highlightedNodes.has(node.id) || hoverNode?.id === node.id;
                if (globalScale > 1.5 || isHighlighted) {
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = isHighlighted ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.7)';
                  ctx.fillText(label, node.x, node.y + 8);
                }
              }}
              onNodeClick={(node) => {
                const id = parseInt(String(node.id).split('_')[1]);
                if (node.group === 1) {
                  const doc = doctors.find(d => d.id === id);
                  if (doc) { setActiveTab('doctors'); setCurrentDetail({ type: 'Врач', data: doc }); setViewMode('detail'); }
                } else if (node.group === 2) {
                  const srv = services.find(s => s.id === id);
                  if (srv) { setActiveTab('services'); setCurrentDetail({ type: 'Услуга', data: srv }); setViewMode('detail'); }
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 font-medium tracking-widest">
              Граф связей пуст
            </div>
          )}

          {isHighlighting && (
            <div className="absolute top-4 right-4 bg-indigo-500/20 text-indigo-200 px-3 py-1.5 text-xs font-medium rounded-full border border-indigo-500/30 backdrop-blur-md flex items-center gap-2 animate-pulse">
              <MousePointer2 size={14} /> Режим фокуса активен
            </div>
          )}

          {/* Mobile instructions and controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
            <div className="lg:hidden bg-black/60 text-white/90 px-3 py-1.5 text-[10px] font-medium rounded-lg border border-white/10 backdrop-blur-md text-right">
              Используйте два пальца для зума.<br/>Тапните на узел для перехода.
            </div>
            <button 
              onClick={() => {
                if (graphRef.current) {
                  graphRef.current.zoomToFit(400, 20);
                }
              }}
              className="bg-white/10 text-white px-3 py-1.5 text-xs font-medium rounded hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10"
            >
              Сбросить масштаб
            </button>
          </div>
        </div>
      </div>

      {/* Текстовое описание структуры */}
      <div className="w-full lg:w-96 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto flex flex-col flex-1 lg:flex-none">
        <div className="p-5 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
          <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900">
            <Database size={20} className="text-indigo-600" />
            Архитектура данных
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Кликайте на карточки ниже, чтобы подсветить связи на графе. Кликайте на узлы графа для перехода в карточку сущности.
          </p>
        </div>
        
        <div className="p-4 space-y-3 flex-1 bg-slate-50/50">
          
          {renderCard(
            1, 
            <Users size={16} className="text-orange-500" />, 
            "Врачи", 
            <>Самостоятельные карточки. Врач <strong>ссылается на Услуги</strong>, которые он оказывает. Базовая стоимость приема вписана текстом прямо в карточку врача.</>,
            "bg-orange-50 border-orange-300 shadow-md ring-1 ring-orange-500"
          )}

          {renderCard(
            2, 
            <Briefcase size={16} className="text-indigo-500" />, 
            "Услуги", 
            <>Работают как "папки" или категории в каталоге. Сама услуга не имеет цены, но <strong>содержит в себе</strong> конкретные позиции прайс-листа.</>,
            "bg-indigo-50/60 border-indigo-200/60 backdrop-blur-md shadow-sm shadow-md ring-1 ring-blue-500"
          )}

          {renderCard(
            4, 
            <Star size={16} className="text-yellow-500" />, 
            "Акции", 
            <>Привязываются напрямую к <strong>Врачам</strong> (список участников), а не к услугам или ценам.</>,
            "bg-yellow-50 border-yellow-300 shadow-md ring-1 ring-yellow-500"
          )}

          {renderCard(
            3, 
            <MapPin size={16} className="text-emerald-500" />, 
            "Локации", 
            <>Привязываются параллельно и к Врачам, и к Услугам.</>,
            "bg-emerald-50/60 border-emerald-200/60 backdrop-blur-md shadow-sm shadow-md ring-1 ring-green-500"
          )}

          <div className="p-4 rounded-xl border bg-white border-slate-100 shadow-sm">
            <h4 className="font-bold text-sm flex items-center gap-2 text-slate-800">
              <Tag size={16} className="text-purple-500" /> Прайс-лист (Цены)
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed mt-2">
              Жестко привязан к Услугам. Каждая цена имеет теги (например, вкладка "Прием врачей", категория "Хирургия"), по которым строятся вкладки на сайте.
            </p>
          </div>

        </div>

        <div className="p-5 bg-indigo-50 border-t border-indigo-100 mt-auto">
          <h4 className="font-bold text-sm flex items-center gap-2 text-indigo-900 mb-2">
            <GitMerge size={16} /> План для Strapi
          </h4>
          <p className="text-xs text-indigo-800 leading-relaxed">
            При переезде эта структура будет унифицирована. Города (СПб, Челябинск) будут реализованы через функционал <strong>локализаций (i18n)</strong>. Это позволит иметь общую базу врачей и услуг, но с разными ценами, акциями и локациями для каждого города.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
};
