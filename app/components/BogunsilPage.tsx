'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';

export interface BogunsilItem {
  id: string; name: string; sub?: string;
  category: 'medicine' | 'treatment'; order: number;
}

export const DEFAULT_BOGUNS_ITEMS: BogunsilItem[] = [
  { id:'med_01', name:'해열진통제',      sub:'아세트아미노펜', category:'medicine',  order:1  },
  { id:'med_02', name:'소염진통제',      sub:'나프록센',       category:'medicine',  order:2  },
  { id:'med_03', name:'소염진통제',      sub:'멕시부프로펜',   category:'medicine',  order:3  },
  { id:'med_04', name:'근육통 완화제',                         category:'medicine',  order:4  },
  { id:'med_05', name:'편도염',                                category:'medicine',  order:5  },
  { id:'med_06', name:'소화제',                                category:'medicine',  order:6  },
  { id:'med_07', name:'위보호제',                              category:'medicine',  order:7  },
  { id:'med_08', name:'위경련약',                              category:'medicine',  order:8  },
  { id:'med_09', name:'지사제',                                category:'medicine',  order:9  },
  { id:'med_10', name:'변비약',                                category:'medicine',  order:10 },
  { id:'med_11', name:'종합감기약',                            category:'medicine',  order:11 },
  { id:'med_12', name:'알러지약',                              category:'medicine',  order:12 },
  { id:'med_13', name:'파스',                                  category:'medicine',  order:13 },
  { id:'med_14', name:'식염포도당',                            category:'medicine',  order:14 },
  { id:'trt_01', name:'찰과상',                                category:'treatment', order:1  },
  { id:'trt_02', name:'자상',                                  category:'treatment', order:2  },
  { id:'trt_03', name:'화상',                                  category:'treatment', order:3  },
  { id:'trt_04', name:'염좌',                                  category:'treatment', order:4  },
  { id:'trt_05', name:'침대 이용',                             category:'treatment', order:5  },
  { id:'trt_06', name:'보건상담',                              category:'treatment', order:6  },
  { id:'trt_07', name:'신속항원검사 진행',                     category:'treatment', order:7  },
  { id:'trt_08', name:'기타',                                  category:'treatment', order:8  },
];

function ld<T>(k: string, fb: T): T {
  if (typeof window === 'undefined') return fb;
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; }
}
function sv(k: string, d: unknown) { try { localStorage.setItem(k, JSON.stringify(d)); } catch {} }

interface ManualEntry { year:number; month:number; day:number; itemId:string; count:number; }
/* ── 공휴일 데이터 (2023~2028) ── */
const FIXED_HOLIDAYS: [number, number, string][] = [
  [1,  1,  '신정'],
  [3,  1,  '삼일절'],
  [5,  5,  '어린이날'],
  [6,  6,  '현충일'],
  [8,  15, '광복절'],
  [10, 3,  '개천절'],
  [10, 9,  '한글날'],
  [12, 25, '성탄절'],
];

const LUNAR_HOLIDAYS: Record<string, string> = {
  /* 2023 */
  '2023-01-21':'설날 전날', '2023-01-22':'설날', '2023-01-23':'설날 다음날', '2023-01-24':'대체공휴일',
  '2023-05-27':'부처님오신날', '2023-05-29':'대체공휴일',
  '2023-09-28':'추석 전날',   '2023-09-29':'추석',  '2023-09-30':'추석 다음날', '2023-10-02':'대체공휴일',
  /* 2024 */
  '2024-02-09':'설날 전날', '2024-02-10':'설날', '2024-02-11':'설날 다음날', '2024-02-12':'대체공휴일',
  '2024-05-15':'부처님오신날',
  '2024-09-16':'추석 전날', '2024-09-17':'추석', '2024-09-18':'추석 다음날',
  /* 2025 */
  '2025-01-28':'설날 전날', '2025-01-29':'설날', '2025-01-30':'설날 다음날',
  '2025-03-03':'대체공휴일',
  '2025-05-05':'어린이날·부처님오신날', '2025-05-06':'대체공휴일',
  '2025-10-05':'추석 전날', '2025-10-06':'추석', '2025-10-07':'추석 다음날', '2025-10-08':'대체공휴일',
  /* 2026 */
  '2026-02-17':'설날 전날', '2026-02-18':'설날', '2026-02-19':'설날 다음날',
  '2026-05-24':'부처님오신날', '2026-05-25':'대체공휴일',
  '2026-09-24':'추석 전날', '2026-09-25':'추석', '2026-09-26':'추석 다음날',
  /* 2027 */
  '2027-02-06':'설날 전날', '2027-02-07':'설날', '2027-02-08':'설날 다음날', '2027-02-09':'대체공휴일',
  '2027-05-13':'부처님오신날',
  '2027-10-14':'추석 전날', '2027-10-15':'추석', '2027-10-16':'추석 다음날',
  /* 2028 */
  '2028-01-26':'설날 전날', '2028-01-27':'설날', '2028-01-28':'설날 다음날',
  '2028-05-02':'부처님오신날',
  '2028-10-02':'추석 전날', '2028-10-03':'추석', '2028-10-04':'추석 다음날',
};

function getHolidayName(year:number, month:number, day:number): string {
  const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  if (LUNAR_HOLIDAYS[key]) return LUNAR_HOLIDAYS[key];
  const f = FIXED_HOLIDAYS.find(([m,d]) => m===month && d===day);
  return f ? f[2] : '';
}

const P = {
  /* 배경 — 순백 */
  page: '#FFFFFF', card: '#FFFFFF',

  /* 타이틀바 — 파스텔 블루 */
  titleBg: '#DDEEFF', titleTx: '#1A5080', titleBr: '#BBDDF8',

  /* 약품 라인/섹션 — 연분홍 */
  medBg: '#FFF0F4', medTx: '#A02050', medBr: '#FAD8E4',


  /* 처치 라인/섹션 — 파스텔 민트 */
  trtBg: '#E0FAF0', trtTx: '#1A6A48', trtBr: '#A8E8C8',

  /* 채워진 셀 */
  autoBg: '#D8EEFF', autoTx: '#1A5FA0', autoBr: '#AAD0F0',
  manBg:  '#D0F5E0', manTx:  '#1A7040', manBr:  '#A0DDB8',
  bothBg: '#E8D8FF', bothTx: '#5020A0', bothBr: '#C8B0F0',

  /* 오늘 */
  todayBg: '#FFFAE0', todayTx: '#806000', todayBr: '#F0E090',

  /* 일요일·연차 열 */
  redBg: '#FFECEF', redTx: '#C95A6B', redBr: '#F6C7D0',



  /* KPI */
  kpi: [
    { bg:'#EEE8FF', tx:'#5020A0', br:'#D8C8F8' },
    { bg:'#FFE8F0', tx:'#A02050', br:'#F8C8D8' },
    { bg:'#E0FAF0', tx:'#1A7040', br:'#A0DDB8' },
    { bg:'#FFFAE0', tx:'#806000', br:'#F0E090' },
  ],

  /* 합계 */
  sumBg: '#F8F8F8', sumTx: '#1A1828',

  /* 텍스트·선 */
  heading: '#1A1828', sub: '#5A5478',
  line:  '#EEECF4',  line2: '#E0DCF0',
};
interface BogunsilPageProps {
  onOpenConsult?: (payload: { consultId: number; 사번: string }) => void;
}

export default function BogunsilPage({ onOpenConsult }: BogunsilPageProps) {
  const today = new Date();
  const [year,     setYear]     = useState(today.getFullYear());
  const [month,    setMonth]    = useState(today.getMonth() + 1);
  const [items,    setItems]    = useState<BogunsilItem[]>([]);
  const [manual,   setManual]   = useState<ManualEntry[]>([]);
  const [consults, setConsults] = useState<Array<{
  id: number;
  상담일: string;
  성명?: string;
  사번?: string;
  약품기록?: Record<string, number>;
}>>([]);

  const [editCell, setEditCell] = useState<{ id:string; day:number }|null>(null);
  const [editVal,  setEditVal]  = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newName,   setNewName]   = useState('');
  const [newSub,    setNewSub]    = useState('');
  const [newCat,    setNewCat]    = useState<'medicine'|'treatment'>('medicine');
  const [showDelId, setShowDelId] = useState<string|null>(null);
const [vacDays,   setVacDays]   = useState<number[]>([]);
const [nameModal, setNameModal] = useState<{
  title: string;
  entries: Array<{
    consultId: number;
    name: string;
    사번?: string;
    상담일: string;
  }>;
} | null>(null);


  /* 초기 로드 */
  useEffect(() => {
    const saved = ld<BogunsilItem[]>('hc_boguns_items', []);
    setItems(saved.length > 0 ? saved : DEFAULT_BOGUNS_ITEMS);
    setManual(ld('hc_boguns_manual', []));
    setConsults(ld('hc_con_records', []));
    const onSt = (e: StorageEvent) => {
      if (e.key === 'hc_con_records') setConsults(ld('hc_con_records', []));
      if (e.key === 'hc_boguns_items') {
        const s = ld<BogunsilItem[]>('hc_boguns_items', []);
        setItems(s.length > 0 ? s : DEFAULT_BOGUNS_ITEMS);
      }
    };
    window.addEventListener('storage', onSt);
    return () => window.removeEventListener('storage', onSt);
  }, []);

  /* 연차 — 연월 바뀔 때 로드 */
  useEffect(() => {
    setVacDays(ld<number[]>(`hc_boguns_vac_${year}_${month}`, []));
  }, [year, month]);

  const days = useMemo(
    () => Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1),
    [year, month]
  );

  const autoCnt = useMemo(() => {
    const m: Record<string, Record<number, number>> = {};
    consults.forEach(c => {
      if (!c.상담일 || !c.약품기록) return;
      const [y, mo, d] = c.상담일.split('-').map(Number);
      if (y !== year || mo !== month) return;
      Object.entries(c.약품기록).forEach(([id, cnt]) => {
        if (!m[id]) m[id] = {};
        m[id][d] = (m[id][d] || 0) + Number(cnt);
      });
    });
    return m;
  }, [consults, year, month]);

  const manCnt = useMemo(() => {
    const m: Record<string, Record<number, number>> = {};
    manual.filter(e => e.year === year && e.month === month).forEach(e => {
      if (!m[e.itemId]) m[e.itemId] = {};
      m[e.itemId][e.day] = (m[e.itemId][e.day] || 0) + e.count;
    });
    return m;
  }, [manual, year, month]);

  const getAuto = (id:string, d:number) => autoCnt[id]?.[d] || 0;
  const getMan  = (id:string, d:number) => manCnt[id]?.[d]  || 0;
  const getSum  = (id:string, d:number) => getAuto(id,d) + getMan(id,d);
  const rowSum  = (id:string)           => days.reduce((s,d) => s + getSum(id,d), 0);
  const daySum  = (d:number)            => items.reduce((s,it) => s + getSum(it.id,d), 0);
  const grand   = ()                    => items.reduce((s,it) => s + rowSum(it.id), 0);

  const medicines  = items.filter(i=>i.category==='medicine').sort((a,b)=>a.order-b.order);
  const treatments = items.filter(i=>i.category==='treatment').sort((a,b)=>a.order-b.order);
  const medTotal   = medicines.reduce((s,it) => s + rowSum(it.id), 0);
  const trtTotal   = treatments.reduce((s,it) => s + rowSum(it.id), 0);

  const topItems = useMemo(
    () => items
      .map(it => ({ id:it.id, name:it.name, count:rowSum(it.id) }))
      .filter(x => x.count > 0)
      .sort((a,b) => b.count - a.count)
      .slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, autoCnt, manCnt, days]
  );

  const activeDays = useMemo(
    () => days.filter(d => daySum(d) > 0).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days, autoCnt, manCnt]
  );

  /* 날짜 판별 */
  const isSun    = (d:number) => new Date(year, month-1, d).getDay() === 0;
  const isSat    = (d:number) => new Date(year, month-1, d).getDay() === 6;
  const isVac    = (d:number) => vacDays.includes(d);
  const isHoliday = (d:number) => getHolidayName(year, month, d) !== '';
const isRedDay  = (d:number) => isSun(d) || isVac(d) || isHoliday(d);
const holidayName = (d:number) => getHolidayName(year, month, d);
  const isToday  = (d:number) =>
    today.getFullYear()===year && today.getMonth()+1===month && today.getDate()===d;

  /* 연차 토글 */
  const toggleVac = (d:number) => {
    if (isSun(d)) return; // 일요일은 토글 불필요
    const next = vacDays.includes(d) ? vacDays.filter(x=>x!==d) : [...vacDays, d];
    setVacDays(next);
    sv(`hc_boguns_vac_${year}_${month}`, next);
  };

  const navMonth = (delta:number) => {
    let m = month + delta, y = year;
    if (m < 1)  { m = 12; y--; }
    if (m > 12) { m = 1;  y++; }
    setYear(y); setMonth(m);
  };

  const startEdit = (id:string, d:number) => {
    setEditCell({ id, day:d });
    setEditVal(getMan(id,d) > 0 ? String(getMan(id,d)) : '');
  };

  const commit = useCallback(() => {
    if (!editCell) return;
    const { id, day } = editCell;
    const cnt = Math.max(0, parseInt(editVal) || 0);
    const rest = manual.filter(
      e => !(e.year===year && e.month===month && e.day===day && e.itemId===id)
    );
    const next = cnt > 0 ? [...rest, { year, month, day, itemId:id, count:cnt }] : rest;
    setManual(next); sv('hc_boguns_manual', next);
    setEditCell(null); setEditVal('');
  }, [editCell, editVal, manual, year, month]);

  const openNameModal = (itemId:string, day:number) => {
  const matched = consults.filter(c => {
    if (!c.상담일 || !c.약품기록) return false;
    const [y, mo, d] = c.상담일.split('-').map(Number);
    return y === year && mo === month && d === day && Number(c.약품기록?.[itemId] || 0) > 0;
  });

  const entries = matched.map(c => ({
    consultId: c.id,
    name: String(c.성명 || '').trim() || '이름 없음',
    사번: c.사번,
    상담일: c.상담일,
  }));

  const item = items.find(i => i.id === itemId);

  setNameModal({
    title: `${month}월 ${day}일 · ${item?.name ?? '이용자'}`,
    entries,
  });
};
const handleOpenConsult = (entry: {
  consultId: number;
  name: string;
  사번?: string;
  상담일: string;
}) => {
  if (!onOpenConsult || !entry.사번) return;

  onOpenConsult({
    consultId: entry.consultId,
    사번: entry.사번,
  });

  setNameModal(null);
};

  const addItem = () => {
    if (!newName.trim()) return;
    const ord = Math.max(0, ...items.filter(i=>i.category===newCat).map(i=>i.order)) + 1;
    const it: BogunsilItem = {
      id:`c_${Date.now()}`, name:newName.trim(),
      sub:newSub.trim()||undefined, category:newCat, order:ord,
    };
    const next = [...items, it]; setItems(next); sv('hc_boguns_items', next);
window.dispatchEvent(new Event('hc_boguns_items_changed'));

    setNewName(''); setNewSub(''); setShowModal(false);
  };

  const delItem = (id:string) => {
    if (!window.confirm('이 항목을 삭제하시겠습니까?')) return;
    const ni = items.filter(i=>i.id!==id);
    const nm = manual.filter(e=>e.itemId!==id);
    setItems(ni); sv('hc_boguns_items', ni);
setManual(nm); sv('hc_boguns_manual', nm);
setShowDelId(null);
window.dispatchEvent(new Event('hc_boguns_items_changed'));

  };

  const resetItems = () => {
    if (!window.confirm('기본 항목으로 초기화하시겠습니까?')) return;
    setItems(DEFAULT_BOGUNS_ITEMS); sv('hc_boguns_items', DEFAULT_BOGUNS_ITEMS);
window.dispatchEvent(new Event('hc_boguns_items_changed'));

  };

  /* ── 셀 렌더 ── */
  const renderCell = (itemId:string, day:number) => {
    const total = getSum(itemId, day);
    const auto  = getAuto(itemId, day);
    const man   = getMan(itemId, day);
    const isEd  = editCell?.id===itemId && editCell?.day===day;
    const red   = isRedDay(day);
    const td    = isToday(day);

    if (isEd) return (
      <td key={day} style={{
        padding:0, border:`2px solid ${P.autoBr}`,
        background:P.autoBg, width:'28px', minWidth:'28px',
      }}>
        <input type="number" min="0" value={editVal} autoFocus
          onChange={e => setEditVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key==='Enter')  commit();
            if (e.key==='Escape') { setEditCell(null); setEditVal(''); }
          }}
          style={{
            width:'100%', border:'none', outline:'none', textAlign:'center',
            fontSize:'12px', background:'transparent', padding:'4px 0',
            fontFamily:'inherit', color:P.autoTx,
          }}
        />
      </td>
    );

    /* 기본 배경: 빨간날 > 오늘 > 흰색 */
    let bg    = red ? P.redBg : td ? P.todayBg : '#FFFFFF';
    let color = 'transparent';
    let bdr   = red ? P.redBr : td ? P.todayBr : P.line;
    let fw    = 400;

    if (total > 0) {
      if (auto > 0 && man > 0) { bg=P.bothBg; color=P.bothTx; bdr=P.bothBr; fw=700; }
      else if (auto > 0)        { bg=P.autoBg; color=P.autoTx; bdr=P.autoBr; fw=700; }
      else                      { bg=P.manBg;  color=P.manTx;  bdr=P.manBr;  fw=700; }
    }

    return (
      <td key={day}
        style={{
          border:`1px solid ${bdr}`, padding:'2px 0',
          fontSize:'13px', textAlign:'center', verticalAlign:'middle',
width:'36px', minWidth:'36px', maxWidth:'36px',
cursor:'pointer', userSelect:'none' as const,
          background:bg, color, fontWeight:fw,
          transition:'background 0.08s',
        }}
        onClick={() => {
  if (total > 0) {
    openNameModal(itemId, day);
    return;
  }
  startEdit(itemId, day);
}}

        title={
          total > 0
            ? [auto>0?`자동 ${auto}건`:'', man>0?`수동 ${man}건`:''].filter(Boolean).join(' + ') + ' | 클릭: 수정'
            : '클릭하여 입력'
        }
      >
        {total > 0 ? total : ''}
      </td>
    );
  };

  /* ── 행 렌더 ── */
  const renderRow = (item:BogunsilItem) => {
    const rs    = rowSum(item.id);
    const isMed = item.category === 'medicine';
    const lBg   = isMed ? P.medBg : P.trtBg;
    const lTx   = isMed ? P.medTx : P.trtTx;
    const lBr   = isMed ? P.medBr : P.trtBr;

    return (
      <tr key={item.id}>
        <td
          style={{
            border:`1px solid ${P.line2}`, padding:'5px 10px',
            background: '#FFFFFF', minWidth:'130px', verticalAlign:'middle',
          }}
          onMouseEnter={() => setShowDelId(item.id)}
          onMouseLeave={() => setShowDelId(null)}
        >
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'6px' }}>
            <div>
              <div style={{ fontSize:'12px', fontWeight:700, color:lTx }}>{item.name}</div>
              {item.sub && (
                <div style={{ fontSize:'10px', color:lTx, opacity:0.55, marginTop:'1px' }}>({item.sub})</div>
              )}
            </div>
            {showDelId===item.id && (
              <button onClick={() => delItem(item.id)}
                style={{
                  width:'16px', height:'16px', padding:0, flexShrink:0,
                  background:'#FFE0E8', color:'#C04060', border:'none',
                  borderRadius:'3px', cursor:'pointer', fontSize:'12px',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>×</button>
            )}
          </div>
        </td>

        {days.map(d => renderCell(item.id, d))}

        <td style={{
          border:`1px solid ${P.line}`, padding:'2px 6px',
          fontSize:'12px', textAlign:'center', verticalAlign:'middle',
          fontWeight: rs>0 ? 700 : 400,
          color:      rs>0 ? P.sumTx : '#CCCCCC',
          background: rs>0 ? P.sumBg : '#FFFFFF',
          width:'42px',
        }}>
          {rs > 0 ? rs : '–'}
        </td>
      </tr>
    );
  };

  /* ── 섹션 구분 행 ── */
  const sectionRow = (
    label:string, count:number, total:number,
    bg:string, tx:string, br:string
  ) => (
    <tr>
      <td colSpan={days.length + 2} style={{
        padding:'5px 14px', background:'#F9FAFB',
borderTop:`1px solid ${P.line2}`, borderBottom:`1px solid ${P.line2}`,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'11px', fontWeight:700, color:tx, letterSpacing:'0.07em' }}>{label}</span>
          <span style={{ fontSize:'11px', color:tx, opacity:0.55 }}>{count}종 · 이번달 {total}건</span>
        </div>
      </td>
    </tr>
  );

  /* ── JSX ── */
  return (
    <div style={{ padding:'24px 28px', background:'#FFFFFF', minHeight:'100vh', fontFamily:'Pretendard,-apple-system,sans-serif' }}>

      {/* ─── 헤더 ─── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'18px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'21px', fontWeight:800, color:P.heading, margin:0, marginBottom:'6px' }}>
            건강관리실 사용 현황
          </h1>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', fontSize:'12px', color:P.sub }}>
            {[
              [P.autoBg, P.autoBr, '상담일지 자동'],
              [P.manBg,  P.manBr,  '직접 입력'],
              [P.bothBg, P.bothBr, '자동+수동'],
              [P.redBg,  P.redBr,  '일요일·연차'],
            ].map(([bg,br,lbl]) => (
              <span key={lbl} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                <span style={{ display:'inline-block', width:'10px', height:'10px', background:bg, border:`1px solid ${br}`, borderRadius:'2px' }}/>
                {lbl}
              </span>
            ))}
            <span style={{ color:P.line2 }}>|</span>
            <span>날짜 클릭: 연차 설정/해제 &nbsp;·&nbsp; 셀 클릭: 수량 입력</span>
          </div>
        </div>

        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', border:`1px solid ${P.line2}`, borderRadius:'10px', overflow:'hidden', background:'#FFF' }}>
            <button onClick={() => navMonth(-1)}
              style={{ padding:'8px 14px', border:'none', background:'transparent', cursor:'pointer', fontSize:'16px', color:P.sub, lineHeight:1 }}>‹</button>
            <div style={{ padding:'8px 18px', fontSize:'14px', fontWeight:700, color:P.heading, borderLeft:`1px solid ${P.line}`, borderRight:`1px solid ${P.line}`, background:'#FAFAFA', whiteSpace:'nowrap' }}>
              {year}년 {month}월
            </div>
            <button onClick={() => navMonth(1)}
              style={{ padding:'8px 14px', border:'none', background:'transparent', cursor:'pointer', fontSize:'16px', color:P.sub, lineHeight:1 }}>›</button>
          </div>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()+1); }}
            style={{ padding:'8px 14px', background:P.todayBg, color:P.todayTx, border:`1px solid ${P.todayBr}`, borderRadius:'9px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
            이번달
          </button>
          <button onClick={() => setShowModal(true)}
            style={{ padding:'8px 16px', background:P.titleBg, color:P.titleTx, border:`1px solid ${P.titleBr}`, borderRadius:'9px', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>
            + 항목 추가
          </button>
          <button onClick={resetItems}
            style={{ padding:'8px 12px', background:'#FFF', color:P.sub, border:`1px solid ${P.line2}`, borderRadius:'9px', fontSize:'13px', cursor:'pointer' }}>
            초기화
          </button>
        </div>
      </div>

      {/* ─── KPI 카드 ─── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'14px' }}>
        {[
          { label:'총 사용 건수', value:grand(),    unit:'건', sub:'약품 + 처치 합계',        ...P.kpi[0] },
          { label:'약품 지급',   value:medTotal,   unit:'건', sub:`${medicines.length}종 관리 중`,  ...P.kpi[1] },
          { label:'처치·상담',  value:trtTotal,   unit:'건', sub:`${treatments.length}종 관리 중`, ...P.kpi[2] },
          { label:'이용 일수',  value:activeDays, unit:'일', sub:`전체 ${days.length}일 중`,       ...P.kpi[3] },
        ].map(c => (
          <div key={c.label} style={{ background:c.bg, border:`1px solid ${c.br}`, borderRadius:'14px', padding:'16px 18px' }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:P.sub, marginBottom:'8px' }}>{c.label}</div>
            <div style={{ fontSize:'26px', fontWeight:800, color:c.tx, lineHeight:1 }}>
              {c.value}<span style={{ fontSize:'12px', fontWeight:500, marginLeft:'3px', opacity:0.7 }}>{c.unit}</span>
            </div>
            <div style={{ fontSize:'11px', color:P.sub, marginTop:'6px', opacity:0.8 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ─── TOP 항목 ─── */}
      {topItems.length > 0 && (
        <div style={{ background:'#FFF', border:`1px solid ${P.line}`, borderRadius:'10px', padding:'10px 18px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'4px', flexWrap:'wrap' }}>
          <span style={{ fontSize:'11px', fontWeight:700, color:P.medTx, marginRight:'8px', whiteSpace:'nowrap' }}>이번달 TOP</span>
          {topItems.map((it, i) => {
            const medals = [
              { bg:'#FDF6E0', color:'#C8A050' },
              { bg:'#F0EEF8', color:'#9890B0' },
              { bg:'#FCF0E8', color:'#C09070' },
              { bg:'#F5F4F8', color:P.sub },
              { bg:'#F5F4F8', color:P.sub },
            ];
            const m = medals[i] ?? medals[4];
            return (
              <div key={it.id} style={{ display:'flex', alignItems:'center', gap:'5px', marginRight:'12px' }}>
                <span style={{ width:'18px', height:'18px', borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:800, background:m.bg, color:m.color }}>{i+1}</span>
                <span style={{ fontSize:'13px', fontWeight:600, color:P.heading }}>{it.name}</span>
                <span style={{ fontSize:'11px', color:P.sub, background:'#F8F8F8', padding:'1px 7px', borderRadius:'4px', border:`1px solid ${P.line}` }}>{it.count}건</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 메인 테이블 ─── */}
      <div style={{ background:'#FFF', border:`1px solid ${P.line2}`, borderRadius:'16px', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
        {/* 타이틀바 */}
        <div style={{ background:P.titleBg, padding:'13px 22px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${P.titleBr}` }}>
          <span style={{ fontSize:'15px', fontWeight:800, color:P.titleTx, letterSpacing:'0.04em' }}>
            건강관리실 사용 현황
          </span>
          <span style={{ fontSize:'13px', color:P.titleTx, opacity:0.7, fontWeight:400 }}>
            {year}년 {month}월 &nbsp;·&nbsp; 단위: 건
          </span>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse', minWidth:`${180+days.length*35+70}px` }}>
            <thead>
              <tr>
                <th style={{ border:`1px solid ${P.line}`, padding:'8px 12px', fontSize:'12px', fontWeight:700, background:'#FAFAFA', color:P.sub, textAlign:'left', verticalAlign:'middle', minWidth:'130px' }}>
                  구 분
                </th>
                {days.map(d => {
                  const red = isRedDay(d);
                  const vac = isVac(d);
                  const sun = isSun(d);
                  const sat = isSat(d);
                  const td  = isToday(d);
                  return (
                    <th key={d}
                      onClick={() => toggleVac(d)}
                      title={
  sun ? `${d}일 (일요일)${holidayName(d) ? ' · '+holidayName(d) : ''}` :
  holidayName(d) && !vac ? `${d}일 (${holidayName(d)}) — 클릭: 연차 추가` :
  vac ? `${d}일 연차 — 클릭: 해제` :
  `${d}일 — 클릭: 연차 설정`
}

                      style={{
                        border:`1px solid ${red ? P.redBr : td ? P.todayBr : P.line}`,
                        padding:'5px 2px 3px', fontSize:'11px', fontWeight:600,
                        background: red ? P.redBg : td ? P.todayBg : '#FAFAFA',
                        color: red ? P.redTx : sat ? '#1A5FA0' : '#4A4468',
                        textAlign:'center', width:'28px',
                        cursor: sun ? 'default' : 'pointer',
                        userSelect:'none' as const, transition:'background 0.08s',
                      }}
                    >
                      <div>{d}</div>
                      {vac && !sun && (
  <div style={{ fontSize:'8px', color:P.redTx, fontWeight:800, marginTop:'1px', lineHeight:1 }}>연차</div>
)}
{!vac && holidayName(d) && (
  <div style={{ fontSize:'7px', color:P.redTx, fontWeight:700, marginTop:'1px', lineHeight:1, overflow:'hidden', whiteSpace:'nowrap', maxWidth:'26px', textOverflow:'ellipsis' }}>
    {holidayName(d).replace('대체공휴일','대체').replace('부처님오신날','부처님').replace('어린이날·부처님오신날','어린이·부처')}
  </div>
)}

                    </th>
                  );
                })}
                <th style={{ border:`1px solid ${P.line}`, padding:'8px 6px', fontSize:'12px', fontWeight:700, background:P.sumBg, color:P.sumTx, textAlign:'center', width:'42px' }}>
                  합계
                </th>
              </tr>
            </thead>
            <tbody>
              {sectionRow('약 품', medicines.length, medTotal, P.medBg, P.medTx, P.medBr)}
              {medicines.map(it => renderRow(it))}

              {sectionRow('처치 · 상담', treatments.length, trtTotal, P.trtBg, P.trtTx, P.trtBr)}
              {treatments.map(it => renderRow(it))}

              {/* 합계 행 */}
              <tr style={{ borderTop:`2px solid ${P.line2}` }}>
                <td style={{ border:`1px solid ${P.line}`, padding:'8px 12px', fontSize:'13px', fontWeight:800, color:P.titleTx, background:'#FFFFFF', textAlign:'center' }}>
                  합 계
                </td>
                {days.map(d => {
                  const ds  = daySum(d);
                  const red = isRedDay(d);
                  const td  = isToday(d);
                  return (
                    <td key={d} style={{
                      border:`1px solid ${red ? P.redBr : td ? P.todayBr : P.line}`,
                      padding:'5px 0', fontSize:'12px', textAlign:'center',
                      fontWeight: ds>0 ? 700 : 400,
                      color: ds>0 ? P.heading : '#CCCCCC',
                      background: red ? P.redBg : td ? P.todayBg : ds>0 ? '#FAFAFA' : '#FFFFFF',
                    }}>
                      {ds > 0 ? ds : ''}
                    </td>
                  );
                })}
                <td style={{ border:`1px solid ${P.line}`, padding:'5px 6px', fontSize:'14px', textAlign:'center', fontWeight:800, color:grand()>0?P.sumTx:'#CCCCCC', background:grand()>0?P.sumBg:'#FFFFFF' }}>
                  {grand() > 0 ? grand() : '–'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 모달 ─── */}
      {showModal && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.18)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}
          onClick={e=>{ if(e.target===e.currentTarget) setShowModal(false); }}
        >
          <div style={{ background:'#FFF', borderRadius:'18px', padding:'28px 32px', width:'390px', boxShadow:'0 8px 40px rgba(0,0,0,0.14)', border:`1px solid ${P.titleBr}` }}>
            <div style={{ fontSize:'18px', fontWeight:800, color:P.heading, marginBottom:'4px' }}>항목 추가</div>
            <div style={{ fontSize:'13px', color:P.sub, marginBottom:'22px' }}>사용 현황 표에 새 항목을 추가합니다.</div>

            <div style={{ marginBottom:'16px' }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:P.sub, marginBottom:'8px' }}>분류</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {([
                  ['medicine',  '약품',      P.autoTx, P.autoBg, P.autoBr],
                  ['treatment', '처치·상담', P.trtTx,  P.trtBg,  P.trtBr],
                ] as [string,string,string,string,string][]).map(([v,l,c,bg,br]) => (
                  <button key={v} onClick={()=>setNewCat(v as 'medicine'|'treatment')}
                    style={{ padding:'11px', border:`2px solid ${newCat===v ? c : P.line2}`, borderRadius:'10px', background:newCat===v ? bg : '#FFF', color:newCat===v ? c : P.sub, fontSize:'13px', fontWeight:newCat===v ? 700 : 400, cursor:'pointer', transition:'all 0.15s' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:'14px' }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:P.sub, marginBottom:'6px' }}>항목명 *</div>
              <input value={newName} onChange={e=>setNewName(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') addItem(); }}
                placeholder="예: 소화제" autoFocus
                style={{ width:'100%', padding:'10px 14px', border:`1px solid ${P.line2}`, borderRadius:'9px', fontSize:'14px', outline:'none', boxSizing:'border-box' as const, fontFamily:'inherit', color:P.heading }}/>
            </div>
            <div style={{ marginBottom:'24px' }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:P.sub, marginBottom:'6px' }}>
                성분명 <span style={{ fontWeight:400 }}>(선택 · 괄호 표시)</span>
              </div>
              <input value={newSub} onChange={e=>setNewSub(e.target.value)}
                placeholder="예: 아세트아미노펜"
                style={{ width:'100%', padding:'10px 14px', border:`1px solid ${P.line2}`, borderRadius:'9px', fontSize:'14px', outline:'none', boxSizing:'border-box' as const, fontFamily:'inherit', color:P.heading }}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <button onClick={()=>{ setShowModal(false); setNewName(''); setNewSub(''); }}
                style={{ padding:'12px', background:'#F8F8F8', color:P.sub, border:`1px solid ${P.line2}`, borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                취소
              </button>
              <button onClick={addItem}
                style={{ padding:'12px', background:P.titleBg, color:P.titleTx, border:`1px solid ${P.titleBr}`, borderRadius:'10px', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}
            {nameModal && (
        <div
          style={{
            position:'fixed',
            inset:0,
            background:'rgba(0,0,0,0.18)',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            zIndex:9999,
          }}
          onClick={e => { if (e.target === e.currentTarget) setNameModal(null); }}
        >
          <div
            style={{
              width:'360px',
              maxWidth:'90vw',
              background:'#FFFFFF',
              border:`1px solid ${P.line2}`,
              borderRadius:'16px',
              overflow:'hidden',
              boxShadow:'0 8px 30px rgba(0,0,0,0.12)',
            }}
          >
            <div style={{
              padding:'14px 18px',
              borderBottom:`1px solid ${P.line2}`,
              background:'#F9FAFB',
            }}>
              <div style={{ fontSize:'15px', fontWeight:800, color:P.heading }}>
                이용자 목록
              </div>
              <div style={{ fontSize:'12px', color:P.sub, marginTop:'4px' }}>
                {nameModal.title}
              </div>
            </div>

            <div style={{ padding:'14px 18px', maxHeight:'280px', overflowY:'auto' }}>
              {nameModal.entries.length > 0 ? (
  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
    {nameModal.entries.map((entry, idx) => (
      <button
        key={`${entry.consultId}-${idx}`}
        onClick={() => handleOpenConsult(entry)}
        style={{
          padding:'10px 12px',
          border:`1px solid ${P.line}`,
          borderRadius:'10px',
          background:'#FFFFFF',
          fontSize:'14px',
          color:P.heading,
          fontWeight:600,
          textAlign:'left',
          cursor:'pointer',
        }}
      >
        <div>{entry.name}</div>
        <div style={{ fontSize:'12px', color:P.sub, marginTop:'4px', fontWeight:400 }}>
          {entry.상담일}{entry.사번 ? ` · ${entry.사번}` : ''}
        </div>
      </button>
    ))}
  </div>
) : (

                <div style={{ fontSize:'13px', color:P.sub }}>
                  기록된 이용자 이름이 없습니다.
                </div>
              )}
            </div>

            <div style={{
              padding:'12px 18px',
              borderTop:`1px solid ${P.line2}`,
              display:'flex',
              justifyContent:'flex-end',
              background:'#FFFFFF',
            }}>
              <button
                onClick={() => setNameModal(null)}
                style={{
                  padding:'8px 14px',
                  background:'#FFFFFF',
                  color:P.sub,
                  border:`1px solid ${P.line2}`,
                  borderRadius:'8px',
                  fontSize:'13px',
                  cursor:'pointer',
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
