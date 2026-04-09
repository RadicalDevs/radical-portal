"use client";

import { useState, type ReactNode } from "react";

interface Tab {
  key: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.key);

  const activeContent = tabs.find((t) => t.key === activeTab)?.content;

  return (
    <div>
      <div className="flex gap-1 border-b border-surface-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? "text-smaragd"
                : "text-body hover:text-heading"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-smaragd" />
            )}
          </button>
        ))}
      </div>
      <div className="pt-6">{activeContent}</div>
    </div>
  );
}
