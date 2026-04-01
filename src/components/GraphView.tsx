import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Doctor, Service } from '../types';
import { Info, Database, ArrowRight, GitMerge, Users, Briefcase, Tag, MapPin, Star, MousePointer2 } from 'lucide-react';

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
        className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${isActive ? activeClass : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50 shadow-sm'}`}
      >
        <h4 className="font-bold text-sm flex items-center gap-2 text-gray-800">
          {icon} {title}
        </h4>
        <p className="text-sm text-gray-600 leading-relaxed mt-2">
          {desc}
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[85vh]">
      {/* Граф */}
      <div 
        ref={containerRef}
        className="bg-[#141414] rounded-xl overflow-hidden h-[60vh] lg:h-full relative flex-1 shadow-sm border border-gray-200"
      >
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button onClick={() => setActiveTab('overview')} className="bg-white/10 text-white px-3 py-1.5 text-xs font-medium rounded hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10">
            ← На главную
          </button>
          <button onClick={() => setSelectedItem({ type: 'Сырые данные графа', data: fullGraph })} className="bg-white/10 text-white px-3 py-1.5 text-xs font-medium rounded hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10">
            JSON Графа
          </button>
        </div>
        
        <div className="absolute inset-0">
          {graphData.nodes.length > 0 ? (
            <ForceGraph2D
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
          
          <div className="absolute bottom-4 left-4 bg-black/60 p-3 rounded-lg border border-white/10 text-xs text-white space-y-2 pointer-events-none backdrop-blur-md">
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-orange-500 rounded-full"></span> Врачи</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> Услуги</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Локации</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-yellow-500 rounded-full"></span> Акции</div>
          </div>

          {isHighlighting && (
            <div className="absolute top-4 right-4 bg-blue-500/20 text-blue-200 px-3 py-1.5 text-xs font-medium rounded-full border border-blue-500/30 backdrop-blur-md flex items-center gap-2 animate-pulse">
              <MousePointer2 size={14} /> Режим фокуса активен
            </div>
          )}
        </div>
      </div>

      {/* Текстовое описание структуры */}
      <div className="w-full lg:w-96 bg-white rounded-xl border border-gray-200 shadow-sm overflow-y-auto flex flex-col">
        <div className="p-5 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
          <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900">
            <Database size={20} className="text-blue-600" />
            Архитектура данных
          </h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Кликайте на карточки ниже, чтобы подсветить связи на графе.
          </p>
        </div>
        
        <div className="p-4 space-y-3 flex-1 bg-gray-50/50">
          
          {renderCard(
            1, 
            <Users size={16} className="text-orange-500" />, 
            "Врачи", 
            <>Самостоятельные карточки. Врач <strong>ссылается на Услуги</strong>, которые он оказывает. Базовая стоимость приема вписана текстом прямо в карточку врача.</>,
            "bg-orange-50 border-orange-300 shadow-md ring-1 ring-orange-500"
          )}

          {renderCard(
            2, 
            <Briefcase size={16} className="text-blue-500" />, 
            "Услуги", 
            <>Работают как "папки" или категории в каталоге. Сама услуга не имеет цены, но <strong>содержит в себе</strong> конкретные позиции прайс-листа.</>,
            "bg-blue-50 border-blue-300 shadow-md ring-1 ring-blue-500"
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
            <MapPin size={16} className="text-green-500" />, 
            "Локации", 
            <>Привязываются параллельно и к Врачам, и к Услугам.</>,
            "bg-green-50 border-green-300 shadow-md ring-1 ring-green-500"
          )}

          <div className="p-4 rounded-xl border bg-white border-gray-100 shadow-sm">
            <h4 className="font-bold text-sm flex items-center gap-2 text-gray-800">
              <Tag size={16} className="text-purple-500" /> Прайс-лист (Цены)
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">
              Жестко привязан к Услугам. Каждая цена имеет теги (например, вкладка "Прием врачей", категория "Хирургия"), по которым строятся вкладки на сайте.
            </p>
          </div>

        </div>

        <div className="p-5 bg-blue-50 border-t border-blue-100 mt-auto">
          <h4 className="font-bold text-sm flex items-center gap-2 text-blue-900 mb-2">
            <GitMerge size={16} /> План для Strapi
          </h4>
          <p className="text-xs text-blue-800 leading-relaxed">
            При переезде эта структура будет унифицирована. Города (СПб, Челябинск) будут реализованы через функционал <strong>локализаций (i18n)</strong>. Это позволит иметь общую базу врачей и услуг, но с разными ценами, акциями и локациями для каждого города.
          </p>
        </div>
      </div>
    </div>
  );
};
