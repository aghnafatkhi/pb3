'use client';

import React, { useState } from 'react';
import { Database, Key, HelpCircle, CheckCircle2, Copy, X } from 'lucide-react';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FirebaseConfigModal({ isOpen, onClose }: FirebaseConfigModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('custom_firebase_config', JSON.stringify({
        apiKey,
        authDomain,
        projectId,
      }));
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1200);
    }
  };

  const sampleSnippet = `// Firestore / Realtime Database Setup
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "${apiKey || 'YOUR_API_KEY'}",
  authDomain: "${authDomain || 'YOUR_PROJECT.firebaseapp.com'}",
  projectId: "${projectId || 'YOUR_PROJECT_ID'}"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);`;

  const copyCode = () => {
    navigator.clipboard.writeText(sampleSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-rose-100 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-rose-100">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-lg">
            <Database className="w-5 h-5" />
            <span>Pengaturan Firebase Realtime (Opsional)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm text-slate-600">
          <p className="bg-rose-50 text-rose-800 p-3 rounded-xl border border-rose-200/60 leading-relaxed text-xs sm:text-sm">
            ✨ <strong>Aplikasi ini sudah siap dipakai langsung secara otomatis!</strong>
            <br />
            Jika Anda ingin menghubungkan ke Firebase milik Anda sendiri untuk sinkronisasi antardevice independen, masukkan konfigurasi di bawah ini.
          </p>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block font-medium text-slate-700 text-xs mb-1">
                API Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 text-xs mb-1">
                  Auth Domain
                </label>
                <input
                  type="text"
                  placeholder="app.firebaseapp.com"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 text-xs mb-1">
                  Project ID
                </label>
                <input
                  type="text"
                  placeholder="my-photobooth-app"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-rose-200 flex items-center justify-center gap-2 active:scale-98"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Konfigurasi Disimpan!
                </>
              ) : (
                'Simpan Konfigurasi Firebase'
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-xs text-slate-700 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-rose-500" /> Contoh Kode Integrasi Firebase
              </span>
              <button
                type="button"
                onClick={copyCode}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin!' : 'Salin Kode'}
              </button>
            </div>

            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] overflow-x-auto font-mono leading-relaxed">
              {sampleSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
