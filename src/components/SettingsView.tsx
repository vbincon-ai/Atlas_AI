import React, { useState } from "react";
import { User, Cpu, Trash2, ShieldCheck, Server, Key, FolderOpen } from "lucide-react";

interface SettingsViewProps {
  userName: string;
  onChangeUserName: (name: string) => void;
  onClearChats: () => void;
}

export default function SettingsView({
  userName,
  onChangeUserName,
  onClearChats
}: SettingsViewProps) {
  const [typedName, setTypedName] = useState(userName);
  const [routerKeyInput, setRouterKeyInput] = useState(
    "••••••••••••••••••••••••"
  );
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeUserName(typedName);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col items-center py-8 px-6 bg-slate-50 min-h-full font-sans">
      <div className="max-w-[800px] w-full space-y-6">
        <div>
          <h2 className="text-3xl font-bold font-headline-lg text-slate-900 tracking-tight">Параметры Atlas</h2>
          <p className="text-slate-500 text-sm mt-1">
            Конфигурация параметров работы ассистента, управление токенами Router AI и дисковой директорией.
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <User className="text-slate-800" size={18} />
            <h3 className="font-bold text-slate-800 text-sm">Профиль директора</h3>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Ваше имя (для обращения)</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="flex-grow bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Введите имя..."
                />
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  Обновить профиль
                </button>
              </div>
            </div>
            {isSaved && (
              <p className="text-emerald-600 font-semibold text-xs flex items-center gap-1 animate-fade-in">
                ✓ Профиль успешно обновлен! Имя изменено на "{typedName}".
              </p>
            )}
          </form>
        </div>

        {/* VPS & Docker configuration stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Server className="text-slate-800" size={18} />
            <h3 className="font-bold text-slate-800 text-sm">Среда окружения и Хост VPS</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Директория хранения файлов</span>
              <p className="text-xs font-bold text-slate-800 mt-1">/root/data/workfiles</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                Биндинг внешнего линка Docker (`docker run -v /root/data/workfiles:/root/data/workfiles`) настроен.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Память транзакций</span>
              <p className="text-xs font-bold text-slate-800 mt-1">Серверный стек метаданных (.json)</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                Сессионные выжимки фактов и целей хранятся на диске хоста с изоляцией по ID диалога.
              </p>
            </div>
          </div>
        </div>

        {/* Router AI Config info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Cpu className="text-slate-800" size={18} />
            <h3 className="font-bold text-slate-800 text-sm font-sans">Регулятор балансировки Router AI</h3>
          </div>

          <div className="space-y-3 font-sans text-xs">
            <div className="flex justify-between items-center bg-slate-50 p-3.5 border border-slate-200 rounded-lg">
              <div>
                <p className="font-bold text-slate-800">API Шлюз Router AI:</p>
                <p className="font-mono text-[11px] text-blue-600 mt-0.5">https://routerai.ru/api/v1</p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-mono tracking-wider uppercase font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Active Proxy
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Key size={13} className="text-slate-500" />
                <span>ROUTER_AI_API_KEY</span>
              </div>
              <input
                type="text"
                disabled
                value={routerKeyInput}
                className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 font-mono text-slate-400 text-xs cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 leading-normal">
                Ключ автоматически загружен из переменных окружения VPS системы. Логика роутера активна.
              </p>
            </div>
          </div>
        </div>

        {/* Purges */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-red-650 pb-2 border-b border-slate-100">
            <Trash2 size={18} className="text-red-500" />
            <h3 className="font-bold text-red-600 text-sm">Сброс данных</h3>
          </div>
          <p className="text-slate-500 text-xs leading-normal">
            Очистка всех сохраненных историй диалогов и локальных кэшей. Это сбросит память ассистента до начального состояния.
          </p>
          <button
            onClick={() => {
              if (confirm("Вы действительно хотите полностью сбросить локальную и сессионную память ассистента?")) {
                onClearChats();
                alert("Базы данных успешно сброшены.");
              }
            }}
            className="border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 border px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Сбросить сессии и память
          </button>
        </div>

        {/* Security Info */}
        <div className="flex gap-2.5 p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-405 text-slate-400 text-[11px] leading-relaxed">
          <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-white">Стандарт защиты объективности Atlas</p>
            <p className="mt-1">
              Агент запрограммирован на предоставление исключительно подтвержденных данных. Угоднические суждения, лесть, фитнес-планнеры и посторонний потребительский спам полностью заблокированы на уровне Critic-Agent в ядре Atlas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
