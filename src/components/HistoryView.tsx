import React from "react";
import { History, MessageSquare, Trash2, ArrowRight } from "lucide-react";
import { ChatSession } from "../types";

interface HistoryViewProps {
  chatSessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onTabChange: (tab: "new_chat" | "history" | "templates" | "library" | "settings" | "support") => void;
}

export default function HistoryView({
  chatSessions,
  onSelectSession,
  onDeleteSession,
  onTabChange
}: HistoryViewProps) {
  // Sort sessions, newest first
  const sorted = chatSessions.slice().reverse();

  return (
    <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col items-center py-8 px-6 bg-slate-50 min-h-full">
      <div className="max-w-[800px] w-full space-y-6">
        <div>
          <h2 className="text-3xl font-bold font-headline-lg text-slate-900">История диалогов</h2>
          <p className="text-slate-500 text-sm mt-1">
            Просматривайте и возобновляйте диалоги, проводите аудит прошлых рекомендаций Atlass.
          </p>
        </div>

        {sorted.length > 0 ? (
          <div className="space-y-3">
            {sorted.map(session => {
              const userMessagesOnly = session.messages.filter(m => m.sender === "user");
              const lastSnippet = userMessagesOnly.length > 0 
                ? userMessagesOnly[userMessagesOnly.length - 1].text 
                : "Новый неначатый диалог";

              return (
                <div
                  key={session.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex justify-between items-center hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex gap-4 items-start min-w-0">
                    <div className="w-10 h-10 bg-[#eff4ff] text-[#0058be] border border-[#d3e4fe] rounded-lg flex items-center justify-center flex-shrink-0">
                      <MessageSquare size={18} />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h3 className="font-bold text-slate-800 text-base truncate max-w-[420px]">
                        {session.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium font-sans">
                        Создан: {session.createdAt} • Сообщений: {session.messages.length}
                      </p>
                      <p className="text-xs text-slate-500 truncate italic max-w-[420px]">
                        Последнее: "{lastSnippet}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onSelectSession(session.id);
                        onTabChange("new_chat");
                      }}
                      className="bg-slate-100 hover:bg-[#d3e4fe] hover:text-[#0058be] text-slate-600 px-3.5 py-2 rounded-lg text-xs font-bold font-sans cursor-pointer transition-all flex items-center gap-1"
                    >
                      Открыть
                      <ArrowRight size={13} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Вы уверены, что хотите удалить диалог "${session.title}"?`)) {
                          onDeleteSession(session.id);
                        }
                      }}
                      className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Удалить сессию"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-xl">
            <History size={36} className="mx-auto text-slate-300 mb-2.5" />
            <p className="text-slate-500 font-semibold text-sm">История диалогов пуста</p>
            <p className="text-slate-400 text-xs mt-1">Начните свой первый диалог с Atlass на главной вкладке.</p>
          </div>
        )}
      </div>
    </div>
  );
}
