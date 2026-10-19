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
  Layers
} from 'lucide-react';

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

  const fetchRepos = async () => {
    try {
      const res = await fetch('http://localhost:8000/repositories');
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
    if (!confirm('Are you sure you want to delete this repository and its vectors?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`http://localhost:8000/repositories/${id}`, {
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

  const quickAdd = async (url: string) => {
    try {
      const res = await fetch('http://localhost:8000/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_url: url })
      });
      if (res.ok) {
        fetchRepos();
      }
    } catch (e) {
      console.error(e);
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

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-slate-900 border border-blue-500/20 p-8 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-3">
            <Sparkles size={14} className="text-blue-400" />
            Semantic AST Codebase Intelligence
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Explore codebases with AI intelligence.
          </h1>
          <p className="mt-3 text-slate-300 text-sm leading-relaxed">
            DevIntel indexes GitHub repositories with Tree-sitter AST parsing, generates high-dimensional embeddings, and answers architectural questions with exact source code references.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">Indexed Repos</div>
            <div className="text-2xl font-bold text-white mt-1">{repos.filter(r => r.status === 'COMPLETED').length}</div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">Vector Engine</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">Qdrant</div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">AI Model</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1">Gemini</div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">Supported ASTs</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">Py, JS, TS, Java</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Your Repositories</h2>
            <p className="text-sm text-slate-400">Select any repository to open its workspace and query code.</p>
          </div>
          <Link
            to="/add"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg shadow-blue-600/20"
          >
            Add Repository
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map(i => (
              <div key={i} className="h-32 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse p-6" />
            ))}
          </div>
        ) : repos.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
            <Layers className="mx-auto h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-white">No repositories indexed yet</h3>
            <p className="mt-1 text-sm text-slate-400">Get started by entering a public GitHub URL or picking a template below.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => quickAdd('https://github.com/bottlepy/bottle')}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                + Index Bottle (Python)
              </button>
              <button
                onClick={() => quickAdd('https://github.com/gothinkster/node-express-realworld-example-app')}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                + Index RealWorld App (Node/Express)
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {repos.map(repo => (
              <Link
                key={repo.id}
                to={`/repo/${repo.id}`}
                className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition flex flex-col justify-between shadow-lg shadow-black/20"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-400 font-mono tracking-wide">{repo.owner}</div>
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition truncate mt-0.5">
                        {repo.name}
                      </h3>
                    </div>
                    {getStatusBadge(repo.status)}
                  </div>

                  <p className="text-xs text-slate-400 truncate mt-2 font-mono flex items-center gap-1.5">
                    <GitBranch size={13} className="text-slate-500" />
                    <span>{repo.branch || 'main'}</span>
                    <span className="text-slate-600">•</span>
                    <span className="truncate">{repo.github_url}</span>
                  </p>

                  {repo.error_message && (
                    <div className="mt-3 text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 p-2.5 rounded-lg line-clamp-2">
                      {repo.error_message}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2 group-hover:text-blue-400 transition font-medium">
                    <span>Open Workspace</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition" />
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, repo.id)}
                    disabled={deletingId === repo.id}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
                    title="Delete repository"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Repositories Section */}
      <div className="bg-slate-900/40 rounded-xl border border-slate-800/80 p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Quick Index Starters</h3>
        <p className="text-xs text-slate-400 mb-4">Click to automatically add and index verified open-source codebases:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => quickAdd('https://github.com/bottlepy/bottle')}
            className="text-left p-3.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/40 transition group"
          >
            <div className="font-semibold text-sm text-slate-200 group-hover:text-blue-400">bottlepy / bottle</div>
            <div className="text-xs text-slate-400 mt-1">Lightweight Python web framework (~1,000 lines)</div>
          </button>
          <button
            onClick={() => quickAdd('https://github.com/gothinkster/node-express-realworld-example-app')}
            className="text-left p-3.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/40 transition group"
          >
            <div className="font-semibold text-sm text-slate-200 group-hover:text-blue-400">node-express-realworld</div>
            <div className="text-xs text-slate-400 mt-1">Complete Medium clone with auth, CRUD, and models</div>
          </button>
          <button
            onClick={() => quickAdd('https://github.com/octocat/Spoon-Knife')}
            className="text-left p-3.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/40 transition group"
          >
            <div className="font-semibold text-sm text-slate-200 group-hover:text-blue-400">octocat / Spoon-Knife</div>
            <div className="text-xs text-slate-400 mt-1">HTML/CSS sample project for instant testing</div>
          </button>
        </div>
      </div>
    </div>
  );
}
