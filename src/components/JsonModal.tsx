import React from 'react';

interface JsonModalProps {
  selectedItem: { type: string, data: any };
  onClose: () => void;
}

export const JsonModal: React.FC<JsonModalProps> = ({ selectedItem, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-full flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100">
          <h3 className="font-bold text-lg sm:text-xl">{selectedItem.type}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 transition-colors p-2">
            ✕
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-auto bg-slate-50 flex-1">
          <pre className="font-mono text-[10px] sm:text-xs text-slate-800 whitespace-pre-wrap break-words">
            {JSON.stringify(selectedItem.data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};
