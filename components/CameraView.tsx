'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Camera, RefreshCw, FlipHorizontal, AlertCircle, Sparkles } from 'lucide-react';
import { FilterId } from '@/lib/types';

export interface CameraViewRef {
  capturePhoto: () => string | null;
}

interface CameraViewProps {
  participantName: string;
  isReady: boolean;
  filterId: FilterId;
  onCameraStateChange?: (active: boolean) => void;
  badgeLabel?: string;
  isHost?: boolean;
}

export const CameraView = forwardRef<CameraViewRef, CameraViewProps>(({
  participantName,
  isReady,
  filterId,
  onCameraStateChange,
  badgeLabel,
  isHost = false,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);

  // Initialize camera stream
  const startCamera = React.useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      setErrorMessage(null);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setHasPermission(true);
      setIsStreamActive(true);
      onCameraStateChange?.(true);
    } catch (err: unknown) {
      setHasPermission(false);
      setIsStreamActive(false);
      onCameraStateChange?.(false);
      const errorStr = err instanceof Error ? err.message : String(err);
      if (errorStr.includes('NotAllowedError') || errorStr.includes('Permission denied')) {
        setErrorMessage('Akses kamera ditolak. Izinkan akses kamera di pengaturan browser HP Anda.');
      } else if (errorStr.includes('NotFoundError')) {
        setErrorMessage('Kamera tidak ditemukan di perangkat ini.');
      } else {
        setErrorMessage('Tidak dapat membuka kamera. Pastikan aplikasi lain tidak menggunakan kamera.');
      }
    }
  }, [facingMode, onCameraStateChange]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Imperative handle for parent trigger capture
  useImperativeHandle(ref, () => ({
    capturePhoto: () => {
      if (!videoRef.current) return null;
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 960;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Apply mirror flip if enabled
      if (isMirrored && facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.92);
    },
  }));

  // Toggle front / back camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Filter style mapping for preview
  const getFilterStyle = (): string => {
    switch (filterId) {
      case 'soft-warm':
        return 'sepia(0.2) saturate(1.25) brightness(1.05)';
      case 'bw-classic':
        return 'grayscale(1) contrast(1.15)';
      case 'pastel-glow':
        return 'saturate(1.3) contrast(0.95) brightness(1.1)';
      case 'retro-film':
        return 'sepia(0.4) contrast(1.1) brightness(0.95) hue-rotate(-10deg)';
      default:
        return 'none';
    }
  };

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden shadow-xl border-2 border-slate-800 group">
      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover transition-all duration-300 ${
          isMirrored && facingMode === 'user' ? '-scale-x-100' : ''
        }`}
        style={{ filter: getFilterStyle() }}
      />

      {/* Permission / Error State */}
      {hasPermission === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-900/95 text-center text-white z-20">
          <AlertCircle className="w-12 h-12 text-rose-400 mb-3 animate-bounce" />
          <p className="font-semibold text-sm sm:text-base text-rose-200 mb-2">{errorMessage}</p>
          <button
            onClick={startCamera}
            className="mt-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-full text-xs sm:text-sm shadow-lg flex items-center gap-2 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Coba Buka Kamera Again
          </button>
        </div>
      )}

      {/* Participant & Ready Status Badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/75 backdrop-blur-md rounded-full text-white text-xs font-semibold shadow-md">
          <span className={`w-2 h-2 rounded-full ${isStreamActive ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
          <span className="truncate max-w-[120px]">{participantName}</span>
          {isHost && <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold ml-1">HOST</span>}
        </div>

        {badgeLabel ? (
          <span className="px-3 py-1 bg-slate-900/75 backdrop-blur-md text-amber-300 rounded-full text-[11px] font-bold">
            {badgeLabel}
          </span>
        ) : (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-1 ${
              isReady
                ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                : 'bg-slate-800/80 text-slate-300 backdrop-blur-md'
            }`}
          >
            {isReady ? 'READY ✨' : 'BELUM READY'}
          </span>
        )}
      </div>

      {/* Camera Controls Overlay (Front/Back & Mirror Toggle) */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
        <button
          onClick={() => setIsMirrored((prev) => !prev)}
          title="Toggle Mirror"
          className="p-2.5 bg-slate-900/70 hover:bg-slate-900 backdrop-blur-md text-white rounded-full transition-all active:scale-90 shadow-md border border-white/10"
        >
          <FlipHorizontal className="w-4 h-4" />
        </button>

        <button
          onClick={toggleFacingMode}
          title="Ganti Kamera Depan/Belakang"
          className="p-2.5 bg-slate-900/70 hover:bg-slate-900 backdrop-blur-md text-white rounded-full transition-all active:scale-90 shadow-md border border-white/10"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

CameraView.displayName = 'CameraView';
