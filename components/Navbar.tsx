'use client';

import React, { useState } from 'react';
import { Camera, Copy, Check, Database, Users, LogOut, Sparkles } from 'lucide-react';
import { RoomState } from '@/lib/types';

interface NavbarProps {
  room: RoomState | null;
  participantId: 'p1' | 'p2' | null;
  onOpenFirebaseModal: () => void;
  onLeaveRoom: () => void;
}

export function Navbar({ room, participantId, onOpenFirebaseModal, onLeaveRoom }: NavbarProps) {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isBothConnected = Boolean(room?.p1 && room?.p2);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-rose-100 px-4 py-3 safe-top">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-200">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight flex items-center gap-1">
              DUOBOOTH <Sparkles className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            </h1>
            <p className="text-[10px] text-slate-500 font-medium">Photobooth Online 2 Orang</p>
          </div>
        </div>

        {/* Room Info & Status */}
        {room ? (
          <div className="flex items-center gap-2">
            {/* Copy Room Code Button */}
            <button
              onClick={copyRoomCode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-full text-xs font-bold text-rose-700 transition-all active:scale-95 shadow-xs"
              title="Klik untuk salin Kode Room"
            >
              <span className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold">ROOM:</span>
              <span className="tracking-widest">{room.code}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* Connection Status Badge */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                isBothConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isBothConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <Users className="w-3.5 h-3.5" />
              <span>{isBothConnected ? '2/2 Terhubung' : '1/2 Menunggu'}</span>
            </div>

            {/* Exit Room */}
            <button
              onClick={onLeaveRoom}
              title="Keluar Sesi"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenFirebaseModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium transition-all"
          >
            <Database className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Firebase DB</span>
          </button>
        )}
      </div>
    </header>
  );
}
