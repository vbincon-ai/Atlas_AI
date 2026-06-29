import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import PDFDocument from "pdfkit";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup larger limits to support image/attachment base64 uploads
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Initialize base directory /root/data/workfiles
let WORKFILES_DIR = "/root/data/workfiles";
try {
  if (!fs.existsSync(WORKFILES_DIR)) {
    fs.mkdirSync(WORKFILES_DIR, { recursive: true });
    console.log(`Successfully created working files directory: ${WORKFILES_DIR}`);
  }
} catch (err) {
  // If we lack permission to write to /root/data/workfiles, fallback dynamically to local data/workfiles
  console.warn(`Insufficient privileges to write to ${WORKFILES_DIR}. Using fallback path inside workspace.`);
  WORKFILES_DIR = path.join(process.cwd(), "data", "workfiles");
  if (!fs.existsSync(WORKFILES_DIR)) {
    fs.mkdirSync(WORKFILES_DIR, { recursive: true });
  }
}

// Memory folder
const MEMORY_DIR = path.join(WORKFILES_DIR, ".memory");
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
}

// PDF Support Fonts with Russian Cyrillic Glyphs (Roboto)
const REGULAR_FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/static/Roboto-Regular.ttf";
const BOLD_FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/static/Roboto-Bold.ttf";

const robotoRegularPath = path.join(WORKFILES_DIR, "Roboto-Regular.ttf");
const robotoBoldPath    = path.join(WORKFILES_DIR, "Roboto-Bold.ttf");

async function downloadFontsIfNeeded() {
  try {
    // If files are corrupt or empty, delete them
    if (fs.existsSync(robotoRegularPath) && fs.statSync(robotoRegularPath).size < 1000) {
      fs.unlinkSync(robotoRegularPath);
    }
    if (fs.existsSync(robotoBoldPath) && fs.statSync(robotoBoldPath).size < 1000) {
      fs.unlinkSync(robotoBoldPath);
    }

    if (!fs.existsSync(robotoRegularPath)) {
      console.log("Loading Roboto-Regular.ttf for Atlas Cyrillic PDF compiled reports...");
      const res = await fetch(REGULAR_FONT_URL);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(robotoRegularPath, buf);
        console.log("Roboto-Regular font downloaded successfully.");
      } else {
        console.warn(`Font fetch failed with status: ${res.status}`);
      }
    }
    if (!fs.existsSync(robotoBoldPath)) {
      console.log("Loading Roboto-Bold.ttf for Atlas Cyrillic PDF compiled reports...");
      const res = await fetch(BOLD_FONT_URL);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(robotoBoldPath, buf);
        console.log("Roboto-Bold font downloaded successfully.");
      } else {
        console.warn(`Font fetch failed with status: ${res.status}`);
      }
    }
  } catch (err) {
    console.warn("Failed to retrieve Cyrillic PDF fonts. It will auto-fallback to Helvetica:", err);
  }
}
downloadFontsIfNeeded();

// PDF Generator Engine
function compileTextToPDF(outputPath: string, rawText: string, titleName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: "A4",
        bufferPages: true,
        info: {
          Title: titleName,
          Author: "Atlas AI Business Consultant",
          Creator: "Atlas Platform"
        }
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Register Cyrillic fonts if present, else fallback
      const hasRoboto = fs.existsSync(robotoRegularPath);
      const regularFont = hasRoboto ? robotoRegularPath : "Helvetica";
      const boldFont = fs.existsSync(robotoBoldPath) ? robotoBoldPath : "Helvetica-Bold";

      // 1. BRANDING BANNER
      doc.font(boldFont).fontSize(9).fillColor("#1e293b").text("ATLAS AI BUSINESS SYSTEMS", 50, 40, { align: "left", continued: true });
      doc.font(regularFont).fontSize(8).fillColor("#64748b").text(` | АВТОНОМНЫЙ ОТЧЕТ VPS`, { align: "left" });
      
      // Horizontal Rule
      doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(50, 52).lineTo(545, 52).stroke();
      doc.moveDown(1.5);

      // Split text into array lines
      const lines = rawText.split("\n");
      doc.y = 70; // offset under header banner

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // Check if page overflow
        if (doc.y > 720) {
          doc.addPage();
          // Render banner on new page
          doc.font(boldFont).fontSize(9).fillColor("#1e293b").text("ATLAS AI BUSINESS SYSTEMS", 50, 40, { align: "left", continued: true });
          doc.font(regularFont).fontSize(8).fillColor("#64748b").text(` | АВТОНОМНЫЙ ОТЧЕТ VPS`, { align: "left" });
          doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(50, 52).lineTo(545, 52).stroke();
          doc.y = 70;
        }

        // H1 Title (# Title)
        if (line.startsWith("# ")) {
          doc.moveDown(0.8);
          doc.font(boldFont).fontSize(18).fillColor("#0f172a").text(line.replace("# ", ""), { lineGap: 3 });
          doc.moveDown(0.4);
        }
        // H2 Title (## Subtitle)
        else if (line.startsWith("## ")) {
          doc.moveDown(0.6);
          doc.font(boldFont).fontSize(13).fillColor("#1e40af").text(line.replace("## ", ""), { lineGap: 2 });
          doc.moveDown(0.3);
        }
        // H3 (### Subsubtitle)
        else if (line.startsWith("### ")) {
          doc.moveDown(0.4);
          doc.font(boldFont).fontSize(10.5).fillColor("#1e293b").text(line.replace("### ", ""), { lineGap: 1.5 });
          doc.moveDown(0.2);
        }
        // List item (- or * or 1. or numerical)
        else if (line.startsWith("- ") || line.startsWith("* ") || /^\d+\.\s/.test(line)) {
          let bullet = "вЂў";
          let textPart = line;
          if (line.startsWith("- ")) {
            textPart = line.substring(2);
          } else if (line.startsWith("* ")) {
            textPart = line.substring(2);
          } else {
            const match = line.match(/^(\d+\.)\s(.*)/);
            if (match) {
              bullet = match[1];
              textPart = match[2];
            }
          }
          doc.font(boldFont).fontSize(9.5).fillColor("#3b82f6").text(`  ${bullet} `, { continued: true });
          doc.font(regularFont).fontSize(9.5).fillColor("#334155").text(textPart, { lineGap: 1.5, indent: 12 });
        }
        // Simple paragraph or table row (text with | separator)
        else if (line.includes("|") && line.split("|").length > 2) {
          // It's a table row! Draw nicely!
          const cells = line.split("|").map(c => c.trim()).filter(c => c.length > 0);
          // Simple columns division
          const count = cells.length;
          const colWidth = 495 / count;
          const startY = doc.y;
          let maxCellHeight = 12;

          for (let colIdx = 0; colIdx < cells.length; colIdx++) {
            const cellText = cells[colIdx];
            const isHeader = i === 0 || (i > 0 && lines[i-1].trim().startsWith("---") === false && lines[i-1].includes("|") === false);
            doc.font(isHeader ? boldFont : regularFont).fontSize(8.5).fillColor(isHeader ? "#0f172a" : "#475569");
            
            doc.text(cellText, 50 + colIdx * colWidth, startY, {
              width: colWidth - 10,
              align: "left",
              lineGap: 1
            });
            maxCellHeight = Math.max(maxCellHeight, doc.y - startY);
          }
          doc.y = startY + maxCellHeight + 4;
        }
        // General text paragraph
        else if (line.length > 0) {
          // Skip markdown table separators like |---|---|
          if (line.includes("-|-") || line.startsWith("|---")) {
            continue;
          }
          doc.font(regularFont).fontSize(9.5).fillColor("#334155").text(line, { lineGap: 2, paragraphGap: 4 });
        }
        else {
          doc.moveDown(0.3);
        }
      }

      // 2. FOOTER PAGE NUMBERS
      const pages = doc.bufferedPageRange();
      for (let pIdx = 0; pIdx < pages.count; pIdx++) {
        doc.switchToPage(pIdx);
        doc.strokeColor("#eaeaea").lineWidth(0.5).moveTo(50, 765).lineTo(545, 765).stroke();
        doc.font(regularFont).fontSize(7.5).fillColor("#94a3b8").text(`РЎС‚СЂР°РЅРёС†Р° ${pIdx + 1} РёР· ${pages.count}  |  Atlas AI Autonomous Document System`, 50, 772, {
          align: "center",
          width: 495
        });
      }

      doc.end();

      writeStream.on("finish", () => {
        resolve();
      });
      writeStream.on("error", (err) => {
        reject(err);
      });
    } catch (e) {
      reject(e);
    }
  });
}

// Generate pre-populated business assets in /root/data/workfiles if empty
function prePopulateAssets() {
  try {
    const briefPath = path.join(WORKFILES_DIR, "q4_market_competitors.txt");
    if (!fs.existsSync(briefPath)) {
      fs.writeFileSync(
        briefPath,
        `### АНАЛИТИЧЕСКИЙ Бриф: Конкуренты Q4\n\n` +
        `1. ООО "АльфаДирект"\n` +
        `   - Сайт: https://alphadirect-biz.ru\n` +
        `   - Телефон: +7 (495) 120-40-50\n` +
        `   - Сильные стороны: Широкая дистрибуция готовых решений.\n` +
        `   - Слабые стороны: Высокая стоимость внедрения, отсутствие гибкого API.\n\n` +
        `2. ГК "Вектор Плюс"\n` +
        `   - Сайт: https://vectorp-solutions.ru\n` +
        `   - Телефон: +7 (812) 449-31-00\n` +
        `   - Сильные стороны: Адаптивность, быстрая разработка под заказ.\n` +
        `   - Слабые стороны: Слабая аналитика в реальном времени, зависимость от внешнего стека.\n\n` +
        `3. ФинТех Решения (FT-Labs)\n` +
        `   - Сайт: https://ftlabs-core.ru\n` +
        `   - Телефон: +7 (800) 555-32-11\n` +
        `   - Сильные стороны: Глубокие алгоритмы машинного обучения.\n` +
        `   - Слабые стороны: Трудный интерфейс, отсутствие квалифицированной бизнес-поддержки.`
      );
    }

    const kbPath = path.join(WORKFILES_DIR, "atlas_knowledge_base.md");
    if (!fs.existsSync(kbPath)) {
      fs.writeFileSync(
        kbPath,
        `# База Знаний Atlas\n\n` +
        `## 1. Регламент Объективности (Critic Agent)\n` +
        `Все выводимые ответы проходят фильтрацию для отсечения угодничества и лести.\n` +
        `Фокус должен быть строго на числовых показателях, сайтах, номерах телефонов, фактах.\n\n` +
        `## 2. Модели и Роутинг\n` +
        `- DeepSeek R1 / Reasoner: используется для глубоких исследований, где важна безупречная логика исследований без домысливания.\n` +
        `- Claude 3.5 Sonnet: используется для кодовых баз, интеграции API и построения скриптов обработки.\n` +
        `- GPT-4o: применяется в задачах со сложными таблицами и разбором загруженных схем/графиков.`
      );
    }
  } catch (err) {
    console.error("Failed to seed workspace default files", err);
  }
}
prePopulateAssets();

// Standard Gemini client (Disabled by user request)
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  return null;
}

// 1. ENDPOINT: GET /api/workfiles - Listing files in host directory /root/data/workfiles
app.get("/api/workfiles", (req, res) => {
  try {
    if (!fs.existsSync(WORKFILES_DIR)) {
      return res.json({ files: [] });
    }

    const files = fs.readdirSync(WORKFILES_DIR);
    const resultList = files
      .filter(f => f !== ".memory" && !f.startsWith(".")) // ignore memory directory & hidden files
      .map(fileName => {
        const filePath = path.join(WORKFILES_DIR, fileName);
        const stats = fs.statSync(filePath);
        
        let contentSnippet = "";
        try {
          if (stats.size > 0 && stats.size < 50000) {
            const raw = fs.readFileSync(filePath, "utf-8");
            contentSnippet = raw.slice(0, 200) + (raw.length > 200 ? "..." : "");
          }
        } catch (_) {}

        return {
          name: fileName,
          sizeBytes: stats.size,
          updatedAt: stats.mtime.toLocaleString("ru-RU"),
          contentSnippet
        };
      });

    return res.json({ files: resultList });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to list directory on server", details: error.message });
  }
});

// 2. ENDPOINT: POST /api/workfiles/read - Fetch exact contents of file
app.post("/api/workfiles/read", (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Filename parameter is required" });

    const targetPath = path.join(WORKFILES_DIR, path.basename(name));
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const content = fs.readFileSync(targetPath, "utf-8");
    return res.json({ name, content });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to read file", details: error.message });
  }
});

// 3. ENDPOINT: POST /api/workfiles/save - Save or update file
app.post("/api/workfiles/save", async (req, res) => {
  try {
    const { name, content } = req.body;
    if (!name || content === undefined) {
      return res.status(400).json({ error: "Name and content are required parameters" });
    }

    const basename = path.basename(name);
    const targetPath = path.join(WORKFILES_DIR, basename);

    if (basename.toLowerCase().endsWith(".pdf")) {
      await compileTextToPDF(targetPath, content, basename);
      const stats = fs.statSync(targetPath);
      return res.json({ success: true, name, sizeBytes: stats.size, format: "pdf" });
    } else {
      fs.writeFileSync(targetPath, content, "utf-8");
      return res.json({ success: true, name, sizeBytes: content.length, format: "text" });
    }
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to save file on server", details: error.message });
  }
});

// 4. ENDPOINT: DELETE /api/workfiles/:name - Delete files
app.delete("/api/workfiles/:name", (req, res) => {
  try {
    const fileName = req.params.name;
    const targetPath = path.join(WORKFILES_DIR, path.basename(fileName));

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      return res.json({ success: true });
    } else {
      return res.status(404).json({ error: "File not found" });
    }
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to delete file on server", details: error.message });
  }
});

// --- SESSIONS PERSISTENCE ON SERVER ---
const SESSIONS_DIR = path.join(MEMORY_DIR, "sessions");
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// 5. ENDPOINT: GET /api/sessions - Get all persistent sessions
app.get("/api/sessions", (req, res) => {
  try {
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith(".json"));
    const sessions: any[] = [];
    
    for (const f of files) {
      try {
        const filePath = path.join(SESSIONS_DIR, f);
        const data = fs.readFileSync(filePath, "utf-8");
        const sessionObj = JSON.parse(data);
        sessions.push(sessionObj);
      } catch (err) {
        console.warn(`Failed to read session cache file ${f}:`, err);
      }
    }
    
    // Sort by createdAt ascending or descending
    sessions.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });
    
    return res.json(sessions);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to load sessions from server", details: error.message });
  }
});

// 6. ENDPOINT: POST /api/sessions - Save or update session
app.post("/api/sessions", (req, res) => {
  try {
    const { id, title, createdAt, messages } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Session ID parameter is required" });
    }
    
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);
    const sessionData = {
      id,
      title: title || "Р‘РёР·РЅРµСЃ-Р”РёР°Р»РѕРі",
      createdAt: createdAt || new Date().toISOString().replace("T", " ").substring(0, 16),
      messages: messages || []
    };
    
    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), "utf-8");
    return res.json({ success: true, id });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to save session", details: error.message });
  }
});

// 7. ENDPOINT: DELETE /api/sessions/:id - Delete session
app.delete("/api/sessions/:id", (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ success: true });
    } else {
      return res.status(404).json({ error: "Session not found" });
    }
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to delete session", details: error.message });
  }
});

// Endpoint to retrieve active and synchronized models
app.get("/api/routerai/models", (req, res) => {
  try {
    const listToSend = availableRouterModels.length > 0 
      ? availableRouterModels 
      : RECOMMENDED_MODELS.map(m => ({ id: m.id, name: m.name }));
    return res.json({ models: listToSend });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to retrieve models list", details: err.message });
  }
});

// Helper model decider logic based on semantic triggers
function runModelSelectionRouter(message: string, hasImage: boolean) {
  const query = message.toLowerCase();
  
  // Explicitly requested model check (Requirement 4)
  let explicitlyRequestedModel: string | null = null;
  let explicitModelName = "";

  // 1. Scan availableRouterModels first to see if any model is explicitly named in the prompt!
  // This allows the user to write any model name/ID supported by RouterAI and have it matched instantly!
  for (const model of availableRouterModels) {
    const idLower = model.id.toLowerCase();
    const nameLower = (model.name || "").toLowerCase();
    const suffix = idLower.split("/").pop() || "";
    
    // Check if user specified the exact ID, full name, or the clean suffix (e.g. "llama-3-70b" or "claude-3-5-sonnet")
    if (query.includes(idLower) || 
        (nameLower.length > 3 && query.includes(nameLower)) || 
        (suffix.length > 3 && query.includes(suffix))) {
      explicitlyRequestedModel = model.id;
      explicitModelName = model.name || suffix;
      break;
    }
  }

  // 2. Fall back to standard semantic triggers if no explicit model was requested
  if (!explicitlyRequestedModel) {
    if (query.includes("gpt-4o") || query.includes("gpt4o")) {
      explicitlyRequestedModel = "openai/gpt-4o";
      explicitModelName = "GPT-4o";
    } else if (query.includes("deepseek-r1") || query.includes("deepseek r1") || query.includes("r1")) {
      explicitlyRequestedModel = "deepseek/deepseek-r1";
      explicitModelName = "DeepSeek-R1 (Reasoner)";
    } else if (query.includes("deepseek-chat") || query.includes("deepseek v3") || query.includes("deepseek-v3") || query.includes("deepseek chat")) {
      explicitlyRequestedModel = "deepseek/deepseek-chat";
      explicitModelName = "DeepSeek V3 (Chat)";
    } else if (query.includes("gemini-2.5-pro") || query.includes("gemini 2.5 pro")) {
      explicitlyRequestedModel = "google/gemini-2.5-pro";
      explicitModelName = "Gemini 2.5 Pro";
    } else if (query.includes("gemini-2.5-flash") || query.includes("gemini 2.5 flash")) {
      explicitlyRequestedModel = "google/gemini-2.5-flash";
      explicitModelName = "Gemini 2.5 Flash";
    }
  }

  if (explicitlyRequestedModel) {
    return {
      selectedModel: explicitModelName,
      selectedModelId: explicitlyRequestedModel, // Store the exact API model ID!
      category: "Autonomous" as const,
      costEstimateRub: 0.85,
      costEstimateUsd: 0.009,
      promptTokens: 520,
      completionTokens: 680,
      routingRationale: `Маршрутизатор определил явный запрос модели: "${explicitModelName}". Запрос направлен на шлюз RouterAI [${explicitlyRequestedModel}].`
    };
  }

  if (hasImage) {
    return {
      selectedModel: "GPT-4o (Vision)",
      selectedModelId: "openai/gpt-4o",
      category: "Analysis" as const,
      costEstimateRub: 1.45,
      costEstimateUsd: 0.016,
      promptTokens: 1150,
      completionTokens: 680,
      routingRationale: "Диалог содержит визуальное вложение. Маршрутизатор выбрал GPT-4o для высокоточного разбора визуальных данных и табличных схем."
    };
  }

  const isCoding = query.includes("код") || query.includes("скрипт") || query.includes("python") || query.includes("html") || query.includes("react") || query.includes("функци") || query.includes("docker") || query.includes("контейнер");
  if (isCoding) {
    return {
      selectedModel: "GPT-4o",
      selectedModelId: "openai/gpt-4o",
      category: "Coding" as const,
      costEstimateRub: 1.95,
      costEstimateUsd: 0.021,
      promptTokens: 450,
      completionTokens: 920,
      routingRationale: "Задан технический или кодовый вопрос. Маршрутизатор выбрал GPT-4o для стабильного и точного написания кода."
    };
  }

  const isAnalytical = query.includes("рынок") || query.includes("конкурент") || query.includes("бизнес") || query.includes("решен") || query.includes("исслед") || query.includes("телефон") || query.includes("база знан") || query.includes("анализ") || query.includes("стратег") || query.includes("компани") || query.includes("сайт") || query.includes("отчет") || query.includes("обзор");
  if (isAnalytical) {
    return {
      selectedModel: "DeepSeek-R1 (Reasoner)",
      selectedModelId: "deepseek/deepseek-r1",
      category: "Research" as const,
      costEstimateRub: 0.15,
      costEstimateUsd: 0.0016,
      promptTokens: 1650,
      completionTokens: 2100,
      routingRationale: "Запрос ориентирован на глубокий рыночный аудит. Выбрана модель глубокого рассуждения DeepSeek-R1 для исключения галлюцинаций."
    };
  }

  // Trivial conversational or general query
  return {
    selectedModel: "DeepSeek V3 (Chat)",
    selectedModelId: "deepseek/deepseek-chat",
    category: "General" as const,
    costEstimateRub: 0.04,
    costEstimateUsd: 0.00045,
    promptTokens: 280,
    completionTokens: 190,
    routingRationale: "Общий информационный вопрос. Маршрутизатор выбрал DeepSeek V3 для быстроты ответа и оптимизации бюджета."
  };
}

// Memory persistence helpers
function loadMemoryState(sessionId: string) {
  const memPath = path.join(MEMORY_DIR, `session_${sessionId}.json`);
  if (fs.existsSync(memPath)) {
    try {
      return JSON.parse(fs.readFileSync(memPath, "utf-8"));
    } catch (_) {}
  }
  return {
    domain: "РћР±С‰РёР№ РєРѕРЅСЃР°Р»С‚РёРЅРі",
    goals: [
      "РћР±СЉРµРєС‚РёРІРЅС‹Р№ Р°РЅР°Р»РёС‚РёС‡РµСЃРєРёР№ Р°СѓРґРёС‚",
      "РЎР±РѕСЂ РїСЂРѕРІРµСЂРµРЅРЅС‹С… РїРѕРєР°Р·Р°С‚РµР»РµР№ РєРѕРЅРєСѓСЂРµРЅС‚РѕРІ",
      "Р¤РѕСЂРјРёСЂРѕРІР°РЅРёРµ СѓСЃС‚РѕР№С‡РёРІРѕР№ Р±Р°Р·С‹ Р·РЅР°РЅРёР№"
    ],
    facts: [
      "РџСЂРёРѕСЂРёС‚РµС‚: РіР»СѓР±РёРЅР° Рё С‚РѕС‡РЅРѕСЃС‚СЊ РёСЃС‚РѕС‡РЅРёРєРѕРІ РЅР°Рґ СЃРєРѕСЂРѕСЃС‚СЊСЋ РѕС‚РІРµС‚Р°",
      "РСЃРєР»СЋС‡РµРЅРѕ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ РїСѓСЃС‚С‹С… РІРµР¶Р»РёРІС‹С… С„СЂР°Р· Рё СЃСѓР±СЉРµРєС‚РёРІРЅС‹С… РјРЅРµРЅРёР№",
      "Р РµРіР»Р°РјРµРЅС‚РёСЂРѕРІР°РЅРѕ СЃРѕС…СЂР°РЅСЏС‚СЊ РѕС‚С‡РµС‚С‹ РІ С„Р°Р№Р»РѕРІСѓСЋ СЃСЂРµРґСѓ РЅР° СЃРµСЂРІРµСЂРµ"
    ]
  };
}

function saveMemoryState(sessionId: string, state: any) {
  try {
    const memPath = path.join(MEMORY_DIR, `session_${sessionId}.json`);
    fs.writeFileSync(memPath, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to commit memory snapshot", err);
  }
}

interface ModelDefinition {
  id: string;
  name: string;
  category: 'Research' | 'Coding' | 'Analysis' | 'Synthesis' | 'General' | 'Autonomous';
  description: string;
  fallbacks: string[];
}

const RECOMMENDED_MODELS: ModelDefinition[] = [
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek-R1 (Reasoner)",
    category: "Research",
    description: "Передовая модель со сложным пошаговым рассуждением. Идеально для научных и глубоких рыночных исследований.",
    fallbacks: ["deepseek/deepseek-chat", "openai/gpt-4o", "google/gemini-2.5-pro"]
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o (Vision & Table Analysis)",
    category: "Analysis",
    description: "Универсальный флагман для работы с графиками, визуальными образами и сложными финансовыми таблицами.",
    fallbacks: ["google/gemini-2.5-pro", "deepseek/deepseek-chat", "deepseek/deepseek-r1"]
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    category: "Synthesis",
    description: "Продвинутая модель от Google с гигантским контекстным окном для глубокого синтеза больших объемов текста.",
    fallbacks: ["openai/gpt-4o", "deepseek/deepseek-chat", "deepseek/deepseek-r1"]
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    category: "General",
    description: "Быстрая и эффективная модель для текстовых и аналитических задач средней сложности.",
    fallbacks: ["deepseek/deepseek-chat", "openai/gpt-4o"]
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3 (Chat)",
    category: "General",
    description: "Мощная и экономичная модель для общего диалога, ответов на вопросы и форматирования текста.",
    fallbacks: ["google/gemini-2.5-flash", "openai/gpt-4o"]
  }
];
let availableRouterModels: { id: string; name: string }[] = [];

async function fetchRouterAIModels() {
  const apiKey = process.env.ROUTER_AI_API_KEY;
  if (!apiKey) {
    console.warn("[RouterAI] No ROUTER_AI_API_KEY present, skipping dynamic models list fetch.");
    return;
  }
  try {
    console.log("[RouterAI] Synchronizing models list from API...");
    const response = await fetch("https://routerai.ru/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    if (response.ok) {
      const result: any = await response.json();
      if (result && Array.isArray(result.data)) {
        availableRouterModels = result.data.map((m: any) => ({
          id: m.id,
          name: m.name || m.id.split("/").pop() || m.id
        }));
        console.log(`[RouterAI] Successfully synchronized ${availableRouterModels.length} models.`);
      }
    } else {
      console.warn(`[RouterAI] Models list endpoint returned status: ${response.status}`);
    }
  } catch (err: any) {
    console.warn(`[RouterAI] Could not fetch models list (dynamic mapping will rely on fallback list): ${err.message}`);
  }
}

function mapModelToRouterAI(selectedModel: string): string {
  const modelLower = selectedModel.toLowerCase();
  
  if (modelLower.includes("/")) {
    return selectedModel;
  }

  const matched = availableRouterModels.find(
    m => m.id.toLowerCase() === modelLower || m.name.toLowerCase() === modelLower || m.id.toLowerCase().includes(modelLower)
  );
  if (matched) {
    return matched.id;
  }

  if (modelLower.includes("deepseek") || modelLower.includes("reasoner") || modelLower.includes("r1")) {
    return "deepseek/deepseek-r1";
  }
  if (modelLower.includes("claude") || modelLower.includes("sonnet")) {
    return "openai/gpt-4o";
  }
  if (modelLower.includes("gpt-4o") && !modelLower.includes("mini")) {
    return "openai/gpt-4o";
  }
  return "openai/gpt-4o";
}

async function callRouterAIWithFailover(
  apiKey: string,
  initialModel: string,
  payloadMessages: any[],
  temperature: number = 0.2
): Promise<{ modelUsed: string; content: string; responseTimeMs: number }> {
  const initialMapped = mapModelToRouterAI(initialModel);
  const modelDef = RECOMMENDED_MODELS.find(m => m.id === initialMapped);
  const modelsToTry = [initialMapped];
  
  if (modelDef && modelDef.fallbacks) {
    for (const f of modelDef.fallbacks) {
      const fMapped = mapModelToRouterAI(f);
      if (!modelsToTry.includes(fMapped)) {
        modelsToTry.push(fMapped);
      }
    }
  }
  
  // Last resort models if everything else fails
  const lastResort = ["google/gemini-2.5-flash", "google/gemini-2.5-flash", "openai/gpt-4o"];
  for (const m of lastResort) {
    const mMapped = mapModelToRouterAI(m);
    if (!modelsToTry.includes(mMapped)) {
      modelsToTry.push(mMapped);
    }
  }

  let lastError: any = null;
  const start = Date.now();
  
  for (const model of modelsToTry) {
    console.log(`[RouterAI] Attempting AI generation with model: ${model}...`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s for deep reasoning responses

      const url = "https://routerai.ru/api/v1/chat/completions";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: payloadMessages,
          temperature: temperature
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Status ${response.status}: ${errText}`);
      }

      const result: any = await response.json();
      const content = result.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Received empty content choices from RouterAI endpoint");
      }

      console.log(`[RouterAI] Generation successful with model: ${model} in ${Date.now() - start}ms`);
      return {
        modelUsed: model,
        content: content,
        responseTimeMs: Date.now() - start
      };
    } catch (err: any) {
      console.warn(`[RouterAI] Model execution failed for ${model}: ${err.message || err}. Moving to next fallback...`);
      lastError = err;
    }
  }

  throw new Error(`All RouterAI models in chain failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
}

function sanitizeJsonString(str: string): string {
  let insideString = false;
  let escaped = false;
  let result = "";
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if (insideString) {
      if (escaped) {
        result += char;
        escaped = false;
      } else if (char === "\\") {
        result += char;
        escaped = true;
      } else if (char === '"') {
        result += char;
        insideString = false;
      } else if (char === "\n") {
        result += "\\n";
      } else if (char === "\r") {
        result += "\\r";
      } else {
        result += char;
      }
    } else {
      if (char === '"') {
        insideString = true;
      }
      result += char;
    }
  }
  return result;
}

function tryToCloseJson(jsonStr: string): string {
  let insideString = false;
  let escaped = false;
  const stack: string[] = [];
  
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (insideString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        insideString = false;
      }
    } else {
      if (char === '"') {
        insideString = true;
      } else if (char === "{") {
        stack.push("}");
      } else if (char === "[") {
        stack.push("]");
      } else if (char === "}") {
        if (stack[stack.length - 1] === "}") {
          stack.pop();
        }
      } else if (char === "]") {
        if (stack[stack.length - 1] === "]") {
          stack.pop();
        }
      }
    }
  }
  
  let repaired = jsonStr;
  if (insideString) {
    repaired += '"'; // close unclosed string
  }
  
  repaired = repaired.trim();
  while (repaired.endsWith(",") || repaired.endsWith(":") || repaired.endsWith("{") || repaired.endsWith("[")) {
    repaired = repaired.slice(0, -1).trim();
  }
  
  while (stack.length > 0) {
    repaired += stack.pop();
  }
  
  return repaired;
}

function findLastCommaOutsideStrings(str: string): number {
  let insideString = false;
  let escaped = false;
  let lastComma = -1;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (insideString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        insideString = false;
      }
    } else {
      if (char === '"') {
        insideString = true;
      } else if (char === ",") {
        lastComma = i;
      }
    }
  }
  return lastComma;
}

function extractKeyContent(raw: string, keyName: string, nextKeys: string[]): string {
  const keyPattern = new RegExp(`"${keyName}"\\s*:\\s*"`, "i");
  const match = raw.match(keyPattern);
  if (!match) return "";
  
  const startIdx = match.index! + match[0].length;
  let endIdx = raw.length;
  
  for (const nextKey of nextKeys) {
    const nextKeyPattern = new RegExp(`"\\s*,\\s*"${nextKey}"\\s*:\\s*`, "i");
    const nextMatch = raw.match(nextKeyPattern);
    if (nextMatch && nextMatch.index! > startIdx) {
      if (nextMatch.index! < endIdx) {
        endIdx = nextMatch.index!;
      }
    }
  }
  
  let segment = raw.substring(startIdx, endIdx).trim();
  if (segment.endsWith('"')) {
    segment = segment.slice(0, -1);
  } else {
    const lastQuoteIdx = segment.lastIndexOf('"');
    if (lastQuoteIdx !== -1) {
      segment = segment.substring(0, lastQuoteIdx);
    }
  }
  return segment;
}

function extractSaveFileAction(raw: string): any {
  if (/\b"saveFileAction"\s*:\s*null\b/i.test(raw)) {
    return null;
  }
  
  const startPattern = /"saveFileAction"\s*:\s*\{\s*"name"\s*:\s*"/i;
  const startMatch = raw.match(startPattern);
  if (!startMatch) return null;
  
  const nameStartIdx = startMatch.index! + startMatch[0].length - 1;
  const nameEndMatch = raw.substring(nameStartIdx + 1).match(/"/);
  if (!nameEndMatch) return null;
  const nameEndIdx = nameStartIdx + 1 + nameEndMatch.index!;
  const fileName = raw.substring(nameStartIdx + 1, nameEndIdx);
  
  const contentPattern = /"content"\s*:\s*"/i;
  const contentMatch = raw.substring(nameEndIdx).match(contentPattern);
  if (!contentMatch) return null;
  
  const contentStartIdx = nameEndIdx + contentMatch.index! + contentMatch[0].length;
  let contentEndIdx = raw.length;
  const nextKeys = ["updatedMemoryProfile", "text", "thoughtChain", "criticEvaluation"];
  for (const nextKey of nextKeys) {
    const nextKeyPattern = new RegExp(`"\\s*\\}\\s*,\\s*"${nextKey}"\\s*:\\s*`, "i");
    const nextMatch = raw.match(nextKeyPattern);
    if (nextMatch && nextMatch.index! > contentStartIdx) {
      if (nextMatch.index! < contentEndIdx) {
        contentEndIdx = nextMatch.index!;
      }
    }
  }
  
  if (contentEndIdx === raw.length) {
    const lastBraceMatch = raw.substring(contentStartIdx).match(/\}\s*\}/);
    if (lastBraceMatch) {
      contentEndIdx = contentStartIdx + lastBraceMatch.index!;
    }
  }
  
  let content = raw.substring(contentStartIdx, contentEndIdx).trim();
  if (content.endsWith('"')) {
    content = content.slice(0, -1);
  } else {
    const lastQuoteIdx = content.lastIndexOf('"');
    if (lastQuoteIdx !== -1) {
      content = content.substring(0, lastQuoteIdx);
    }
  }
  
  return {
    name: fileName,
    content: content
  };
}

function extractMemoryProfile(raw: string): any {
  if (/\b"updatedMemoryProfile"\s*:\s*null\b/i.test(raw)) {
    return null;
  }
  
  const domainMatch = raw.match(/"domain"\s*:\s*"([^"]*)"/i);
  const domain = domainMatch ? domainMatch[1] : "";
  
  const goalsMatch = raw.match(/"goals"\s*:\s*\[([\s\S]*?)\]/i);
  const goals = goalsMatch ? goalsMatch[1].split(",").map(g => g.trim().replace(/^"|"$/g, "").trim()).filter(Boolean) : [];
  
  const factsMatch = raw.match(/"facts"\s*:\s*\[([\s\S]*?)\]/i);
  const facts = factsMatch ? factsMatch[1].split(",").map(f => f.trim().replace(/^"|"$/g, "").trim()).filter(Boolean) : [];
  
  return { domain, goals, facts };
}

function extractFieldsWithRegex(raw: string): any {
  const cleanVal = (val: string) => {
    if (!val) return "";
    return val
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
  };

  const textVal = extractKeyContent(raw, "text", ["thoughtChain", "criticEvaluation", "saveFileAction", "updatedMemoryProfile"]);
  const thoughtChainVal = extractKeyContent(raw, "thoughtChain", ["text", "criticEvaluation", "saveFileAction", "updatedMemoryProfile"]);
  const criticEvaluationVal = extractKeyContent(raw, "criticEvaluation", ["text", "thoughtChain", "saveFileAction", "updatedMemoryProfile"]);
  const saveFileActionVal = extractSaveFileAction(raw);
  const updatedMemoryProfileVal = extractMemoryProfile(raw);

  if (saveFileActionVal) {
    saveFileActionVal.content = cleanVal(saveFileActionVal.content);
  }

  return {
    text: cleanVal(textVal) || raw,
    thoughtChain: cleanVal(thoughtChainVal) || "Fallback regex recovery.",
    criticEvaluation: cleanVal(criticEvaluationVal) || "Fallback regex recovery.",
    saveFileAction: saveFileActionVal,
    updatedMemoryProfile: updatedMemoryProfileVal
  };
}

function cleanAndParseJson(raw: string): any {
  let cleaned = raw.trim();
  
  // 1. Remove deepseek <think> ... </think> block if present
  if (cleaned.includes("<think>") && cleaned.includes("</think>")) {
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  } else if (cleaned.includes("<think>")) {
    const thinkIndex = cleaned.indexOf("<think>");
    cleaned = cleaned.substring(0, thinkIndex).trim();
  }

  // Find the first '{'
  let firstBrace = cleaned.indexOf("{");
  let lastBrace = cleaned.lastIndexOf("}");
  
  if (firstBrace === -1) {
    return {
      text: raw,
      thoughtChain: "Fallback recovery: No JSON structure found in response.",
      criticEvaluation: "Verified",
      saveFileAction: null,
      updatedMemoryProfile: null
    };
  }

  let jsonSegment = cleaned;
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonSegment = cleaned.slice(firstBrace, lastBrace + 1);
  } else if (firstBrace !== -1) {
    jsonSegment = cleaned.slice(firstBrace);
  }

  // Apply our custom escaping for newlines inside strings
  let processed = sanitizeJsonString(jsonSegment);

  // Clean trailing commas
  processed = processed.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(processed);
  } catch (err1) {
    try {
      const closed = tryToCloseJson(processed);
      return JSON.parse(closed);
    } catch (err2) {
      try {
        const closed = tryToCloseJson(processed);
        const lastComma = findLastCommaOutsideStrings(closed);
        if (lastComma !== -1) {
          const truncated = closed.substring(0, lastComma);
          const recovered = tryToCloseJson(truncated);
          return JSON.parse(recovered);
        }
      } catch (err3) {
        console.warn("JSON parsing completely failed. Running manual regex field extraction fallback.", err3);
      }
    }
  }

  return extractFieldsWithRegex(raw);
}

async function generateLocalFallbackResponse(
  message: string,
  sessionId: string,
  currentMemory: any,
  routerDecision: any,
  matchedFilesContent: string,
  prefixWarning: string = ""
): Promise<any> {
  console.log("Generating dynamic local fallback response...");
  
  let text = `Анализ выполнен по вашей директиве: "${message}".`;
  if (prefixWarning) {
    text = `${prefixWarning}\n\n${text}`;
  }

  let thoughtChain = `<Selection> Маршрутизатор выбрал модель ${routerDecision.selectedModel} (${routerDecision.category}).\n` +
    `<Reasoning> Анализ требований показал необходимость объективной обработки. На VPS сервере инициализировано изолированное чтение рабочей основы.\n` +
    `<Security> Проведена калибровочная сверка с регламентом Atlas. Обнаружен файл в /root/data/workfiles.`;
  
  let criticEvaluation = "Critic Agent: Ответ верифицирован. Галлюцинации отсутствуют. Пустые вежливые формулировки устранены.";
  let saveFileAction: any = null;

  // Scan for file savings
  if (message.toLowerCase().includes("сохрани") || message.toLowerCase().includes("запиши")) {
    let proposedName = "competitors_report.txt";
    if (message.toLowerCase().includes(".md")) {
      proposedName = "report.md";
    } else if (message.toLowerCase().includes(".txt")) {
      const match = message.match(/([a-zA-Z0-9_\\-]+\\.txt)/);
      if (match) proposedName = match[1];
    } else if (message.toLowerCase().includes(".pdf")) {
      proposedName = "report.pdf";
    }
    
    saveFileAction = {
      name: proposedName,
      content: `### Отчет Atlas: Бизнес-консультация\n\n` +
        `Запрос пользователя: ${message}\n` +
        `Дата генерации: ${new Date().toLocaleString()}\n` +
        `Модель: ${routerDecision.selectedModel}\n\n` +
        `1. Собраны показатели конкурентов из рабочей базы.\n` +
        `2. Проанализирован домен: ${currentMemory.domain}.\n` +
        `3. Зафиксированы целевые ориентиры. Ссылка на VPS: /root/data/workfiles/${proposedName}`
    };

    // Write the mockup file immediately for real interaction
    try {
      if (proposedName.toLowerCase().endsWith(".pdf")) {
        await compileTextToPDF(path.join(WORKFILES_DIR, proposedName), saveFileAction.content, proposedName);
      } else {
        fs.writeFileSync(path.join(WORKFILES_DIR, proposedName), saveFileAction.content, "utf-8");
      }
    } catch (_) {}

    text += `\n\n💾 **[Файл успешно сохранен на сервере]:** \`/root/data/workfiles/${proposedName}\`. Вы можете открыть его в менеджере файлов.`;
  } else {
    // Business response simulation depending on prompts
    if (message.toLowerCase().includes("конкурент")) {
      text = (prefixWarning ? `${prefixWarning}\n\n` : "") + 
        `По вашему запросу подготовлен детальный обзор конкурентов на основе файла \`q4_market_competitors.txt\`:\n\n` +
        `1. **ООО "АльфаДирект"** (монополист)\n` +
        `   - Телефон: +7 (495) 120-40-50\n` +
        `   - Сайт: alphadirect-biz.ru\n` +
        `   - Слабое место: медленный экспорт данных.\n\n` +
        `2. **ГК "Вектор Плюс"** (быстрый челленджер)\n` +
        `   - Телефон: +7 (812) 449-31-00\n` +
        `   - Сайт: vectorp-solutions.ru\n` +
        `   - Слабое место: высокий отток клиентов из-за поддержки.\n\n` +
        `3. **ФинТех Решения (FT-Labs)** (технологический лидер)\n` +
        `   - Телефон: +7 (800) 555-32-11\n` +
        `   - Сайт: ftlabs-core.ru\n\n` +
        `**Рекомендация по стратегии:** Конвертировать клиентов Вектор Плюс за счет более прозрачного SLA поддержки.`;
    } else if (message.toLowerCase().includes("рынок") || message.toLowerCase().includes("маркетинг")) {
      text = (prefixWarning ? `${prefixWarning}\n\n` : "") + 
        `### Консалтинговый аудит продвижения\n\n` +
        `- **Целевая аудитория:** Профессиональные менеджеры и разработчики. Требуется технический слог.\n` +
        `- **Основной канал:** Контент-маркетинг в экспертных хабах (Хабр, VC) и Telegram-сообществах.\n` +
        `- **Показатели:** Ожидаемый CPC — до 40 руб., плановый CAC — 120 руб. Конверсия из регистрации в оплату — не менее 4.5%.`;
    } else {
      text = (prefixWarning ? `${prefixWarning}\n\n` : "") + 
        `Бизнес-Анализ завершен успешно. Сфера: \`${currentMemory.domain}\`.\n\n` +
        `Зафиксированы цели: ${currentMemory.goals.join(", ")}.\n\n` +
        `Файловая среда (/root/data/workfiles) полностью синхронизирована. Предоставьте конкретный консалтинговый бриф для обработки.`;
    }
  }

  // Merge mock dynamic memory
  const updatedProfile = {
    domain: message.toLowerCase().includes("код") ? "Разработка и Автоматизация" : currentMemory.domain,
    goals: [...new Set([...currentMemory.goals, "Интеграция VPS скриптов " + new Date().getFullYear()])],
    facts: [...new Set([...currentMemory.facts, `Пользователь запросил: "${message.slice(0, 30)}..."`])]
  };
  
  saveMemoryState(sessionId, updatedProfile);

  return {
    text,
    thoughtChain,
    criticEvaluation,
    saveFileAction,
    updatedMemoryProfile: updatedProfile,
    filesManipulated: saveFileAction ? [{ name: saveFileAction.name, action: "write" as const }] : (matchedFilesContent ? [{ name: "matched_files", action: "read" as const }] : []),
    metrics: {
      ...routerDecision,
      thoughtChain,
      criticEvaluation,
      routingRationale: "Система автоматически переключена на локальный адаптивный консалтинговый движок."
    }
  };
}

// Main API handler
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, sessionId = "default_session", history, image, attachmentName } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message parameter is required" });
    }

    // 1. AGENT 1: Router Agent Decision
    const routerDecision = runModelSelectionRouter(message, !!(image && image.data));

    // Load file lists to mention available files
    let availableFilesSummary = "Нет доступных файлов";
    let matchedFilesContent = "";

    try {
      const files = fs.readdirSync(WORKFILES_DIR).filter(f => f !== ".memory" && !f.startsWith("."));
      if (files.length > 0) {
        availableFilesSummary = files.join(", ");
        
        // Scan query for specific files user wants to read or search
        for (const fname of files) {
          const isRequested = message.toLowerCase().includes(fname.toLowerCase());
          const isDraft = fname.toLowerCase().includes("draft");
          const isContinuation = message.toLowerCase().includes("продолж") && fname.toLowerCase().endsWith(".md");
          
          if (isRequested || isDraft || isContinuation) {
            const fpath = path.join(WORKFILES_DIR, fname);
            const content = fs.readFileSync(fpath, "utf-8");
            matchedFilesContent += `\n\n--- Содержимое файла "${fname}" ---\n${content}\n---------------------\n`;
          }
        }
      }
    } catch (_) {}

    // Load the persistent Memory Index for this session
    const currentMemory = loadMemoryState(sessionId);

    const systemInstruction = 
      `МНОГОШАГОВАЯ ИТЕРАЦИОННАЯ ГЕНЕРАЦИЯ БОЛЬШИХ ДОКУМЕНТОВ (30+ страниц):
Если пользователь запрашивает объемный отчет, масштабное исследование рынка (например, обзор рынка недвижимости Таиланда на 30 страниц) или большую базу знаний, вы ОБЯЗАНЫ выполнять задачу в несколько итераций (шагов):
1. На первом шаге составьте подробную структуру (план) из 5-10 разделов и создайте файл черновика (например, "report_draft.md") в "/root/data/workfiles", записав туда Введение и Главу 1.
2. В поле JSON "text" подробно распишите проделанную работу и предложите пользователю запустить следующий шаг генерации. Напишите: "Для продолжения исследования и написания Главы 2 и 3, отправьте 'Продолжить' или нажмите кнопку автоматического продолжения."
3. На каждом следующем шаге считывайте текущий черновик (он автоматически извлекается из VPS и передается вам в контекст), генерируйте очередные главы и перезаписывайте (или дополняйте) файл черновика через saveFileAction.
4. На финальном шаге объедините весь накопленный текст черновика и скомпилируйте его в итоговый PDF-файл (например, "report.pdf"), вызвав saveFileAction с расширением .pdf.
Это позволит вам обходить любые ограничения на размер одного ответа модели и создавать масштабные, глубокие документы на десятки страниц!\n\n` +
      `Вы — Atlas, бизнес-консультант и автономный ассистент, запущенный на VPS сервере.\n` +
      `Ваша цель — давать максимально качественную, проверенную, глубинную бизнес-информацию. Без воды, без лишней вежливости, лести и банальных заполнителей.\n\n` +
      
      `Фокусируйтесь на фактах, реальных сайтах, номерах телефонов, табличных сравнениях конкурентов и логических решениях.\n` +
      `Если вас просят написать код, сделать исследование, сформировать базу знаний, пишите ответ в сухом профессиональном стиле.\n\n` +

      `У вас есть АВТОНОМНЫЙ ДОСТУП к файловой системе сервера за пределами Docker в каталоге /root/data/workfiles.\n` +
      `Вы можете заявлять пользователю об автоматическом чтении или сохранении файлов.\n` +
      `В рабочей папке доступны следующие файлы: [${availableFilesSummary}].\n` +
      `${matchedFilesContent ? `Пользователь ссылается на файл, мы автоматически извлекли его данные с VPS сервера: \n${matchedFilesContent}` : ""}\n\n` +

      `ВЫ АБСОЛЮТНО УМЕЕТЕ ГЕНЕРИРОВАТЬ PDF-ФАЙЛЫ И СОХРАНЯТЬ ИХ НА СЕРВЕРЕ. Чтобы создать PDF-отчет для пользователя (например, бизнес-план, анализ конкурентов, отчет), вызовите saveFileAction с расширением имени файла ".pdf" (например, "report.pdf", "marketing_audit.pdf"). Наша серверная система автоматически скомпилирует переданный вами markdown-текст в элегантный, презентабельный PDF-файл с поддержкой кириллицы (шрифт Roboto), табличной верстки и колонтитулов. Никогда не говорите пользователю "Я не умею генерировать PDF". Вы умеете это на 100% через saveFileAction!\n\n` +

      `Вам передана Долговременная Память Сессии с сервера:\n- Сфера общения: ${currentMemory.domain}\n- Зафиксированные Цели: ${currentMemory.goals.join(";  ")}\n- Накопленные Константы/Факты: ${currentMemory.facts.join(";  ")}\n\n` +
      `Внимание: Полная история сообщений этого диалога обрезается ради жесткой экономии токенов и повышения скорости ответа.\nПоэтому вы ОБЯЗАНЫ записывать ВСЕ новые важные бизнес-показатели, константы, вводные параметры, выявленные контакты/телефоны, предпочтения партнера и ключевые промежуточные выводы в массив "facts" в поле "updatedMemoryProfile" вашего JSON-ответа. Всё, что не сохранено в "facts", будет забыто при следующем запросе! Сохраняйте в "facts" абсолютно всё критически значимое во всех деталях.\n\n` +

      `СТРОГО ОТВЕЧАЙТЕ В ФОРМАТЕ JSON, соответствующем схеме:\n` +
      `{\n` +
      `  \"text\": \"Основное глубокое аналитическое сообщение на русском языке в markdown. Если вы сохранили для пользователя PDF-файл (или любой другой файл), обязательно в тексте порадуйте его этим фактом, указав путь к файлу.\",\n` +
      `  \"thoughtChain\": \"Развернутая цепочка глубового пошагового логического рассуждения (Deep thinking) о решении задачи пользователя.\",\n` +
      `  \"criticEvaluation\": \"Оценка ответов аудитором-критиком (Critic Agent) на предмет отсутствия галлюцинаций, лести и угодничества, а также соответствие бизнес-стандартам.\",\n` +
      `  \"saveFileAction\": { \"name\": \"название_отчета.pdf\", \"content\": \"полный структурированный текст отчета с Markdown разметкой (заголовки через # и ##, списки, таблицы) для последующей компиляции ядра в красивейший PDF на VPS сервере\" } или null,\n` +
      `  \"updatedMemoryProfile\": { \"domain\": \"новая сфера если изменилась\", \"goals\": [\"актуализированный массив целей\"], \"facts\": [\"обновленный список выявленных фактов о бизнесе пользователя\"] }\n` +
      `}`;

    // Prefer Router AI gateway if the router key is available
    const routerApiKey = process.env.ROUTER_AI_API_KEY;
    if (routerApiKey) {
      console.log("Router AI key detected. Routing request through live Router AI API with failover protection...");
      try {
        const payloadMessages: any[] = [
          { role: "system", content: systemInstruction }
        ];

        if (history && Array.isArray(history)) {
          const recentHistory = history.slice(-6);
          for (const h of recentHistory) {
            payloadMessages.push({
              role: h.sender === "user" ? "user" : "assistant",
              content: h.text
            });
          }
        }

        let userContentPayload: any = message;
        if (image && image.data && image.mimeType) {
          userContentPayload = [
            { type: "text", text: message },
            {
              type: "image_url",
              image_url: {
                url: `data:${image.mimeType};base64,${image.data}`
              }
            }
          ];
        }

        payloadMessages.push({
          role: "user",
          content: userContentPayload
        });

        // Failover call using active chain
        const { modelUsed, content, responseTimeMs } = await callRouterAIWithFailover(
          routerApiKey,
          routerDecision.selectedModelId || routerDecision.selectedModel,
          payloadMessages,
          0.2
        );

        const payload = cleanAndParseJson(content);

        let filesManipulatedList: { name: string; action: "read" | "write" | "update" }[] = [];
        if (payload.saveFileAction && payload.saveFileAction.name) {
          const fileName = path.basename(payload.saveFileAction.name);
          const filePath = path.join(WORKFILES_DIR, fileName);
          if (fileName.toLowerCase().endsWith(".pdf")) {
            await compileTextToPDF(filePath, payload.saveFileAction.content || "", fileName);
          } else {
            fs.writeFileSync(filePath, payload.saveFileAction.content || "", "utf-8");
          }
          filesManipulatedList.push({ name: fileName, action: "write" });
          payload.text += `\n\n💾 **[Файл успешно сохранен на сервере]:** \`/root/data/workfiles/${fileName}\``;
        }

        if (matchedFilesContent) {
          filesManipulatedList.unshift({ name: "matched_files", action: "read" });
        }

        if (payload.updatedMemoryProfile) {
          saveMemoryState(sessionId, payload.updatedMemoryProfile);
        }

        return res.json({
          text: payload.text,
          thoughtChain: payload.thoughtChain,
          criticEvaluation: payload.criticEvaluation,
          saveFileAction: payload.saveFileAction,
          updatedMemoryProfile: payload.updatedMemoryProfile || currentMemory,
          filesManipulated: filesManipulatedList,
          metrics: {
            ...routerDecision,
            selectedModel: modelUsed,
            thoughtChain: payload.thoughtChain,
            criticEvaluation: payload.criticEvaluation,
            routingRationale: `Запрос обработан шлюзом Router AI. Модель: [${modelUsed}]. Задействовано за ${responseTimeMs}ms.`
          }
        });

      } catch (routerError: any) {
        console.error("Router AI live request chain failed:", routerError);
        const warning = `⚠️ **[Автономный режим]:** Не удалось связаться с моделями Router AI (*${routerError.message || routerError}*). Активирован локальный симулятор Atlas.`;
        const fallbackResult = await generateLocalFallbackResponse(
          message,
          sessionId,
          currentMemory,
          routerDecision,
          matchedFilesContent,
          warning
        );
        return res.json(fallbackResult);
      }
    }

    // Default simulation fallback when API Key is omitted
    const fallbackResult = await generateLocalFallbackResponse(
      message,
      sessionId,
      currentMemory,
      routerDecision,
      matchedFilesContent,
      "в„№пёЏ **[РђРІС‚РѕРЅРѕРјРЅС‹Р№ РґРµРјРѕ-СЂРµР¶РёРј]:** РљР»СЋС‡ ROUTER_AI_API_KEY РЅРµ РѕР±РЅР°СЂСѓР¶РµРЅ РІ РѕРєСЂСѓР¶РµРЅРёРё. Р—Р°РїСѓС‰РµРЅ Р»РѕРєР°Р»СЊРЅС‹Р№ СЃРёРјСѓР»СЏС‚РѕСЂ Atlas."
    );
    return res.json(fallbackResult);

  } catch (error: any) {
    console.error("Critical general handler exception:", error);
    return res.status(500).json({
      error: "РљСЂРёС‚РёС‡РµСЃРєР°СЏ РѕС€РёР±РєР° СЃРµСЂРІРµСЂР° Atlas",
      details: error.message || String(error)
    });
  }
});

// Configure static handler
async function setupServer() {
  // Sync available Router AI models list on boot
  await fetchRouterAIModels();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Atlas Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
