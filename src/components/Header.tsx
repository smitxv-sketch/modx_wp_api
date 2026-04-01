import React from 'react';

interface HeaderProps {
  city: "spb" | "chelyabinsk";
  setCity: (city: "spb" | "chelyabinsk") => void;
  handleTabChange: (tab: string) => void;
  error: string | null;
}

export const Header: React.FC<HeaderProps> = ({ city, setCity, handleTabChange, error }) => {
  return (
    <header className="px-4 sm:px-6 py-4 border-b border-[#141414] bg-white sticky top-0 z-40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
        <div className="font-bold text-xl tracking-tight cursor-pointer flex justify-between w-full sm:w-auto items-center" onClick={() => handleTabChange("overview")}>
          <span>Синхронизация</span>
          <div className="flex sm:hidden items-center gap-2 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
          </div>
        </div>
        <select 
          value={city} 
          onChange={(e) => {
            setCity(e.target.value as "spb" | "chelyabinsk");
            handleTabChange("overview");
          }}
          className="bg-gray-100 border border-gray-300 px-3 py-2 sm:py-1.5 text-sm font-medium rounded outline-none cursor-pointer hover:bg-gray-200 transition-colors w-full sm:w-auto"
        >
          <option value="spb">Санкт-Петербург (MODX)</option>
          <option value="chelyabinsk">Челябинск (WordPress)</option>
        </select>
      </div>
      <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
        <span className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
        <span>{error ? 'ОШИБКА БД' : 'БД ПОДКЛЮЧЕНА'}</span>
      </div>
    </header>
  );
};
