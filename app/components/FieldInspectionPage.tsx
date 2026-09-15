'use client';
import React, { useState, useRef, useEffect } from 'react';

interface InspectionImage {
  base64: string;
  mimeType: string;
  name: string;
}

interface ViolationItem {
  article: string;
  title: string;
  description: string;
  recommendation: string;
}

interface AIResult {
  hasViolation: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
  violations: ViolationItem[];
  generalRecommendations: string;
}

interface InspectionRecord {
  id: number;
  date: string;
  location: string;
  locationDetail: string;
  inspector: string;
  description: string;
  images: InspectionImage[];
  aiResult: AIResult | null;
  status: 'draft' | 'analyzed' | 'resolved';
  createdAt: string;
}

const LOCATIONS = ['화성1공장', '화성2공장', '화성3공장', '화성5공장', '평택1공장', '평택2공장', '고렴창고', '드림산단'];

const riskMeta = (level: string) => {
  if (level === 'high')   return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: '고위험' };
  if (level === 'medium') return { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: '중위험' };
  return                         { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: '저위험' };
};

const statusMeta = (s: string) => {
  if (s === 'resolved') return { label: '조치완료', bg: '#f0fdf4', text: '#16a34a' };
  if (s === 'analyzed') return { label: '분석완료', bg: '#eff6ff', text: '#2563eb' };
  return                       { label: '작성중',   bg: '#f9fafb', text: '#6b7280' };
};

function todayStr(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export default function FieldInspectionPage() {
  const [records,          setRecords]          = useState<InspectionRecord[]>([]);
  const [curId,            setCurId]            = useState<number | null>(null);
  const [mode,             setMode]             = useState<'view' | 'edit'>('view');
  const [draft,            setDraft]            = useState<Partial<InspectionRecord>>({});
  const [analyzing,        setAnalyzing]        = useState(false);
  const [lightbox,         setLightbox]         = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
});
const [selectedLocation, setSelectedLocation] = useState<string>('전체');

  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/field-inspection-records')
      .then(r => r.json())
      .then(data => setRecords(data))
      .catch(() => setRecords([]));
  }, []);

  const saveRecords = async (list: InspectionRecord[]) => {
    setRecords(list);
    await fetch('/api/field-inspection-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(list),
    });
  };

  const curRecord = curId !== null ? records.find(r => r.id === curId) ?? null : null;

  const newRecord = () => {
    setDraft({ date: todayStr(), location: '', locationDetail: '', inspector: '', description: '', images: [], aiResult: null, status: 'draft' });
    setCurId(null);
    setMode('edit');
  };

  const handleImageFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const result = e.target?.result as string;
        const newImg: InspectionImage = { base64: result.split(',')[1], mimeType: file.type, name: file.name };
        setDraft(p => ({ ...p, images: [...(p.images ?? []), newImg] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => {
    setDraft(p => ({ ...p, images: (p.images ?? []).filter((_, i) => i !== idx) }));
  };

  const analyzeWithAI = async () => {
  const hasImages = (draft.images ?? []).length > 0;
  if (!hasImages && !draft.description?.trim()) {
    alert('사진 또는 상황 설명을 입력해주세요.');
    return;
  }

  setAnalyzing(true);

  try {
    const res = await fetch('/api/field-inspection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images:      (draft.images ?? []).map(img => ({ base64: img.base64, mimeType: img.mimeType })),
        description: draft.description ?? '',
        location:    draft.location    ?? '',
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 429 || res.status === 503) {
      alert('AI 서버가 일시적으로 혼잡합니다.\n잠시 후 다시 시도해주세요.');
      return;
    }

    if (!res.ok) {
      alert('분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setDraft(p => ({ ...p, aiResult: data as AIResult, status: 'analyzed' }));

  } catch (err) {
    console.error('AI 분석 오류:', err);
    alert('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  } finally {
    setAnalyzing(false);
  }
};


  const saveRecord = async () => {
    if (!draft.date || !draft.location?.trim()) { alert('점검일과 점검 장소를 입력해주세요.'); return; }
    if (curId !== null) {
      await saveRecords(records.map(r => r.id === curId ? { ...r, ...draft } as InspectionRecord : r));
    } else {
      const nid = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
      await saveRecords([...records, {
        id: nid, date: draft.date!, location: draft.location!, locationDetail: draft.locationDetail ?? '',
        inspector: draft.inspector ?? '', description: draft.description ?? '',
        images: draft.images ?? [], aiResult: draft.aiResult ?? null,
        status: draft.status ?? 'draft', createdAt: new Date().toISOString(),
      }]);
      setCurId(nid);
    }
    setMode('view');
  };

  const deleteRecord = (id: number) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    saveRecords(records.filter(r => r.id !== id));
    if (curId === id) { setCurId(null); setMode('view'); }
  };

  const markResolved = (id: number) =>
    saveRecords(records.map(r => r.id === id ? { ...r, status: 'resolved' } : r));

  const display  = mode === 'edit' ? draft : curRecord;
  const imgList: InspectionImage[] = mode === 'edit' ? (draft.images ?? []) : (curRecord?.images ?? []);

  const iSt: React.CSSProperties = {
    border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px',
    fontSize: '13px', fontFamily: 'inherit', outline: 'none', width: '100%',
    boxSizing: 'border-box', background: '#fff',
  };
  const label12: React.CSSProperties = {
    fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px',
  };

  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));
const downloadMonthlyPDF = () => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해주세요.');
    return;
  }

  const [year, month] = selectedMonth.split('-');
  const locationLabel = selectedLocation === '전체' ? '전체 사업장' : selectedLocation;

  const recordsHTML = filteredRecords.map((r, idx) => {
    const risk = r.aiResult ? riskMeta(r.aiResult.riskLevel) : null;
    const sb   = statusMeta(r.status);

    const imagesHTML = r.images.length > 0
      ? `<div class="images-grid">
          ${r.images.map((img, i) => `
            <div class="img-wrapper">
              <img src="data:${img.mimeType};base64,${img.base64}" alt="사진 ${i + 1}" />
              <div class="img-label">사진 ${i + 1} · ${img.name}</div>
            </div>
          `).join('')}
        </div>`
      : '<div class="no-content">사진 없음</div>';

    const violationsHTML = (r.aiResult?.violations ?? []).map(v => `
      <div class="violation-item">
        <div class="violation-header">
          <span class="article-badge">${v.article}</span>
          <span class="violation-title">${v.title}</span>
        </div>
        <div class="violation-desc">${v.description}</div>
        <div class="recommendation">
          <div class="rec-label">개선 권고</div>
          <div>${v.recommendation}</div>
        </div>
      </div>
    `).join('');

    return `
      <div class="record ${idx > 0 ? 'page-break' : ''}">
        <div class="record-header">
          <div class="record-num">점검 ${idx + 1}</div>
          <div class="badges">
            <span class="badge" style="background:${sb.bg};color:${sb.text}">${sb.label}</span>
            ${risk ? `<span class="badge" style="background:${risk.bg};color:${risk.text};border:1px solid ${risk.border}">${risk.label}</span>` : ''}
          </div>
        </div>

        <table class="info-table">
          <tr>
            <th>점검일</th><td>${r.date}</td>
            <th>공장·사업장</th><td>${r.location || '-'}</td>
          </tr>
          <tr>
            <th>세부 장소</th><td>${r.locationDetail || '-'}</td>
            <th>점검자</th><td>${r.inspector || '-'}</td>
          </tr>
        </table>

        <div class="section-label">상황 설명</div>
        <div class="description">${r.description || '내용 없음'}</div>

        <div class="section-label">현장 사진 (${r.images.length}장)</div>
        ${imagesHTML}

        ${r.aiResult ? `
          <div class="section-label">AI 분석 결과</div>
          <div class="ai-result ${r.aiResult.hasViolation ? 'violation' : 'ok'}">
            <div class="ai-header ${r.aiResult.hasViolation ? 'ai-header-red' : 'ai-header-green'}">
              <div class="status-dot ${r.aiResult.hasViolation ? 'dot-red' : 'dot-green'}"></div>
              <strong>${r.aiResult.hasViolation ? '산안법 위반 가능성 있음' : '산안법 위반 사항 없음'}</strong>
              ${risk ? `<span class="risk-badge" style="background:${risk.bg};color:${risk.text};border:1px solid ${risk.border}">${risk.label}</span>` : ''}
            </div>
            <div class="summary">${r.aiResult.summary}</div>
            ${violationsHTML}
            ${r.aiResult.generalRecommendations ? `
              <div class="general-rec">
                <div class="rec-label">전반적 개선 권고사항</div>
                <div>${r.aiResult.generalRecommendations}</div>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8" />
      <title>${year}년 ${month}월 현장점검 기록</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
          font-size: 12px; color: #111827; background: #fff; padding: 28px;
        }

        /* 표지 */
        .cover {
          text-align: center; padding: 48px 0 36px;
          border-bottom: 2px solid #111827; margin-bottom: 32px;
        }
        .cover h1 { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
        .cover .sub { font-size: 14px; color: #6b7280; margin-bottom: 16px; }
        .cover .meta-row { display: flex; justify-content: center; gap: 24px; font-size: 12px; color: #374151; }
        .cover .meta-item { display: flex; gap: 6px; }
        .cover .meta-key { color: #9ca3af; }

        /* 레코드 */
        .record { margin-bottom: 36px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .page-break { page-break-before: always; margin-top: 0; }

        .record-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;
        }
        .record-num { font-size: 14px; font-weight: 800; color: #111827; }
        .badges { display: flex; gap: 6px; }
        .badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }

        /* 기본 정보 테이블 */
        .info-table { width: 100%; border-collapse: collapse; }
        .info-table th {
          background: #f9fafb; padding: 8px 12px; text-align: left;
          font-size: 11px; color: #6b7280; width: 90px;
          border: 1px solid #e5e7eb; font-weight: 600;
        }
        .info-table td { padding: 8px 12px; font-size: 12px; border: 1px solid #e5e7eb; }

        /* 섹션 */
        .section-label {
          font-size: 11px; font-weight: 700; color: #6b7280;
          padding: 10px 16px 4px; letter-spacing: 0.3px;
        }
        .description {
          font-size: 12px; line-height: 1.8; color: #374151;
          white-space: pre-wrap; margin: 0 16px 12px;
          padding: 10px 12px; background: #f9fafb;
          border-radius: 6px; border: 1px solid #e5e7eb;
        }
        .no-content { font-size: 12px; color: #9ca3af; margin: 0 16px 12px; }

        /* 이미지 그리드 */
        .images-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 8px; margin: 0 16px 14px;
        }
        .img-wrapper { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
        .img-wrapper img { width: 100%; height: 140px; object-fit: cover; display: block; }
        .img-label {
          font-size: 10px; color: #6b7280; text-align: center;
          padding: 3px 4px; background: #f9fafb;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* AI 분석 */
        .ai-result { margin: 0 16px 16px; border-radius: 8px; overflow: hidden; border: 1px solid; }
        .ai-result.violation { border-color: #fecaca; }
        .ai-result.ok        { border-color: #bbf7d0; }

        .ai-header {
          display: flex; align-items: center; gap: 8px; padding: 10px 14px;
        }
        .ai-header-red  { background: #fef2f2; }
        .ai-header-green { background: #f0fdf4; }

        .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .dot-red   { background: #dc2626; }
        .dot-green { background: #16a34a; }

        .risk-badge {
          margin-left: auto; font-size: 11px; padding: 2px 8px;
          border-radius: 4px; font-weight: 700;
        }

        .summary {
          padding: 10px 14px; font-size: 12px; line-height: 1.8;
          border-bottom: 1px solid #f3f4f6; color: #374151;
        }

        .violation-item {
          margin: 10px 14px;
          background: #fff9f9; border: 1px solid #fecaca;
          border-radius: 6px; padding: 10px 12px;
        }
        .violation-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
        .article-badge {
          font-size: 10px; font-weight: 700; color: #fff;
          background: #dc2626; padding: 2px 7px; border-radius: 4px; white-space: nowrap;
        }
        .violation-title { font-size: 12px; font-weight: 700; color: #991b1b; }
        .violation-desc { font-size: 12px; line-height: 1.7; color: #374151; margin-bottom: 8px; }

        .recommendation {
          background: #fffbeb; border-left: 3px solid #f59e0b;
          padding: 7px 10px; border-radius: 0 4px 4px 0;
        }
        .rec-label { font-size: 10px; font-weight: 700; color: #92400e; margin-bottom: 3px; }

        .general-rec {
          margin: 10px 14px 14px; padding: 10px 12px;
          background: #f9fafb; border-radius: 6px; font-size: 12px; line-height: 1.8;
        }

        @media print {
          body { padding: 0; }
          .page-break { page-break-before: always; }
          .images-grid { grid-template-columns: repeat(3, 1fr); }
        }
      </style>
    </head>
    <body>
      <div class="cover">
        <h1>${year}년 ${month}월 현장점검 기록</h1>
        <div class="sub">${locationLabel}</div>
        <div class="meta-row">
          <div class="meta-item"><span class="meta-key">총 점검 수</span><strong>${filteredRecords.length}건</strong></div>
          <div class="meta-item"><span class="meta-key">위반 건수</span><strong>${filteredRecords.filter(r => r.aiResult?.hasViolation).length}건</strong></div>
          <div class="meta-item"><span class="meta-key">조치완료</span><strong>${filteredRecords.filter(r => r.status === 'resolved').length}건</strong></div>
          <div class="meta-item"><span class="meta-key">출력일</span><strong>${new Date().toLocaleDateString('ko-KR')}</strong></div>
        </div>
      </div>

      ${filteredRecords.length === 0
        ? '<div style="text-align:center;padding:80px;color:#9ca3af;font-size:14px;">해당 월의 점검 기록이 없습니다.</div>'
        : recordsHTML
      }
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 600);
};

  const prevMonth = () => {
    const parts = selectedMonth.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 2, 1);
    setSelectedMonth(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  };
  const nextMonth = () => {
    const parts = selectedMonth.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]), 1);
    setSelectedMonth(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  };

  const filteredRecords = sortedRecords
    .filter(r => r.date.startsWith(selectedMonth))
    .filter(r => selectedLocation === '전체' || r.location === selectedLocation);

  return (
    <div style={{ padding: '20px 28px', background: '#fff', minHeight: '100vh', fontFamily: 'Pretendard,-apple-system,sans-serif' }}>

      {/* 라이트박스 */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: '20px', right: '24px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* 헤더 */}
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f3f4f6' }}>
  <div>
    <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827', marginBottom: '4px', letterSpacing: '-0.3px' }}>현장점검</div>
    <div style={{ fontSize: '13px', color: '#9ca3af' }}>현장 사진과 상황 설명을 입력하면 AI가 산안법 위반 여부를 분석합니다.</div>
  </div>

  {/* 버튼 2개로 변경 */}
  <div style={{ display: 'flex', gap: '8px' }}>
    <button
      onClick={downloadMonthlyPDF}
      style={{ padding: '9px 18px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
    >
      PDF 다운로드
    </button>
    <button
      onClick={newRecord}
      style={{ padding: '9px 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
    >
      + 새 점검 작성
    </button>
  </div>
</div>


      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

        {/* 좌측 목록 */}
        <div style={{ width: '260px', flexShrink: 0, border: '1px solid #e5e7eb', borderRadius: '12px', background: '#fafafa', overflow: 'hidden' }}>

          {/* 월 네비게이터 */}
          <div style={{ padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>점검 목록</span>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>{filteredRecords.length}건</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '4px 6px' }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', color: '#6b7280', fontSize: '14px', fontWeight: 700 }}>
                {'‹'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <select
                  value={selectedMonth.split('-')[0]}
                  onChange={function(e) { setSelectedMonth(e.target.value + '-' + selectedMonth.split('-')[1]); }}
                  style={{ border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 700, color: '#111827', cursor: 'pointer', outline: 'none' }}
                >
                  {Array.from({ length: 6 }, function(_, i) { return new Date().getFullYear() - 2 + i; }).map(function(y) {
                    return <option key={y} value={String(y)}>{y}년</option>;
                  })}
                </select>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                  {selectedMonth.split('-')[1]}월
                </span>
              </div>
              <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', color: '#6b7280', fontSize: '14px', fontWeight: 700 }}>
                {'›'}
              </button>
            </div>
          </div>

          {/* 장소 필터 */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', marginBottom: '6px' }}>공장 · 사업장</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {['전체', ...LOCATIONS].map(function(loc) {
                const cnt = loc === '전체' ? null : sortedRecords.filter(function(r) { return r.location === loc; }).length;
                const active = selectedLocation === loc;
                return (
                  <button
                    key={loc}
                    onClick={function() { setSelectedLocation(loc); }}
                    style={{
                      textAlign: 'left', padding: '6px 10px', borderRadius: '6px', border: 'none',
                      background: active ? '#111827' : 'transparent',
                      color: active ? '#fff' : '#374151',
                      fontSize: '12px', fontWeight: active ? 600 : 400, cursor: 'pointer', width: '100%',
                    }}
                  >
                    {cnt !== null ? loc + ' ' + cnt + '건' : loc}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 카드 목록 */}
          {filteredRecords.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>점검 기록이 없습니다</div>
          )}
          <div style={{ padding: '8px', maxHeight: 'calc(100vh - 420px)', overflowY: 'auto' }}>
            {filteredRecords.map(function(r) {
              const sb    = statusMeta(r.status);
              const risk  = r.aiResult ? riskMeta(r.aiResult.riskLevel) : null;
              const sel   = curId === r.id && mode === 'view';
              const thumb = r.images?.[0];
              return (
                <div
                  key={r.id}
                  onClick={function() { setCurId(r.id); setMode('view'); }}
                  style={{
                    padding: '12px', marginBottom: '6px', borderRadius: '10px',
                    border: sel ? '1px solid #cbd5e1' : '1px solid #f3f4f6',
                    background: '#fff', cursor: 'pointer',
                    boxShadow: sel ? '0 1px 4px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  {thumb && (
                    <img
                      src={'data:' + thumb.mimeType + ';base64,' + thumb.base64}
                      alt=""
                      style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px', border: '1px solid #e5e7eb' }}
                    />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: sel ? '#1d4ed8' : '#111827' }}>{r.date}</div>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: sb.bg, color: sb.text, fontWeight: 600 }}>{sb.label}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>{r.location || '장소 미입력'}</div>
                  {r.locationDetail && (
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>{r.locationDetail}</div>
                  )}
                  {r.images?.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>사진 {r.images.length}장</div>
                  )}
                  {risk && (
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: risk.bg, color: risk.text, fontWeight: 700, border: '1px solid ' + risk.border }}>
                      {r.aiResult?.hasViolation ? '위반 · ' + risk.label : '문제없음'}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                    <button onClick={function(e) { e.stopPropagation(); setCurId(r.id); setMode('edit'); setDraft({ ...r }); }}
                      style={{ padding: '3px 8px', fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer' }}>수정</button>
                    <button onClick={function(e) { e.stopPropagation(); deleteRecord(r.id); }}
                      style={{ padding: '3px 8px', fontSize: '11px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer' }}>삭제</button>
                    {r.status === 'analyzed' && (
                      <button onClick={function(e) { e.stopPropagation(); markResolved(r.id); }}
                        style={{ padding: '3px 8px', fontSize: '11px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer' }}>조치완료</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 우측 상세/작성 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!display ? (
            <div style={{ border: '1px solid #f3f4f6', borderRadius: '12px', padding: '80px 60px', textAlign: 'center', background: '#fafafa' }}>
              <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: 2 }}>
                왼쪽에서 점검 기록을 선택하거나<br />
                <strong style={{ color: '#111827' }}>+ 새 점검 작성</strong>을 눌러 시작하세요
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>

              {/* 액션바 */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                  {mode === 'edit' ? (curId !== null ? '점검 수정' : '새 점검 작성') : '점검 상세'}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {mode === 'view' && curRecord && (
                    <button onClick={() => { setDraft({ ...curRecord }); setMode('edit'); }}
                      style={{ padding: '7px 16px', background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>수정</button>
                  )}
                  {mode === 'edit' && (
                    <>
                      <button onClick={saveRecord}
                        style={{ padding: '7px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>저장</button>
                      <button onClick={() => { setMode('view'); setDraft({}); }}
                        style={{ padding: '7px 16px', background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>취소</button>
                    </>
                  )}
                </div>
              </div>

              <div style={{ padding: '20px' }}>

                {/* 기본 정보 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div>
                    <label style={label12}>점검일</label>
                    {mode === 'edit'
                      ? <input type="date" value={draft.date ?? ''} onChange={e => setDraft(p => ({ ...p, date: e.target.value }))} style={iSt} />
                      : <div style={{ fontSize: '14px', color: '#111827', padding: '4px 0' }}>{curRecord?.date ?? '-'}</div>
                    }
                  </div>
                  <div>
                    <label style={label12}>공장 · 사업장</label>
                    {mode === 'edit'
                      ? (
                        <select value={draft.location ?? ''} onChange={e => setDraft(p => ({ ...p, location: e.target.value }))} style={iSt}>
                          <option value="">선택</option>
                          {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                      )
                      : <div style={{ fontSize: '14px', color: '#111827', padding: '4px 0' }}>{curRecord?.location ?? '-'}</div>
                    }
                  </div>
                  <div>
                    <label style={label12}>세부 장소</label>
                    {mode === 'edit'
                      ? <input value={draft.locationDetail ?? ''} onChange={e => setDraft(p => ({ ...p, locationDetail: e.target.value }))} placeholder="예: 도장라인 2층" style={iSt} />
                      : <div style={{ fontSize: '14px', color: '#111827', padding: '4px 0' }}>{curRecord?.locationDetail || '-'}</div>
                    }
                  </div>
                  <div>
                    <label style={label12}>점검자</label>
                    {mode === 'edit'
                      ? <input value={draft.inspector ?? ''} onChange={e => setDraft(p => ({ ...p, inspector: e.target.value }))} placeholder="이름" style={iSt} />
                      : <div style={{ fontSize: '14px', color: '#111827', padding: '4px 0' }}>{curRecord?.inspector ?? '-'}</div>
                    }
                  </div>
                </div>

                {/* 사진 */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ ...label12, marginBottom: 0 }}>
                      현장 사진
                      {imgList.length > 0 && (
                        <span style={{ marginLeft: '6px', fontSize: '11px', color: '#2563eb', fontWeight: 600, background: '#eff6ff', padding: '1px 6px', borderRadius: '4px' }}>
                          {imgList.length}장
                        </span>
                      )}
                    </label>
                    {mode === 'edit' && imgList.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <label style={{ padding: '5px 12px', background: '#2563eb', color: '#fff', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                          + 추가 업로드
                          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { handleImageFiles(e.target.files); e.target.value = ''; }} />
                        </label>
                        <label style={{ padding: '5px 12px', background: '#0369a1', color: '#fff', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                          + 카메라
                          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { handleImageFiles(e.target.files); e.target.value = ''; }} />
                        </label>
                      </div>
                    )}
                  </div>
                  {imgList.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                      {imgList.map((img, idx) => {
                        const src = 'data:' + img.mimeType + ';base64,' + img.base64;
                        return (
                          <div key={idx} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb', aspectRatio: '4/3', background: '#f9fafb' }}>
                            <img src={src} alt={img.name} onClick={() => setLightbox(src)}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in', display: 'block' }} />
                            <span style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                              {idx + 1}
                            </span>
                            {mode === 'edit' && (
                              <button onClick={() => removeImage(idx)}
                                style={{ position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                                ×
                              </button>
                            )}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', padding: '3px 6px' }}>
                              <div style={{ fontSize: '10px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : mode === 'edit' ? (
                    <div style={{ border: '2px dashed #d1d5db', borderRadius: '12px', padding: '36px', textAlign: 'center', background: '#f9fafb' }}>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '14px' }}>사진을 올리거나 카메라로 직접 촬영하세요</div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <label style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                          사진 업로드
                          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { handleImageFiles(e.target.files); e.target.value = ''; }} />
                        </label>
                        <label style={{ padding: '8px 18px', background: '#0369a1', color: '#fff', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                          카메라 촬영
                          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { handleImageFiles(e.target.files); e.target.value = ''; }} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>사진 없음</div>
                  )}
                </div>

                {/* 상황 설명 */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={label12}>상황 설명</label>
                  {mode === 'edit' ? (
                    <textarea
                      value={draft.description ?? ''}
                      onChange={e => setDraft(p => ({ ...p, description: e.target.value }))}
                      placeholder={'현장 상황을 간단히 설명해주세요.\n예) 작업자가 안전모 미착용 상태로 고소작업 중'}
                      rows={4}
                      style={{ ...iSt, resize: 'vertical', lineHeight: 1.7 }}
                    />
                  ) : (
                    <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap', minHeight: '40px' }}>
                      {curRecord?.description || <span style={{ color: '#9ca3af' }}>내용 없음</span>}
                    </div>
                  )}
                </div>

                {/* AI 분석 버튼 */}
                {mode === 'edit' && (
                  <div style={{ marginBottom: '24px' }}>
                    <button onClick={analyzeWithAI} disabled={analyzing}
                      style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: analyzing ? '#d1d5db' : '#1e40af', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: analyzing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      {analyzing ? (
                        <>
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: 'fi-spin 1s linear infinite' }}>
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          </svg>
                          {'AI 분석 중... (' + imgList.length + '장 분석)'}
                        </>
                      ) : (
                        'AI 산안법 위반 분석' + (imgList.length > 0 ? ' (사진 ' + imgList.length + '장)' : '')
                      )}
                    </button>
                    <style>{'@keyframes fi-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }'}</style>
                  </div>
                )}

                {/* AI 분석 결과 */}
                {(function() {
                  const aiData = mode === 'edit' ? draft.aiResult : curRecord?.aiResult;
                  if (!aiData) return null;
                  const risk = riskMeta(aiData.riskLevel);
                  const borderColor = aiData.hasViolation ? '#fecaca' : '#bbf7d0';
                  const headerBg = aiData.hasViolation ? '#fef2f2' : '#f0fdf4';
                  return (
                    <div style={{ border: '1px solid ' + borderColor, borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', background: headerBg, borderBottom: '1px solid ' + borderColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: aiData.hasViolation ? '#dc2626' : '#16a34a', flexShrink: 0 }} />
                          <span style={{ fontSize: '14px', fontWeight: 700, color: aiData.hasViolation ? '#991b1b' : '#166534' }}>
                            {aiData.hasViolation ? '산안법 위반 가능성 있음' : '산안법 위반 사항 없음'}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '4px', background: risk.bg, color: risk.text, fontWeight: 700, border: '1px solid ' + risk.border }}>
                          {risk.label}
                        </span>
                      </div>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>종합 소견</div>
                        <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.8 }}>{aiData.summary}</div>
                      </div>
                      {aiData.violations.length > 0 && (
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '10px' }}>
                            {'위반 항목 ' + aiData.violations.length + '건'}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {aiData.violations.map(function(v, i) {
                              return (
                                <div key={i} style={{ background: '#fff9f9', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: '#dc2626', padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>{v.article}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>{v.title}</span>
                                  </div>
                                  <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, marginBottom: '10px' }}>{v.description}</div>
                                  <div style={{ background: '#fffbeb', borderLeft: '3px solid #f59e0b', padding: '8px 12px', borderRadius: '0 6px 6px 0' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '3px' }}>개선 권고</div>
                                    <div style={{ fontSize: '12px', color: '#78350f', lineHeight: 1.6 }}>{v.recommendation}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {aiData.generalRecommendations && (
                        <div style={{ padding: '14px 18px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>전반적 개선 권고사항</div>
                          <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.8 }}>{aiData.generalRecommendations}</div>
                        </div>
                      )}
                    </div>
                  );
                }())}

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
