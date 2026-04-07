import React from 'react';

interface HeaderProps {
  city: "spb" | "chelyabinsk";
  setCity: (city: "spb" | "chelyabinsk") => void;
  handleTabChange: (tab: string) => void;
  error: string | null;
}

export const Header: React.FC<HeaderProps> = ({ city, setCity, handleTabChange, error }) => {
  return (
    <header className="px-4 sm:px-6 py-4 bg-white/60 backdrop-blur-xl border-b border-white/50 sticky top-0 z-40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-[0_4px_30px_rgb(0,0,0,0.03)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
        <div className="font-bold text-xl tracking-tight cursor-pointer flex justify-between w-full sm:w-auto items-center text-slate-800" onClick={() => handleTabChange("overview")}>
          <span>Синхронизация</span>
          <div className="flex sm:hidden items-center gap-2 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></span>
          </div>
        </div>
        <select 
          value={city} 
          onChange={(e) => {
            setCity(e.target.value as "spb" | "chelyabinsk");
            handleTabChange("overview");
          }}
          className="bg-white/50 border border-white/60 shadow-sm px-3 py-2 sm:py-1.5 text-sm font-medium rounded-xl outline-none cursor-pointer hover:bg-white/80 transition-colors w-full sm:w-auto text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="spb">Санкт-Петербург (MODX)</option>
          <option value="chelyabinsk">Челябинск (WordPress)</option>
        </select>
      </div>
      <div className="hidden sm:flex items-center gap-2 text-xs font-mono bg-white/50 px-3 py-1.5 rounded-full border border-white/60 shadow-sm">
        <span className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></span>
        <span className="text-slate-600 font-medium tracking-wide">{error ? 'ОШИБКА БД' : 'БД ПОДКЛЮЧЕНА'}</span>
      </div>
    </header>
  );
};
