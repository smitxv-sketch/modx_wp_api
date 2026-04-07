import React from 'react';

interface EntityCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  onClick: () => void;
}

export const EntityCard: React.FC<EntityCardProps> = ({ title, count, icon, onClick }) => (
  <div 
    onClick={onClick} 
    className="p-5 sm:p-6 bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-white/60 rounded-2xl sm:rounded-3xl cursor-pointer transition-all duration-300 group flex flex-col justify-between h-32 sm:h-36 relative overflow-hidden"
  >
    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    <div className="flex justify-between items-start relative z-10">
      <h3 className="text-base sm:text-lg font-medium tracking-tight text-slate-700 group-hover:text-slate-900 transition-colors">{title}</h3>
      <div className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-300 transform group-hover:scale-110">{icon}</div>
    </div>
    <p className="text-3xl sm:text-4xl font-mono font-light text-slate-800 relative z-10">{count}</p>
  </div>
);
