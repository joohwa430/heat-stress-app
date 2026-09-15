export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import zlib from 'zlib';
import { promisify } from 'util';

const inflate = promisify(zlib.inflate);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const isHWPX = file.name.toLowerCase().endsWith('.hwpx');

    const text = isHWPX
      ? await extractHWPX(buffer)
      : await extractHWP(buffer);

    return NextResponse.json({ text, success: true });

  } catch (e) {
    return NextResponse.json({ error: String(e), success: false }, { status: 500 });
  }
}

// ─── HWPX = ZIP + XML ────────────────────────────────────────────
async function extractHWPX(buffer: Buffer): Promise<string> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buffer);

  const sectionKeys = Object.keys(zip.files)
    .filter(k => /contents\/section\d*\.xml$/i.test(k))
    .sort();

  if (sectionKeys.length === 0) {
    throw new Error('HWPX 섹션 파일을 찾을 수 없습니다.');
  }

  const lines: string[] = [];
  for (const key of sectionKeys) {
    const xml = await zip.files[key].async('string');
    const matches = xml.match(/<hp:t(?:\s[^>]*)?>([^<]+)<\/hp:t>/g) ?? [];
    for (const m of matches) {
      const t = m.replace(/<[^>]+>/g, '').trim();
      if (t) lines.push(t);
    }
  }

  if (lines.length === 0) throw new Error('HWPX에서 텍스트를 추출하지 못했습니다.');
  return lines.join('\n');
}

// ─── HWP 바이너리 = OLE2 + zlib 압축 섹션 ────────────────────────
async function extractHWP(buffer: Buffer): Promise<string> {
  // OLE2 시그니처 확인
  if (
    buffer[0] !== 0xD0 || buffer[1] !== 0xCF ||
    buffer[2] !== 0x11 || buffer[3] !== 0xE0
  ) {
    throw new Error(
      'HWP OLE2 헤더를 찾을 수 없습니다.\n' +
      '한글에서 [다른 이름으로 저장 → HWPX] 또는 PDF로 저장 후 다시 업로드해 주세요.'
    );
  }

  const allTexts: string[] = [];
  const zlibHeaders = [
    [0x78, 0x9C],
    [0x78, 0xDA],
    [0x78, 0x01],
    [0x78, 0x5E],
  ];

  let i = 0;
  while (i < buffer.length - 4) {
    const isZlib = zlibHeaders.some(
      ([b1, b2]) => buffer[i] === b1 && buffer[i + 1] === b2
    );

    if (!isZlib) { i++; continue; }

    // 여러 길이로 inflate 시도
    let decompressed: Buffer | null = null;
    for (const len of [
      buffer.length - i,
      Math.min(buffer.length - i, 65536),
      Math.min(buffer.length - i, 32768),
    ]) {
      try {
        const result = await inflate(buffer.slice(i, i + len));
        if (result.length > 20) { decompressed = result; break; }
      } catch { /* 다음 길이 시도 */ }
    }

    if (decompressed && decompressed.length > 20) {
      const text = parseHWPBodyText(decompressed);
      if (text.trim().length > 5) allTexts.push(text);
    }

    i += 4;
  }

  if (allTexts.length === 0) {
    throw new Error(
      'HWP 바이너리에서 텍스트를 추출하지 못했습니다.\n' +
      '한글 프로그램에서 [다른 이름으로 저장 → HWPX] 또는 PDF로 저장 후 다시 업로드해 주세요.'
    );
  }

  return allTexts.join('\n');
}

// ─── HWP 레코드 파싱 → 텍스트 추출 ──────────────────────────────
function parseHWPBodyText(buffer: Buffer): string {
  const HWPTAG_PARA_TEXT = 66;
  const texts: string[] = [];
  let i = 0;

  while (i + 4 <= buffer.length) {
    let tagId: number, size: number, dataStart: number;

    try {
      const header = buffer.readUInt32LE(i);
      tagId = header & 0x3FF;
      const rawSize = (header >> 20) & 0xFFF;

      if (rawSize === 0xFFF) {
        if (i + 8 > buffer.length) break;
        size      = buffer.readUInt32LE(i + 4);
        dataStart = i + 8;
      } else {
        size      = rawSize;
        dataStart = i + 4;
      }
    } catch { break; }

    if (size < 0 || dataStart + size > buffer.length) break;

    if (tagId === HWPTAG_PARA_TEXT && size >= 2) {
      const chars: string[] = [];
      for (let j = 0; j + 1 < size; j += 2) {
        const code = buffer.readUInt16LE(dataStart + j);
        if (code === 0x000D || code === 0x000A) {
          chars.push('\n');
        } else if (code >= 0x0020 && code !== 0xFFFF) {
          chars.push(String.fromCharCode(code));
        }
      }
      const t = chars.join('').trim();
      if (t) texts.push(t);
    }

    i = dataStart + size;
    if (size === 0) i++; // 무한루프 방지
  }

  return texts.join('\n');
}
