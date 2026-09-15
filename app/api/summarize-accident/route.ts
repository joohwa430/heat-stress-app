import { NextRequest, NextResponse } from 'next/server';

function sanitizeSummary(summary: string): string {
  return String(summary || '')
    .replace(/^출력\s*:\s*/i, '')
    .replace(/^요약\s*:\s*/i, '')
    .replace(/factory/gi, '')
    .replace(/report/gi, '')
    .replace(/phrases?/gi, '')
    .replace(/names?/gi, '')
    .replace(/or\s+/gi, '')
    .replace(/아래와 같이 보고드립니다/g, '')
    .replace(/보고문구/g, '')
    .replace(/~발생/g, '')
    .replace(/발생$/g, '')
    .replace(/[,]+/g, ' ')
    .replace(/^\W+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isInvalidSummary(summary: string): boolean {
  if (!summary) return true;
  if (summary.length < 4) return true;
  if (/factory|report|phrase|name|or/gi.test(summary)) return true;
  if (/^[^가-힣0-9]+$/i.test(summary)) return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || !String(text).trim()) {
      return NextResponse.json({ summary: '' });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { summary: '', error: 'GOOGLE_GENERATIVE_AI_API_KEY is missing' },
        { status: 500 }
      );
    }

    const prompt = `
다음 문장을 산업재해 사고카드 제목으로 짧게 요약하세요.

규칙:
- 한국어 한 줄만 출력
- 10~18자 내외
- 날짜, 시간, 장소명, 사업장명, 번호, 보고문구 제외
- 핵심 작업상황과 사고결과만 남길 것
- 설명 없이 결과만 출력

예시:
원료(약25kg) 투입 중 허리 염좌 발생 -> 원료 투입 중 허리 염좌
벌크 드럼통 이송 중 전도에 따른 근로자 허리 부상 -> 드럼통 이송 중 허리 부상
지게차 운행 중 보관함 충돌로 물적사고 발생 -> 지게차 운행 중 보관함 충돌

문장:
${text}
    `.trim();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 80,
          },
        }),
      }
    );

    const raw = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { summary: '', error: raw },
        { status: 500 }
      );
    }

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json({ summary: '' });
    }

    const parts = data?.candidates?.[0]?.content?.parts;
    let summary = '';

    if (Array.isArray(parts)) {
      summary = parts
        .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
        .join(' ')
        .trim();
    }

    summary = sanitizeSummary(summary);

    if (isInvalidSummary(summary)) {
      return NextResponse.json({ summary: '' });
    }

    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      {
        summary: '',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
