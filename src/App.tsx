import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { ChatSession, Message } from "./types";

// Import Custom Views
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import HistoryView from "./components/HistoryView";
import LibraryView from "./components/LibraryView";
import SettingsView from "./components/SettingsView";

// Initial professional business dialogue matching the Atlas AI consultant persona
const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "sess-1",
    title: "Аудит конкурентов Q4",
    createdAt: "2026-06-15 10:00",
    messages: [
      {
        id: "m-1",
        sender: "user",
        text: "Сделай аудит конкурентов по файлу q4_market_competitors.txt и выведи краткие уязвимости.",
        timestamp: "10:00"
      },
      {
        id: "m-2",
        sender: "ai",
        text: "Проанализировал базу данных конкурентов в файле `q4_market_competitors.txt` на VPS сервере. Выделил ключевые технологические уязвимости для вашей коммерческой стратегии:\n\n1. **ООО \"АльфаДирект\"**\n   - *Уязвимость:* Крайне медленная выгрузка аналитики и отсутствие API. Мы можем выиграть за счет мгновенной интеграции веб-хуков.\n\n2. **ГК \"Вектор Плюс\"**\n   - *Уязвимость:* Зависимость от зарубежного софта. Будут испытывать трудности на отечественных серверах.\n\n3. **ФинТех Решения (FT-Labs)**\n   - *Уязвимость:* Сложный интерфейс, перегруженный терминальными элементами. Наша стратегия — сделать чистый плоский дизайн.\n\n*Рекомендация:* Сфокусироваться на клиентах АльфаДирект, предложив им открытый JSON API.",
        timestamp: "10:01",
        metrics: {
          selectedModel: "DeepSeek-R1 (Reasoner)",
          category: "Research",
          routingRationale: "Задан вопрос по стратегическому рыночному анализу конкурентов. Использована модель глубокого понимания DeepSeek.",
          costEstimateRub: 0.15,
          costEstimateUsd: 0.0016,
          promptTokens: 1100,
          completionTokens: 850,
          thoughtChain: "1. Прочитать файл q4_market_competitors.txt.\n2. Выделить сайты, телефоны и слабые места.\n3. Сравнить сложность интерфейса FT-Labs и отсутствие API у АльфаДирект.\n4. Написать объективные рекомендации без лишних вежливых заполнителей.",
          criticEvaluation: "Ответ проверен. Тон строго профессиональный, факты сверены с VPS базой."
        },
        filesManipulated: [
          { name: "q4_market_competitors.txt", action: "read" }
        ]
      }
    ]
  },
  {
    id: "sess-2",
    title: "Синтаксис Seaborn графиков",
    createdAt: "2026-06-15 14:10",
    messages: [
      {
        id: "m-3",
        sender: "user",
        text: "Создай скрипт визуализации для VPS без графического UI.",
        timestamp: "14:10"
      },
      {
        id: "m-4",
        sender: "ai",
        text: "Для запуска рендеринга графиков в докере на удаленном сервере без графической оболочки (X11) используется бэкенд matplotlib 'Agg'. Скрипт успешно сохранен.\n\n```python\nimport matplotlib\nmatplotlib.use('Agg') # Исключает ошибку Tcl/Tk\nimport matplotlib.pyplot as plt\nimport seaborn as sns\nimport pandas as pd\n\n# Загрузка аналитики\ndf = pd.DataFrame({'ROI': [12.4, 15.1, 18.2, 22.4]})\nsns.kdeplot(data=df, x='ROI', fill=True)\nplt.savefig('/root/data/workfiles/kde_distribution.png', dpi=300)\nprint('Успешно экспортировано в /root/data/workfiles/kde_distribution.png')\n```",
        timestamp: "14:11",
        metrics: {
          selectedModel: "Claude 3.5 Sonnet",
          category: "Coding",
          routingRationale: "Кодовый вопрос по Python, Docker и matplotlib Agg. Маршрутизировано в Claude 3.5 Sonnet.",
          costEstimateRub: 1.95,
          costEstimateUsd: 0.021,
          promptTokens: 450,
          completionTokens: 620,
          thoughtChain: "1. Определить бэкенд вывода изображений без GUI.\n2. Написать чистый код matplotlib.use('Agg').\n3. Сохранить файл графиков в рабочем VPS каталоге.",
          criticEvaluation: "Критик: Код полностью рабочий, проверен на импорты, синтаксических ошибок нет."
        }
      }
    ]
  }
];

export default function App() {
  // Tab routing
  const [currentTab, setCurrentTab] = useState<"new_chat" | "history" | "templates" | "library" | "settings" | "support">("new_chat");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core states
  const [userName, setUserName] = useState<string>("Директор");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Initialize and load from cache
  useEffect(() => {
    const savedName = localStorage.getItem("atlas_username");
    if (savedName) setUserName(savedName);

    const loadSessions = async () => {
      try {
        const res = await fetch("/api/sessions");
        if (res.ok) {
          const sessions = await res.json();
          if (sessions && sessions.length > 0) {
            setChatSessions(sessions);
          } else {
            // Seed the server database with initial templates if empty
            setChatSessions(INITIAL_SESSIONS);
            for (const s of INITIAL_SESSIONS) {
              await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(s)
              });
            }
          }
        } else {
          setChatSessions(INITIAL_SESSIONS);
        }
      } catch (err) {
        console.error("Failed to fetch sessions from server:", err);
        // Fallback to offline localStorage
        const savedSessions = localStorage.getItem("atlas_sessions");
        if (savedSessions) {
          setChatSessions(JSON.parse(savedSessions));
        } else {
          setChatSessions(INITIAL_SESSIONS);
        }
      }
    };
    loadSessions();
  }, []);

  const saveSessionsToCache = (newSessions: ChatSession[], sessionToSync?: ChatSession) => {
    setChatSessions(newSessions);
    localStorage.setItem("atlas_sessions", JSON.stringify(newSessions));
    
    if (sessionToSync) {
      fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionToSync)
      }).catch(err => console.error("Failed to sync session on server:", err));
    }
  };

  const handleUserNameChange = (newName: string) => {
    setUserName(newName);
    localStorage.setItem("atlas_username", newName);
  };

  const handleClearSessions = async () => {
    const sessionsToRemove = [...chatSessions];
    setChatSessions([]);
    localStorage.setItem("atlas_sessions", JSON.stringify([]));
    setActiveSessionId(null);
    for (const s of sessionsToRemove) {
      try {
        await fetch(`/api/sessions/${s.id}`, { method: "DELETE" });
      } catch (err) {
        console.error("Failed to delete session on server during cleanup:", err);
      }
    }
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setIsMobileSidebarOpen(false);
  };

  const handleDeleteSession = async (id: string) => {
    const filtered = chatSessions.filter(s => s.id !== id);
    setChatSessions(filtered);
    localStorage.setItem("atlas_sessions", JSON.stringify(filtered));
    if (activeSessionId === id) setActiveSessionId(null);
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete session on server:", err);
    }
  };

  const handleNewChatClick = () => {
    setActiveSessionId(null);
    setCurrentTab("new_chat");
    setIsMobileSidebarOpen(false);
  };

  const handleSendMessage = async (
    text: string, 
    imageFile?: { data: string; mimeType: string; name: string } | null
  ) => {
    setIsLoading(true);

    let sessionToUse: ChatSession;
    let updatedSessions = [...chatSessions];

    // Create session dynamically if none is active
    if (!activeSessionId) {
      const newSessId = "sess-" + Date.now();
      const firstLineWords = text.trim().split(" ");
      const titleCandidate = firstLineWords.slice(0, 4).join(" ") + (firstLineWords.length > 4 ? "..." : "");

      sessionToUse = {
        id: newSessId,
        title: titleCandidate || "Бизнес-Диалог",
        createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        messages: []
      };

      updatedSessions.push(sessionToUse);
      setActiveSessionId(newSessId);
    } else {
      sessionToUse = updatedSessions.find(s => s.id === activeSessionId)!;
    }

    // Append user message
    const userMsgId = "msg-" + Date.now();
    const newUserMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: text,
      timestamp: new Date().toLocaleTimeString().substring(0, 5),
      imageUrl: imageFile ? `data:${imageFile.mimeType};base64,${imageFile.data}` : undefined,
      attachmentName: imageFile ? imageFile.name : undefined
    };

    sessionToUse.messages = [...sessionToUse.messages, newUserMsg];
    // Sync update to server
    saveSessionsToCache(updatedSessions, sessionToUse);

    try {
      // Gather relevant trailing context excerpt
      const historyExcerpt = sessionToUse.messages.slice(0, -1).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      // Call Express server-side agent endpoint with session separation
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionToUse.id,
          history: historyExcerpt,
          image: imageFile ? { data: imageFile.data, mimeType: imageFile.mimeType } : null,
          attachmentName: imageFile?.name || null
        })
      });

      if (!response.ok) {
        throw new Error("Не удалось получить ответ от сервера API");
      }

      const replyData = await response.json();

      // Append AI message
      const aiMsgId = "msg-" + (Date.now() + 1);
      const newAiMsg: Message = {
        id: aiMsgId,
        sender: "ai",
        text: replyData.text || "Анализ завершен.",
        timestamp: new Date().toLocaleTimeString().substring(0, 5),
        metrics: replyData.metrics || undefined,
        filesManipulated: replyData.filesManipulated || undefined
      };

      sessionToUse.messages = [...sessionToUse.messages, newAiMsg];
      // Sync update to server
      saveSessionsToCache([...updatedSessions], sessionToUse);

    } catch (err: any) {
      console.error(err);
      const aiErrId = "msg-" + (Date.now() + 1);
      const errorMsg: Message = {
        id: aiErrId,
        sender: "ai",
        text: "Произошла ошибка связи с сервером VPS. Пожалуйста, запустите повторный вызов или проверьте логи роутера.",
        timestamp: new Date().toLocaleTimeString().substring(0, 5)
      };
      sessionToUse.messages = [...sessionToUse.messages, errorMsg];
      saveSessionsToCache([...updatedSessions], sessionToUse);
    } finally {
      setIsLoading(false);
    }
  };

  const activeSessionObj = chatSessions.find(s => s.id === activeSessionId) || null;

  return (
    <div id="app-root-container" className="bg-[#f8f9ff] text-slate-900 h-screen flex overflow-hidden font-sans text-sm selection:bg-blue-100 selection:text-blue-900">
      
      {/* Sidebar (Desktop) */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        chatSessions={chatSessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChatClick={handleNewChatClick}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main Content Pane */}
      <main id="app-viewport-pane" className="flex-grow flex flex-col h-full relative bg-white border-l border-slate-200">
        
        {/* Mobile Slide-out Drawer */}
        {isMobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            {/* Drawer body */}
            <div className="relative flex flex-col w-[260px] max-w-xs h-full bg-[#18181b] text-zinc-200 p-4 gap-2 shadow-xl border-r border-zinc-800">
              <div className="flex justify-between items-center mb-6 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-white text-zinc-950 flex items-center justify-center font-black text-lg">
                    A
                  </div>
                  <span className="font-sans font-bold text-white text-base">Atlas</span>
                </div>
                <button 
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sidebar Navigation */}
              <nav className="flex-grow flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                <button
                  onClick={handleNewChatClick}
                  className="rounded-lg font-bold flex items-center gap-3 px-3.5 py-2.5 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 text-xs uppercase tracking-wider mb-4 cursor-pointer"
                >
                  <span>Новый Диалог</span>
                </button>

                <button
                  onClick={() => { setCurrentTab("new_chat"); setIsMobileSidebarOpen(false); }}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-3 px-3 py-2 rounded text-xs uppercase tracking-wider font-bold cursor-pointer"
                >
                  <span>Диалог Агента</span>
                </button>

                <button
                  onClick={() => { setCurrentTab("history"); setIsMobileSidebarOpen(false); }}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-3 px-3 py-2 rounded text-xs uppercase tracking-wider font-bold cursor-pointer"
                >
                  <span>Все Диалоги</span>
                </button>

                <button
                  onClick={() => { setCurrentTab("library"); setIsMobileSidebarOpen(false); }}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-3 px-3 py-2 rounded text-xs uppercase tracking-wider font-bold cursor-pointer"
                >
                  <span>Файлы & Память</span>
                </button>

                <button
                  onClick={() => { setCurrentTab("settings"); setIsMobileSidebarOpen(false); }}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-3 px-3 py-2 rounded text-xs uppercase tracking-wider font-bold mt-auto cursor-pointer"
                >
                  <span>Настройки</span>
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Floating Mobile Hamburger */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden fixed bottom-4 right-4 z-45 bg-slate-900 text-white p-3.5 rounded-full shadow-lg hover:scale-105 transition-transform cursor-pointer"
        >
          <Menu size={20} />
        </button>

        {/* Dynamic Route Switching */}
        {currentTab === "new_chat" && (
          <ChatArea
            session={activeSessionObj}
            userName={userName}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        )}

        {currentTab === "history" && (
          <HistoryView
            chatSessions={chatSessions}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onTabChange={setCurrentTab}
          />
        )}

        {currentTab === "library" && (
          <LibraryView
            activeSession={activeSessionObj}
          />
        )}

        {currentTab === "settings" && (
          <SettingsView
            userName={userName}
            onChangeUserName={handleUserNameChange}
            onClearChats={handleClearSessions}
          />
        )}

      </main>
    </div>
  );
}
