import React from "react";
import { Plus, History, FolderOpen, Settings, BarChart2, X } from "lucide-react";
import { ChatSession } from "../types";

interface SidebarProps {
  currentTab: "new_chat" | "history" | "templates" | "library" | "settings" | "support";
  onTabChange: (tab: "new_chat" | "history" | "templates" | "library" | "settings" | "support") => void;
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChatClick: () => void;
  onDeleteSession: (id: string) => void;
}

export default function Sidebar({
  currentTab,
  onTabChange,
  chatSessions,
  activeSessionId,
  onSelectSession,
  onNewChatClick,
  onDeleteSession
 }: SidebarProps) {
  // Extract recent session nodes
  const recentSessions = chatSessions.slice().reverse().slice(0, 6);

  return (
    <aside id="sidebar-panel" className="hidden md:flex flex-col h-screen p-4 gap-2 bg-[#111113] text-zinc-200 border-r border-zinc-800 w-[260px] flex-shrink-0">
      
      {/* Brand Header */}
      <div className="flex flex-col gap-1 mb-6 px-1 pt-2">
        <div className="flex items-center gap-3">
          {/* Custom Atlas Logo: Simple black/dark square with a white letter 'A' */}
          <div className="w-10 h-10 rounded-lg bg-white text-zinc-955 text-slate-950 flex items-center justify-center font-extrabold text-2xl tracking-tight shadow-md">
            A
          </div>
          <div>
            <h1 className="font-sans text-lg font-black tracking-tight text-white leading-none">Atlas</h1>
            <p className="font-sans text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-1.5">Бизнес-Агент</p>
          </div>
        </div>
      </div>

      {/* Main Navigation links */}
      <nav className="flex-grow flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        
        {/* New Chat Button */}
        <button
          onClick={onNewChatClick}
          className={`rounded-lg font-bold flex items-center gap-3 px-3.5 py-2.5 transition-all cursor-pointer text-xs uppercase tracking-wider mb-4 ${
            currentTab === "new_chat" && activeSessionId === null
              ? "bg-[#2563eb] text-white shadow-md border border-blue-500"
              : "bg-zinc-800 text-zinc-350 hover:bg-zinc-700 border border-zinc-700"
          }`}
        >
          <Plus size={15} className="stroke-[2.5]" />
          <span>Новый диалог</span>
        </button>

        {/* Chat tab indicator */}
        <button
          onClick={() => onTabChange("new_chat")}
          className={`rounded-lg flex items-center gap-3 px-3 py-2.5 transition-all cursor-pointer text-xs uppercase tracking-wider font-bold ${
            currentTab === "new_chat" && activeSessionId !== null
              ? "bg-zinc-800 text-white border-l-2 border-blue-500 shadow-xs font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/80"
          }`}
        >
          <BarChart2 size={15} />
          <span>Диалог Агента</span>
        </button>

        {/* History Tab */}
        <button
          onClick={() => onTabChange("history")}
          className={`rounded-lg flex items-center gap-3 px-3 py-2.5 transition-all cursor-pointer text-xs uppercase tracking-wider font-bold ${
            currentTab === "history"
              ? "bg-zinc-800 text-white border-l-2 border-blue-500 shadow-xs font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/80"
          }`}
        >
          <History size={15} />
          <span>Все Диалоги</span>
        </button>

        {/* Files & Memory Tab (Using library slot) */}
        <button
          onClick={() => onTabChange("library")}
          className={`rounded-lg flex items-center gap-3 px-3 py-2.5 transition-all cursor-pointer text-xs uppercase tracking-wider font-bold ${
            currentTab === "library"
              ? "bg-zinc-800 text-white border-l-2 border-blue-500 shadow-xs font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/80"
          }`}
        >
          <FolderOpen size={15} />
          <span>Файлы & Память</span>
        </button>

        {/* Recent Section Header */}
        <div className="mt-6 mb-2 px-2">
          <p className="font-sans text-[9px] text-zinc-405 text-zinc-450 uppercase tracking-widest font-black">Недавние сессии</p>
        </div>

        {/* Recent lists */}
        <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto custom-scrollbar">
          {recentSessions.length > 0 ? (
            recentSessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center justify-between rounded-lg px-2 text-xs transition-all font-medium ${
                  activeSessionId === session.id
                    ? "bg-zinc-800 text-white font-bold border-l-2 border-blue-500 shadow-xs"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                }`}
              >
                <button
                  onClick={() => {
                    onSelectSession(session.id);
                    onTabChange("new_chat");
                  }}
                  className="flex-grow py-1.5 text-left truncate cursor-pointer mr-1"
                  title={session.title}
                >
                  {session.title}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Вы уверены, что хотите удалить эту сессию?")) {
                      onDeleteSession(session.id);
                    }
                  }}
                  className="flex-shrink-0 p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-700/50 cursor-pointer md:opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Удалить сессию"
                >
                  <X size={12} />
                </button>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-zinc-500 italic px-2.5 py-1">Нет активных диалогов</p>
          )}
        </div>

      </nav>

      {/* Bottom Profile Tools */}
      <div className="mt-auto border-t border-zinc-800 pt-3 flex flex-col gap-1">
        
        {/* Settings view launcher */}
        <button
          onClick={() => onTabChange("settings")}
          className={`rounded-lg flex items-center gap-3 px-3 py-2 transition-all cursor-pointer text-xs uppercase tracking-wider font-bold ${
            currentTab === "settings"
              ? "bg-zinc-800 text-white border-l-2 border-blue-500 shadow-xs font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <Settings size={15} />
          <span>Настройки</span>
        </button>

      </div>
    </aside>
  );
}
