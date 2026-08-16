import React, { useState, useEffect } from 'react';
import { Fingerprint, ShieldCheck, Activity, Cpu } from 'lucide-react';
import axios from 'axios';

function App() {
  const [healthStatus, setHealthStatus] = useState({ status: 'checking...', timestamp: null });

  useEffect(() => {
    axios.get('/api/health')
      .then(res => setHealthStatus(res.data))
      .catch(err => setHealthStatus({ status: 'error', error: err.message }));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-md w-full glass-card p-8 rounded-2xl text-center relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-bio-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-2xl bg-bio-500/10 border border-bio-500/30 text-bio-400">
            <Fingerprint className="w-12 h-12 animate-pulse" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2 text-white">
          Contact Recognition System
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          Biometric Hardware Interface &amp; Contact Identification
        </p>

        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800 mb-4 text-xs font-mono">
          <span className="flex items-center gap-2 text-slate-400">
            <Cpu className="w-4 h-4 text-bio-400" /> Backend API
          </span>
          <span className={`px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
            healthStatus.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {healthStatus.status}
          </span>
        </div>

        <div className="text-xs text-slate-500">
          Target: ESP32 + AS608 / R307 Optical Sensor
        </div>
      </div>
    </div>
  );
}

export default App;
