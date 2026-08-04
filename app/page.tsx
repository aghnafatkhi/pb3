'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Users, Sparkles, Plus, LogIn, Copy, Check, Heart, RefreshCw, Smartphone, Image as ImageIcon } from 'lucide-react';
import { RoomState, Participant, FrameThemeId, FrameLayoutId, FilterId } from '@/lib/types';
import { Navbar } from '@/components/Navbar';
import { CameraView, CameraViewRef } from '@/components/CameraView';
import { CountdownOverlay } from '@/components/CountdownOverlay';
import { ResultPreviewModal } from '@/components/ResultPreviewModal';
import { FirebaseConfigModal } from '@/components/FirebaseConfigModal';

export default function PhotoboothPage() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [participantId, setParticipantId] = useState<'p1' | 'p2' | null>(null);
  const [userName, setUserName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('room')?.toUpperCase() || '';
    }
    return '';
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const cameraRef = useRef<CameraViewRef | null>(null);
  const isCapturingRef = useRef(false);

  // Restore active room from sessionStorage on initial mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedCode = sessionStorage.getItem('duobooth_room');
    const savedPid = sessionStorage.getItem('duobooth_pid') as 'p1' | 'p2' | null;

    if (savedCode && savedPid) {
      fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          code: savedCode,
          participantId: savedPid,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.room) {
            setRoom(data.room);
            setParticipantId(data.participantId);
          } else {
            sessionStorage.removeItem('duobooth_room');
            sessionStorage.removeItem('duobooth_pid');
          }
        })
        .catch(() => {});
    }
  }, []);

  // Sync Room state from API
  const fetchRoomState = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/room?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.success && data.room) {
        setRoom(data.room);
      } else if (data.error) {
        setErrorMsg(data.error);
      }
    } catch {
      // Ignore network polling glitches
    }
  }, []);

  // Poll room updates and send heartbeat
  useEffect(() => {
    if (!room?.code) return;

    const interval = setInterval(() => {
      fetchRoomState(room.code);
    }, 1000);

    // Heartbeat every 4 seconds
    const heartbeatInterval = setInterval(() => {
      if (participantId) {
        fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'heartbeat',
            code: room.code,
            participantId,
          }),
        }).catch(() => {});
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      clearInterval(heartbeatInterval);
    };
  }, [room?.code, participantId, fetchRoomState]);

  // Handle Photo Capture when Countdown completes
  const handleCountdownComplete = async () => {
    if (isCapturingRef.current || !participantId || !room?.code) return;
    isCapturingRef.current = true;

    try {
      const photoDataUrl = cameraRef.current?.capturePhoto();

      if (photoDataUrl) {
        await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload_photo',
            code: room.code,
            participantId,
            photoUrl: photoDataUrl,
          }),
        });
      }
    } catch (err) {
      console.error('Failed to capture or upload photo', err);
    } finally {
      isCapturingRef.current = false;
    }
  };

  // Create Room (Host)
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: userName.trim() || 'Peserta 1 (Host)',
        }),
      });
      const data = await res.json();

      if (data.success) {
        setRoom(data.room);
        setParticipantId('p1');
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('duobooth_room', data.room.code);
          sessionStorage.setItem('duobooth_pid', 'p1');
        }
      } else {
        setErrorMsg(data.error || 'Gagal membuat sesi');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server');
    } finally {
      setIsLoading(false);
    }
  };

  // Join Room (Guest)
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Masukkan kode room 6-digit');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          code: cleanCode,
          name: userName.trim() || 'Peserta 2 (Guest)',
          participantId: participantId || undefined,
        }),
      });
      const data = await res.json();

      if (data.success && data.room) {
        setRoom(data.room);
        setParticipantId(data.participantId);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('duobooth_room', data.room.code);
          sessionStorage.setItem('duobooth_pid', data.participantId);
        }
      } else {
        setErrorMsg(data.error || 'Gagal bergabung ke sesi. Periksa kembali kode room.');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Ready Status
  const handleToggleReady = async () => {
    if (!room?.code || !participantId) return;
    const currentParticipant = participantId === 'p1' ? room.p1 : room.p2;
    const nextReadyState = !currentParticipant?.isReady;

    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_ready',
          code: room.code,
          participantId,
          isReady: nextReadyState,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRoom(data.room);
      }
    } catch {
      // Ignore
    }
  };

  // Sync Frame Settings
  const handleUpdateSettings = async (settings: {
    frameTheme?: FrameThemeId;
    frameLayout?: FrameLayoutId;
    filterId?: FilterId;
    customTitle?: string;
    customDate?: string;
  }) => {
    if (!room?.code) return;

    // Optimistic state
    setRoom((prev) => (prev ? { ...prev, ...settings } : prev));

    try {
      await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          code: room.code,
          ...settings,
        }),
      });
    } catch {
      // Ignore
    }
  };

  // Retake Photos
  const handleRetake = async () => {
    if (!room?.code) return;
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'retake',
          code: room.code,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRoom(data.room);
      }
    } catch {
      // Ignore
    }
  };

  // Leave Session
  const handleLeaveRoom = () => {
    setRoom(null);
    setParticipantId(null);
    setErrorMsg(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('duobooth_room');
      sessionStorage.removeItem('duobooth_pid');
    }
  };

  // Copy Direct Link
  const copyDirectLink = () => {
    if (!room?.code) return;
    const shareUrl = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const myParticipantObj: Participant | null = participantId === 'p1' ? room?.p1 ?? null : room?.p2 ?? null;
  const otherParticipantObj: Participant | null = participantId === 'p1' ? room?.p2 ?? null : room?.p1 ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 via-slate-50 to-pink-50/40 text-slate-800 font-sans flex flex-col">
      {/* Navbar */}
      <Navbar
        room={room}
        participantId={participantId}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col items-center justify-center">
        {/* ============================================================ */}
        {/* VIEW 1: LANDING PAGE (Create or Join Session) */}
        {/* ============================================================ */}
        {!room && (
          <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header / Hero */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold shadow-xs">
                <Heart className="w-3.5 h-3.5 fill-rose-500" />
                <span>Photobooth Real-time 2 Perangkat</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Foto Berdua, Dimana Saja ✨
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                Satu sesi photobooth untuk 2 orang di HP berbeda. Kamera disandingkan & diambil bersamaan dengan countdown tersinkron!
              </p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium text-center animate-in shake">
                {errorMsg}
              </div>
            )}

            {/* Form Card */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-rose-100/80 space-y-5">
              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama / Panggilan Anda</label>
                <input
                  type="text"
                  placeholder="Contoh: Siska / Budi"
                  value={userName}
                  maxLength={18}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              {/* ACTION CHOICE: CREATE SESSION (HOST) */}
              <form onSubmit={handleCreateRoom} className="space-y-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold rounded-2xl text-sm shadow-lg shadow-rose-200 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Sesi Baru (Dapat Kode Room)</span>
                </button>
              </form>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase">atau</span>
              </div>

              {/* ACTION CHOICE: JOIN SESSION (GUEST) */}
              <form onSubmit={handleJoinRoom} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Masukkan Kode Room 6-Digit</label>
                  <input
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-center text-lg font-extrabold tracking-widest uppercase focus:ring-2 focus:ring-rose-400 focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !joinCodeInput.trim()}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4 text-rose-300" />
                  <span>Gabung ke Sesi Teman</span>
                </button>
              </form>
            </div>

            {/* Feature Guide */}
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-slate-600 pt-2">
              <div className="p-3 bg-white/70 rounded-2xl border border-rose-100 shadow-xs flex flex-col items-center gap-1">
                <Smartphone className="w-4 h-4 text-rose-500" />
                <span>1. Bagikan Kode</span>
              </div>
              <div className="p-3 bg-white/70 rounded-2xl border border-rose-100 shadow-xs flex flex-col items-center gap-1">
                <Users className="w-4 h-4 text-rose-500" />
                <span>2. Tekan Ready</span>
              </div>
              <div className="p-3 bg-white/70 rounded-2xl border border-rose-100 shadow-xs flex flex-col items-center gap-1">
                <ImageIcon className="w-4 h-4 text-rose-500" />
                <span>3. Cetak Foto 2R</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: ACTIVE PHOTOBOOTH SESSION / LOBBY */}
        {/* ============================================================ */}
        {room && (
          <div className="w-full space-y-4 animate-in fade-in duration-300">
            {/* Status Info Banner */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-rose-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    room.p1 && room.p2 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-ping'
                  }`}
                />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {room.p1 && room.p2
                      ? 'Keduanya Terhubung! Tekan tombol Ready.'
                      : 'Menunggu Peserta 2 Bergabung...'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bagikan Kode Room <strong className="text-rose-600 font-extrabold">{room.code}</strong> ke teman Anda.
                  </p>
                </div>
              </div>

              <button
                onClick={copyDirectLink}
                className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-2xl border border-rose-200 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link Sesi'}</span>
              </button>
            </div>

            {/* Cameras Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Participant 1 Slot */}
              <div className="flex flex-col gap-2">
                {participantId === 'p1' ? (
                  <CameraView
                    ref={cameraRef}
                    participantName={room.p1?.name || 'Peserta 1'}
                    isReady={Boolean(room.p1?.isReady)}
                    filterId={room.filterId}
                    isHost={true}
                  />
                ) : room.p1 ? (
                  <div className="relative w-full aspect-[4/3] sm:aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden shadow-xl border-2 border-slate-800 flex flex-col items-center justify-center text-white">
                    {room.p1.photoUrl ? (
                      <img src={room.p1.photoUrl} alt="Host snapshot" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-4 gap-2">
                        <Camera className="w-10 h-10 text-rose-400 animate-pulse" />
                        <span className="font-bold text-sm text-slate-200">{room.p1.name} (Host)</span>
                        <span className="text-xs text-slate-400">Kamera Terhubung</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-slate-900/80 px-3 py-1 rounded-full text-xs font-bold text-white">
                      {room.p1.name} (Host)
                    </div>
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      {room.p1.isReady ? 'READY ✨' : 'BELUM READY'}
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] sm:aspect-[3/4] bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs font-semibold p-4 text-center">
                    <span>Host disconnected</span>
                  </div>
                )}
              </div>

              {/* Participant 2 Slot */}
              <div className="flex flex-col gap-2">
                {participantId === 'p2' ? (
                  <CameraView
                    ref={cameraRef}
                    participantName={room.p2?.name || 'Peserta 2'}
                    isReady={Boolean(room.p2?.isReady)}
                    filterId={room.filterId}
                    isHost={false}
                  />
                ) : room.p2 ? (
                  <div className="relative w-full aspect-[4/3] sm:aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden shadow-xl border-2 border-slate-800 flex flex-col items-center justify-center text-white">
                    {room.p2.photoUrl ? (
                      <img src={room.p2.photoUrl} alt="Guest snapshot" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-4 gap-2">
                        <Camera className="w-10 h-10 text-rose-400 animate-pulse" />
                        <span className="font-bold text-sm text-slate-200">{room.p2.name}</span>
                        <span className="text-xs text-slate-400">Kamera Terhubung</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-slate-900/80 px-3 py-1 rounded-full text-xs font-bold text-white">
                      {room.p2.name}
                    </div>
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      {room.p2.isReady ? 'READY ✨' : 'BELUM READY'}
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] sm:aspect-[3/4] bg-slate-100/80 rounded-3xl border-2 border-dashed border-rose-200 flex flex-col items-center justify-center text-rose-400 text-xs font-semibold p-6 text-center gap-2">
                    <Users className="w-8 h-8 text-rose-300 animate-bounce" />
                    <span>Menunggu Peserta 2 Bergabung...</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Minta teman memasukkan kode <strong className="text-rose-600">{room.code}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Big Action Button: Toggle Ready */}
            <div className="pt-2">
              <button
                onClick={handleToggleReady}
                disabled={!room.p2}
                className={`w-full py-4 rounded-3xl font-extrabold text-base sm:text-lg shadow-xl flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 ${
                  myParticipantObj?.isReady
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'
                }`}
              >
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>
                  {!room.p2
                    ? 'MENUNGGU PESERTA 2...'
                    : myParticipantObj?.isReady
                    ? 'BATALKAN READY (SUDAH READY)'
                    : 'SAYA READY! 📸'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Synchronized Countdown Overlay */}
        {room?.status === 'counting' && room.countdownStartTime && (
          <CountdownOverlay
            countdownStartTime={room.countdownStartTime}
            onCountdownComplete={handleCountdownComplete}
          />
        )}

        {/* Result Preview Modal (2R Print Canvas) */}
        {room?.status === 'captured' && (
          <ResultPreviewModal
            isOpen={true}
            p1PhotoUrl={room.p1?.photoUrl || null}
            p2PhotoUrl={room.p2?.photoUrl || null}
            p1Name={room.p1?.name || 'Peserta 1'}
            p2Name={room.p2?.name || 'Peserta 2'}
            frameTheme={room.frameTheme || 'blush'}
            frameLayout={room.frameLayout || 'split-side'}
            filterId={room.filterId || 'normal'}
            customTitle={room.customTitle || 'DUOBOOTH'}
            customDate={room.customDate || new Date().toLocaleDateString('id-ID')}
            onUpdateSettings={handleUpdateSettings}
            onRetake={handleRetake}
          />
        )}

        {/* Firebase Settings Modal */}
        <FirebaseConfigModal
          isOpen={isFirebaseModalOpen}
          onClose={() => setIsFirebaseModalOpen(false)}
        />
      </main>
    </div>
  );
}
