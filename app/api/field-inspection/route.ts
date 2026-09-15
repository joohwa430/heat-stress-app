import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API 키가 없습니다.' }, { status: 500 });
  }

  try {
    const { images, description, location } = await req.json();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });


    const prompt = `당신은 대한민국 산업안전보건법(산안법) 전문가입니다.
현장 사진과 상황 설명을 분석하여 산업안전보건법 및 산업안전보건기준에 관한 규칙 위반 여부를 검토하세요.

현장 위치: ${location || '미입력'}
상황 설명: ${description || '미입력'}
첨부 사진 수: ${(images || []).length}장

검토 기준:
- 산업안전보건법 및 산업안전보건기준에 관한 규칙
- 개인보호구 착용 여부
- 안전설비·방호장치 설치 여부
- 위험물질 취급 및 보관
- 작업환경 위험 요소
- 통로·계단·비상구 확보 여부
- 전기·화재·폭발 위험 요소

반드시 아래 JSON 형식으로만 응답하세요. JSON 외 텍스트는 절대 포함하지 마세요:
{
  "hasViolation": true,
  "riskLevel": "low",
  "summary": "소견",
  "violations": [
    {
      "article": "산안법 제○조",
      "title": "조항 제목",
      "description": "위반 내용",
      "recommendation": "개선 권고"
    }
  ],
  "generalRecommendations": "전반적 권고사항"
}

위반이 없으면 violations는 빈 배열([])로, hasViolation은 false로 하세요.
riskLevel은 위반 없으면 low, 경미하면 medium, 중대하면 high로 하세요.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];

    for (const img of (images || [])) {
      parts.push({
        inlineData: {
          data: img.base64,
          mimeType: img.mimeType,
        },
      });
    }
    parts.push({ text: prompt });

    const result = await model.generateContent(parts);
    const text = result.response.text();
    console.log('Gemini 응답:', text);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON 파싱 실패: ' + text);

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('에러 상세:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
