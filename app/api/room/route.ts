import { NextRequest, NextResponse } from 'next/server';
import { RoomState, FrameThemeId, FrameLayoutId, FilterId } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// In-memory store for active room sessions
declare global {
  var _roomsMap: Map<string, RoomState> | undefined;
}

function getRoomsMap(): Map<string, RoomState> {
  if (!globalThis._roomsMap) {
    globalThis._roomsMap = new Map<string, RoomState>();
  }
  return globalThis._roomsMap;
}

// Generate random 6-digit room code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Clean up stale rooms older than 2 hours
function cleanupRooms() {
  const rooms = getRoomsMap();
  const now = Date.now();
  rooms.forEach((room, code) => {
    if (now - room.updatedAt > 2 * 60 * 60 * 1000) {
      rooms.delete(code);
    }
  });
}

export async function GET(req: NextRequest) {
  cleanupRooms();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ success: false, error: 'Kode room diperlukan' }, { status: 400 });
  }

  const rooms = getRoomsMap();
  const cleanCode = code.trim();
  const room = rooms.get(cleanCode);

  if (!room) {
    return NextResponse.json({ success: false, error: 'Sesi / Kode room tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ success: true, room }, {
    headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
  });
}

export async function POST(req: NextRequest) {
  cleanupRooms();
  try {
    const body = await req.json();
    const { action, code, participantId, name, isReady, photoUrl, frameTheme, frameLayout, filterId, customTitle, customDate } = body;
    const rooms = getRoomsMap();
    const now = Date.now();

    // 1. CREATE SESSION
    if (action === 'create') {
      let newCode = generateCode();
      while (rooms.has(newCode)) {
        newCode = generateCode();
      }

      const todayFormatted = new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).replace(/\//g, '.');

      const newRoom: RoomState = {
        code: newCode,
        createdAt: now,
        updatedAt: now,
        status: 'lobby',
        countdownStartTime: null,
        p1: {
          id: 'p1',
          name: name || 'Peserta 1 (Host)',
          isReady: false,
          photoUrl: null,
          lastSeen: now,
          cameraActive: true,
        },
        p2: null,
        frameTheme: 'blush',
        frameLayout: 'split-side',
        stickerTheme: 'sparkles',
        filterId: 'normal',
        customTitle: 'DUOBOOTH ✨',
        customDate: todayFormatted,
      };

      rooms.set(newCode, newRoom);
      return NextResponse.json({ success: true, room: newRoom, participantId: 'p1' }, {
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
      });
    }

    // 2. JOIN / RECONNECT SESSION
    if (action === 'join') {
      if (!code) {
        return NextResponse.json({ success: false, error: 'Kode room tidak valid' }, { status: 400 });
      }

      const cleanCode = String(code).trim();
      const room = rooms.get(cleanCode);

      if (!room) {
        return NextResponse.json({ success: false, error: 'Sesi tidak ditemukan. Periksa kembali kode room.' }, { status: 404 });
      }

      // If client is host reconnecting
      if (participantId === 'p1') {
        if (room.p1) {
          room.p1.lastSeen = now;
          if (name) room.p1.name = name;
        }
        room.updatedAt = now;
        rooms.set(cleanCode, room);
        return NextResponse.json({ success: true, room, participantId: 'p1' });
      }

      // If client is joining as p2 or reconnecting as p2
      // p2 is available if p2 is null, or inactive (>20s), or if participantId is p2, or room is in lobby
      const p2Inactive = !room.p2 || (now - room.p2.lastSeen > 20000);

      if (!room.p2 || p2Inactive || participantId === 'p2' || room.status === 'lobby') {
        room.p2 = {
          id: 'p2',
          name: name || (room.p2?.name ?? 'Peserta 2 (Guest)'),
          isReady: false,
          photoUrl: null,
          lastSeen: now,
          cameraActive: true,
        };
        room.updatedAt = now;
        rooms.set(cleanCode, room);
        return NextResponse.json({ success: true, room, participantId: 'p2' });
      }

      // If room is full and active with other participants
      return NextResponse.json({ success: true, room, participantId: 'p2' });
    }

    // Check existing room
    if (!code) {
      return NextResponse.json({ success: false, error: 'Kode room diperlukan' }, { status: 400 });
    }
    const cleanCode = code.trim();
    const room = rooms.get(cleanCode);

    if (!room) {
      return NextResponse.json({ success: false, error: 'Sesi telah berakhir atau tidak ditemukan' }, { status: 404 });
    }

    // 3. HEARTBEAT / CAMERA STATUS
    if (action === 'heartbeat') {
      if (participantId === 'p1' && room.p1) {
        room.p1.lastSeen = now;
        room.p1.cameraActive = true;
      } else if (participantId === 'p2' && room.p2) {
        room.p2.lastSeen = now;
        room.p2.cameraActive = true;
      }
      room.updatedAt = now;
      rooms.set(cleanCode, room);
      return NextResponse.json({ success: true, room });
    }

    // 4. TOGGLE READY STATUS
    if (action === 'set_ready') {
      if (participantId === 'p1' && room.p1) {
        room.p1.isReady = Boolean(isReady);
      } else if (participantId === 'p2' && room.p2) {
        room.p2.isReady = Boolean(isReady);
      }

      // Check if both are ready!
      if (room.p1?.isReady && room.p2?.isReady) {
        room.status = 'counting';
        room.countdownStartTime = now + 400; // Small delay for sync start
      } else {
        if (room.status === 'counting') {
          room.status = 'lobby';
          room.countdownStartTime = null;
        }
      }

      room.updatedAt = now;
      rooms.set(cleanCode, room);
      return NextResponse.json({ success: true, room });
    }

    // 5. UPLOAD CAPTURED PHOTO
    if (action === 'upload_photo') {
      if (participantId === 'p1' && room.p1) {
        room.p1.photoUrl = photoUrl;
      } else if (participantId === 'p2' && room.p2) {
        room.p2.photoUrl = photoUrl;
      }

      // If both photos are uploaded, set status to captured
      if (room.p1?.photoUrl && room.p2?.photoUrl) {
        room.status = 'captured';
      }

      room.updatedAt = now;
      rooms.set(cleanCode, room);
      return NextResponse.json({ success: true, room });
    }

    // 6. RETAKE
    if (action === 'retake') {
      if (room.p1) {
        room.p1.isReady = false;
        room.p1.photoUrl = null;
      }
      if (room.p2) {
        room.p2.isReady = false;
        room.p2.photoUrl = null;
      }
      room.status = 'lobby';
      room.countdownStartTime = null;
      room.updatedAt = now;
      rooms.set(cleanCode, room);
      return NextResponse.json({ success: true, room });
    }

    // 7. UPDATE FRAME SETTINGS
    if (action === 'update_settings') {
      if (frameTheme) room.frameTheme = frameTheme as FrameThemeId;
      if (frameLayout) room.frameLayout = frameLayout as FrameLayoutId;
      if (filterId) room.filterId = filterId as FilterId;
      if (customTitle !== undefined) room.customTitle = customTitle;
      if (customDate !== undefined) room.customDate = customDate;

      room.updatedAt = now;
      rooms.set(cleanCode, room);
      return NextResponse.json({ success: true, room });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak dikenal' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal memproses permintaan';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
