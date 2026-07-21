import React from 'react';

export default function BottomActionBar({ onAction }: { onAction: (action: string) => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-[#1F1F1F] p-4 pb-6 z-[200]">
      <div className="max-w-lg mx-auto grid grid-cols-4 gap-3">
        {["Buy", "Swap", "Send", "Receive"].map((action) => (
          <button
            key={action}
            onClick={() => onAction(action.toLowerCase())}
            className="bg-[#111111] py-3.5 rounded-xl text-[13px] font-bold text-orange-500 border border-[#1F1F1F] transition-all duration-300 hover:bg-[#1a1a1a] active:scale-95 shadow-[0_4px_20px_rgba(255,140,0,0.05)] hover:shadow-[0_0_20px_rgba(255,140,0,0.15)]"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}
