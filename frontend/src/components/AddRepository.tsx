import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Github, ArrowLeft, Sparkles, Check, AlertCircle } from 'lucide-react';

export default function AddRepository() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_url: url })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to add repository');
      }
      
      const created = await res.json();
      navigate(`/repo/${created.id}`);
    } catch (e: any) {
      setError(e.message || 'Error adding repository');
      setLoading(false);
    }
  };

  const sampleUrls = [
    { name: 'Bottle (Python)', url: 'https://github.com/bottlepy/bottle' },
    { name: 'RealWorld App (Express)', url: 'https://github.com/gothinkster/node-express-realworld-example-app' },
    { name: 'Axios (TypeScript)', url: 'https://github.com/axios/axios' },
    { name: 'Spoon-Knife (HTML)', url: 'https://github.com/octocat/Spoon-Knife' }
  ];

  return (
    <div className="max-w-xl mx-auto py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Github size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Index GitHub Repository</h2>
            <p className="text-xs text-slate-400 mt-0.5">Enter any public repository to clone, parse AST, and index vectors.</p>
          </div>
        </div>
        
        {error && (
          <div className="mb-6 bg-rose-500/10 text-rose-300 border border-rose-500/20 p-3.5 rounded-xl text-sm flex items-start gap-2.5">
            <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Public GitHub Repository URL
            </label>
            <input 
              type="url" 
              required
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
              placeholder="https://github.com/username/repository"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div>
            <span className="text-xs text-slate-400 block mb-2">Or choose a recommended repository:</span>
            <div className="flex flex-wrap gap-2">
              {sampleUrls.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setUrl(s.url)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 hover:border-blue-500/40 transition"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading || !url.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Cloning & Starting Pipeline...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Begin Indexing Codebase</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-emerald-400" />
            <span>Parses functions, classes, and methods using Tree-sitter AST</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={14} className="text-emerald-400" />
            <span>3072-dimension Gemini vector embeddings indexed in Qdrant</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={14} className="text-emerald-400" />
            <span>Automatic filtering of node_modules, build artifacts, and binaries</span>
          </div>
        </div>
      </div>
    </div>
  );
}
