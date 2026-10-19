import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  GitBranch, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight,
  Search,
  MessageSquare,
  Network,
  Wand2,
  FolderTree,
  ExternalLink,
  Code2
} from 'lucide-react';
import { API_BASE_URL } from '../config';

interface Repository {
  id: number;
  github_url: string;
  name: string;
  owner: string;
  branch: string;
  status: string;
  created_at: string;
  error_message?: string;
}

export default function Dashboard() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [addingTemplate, setAddingTemplate] = useState<string | null>(null);

  const fetchRepos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/repositories`);
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
      }
    } catch (e) {
      console.error('Failed to fetch repos', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
    const interval = setInterval(fetchRepos, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this repository and all its vector indices?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/repositories/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRepos(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const quickAdd = async (url: string, name: string) => {
    setAddingTemplate(name);
    try {
      const res = await fetch(`${API_BASE_URL}/repositories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_url: url })
      });
      if (res.ok) {
        fetchRepos();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingTemplate(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={13} className="text-emerald-400" />
            Ready
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle size={13} className="text-rose-400" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <Clock size={13} className="text-blue-400 animate-spin" />
            {status}
          </span>
        );
    }
  };

  const filteredRepos = repos.filter(r => 
    r.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    r.owner.toLowerCase().includes(filterQuery.toLowerCase()) ||
    r.status.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/70 via-indigo-950/40 to-slate-900 border border-blue-500/20 p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-3">
            <Sparkles size={14} className="text-blue-400" />
            Semantic AST Codebase Intelligence & Pair Programmer
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Explore and build across codebases with deep AI intelligence.
          </h1>
          <p className="mt-3 text-slate-300 text-sm leading-relaxed">
            DevIntel indexes GitHub repositories with 25+ Tree-sitter AST grammars, builds semantic vector indexes with Qdrant and Gemini embeddings, maps dependency architecture graphs, and writes grounded code.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 backdrop-blur-sm">
            <div className="text-xs text-slate-400 font-medium">Indexed Repos</div>
            <div className="text-2xl font-bold text-white mt-1">
              {repos.filter(r => r.status === 'COMPLETED').length} <span className="text-xs text-slate-500 font-normal">ready</span>
            </div>
          </div>
          <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 backdrop-blur-sm">
            <div className="text-xs text-slate-400 font-medium">Vector Engine</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">Qdrant</div>
          </div>
          <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 backdrop-blur-sm">
            <div className="text-xs text-slate-400 font-medium">Supported Languages</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1">25+ Languages</div>
          </div>
          <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 backdrop-blur-sm">
            <div className="text-xs text-slate-400 font-medium">AI Pair Engine</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">Gemini Flash RAG</div>
          </div>
        </div>
      </div>

      {/* 1-Click Starter Repositories Section */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Code2 size={16} className="text-blue-400" />
              1-Click Multi-Language Starters
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly index popular open-source repositories to test DevIntel across languages.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => quickAdd('https://github.com/gothinkster/node-express-realworld-example-app', 'Express')}
            disabled={addingTemplate !== null}
            className="flex flex-col p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/40 text-left transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white group-hover:text-blue-400 transition">TypeScript & Node</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/10 text-blue-400 rounded">Fullstack</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono truncate">RealWorld Express API</div>
          </button>

          <button
            onClick={() => quickAdd('https://github.com/bottlepy/bottle', 'Bottle')}
            disabled={addingTemplate !== null}
            className="flex flex-col p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 text-left transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white group-hover:text-indigo-400 transition">Python Web</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-indigo-500/10 text-indigo-400 rounded">Micro-framework</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono truncate">bottlepy/bottle</div>
          </button>

          <button
            onClick={() => quickAdd('https://github.com/fatih/color', 'ColorGo')}
            disabled={addingTemplate !== null}
            className="flex flex-col p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white group-hover:text-cyan-400 transition">Golang Package</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-cyan-500/10 text-cyan-400 rounded">Go AST</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono truncate">fatih/color</div>
          </button>

          <button
            onClick={() => quickAdd('https://github.com/octocat/Spoon-Knife', 'SpoonKnife')}
            disabled={addingTemplate !== null}
            className="flex flex-col p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 text-left transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white group-hover:text-emerald-400 transition">HTML & Git</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 rounded">Minimal</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono truncate">octocat/Spoon-Knife</div>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white tracking-tight">Your Repositories</h2>
            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-400 font-mono">
              {repos.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter repositories..."
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-52 sm:w-64"
              />
            </div>
            <Link
              to="/add"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition whitespace-nowrap"
            >
              + Index Repository
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 border border-slate-800 rounded-xl bg-slate-900/30">
            <Clock className="w-8 h-8 text-blue-400 animate-spin mb-3" />
            <p className="text-sm text-slate-400 font-medium">Loading repositories...</p>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400 mb-4">
              <FolderTree size={24} />
            </div>
            <h3 className="text-base font-semibold text-white">No repositories found</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              {filterQuery ? "No repositories match your filter query." : "Index a public GitHub repository or click one of the starter templates above to begin."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRepos.map(repo => (
              <div
                key={repo.id}
                className="flex flex-col justify-between p-5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700 transition duration-200 shadow-sm group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/repo/${repo.id}`}
                          className="font-bold text-white text-base hover:text-blue-400 transition truncate group-hover:underline"
                        >
                          {repo.name}
                        </Link>
                        <a
                          href={repo.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-500 hover:text-slate-300"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">by {repo.owner}</div>
                    </div>
                    {getStatusBadge(repo.status)}
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <GitBranch size={13} className="text-slate-500" />
                      <span>{repo.branch || 'main'}</span>
                    </div>
                    <div>
                      <span>Added {new Date(repo.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {repo.error_message && (
                    <div className="mt-3 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                      {repo.error_message}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  {/* Action Shortcuts */}
                  {repo.status === 'COMPLETED' ? (
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/repo/${repo.id}`}
                        className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 flex items-center gap-1 transition"
                      >
                        <MessageSquare size={12} />
                        <span>Chat</span>
                      </Link>
                      <Link
                        to={`/repo/${repo.id}?tab=graph`}
                        className="px-2.5 py-1 text-xs font-medium rounded-md bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 flex items-center gap-1 transition"
                      >
                        <Network size={12} />
                        <span>Graph</span>
                      </Link>
                      <Link
                        to={`/repo/${repo.id}?tab=generate`}
                        className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 transition"
                      >
                        <Wand2 size={12} />
                        <span>Studio</span>
                      </Link>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">Processing pipeline...</span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDelete(e, repo.id)}
                      disabled={deletingId === repo.id}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-md transition"
                      title="Delete Repository"
                    >
                      <Trash2 size={15} />
                    </button>
                    <Link
                      to={`/repo/${repo.id}`}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition flex items-center"
                    >
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
