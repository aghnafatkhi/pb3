import { FrameThemeConfig, FRAME_THEMES, FrameThemeId, FrameLayoutId, FilterId } from './types';

export interface CanvasExportOptions {
  p1PhotoUrl: string | null;
  p2PhotoUrl: string | null;
  p1Name: string;
  p2Name: string;
  themeId: FrameThemeId;
  layoutId: FrameLayoutId;
  filterId: FilterId;
  customTitle: string;
  customDate: string;
  stickerTheme?: string;
}

// 2R Print dimensions at high 300 DPI (1350 x 1950 pixels)
export const PRINT_2R_WIDTH = 1350;
export const PRINT_2R_HEIGHT = 1950;

export async function generate2RPhotoCanvas(options: CanvasExportOptions): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = PRINT_2R_WIDTH;
  canvas.height = PRINT_2R_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Gagal menginisialisasi Canvas Context');
  }

  const theme: FrameThemeConfig = FRAME_THEMES[options.themeId] || FRAME_THEMES.blush;

  // 1. Draw Card Background
  ctx.fillStyle = theme.bgHex;
  ctx.fillRect(0, 0, PRINT_2R_WIDTH, PRINT_2R_HEIGHT);

  // Decorative outer border
  const borderMargin = 40;
  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = 12;
  ctx.strokeRect(borderMargin, borderMargin, PRINT_2R_WIDTH - borderMargin * 2, PRINT_2R_HEIGHT - borderMargin * 2);

  // 2. Load Images
  const img1 = options.p1PhotoUrl ? await loadImage(options.p1PhotoUrl) : null;
  const img2 = options.p2PhotoUrl ? await loadImage(options.p2PhotoUrl) : null;

  // 3. Header Title Area
  const headerY = 120;
  ctx.textAlign = 'center';
  ctx.fillStyle = theme.textColor;

  // Draw Header Title
  ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
  ctx.fillText(options.customTitle || 'DUOBOOTH', PRINT_2R_WIDTH / 2, headerY);

  // Subtitle / Date
  ctx.font = '500 32px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = theme.textColor;
  ctx.globalAlpha = 0.8;
  ctx.fillText(options.customDate || new Date().toLocaleDateString('id-ID'), PRINT_2R_WIDTH / 2, headerY + 46);
  ctx.globalAlpha = 1.0;

  // Photo Frame Area boundaries
  const frameTop = 220;
  const frameBottom = PRINT_2R_HEIGHT - 180;
  const frameWidth = PRINT_2R_WIDTH - 120;
  const frameLeft = 60;
  const frameHeight = frameBottom - frameTop;

  // Apply Filter CSS to image rendering
  applyCanvasFilter(ctx, options.filterId);

  if (options.layoutId === 'split-side') {
    // 2 Photos Side-by-Side
    const photoW = (frameWidth - 30) / 2;
    const photoH = frameHeight;

    // Photo 1 (Left / Host)
    drawSinglePhoto(ctx, img1, frameLeft, frameTop, photoW, photoH, options.p1Name, theme);
    // Photo 2 (Right / Guest)
    drawSinglePhoto(ctx, img2, frameLeft + photoW + 30, frameTop, photoW, photoH, options.p2Name, theme);
  } else if (options.layoutId === 'split-vertical') {
    // 2 Photos Stacked Top / Bottom
    const photoW = frameWidth;
    const photoH = (frameHeight - 30) / 2;

    // Photo 1 (Top / Host)
    drawSinglePhoto(ctx, img1, frameLeft, frameTop, photoW, photoH, options.p1Name, theme);
    // Photo 2 (Bottom / Guest)
    drawSinglePhoto(ctx, img2, frameLeft, frameTop + photoH + 30, photoW, photoH, options.p2Name, theme);
  } else {
    // 4-Strip Classic Photobooth Style
    const gap = 24;
    const photoW = frameWidth;
    const photoH = (frameHeight - gap * 3) / 4;

    drawSinglePhoto(ctx, img1, frameLeft, frameTop, photoW, photoH, `${options.p1Name} #1`, theme);
    drawSinglePhoto(ctx, img2, frameLeft, frameTop + (photoH + gap), photoW, photoH, `${options.p2Name} #1`, theme);
    drawSinglePhoto(ctx, img1, frameLeft, frameTop + (photoH + gap) * 2, photoW, photoH, `${options.p1Name} #2`, theme);
    drawSinglePhoto(ctx, img2, frameLeft, frameTop + (photoH + gap) * 3, photoW, photoH, `${options.p2Name} #2`, theme);
  }

  // Reset filter
  ctx.filter = 'none';

  // 4. Draw Footer Stamps & Brand Tag
  const footerY = PRINT_2R_HEIGHT - 70;
  ctx.textAlign = 'center';
  ctx.fillStyle = theme.textColor;
  ctx.font = '600 30px system-ui, -apple-system, sans-serif';
  ctx.fillText('✨ Photobooth Online 2 Orang • 2R Print Size ✨', PRINT_2R_WIDTH / 2, footerY);

  // Decorative corner sparkles
  drawDecorativeStickers(ctx, theme, options.stickerTheme || 'sparkles');

  return canvas;
}

function drawSinglePhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  theme: FrameThemeConfig
) {
  const borderRadius = 20;

  // Save context state
  ctx.save();

  // Create rounded rectangle path for photo card
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, borderRadius);
  ctx.clip();

  if (img) {
    // Aspect ratio fill math (object-fit: cover)
    const imgRatio = img.width / img.height;
    const frameRatio = w / h;
    let renderW = w;
    let renderH = h;
    let renderX = x;
    let renderY = y;

    if (imgRatio > frameRatio) {
      renderW = h * imgRatio;
      renderX = x - (renderW - w) / 2;
    } else {
      renderH = w / imgRatio;
      renderY = y - (renderH - h) / 2;
    }

    ctx.drawImage(img, renderX, renderY, renderW, renderH);
  } else {
    // Placeholder box
    ctx.fillStyle = theme.borderColor;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = theme.textColor;
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📸 No Camera', x + w / 2, y + h / 2);
  }

  ctx.restore();

  // Draw Photo Border
  ctx.lineWidth = 6;
  ctx.strokeStyle = theme.borderColor;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, borderRadius);
  ctx.stroke();

  // Draw Name Tag Pill at bottom of photo
  const tagH = 44;
  const tagY = y + h - tagH - 12;
  const tagPad = 24;

  ctx.font = 'bold 26px system-ui, sans-serif';
  const nameWidth = ctx.measureText(label).width;
  const tagW = Math.min(nameWidth + tagPad * 2, w - 24);
  const tagX = x + (w - tagW) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagW, tagH, 22);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, tagY + 30);
  ctx.restore();
}

function applyCanvasFilter(ctx: CanvasRenderingContext2D, filterId: FilterId) {
  switch (filterId) {
    case 'soft-warm':
      ctx.filter = 'sepia(0.2) saturate(1.25) brightness(1.05)';
      break;
    case 'bw-classic':
      ctx.filter = 'grayscale(1) contrast(1.15)';
      break;
    case 'pastel-glow':
      ctx.filter = 'saturate(1.3) contrast(0.95) brightness(1.1)';
      break;
    case 'retro-film':
      ctx.filter = 'sepia(0.4) contrast(1.1) brightness(0.95) hue-rotate(-10deg)';
      break;
    default:
      ctx.filter = 'none';
  }
}

function drawDecorativeStickers(ctx: CanvasRenderingContext2D, theme: FrameThemeConfig, themeType: string) {
  ctx.save();
  ctx.fillStyle = theme.accentColor;
  ctx.font = '40px sans-serif';

  if (themeType === 'hearts') {
    ctx.fillText('💖', 70, 110);
    ctx.fillText('💗', PRINT_2R_WIDTH - 70, 110);
    ctx.fillText('💕', 70, PRINT_2R_HEIGHT - 60);
    ctx.fillText('💓', PRINT_2R_WIDTH - 70, PRINT_2R_HEIGHT - 60);
  } else if (themeType === 'stars') {
    ctx.fillText('⭐', 70, 110);
    ctx.fillText('🌟', PRINT_2R_WIDTH - 70, 110);
    ctx.fillText('✨', 70, PRINT_2R_HEIGHT - 60);
    ctx.fillText('💫', PRINT_2R_WIDTH - 70, PRINT_2R_HEIGHT - 60);
  } else {
    // Sparkles
    ctx.fillText('✨', 70, 110);
    ctx.fillText('✨', PRINT_2R_WIDTH - 70, 110);
    ctx.fillText('🌸', 70, PRINT_2R_HEIGHT - 60);
    ctx.fillText('🌸', PRINT_2R_WIDTH - 70, PRINT_2R_HEIGHT - 60);
  }
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}
