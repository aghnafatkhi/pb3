'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, Share2, Palette, LayoutGrid, Sliders, Sparkles, Check, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FrameThemeId, FrameLayoutId, FilterId, FRAME_THEMES } from '@/lib/types';
import { generate2RPhotoCanvas, CanvasExportOptions } from '@/lib/canvas-export';
import { sounds } from '@/lib/audio';

interface ResultPreviewModalProps {
  isOpen: boolean;
  p1PhotoUrl: string | null;
  p2PhotoUrl: string | null;
  p1Name: string;
  p2Name: string;
  frameTheme: FrameThemeId;
  frameLayout: FrameLayoutId;
  filterId: FilterId;
  customTitle: string;
  customDate: string;
  onUpdateSettings: (settings: {
    frameTheme?: FrameThemeId;
    frameLayout?: FrameLayoutId;
    filterId?: FilterId;
    customTitle?: string;
    customDate?: string;
  }) => void;
  onRetake: () => void;
}

export function ResultPreviewModal({
  isOpen,
  p1PhotoUrl,
  p2PhotoUrl,
  p1Name,
  p2Name,
  frameTheme,
  frameLayout,
  filterId,
  customTitle,
  customDate,
  onUpdateSettings,
  onRetake,
}: ResultPreviewModalProps) {
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'theme' | 'layout' | 'filter' | 'text'>('theme');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const renderCanvas = async () => {
      setIsGenerating(true);
      try {
        const options: CanvasExportOptions = {
          p1PhotoUrl,
          p2PhotoUrl,
          p1Name,
          p2Name,
          themeId: frameTheme,
          layoutId: frameLayout,
          filterId,
          customTitle: customTitle || 'DUOBOOTH',
          customDate: customDate || new Date().toLocaleDateString('id-ID'),
        };

        const canvas = await generate2RPhotoCanvas(options);
        if (isMounted) {
          const dataUrl = canvas.toDataURL('image/png');
          setPreviewDataUrl(dataUrl);
          sounds.playSuccess();
        }
      } catch (err) {
        console.error('Failed to render 2R canvas', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    renderCanvas();

    return () => {
      isMounted = false;
    };
  }, [isOpen, p1PhotoUrl, p2PhotoUrl, p1Name, p2Name, frameTheme, frameLayout, filterId, customTitle, customDate]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!previewDataUrl) return;
    setIsDownloading(true);

    // Fire celebratory confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    const link = document.createElement('a');
    link.download = `duobooth-2R-${Date.now()}.png`;
    link.href = previewDataUrl;
    link.click();

    setTimeout(() => setIsDownloading(false), 1000);
  };

  const handleShare = async () => {
    if (!previewDataUrl) return;
    try {
      const blob = await (await fetch(previewDataUrl)).blob();
      const file = new File([blob], 'duobooth-2R.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Hasil Photobooth Online 2 Orang',
          text: 'Lihat hasil foto photobooth online kita! 📸✨',
          files: [file],
        });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-rose-100">
        {/* Header Bar */}
        <div className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-500 animate-pulse" />
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">Hasil Foto Cetak 2R</h2>
          </div>
          <span className="text-[11px] bg-rose-200/80 text-rose-800 px-2.5 py-1 rounded-full font-bold">
            2.25 x 3.25 inch (300 DPI)
          </span>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* Canvas Image Preview */}
          <div className="relative w-full aspect-[2.25/3.25] max-h-[380px] sm:max-h-[440px] bg-slate-100 rounded-2xl overflow-hidden shadow-inner border border-slate-200 flex items-center justify-center mx-auto">
            {isGenerating && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10 text-rose-600 font-semibold text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
                <span>Membuat Hasil Cetak 2R Presisi...</span>
              </div>
            )}

            {previewDataUrl ? (
              <img
                src={previewDataUrl}
                alt="Photobooth Result 2R"
                className="w-full h-full object-contain drop-shadow-md rounded-xl"
              />
            ) : (
              <div className="text-slate-400 text-xs flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> Memuat foto...
              </div>
            )}
          </div>

          {/* Customization Tabs */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-around border-b border-slate-200/80 pb-2">
              <button
                onClick={() => setActiveTab('theme')}
                className={`flex items-center gap-1 text-xs font-semibold pb-1 border-b-2 transition-all ${
                  activeTab === 'theme' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500'
                }`}
              >
                <Palette className="w-3.5 h-3.5" /> Tema Bingkai
              </button>

              <button
                onClick={() => setActiveTab('layout')}
                className={`flex items-center gap-1 text-xs font-semibold pb-1 border-b-2 transition-all ${
                  activeTab === 'layout' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Tata Letak
              </button>

              <button
                onClick={() => setActiveTab('filter')}
                className={`flex items-center gap-1 text-xs font-semibold pb-1 border-b-2 transition-all ${
                  activeTab === 'filter' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> Filter Foto
              </button>
            </div>

            {/* TAB CONTENT: THEMES */}
            {activeTab === 'theme' && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {(Object.keys(FRAME_THEMES) as FrameThemeId[]).map((themeKey) => {
                  const item = FRAME_THEMES[themeKey];
                  const isSelected = frameTheme === themeKey;
                  return (
                    <button
                      key={themeKey}
                      onClick={() => onUpdateSettings({ frameTheme: themeKey })}
                      className={`p-2 rounded-xl text-center text-[11px] font-semibold border transition-all flex flex-col items-center gap-1 ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-300'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border shadow-xs"
                        style={{ backgroundColor: item.bgHex, borderColor: item.borderColor }}
                      />
                      <span className="truncate w-full">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: LAYOUTS */}
            {activeTab === 'layout' && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { id: 'split-side', label: 'Berdampingan (Kiri-Kanan)' },
                  { id: 'split-vertical', label: 'Tumpuk (Atas-Bawah)' },
                  { id: 'strip-4', label: 'Classic Strip 4 Foto' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onUpdateSettings({ frameLayout: item.id as FrameLayoutId })}
                    className={`p-2.5 rounded-xl text-[11px] font-medium border text-center transition-all ${
                      frameLayout === item.id
                        ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-300 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* TAB CONTENT: FILTERS */}
            {activeTab === 'filter' && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { id: 'normal', label: 'Normal (Jernih)' },
                  { id: 'soft-warm', label: 'Kehangatan Soft' },
                  { id: 'bw-classic', label: 'B&W Vintage' },
                  { id: 'pastel-glow', label: 'Pastel Glow' },
                  { id: 'retro-film', label: 'Retro Film' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onUpdateSettings({ filterId: item.id as FilterId })}
                    className={`p-2 rounded-xl text-[11px] font-medium border text-center transition-all ${
                      filterId === item.id
                        ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-300 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom Text Inputs */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">
                Judul Frame
              </label>
              <input
                type="text"
                value={customTitle}
                maxLength={20}
                onChange={(e) => onUpdateSettings({ customTitle: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400 focus:outline-none"
                placeholder="DUOBOOTH"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">
                Tanggal / Pesan
              </label>
              <input
                type="text"
                value={customDate}
                maxLength={20}
                onChange={(e) => onUpdateSettings({ customDate: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-400 focus:outline-none"
                placeholder="04.08.2026"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2">
          <button
            onClick={onRetake}
            className="w-full sm:w-1/3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-2xl text-xs sm:text-sm border border-slate-300 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Foto Ulang</span>
          </button>

          <button
            onClick={handleShare}
            className="w-full sm:w-1/3 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={isDownloading || !previewDataUrl}
            className="w-full sm:w-1/3 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-200 active:scale-95 disabled:opacity-50"
          >
            {isDownloading ? (
              <Check className="w-4 h-4 animate-bounce" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Simpan 2R</span>
          </button>
        </div>
      </div>
    </div>
  );
}
