import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Search, 
  MessageSquare, 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  Check, 
  Send, 
  FileCode2, 
  FolderTree, 
  Sparkles,
  Clock,
  CheckCircle2,
  FileText,
  BarChart3,
  ShieldCheck,
  X,
  Download,
  Filter,
  Network,
  Wand2,
  GitCommit,
  Users,
  Eye,
  RefreshCw,
  Zap
} from 'lucide-react';
import { API_BASE_URL } from '../config';

interface Source {
  file: string;
  start_line: number;
  end_line: number;
  symbol: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  sources?: Source[];
}

interface RepoOverview {
  total_files: number;
  total_chunks: number;
  languages: Record<string, number>;
}

interface GraphNode {
  id: string;
  label: string;
  folder: string;
  language: string;
  lines: number;
}

interface GraphEdge {
  source: string;
  target: string;
  id: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    total_nodes: number;
    total_edges: number;
    modules: Record<string, number>;
    hub_files: { file: string; dependents: number }[];
  };
}

interface GitInsights {
  branch: string;
  commits: {
    hash: string;
    author: string;
    email: string;
    time_ago: string;
    message: string;
  }[];
  contributors: { name: string; commits: number }[];
  total_commits_inspected: number;
}

export default function Workspace() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'chat';

  const [repo, setRepo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'search' | 'graph' | 'generate' | 'files' | 'overview'>(
    ['chat', 'search', 'graph', 'generate', 'files', 'overview'].includes(initialTab) ? initialTab : 'chat'
  );
  const [query, setQuery] = useState('');
  
  // Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFilterLang, setSearchFilterLang] = useState<string>('all');
  const [copiedSnippet, setCopiedSnippet] = useState<number | null>(null);

  // Graph state
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [selectedGraphFolder, setSelectedGraphFolder] = useState<string>('all');

  // Code Generation state
  const [genPrompt, setGenPrompt] = useState('');
  const [genTaskType, setGenTaskType] = useState('test');
  const [genTargetFile, setGenTargetFile] = useState('');
  const [genResult, setGenResult] = useState<{ generated_code: string; explanation: string; relevant_files: string[] } | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [copiedGen, setCopiedGen] = useState(false);

  // Files state
  const [files, setFiles] = useState<string[]>([]);
  const [fileFilter, setFileFilter] = useState('');

  // Overview & Git state
  const [overview, setOverview] = useState<RepoOverview | null>(null);
  const [gitInsights, setGitInsights] = useState<GitInsights | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditReport, setAuditReport] = useState<string | null>(null);

  // Code Viewer & Explainer Modal State
  const [viewerFile, setViewerFile] = useState<{ path: string; content: string; language?: string; highlightLines?: [number, number] } | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [fileExplanation, setFileExplanation] = useState<string | null>(null);
  const [copiedViewer, setCopiedViewer] = useState(false);

  const fetchRepo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/repositories/${id}`);
      if (res.ok) {
        const data = await res.json();
        setRepo(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/repositories/${id}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOverview = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/repositories/${id}/overview`);
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGraph = async () => {
    setGraphLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/repositories/${id}/graph`);
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGraphLoading(false);
    }
  };

  const fetchGitInsights = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/repositories/${id}/git-insights`);
      if (res.ok) {
        const data = await res.json();
        setGitInsights(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRepo();
    fetchFiles();
    fetchOverview();
    fetchGitInsights();
    const interval = setInterval(() => {
      fetchRepo();
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (activeTab === 'graph' && !graphData) {
      fetchGraph();
    }
  }, [activeTab]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleChat = async (questionText?: string) => {
    const textToSend = questionText || query;
    if (!textToSend.trim() || chatLoading) return;
    
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', content: textToSend }]);
    setChatLoading(true);
    
    try {
      const res = await fetch(`${API_BASE_URL}/repositories/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: textToSend })
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { role: 'ai', content: data.answer, sources: data.sources }]);
      } else {
        const err = await res.json();
        setChatHistory(prev => [...prev, { role: 'ai', content: `Error: ${err.detail || 'Failed to get answer'}` }]);
      }
    } catch (e: any) {
      setChatHistory(prev => [...prev, { role: 'ai', content: `Network error: ${e.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || searchLoading) return;
    
    setSearchLoading(true);
    try {
      let url = `${API_BASE_URL}/repositories/${id}/search?q=${encodeURIComponent(query)}`;
      if (searchFilterLang !== 'all') {
        url += `&language=${encodeURIComponent(searchFilterLang)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genPrompt.trim() || genLoading) return;

    setGenLoading(true);
    setGenResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/repositories/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: genPrompt,
          task_type: genTaskType,
          target_file: genTargetFile || undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGenResult(data);
      } else {
        const err = await res.json();
        alert(`Generation failed: ${err.detail || 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Network error: ${e.message}`);
    } finally {
      setGenLoading(false);
    }
  };

  const openCodeViewer = async (filePath: string, startLine?: number, endLine?: number) => {
    setFileExplanation(null);
    try {
      const res = await fetch(`${API_BASE_URL}/repositories/${id}/file-content?path=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const data = await res.json();
        setViewerFile({
          path: data.path,
          content: data.content,
          language: data.language,
          highlightLines: startLine && endLine ? [startLine, endLine] : undefined
        });
      } else {
        alert("Could not load file content.");
      }
    } catch (e) {
      console.error(e);
      alert("Error fetching file content.");
    }
  };

  const handleExplainCurrentFile = async () => {
    if (!viewerFile) return;
    setExplaining(true);
    try {
      const res = await fetch(`${API_BASE_URL}/repositories/${id}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: viewerFile.path,
          code_snippet: viewerFile.content
        })
      });
      if (res.ok) {
        const data = await res.json();
        setFileExplanation(data.summary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setExplaining(false);
    }
  };

  const runAudit = async () => {
    setAuditLoading(true);
    setAuditReport(null);
    try {
      const res = await fetch(`${API_BASE_URL}/repositories/${id}/audit`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setAuditReport(data.report);
      } else {
        alert("Failed to run audit");
      }
    } catch (e) {
      console.error(e);
      alert("Error running audit");
    } finally {
      setAuditLoading(false);
    }
  };

  const exportChatAsMarkdown = () => {
    if (chatHistory.length === 0) return;
    let md = `# DevIntel Chat Export: ${repo?.name || 'Repository'}\n\n`;
    chatHistory.forEach((msg) => {
      md += `### ${msg.role === 'user' ? 'Developer' : 'DevIntel AI'}\n\n${msg.content}\n\n`;
      if (msg.sources && msg.sources.length > 0) {
        md += `*Sources cited:*\n`;
        msg.sources.forEach(s => {
          md += `- \`${s.file}\` (Lines ${s.start_line}-${s.end_line})\n`;
        });
        md += `\n`;
      }
      md += `---\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repo?.name || 'repo'}-devintel-chat.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!repo) {
    return (
      <div className="flex flex-col items-center justify-center p-16">
        <Clock className="w-8 h-8 text-blue-400 animate-spin mb-3" />
        <p className="text-sm text-slate-400">Loading repository workspace...</p>
      </div>
    );
  }

  const isCompleted = repo.status === 'COMPLETED';
  const availableLanguages = overview?.languages ? Object.keys(overview.languages) : [];

  return (
    <div className="flex-1 flex flex-col space-y-5">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Back to Repositories"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">{repo.name}</h1>
                <a 
                  href={repo.github_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-slate-400 hover:text-white"
                  title="View on GitHub"
                >
                  <ExternalLink size={15} />
                </a>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {repo.branch || 'main'}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                <span>Owner: <strong className="text-slate-300">{repo.owner}</strong></span>
                {overview && (
                  <>
                    <span>•</span>
                    <span>{overview.total_files} indexed files</span>
                    <span>•</span>
                    <span>{overview.total_chunks} vector chunks</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={13} className="text-emerald-400" />
                Index Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                <Clock size={13} className="text-blue-400 animate-spin" />
                {repo.status}
              </span>
            )}
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/80 overflow-x-auto pb-1">
          <button
            onClick={() => handleTabChange('chat')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageSquare size={14} />
            <span>Ask DevIntel</span>
          </button>

          <button
            onClick={() => handleTabChange('search')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'search'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Search size={14} />
            <span>Code Search</span>
          </button>

          <button
            onClick={() => handleTabChange('graph')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'graph'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Network size={14} />
            <span>Architecture Graph</span>
          </button>

          <button
            onClick={() => handleTabChange('generate')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'generate'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wand2 size={14} />
            <span>Code Studio</span>
          </button>

          <button
            onClick={() => handleTabChange('files')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'files'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FolderTree size={14} />
            <span>Files ({files.length})</span>
          </button>

          <button
            onClick={() => handleTabChange('overview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 size={14} />
            <span>Overview & Audit</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ASK DEVINTEL (CHAT) */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm min-h-[550px]">
          {/* Chat Toolbar */}
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Contextual Q&A with Gemini Flash RAG</span>
            </div>
            {chatHistory.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={exportChatAsMarkdown}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1 transition"
                  title="Export Chat as Markdown"
                >
                  <Download size={13} />
                  <span>Export</span>
                </button>
                <button
                  onClick={() => setChatHistory([])}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                >
                  Clear Chat
                </button>
              </div>
            )}
          </div>

          {/* Chat Messages Window */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center my-auto">
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-base font-bold text-white">Ask anything about {repo.name}</h3>
                <p className="mt-1 text-xs text-slate-400 max-w-md">
                  DevIntel searches indexed AST functions, classes, and code chunks to deliver answers with line-level file citations.
                </p>

                {/* Suggested prompt chips */}
                <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-lg">
                  {[
                    "Explain the high-level architecture",
                    "How is authentication handled?",
                    "Where are API routes or controllers defined?",
                    "Show database schema or models",
                    "What dependencies does this project rely on?"
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleChat(suggestion)}
                      className="px-3 py-1.5 text-xs bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 rounded-lg text-slate-300 hover:text-white transition"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400 px-1">
                    <span>{msg.role === 'user' ? 'You' : 'DevIntel AI'}</span>
                  </div>

                  <div
                    className={`max-w-3xl rounded-xl p-4 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 shadow-sm'
                    }`}
                  >
                    <div className="prose prose-invert prose-sm max-w-none break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Sources citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700/60">
                        <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                          <FileCode2 size={13} className="text-blue-400" />
                          <span>Cited Sources (click to view code):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((src, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => openCodeViewer(src.file, src.start_line, src.end_line)}
                              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-950 border border-slate-700 hover:border-blue-400/60 text-[11px] text-blue-300 font-mono flex items-center gap-1 transition"
                            >
                              <span>{src.file.split(/[\\/]/).pop()}:{src.start_line}-{src.end_line}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === 'ai' && (
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          setCopiedIndex(i);
                          setTimeout(() => setCopiedIndex(null), 2000);
                        }}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 py-0.5"
                      >
                        {copiedIndex === i ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>{copiedIndex === i ? 'Copied' : 'Copy answer'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}

            {chatLoading && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400 px-1">
                  <span>DevIntel AI</span>
                </div>
                <div className="bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-xl p-4 flex items-center gap-3">
                  <Sparkles size={16} className="text-blue-400 animate-pulse" />
                  <span className="text-xs text-slate-300">Searching codebase AST and synthesizing response...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/80">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleChat();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={isCompleted ? "Ask a question about this repository..." : "Indexing in progress..."}
                disabled={!isCompleted || chatLoading}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 bg-slate-800/90 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isCompleted || chatLoading || !query.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm"
              >
                <Send size={14} />
                <span>Ask</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: CODE SEARCH */}
      {activeTab === 'search' && (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Semantic code search (e.g. 'JWT token verification', 'database connection pool', 'errorHandler')..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading || !query.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
              >
                {searchLoading ? <Clock size={14} className="animate-spin" /> : <Search size={14} />}
                <span>Search</span>
              </button>
            </form>

            {/* Language Filter Chips */}
            {availableLanguages.length > 0 && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80 overflow-x-auto">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 whitespace-nowrap">
                  <Filter size={12} /> Filter:
                </span>
                <button
                  onClick={() => { setSearchFilterLang('all'); }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition whitespace-nowrap ${
                    searchFilterLang === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All ({availableLanguages.length} langs)
                </button>
                {availableLanguages.map(lang => (
                  <button
                    key={lang}
                    onClick={() => { setSearchFilterLang(lang); }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition whitespace-nowrap ${
                      searchFilterLang === lang
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Results */}
          <div className="space-y-3">
            {searchLoading ? (
              <div className="p-12 text-center border border-slate-800 rounded-xl bg-slate-900/30">
                <Clock className="w-6 h-6 text-blue-400 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Searching high-dimensional Qdrant vectors...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                <FileCode2 size={24} className="text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Enter a concept, function name, or query above to search.</p>
              </div>
            ) : (
              searchResults.map((chunk, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white font-mono">{chunk.file_path}</span>
                      <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-blue-400 rounded">
                        Lines {chunk.start_line}-{chunk.end_line}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-mono">
                        {chunk.language || 'code'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openCodeViewer(chunk.file_path, chunk.start_line, chunk.end_line)}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-800 transition"
                      >
                        <Eye size={12} />
                        <span>Inspect File</span>
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(chunk.source_code);
                          setCopiedSnippet(idx);
                          setTimeout(() => setCopiedSnippet(null), 2000);
                        }}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-800 transition"
                      >
                        {copiedSnippet === idx ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copiedSnippet === idx ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-56">
                    <code>{chunk.source_code}</code>
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ARCHITECTURE GRAPH */}
      {activeTab === 'graph' && (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Network size={16} className="text-purple-400" />
                  Codebase Module & Dependency Graph
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visual mapping of imports, internal component calls, and structural architecture across repository files.
                </p>
              </div>

              <button
                onClick={fetchGraph}
                disabled={graphLoading}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition self-start"
              >
                <RefreshCw size={13} className={graphLoading ? 'animate-spin' : ''} />
                <span>Refresh Graph</span>
              </button>
            </div>

            {graphData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800">
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Total File Nodes</div>
                  <div className="text-lg font-bold text-white">{graphData.summary.total_nodes}</div>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Dependency Edges</div>
                  <div className="text-lg font-bold text-purple-400">{graphData.summary.total_edges}</div>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Module Clusters</div>
                  <div className="text-lg font-bold text-indigo-400">{Object.keys(graphData.summary.modules).length}</div>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Central Hub Files</div>
                  <div className="text-lg font-bold text-emerald-400">{graphData.summary.hub_files.length}</div>
                </div>
              </div>
            )}
          </div>

          {graphLoading ? (
            <div className="p-16 text-center border border-slate-800 rounded-xl bg-slate-900/40">
              <Clock className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Parsing AST imports and compiling architecture graph...</p>
            </div>
          ) : !graphData ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
              <Network size={28} className="text-slate-500 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Click Refresh Graph above to build dependency tree.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Central Hub Files */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" />
                  Top Hub Files (Most Referenced)
                </h4>
                <div className="space-y-2 flex-1">
                  {graphData.summary.hub_files.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No cross-file imports detected.</p>
                  ) : (
                    graphData.summary.hub_files.map((hub, idx) => (
                      <div
                        key={idx}
                        onClick={() => openCodeViewer(hub.file)}
                        className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-purple-500/50 cursor-pointer flex items-center justify-between transition group"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-mono text-white group-hover:text-purple-400 truncate">
                            {hub.file}
                          </div>
                          <div className="text-[10px] text-slate-500">Target of internal imports</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap">
                          {hub.dependents} links
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Module Clusters & Files List */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Indexed Nodes ({graphData.nodes.length} files)
                  </h4>
                  {/* Folder filter */}
                  <select
                    value={selectedGraphFolder}
                    onChange={e => setSelectedGraphFolder(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 focus:outline-none"
                  >
                    <option value="all">All Modules</option>
                    {Object.keys(graphData.summary.modules).map(mod => (
                      <option key={mod} value={mod}>{mod} ({graphData.summary.modules[mod]})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
                  {graphData.nodes
                    .filter(node => selectedGraphFolder === 'all' || node.folder === selectedGraphFolder)
                    .map((node, idx) => (
                      <div
                        key={idx}
                        onClick={() => openCodeViewer(node.id)}
                        className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-blue-500/50 cursor-pointer flex items-center justify-between transition group"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-mono text-slate-200 group-hover:text-blue-400 truncate">
                            {node.label}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">{node.folder} • {node.lines} lines</div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                          {node.language}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CODE STUDIO (GENERATE & REFACTOR) */}
      {activeTab === 'generate' && (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Wand2 size={16} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Code Studio: AI Generator & Refactoring</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Generate production code, write unit tests, or refactor components grounded in the exact patterns, types, and dependencies of this repository.
            </p>

            {/* Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {[
                { type: 'test', label: 'Unit Tests', prompt: 'Write comprehensive unit test suite using existing testing framework and mocks.' },
                { type: 'endpoint', label: 'New API Route', prompt: 'Create a new REST API endpoint with input validation and error handling.' },
                { type: 'refactor', label: 'Refactor Code', prompt: 'Refactor for performance, readability, and modern language features.' },
                { type: 'types', label: 'Type Definitions', prompt: 'Create strict TypeScript interfaces, types, or Pydantic schemas.' }
              ].map(preset => (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => {
                    setGenTaskType(preset.type);
                    setGenPrompt(preset.prompt);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    genTaskType === preset.type
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-semibold">{preset.label}</div>
                </button>
              ))}
            </div>

            <form onSubmit={handleGenerateCode} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Target Task / Prompt</label>
                  <textarea
                    rows={3}
                    placeholder="Describe what you want to generate (e.g. 'Write Jest test cases covering login validation' or 'Implement rate limiting middleware')..."
                    value={genPrompt}
                    onChange={e => setGenPrompt(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Target File (Optional)</label>
                  <select
                    value={genTargetFile}
                    onChange={e => setGenTargetFile(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">(Auto-detect relevant files)</option>
                    {files.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <div className="text-[10px] text-slate-500 mt-2">
                    DevIntel will retrieve existing conventions from the target file and adjacent modules.
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={genLoading || !genPrompt.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm"
                >
                  {genLoading ? <Clock size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  <span>{genLoading ? 'Generating Grounded Code...' : 'Generate Code'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Code Gen Results */}
          {genResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Generated Implementation</span>
                  {genResult.relevant_files.length > 0 && (
                    <span className="text-[11px] text-slate-400">
                      (Grounded in {genResult.relevant_files.length} repo files)
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(genResult.generated_code);
                    setCopiedGen(true);
                    setTimeout(() => setCopiedGen(false), 2000);
                  }}
                  className="px-3 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition"
                >
                  {copiedGen ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedGen ? 'Copied Code' : 'Copy Code'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 overflow-x-auto max-h-96 leading-relaxed border border-slate-800/80">
                <code>{genResult.generated_code}</code>
              </pre>

              {genResult.explanation && (
                <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 leading-relaxed">
                  <div className="font-semibold text-white mb-1">Integration Notes:</div>
                  <div className="prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {genResult.explanation}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FILES EXPLORER */}
      {activeTab === 'files' && (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter files (e.g. .ts, auth, router)..."
                value={fileFilter}
                onChange={e => setFileFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              Showing {files.filter(f => f.toLowerCase().includes(fileFilter.toLowerCase())).length} of {files.length}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-800 max-h-[550px] overflow-y-auto">
              {files
                .filter(f => f.toLowerCase().includes(fileFilter.toLowerCase()))
                .map((file, idx) => {
                  const ext = file.split('.').pop() || '';
                  return (
                    <div
                      key={idx}
                      className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-800/50 transition group"
                    >
                      <div 
                        onClick={() => openCodeViewer(file)}
                        className="flex items-center gap-2.5 font-mono text-xs text-slate-300 group-hover:text-blue-400 cursor-pointer truncate"
                      >
                        <FileText size={14} className="text-slate-500 group-hover:text-blue-400 shrink-0" />
                        <span className="truncate">{file}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-400 rounded uppercase font-mono">
                          {ext}
                        </span>
                        <button
                          onClick={() => openCodeViewer(file)}
                          className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1 transition"
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: OVERVIEW, GIT INSIGHTS & SECURITY AUDIT */}
      {activeTab === 'overview' && (
        <div className="flex-1 flex flex-col space-y-5">
          {/* Top Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-400 mb-2">Repository Volume</div>
              <div className="text-2xl font-bold text-white">{overview?.total_files || files.length} files</div>
              <div className="text-xs text-slate-500 mt-1">{overview?.total_chunks || 0} AST code chunks indexed</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-400 mb-2">Primary Branch & Activity</div>
              <div className="text-2xl font-bold text-blue-400">{gitInsights?.branch || repo.branch || 'main'}</div>
              <div className="text-xs text-slate-500 mt-1">{gitInsights?.total_commits_inspected || 0} recent commits logged</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-400 mb-2">AI Security & Quality Audit</div>
              <button
                onClick={runAudit}
                disabled={auditLoading || !isCompleted}
                className="w-full mt-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                {auditLoading ? <Clock size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                <span>{auditLoading ? 'Auditing Codebase...' : 'Run Automated AI Audit'}</span>
              </button>
            </div>
          </div>

          {/* Language Breakdown */}
          {overview?.languages && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-white mb-3">Language Distribution (AST Parsed)</h3>
              <div className="space-y-2">
                {Object.entries(overview.languages).map(([lang, count]) => {
                  const pct = Math.round((count / (overview.total_files || 1)) * 100);
                  return (
                    <div key={lang} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono text-slate-300 uppercase">{lang}</span>
                        <span className="text-slate-400">{count} files ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Git Insights Feed */}
          {gitInsights && gitInsights.commits.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <GitCommit size={16} className="text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Recent Git Commits</h3>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {gitInsights.commits.map((c, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="font-mono text-blue-400 font-semibold">{c.hash}</span>
                        <span>{c.time_ago}</span>
                      </div>
                      <div className="text-slate-200 font-medium truncate">{c.message}</div>
                      <div className="text-[11px] text-slate-500 mt-1">by {c.author}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contributors */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={16} className="text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Top Contributors</h3>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {gitInsights.contributors.map((contrib, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300">{contrib.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                        {contrib.commits} commits
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Security & Architecture Audit Report Output */}
          {auditReport && (
            <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Automated Security & Architecture Audit Report</h3>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(auditReport);
                    alert("Audit report copied to clipboard!");
                  }}
                  className="px-3 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Copy size={13} />
                  <span>Copy Report</span>
                </button>
              </div>

              <div className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {auditReport}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CODE VIEWER & EXPLAINER MODAL */}
      {viewerFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3 min-w-0">
                <FileCode2 size={18} className="text-blue-400 shrink-0" />
                <span className="font-mono text-sm text-white font-bold truncate">{viewerFile.path}</span>
                {viewerFile.highlightLines && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-mono border border-blue-500/30">
                    Highlighted lines {viewerFile.highlightLines[0]}-{viewerFile.highlightLines[1]}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExplainCurrentFile}
                  disabled={explaining}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 transition"
                >
                  {explaining ? <Clock size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>{explaining ? 'Analyzing...' : 'Explain with AI'}</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(viewerFile.content);
                    setCopiedViewer(true);
                    setTimeout(() => setCopiedViewer(false), 2000);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Copy Full File"
                >
                  {copiedViewer ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                </button>

                <button
                  onClick={() => setViewerFile(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Close (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* AI Explanation Drawer (if triggered) */}
            {fileExplanation && (
              <div className="p-4 bg-slate-950 border-b border-slate-800 max-h-48 overflow-y-auto text-xs text-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-indigo-400 flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>AI Architectural & Algorithmic Explanation</span>
                  </div>
                  <button onClick={() => setFileExplanation(null)} className="text-slate-500 hover:text-slate-300">
                    <X size={14} />
                  </button>
                </div>
                <div className="prose prose-invert prose-xs max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {fileExplanation}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Modal Code Viewer Body */}
            <div className="flex-1 overflow-auto bg-slate-950 font-mono text-xs">
              <table className="w-full border-collapse">
                <tbody>
                  {viewerFile.content.split('\n').map((line, idx) => {
                    const lineNum = idx + 1;
                    const isHighlighted =
                      viewerFile.highlightLines &&
                      lineNum >= viewerFile.highlightLines[0] &&
                      lineNum <= viewerFile.highlightLines[1];

                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-900/60 ${isHighlighted ? 'bg-blue-950/40 border-l-2 border-blue-500' : ''}`}
                      >
                        <td className="w-12 py-0.5 px-3 select-none text-right text-slate-600 border-r border-slate-800/60 font-mono text-[11px]">
                          {lineNum}
                        </td>
                        <td className={`py-0.5 px-4 whitespace-pre font-mono ${isHighlighted ? 'text-blue-100 font-semibold' : 'text-slate-300'}`}>
                          {line || ' '}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
