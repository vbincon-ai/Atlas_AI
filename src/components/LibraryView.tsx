import React, { useState, useEffect } from "react";
import { 
  FolderOpen, 
  FileText, 
  Trash2, 
  Download, 
  RefreshCw, 
  Database, 
  Plus, 
  Eye, 
  X, 
  Brain, 
  Award, 
  TrendingUp, 
  Globe, 
  Sparkles,
  FileCode,
  Check
} from "lucide-react";
import { ChatSession, WorkFile } from "../types";

interface LibraryViewProps {
  activeSession: ChatSession | null;
}

export default function LibraryView({ activeSession }: LibraryViewProps) {
  const [files, setFiles] = useState<WorkFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string; content: string } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Create File State
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [createSuccess, setCreateSuccess] = useState(false);

  // Load files from backend
  const loadFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch("/api/workfiles");
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error("Failed to load workfiles", err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handlePreviewFile = async (fileName: string) => {
    setIsLoadingPreview(true);
    try {
      const res = await fetch("/api/workfiles/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fileName })
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewFile({ name: fileName, content: data.content });
      } else {
        alert("Не удалось прочитать файл");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm(`Вы действительно хотите удалить файл "${fileName}" из папки /root/data/workfiles?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/workfiles/${encodeURIComponent(fileName)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.name !== fileName));
        if (previewFile?.name === fileName) setPreviewFile(null);
      } else {
        alert("Не удалось удалить файл");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    
    // Add extension if not present
    let finalName = newFileName.trim();
    if (!finalName.includes(".")) {
      finalName += ".txt";
    }

    try {
      const res = await fetch("/api/workfiles/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: finalName, content: newFileContent })
      });

      if (res.ok) {
        setCreateSuccess(true);
        setNewFileName("");
        setNewFileContent("");
        loadFiles();
        setTimeout(() => {
          setCreateSuccess(false);
          setIsCreatingFile(false);
        }, 1200);
      } else {
        alert("Ошибка сохранения файла");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Б";
    const k = 1024;
    const sizes = ["Б", "КБ", "МБ"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col bg-slate-50 min-h-full font-sans">
      
      {/* Top Header */}
      <div className="border-b border-slate-200 bg-white px-8 py-5 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Database size={24} className="text-slate-800" />
            Рабочая среда Atlass
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Доступ к файловой системе сервера за пределами Docker-контейнера в каталоге <span className="font-mono bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-bold">/root/data/workfiles</span>
          </p>
        </div>
        <button
          onClick={loadFiles}
          disabled={isLoadingFiles}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-bold text-slate-700 rounded-lg cursor-pointer disabled:opacity-60"
        >
          <RefreshCw size={12} className={isLoadingFiles ? "animate-spin" : ""} />
          Обновить
        </button>
      </div>

      {/* Main Grid: Centered Files storage (max-w-[800px] matching SettingsView) */}
      <div className="p-8 max-w-[800px] w-full mx-auto space-y-5">
        
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-800 text-base tracking-tight flex items-center gap-2">
              <FolderOpen size={18} className="text-blue-600" />
              Файловое Хранилище (/root/data/workfiles)
            </h3>
            <button
              onClick={() => setIsCreatingFile(!isCreatingFile)}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold text-xs rounded-md cursor-pointer shadow-sm"
            >
              <Plus size={13} />
              Создать файл
            </button>
          </div>

          {/* Create File Pane */}
          {isCreatingFile && (
            <form onSubmit={handleCreateFile} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>Создание нового файла на сервере</span>
                <button type="button" onClick={() => setIsCreatingFile(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={15} />
                </button>
              </div>
              <div>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Название (например: competitors_list.txt)"
                  className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>
              <div>
                <textarea
                  required
                  rows={4}
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  placeholder="Введите текстовое или markdown содержимое отчета/базы данных..."
                  className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500 font-mono resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingFile(false)}
                  className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded flex items-center gap-1"
                >
                  {createSuccess ? <Check size={12} /> : null}
                  {createSuccess ? "Сохранено!" : "Записать в /root/data"}
                </button>
              </div>
            </form>
          )}

          {/* List of server-side files */}
          {isLoadingFiles ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-xs">
              <RefreshCw size={14} className="animate-spin" />
              Сканирование внешнего каталога...
            </div>
          ) : files.length > 0 ? (
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto custom-scrollbar">
              {files.map((file) => {
                const isCodeFile = file.name.endsWith(".py") || file.name.endsWith(".json") || file.name.endsWith(".csv");
                return (
                  <div key={file.name} className="py-3 flex justify-between items-center group first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 border ${isCodeFile ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-blue-50 border-blue-100 text-blue-700"}`}>
                        {isCodeFile ? <FileCode size={16} /> : <FileText size={16} />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate max-w-[280px]">
                          {file.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                          <span>{formatBytes(file.sizeBytes)}</span>
                          <span>•</span>
                          <span>{file.updatedAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handlePreviewFile(file.name)}
                        className="p-1 px-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                        title="Просмотреть"
                      >
                        <Eye size={12} />
                        Открыть
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.name)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Удалить файл"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50/50 border border-dashed border-slate-250 rounded-xl space-y-2">
              <FolderOpen size={32} className="mx-auto text-slate-300" />
              <p className="text-slate-700 font-bold text-xs mt-1">Папка пуста</p>
              <p className="text-slate-400 text-[10px] max-w-[320px] mx-auto leading-relaxed">
                Агент Atlass автоматически занесет сюда результаты глубокого анализа, таблицы конкурентов или текстовые отчеты, когда вы попросите его сохранить их в файл.
              </p>
            </div>
          )}
        </div>

        {/* Read Modal / Panel overlay previewer */}
        {previewFile && (
          <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800 font-mono shadow-md space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <FileText size={14} />
                {previewFile.name}
              </span>
              <button 
                onClick={() => setPreviewFile(null)} 
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="text-xs leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar whitespace-pre-wrap bg-slate-950 p-4 border border-slate-900 rounded">
              {previewFile.content || "(Пустой файл)"}
            </div>
            <div className="flex justify-end text-[10px] text-slate-400">
              Путь на VPS: /root/data/workfiles/{previewFile.name}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
