import React from "react";

export default function TabsBar({ tabs, activePath, onActivate, onClose }) {
  return (
    <div className="h-9 bg-[#252526] flex items-center border-b border-[#1e1e1e] overflow-x-auto">
      {tabs.map((t) => (
        <div
          key={t.path}
          className={`flex items-center h-full px-3 text-sm whitespace-nowrap border-r border-[#1e1e1e] ${
            activePath === t.path ? "border-b-2 border-[#0d6efd] text-[#e0e0e0] bg-[#1e1e1e]" : "text-[#858585] hover:text-[#e0e0e0] cursor-pointer"
          }`}
          onClick={() => onActivate(t.path)}
        >
          <span className="mr-2">{t.icon || "📄"}</span>
          <span className="truncate max-w-[180px]">{t.title}</span>
          <button
            className="ml-2 text-xs text-[#858585] hover:text-[#e0e0e0]"
            onClick={(e) => {
              e.stopPropagation();
              onClose(t.path);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}


