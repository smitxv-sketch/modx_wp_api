import React from 'react';

interface EntityCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  onClick: () => void;
}

export const EntityCard: React.FC<EntityCardProps> = ({ title, count, icon, onClick }) => (
  <div onClick={onClick} className="p-4 sm:p-6 border border-[#141414] bg-white cursor-pointer hover:bg-gray-50 transition-colors group flex flex-col justify-between h-28 sm:h-32 rounded-lg sm:rounded-none">
    <div className="flex justify-between items-start">
      <h3 className="text-base sm:text-lg font-bold">{title}</h3>
      <div className="opacity-40 group-hover:text-blue-600 transition-colors">{icon}</div>
    </div>
    <p className="text-2xl sm:text-3xl font-mono">{count}</p>
  </div>
);
