import React from 'react';

const tabs = ["Overview", "Markets", "News", "About", "Analytics"];

export default function TabNavigation({ activeTab, setTab }: { activeTab: string, setTab: (t: string) => void }) {
  return (
    <div className="flex items-center border-b border-[#1A1A1A] gap-6 overflow-x-auto thin-scrollbar">
      {tabs.map((tab) => (
        <button 
          key={tab}
          onClick={() => setTab(tab)}
          className={`py-3 text-[14px] font-bold transition-all duration-300 relative whitespace-nowrap ${
            activeTab === tab ? "text-white/90" : "text-white/60 hover:text-white/80"
          }`}
        >
          {tab}
          {activeTab === tab && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-t-full shadow-[0_-2px_10px_rgba(255,140,0,0.8)]" />
          )}
        </button>
      ))}
    </div>
  );
}
