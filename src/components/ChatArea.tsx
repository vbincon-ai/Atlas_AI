import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Paperclip, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  X, 
  Database, 
  Cpu, 
  Sparkles, 
  ShieldCheck, 
  CornerDownRight, 
  Terminal, 
  FileText,
  FileCheck
} from "lucide-react";
import { Message, ChatSession } from "../types";

interface ChatAreaProps {
  session: ChatSession | null;
  userName: string;
  onSendMessage: (text: string, image?: { data: string; mimeType: string; name: string } | null) => void;
  isLoading: boolean;
}

export default function ChatArea({
  session,
  userName,
  onSendMessage,
  isLoading
}: ChatAreaProps) {
  const [inputText, setInputText] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Show / hide thinking segments by ID
  const [expandedThoughtIds, setExpandedThoughtIds] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto scroll to chat bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, isLoading]);

  // Handle Speech Recognition setup of Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "ru-RU";

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setInputText(prev => prev ? prev + " " + text : text);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      alert("Голосовой ввод не поддерживается вашим браузером. Пожалуйста, используйте Google Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim() && !attachedFile) return;
    onSendMessage(inputText, attachedFile);
    setInputText("");
    setAttachedFile(null);
  };

  // Keyboard shortcut (Enter to send, Shift+Enter to newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle attachment upload helper ( FileReader )
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const processFile = (file: File | undefined) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = (event.target?.result as string).split(",")[1];
      setAttachedFile({
        data: base64String,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const toggleThoughts = (msgId: string) => {
    setExpandedThoughtIds(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const isSessionEmpty = !session || session.messages.length === 0;

  return (
    <div 
      className={`flex-grow flex flex-col h-full bg-slate-50 relative ${isDragging ? "brightness-95 border-2 border-dashed border-blue-600" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay badge indicator */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center font-bold text-blue-700 pointer-events-none z-10">
          <Sparkles className="animate-bounce mr-2" /> Перетащите файлы сюда для загрузки в сессию Atlas
        </div>
      )}

      {/* Top Header mobile-only layout */}
      <header className="md:hidden flex justify-between items-center w-full px-4 h-14 bg-slate-900 border-b border-slate-800 sticky top-0 z-20 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-white text-slate-900 flex items-center justify-center font-black text-sm">
            A
          </div>
          <span className="font-bold text-white text-sm">Atlas</span>
        </div>
        <div className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
          Бизнес-Агент
        </div>
      </header>

      {/* Message Feed Area */}
      <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col items-center py-6 px-4 md:px-6">
        <div className="max-w-[800px] w-full flex flex-col gap-6">
          
          {/* Fallback starting greetings bubble if session has no message history */}
          {isSessionEmpty ? (
            <div className="flex flex-col gap-2 self-start max-w-[90%]">
              <div className="flex items-center gap-2 px-1">
                <div className="w-6 h-6 rounded bg-slate-950 text-white text-[11px] flex items-center justify-center font-bold">
                  A
                </div>
                <span className="font-sans text-xs font-bold text-slate-900">Atlas</span>
              </div>
              <div className="bg-white text-slate-800 border border-slate-200 p-5 rounded-xl rounded-tl-none shadow-sm text-sm leading-relaxed space-y-3">
                <p>
                  Приветствую! Я — **Atlas**, ваш выделенный консультант по принятию обоснованных бизнес-решений.
                </p>
                <p className="text-slate-500 text-xs">
                  Моя архитектура настроена на глубокие исследования рынков, составление точных баз знаний, анализ конкурентов и автоматизированную запись документов во внешнее хранилище VPS серверов.
                </p>
                <div className="pt-2 flex gap-1.5 flex-wrap">
                  <span className="bg-slate-100 text-slate-800 border border-slate-200 font-sans text-[10px] px-2 py-0.5 rounded font-bold">
                    ✓ Мониторинг /root/data/workfiles активен
                  </span>
                  <span className="bg-slate-100 text-slate-850 border border-slate-200 font-sans text-[10px] px-2 py-0.5 rounded font-bold">
                    ✓ Шлюз Router AI подключен
                  </span>
                </div>
              </div>
            </div>
          ) : (
            session.messages.map((msg) => {
              const isUser = msg.sender === "user";
              
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-2 max-w-[90%] ${isUser ? "self-end" : "self-start"}`}
                >
                  {/* Sender title display (AI only) */}
                  {!isUser && (
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-6 h-6 rounded bg-slate-950 text-white text-[11px] flex items-center justify-center font-bold">
                        A
                      </div>
                      <span className="font-sans text-xs font-bold text-slate-900">Atlas</span>
                      {msg.metrics?.selectedModel && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded font-mono font-medium">
                          {msg.metrics.selectedModel}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Main Bubble body */}
                  <div
                    className={`p-4 rounded-xl shadow-sm text-sm leading-relaxed ${
                      isUser
                        ? "bg-slate-900 text-white rounded-tr-none"
                        : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                    }`}
                  >
                    {/* Embedded image preview details */}
                    {msg.imageUrl && (
                      <div className="mb-3 rounded overflow-hidden max-w-sm border border-slate-200 bg-slate-100 max-h-[180px]">
                        <img 
                          src={msg.imageUrl} 
                          alt="Attached element" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Attachment name indicator if file attached */}
                    {msg.attachmentName && (
                      <div className="mb-2 bg-slate-100 inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-slate-600 font-sans border border-slate-200">
                        <Paperclip size={12} className="text-slate-400" />
                        <span>{msg.attachmentName}</span>
                      </div>
                    )}

                    {/* Main message text */}
                    {isUser ? (
                      <div className="whitespace-pre-wrap font-sans text-white text-sm">
                        {msg.text}
                      </div>
                    ) : (
                      <div className="prose prose-sm whitespace-pre-wrap font-sans text-slate-800">
                        {msg.text}
                      </div>
                    )}

                    {/* Files Manipulated Logs badge */}
                    {msg.filesManipulated && msg.filesManipulated.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Файловые операции на VPS</span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.filesManipulated.map((f, idx) => (
                            <span key={idx} className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-sans text-[10px] px-2 py-0.5 rounded font-extrabold flex items-center gap-1">
                              <FileCheck size={10} />
                              {f.action === 'write' ? 'запись на диск' : 'прочитано с VPS'}: {f.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })
          )}

          {/* AI Loader bubble during streaming or generation wait */}
          {isLoading && (
            <div className="flex flex-col gap-2 self-start max-w-[90%]">
              <div className="flex items-center gap-2 px-1">
                <div className="w-6 h-6 rounded bg-slate-900 text-white text-[11px] flex items-center justify-center font-bold">
                  A
                </div>
                <span className="font-sans text-xs font-bold text-slate-900">Atlas</span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl rounded-tl-none flex items-center gap-2.5 shadow-sm">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 bg-slate-800 rounded-full animate-bounce delay-100"></span>
                  <span className="w-2.5 h-2.5 bg-slate-800 rounded-full animate-bounce delay-200"></span>
                  <span className="w-2.5 h-2.5 bg-slate-800 rounded-full animate-bounce delay-300"></span>
                </div>
                <span className="text-xs text-slate-400 font-bold italic font-sans flex items-center gap-1">
                  Обработка запроса ассистентом...
                </span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>
      </div>

      {/* Suggested chips & prompt text container */}
      <div className="w-full flex justify-center pb-6 pt-2 px-4 md:px-6 bg-slate-50 border-t border-slate-200/50">
        <div className="max-w-[800px] w-full flex flex-col gap-3">
          
          {/* Quick chips container */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setInputText("Подготовь и сгенерируй PDF отчет на основе имеющихся данных")}
              className="whitespace-nowrap px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors text-xs font-bold cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span>📄 Прислать или сгенерировать PDF</span>
            </button>
          </div>

          {/* Active Custom Input Container */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 focus-within:ring-1 focus-within:ring-slate-400 focus-within:border-slate-400 transition-all shadow-sm">
            
            {/* Miniature thumbnail preview if file attached */}
            {attachedFile && (
              <div className="mx-2 my-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg inline-flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-bold text-slate-600 max-w-[120px] truncate">
                  📎 {attachedFile.name}
                </span>
                <span className="text-[10px] text-blue-600 font-extrabold font-mono">
                  ({attachedFile.mimeType.split("/")[1].toUpperCase()})
                </span>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-0.5 rounded cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Main input text field */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-none outline-none focus:ring-0 resize-none px-3 pt-2 text-slate-800 text-sm placeholder:text-slate-400 min-h-[50px] font-normal leading-relaxed"
              placeholder="Задайте вопрос ассистенту Atlas..."
              rows={1}
            />

            {/* Bottom auxiliary control panel */}
            <div className="flex justify-between items-center px-1.5 pt-2 border-t border-slate-100">
              
              {/* Media attach icons */}
              <div className="flex gap-0.5">
                
                {/* Paperclip attach file */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Прикрепить файл"
                >
                  <Paperclip size={16} />
                </button>

                {/* Microphone Speech helper */}
                <button 
                  onClick={handleMicClick}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    isListening 
                      ? "text-red-600 bg-red-50 animate-pulse" 
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  title={isListening ? "Остановить запись" : "Голосовой ввод"}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                {/* ImageIcon picker */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Вставить графическую схему"
                >
                  <ImageIcon size={16} />
                </button>

                {/* Hidden input element */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*,application/pdf,text/plain" 
                  className="hidden" 
                />
              </div>

              {/* Send Button */}
              <button 
                onClick={handleSendMessage}
                disabled={isLoading}
                className="bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-transform active:scale-95 disabled:opacity-50 cursor-pointer shadow"
              >
                <span>Отправить</span>
                <Send size={12} className="stroke-[2.5]" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
