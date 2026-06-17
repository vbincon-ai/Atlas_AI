export interface AgentMetrics {
  selectedModel: string;
  category: 'Research' | 'Analysis' | 'Coding' | 'Synthesis' | 'General';
  routingRationale: string;
  costEstimateRub: number;
  costEstimateUsd: number;
  promptTokens: number;
  completionTokens: number;
  thoughtChain?: string;
  criticEvaluation?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  imageUrl?: string;
  attachmentName?: string;
  metrics?: AgentMetrics;
  filesManipulated?: { name: string; action: 'read' | 'write' | 'update' }[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  memoryCompactPrompt?: string; // Compounded dynamic server memory
}

export interface WorkFile {
  name: string;
  sizeBytes: number;
  updatedAt: string;
  contentSnippet?: string;
}
