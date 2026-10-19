import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Search, 
  MessageSquare, 
  Code, 
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
  AlertCircle,
  FileText
} from 'lucide-react';

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

export default function Workspace() {
  const { id } = useParams();
  const [repo, setRepo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'search' | 'files'>('chat');
  const [query, setQuery] = useState('');
  
  // Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<number | null>(null);

  // Files state
  const [files, setFiles] = useState<string[]>([]);
  const [fileFilter, setFileFilter] = useState('');

  const fetchRepo = async () => {
    try {
      const res = await fetch(`http://localhost:8000/repositories/${id}`);
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
      const res = await fetch(`http://localhost:8000/repositories/${id}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRepo();
    fetchFiles();
    const interval = setInterval(() => {
      fetchRepo();
    }, 2500);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  const handleChat = async (questionText?: string) => {
    const textToSend = questionText || query;
    if (!textToSend.trim() || chatLoading) return;
    
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', content: textToSend }]);
    setChatLoading(true);
    
    try {
      const res = await fetch(`http://localhost:8000/repositories/${id}/chat`, {
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
    if (!query.trim()) return;
    
    setSearchLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/repositories/${id}/search?q=${encodeURIComponent(query)}`);
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

  const copyToClipboard = (text: string, index: number, isSnippet: boolean = false) => {
    navigator.clipboard.writeText(text);
    if (isSnippet) {
      setCopiedSnippet(index);
      setTimeout(() => setCopiedSnippet(null), 2000);
    } else {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const sampleQuestions = [
    "How is this application structured?",
    "Where are the main routes and API endpoints defined?",
    "How does user authentication work?",
    "Show me the database models or schemas"
  ];

  if (!repo) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Workspace Top Header */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-white tracking-tight">{repo.owner} / {repo.name}</h1>
              <a 
                href={repo.github_url} 
                target="_blank" 
                rel="noreferrer" 
                className="text-slate-400 hover:text-blue-400 transition"
                title="View on GitHub"
              >
                <ExternalLink size={15} />
              </a>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>branch: <span className="text-slate-300 font-mono">{repo.branch || 'main'}</span></span>
              <span>•</span>
              <span>status:</span>
              {repo.status === 'COMPLETED' ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 size={12} /> Ready
                </span>
              ) : repo.status === 'FAILED' ? (
                <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                  <AlertCircle size={12} /> Failed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-blue-400 font-medium animate-pulse">
                  <Clock size={12} className="animate-spin" /> {repo.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'chat' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare size={14} />
            Ask DevIntel
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'search' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search size={14} />
            Search Codebase
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'files' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderTree size={14} />
            Files ({files.length})
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      {repo.status === 'FAILED' ? (
        <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Indexing Failed</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            DevIntel encountered an error while cloning or parsing this repository:
          </p>
          <pre className="text-xs bg-slate-950 text-rose-300 border border-rose-500/20 p-4 rounded-xl max-w-xl overflow-x-auto text-left font-mono mb-6">
            {repo.error_message || 'Unknown repository cloning or parsing error.'}
          </pre>
          <Link to="/" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition">
            Back to Dashboard
          </Link>
        </div>
      ) : repo.status !== 'COMPLETED' ? (
        <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 animate-spin">
            <Clock size={24} />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Indexing in Progress...</h2>
          <p className="text-sm text-slate-400 mb-2">Status: <span className="text-blue-400 font-mono">{repo.status}</span></p>
          <p className="text-xs text-slate-500 max-w-sm">
            Discovering files, running Tree-sitter AST parser, generating 3072-dim embeddings, and building vector index in Qdrant.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* TAB 1: ASK DEVINTEL (CHAT) */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col bg-slate-900">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatHistory.length === 0 ? (
                  <div className="max-w-xl mx-auto py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                      <Sparkles size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Ask questions about {repo.name}</h3>
                    <p className="text-xs text-slate-400 mb-6">
                      DevIntel retrieves relevant functions via Qdrant vector search and generates answers grounded in source code.
                    </p>

                    <div className="text-left space-y-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Suggested questions:
                      </span>
                      {sampleQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleChat(q)}
                          className="w-full text-left p-3 text-xs bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 hover:text-white transition flex items-center justify-between group"
                        >
                          <span>{q}</span>
                          <span className="text-blue-400 group-hover:translate-x-0.5 transition">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-3xl rounded-2xl p-5 shadow-lg ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white ml-12' 
                          : 'bg-slate-950 border border-slate-800 text-slate-200 mr-12'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] uppercase tracking-wider font-bold opacity-60">
                            {msg.role === 'user' ? 'You' : 'DevIntel AI'}
                          </span>
                          {msg.role === 'ai' && (
                            <button
                              onClick={() => copyToClipboard(msg.content, i)}
                              className="text-slate-400 hover:text-white p-1 rounded transition"
                              title="Copy response"
                            >
                              {copiedIndex === i ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>
                          )}
                        </div>

                        {/* Markdown Formatted Answer */}
                        <div className="prose prose-invert prose-sm max-w-none text-slate-200 leading-relaxed font-normal">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>

                        {/* Source Citations */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-5 pt-4 border-t border-slate-800">
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                              <Code size={13} className="text-blue-400" />
                              <span>Referenced Code Chunks ({msg.sources.length})</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {msg.sources.map((src, j) => (
                                <div
                                  key={j}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300"
                                >
                                  <FileCode2 size={13} className="text-blue-400 shrink-0" />
                                  <span className="text-white font-medium">{src.file}</span>
                                  <span className="text-slate-500">L{src.start_line}-L{src.end_line}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" />
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                      <span className="text-xs text-slate-400 ml-1">Analyzing repository AST & generating response...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-4 bg-slate-950 border-t border-slate-800">
                <form onSubmit={(e) => { e.preventDefault(); handleChat(); }} className="flex gap-2 max-w-4xl mx-auto">
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Ask anything about the codebase..."
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !query.trim()}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition disabled:opacity-40"
                  >
                    <span>Send</span>
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: SEARCH CODEBASE */}
          {activeTab === 'search' && (
            <div className="flex-1 flex flex-col bg-slate-900">
              <div className="p-5 bg-slate-950 border-b border-slate-800">
                <form onSubmit={handleSearch} className="flex gap-2 max-w-4xl mx-auto">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 text-slate-500" size={17} />
                    <input
                      type="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Search concepts, functions, routes (e.g. 'router', 'authenticate', 'database')..."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searchLoading || !query.trim()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40"
                  >
                    {searchLoading ? 'Searching...' : 'Search'}
                  </button>
                </form>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {searchResults.length === 0 && !searchLoading && (
                  <div className="text-center py-16 text-slate-500">
                    <Search size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Search for functions, classes, or architecture concepts.</p>
                    <p className="text-xs mt-1">DevIntel performs semantic vector retrieval against parsed AST code units.</p>
                  </div>
                )}

                {searchResults.map((result, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base truncate font-mono text-blue-400">
                            {result.symbol_name}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {result.symbol_type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-1.5">
                          <FileCode2 size={13} className="text-slate-500" />
                          <span>{result.file_path}</span>
                          <span className="text-slate-600">•</span>
                          <span>Lines {result.start_line} - {result.end_line}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => copyToClipboard(result.source_code, i, true)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                        title="Copy code snippet"
                      >
                        {copiedSnippet === i ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                      </button>
                    </div>

                    <div className="relative rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
                      <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
                        <code>{result.source_code}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: FILES EXPLORER */}
          {activeTab === 'files' && (
            <div className="flex-1 flex flex-col bg-slate-900">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
                <input
                  type="text"
                  value={fileFilter}
                  onChange={e => setFileFilter(e.target.value)}
                  placeholder="Filter files by name..."
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
                />
                <span className="text-xs text-slate-400">
                  {files.filter(f => f.toLowerCase().includes(fileFilter.toLowerCase())).length} files indexed
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-800/60">
                {files
                  .filter(f => f.toLowerCase().includes(fileFilter.toLowerCase()))
                  .map((filePath, i) => (
                    <div 
                      key={i} 
                      className="py-2.5 px-3 hover:bg-slate-800/50 rounded-lg flex items-center justify-between group transition cursor-pointer"
                      onClick={() => {
                        setQuery(filePath);
                        setActiveTab('search');
                      }}
                    >
                      <div className="flex items-center gap-2.5 font-mono text-xs text-slate-300 group-hover:text-white">
                        <FileText size={15} className="text-blue-400 shrink-0" />
                        <span className="truncate">{filePath}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 group-hover:text-blue-400 transition font-sans">
                        Search chunks →
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
