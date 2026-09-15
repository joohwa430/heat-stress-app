'use client';
import { useState, useRef, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, Timestamp,
} from 'firebase/firestore';

interface HeatRecord {
  id: string;
  date: string;
  time: string;
  temp: number;
  hum: number;
  heatIdx: number;
  level: string;
  color: string;
  location: string;
  lat?: number;
  lng?: number;
  address?: string;
  memo?: string;
  createdAt?: Timestamp;
}

function calcHeatIndex(T: number, RH: number): number {
  if (T < 27) {
    const e = (RH / 100) * 6.105 * Math.exp((17.27 * T) / (237.7 + T));
    return Math.round((T + 0.33 * e - 4.0) * 10) / 10;
  }
  const [c1,c2,c3,c4,c5,c6,c7,c8,c9] = [
    -8.784695, 1.61139411, 2.338549, -0.14611605,
    -0.01230809, -0.01642828, 0.00221173, 0.00072546, -0.00000358,
  ];
  return Math.round(
    (c1 + c2*T + c3*RH + c4*T*RH + c5*T**2 + c6*RH**2
    + c7*T**2*RH + c8*T*RH**2 + c9*T**2*RH**2) * 10
  ) / 10;
}

interface LevelInfo {
  level: string; color: string; bg: string; border: string; action: string;
}
function getLevel(hi: number): LevelInfo {
  if (hi >= 54) return { level:'위험',     color:'#991b1b', bg:'#fee2e2', border:'#ef4444', action:'즉시 작업 중지 및 대피' };
  if (hi >= 41) return { level:'매우위험', color:'#c2410c', bg:'#fff7ed', border:'#fb923c', action:'옥외작업 자제 / 충분한 휴식' };
  if (hi >= 32) return { level:'주의',     color:'#b45309', bg:'#fffbeb', border:'#fbbf24', action:'시간당 10~15분 그늘 휴식' };
  if (hi >= 27) return { level:'관심',     color:'#0369a1', bg:'#f0f9ff', border:'#38bdf8', action:'수분 보충 및 주의 관찰' };
  return              { level:'쾌적',      color:'#16a34a', bg:'#f0fdf4', border:'#86efac', action:'정상 작업 가능' };
}

async function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function geminiVision(
  b64: string, mime: string, key: string
): Promise<{ temp: number; hum: number }> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [
      {
        text: `이 디지털 온습도계 이미지에서 숫자를 읽어주세요.
아래 JSON 형식으로만 응답하세요. 다른 텍스트 절대 금지:
{"temperature": 숫자, "humidity": 숫자}
온도 범위: -20~60, 습도 범위: 0~100`,
      },
      { inline_data: { mime_type: mime, data: b64 } },
    ]}],
    generationConfig: { temperature: 0, maxOutputTokens: 100 },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error?.message || `Gemini API 오류 (${res.status})`);
  }
  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = text.replace(/```json|```/g, '').trim();
  const m = cleaned.match(/\{[\s\S]*?\}/);
  if (!m) throw new Error('온습도 값을 인식하지 못했습니다.');
  const p = JSON.parse(m[0]);
  const t = Number(p.temperature), h = Number(p.humidity);
  if (isNaN(t) || isNaN(h)) throw new Error('숫자 변환 실패 — 값을 직접 입력해주세요.');
  return { temp: t, hum: h };
}

export default function HeatStressPage() {
  const [tab, setTab]             = useState<'measure' | 'history'>('measure');
  const apiKey                    = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '';
  const [preview, setPreview]     = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [extracted, setExtracted] = useState<{ temp: number; hum: number } | null>(null);
  const [tempEdit, setTempEdit]   = useState('');
  const [humEdit, setHumEdit]     = useState('');
  const [gpsState, setGpsState]   = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [gps, setGps]             = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [locName, setLocName]     = useState('');
  const [memo, setMemo]           = useState('');
  const [records, setRecords]     = useState<HeatRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState('');
  const [saved, setSaved]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'heatRecords'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as HeatRecord[];
      setRecords(docs);
      setLoading(false);
    }, () => { setLoading(false); });
    return () => unsub();
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(''); setExtracted(null); setSaved(false);
    const dr = new FileReader();
    dr.onload = ev => setPreview(ev.target?.result as string);
    dr.readAsDataURL(file);
    if (!apiKey) {
      setErr('API 키가 설정되지 않았습니다. 관리자에게 문의해주세요.');
      return;
    }
    setAnalyzing(true);
    try {
      const b64 = await toBase64(file);
      const result = await geminiVision(b64, file.type, apiKey);
      setExtracted(result);
      setTempEdit(String(result.temp));
      setHumEdit(String(result.hum));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGPS = () => {
    if (!navigator.geolocation) { setErr('이 브라우저는 위치 정보를 지원하지 않습니다.'); return; }
    setGpsState('loading');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGps({ lat, lng });
        setGpsState('ok');
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`,
            { headers: { 'Accept-Language': 'ko' } }
          );
          const d = await r.json();
          const addr = d.display_name || '';
          setGps({ lat, lng, address: addr });
          if (!locName) {
            const parts = addr.replace('대한민국, ', '').split(', ');
            setLocName(parts.slice(0, 2).join(' ').trim());
          }
        } catch {}
      },
      () => setGpsState('err'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const handleSave = async () => {
    const T = parseFloat(tempEdit), H = parseFloat(humEdit);
    if (isNaN(T) || isNaN(H) || H < 0 || H > 100) { setErr('온도·습도 값을 올바르게 입력해주세요.'); return; }
    const hi = calcHeatIndex(T, H);
    const lv = getLevel(hi);
    const now = new Date();
    const rec = {
      date: now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, ''),
      time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      temp: T, hum: H, heatIdx: hi, level: lv.level, color: lv.color,
      location: locName || '미지정',
      lat: gps?.lat ?? null, lng: gps?.lng ?? null, address: gps?.address ?? null,
      memo: memo || null, createdAt: Timestamp.now(),
    };
    try {
      await addDoc(collection(db, 'heatRecords'), rec);
      setSaved(true);
      setTimeout(() => {
        setPreview(null); setExtracted(null); setTempEdit(''); setHumEdit('');
        setGps(null); setGpsState('idle'); setLocName(''); setMemo('');
        setSaved(false); setErr(''); setTab('history');
        if (fileRef.current) fileRef.current.value = '';
      }, 1000);
    } catch (e: any) { setErr('저장 실패: ' + e.message); }
  };

  const deleteRecord = async (id: string) => {
    try { await deleteDoc(doc(db, 'heatRecords', id)); }
    catch (e: any) { setErr('삭제 실패: ' + e.message); }
  };

  const exportCSV = () => {
    const rows = [
      ['날짜','시간','위치','기온(°C)','습도(%)','체감온도(°C)','단계','위도','경도','메모'],
      ...records.map(r => [r.date,r.time,r.location,r.temp,r.hum,r.heatIdx,r.level,r.lat??'',r.lng??'',`"${r.memo??''}"`]),
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `체감온도기록_${new Date().toLocaleDateString('ko-KR')}.csv`;
    a.click();
  };

  const curT  = parseFloat(tempEdit);
  const curH  = parseFloat(humEdit);
  const curHI = (!isNaN(curT) && !isNaN(curH) && curH >= 0 && curH <= 100) ? calcHeatIndex(curT, curH) : null;
  const curLv = curHI !== null ? getLevel(curHI) : null;
  const todayStr = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
  const todayRecs  = records.filter(r => r.date === todayStr);
  const dangerRecs = records.filter(r => r.level === '위험' || r.level === '매우위험');

  return (
    <div style={{ padding: '28px 32px', fontFamily: 'Pretendard, -apple-system, sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <span style={{ background: '#fef9c3', color: '#b45309', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>온열질환 예방</span>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>체감온도 측정 기록</h2>
      </div>
      <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', lineHeight: 1.5 }}>
        온습도계 사진 촬영 → Gemini AI 자동 인식 → 체감온도 산출 → GPS 위치 자동 등록
      </p>

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
        {(['measure', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', border: 'none',
            borderBottom: tab === t ? '2px solid #0284c7' : '2px solid transparent',
            background: 'transparent', cursor: 'pointer',
            fontSize: '14px', fontWeight: tab === t ? 600 : 400,
            color: tab === t ? '#0369a1' : '#6b7280', marginBottom: '-1px',
          }}>
            {t === 'measure' ? '측정 기록' : '기록 이력'}
            {t === 'history' && records.length > 0 && (
              <span style={{ background: '#f3f4f6', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', marginLeft: '6px', color: '#6b7280' }}>{records.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'measure' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '920px' }}>
          <div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '36px 20px', border: '2px dashed #bae6fd', borderRadius: '12px', background: '#f0f9ff', cursor: 'pointer', marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '44px', lineHeight: 1 }}>📷</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#0369a1' }}>사진 촬영 / 파일 선택</div>
              <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', lineHeight: 1.5 }}>온습도계 화면이 선명하게 보이도록 촬영해주세요<br />모바일에서 카메라가 자동 실행됩니다</div>
            </button>

            {preview && (
              <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: '16px', background: '#f9fafb' }}>
                <img src={preview} alt="온습도계" style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', display: 'block' }} />
                {analyzing && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'heatSpin 0.8s linear infinite' }} />
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>AI 인식 중...</div>
                  </div>
                )}
                {extracted && !analyzing && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px', background: '#16a34a', color: '#fff', fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '4px' }}>✓ 인식 완료</div>
                )}
              </div>
            )}

            <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>📍 GPS 위치 등록</div>
              <button onClick={handleGPS} disabled={gpsState === 'loading'} style={{ width: '100%', padding: '11px', border: `1px solid ${gpsState === 'ok' ? '#86efac' : gpsState === 'err' ? '#fca5a5' : '#bae6fd'}`, borderRadius: '7px', background: gpsState === 'ok' ? '#f0fdf4' : gpsState === 'err' ? '#fef2f2' : '#f0f9ff', color: gpsState === 'ok' ? '#16a34a' : gpsState === 'err' ? '#dc2626' : '#0369a1', cursor: gpsState === 'loading' ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500', marginBottom: '10px' }}>
                {gpsState === 'loading' && '위치 확인 중...'}
                {gpsState === 'ok' && `✓ GPS 등록 완료 (${gps?.lat?.toFixed(5)}, ${gps?.lng?.toFixed(5)})`}
                {gpsState === 'err' && '⚠ 위치 접근 실패 — 다시 시도'}
                {gpsState === 'idle' && '현재 위치 GPS 가져오기'}
              </button>
              {gps?.address && (
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '10px', lineHeight: 1.5, background: '#f9fafb', padding: '6px 8px', borderRadius: '5px' }}>
                  {gps.address.slice(0, 80)}{gps.address.length > 80 ? '...' : ''}
                </div>
              )}
              <input value={locName} onChange={e => setLocName(e.target.value)} placeholder="위치명 입력 (예: 생산 1공장 2층, 옥외 작업장)" style={{ width: '100%', padding: '9px 11px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', color: '#374151' }} />
            </div>
          </div>

          <div>
            {(extracted || analyzing) && (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '16px', background: '#fff' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>인식된 값 <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '400', marginLeft: '8px' }}>잘못 인식된 경우 직접 수정 가능</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', display: 'block', marginBottom: '5px' }}>기온 (°C)</label>
                    <input type="number" step="0.1" value={tempEdit} onChange={e => setTempEdit(e.target.value)} style={{ width: '100%', padding: '12px 8px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '22px', fontWeight: '700', textAlign: 'center', outline: 'none', boxSizing: 'border-box', color: '#111827' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', display: 'block', marginBottom: '5px' }}>습도 (%)</label>
                    <input type="number" step="1" min="0" max="100" value={humEdit} onChange={e => setHumEdit(e.target.value)} style={{ width: '100%', padding: '12px 8px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '22px', fontWeight: '700', textAlign: 'center', outline: 'none', boxSizing: 'border-box', color: '#111827' }} />
                  </div>
                </div>
              </div>
            )}

            {curHI !== null && curLv && !analyzing && (
              <div style={{ border: `1px solid ${curLv.border}`, borderRadius: '12px', padding: '20px', marginBottom: '16px', background: curLv.bg }}>
                <div style={{ fontSize: '12px', color: curLv.color, fontWeight: '600', marginBottom: '4px' }}>체감온도 (열지수)</div>
                <div style={{ fontSize: '48px', fontWeight: '800', color: curLv.color, lineHeight: 1.05, marginBottom: '10px' }}>{curHI}°C</div>
                <div style={{ display: 'inline-block', background: curLv.color, color: '#fff', padding: '4px 14px', borderRadius: '5px', fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>{curLv.level}</div>
                <div style={{ fontSize: '13px', color: curLv.color, fontWeight: '600', marginBottom: '12px' }}>→ {curLv.action}</div>
                <div style={{ borderTop: `1px solid ${curLv.border}`, paddingTop: '10px', fontSize: '11px', color: '#6b7280' }}>기온 {curT}°C · 습도 {curH}% · 기상청 Rothfusz 열지수 공식</div>
              </div>
            )}

            {!extracted && !analyzing && (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', background: '#f9fafb', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>사용 방법</div>
                {[['1','카메라 버튼 클릭','온습도계 화면을 선명하게 촬영'],['2','AI 자동 인식','기온·습도 숫자를 자동으로 읽습니다'],['3','GPS 위치 등록','위치 허용 후 버튼 클릭 (선택)'],['4','기록 저장','체감온도가 자동 계산되어 저장']].map(([n, title, desc]) => (
                  <div key={n} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                    <span style={{ background: '#0284c7', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>{n}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{title}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>메모</label>
              <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={3} placeholder="특이사항, 작업자 상태, 조치 내용 등..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', color: '#374151', lineHeight: 1.5 }} />
            </div>

            {err && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#dc2626', fontSize: '13px', marginBottom: '12px', lineHeight: 1.5 }}>⚠ {err}</div>
            )}

            <button onClick={handleSave} disabled={!extracted || analyzing} style={{ width: '100%', padding: '15px', background: saved ? '#16a34a' : (!extracted || analyzing) ? '#e5e7eb' : '#0284c7', color: (!extracted || analyzing) && !saved ? '#9ca3af' : '#fff', border: 'none', borderRadius: '8px', cursor: (!extracted || analyzing) ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: '700', transition: 'background 0.2s' }}>
              {saved ? '✓ 저장 완료!' : '기록 저장'}
            </button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '14px' }}>불러오는 중...</div>
          ) : (
            <>
              {records.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  {[
                    { label: '총 측정 횟수',  value: `${records.length}회`,      sub: '누적',          warn: false },
                    { label: '오늘 측정',      value: `${todayRecs.length}회`,    sub: todayStr,        warn: false },
                    { label: '위험 단계 건수', value: `${dangerRecs.length}건`,   sub: '위험+매우위험', warn: dangerRecs.length > 0 },
                    { label: '최근 체감온도',  value: `${records[0].heatIdx}°C`, sub: records[0].level, warn: records[0].level === '위험' || records[0].level === '매우위험' },
                  ].map(c => (
                    <div key={c.label} style={{ border: `1px solid ${c.warn ? '#fecaca' : '#e5e7eb'}`, borderRadius: '8px', padding: '14px 16px', background: c.warn ? '#fef2f2' : '#fff' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>{c.label}</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: c.warn ? '#dc2626' : '#111827', lineHeight: 1.2 }}>{c.value}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{c.sub}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>측정 기록 ({records.length}건)</div>
                <button onClick={exportCSV} disabled={records.length === 0} style={{ padding: '6px 14px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', color: records.length === 0 ? '#9ca3af' : '#374151', cursor: records.length === 0 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>CSV 내보내기</button>
              </div>
              {records.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📋</div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>기록이 없습니다</div>
                  <div style={{ fontSize: '13px', color: '#9ca3af' }}>측정 기록 탭에서 온습도계 사진을 촬영해보세요.</div>
                </div>
              ) : (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        {['날짜','시간','위치','기온','습도','체감온도','단계','메모',''].map((h, i) => (
                          <th key={i} style={{ padding: '10px 12px', textAlign: ['기온','습도','체감온도','단계'].includes(h) ? 'center' : 'left' as any, fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, i) => {
                        const lv = getLevel(r.heatIdx);
                        return (
                          <tr key={r.id} style={{ borderBottom: i < records.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 ? '#fafafa' : '#fff' }}>
                            <td style={{ padding: '10px 12px', color: '#374151', whiteSpace: 'nowrap' }}>{r.date}</td>
                            <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{r.time}</td>
                            <td style={{ padding: '10px 12px', color: '#374151', maxWidth: '140px' }}>
                              <div style={{ fontWeight: '500' }}>{r.location}</div>
                              {r.lat && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{r.lat.toFixed(4)}, {r.lng?.toFixed(4)}</div>}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>{r.temp}°C</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#6b7280' }}>{r.hum}%</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '800', fontSize: '15px', color: lv.color }}>{r.heatIdx}°C</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{ background: lv.bg, color: lv.color, padding: '3px 9px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', border: `1px solid ${lv.border}`, whiteSpace: 'nowrap' }}>{r.level}</span>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#6b7280', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.memo || '-'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button onClick={() => deleteRecord(r.id)} style={{ padding: '3px 9px', border: '1px solid #fecaca', borderRadius: '4px', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: '11px' }}>삭제</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
      <style>{`@keyframes heatSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
