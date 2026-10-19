import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AddRepository from './components/AddRepository';
import Workspace from './components/Workspace';
import { Terminal, Plus, Github, Layers } from 'lucide-react';

function Navbar() {
  const location = useLocation();
  const [engineOnline, setEngineOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const checkEngine = async () => {
      try {
        const res = await fetch('http://localhost:8000/repositories', { method: 'GET' });
        setEngineOnline(res.ok);
      } catch {
        setEngineOnline(false);
      }
    };
    checkEngine();
    const interval = setInterval(checkEngine, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-90 transition">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Terminal size={20} className="stroke-[2.5]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-extrabold text-xl tracking-tight">DevIntel</span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300 border border-blue-500/30 rounded">
                v1.2 Pro
              </span>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-1.5 text-sm font-medium">
            <Link 
              to="/" 
              className={`px-3 py-1.5 rounded-lg transition ${location.pathname === '/' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              Repositories
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Engine Status Indicator */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className={`w-2 h-2 rounded-full ${engineOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse' : engineOnline === false ? 'bg-rose-500' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-medium">
              {engineOnline ? 'Engine Online' : engineOnline === false ? 'Engine Offline' : 'Connecting...'}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300">
            <Layers size={13} />
            <span>25+ Languages</span>
          </div>

          <Link 
            to="/add" 
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm transition"
          >
            <Plus size={15} />
            <span>Add Repository</span>
          </Link>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
            title="GitHub"
          >
            <Github size={18} />
          </a>
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add" element={<AddRepository />} />
            <Route path="/repo/:id" element={<Workspace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
