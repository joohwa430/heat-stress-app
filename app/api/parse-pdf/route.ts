export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    const text = await new Promise<string>((resolve, reject) => {
      const PDFParser = require('pdf2json');
      const parser = new PDFParser(null, true);

      parser.on('pdfParser_dataError', (err: any) => {
        reject(new Error(err?.parserError ?? 'PDF 파싱 실패'));
      });

      parser.on('pdfParser_dataReady', () => {
        try {
          const raw: string = parser.getRawTextContent();
          resolve(raw);
        } catch (e) {
          reject(e);
        }
      });

      parser.parseBuffer(buffer);
    });

    console.log('[parse-pdf] 추출 텍스트 길이:', text.length);
    return NextResponse.json({ text, success: true });

  } catch (e) {
    console.error('[parse-pdf] 오류:', e);
    return NextResponse.json({ error: String(e), success: false }, { status: 500 });
  }
}
