'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';

type Row = Record<string, string | number>;

interface SogyeonRow {
  id: number;
  사번: string; 성명: string; year: string; 부서명: string;
  특검검진일: string; 일검검진일: string; 배치전검진일: string; 배치후검진일: string; 비고: string;
  [key: string]: string | number;
}

interface Consult {
  id: number;
  사번: string; 성명: string; 상담일: string; 상담장소: string; 상담자: string;
  방문: boolean; 전화: boolean; 추후상담: boolean; 추후진료: boolean;
  음주: string; 흡연: string; 가족력: string; 운동: string;
  약물치료: string; 유해인자: string; 야간근무: string; 근무위치: string;
  cell: Record<string, string>; 상담내용: string;
  약품기록?: Record<string, number>;
}

const st = (v: unknown) => String(v ?? '');
function ld<T>(k: string, fb: T): T {
  if (typeof window === 'undefined') return fb;
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; }
}
function sv(k: string, d: unknown) { try { localStorage.setItem(k, JSON.stringify(d)); } catch {} }
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function calcAge(birth: string): string {
  if (!birth || birth === '-') return '-';
  let s = birth.trim();
  if (/^\d{8}$/.test(s)) s = `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  s = s.replace(/\//g, '-');
  const b = new Date(s); if (isNaN(b.getTime())) return '-';
  const t = new Date(); let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return `${a}세`;
}
function calcTenure(hire: string): string {
  if (!hire || hire === '-') return '-';
  const h = new Date(hire); if (isNaN(h.getTime())) return '-';
  const t = new Date(); let y = t.getFullYear() - h.getFullYear(), m = t.getMonth() - h.getMonth();
  if (m < 0) { y--; m += 12; }
  return `${y}년 ${m}개월`;
}
function get5Years(): number[] {
  const y = new Date().getFullYear(); return [y, y-1, y-2, y-3, y-4];
}
interface BogunsilItem {
  id: string; name: string; sub?: string;
  category: 'medicine' | 'treatment'; order: number;
}

const DEFAULT_BOGUNS_ITEMS: BogunsilItem[] = [
  { id:'med_01', name:'해열진통제',       sub:'아세트아미노펜', category:'medicine',  order:1  },
  { id:'med_02', name:'소염진통제',       sub:'나프록센',       category:'medicine',  order:2  },
  { id:'med_03', name:'소염진통제',       sub:'멕시부프로펜',   category:'medicine',  order:3  },
  { id:'med_04', name:'근육통 완화제',                          category:'medicine',  order:4  },
  { id:'med_05', name:'편도염',                                 category:'medicine',  order:5  },
  { id:'med_06', name:'소화제',                                 category:'medicine',  order:6  },
  { id:'med_07', name:'위보호제',                               category:'medicine',  order:7  },
  { id:'med_08', name:'위경련약',                               category:'medicine',  order:8  },
  { id:'med_09', name:'지사제',                                 category:'medicine',  order:9  },
  { id:'med_10', name:'변비약',                                 category:'medicine',  order:10 },
  { id:'med_11', name:'종합감기약',                             category:'medicine',  order:11 },
  { id:'med_12', name:'알러지약',                               category:'medicine',  order:12 },
  { id:'med_13', name:'파스',                                   category:'medicine',  order:13 },
  { id:'med_14', name:'식염포도당',                             category:'medicine',  order:14 },
  { id:'trt_01', name:'찰과상',                                 category:'treatment', order:1  },
  { id:'trt_02', name:'자상',                                   category:'treatment', order:2  },
  { id:'trt_03', name:'화상',                                   category:'treatment', order:3  },
  { id:'trt_04', name:'염좌',                                   category:'treatment', order:4  },
  { id:'trt_05', name:'침대 이용',                              category:'treatment', order:5  },
  { id:'trt_06', name:'보건상담',                               category:'treatment', order:6  },
  { id:'trt_07', name:'신속항원검사 진행',                       category:'treatment', order:7  },
  { id:'trt_08', name:'기타',                                   category:'treatment', order:8  },
];
const fmtDate = (v: unknown): string => {
  if (!v || v === '-') return '-';
  if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
  const s = String(v).trim();
  const n = Number(s);
  if (!isNaN(n) && n > 40000 && n < 60000) {
    const dt = new Date(Math.round((n - 25569) * 86400 * 1000));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;
  }
  return s;
};

const 판정Color = (v: string): string => {
  const u = v.toUpperCase();
  if (['C', 'CN', 'C2'].includes(u)) return '#2563eb';
  if (['C1', 'D1', 'D2', 'DN'].includes(u)) return '#dc2626';
  return '#374151';
};

const abnormalLevel = (key: string, val: string): 0 | 1 | 2 => {
  const v = val.trim(); if (!v || v === '-') return 0;
  const n = parseFloat(v);
  if (!isNaN(n)) {
    switch (key) {
      case 'SBP':   return n >= 140 ? 2 : n >= 130 ? 1 : 0;
      case 'DBP':   return n >= 90  ? 2 : n >= 85  ? 1 : 0;
      case 'GLU':   return n >= 126 ? 2 : n >= 100 ? 1 : 0;
      case 'HBA1C': return n >= 6.5 ? 2 : n >= 5.7 ? 1 : 0;
      case 'BMI':   return n >= 30 || n < 17 ? 2 : n >= 25 || n < 18.5 ? 1 : 0;
      case 'WAIST': return n >= 100 ? 2 : n >= 90  ? 1 : 0;
      case 'TC':    return n >= 240 ? 2 : n >= 200 ? 1 : 0;
      case 'HDL':   return n < 35   ? 2 : n < 40   ? 1 : 0;
      case 'TG':    return n >= 200 ? 2 : n >= 150 ? 1 : 0;
      case 'LDL':   return n >= 160 ? 2 : n >= 130 ? 1 : 0;
      case 'GOT':   return n >= 80  ? 2 : n >= 40  ? 1 : 0;
      case 'GPT':   return n >= 80  ? 2 : n >= 40  ? 1 : 0;
      case 'GTP':   return n >= 100 ? 2 : n >= 60  ? 1 : 0;
      case 'CRE':   return n > 1.5  ? 2 : n > 1.2  ? 1 : 0;
      case 'GFR':   return n < 30   ? 2 : n < 60   ? 1 : 0;
      case 'FVC':   return n < 70   ? 2 : n < 80   ? 1 : 0;
      case 'FEV1':  return n < 70   ? 2 : n < 80   ? 1 : 0;
      case 'FEVR':  return n < 60   ? 2 : n < 70   ? 1 : 0;
    }
  }
  return 0;
};

const SOGYEON_TYPES = [
  { type: '정기특검',   n: 5 },
  { type: '일반검진',   n: 5 },
  { type: '배치전검진', n: 4 },
  { type: '배치후검진', n: 4 },
];

const RESULT_ROWS: { label: string; key: string; auto?: string }[] = [
  { label: '뇌심혈관질환발병위험도', key: 'BRTYPE', auto: 'BRTYPE' },
  { label: '수축기혈압',   key: 'SBP',     auto: 'SBP'     },
  { label: '이완기혈압',   key: 'DBP',     auto: 'DBP'     },
  { label: '공복혈당',     key: 'GLU',     auto: 'GLU'     },
  { label: '당화혈색소',   key: 'HBA1C',   auto: 'HBA1C'   },
  { label: '신장',         key: 'HEIGHT',  auto: 'HEIGHT'  },
  { label: '체중',         key: 'WEIGHT',  auto: 'WEIGHT'  },
  { label: 'BMI',          key: 'BMI',     auto: 'BMI'     },
  { label: '허리둘레',     key: 'WAIST',   auto: 'WAIST'   },
  { label: 'TC',           key: 'TC',      auto: 'TC'      },
  { label: 'HDL-Chol',     key: 'HDL',     auto: 'HDL'     },
  { label: 'TG',           key: 'TG',      auto: 'TG'      },
  { label: 'LDL-Chol',     key: 'LDL',     auto: 'LDL'     },
  { label: 'GOT(AST)',      key: 'GOT',     auto: 'GOT'     },
  { label: 'GPT(ALT)',      key: 'GPT',     auto: 'GPT'     },
  { label: 'γ-GTP',        key: 'GTP',     auto: 'GTP'     },
  { label: '크레아티닌',   key: 'CRE',     auto: 'CRE'     },
  { label: 'GFR',          key: 'GFR',     auto: 'GFR'     },
  { label: '단백뇨',       key: 'PROT',    auto: 'PROT'    },
  { label: 'X-RAY',        key: 'XRAY',    auto: 'XRAY'    },
  { label: '기타혈액검사', key: 'BLOOD',   auto: 'BLOOD'   },
  { label: 'FVC%',         key: 'FVC',     auto: 'FVC'     },
  { label: 'FEV1%',        key: 'FEV1',    auto: 'FEV1'    },
  { label: 'FEV1/FVC(%)',  key: 'FEVR',    auto: 'FEVR'    },
  { label: '소음',         key: 'NOISE',   auto: 'NOISE'   },
  { label: '심전도',       key: 'ECG',     auto: 'ECG'     },
  { label: '수면질',       key: 'SLEEP',   auto: 'SLEEP'   },
  { label: '위장장애',     key: 'GASTRIC', auto: 'GASTRIC' },
  { label: '기타',         key: 'ETC',     auto: 'ETC'     },
];

/* ══ SVG 추세 차트 ══ */
function TrendChart({ rows, metrics, colors }: { rows: Row[]; metrics: { key: string; label: string }[]; colors: string[] }) {
  const W = 280, H = 110, pl = 22, pr = 6, pt = 12, pb = 26;
  const cw = W-pl-pr, ch = H-pt-pb;
  const yrs = rows.map(r => st(r['year']));
  const n = yrs.length;
  const vals = metrics.flatMap(m => rows.map(r => parseFloat(st(r[m.key]))).filter(v => !isNaN(v) && v > 0));
  if (!n || !vals.length) return <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '10px' }}>데이터 없음</div>;
  const lo = Math.floor(Math.min(...vals) * 0.9);
  const hi = Math.ceil(Math.max(...vals) * 1.1);
  const rng = hi - lo || 1;
  const xp = (i: number) => pl + (n <= 1 ? cw/2 : (i/(n-1))*cw);
  const yp = (v: number) => pt + ch - ((v-lo)/rng)*ch;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {[lo, Math.round((lo+hi)/2), hi].map(v => (
        <g key={v}>
          <line x1={pl} x2={W-pr} y1={yp(v)} y2={yp(v)} stroke="#eee" strokeWidth={1}/>
          <text x={pl-2} y={yp(v)+3} fontSize={5} fill="#bbb" textAnchor="end">{v}</text>
        </g>
      ))}
      {yrs.map((yr, i) => <text key={yr} x={xp(i)} y={H-3} fontSize={5} fill="#aaa" textAnchor="middle">{yr}</text>)}
      {metrics.map((m, mi) => {
        const pts = rows.map((r, i) => { const v = parseFloat(st(r[m.key])); return (isNaN(v)||v<=0)?null:{x:xp(i),y:yp(v),v}; }).filter(Boolean) as {x:number;y:number;v:number}[];
        if (!pts.length) return null;
        const d = pts.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        return (
          <g key={m.key}>
            {pts.length > 1 && <path d={d} fill="none" stroke={colors[mi]} strokeWidth={1.5} strokeLinejoin="round"/>}
            {pts.map((p, pi) => (
              <g key={pi}>
                <circle cx={p.x} cy={p.y} r={2} fill={colors[mi]}><title>{m.label}: {p.v}</title></circle>
                <text x={p.x} y={p.y-4} fontSize={5} fill={colors[mi]} textAnchor="middle" fontWeight="bold">{p.v}</text>
              </g>
            ))}
          </g>
        );
      })}
      {metrics.map((m, mi) => (
        <g key={m.key} transform={`translate(${pl + (mi * (cw / Math.max(metrics.length, 1)))}, ${H})`}>
          <line x1={0} x2={7} y1={0} y2={0} stroke={colors[mi]} strokeWidth={1.5}/>
          <text x={9} y={3} fontSize={5} fill="#666">{m.label}</text>
        </g>
      ))}
    </svg>
  );
}

/* ══ useColResize ══ */
function useColResize(defaults: number[]) {
  const [widths, setWidths] = useState<number[]>(defaults);
  const drag = useRef<{ col: number; startX: number; startW: number } | null>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      const { col, startX, startW } = drag.current;
      setWidths(prev => { const next = [...prev]; next[col] = Math.max(40, startW + e.clientX - startX); return next; });
    };
    const onUp = () => { drag.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);
  const handle = (col: number) => (e: React.MouseEvent) => {
    drag.current = { col, startX: e.clientX, startW: widths[col] };
    e.preventDefault(); e.stopPropagation();
  };
  return { widths, handle };
}
/* ══ 약품·처치 기록 섹션 (상담일지 내장) ══ */
function BogunsilRecordSection({
  editing, record, onChange,
}: {
  editing: boolean;
  record: Record<string, number>;
  onChange: (r: Record<string, number>) => void;
}) {
  const [items, setItems] = useState<BogunsilItem[]>([]);
  useEffect(() => {
  const load = () => {
    const s = ld<BogunsilItem[]>('hc_boguns_items', []);
    setItems(s.length > 0 ? s : DEFAULT_BOGUNS_ITEMS);
  };
  load();
  window.addEventListener('hc_boguns_items_changed', load);
  return () => window.removeEventListener('hc_boguns_items_changed', load);
}, []);


  if (!editing && Object.keys(record).length === 0) {
    return <div style={{ padding:'10px 16px', fontSize:'13px', color:'#9ca3af' }}>약품·처치 기록 없음</div>;
  }

  const toggle = (id: string) => {
    if (!editing) return;
    const n = { ...record };
    if (n[id]) delete n[id]; else n[id] = 1;
    onChange(n);
  };
  const setCount = (id: string, v: number) => {
    if (!editing) return;
    const n = { ...record };
    if (v <= 0) delete n[id]; else n[id] = v;
    onChange(n);
  };

  const grp = (list: BogunsilItem[], label: string) => (
    <div style={{ marginBottom:'10px' }}>
      <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', marginBottom:'5px', letterSpacing:'0.06em' }}>
        {label}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
        {list.map(item => {
          const cnt = record[item.id] || 0;
          const on  = cnt > 0;
          return (
            <div key={item.id}
              onClick={() => toggle(item.id)}
              style={{
                display:'flex', alignItems:'center', gap:'5px', padding:'4px 10px',
                border:`1px solid ${on?'#93c5fd':'#e5e7eb'}`,
                borderRadius:'7px', background:on?'#eff6ff':'#fafafa',
                cursor:editing?'pointer':'default', transition:'border-color 0.15s',
              }}>
              {editing && (
                <input type="checkbox" checked={on}
                  onChange={() => toggle(item.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ cursor:'pointer', width:'13px', height:'13px' }}/>
              )}
              <span style={{ fontSize:'12px', fontWeight:on?600:400, color:on?'#1d4ed8':'#374151', whiteSpace:'nowrap' }}>
                {item.name}
                {item.sub && <span style={{ fontSize:'10px', color:'#9ca3af' }}> ({item.sub})</span>}
              </span>
              {on && editing && (
                <input type="number" min="1" value={cnt}
                  onChange={e => setCount(item.id, parseInt(e.target.value)||1)}
                  onClick={e => e.stopPropagation()}
                  style={{ width:'38px', padding:'1px 3px', border:'1px solid #93c5fd', borderRadius:'4px', fontSize:'12px', textAlign:'center', outline:'none', background:'#fff' }}/>
              )}
              {on && !editing && (
                <span style={{ fontSize:'12px', fontWeight:700, color:'#2563eb' }}>{cnt}건</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const meds = items.filter(i=>i.category==='medicine').sort((a,b)=>a.order-b.order);
  const trts = items.filter(i=>i.category==='treatment').sort((a,b)=>a.order-b.order);

  return (
    <div style={{ padding:'12px 16px' }}>
      {grp(meds, '약 품')}
      {grp(trts, '처치 · 상담')}
      {editing && (
        <div style={{ fontSize:'11px', color:'#9ca3af', marginTop:'4px' }}>
          저장 후 <strong>보건실 탭 → 건강관리실 사용 현황</strong>에 날짜별 자동 반영됩니다.
        </div>
      )}
    </div>
  );
}

/* ══ SogyeonDataTab ══ */
function SogyeonDataTab({ data, onChange }: { data: SogyeonRow[]; onChange: (d: SogyeonRow[]) => void }) {
  const YEARS5 = useMemo(() => get5Years().sort((a, b) => b - a), []);
  const _TYPES = ['정기특검', '일반검진', '배치전검진', '배치후검진'];
  const _DATE_KEYS: Record<string, string> = {
    '정기특검': '특검검진일', '일반검진': '일검검진일',
    '배치전검진': '배치전검진일', '배치후검진': '배치후검진일',
  };
  const _COUNT = 5;
  const TYPE_BG: Record<string, string> = {
    '정기특검': '#eff6ff', '일반검진': '#f0fdf4',
    '배치전검진': '#fefce8', '배치후검진': '#fdf4ff',
  };

  const [yearTab,     setYearTab]     = useState<number>(YEARS5[0]);
  const [search,      setSearch]      = useState('');
  const [editId,      setEditId]      = useState<number | null>(null);
  const [editRow,     setEditRow]     = useState<SogyeonRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const allCheckRef = useRef<HTMLInputElement>(null);

  const yearData = useMemo(() => data.filter(r => String(r.year) === String(yearTab)), [data, yearTab]);
  const filtered  = useMemo(() => {
    if (!search) return yearData;
    const q = search.toLowerCase();
    return yearData.filter(r => r.성명.toLowerCase().includes(q) || r.사번.includes(q));
  }, [yearData, search]);

  const allSelected  = filtered.length > 0 && filtered.every(r => selectedIds.includes(r.id));
  const someSelected = !allSelected && filtered.some(r => selectedIds.includes(r.id));
  const selectedCount = filtered.filter(r => selectedIds.includes(r.id)).length;

  useEffect(() => {
    if (allCheckRef.current) allCheckRef.current.indeterminate = someSelected;
  }, [someSelected]);

  useEffect(() => { setSelectedIds([]); }, [yearTab, search]);

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () => {
    if (allSelected) {
      const ids = filtered.map(r => r.id);
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      const ids = filtered.map(r => r.id);
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const downloadSelected = async () => {
    const rows = filtered.filter(r => selectedIds.includes(r.id));
    if (rows.length === 0) { alert('선택된 인원이 없습니다.'); return; }
    const XLSX = await import('xlsx');
    const headers = ['사번', '성명', '부서명', '배치전검진일'];
    for (let i = 1; i <= _COUNT; i++) headers.push(`배치전검진_${i}_판정`, `배치전검진_${i}_소견`);
    headers.push('비고');
    const dataRows = rows.map(row => {
      const r: (string | number)[] = [row.사번, row.성명, row.부서명, fmtDate(row['배치전검진일']) || ''];
      for (let i = 1; i <= _COUNT; i++) {
        r.push(String(row[`배치전검진_${i}_판정`] || ''));
        r.push(String(row[`배치전검진_${i}_소견`] || ''));
      }
      r.push(String(row.비고 || ''));
      return r;
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws['!cols'] = headers.map(() => ({ wch: 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '배치전검진_선택인원');
    XLSX.writeFile(wb, `배치전검진_선택인원_${yearTab}.xlsx`);
  };

  const mkBlank = (id: number): SogyeonRow => {
    const row: SogyeonRow = {
      id, 사번: '', 성명: '', year: String(yearTab),
      부서명: '', 특검검진일: '', 일검검진일: '',
      배치전검진일: '', 배치후검진일: '', 비고: '',
    };
    _TYPES.forEach(tp => {
      for (let i = 1; i <= _COUNT; i++) {
        row[`${tp}_${i}_판정`] = '';
        row[`${tp}_${i}_소견`] = '';
      }
    });
    return row;
  };

  const downloadSogyeonTemplate = async () => {
    const XLSX = await import('xlsx');
    const headers: string[] = ['사번', '이름', '부서명', '특검검진일', '일검검진일', '배치전검진일', '배치후검진일'];
    _TYPES.forEach(tp => {
      for (let i = 1; i <= _COUNT; i++) headers.push(`${tp}_${i}_판정`, `${tp}_${i}_소견`);
    });
    headers.push('비고');
    const example: (string | number)[] = ['122080048', '홍길동', '개발팀', '2024-03-15', '2024-05-10', '', ''];
    _TYPES.forEach(() => { for (let i = 1; i <= _COUNT; i++) example.push('A', '이상없음'); });
    example.push('');
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(() => ({ wch: 13 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '건강소견');
    XLSX.writeFile(wb, `건강소견_${yearTab}_양식.xlsx`);
  };

  const addRow = () => {
    const newId = data.length > 0 ? Math.max(...data.map(r => r.id)) + 1 : 1;
    const blank = mkBlank(newId);
    onChange([...data, blank]);
    setEditId(newId); setEditRow({ ...blank });
  };

  const save = () => {
    if (!editRow) return;
    onChange(data.map(r => r.id === editRow.id ? editRow : r));
    setEditId(null); setEditRow(null);
  };

  const del = (id: number) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    onChange(data.filter(r => r.id !== id));
    setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const uploadFile = async (file: File) => {
    const XLSX = await import('xlsx');
    const buf  = await file.arrayBuffer();
    const wb   = XLSX.read(buf, { type: 'array', cellDates: true });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    const maxId = data.length > 0 ? Math.max(...data.map(r => r.id)) : 0;
    const parsed: SogyeonRow[] = rows
      .filter(r => String(r['사번'] ?? '').trim())
      .map((r, i) => {
        const row = mkBlank(maxId + i + 1);
        row.사번           = String(r['사번'] ?? '').trim();
        row.성명           = String(r['이름'] ?? '').trim();
        row.부서명         = String(r['부서명'] ?? '').trim();
        row.특검검진일     = fmtDate(r['특검검진일']);
        row.일검검진일     = fmtDate(r['일검검진일']);
        row.배치전검진일   = fmtDate(r['배치전검진일']);
        row.배치후검진일   = fmtDate(r['배치후검진일']);
        row.비고           = String(r['비고'] ?? '').trim();
        _TYPES.forEach(tp => {
          for (let j = 1; j <= _COUNT; j++) {
            row[`${tp}_${j}_판정`] = String(r[`${tp}_${j}_판정`] ?? '').trim();
            row[`${tp}_${j}_소견`] = String(r[`${tp}_${j}_소견`] ?? '').trim();
          }
        });
        return row;
      });
    const kept = data.filter(r => String(r.year) !== String(yearTab));
    onChange([...kept, ...parsed]);
  };

  const TH:  React.CSSProperties = { padding: '4px 5px', fontSize: '11px', fontWeight: 600, color: '#374151', background: '#f9fafb', border: '1px solid #e5e7eb', whiteSpace: 'nowrap', textAlign: 'center' };
  const TD:  React.CSSProperties = { padding: '3px 5px', fontSize: '12px', color: '#374151', whiteSpace: 'nowrap', border: '1px solid #f3f4f6' };
  const iSt: React.CSSProperties = { border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', fontFamily: 'inherit' };

  return (
    <div>
      <div style={{ padding: '4px 0 10px', fontSize: '13px', color: '#6b7280' }}>
        검진유형별 판정·소견을 연도별로 입력하세요.{' '}
        <strong>건강상담 탭 → 검진 소견</strong>에 사번 기준으로 자동 연동됩니다.
      </div>

      {/* 연도 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '14px' }}>
        {YEARS5.map(y => {
          const cnt = data.filter(r => String(r.year) === String(y)).length;
          return (
            <button key={y} onClick={() => setYearTab(y)} style={{
              padding: '7px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: yearTab === y ? 700 : 400,
              color: yearTab === y ? '#7c3aed' : '#6b7280',
              borderBottom: yearTab === y ? '2px solid #7c3aed' : '2px solid transparent',
              marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              {y}년
              <span style={{
                fontSize: '11px',
                background: cnt > 0 ? '#f5f3ff' : '#f3f4f6',
                color: cnt > 0 ? '#7c3aed' : '#9ca3af',
                padding: '1px 5px', borderRadius: '4px',
              }}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* 툴바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="이름/사번 검색..."
            style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', outline: 'none', width: '200px' }}
          />
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>{yearTab}년 {filtered.length}건</span>
          {selectedCount > 0 && (
            <span style={{ fontSize: '13px', fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '2px 10px', borderRadius: '5px' }}>
              {selectedCount}명 선택됨
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {selectedCount > 0 && (
            <button onClick={downloadSelected} style={{ padding: '7px 14px', background: '#0369a1', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontWeight: 700 }}>
              배치전검진 선택 다운로드 ({selectedCount}명)
            </button>
          )}
          <button onClick={downloadSogyeonTemplate} style={{ padding: '7px 14px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
            {yearTab}년 양식 다운로드
          </button>
          <label style={{ padding: '7px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
            {yearTab}년 파일 업로드
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />
          </label>
          <button onClick={addRow} style={{ padding: '7px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
            + 행 추가
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'auto', maxHeight: '500px' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'auto' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ ...TH, width: '32px' }} rowSpan={2}>
                <input
                  type="checkbox"
                  ref={allCheckRef}
                  checked={allSelected}
                  onChange={toggleAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ ...TH, width: '36px' }} rowSpan={2}>No</th>
              <th style={{ ...TH, width: '90px' }} rowSpan={2}>사번</th>
              <th style={{ ...TH, width: '64px' }} rowSpan={2}>성명</th>
              <th style={{ ...TH, width: '64px' }} rowSpan={2}>부서명</th>
              {_TYPES.map(tp => (
                <th key={tp} colSpan={1 + _COUNT * 2} style={{ ...TH, background: TYPE_BG[tp] }}>{tp}</th>
              ))}
              <th style={{ ...TH, width: '60px' }} rowSpan={2}>비고</th>
              <th style={{ ...TH, width: '80px' }} rowSpan={2}>관리</th>
            </tr>
            <tr>
              {_TYPES.map(tp => (
                <React.Fragment key={tp}>
                  <th style={{ ...TH, width: '82px', background: TYPE_BG[tp] }}>검진일</th>
                  {Array.from({ length: _COUNT }, (_, i) => (
                    <React.Fragment key={i}>
                      <th style={{ ...TH, width: '38px', background: TYPE_BG[tp] }}>판{i + 1}</th>
                      <th style={{ ...TH, width: '90px', background: TYPE_BG[tp] }}>소견{i + 1}</th>
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.map((row, idx) => (
              <tr
                key={row.id}
                style={{ background: selectedIds.includes(row.id) ? '#eff6ff' : idx % 2 === 0 ? '#fff' : '#fafafa' }}
              >
                <td style={{ ...TD, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={{ ...TD, textAlign: 'center', color: '#9ca3af' }}>{idx + 1}</td>

                {editId === row.id ? (
                  <>
                    {(['사번', '성명', '부서명'] as const).map(k => (
                      <td key={k} style={TD}>
                        <input value={String(editRow?.[k] ?? '')}
                          onChange={e => setEditRow(p => p ? { ...p, [k]: e.target.value } : p)}
                          style={{ ...iSt, width: '72px' }} />
                      </td>
                    ))}
                    {_TYPES.map(tp => (
                      <React.Fragment key={tp}>
                        <td style={{ ...TD, background: TYPE_BG[tp] }}>
                          <input value={String(editRow?.[_DATE_KEYS[tp]] ?? '')}
                            onChange={e => setEditRow(p => p ? { ...p, [_DATE_KEYS[tp]]: e.target.value } : p)}
                            style={{ ...iSt, width: '80px' }} />
                        </td>
                        {Array.from({ length: _COUNT }, (_, i) => (
                          <React.Fragment key={i}>
                            <td style={{ ...TD, background: TYPE_BG[tp] }}>
                              <input value={String(editRow?.[`${tp}_${i + 1}_판정`] ?? '')}
                                onChange={e => setEditRow(p => p ? { ...p, [`${tp}_${i + 1}_판정`]: e.target.value } : p)}
                                style={{ ...iSt, width: '36px' }} />
                            </td>
                            <td style={{ ...TD, background: TYPE_BG[tp] }}>
                              <input value={String(editRow?.[`${tp}_${i + 1}_소견`] ?? '')}
                                onChange={e => setEditRow(p => p ? { ...p, [`${tp}_${i + 1}_소견`]: e.target.value } : p)}
                                style={{ ...iSt, width: '88px' }} />
                            </td>
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))}
                    <td style={TD}>
                      <input value={String(editRow?.비고 ?? '')}
                        onChange={e => setEditRow(p => p ? { ...p, 비고: e.target.value } : p)}
                        style={{ ...iSt, width: '58px' }} />
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={save} style={{ padding: '3px 8px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>저장</button>
                        <button onClick={() => { setEditId(null); setEditRow(null); }} style={{ padding: '3px 8px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>취소</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={TD}>{row.사번 || '-'}</td>
                    <td style={{ ...TD, fontWeight: 600 }}>{row.성명 || '-'}</td>
                    <td style={TD}>{row.부서명 || '-'}</td>
                    {_TYPES.map(tp => (
                      <React.Fragment key={tp}>
                        <td style={{ ...TD, background: TYPE_BG[tp] }}>{fmtDate(row[_DATE_KEYS[tp]])}</td>
                        {Array.from({ length: _COUNT }, (_, i) => {
                          const 판정 = String(row[`${tp}_${i + 1}_판정`] ?? '');
                          const 소견 = String(row[`${tp}_${i + 1}_소견`] ?? '');
                          return (
                            <React.Fragment key={i}>
                              <td style={{ ...TD, textAlign: 'center', background: TYPE_BG[tp], fontWeight: 700, color: 판정Color(판정) }}>
                                {판정 || '-'}
                              </td>
                              <td style={{ ...TD, background: TYPE_BG[tp] }}>{소견 || '-'}</td>
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    <td style={TD}>{row.비고 || '-'}</td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => { setEditId(row.id); setEditRow({ ...row }); }}
                          style={{ padding: '3px 8px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>수정</button>
                        <button onClick={() => del(row.id)}
                          style={{ padding: '3px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>삭제</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5 + _TYPES.length * (1 + _COUNT * 2) + 2}
                  style={{ ...TD, textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
                  {yearTab}년 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}



/* ══ ExamDataTab ══ */
function ExamDataTab({ data, onChange }: { data: Row[]; onChange: (d: Row[]) => void }) {
  const YEARS5 = useMemo(() => get5Years(), []);
  const FIELDS = [
    { key:'SBP', label:'수축기BP' }, { key:'DBP', label:'이완기BP' }, { key:'GLU', label:'공복혈당' },
    { key:'HBA1C', label:'당화혈색소' }, { key:'HEIGHT', label:'신장' }, { key:'WEIGHT', label:'체중' },
    { key:'BMI', label:'BMI' }, { key:'WAIST', label:'복부둘레' }, { key:'TC', label:'TC' },
    { key:'HDL', label:'HDL-Chol' }, { key:'TG', label:'TG' }, { key:'LDL', label:'LDL-Chol' },
    { key:'GOT', label:'GOT/AST' }, { key:'GPT', label:'GPT/ALT' }, { key:'GTP', label:'γ-GTP' },
    { key:'CRE', label:'크레아티닌' }, { key:'GFR', label:'GFR' }, { key:'PROT', label:'단백뇨' },
    { key:'XRAY', label:'X-RAY' }, { key:'BLOOD', label:'기타혈액검사' }, { key:'FVC', label:'FVC%' },
    { key:'FEV1', label:'FEV1%' }, { key:'FEVR', label:'FEV1/FVC%' }, { key:'NOISE', label:'소음' },
    { key:'ECG', label:'심전도' }, { key:'SLEEP', label:'수면장애' }, { key:'GASTRIC', label:'위장장애' },
    { key:'ETC', label:'기타' }, { key:'BRTYPE', label:'뇌심혈관질환발병위험도' },
    { key:'SMOKE', label:'흡연' }, { key:'DRINK', label:'음주' }, { key:'EXERCISE', label:'신체활동' },
    { key:'FAMILY', label:'가족력' }, { key:'HISTORY', label:'과거및현병력' }, { key:'비고', label:'비고' },
  ];
  const [yearTab, setYearTab] = useState<number>(YEARS5[0]);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<number|null>(null);
  const [editRow, setEditRow] = useState<Row|null>(null);
  const yearData = useMemo(() => data.filter(r => String(r['year']) === String(yearTab)), [data, yearTab]);
  const filtered = useMemo(() => {
    if (!search) return yearData;
    const q = search.toLowerCase();
    return yearData.filter(r => String(r['성명']??'').toLowerCase().includes(q) || String(r['사번']??'').includes(q));
  }, [yearData, search]);
  const addRow = () => {
    const newId = data.length > 0 ? Math.max(...data.map(r => Number(r.id))) + 1 : 1;
    const blank: Row = { id: newId, 사번: '', 성명: '', year: String(yearTab) };
    FIELDS.forEach(f => { blank[f.key] = ''; });
    onChange([...data, blank]); setEditId(newId); setEditRow({...blank});
  };
  const save = () => {
    if (!editRow) return;
    onChange(data.map(r => Number(r.id) === Number(editRow.id) ? editRow : r));
    setEditId(null); setEditRow(null);
  };
  const del = (id: number) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    onChange(data.filter(r => Number(r.id) !== id));
  };
  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const headers = ['사번','성명','검진년도','수축기BP','이완기BP','공복혈당','당화혈색소','신장','체중','BMI','복부둘레','TC','HDL-Chol','TG','LDL-Chol','GOT/AST','GPT/ALT','γ-GTP','크레아티닌','GFR','단백뇨','X-RAY','기타혈액검사','FVC%','FEV1%','FEV1/FVC%','소음','심전도','수면장애','위장장애','기타','뇌심혈관질환발병위험도','흡연','음주','신체활동','가족력','과거및현병력','비고'];
    const example = ['122080048','홍길동',String(yearTab),'118','76','92','5.4','168','72','25.5','82','185','52','120','110','28','25','18','0.9','82','음성','정상','정상','95','78','82','정상','정상','양호','없음','없음','해당없음','비흡연','음주없음','주 3회 유산소','고혈압(부)','없음',''];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(() => ({ wch: 11 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '검진수치');
    XLSX.writeFile(wb, `검진수치_${yearTab}_양식.xlsx`);
  };
  const uploadFile = async (file: File) => {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    const maxId = data.length > 0 ? Math.max(...data.map(r => Number(r.id))) : 0;
    const thisYear = data.filter(r => String(r['year']) === String(yearTab));
    const otherYear = data.filter(r => String(r['year']) !== String(yearTab));
    let nextId = maxId + 1;
    const updatedMap = new Map(thisYear.map(row => [row['사번'], { ...row }]));
    rows.filter(r => String(r['사번']??'').trim()).forEach(r => {
      const 사번 = String(r['사번']).trim();
      if (updatedMap.has(사번)) {
        const existing = updatedMap.get(사번)!;
        FIELDS.forEach(f => { const v = String(r[f.label] ?? r[f.key] ?? '').trim(); if (v) existing[f.key] = v; });
        if (String(r['성명']??'').trim()) existing['성명'] = String(r['성명']).trim();
      } else {
        const row: Row = { id: nextId++, 사번, 성명: String(r['성명']??'').trim(), year: String(yearTab) };
        FIELDS.forEach(f => { row[f.key] = String(r[f.label] ?? r[f.key] ?? '').trim(); });
        updatedMap.set(사번, row);
      }
    });
    onChange([...otherYear, ...Array.from(updatedMap.values())]);
  };
  const TH: React.CSSProperties = { padding: '8px 10px', fontSize: '13px', fontWeight: 600, color: '#374151', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', textAlign: 'left' };
  const TD: React.CSSProperties = { padding: '7px 10px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap', borderBottom: '1px solid #f3f4f6' };
  const iSt: React.CSSProperties = { border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', fontFamily: 'inherit' };
  const RH: React.CSSProperties = { position:'absolute', right:0, top:0, bottom:0, width:'5px', cursor:'col-resize' };
  const { widths: cw, handle } = useColResize([40, 90, 80, ...FIELDS.map(() => 80), 80]);
  return (
    <div>
      <div style={{ padding: '4px 0 10px', fontSize: '13px', color: '#6b7280' }}>혈액·폐기능 수치를 연도별로 입력하세요. <strong>건강상담 탭 → 검사 결과</strong>에 사번 기준으로 자동 연동됩니다.</div>
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '14px' }}>
        {YEARS5.map(y => {
          const cnt = data.filter(r => String(r['year']) === String(y)).length;
          return <button key={y} onClick={() => setYearTab(y)} style={{ padding: '7px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: yearTab===y?700:400, color: yearTab===y?'#0369a1':'#6b7280', borderBottom: yearTab===y?'2px solid #0369a1':'2px solid transparent', marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '5px' }}>{y}년<span style={{ fontSize: '11px', background: cnt>0?'#e0f2fe':'#f3f4f6', color: cnt>0?'#0369a1':'#9ca3af', padding: '1px 5px', borderRadius: '4px' }}>{cnt}</span></button>;
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름/사번 검색..." style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', outline: 'none', width: '200px' }} />
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>{yearTab}년 {filtered.length}건</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={downloadTemplate} style={{ padding: '7px 14px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>{yearTab}년 양식 다운로드</button>
          <label style={{ padding: '7px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>{yearTab}년 파일 업로드<input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }}/></label>
          <button onClick={addRow} style={{ padding: '7px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>+ 행 추가</button>
          <button onClick={() => { if (yearData.length===0){alert('삭제할 데이터가 없습니다.');return;} if(!window.confirm(`${yearTab}년 ${yearData.length}건을 전체 삭제하시겠습니까?`))return; onChange(data.filter(r=>String(r.year)!==String(yearTab))); }} style={{ padding: '7px 14px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>{yearTab}년 전체 삭제</button>
        </div>
      </div>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'auto', maxHeight: '500px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={{ ...TH, textAlign:'center', width: cw[0], position:'relative' }}>No<div onMouseDown={handle(0)} style={RH}/></th>
              <th style={{ ...TH, width: cw[1], position:'relative' }}>사번<div onMouseDown={handle(1)} style={RH}/></th>
              <th style={{ ...TH, width: cw[2], position:'relative' }}>성명<div onMouseDown={handle(2)} style={RH}/></th>
              {FIELDS.map((f, i) => <th key={f.key} style={{ ...TH, width: cw[3+i], position:'relative' }}>{f.label}<div onMouseDown={handle(3+i)} style={RH}/></th>)}
              <th style={{ ...TH, textAlign:'center', width: cw[3+FIELDS.length], position:'relative' }}>관리<div onMouseDown={handle(3+FIELDS.length)} style={RH}/></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={Number(row.id)} style={{ background: i%2===0?'#fff':'#fafafa' }}>
                <td style={{ ...TD, textAlign:'center', color:'#9ca3af' }}>{i+1}</td>
                {editId === Number(row.id) ? (
                  <>
                    {(['사번','성명',...FIELDS.map(f=>f.key)]).map(k => <td key={k} style={TD}><input value={String(editRow?.[k]??'')} onChange={e => setEditRow(p => p ? {...p,[k]:e.target.value} : p)} style={{ ...iSt, width: k==='비고'?'130px':'72px' }}/></td>)}
                    <td style={{ ...TD, textAlign:'center' }}><div style={{ display:'flex', gap:'4px' }}><button onClick={save} style={{ padding:'3px 8px', background:'#16a34a', color:'#fff', border:'none', borderRadius:'4px', fontSize:'12px', cursor:'pointer' }}>저장</button><button onClick={() => { setEditId(null); setEditRow(null); }} style={{ padding:'3px 8px', background:'#f3f4f6', color:'#374151', border:'none', borderRadius:'4px', fontSize:'12px', cursor:'pointer' }}>취소</button></div></td>
                  </>
                ) : (
                  <>
                    <td style={TD}>{st(row['사번'])||'-'}</td>
                    <td style={{ ...TD, fontWeight:600 }}>{st(row['성명'])||'-'}</td>
                    {FIELDS.map(f => <td key={f.key} style={TD}>{st(row[f.key])||'-'}</td>)}
                    <td style={{ ...TD, textAlign:'center' }}><div style={{ display:'flex', gap:'4px' }}><button onClick={() => { setEditId(Number(row.id)); setEditRow({...row}); }} style={{ padding:'3px 8px', background:'#dbeafe', color:'#1e40af', border:'none', borderRadius:'4px', fontSize:'12px', cursor:'pointer' }}>수정</button><button onClick={() => del(Number(row.id))} style={{ padding:'3px 8px', background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:'4px', fontSize:'12px', cursor:'pointer' }}>삭제</button></div></td>
                  </>
                )}
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={FIELDS.length+4} style={{ ...TD, textAlign:'center', color:'#9ca3af', padding:'40px' }}>{yearTab}년 데이터가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══ 메인 컴포넌트 ══ */
export default function HealthConsultationPage({
  view,
  selectedConsultId,
  selectedConsultSa,
}: {
  view?: string;
  selectedConsultId?: number | null;
  selectedConsultSa?: string;
}) {

  const YEARS = useMemo(() => get5Years().sort((a, b) => b - a), []);
  const [pageTab, setPageTab] = useState<'건강상담'|'검진수치'|'검진소견'>('건강상담');
  const [isExamUnlocked, setIsExamUnlocked] = useState(false);
  const [showPwModal,    setShowPwModal]    = useState(false);
const [subView, setSubView] = useState<'stats' | 'consult'>(
  view === 'health-opinion-stats' ? 'stats' : 'consult'
);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState('');
  const [search, setSearch] = useState('');
  const [selSa, setSelSa] = useState('');
  const [dupIn, setDupIn] = useState<Record<string,string>>({});
  const [listWidth, setListWidth] = useState(160);
  const [statBreakdownTab, setStatBreakdownTab] = useState<'부서'|'공정'|'성별'|'근무지'>('부서');
const [bdOpen, setBdOpen] = useState(false);
const [cnOpen, setCnOpen] = useState(false);
  const dragRef = useRef<{ dragging: boolean; startX: number; startW: number }>({ dragging: false, startX: 0, startW: 160 });
  const { widths: empW, handle: empH } = useColResize([90, 140, 55, 130, 55, 80, 55, 110, 55, 110]);
  const RH2: React.CSSProperties = { position:'absolute', right:0, top:0, bottom:0, width:'5px', cursor:'col-resize', zIndex:1 };
  const [consults, setConsults] = useState<Consult[]>([]);
  const [curId, setCurId] = useState<number|null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Consult>>({});
  const [empDB, setEmpDB] = useState<Row[]>([]);
  const [examDB, setExamDB] = useState<Row[]>([]);
  const [manualMode,     setManualMode]     = useState(false);
const [manualInput,    setManualInput]    = useState({ 사번: '', 성명: '', 소속: '', 성별: '' });
const [manualEmpData,  setManualEmpData]  = useState<Row | null>(null);
  const [sogyeonDB, setSogyeonDB] = useState<SogyeonRow[]>([]);

  useEffect(() => {
  setEmpDB(ld('hc_인명부', []));
  setExamDB(ld('hc_검진수치', []));
  setSogyeonDB(ld('hc_con_sogyeon', []));
  setConsults(ld('hc_con_records', []));
}, []);
useEffect(() => {
  if (!selectedConsultId || !selectedConsultSa) return;
  if (consults.length === 0) return;

  const target = consults.find(
    c => c.id === selectedConsultId && c.사번 === selectedConsultSa
  );

  if (!target) return;

  setSubView('consult');
  setPageTab('건강상담');
  setSelSa(target.사번);
  setCurId(target.id);
  setEditing(false);
  setSearch('');
  setDupIn({});
  setManualMode(false);
}, [selectedConsultId, selectedConsultSa, consults]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const delta = e.clientX - dragRef.current.startX;
      setListWidth(Math.max(120, Math.min(420, dragRef.current.startW + delta)));
    };
    const onUp = () => { dragRef.current.dragging = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  const saveConsults = (list: Consult[]) => { setConsults(list); sv('hc_con_records', list); };
  const handleExam = (d: Row[]) => { setExamDB(d); sv('hc_검진수치', d); };
  const handleSogyeon = (d: SogyeonRow[]) => { setSogyeonDB(d); sv('hc_con_sogyeon', d); };

  const active = useMemo(() => empDB.filter(r => !st(r['직원구분']).includes('퇴직') && !st(r['직원구분']).includes('퇴사')), [empDB]);
  const nmCnt = useMemo(() => { const m: Record<string,number> = {}; active.forEach(r => { const nm = st(r['성명']); m[nm] = (m[nm]||0)+1; }); return m; }, [active]);
  const results = useMemo(() => { const q = search.trim().toLowerCase(); if (!q) return []; return active.filter(r => st(r['성명']).toLowerCase().includes(q) || st(r['사번']).includes(q)); }, [active, search]);
  const selEmp = useMemo(() => {
  if (manualEmpData && st(manualEmpData['사번']) === selSa) return manualEmpData;
  return active.find(r => st(r['사번']) === selSa) ?? null;
}, [active, selSa, manualEmpData]);
  const examByYear = useMemo(() => { const m: Record<string, Row> = {}; examDB.filter(r => st(r['사번']).trim() === selSa).forEach(r => { m[st(r['year'])] = r; }); return m; }, [examDB, selSa]);
  const examRows = useMemo(() => Object.values(examByYear).sort((a, b) => st(a['year']).localeCompare(st(b['year']))), [examByYear]);
  const latestExam = useMemo(() => { if (!examRows.length) return null; return [...examRows].sort((a,b) => st(b['year']).localeCompare(st(a['year'])))[0]; }, [examRows]);
  const 특검유해인자 = useMemo(() => {
    if (!selSa) return '';
    try {
      const db: Row[] = JSON.parse(localStorage.getItem('hc_특검') || '[]');
      const rows = db.filter(r => st(r['사번']).trim() === selSa.trim());
      return [...new Set(rows.map(r => st(r['유해인자']).trim()).filter(v => v && v !== '-'))].join(', ');
    } catch { return ''; }
  }, [selSa]);
  const autoEmpVal = (field: string, examKey: string): string => { const v = latestExam ? st(latestExam[examKey]) : ''; return v && v !== '-' ? v : ''; };
  const pConsults = useMemo(() => consults.filter(c => c.사번 === selSa).sort((a,b) => b.상담일.localeCompare(a.상담일)), [consults, selSa]);
  const curC = useMemo(() => curId !== null ? consults.find(c => c.id === curId) ?? null : null, [consults, curId]);

  const pick = (sa: string) => {
  setSelSa(sa); setCurId(null); setEditing(false);
  setSearch(''); setDupIn({});
  setManualEmpData(null); setManualMode(false);
};


const pickManual = () => {
  const nm = manualInput.성명.trim();
  if (!nm) { alert('성명을 입력해주세요.'); return; }
  const sa = manualInput.사번.trim() || `GUEST_${Date.now()}`;
  const emp: Row = {
    id: -1, 사번: sa, 성명: nm,
    소속: manualInput.소속, 부서: manualInput.소속,
    성별: manualInput.성별,
    생년월일: '', 입사일: '', 공정명: '', 근무지: '',
    야간: '', 음주: '', 흡연: '', 유해인자: '',
    직원구분: '명단외',
  };
  setManualEmpData(emp);
  setSelSa(sa);
  setManualMode(false);
  setManualInput({ 사번: '', 성명: '', 소속: '', 성별: '' });
  setSearch(''); setCurId(null); setDupIn({});
  // 바로 새 상담 작성 모드 진입
  setDraft({
    사번: sa, 성명: nm, 상담일: todayStr(), 상담장소: '보건실', 상담자: '',
    방문: false, 전화: false, 추후상담: false, 추후진료: false,
    음주: '-', 흡연: '-', 가족력: '-', 운동: '-', 약물치료: '',
    유해인자: '', 야간근무: '', 근무위치: '', cell: {}, 상담내용: '', 약품기록: {},
  });
  setEditing(true);
};
  const newC = () => {
    if (!selEmp) return;
    setDraft({ 사번: st(selEmp['사번']), 성명: st(selEmp['성명']), 상담일: todayStr(), 상담장소: '보건실', 상담자: '', 방문: false, 전화: false, 추후상담: false, 추후진료: false, 음주: st(selEmp['음주'])||'-', 흡연: st(selEmp['흡연'])||'-', 가족력: '-', 운동: '-', 약물치료: consults.filter(c => c.사번 === st(selEmp['사번'])).sort((a,b) => b.상담일.localeCompare(a.상담일))[0]?.약물치료 ?? '', 유해인자: st(selEmp['유해인자'])||'', 야간근무: st(selEmp['근무'])||'', 근무위치: st(selEmp['근무지'])||'', cell: {}, 상담내용: '', 약품기록: {}, });
    setCurId(null); setEditing(true);
  };
  const editC = (c: Consult) => { setDraft({...c, cell:{...c.cell}}); setCurId(c.id); setEditing(true); };
  const saveC = () => {
    if (!draft.사번 || !draft.상담일) return;
    if (curId !== null) { saveConsults(consults.map(c => c.id === curId ? {...c,...draft} as Consult : c)); }
    else { const nid = consults.length > 0 ? Math.max(...consults.map(c => c.id)) + 1 : 1; saveConsults([...consults, {...draft, id: nid} as Consult]); setCurId(nid); }
    setEditing(false);
  };
  const delC = (id: number) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    saveConsults(consults.filter(c => c.id !== id));
    if (curId === id) setCurId(null);
  };

  const src = () => (editing ? draft : curC) as Record<string,unknown>|null;
  const dv = (k: string): string => st(src()?.[k] ?? '');
  const db = (k: string): boolean => Boolean(src()?.[k]);
  const uv = (k: string, v: string) => setDraft(p => ({...p, [k]: v}));
  const ub = (k: string, v: boolean) => setDraft(p => ({...p, [k]: v}));
  const setCell = (k: string, v: string) => setDraft(p => ({...p, cell: {...(p.cell??{}), [k]: v}}));
  const getCell = (k: string): string => editing ? (draft.cell?.[k]??'') : (curC?.cell?.[k]??'');

  const makeConsultSummary = (c: any) => {
    const text = String(c?.상담내용||'').replace(/\s+/g,' ').trim();
    const follow = [c?.추후상담?'추후상담':'', c?.추후진료?'추후진료':''].filter(Boolean).join(', ');
    if (!text && !follow) return '내용 없음';
    const keywords: string[] = [];
      const 약품기록 = c?.약품기록 as Record<string,number>|undefined;
  if (약품기록 && Object.keys(약품기록).length > 0) {
    const allItems = ld<BogunsilItem[]>('hc_boguns_items', DEFAULT_BOGUNS_ITEMS);
    const names = Object.entries(약품기록)
      .filter(([,cnt]) => Number(cnt) > 0)
      .map(([id]) => allItems.find(i=>i.id===id)?.name ?? '')
      .filter(Boolean).slice(0, 2);
    if (names.length) keywords.push(names.join(' · ') + ' 지급');
  }

  if (!text && !follow && keywords.length===0) return '내용 없음';
    if (/혈압|고혈압/.test(text)) keywords.push('혈압 상담');
    if (/혈당|당뇨/.test(text)) keywords.push('혈당 관리');
    if (/지질|콜레스테롤/.test(text)) keywords.push('지질 관리');
    if (/간기능|AST|ALT|γ-GTP/.test(text)) keywords.push('간기능 상담');
    if (/체중|비만|BMI/.test(text)) keywords.push('체중 관리');
    if (/금연|흡연/.test(text)) keywords.push('금연 지도');
    if (/음주|절주/.test(text)) keywords.push('절주 상담');
    if (/근골격|허리|목|어깨|통증/.test(text)) keywords.push('근골격계 상담');
    const uniq = Array.from(new Set(keywords)).slice(0, 2);
    if (uniq.length > 0) return follow ? `${uniq.join(', ')} · ${follow}` : uniq.join(', ');
    const first = text.split(/[.!?\n]/).map(v => v.trim()).filter(Boolean)[0];
    if (first) return first.length > 28 ? `${first.slice(0,28)}...` : first;
    return follow || '내용 없음';
  };

  const C = {
    pageBg:'#f8fafc', cardBg:'#ffffff', border:'#e5e7eb', text:'#111827', sub:'#6b7280',
    greenBg:'#f0fdf4', greenText:'#166534',
  };
  const sectionTitle = (bg: string, color: string): React.CSSProperties => ({ background:bg, color, padding:'10px 14px', fontSize:'13px', fontWeight:700, borderBottom:`1px solid ${C.border}` });
  const TH: React.CSSProperties = { border:`1px solid ${C.border}`, padding:'7px 8px', fontSize:'12px', fontWeight:600, background:'#f9fafb', color:'#374151', textAlign:'center', whiteSpace:'normal', wordBreak:'keep-all', lineHeight:1.4, verticalAlign:'middle' };
  const TD: React.CSSProperties = { border:`1px solid ${C.border}`, padding:'7px 8px', fontSize:'13px', color:'#111827', verticalAlign:'middle', background:'#fff', whiteSpace:'normal', wordBreak:'break-word', lineHeight:1.5 };
  const iSt: React.CSSProperties = { border:'1px solid #dbeafe', outline:'none', background:'#f8fbff', fontSize:'13px', fontFamily:'inherit', width:'100%', padding:'6px 8px', borderRadius:'8px', boxSizing:'border-box' };
  const Txt = ({ fk }: { fk: string }) => editing ? <input value={dv(fk)} onChange={e => uv(fk, e.target.value)} style={iSt}/> : <span style={{ fontSize:'13px' }}>{dv(fk)||'-'}</span>;
  const Cell = ({ ck, center }: { ck: string; center?: boolean }) => editing ? <input value={getCell(ck)} onChange={e => setCell(ck, e.target.value)} style={{ ...iSt, textAlign:center?'center':'left', width:center?'54px':'100%' }}/> : <span style={{ fontSize:'12px' }}>{getCell(ck)||''}</span>;
  const display = src();

  /* ★★★ 통계 뷰 — HealthConsultationPage 안에 올바르게 위치 ★★★ */
 if (subView === 'stats') {
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthConsults = consults.filter(c => (c.상담일??'').startsWith(currentYM));
  const totalConsults = monthConsults.length;
  const uniqueEmp = new Set(monthConsults.map(c => c.사번)).size;

  const lastConsultMap: Record<string, Consult> = {};
  consults.forEach(c => {
    if (!lastConsultMap[c.사번] || c.상담일 > lastConsultMap[c.사번].상담일)
      lastConsultMap[c.사번] = c;
  });
  const followUpPeople = Object.values(lastConsultMap)
    .filter(c => c.추후상담 || c.추후진료)
    .sort((a, b) => b.상담일.localeCompare(a.상담일));
  const followUp = followUpPeople.length;

  // ── 검진 판정 처리 ──────────────────────────────────────────
  const JRANK: Record<string, number> = { R:10, DN:9, D2:8, D1:7, CN:6, C2:5, C1:4, C:3, B:2, A:1 };
  const JCODES = ['C1','C2','CN','D1','D2','DN'];
  type BKey = '부서'|'공정'|'성별'|'근무지';
  type PJ = { 사번:string; 성명:string; year:string; worst:string; 부서:string; 공정:string; 성별:string; 근무지:string; };

  const pjMap: Record<string, PJ> = {};
  sogyeonDB.forEach(row => {
    const sa = String(row.사번??'').trim();
    if (!sa) return;
    const emp = active.find(e => st(e['사번']) === sa);
    const judgs: string[] = [];
    ['정기특검','일반검진','배치전검진','배치후검진'].forEach(tp => {
      for (let i = 1; i <= 5; i++) {
        const v = String(row[`${tp}_${i}_판정`]??'').trim().toUpperCase();
        if (v && v !== '-') judgs.push(v);
      }
    });
    const worst = [...new Set(judgs)].reduce((w, j) => (JRANK[j]??0) > (JRANK[w]??0) ? j : w, '');
    if (!pjMap[sa] || String(row.year) > pjMap[sa].year) {
      pjMap[sa] = {
        사번: sa, 성명: row.성명, year: String(row.year), worst,
        부서: st(emp?.['소속'] ?? emp?.['부서'] ?? row.부서명 ?? '-') || '-',
        공정: st(emp?.['공정명'] ?? '-') || '-',
        성별: st(emp?.['성별'] ?? '-') || '-',
        근무지: st(emp?.['근무지'] ?? '-') || '-',
      };
    }
  });

  const pjList = Object.values(pjMap);
  const totalExamined = pjList.length;
  const 요관찰자Cnt = pjList.filter(p => ['C1','C2','CN'].includes(p.worst)).length;
  const 유소견자Cnt = pjList.filter(p => ['D1','D2','DN'].includes(p.worst)).length;
  const jCounts: Record<string, number> = Object.fromEntries(JCODES.map(c => [c, 0]));
  pjList.forEach(p => { if (JCODES.includes(p.worst)) jCounts[p.worst]++; });

  const buildBD = (key: BKey): [string, Record<string, number>][] => {
    const map: Record<string, Record<string, number>> = {};
    pjList.forEach(p => {
      const cat = p[key] || '-';
      if (!map[cat]) { map[cat] = { total: 0 }; JCODES.forEach(c => { map[cat][c] = 0; }); }
      map[cat].total++;
      if (JCODES.includes(p.worst)) map[cat][p.worst]++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  };
  const bdData = buildBD(statBreakdownTab);

  const 상담필요자 = pjList
    .filter(p => ['C1','D1','D2','DN'].includes(p.worst))
    .map(p => {
      const cs = consults.filter(c => c.사번 === p.사번).sort((a, b) => b.상담일.localeCompare(a.상담일));
      return { ...p, done: cs.length > 0, lastDate: cs[0]?.상담일 ?? '', cnt: cs.length };
    })
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (JRANK[b.worst]??0) - (JRANK[a.worst]??0);
    });

  // ── 기존 상담 통계 ──────────────────────────────────────────
  const deptMap: Record<string, number> = {};
  consults.forEach(c => {
    const emp = empDB.find(e => st(e['사번']) === c.사번);
    const d = st(emp?.['소속'] ?? emp?.['부서'] ?? '미상') || '미상';
    deptMap[d] = (deptMap[d] || 0) + 1;
  });
  const deptList = Object.entries(deptMap).sort((a, b) => b[1] - a[1]);
  const maxDept = deptList[0]?.[1] || 1;
  const monthMap: Record<string, number> = {};
  consults.forEach(c => { const m = c.상담일?.slice(0, 7) || '미상'; monthMap[m] = (monthMap[m] || 0) + 1; });
  const monthList = Object.entries(monthMap).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12).reverse();
  const maxMonth = Math.max(...monthList.map(x => x[1]), 1);
  const empMap2: Record<string, { 성명:string; 사번:string; 부서:string; cnt:number; last:string; followUp:number }> = {};
  monthConsults.forEach(c => {
    if (!empMap2[c.사번]) {
      const emp = empDB.find(e => st(e['사번']) === c.사번);
      empMap2[c.사번] = { 성명: c.성명, 사번: c.사번, 부서: st(emp?.['소속'] ?? emp?.['부서'] ?? '-'), cnt: 0, last: '', followUp: 0 };
    }
    empMap2[c.사번].cnt++;
    if (!empMap2[c.사번].last || c.상담일 > empMap2[c.사번].last) empMap2[c.사번].last = c.상담일;
    if (c.추후상담 || c.추후진료) empMap2[c.사번].followUp++;
  });
  const empList = Object.values(empMap2).sort((a, b) => b.cnt - a.cnt);

  const cardSt: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px 20px' };
  const jColor  = (j: string) => ['D1','D2','DN'].includes(j) ? '#dc2626' : ['C1','C2','CN'].includes(j) ? '#2563eb' : '#374151';
  const jBgCol  = (j: string) => ['D1','D2','DN'].includes(j) ? '#fef2f2' : ['C1','C2','CN'].includes(j) ? '#eff6ff' : '#f9fafb';

  return (
    <div style={{ padding:'20px 28px', background:'#f8fafc', minHeight:'100vh', fontFamily:'Pretendard,-apple-system,sans-serif' }}>

      {/* 헤더 */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
        <div>
          <div style={{ fontSize:'20px', fontWeight:800, color:'#111827', marginBottom:'4px' }}>건강상담 전체 통계</div>
          <div style={{ fontSize:'13px', color:'#6b7280' }}>건강관리실 상담 기록 전체 집계 현황입니다.</div>
        </div>
        <button onClick={() => setSubView('consult')} style={{ padding:'9px 18px', background:'#2563eb', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
          개인 상담 작성
        </button>
      </div>

      {/* ── 당월 KPI 3개 ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 2fr', gap:'12px', marginBottom:'20px' }}>
        <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'12px', padding:'18px 20px' }}>
          <div style={{ fontSize:'12px', color:'#6b7280', fontWeight:600, marginBottom:'2px' }}>총 상담 건수</div>
          <div style={{ fontSize:'11px', color:'#93c5fd', fontWeight:600, marginBottom:'10px' }}>{currentYM} 당월</div>
          <div style={{ fontSize:'28px', fontWeight:800, color:'#2563eb' }}>{totalConsults}건</div>
        </div>
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'12px', padding:'18px 20px' }}>
          <div style={{ fontSize:'12px', color:'#6b7280', fontWeight:600, marginBottom:'2px' }}>상담 대상자 수</div>
          <div style={{ fontSize:'11px', color:'#86efac', fontWeight:600, marginBottom:'10px' }}>{currentYM} 당월</div>
          <div style={{ fontSize:'28px', fontWeight:800, color:'#16a34a' }}>{uniqueEmp}명</div>
        </div>
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'12px', padding:'18px 20px' }}>
          <div style={{ display:'flex', alignItems:'stretch' }}>
            <div style={{ flexShrink:0, paddingRight:'20px', marginRight:'20px', borderRight: followUpPeople.length > 0 ? '1px solid #fecaca' : 'none' }}>
              <div style={{ fontSize:'12px', color:'#6b7280', fontWeight:600, marginBottom:'2px' }}>추후 관리 필요</div>
              <div style={{ fontSize:'11px', color:'#fca5a5', fontWeight:600, marginBottom:'10px' }}>누적 · 최근 상담 기준</div>
              <div style={{ fontSize:'28px', fontWeight:800, color:'#dc2626' }}>{followUp}건</div>
            </div>
            {followUpPeople.length > 0 && (
              <div style={{ flex:1, overflowY:'auto', maxHeight:'108px' }}>
                {followUpPeople.map((c, idx) => {
                  const tags = [c.추후상담 ? '추후상담' : '', c.추후진료 ? '추후진료' : ''].filter(Boolean);
                  const summary = makeConsultSummary(c);
                  return (
                    <div key={c.사번} style={{ display:'flex', gap:'8px', alignItems:'flex-start', paddingBottom:'8px', marginBottom: idx < followUpPeople.length - 1 ? '8px' : '0', borderBottom: idx < followUpPeople.length - 1 ? '1px solid #fee2e2' : 'none' }}>
                      <span style={{ fontWeight:700, color:'#991b1b', fontSize:'13px', whiteSpace:'nowrap', minWidth:'48px' }}>{c.성명}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'11px', color:'#9ca3af', marginBottom:'2px' }}>{c.상담일}</div>
                        <div style={{ fontSize:'11px', color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{summary}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'2px', flexShrink:0 }}>
                        {tags.map(tag => <span key={tag} style={{ fontSize:'10px', background:'#fee2e2', color:'#dc2626', padding:'1px 5px', borderRadius:'3px', fontWeight:600, whiteSpace:'nowrap' }}>{tag}</span>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 검진 판정 현황 ── */}
      <div style={{ ...cardSt, marginBottom:'16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
          <div style={{ fontSize:'14px', fontWeight:700, color:'#111827' }}>검진 판정 현황</div>
          <div style={{ fontSize:'12px', color:'#6b7280' }}>
            검진 인원 <strong>{totalExamined}명</strong> / 재직자 <strong>{active.length}명</strong> 기준 (최근 연도 소견)
          </div>
        </div>
        {totalExamined === 0 ? (
          <div style={{ padding:'24px 0', textAlign:'center', fontSize:'13px', color:'#9ca3af' }}>
            검진 소견 탭에서 데이터를 입력하면 판정 현황이 표시됩니다.
          </div>
        ) : (
          <>
            {/* C1/C2/CN/D1/D2/DN 미니 카드 6개 */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'8px', marginBottom:'16px' }}>
              {JCODES.map(j => (
                <div key={j} style={{ background: jBgCol(j), border:`1px solid ${jColor(j)}44`, borderRadius:'8px', padding:'12px 10px', textAlign:'center' }}>
                  <div style={{ fontSize:'20px', fontWeight:800, color: jColor(j) }}>{jCounts[j]}</div>
                  <div style={{ fontSize:'12px', color: jColor(j), fontWeight:700, marginTop:'4px' }}>{j}</div>
                  <div style={{ fontSize:'10px', color:'#9ca3af', marginTop:'2px' }}>
                    {((jCounts[j] / totalExamined) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
            {/* 요관찰자/유소견자 합계 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div style={{ background:'#eff6ff', borderRadius:'8px', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'#1e40af', fontWeight:700 }}>요관찰자 (C1+C2+CN)</div>
                  <div style={{ fontSize:'11px', color:'#93c5fd', marginTop:'2px' }}>추가 관찰 필요</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'24px', fontWeight:800, color:'#2563eb' }}>{요관찰자Cnt}명</div>
                  <div style={{ fontSize:'11px', color:'#93c5fd' }}>{((요관찰자Cnt / totalExamined) * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div style={{ background:'#fef2f2', borderRadius:'8px', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'#991b1b', fontWeight:700 }}>유소견자 (D1+D2+DN)</div>
                  <div style={{ fontSize:'11px', color:'#fca5a5', marginTop:'2px' }}>의학적 조치 필요</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'24px', fontWeight:800, color:'#dc2626' }}>{유소견자Cnt}명</div>
                  <div style={{ fontSize:'11px', color:'#fca5a5' }}>{((유소견자Cnt / totalExamined) * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── 분류별 판정 현황 ── */}
<div style={{ ...cardSt, marginBottom:'16px' }}>
  {/* 헤더 — 클릭 시 토글 */}
  <div
    onClick={() => setBdOpen(o => !o)}
    style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', userSelect:'none' }}
  >
    <div style={{ fontSize:'14px', fontWeight:700, color:'#111827' }}>분류별 판정 현황</div>
    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
      <span style={{ fontSize:'12px', color:'#9ca3af' }}>{bdOpen ? '접기' : '펼치기'}</span>
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ transform: bdOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.2s' }}>
        <path d="M4 6l4 4 4-4" stroke="#9ca3af" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  </div>

  {/* 내용 */}
  {bdOpen && (
    <>
      <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb', marginBottom:'14px', marginTop:'12px' }}>
        {(['부서','공정','성별','근무지'] as BKey[]).map(t => (
          <button key={t} onClick={e => { e.stopPropagation(); setStatBreakdownTab(t); }} style={{ padding:'6px 16px', border:'none', background:'none', cursor:'pointer', fontSize:'13px', fontWeight: statBreakdownTab===t ? 700 : 400, color: statBreakdownTab===t ? '#2563eb' : '#6b7280', borderBottom: statBreakdownTab===t ? '2px solid #2563eb' : '2px solid transparent', marginBottom:'-1px' }}>
            {t}별
          </button>
        ))}
      </div>
      {bdData.length === 0 ? (
        <div style={{ fontSize:'13px', color:'#9ca3af', padding:'20px 0' }}>데이터 없음</div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#f9fafb' }}>
                <th style={{ padding:'8px 12px', textAlign:'left', fontWeight:700, color:'#374151', borderBottom:'1px solid #e5e7eb', whiteSpace:'nowrap' }}>{statBreakdownTab}</th>
                <th style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, color:'#374151', borderBottom:'1px solid #e5e7eb', whiteSpace:'nowrap' }}>총인원</th>
                {JCODES.map(j => (
                  <th key={j} style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, color: jColor(j), borderBottom:'1px solid #e5e7eb', whiteSpace:'nowrap' }}>{j}</th>
                ))}
                <th style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, color:'#2563eb', borderBottom:'1px solid #e5e7eb', whiteSpace:'nowrap' }}>요관찰</th>
                <th style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, color:'#dc2626', borderBottom:'1px solid #e5e7eb', whiteSpace:'nowrap' }}>유소견</th>
                <th style={{ padding:'8px 12px', textAlign:'right', fontWeight:700, color:'#374151', borderBottom:'1px solid #e5e7eb', whiteSpace:'nowrap' }}>이상소견률</th>
              </tr>
            </thead>
            <tbody>
              {bdData.map(([cat, counts], i) => {
                const 요 = (counts['C1']||0)+(counts['C2']||0)+(counts['CN']||0);
                const 유 = (counts['D1']||0)+(counts['D2']||0)+(counts['DN']||0);
                const tot = counts['total'] || 0;
                return (
                  <tr key={cat} style={{ background: i%2===0 ? '#fff' : '#fafafa', borderBottom:'1px solid #f3f4f6' }}>
                    <td style={{ padding:'8px 12px', fontWeight:500, color:'#111827' }}>{cat}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', color:'#374151' }}>{tot}</td>
                    {JCODES.map(j => (
                      <td key={j} style={{ padding:'8px 12px', textAlign:'right', color:(counts[j]||0)>0 ? jColor(j) : '#d1d5db', fontWeight:(counts[j]||0)>0 ? 700 : 400 }}>
                        {(counts[j]||0)>0 ? counts[j] : '-'}
                      </td>
                    ))}
                    <td style={{ padding:'8px 12px', textAlign:'right', color:'#2563eb', fontWeight: 요>0 ? 700 : 400 }}>{요>0 ? `${요}명` : '-'}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', color:'#dc2626', fontWeight: 유>0 ? 700 : 400 }}>{유>0 ? `${유}명` : '-'}</td>
                    <td style={{ padding:'8px 12px', textAlign:'right', color:'#374151' }}>{tot>0 ? `${(((요+유)/tot)*100).toFixed(0)}%` : '-'}</td>
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

{/* ── 상담 필요자 현황 ── */}
<div style={{ ...cardSt, marginBottom:'16px' }}>
  {/* 헤더 — 클릭 시 토글 */}
  <div
    onClick={() => setCnOpen(o => !o)}
    style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', userSelect:'none' }}
  >
    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
      <div style={{ fontSize:'14px', fontWeight:700, color:'#111827' }}>상담 필요자 현황</div>
      <div style={{ fontSize:'12px', color:'#6b7280' }}>C1 · D1 · D2 · DN 판정자 (누적)</div>
    </div>
    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
      {/* 미상담/완료 뱃지는 접혀 있을 때도 항상 표시 */}
      <span style={{ padding:'3px 10px', background:'#fef2f2', color:'#dc2626', borderRadius:'4px', fontWeight:700, fontSize:'12px' }}>
        미상담 {상담필요자.filter(p => !p.done).length}명
      </span>
      <span style={{ padding:'3px 10px', background:'#f0fdf4', color:'#16a34a', borderRadius:'4px', fontWeight:700, fontSize:'12px' }}>
        상담완료 {상담필요자.filter(p => p.done).length}명
      </span>
      <span style={{ fontSize:'12px', color:'#9ca3af', marginLeft:'4px' }}>{cnOpen ? '접기' : '펼치기'}</span>
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ transform: cnOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.2s' }}>
        <path d="M4 6l4 4 4-4" stroke="#9ca3af" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  </div>

  {/* 내용 */}
  {cnOpen && (
    <div style={{ marginTop:'14px' }}>
      {상담필요자.length === 0 ? (
        <div style={{ fontSize:'13px', color:'#9ca3af', padding:'20px 0' }}>C1·D1·D2·DN 판정 데이터가 없습니다.</div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#f9fafb' }}>
                {['No','성명','사번','부서','공정','판정','검진년도','상담여부','상담횟수','최근상담일'].map(h => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:700, color:'#374151', borderBottom:'1px solid #e5e7eb', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {상담필요자.map((p, i) => (
                <tr key={p.사번}
                  style={{ background: !p.done ? '#fff9f9' : i%2===0 ? '#fff' : '#fafafa', borderBottom:'1px solid #f3f4f6' }}
                  onMouseEnter={ev => { ev.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={ev => { ev.currentTarget.style.background = !p.done ? '#fff9f9' : i%2===0 ? '#fff' : '#fafafa'; }}
                >
                  <td style={{ padding:'8px 12px', color:'#9ca3af' }}>{i+1}</td>
                  <td style={{ padding:'8px 12px', fontWeight:600 }}>{p.성명}</td>
                  <td style={{ padding:'8px 12px', color:'#6b7280' }}>{p.사번}</td>
                  <td style={{ padding:'8px 12px' }}>{p.부서}</td>
                  <td style={{ padding:'8px 12px', color:'#6b7280' }}>{p.공정}</td>
                  <td style={{ padding:'8px 12px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:'4px', background: jBgCol(p.worst), color: jColor(p.worst), fontWeight:700, fontSize:'12px' }}>{p.worst}</span>
                  </td>
                  <td style={{ padding:'8px 12px', color:'#374151' }}>{p.year}년</td>
                  <td style={{ padding:'8px 12px' }}>
                    {p.done
                      ? <span style={{ padding:'2px 8px', borderRadius:'4px', background:'#f0fdf4', color:'#16a34a', fontWeight:700, fontSize:'12px' }}>완료</span>
                      : <span style={{ padding:'2px 8px', borderRadius:'4px', background:'#fef2f2', color:'#dc2626', fontWeight:700, fontSize:'12px' }}>미진행</span>
                    }
                  </td>
                  <td style={{ padding:'8px 12px', textAlign:'center' }}>{p.cnt > 0 ? `${p.cnt}회` : '-'}</td>
                  <td style={{ padding:'8px 12px', color:'#374151' }}>{p.lastDate || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )}
</div>


      {/* ── 부서별/월별 상담 ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
        <div style={cardSt}>
          <div style={{ fontSize:'14px', fontWeight:700, color:'#111827', marginBottom:'14px' }}>부서별 상담 건수</div>
          {deptList.length === 0 && <div style={{ fontSize:'13px', color:'#9ca3af' }}>데이터 없음</div>}
          {deptList.slice(0, 10).map(([dept, cnt]) => (
            <div key={dept} style={{ marginBottom:'10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'4px' }}>
                <span style={{ color:'#374151', fontWeight:500 }}>{dept}</span>
                <span style={{ color:'#2563eb', fontWeight:700 }}>{cnt}건</span>
              </div>
              <div style={{ height:'6px', background:'#e5e7eb', borderRadius:'4px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${(cnt/maxDept)*100}%`, background:'#2563eb', borderRadius:'4px' }}/>
              </div>
            </div>
          ))}
        </div>
        <div style={cardSt}>
          <div style={{ fontSize:'14px', fontWeight:700, color:'#111827', marginBottom:'14px' }}>월별 상담 건수 (최근 12개월)</div>
          {monthList.length === 0 && <div style={{ fontSize:'13px', color:'#9ca3af' }}>데이터 없음</div>}
          {monthList.map(([m, cnt]) => (
            <div key={m} style={{ marginBottom:'10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'4px' }}>
                <span style={{ color:'#374151', fontWeight:500 }}>{m}</span>
                <span style={{ color:'#16a34a', fontWeight:700 }}>{cnt}건</span>
              </div>
              <div style={{ height:'6px', background:'#e5e7eb', borderRadius:'4px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${(cnt/maxMonth)*100}%`, background:'#16a34a', borderRadius:'4px' }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 개인별 상담 현황 ── */}
      <div style={cardSt}>
        <div style={{ display:'flex', alignItems:'baseline', gap:'8px', marginBottom:'14px' }}>
          <div style={{ fontSize:'14px', fontWeight:700, color:'#111827' }}>개인별 상담 현황</div>
          <div style={{ fontSize:'12px', color:'#93c5fd', fontWeight:600 }}>{currentYM} 당월</div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                {['No','성명','사번','부서','상담 횟수','추후 관리','최근 상담일'].map(h => (
                  <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontWeight:700, color:'#374151', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empList.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:'30px', textAlign:'center', color:'#9ca3af' }}>상담 기록이 없습니다.</td></tr>
              ) : (
                empList.map((e, i) => (
                  <tr key={e.사번} style={{ borderBottom:'1px solid #f3f4f6' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = '#fff')}
                  >
                    <td style={{ padding:'9px 12px', color:'#9ca3af' }}>{i+1}</td>
                    <td style={{ padding:'9px 12px', fontWeight:600 }}>{e.성명}</td>
                    <td style={{ padding:'9px 12px', color:'#6b7280' }}>{e.사번}</td>
                    <td style={{ padding:'9px 12px' }}>{e.부서 || '-'}</td>
                    <td style={{ padding:'9px 12px' }}>
                      <span style={{ padding:'3px 10px', borderRadius:'6px', background:'#eff6ff', color:'#2563eb', fontWeight:700, fontSize:'12px' }}>{e.cnt}회</span>
                    </td>
                    <td style={{ padding:'9px 12px' }}>
                      {e.followUp > 0
                        ? <span style={{ padding:'3px 10px', borderRadius:'6px', background:'#fef2f2', color:'#dc2626', fontWeight:700, fontSize:'12px' }}>{e.followUp}건</span>
                        : <span style={{ color:'#9ca3af', fontSize:'12px' }}>없음</span>
                      }
                    </td>
                    <td style={{ padding:'9px 12px', color:'#374151' }}>{e.last || '-'}</td>
                  </tr>
                ))
              )}
              
            </tbody>
          </table>
        </div>
      </div>
      {/* ══ 통계 그래프 ══ */}
<div style={{ marginTop: '16px' }}>
  <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>통계 그래프</div>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

    {/* 차트 1: 판정 코드 분포 도넛 */}
    {(() => {
      const items = [
        { label: 'C1', value: jCounts['C1'], color: '#3b82f6' },
        { label: 'C2', value: jCounts['C2'], color: '#60a5fa' },
        { label: 'CN', value: jCounts['CN'], color: '#93c5fd' },
        { label: 'D1', value: jCounts['D1'], color: '#dc2626' },
        { label: 'D2', value: jCounts['D2'], color: '#ef4444' },
        { label: 'DN', value: jCounts['DN'], color: '#fca5a5' },
      ].filter(d => d.value > 0);
      const normalCount = totalExamined - items.reduce((s, d) => s + d.value, 0);
      const allItems = normalCount > 0 ? [...items, { label: '기타/정상', value: normalCount, color: '#e5e7eb' }] : items;
      const tot = allItems.reduce((s, d) => s + d.value, 0);
      const cx = 90, cy = 90, outerR = 70, innerR = 44;
      let ang = -Math.PI / 2;
      const slices = tot === 0 || allItems.length === 1 ? [] : allItems.map(d => {
        const theta = (d.value / tot) * 2 * Math.PI;
        const e = ang + theta;
        const x1 = cx + outerR * Math.cos(ang), y1 = cy + outerR * Math.sin(ang);
        const x2 = cx + outerR * Math.cos(e),   y2 = cy + outerR * Math.sin(e);
        const ix1 = cx + innerR * Math.cos(ang), iy1 = cy + innerR * Math.sin(ang);
        const ix2 = cx + innerR * Math.cos(e),   iy2 = cy + innerR * Math.sin(e);
        const lg = theta > Math.PI ? 1 : 0;
        const path = `M${x1.toFixed(1)},${y1.toFixed(1)} A${outerR},${outerR} 0 ${lg},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${ix2.toFixed(1)},${iy2.toFixed(1)} A${innerR},${innerR} 0 ${lg},0 ${ix1.toFixed(1)},${iy1.toFixed(1)} Z`;
        const res = { ...d, path };
        ang = e;
        return res;
      });
      return (
        <div style={cardSt}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>판정 코드 분포</div>
          {tot === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>검진 소견 데이터 없음</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <svg width={180} height={180} viewBox="0 0 180 180" style={{ flexShrink: 0 }}>
                {allItems.length === 1 ? (
                  <>
                    <circle cx={cx} cy={cy} r={outerR} fill={allItems[0].color} />
                    <circle cx={cx} cy={cy} r={innerR} fill="white" />
                  </>
                ) : slices.map((s, i) => (
                  <path key={i} d={s.path} fill={s.color}>
                    <title>{s.label}: {s.value}명 ({((s.value / tot) * 100).toFixed(1)}%)</title>
                  </path>
                ))}
                <text x={cx} y={cy - 8}  textAnchor="middle" fontSize={10} fill="#9ca3af">검진인원</text>
                <text x={cx} y={cy + 10} textAnchor="middle" fontSize={20} fontWeight="bold" fill="#111827">{totalExamined}</text>
                <text x={cx} y={cy + 24} textAnchor="middle" fontSize={10} fill="#9ca3af">명</text>
              </svg>
              <div style={{ flex: 1 }}>
                {allItems.map(d => (
                  <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: d.color, border: d.color === '#e5e7eb' ? '1px solid #d1d5db' : 'none', flexShrink: 0 }} />
                      <span style={{ color: '#374151', fontWeight: d.label !== '기타/정상' ? 700 : 400 }}>{d.label}</span>
                    </div>
                    <div>
                      <span style={{ color: d.color === '#e5e7eb' ? '#6b7280' : d.color, fontWeight: 700 }}>{d.value}명</span>
                      <span style={{ color: '#9ca3af', marginLeft: '4px' }}>({((d.value / tot) * 100).toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    })()}

    {/* 차트 2: 월별 상담 건수 바 차트 */}
    {(() => {
      const W = 340, H = 170, pl = 28, pr = 8, pt = 18, pb = 32;
      const cw = W - pl - pr, ch = H - pt - pb;
      const maxV = Math.max(...(monthList.length ? monthList.map(([, c]) => c) : [0]), 1);
      const n = monthList.length;
      if (n === 0) return (
        <div style={cardSt}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>월별 상담 건수 추이</div>
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>데이터 없음</div>
        </div>
      );
      const bW = Math.max(8, Math.min(24, (cw / n) * 0.6));
      const step = cw / n;
      const gridVals = [0, Math.ceil(maxV / 2), maxV];
      return (
        <div style={cardSt}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>월별 상담 건수 추이 (최근 12개월)</div>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
            {gridVals.map(v => {
              const gy = pt + ch - (v / maxV) * ch;
              return (
                <g key={v}>
                  <line x1={pl} x2={W - pr} y1={gy} y2={gy} stroke="#f3f4f6" strokeWidth={1} />
                  <text x={pl - 3} y={gy + 4} fontSize={8} fill="#d1d5db" textAnchor="end">{v}</text>
                </g>
              );
            })}
            <line x1={pl} x2={pl}    y1={pt}      y2={pt + ch} stroke="#e5e7eb" strokeWidth={1} />
            <line x1={pl} x2={W - pr} y1={pt + ch} y2={pt + ch} stroke="#e5e7eb" strokeWidth={1} />
            {monthList.map(([m, cnt], i) => {
              const bx = pl + i * step + step / 2;
              const bh = (cnt / maxV) * ch;
              const by = pt + ch - bh;
              const isCur = m === currentYM;
              return (
                <g key={m}>
                  <rect x={bx - bW / 2} y={by} width={bW} height={bh} fill={isCur ? '#2563eb' : '#93c5fd'} rx={2} />
                  {cnt > 0 && (
                    <text x={bx} y={by - 3} textAnchor="middle" fontSize={8} fill={isCur ? '#2563eb' : '#6b7280'} fontWeight={isCur ? 'bold' : 'normal'}>{cnt}</text>
                  )}
                  <text x={bx} y={H - 4} textAnchor="middle" fontSize={8} fill={isCur ? '#2563eb' : '#9ca3af'} fontWeight={isCur ? 'bold' : 'normal'}>{m.slice(5)}월</text>
                </g>
              );
            })}
          </svg>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
            <span>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#2563eb', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }} />
              당월
            </span>
            <span>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#93c5fd', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }} />
              과거
            </span>
          </div>
        </div>
      );
    })()}

    {/* 차트 3: 분류별 이상소견률 누적 바 */}
    {(() => {
      const top8 = bdData.slice(0, 8);
      if (top8.length === 0) return (
        <div style={cardSt}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>{statBreakdownTab}별 이상소견률</div>
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>데이터 없음</div>
        </div>
      );
      const rates = top8.map(([, counts]) => {
        const tot = counts['total'] || 0;
        if (!tot) return { 요율: 0, 유율: 0 };
        return {
          요율: ((counts['C1'] || 0) + (counts['C2'] || 0) + (counts['CN'] || 0)) / tot * 100,
          유율: ((counts['D1'] || 0) + (counts['D2'] || 0) + (counts['DN'] || 0)) / tot * 100,
        };
      });
      const maxRate = Math.max(...rates.map(r => r.요율 + r.유율), 1);
      return (
        <div style={cardSt}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>{statBreakdownTab}별 이상소견률 (상위 8개)</div>
          {top8.map(([cat, counts], i) => {
            const tot = counts['total'] || 0;
            const 요 = (counts['C1'] || 0) + (counts['C2'] || 0) + (counts['CN'] || 0);
            const 유 = (counts['D1'] || 0) + (counts['D2'] || 0) + (counts['DN'] || 0);
            const rate = tot > 0 ? ((요 + 유) / tot * 100) : 0;
            const r = rates[i];
            return (
              <div key={cat} style={{ marginBottom: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                  <span style={{ color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>{cat}</span>
                  <div style={{ display: 'flex', gap: '6px', fontSize: '11px', flexShrink: 0 }}>
                    <span style={{ color: '#2563eb', fontWeight: 700 }}>C {요}명</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>D {유}명</span>
                    <span style={{ color: '#374151', fontWeight: 700 }}>{rate.toFixed(0)}%</span>
                  </div>
                </div>
                <div style={{ height: '10px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${(r.요율 / maxRate) * 100}%`, background: '#93c5fd', transition: 'width 0.3s' }} />
                  <div style={{ width: `${(r.유율 / maxRate) * 100}%`, background: '#fca5a5', transition: 'width 0.3s' }} />
                </div>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
            <span>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#93c5fd', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }} />
              요관찰(C)
            </span>
            <span>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#fca5a5', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }} />
              유소견(D)
            </span>
          </div>
        </div>
      );
    })()}

    {/* 차트 4: 상담 필요자 완료 도넛 */}
    {(() => {
      const done   = 상담필요자.filter(p => p.done).length;
      const undone = 상담필요자.filter(p => !p.done).length;
      const tot = done + undone;
      if (tot === 0) return (
        <div style={cardSt}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>상담 필요자 진행 현황</div>
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>C1·D1·D2·DN 판정자 없음</div>
        </div>
      );
      const cx2 = 90, cy2 = 90, outerR2 = 68, innerR2 = 44;
      const pieItems = [
        { label: '상담완료', value: done,   color: '#16a34a' },
        { label: '미진행',   value: undone, color: '#dc2626' },
      ].filter(d => d.value > 0);
      let ang2 = -Math.PI / 2;
      const pieSlices = pieItems.length === 1 ? [] : pieItems.map(d => {
        const theta = (d.value / tot) * 2 * Math.PI;
        const e = ang2 + theta;
        const x1 = cx2 + outerR2 * Math.cos(ang2), y1 = cy2 + outerR2 * Math.sin(ang2);
        const x2 = cx2 + outerR2 * Math.cos(e),    y2 = cy2 + outerR2 * Math.sin(e);
        const ix1 = cx2 + innerR2 * Math.cos(ang2), iy1 = cy2 + innerR2 * Math.sin(ang2);
        const ix2 = cx2 + innerR2 * Math.cos(e),    iy2 = cy2 + innerR2 * Math.sin(e);
        const lg = theta > Math.PI ? 1 : 0;
        const path = `M${x1.toFixed(1)},${y1.toFixed(1)} A${outerR2},${outerR2} 0 ${lg},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${ix2.toFixed(1)},${iy2.toFixed(1)} A${innerR2},${innerR2} 0 ${lg},0 ${ix1.toFixed(1)},${iy1.toFixed(1)} Z`;
        const res = { ...d, path };
        ang2 = e;
        return res;
      });
      const jColors2: Record<string, string> = { C1: '#3b82f6', D1: '#dc2626', D2: '#ef4444', DN: '#f87171' };
      const doneColor = done === tot ? '#16a34a' : undone === tot ? '#dc2626' : '#111827';
      return (
        <div style={cardSt}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>상담 필요자 진행 현황</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <svg width={180} height={180} viewBox="0 0 180 180" style={{ flexShrink: 0 }}>
              {pieItems.length === 1 ? (
                <>
                  <circle cx={cx2} cy={cy2} r={outerR2} fill={pieItems[0].color} />
                  <circle cx={cx2} cy={cy2} r={innerR2} fill="white" />
                </>
              ) : pieSlices.map((s, i) => (
                <path key={i} d={s.path} fill={s.color}>
                  <title>{s.label}: {s.value}명</title>
                </path>
              ))}
              <text x={cx2} y={cy2 - 8}  textAnchor="middle" fontSize={10} fill="#9ca3af">완료율</text>
              <text x={cx2} y={cy2 + 10} textAnchor="middle" fontSize={20} fontWeight="bold" fill={doneColor}>
                {((done / tot) * 100).toFixed(0)}%
              </text>
              <text x={cx2} y={cy2 + 26} textAnchor="middle" fontSize={10} fill="#9ca3af">{done}/{tot}명</text>
            </svg>
            <div style={{ flex: 1 }}>
              {pieItems.map(d => (
                <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: d.color }} />
                    <span style={{ color: '#374151' }}>{d.label}</span>
                  </div>
                  <span style={{ color: d.color, fontWeight: 700 }}>{d.value}명</span>
                </div>
              ))}
              <div style={{ background: '#fef2f2', borderRadius: '6px', padding: '8px 10px', marginTop: '8px' }}>
                <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 700, marginBottom: '6px' }}>판정별 미상담</div>
                {(['C1', 'D1', 'D2', 'DN'] as const).map(j => {
                  const cnt = 상담필요자.filter(p => p.worst === j && !p.done).length;
                  if (cnt === 0) return null;
                  return (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                      <span style={{ color: jColors2[j], fontWeight: 700 }}>{j}</span>
                      <span style={{ color: '#374151' }}>{cnt}명 미진행</span>
                    </div>
                  );
                })}
                {undone === 0 && (
                  <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>전원 상담 완료</div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    })()}

  </div>
</div>

    </div>
  );
}



  /* ★★★ 기본 건강상담 화면 ★★★ */
  return (
    <div style={{ padding:'20px 28px', background:C.pageBg, minHeight:'100vh', fontFamily:'Pretendard,-apple-system,sans-serif' }}>
      <div style={{ display:'flex', borderBottom:'2px solid #e5e7eb', marginBottom:'16px' }}>
        {(['건강상담','검진수치','검진소견'] as const).map(t => (
          <button key={t} onClick={() => {
            if (t === '검진수치') { if (isExamUnlocked) setPageTab(t); else { setShowPwModal(true); setPwInput(''); setPwError(''); } }
            else { setPageTab(t); setIsExamUnlocked(false); }
          }} style={{ padding:'9px 22px', border:'none', background:'none', cursor:'pointer', fontSize:'14px', fontWeight:pageTab===t?700:400, color:pageTab===t?'#166534':'#6b7280', borderBottom:pageTab===t?'2px solid #16a34a':'2px solid transparent', marginBottom:'-2px' }}>
            {t}
            {(t==='검진수치'||t==='검진소견') && <span style={{ marginLeft:'5px', fontSize:'11px', color:'#9ca3af', background:'#f3f4f6', padding:'1px 5px', borderRadius:'4px' }}>{t==='검진수치'?examDB.length:sogyeonDB.length}</span>}
          </button>
        ))}
        {showPwModal && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }} onClick={e => { if(e.target===e.currentTarget){setShowPwModal(false);setPwInput('');setPwError('');} }}>
            <div style={{ background:'#fff', borderRadius:'12px', padding:'32px 36px', width:'340px' }}>
              <div style={{ fontSize:'16px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>검진수치 접근 제한</div>
              <div style={{ fontSize:'13px', color:'#6b7280', marginBottom:'20px' }}>개인 건강정보 보호를 위해 비밀번호를 입력하세요.</div>
              <input type="password" value={pwInput} onChange={e => { setPwInput(e.target.value); setPwError(''); }} onKeyDown={e => { if(e.key==='Enter'){const saved=ld('hc_exam_pw','1234');if(pwInput===saved){setIsExamUnlocked(true);setShowPwModal(false);setPwInput('');setPwError('');setPageTab('검진수치');}else setPwError('비밀번호가 올바르지 않습니다.');} }} placeholder="비밀번호 입력" autoFocus style={{ width:'100%', padding:'10px 14px', border:`1px solid ${pwError?'#dc2626':'#d1d5db'}`, borderRadius:'8px', fontSize:'14px', outline:'none', boxSizing:'border-box', marginBottom:'6px', fontFamily:'inherit' }}/>
              {pwError && <div style={{ fontSize:'12px', color:'#dc2626', marginBottom:'10px' }}>{pwError}</div>}
              {!pwError && <div style={{ marginBottom:'10px' }}/>}
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={() => { const saved=ld('hc_exam_pw','1234'); if(pwInput===saved){setIsExamUnlocked(true);setShowPwModal(false);setPwInput('');setPwError('');setPageTab('검진수치');}else setPwError('비밀번호가 올바르지 않습니다.'); }} style={{ flex:1, padding:'10px', background:'#0369a1', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>확인</button>
                <button onClick={() => { setShowPwModal(false); setPwInput(''); setPwError(''); }} style={{ flex:1, padding:'10px', background:'#f3f4f6', color:'#374151', border:'1px solid #e5e7eb', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>취소</button>
              </div>
              <div style={{ marginTop:'16px', padding:'10px 12px', background:'#f0f9ff', borderRadius:'6px', fontSize:'12px', color:'#0369a1' }}>초기 비밀번호: <strong>1234</strong></div>
            </div>
          </div>
        )}
      </div>

      {pageTab === '검진수치' && <ExamDataTab data={examDB} onChange={handleExam}/>}
      {pageTab === '검진소견' && <SogyeonDataTab data={sogyeonDB} onChange={handleSogyeon}/>}

      {pageTab === '건강상담' && (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px', flexWrap:'wrap' }}>
  <div style={{ position:'relative', flexShrink:0 }}>
    <input
      value={search} onChange={e => setSearch(e.target.value)}
      placeholder="이름 또는 사번 검색..."
      style={{ width:'250px', padding:'9px 14px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'14px', outline:'none' }}
    />
    {search && results.length > 0 && (
      <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e5e7eb', borderRadius:'8px', boxShadow:'0 4px 16px rgba(0,0,0,.12)', zIndex:300, maxHeight:'300px', overflowY:'auto', marginTop:'2px' }}>
        {results.map(r => {
          const sa = st(r['사번']), nm = st(r['성명']);
          const isDup = (nmCnt[nm]??0) > 1;
          return (
            <div key={sa} style={{ padding:'9px 12px', borderBottom:'1px solid #f3f4f6', background:isDup?'#fff5f5':'#fff' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <span style={{ fontSize:'14px', fontWeight:600, color:isDup?'#dc2626':'#111827' }}>{nm}</span>
                {isDup && <span style={{ fontSize:'10px', background:'#fee2e2', color:'#dc2626', padding:'1px 5px', borderRadius:'3px', fontWeight:700 }}>동명이인</span>}
              </div>
              <div style={{ fontSize:'12px', color:'#9ca3af' }}>{sa} · {st(r['소속']??r['부서']??'')}</div>
              {isDup ? (
                <div style={{ display:'flex', gap:'4px', marginTop:'5px', alignItems:'center' }}>
                  <span style={{ fontSize:'11px', color:'#dc2626' }}>사번 확인:</span>
                  <input value={dupIn[sa]??''} onChange={e => setDupIn(p => ({...p,[sa]:e.target.value}))} placeholder="사번 입력" style={{ width:'90px', padding:'2px 6px', border:'1px solid #fca5a5', borderRadius:'4px', fontSize:'12px', outline:'none' }}/>
                  <button onClick={() => { if((dupIn[sa]??'').trim()===sa) pick(sa); else alert('사번이 일치하지 않습니다.'); }} style={{ padding:'2px 8px', background:'#dc2626', color:'#fff', border:'none', borderRadius:'4px', fontSize:'12px', cursor:'pointer' }}>선택</button>
                </div>
              ) : (
                <button onClick={() => pick(sa)} style={{ marginTop:'4px', padding:'3px 12px', background:'#2563eb', color:'#fff', border:'none', borderRadius:'4px', fontSize:'12px', cursor:'pointer' }}>선택</button>
              )}
            </div>
          );
        })}
      </div>
    )}
    {search && results.length === 0 && (
      <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'12px', textAlign:'center', color:'#9ca3af', fontSize:'13px', marginTop:'2px', zIndex:300 }}>
        검색 결과 없음
      </div>
    )}
  </div>

  {/* ★ 추가: 명단 외 입력 버튼 */}
  <button
    onClick={() => { setManualMode(true); setSearch(''); }}
    style={{ padding:'9px 14px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'13px', color:'#374151', background:'#fff', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}
  >
    명단 외 입력
  </button>

  {/* ★ 수정: 명단외 뱃지 추가 */}
  {selEmp && (
    <span style={{ fontSize:'14px', fontWeight:600 }}>
      {st(selEmp['성명'])}{' '}
      <span style={{ color:'#9ca3af', fontWeight:400 }}>
        ({st(selEmp['직원구분']) === '명단외'
          ? (st(selEmp['사번']).startsWith('GUEST_') ? '임시등록' : st(selEmp['사번']))
          : st(selEmp['사번'])})
      </span>
      {st(selEmp['직원구분']) === '명단외' && (
        <span style={{ marginLeft:'6px', fontSize:'11px', background:'#fef3c7', color:'#d97706', padding:'2px 6px', borderRadius:'4px', fontWeight:700 }}>명단 외</span>
      )}
    </span>
  )}

  <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', gap:'8px', alignItems:'flex-end' }}>
              <div style={{ display:'flex', gap:'8px' }}>
                {selEmp && !editing && <button onClick={newC} style={{ padding:'8px 18px', background:'#2563eb', color:'#fff', border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>+ 새 상담 작성</button>}
                {editing && <>
                  <button onClick={saveC} style={{ padding:'8px 18px', background:'#16a34a', color:'#fff', border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>저장</button>
                  <button onClick={() => setEditing(false)} style={{ padding:'8px 18px', background:'#f3f4f6', color:'#374151', border:'1px solid #e5e7eb', borderRadius:'7px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>취소</button>
                </>}
              </div>
            </div>

</div>
{/* ★ 추가: 명단 외 입력 모달 */}
          {manualMode && (
            <div
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}
              onClick={e => { if (e.target === e.currentTarget) { setManualMode(false); setManualInput({ 사번:'', 성명:'', 소속:'', 성별:'' }); }}}
            >
              <div style={{ background:'#fff', borderRadius:'12px', padding:'28px 32px', width:'360px', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
                <div style={{ fontSize:'16px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>명단 외 상담 대상자</div>
                <div style={{ fontSize:'13px', color:'#6b7280', marginBottom:'20px' }}>인명부에 없는 분의 정보를 입력하세요.</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  <div>
                    <label style={{ fontSize:'12px', fontWeight:600, color:'#374151', display:'block', marginBottom:'4px' }}>성명 <span style={{ color:'#dc2626' }}>*</span></label>
                    <input value={manualInput.성명} onChange={e => setManualInput(p => ({...p, 성명: e.target.value}))} onKeyDown={e => e.key === 'Enter' && pickManual()} placeholder="이름 입력" autoFocus style={{ width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'14px', outline:'none', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:'12px', fontWeight:600, color:'#374151', display:'block', marginBottom:'4px' }}>사번</label>
                    <input value={manualInput.사번} onChange={e => setManualInput(p => ({...p, 사번: e.target.value}))} onKeyDown={e => e.key === 'Enter' && pickManual()} placeholder="없으면 비워두세요 (자동 생성)" style={{ width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'14px', outline:'none', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:'12px', fontWeight:600, color:'#374151', display:'block', marginBottom:'4px' }}>부서명</label>
                    <input value={manualInput.소속} onChange={e => setManualInput(p => ({...p, 소속: e.target.value}))} onKeyDown={e => e.key === 'Enter' && pickManual()} placeholder="부서명 입력 (선택)" style={{ width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'14px', outline:'none', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:'12px', fontWeight:600, color:'#374151', display:'block', marginBottom:'4px' }}>성별</label>
                    <select value={manualInput.성별} onChange={e => setManualInput(p => ({...p, 성별: e.target.value}))} style={{ width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'14px', outline:'none', boxSizing:'border-box', background:'#fff' }}>
                      <option value="">선택 안함</option>
                      <option value="남">남</option>
                      <option value="여">여</option>
                    </select>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'8px', marginTop:'20px' }}>
                  <button onClick={pickManual} style={{ flex:1, padding:'10px', background:'#2563eb', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>상담 작성 시작</button>
                  <button onClick={() => { setManualMode(false); setManualInput({ 사번:'', 성명:'', 소속:'', 성별:'' }); }} style={{ flex:1, padding:'10px', background:'#f3f4f6', color:'#374151', border:'1px solid #e5e7eb', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>취소</button>
                </div>
                <div style={{ marginTop:'14px', padding:'10px 12px', background:'#fffbeb', borderRadius:'6px', fontSize:'12px', color:'#92400e' }}>
                  사번 없이 입력하면 임시 ID가 자동 부여됩니다. 같은 분이 재방문할 때 이전 기록을 이어 쓰려면 동일한 사번을 입력하세요.
                </div>
              </div>
            </div>
          )}


          {!selEmp ? (
            <div style={{ border:'2px dashed #e5e7eb', borderRadius:'12px', padding:'60px', textAlign:'center', color:'#9ca3af', fontSize:'14px' }}>위 검색창에서 직원을 검색하여 선택하세요</div>
          ) : (
            <div style={{ display:'flex', gap:'0px', alignItems:'flex-start' }}>
              <div style={{ width:`${listWidth}px`, flexShrink:0, border:`1px solid ${C.border}`, borderRadius:'16px', overflow:'hidden', background:'#fff' }}>
                <div style={{ padding:'12px 14px', background:'#f8fafc', borderBottom:`1px solid ${C.border}`, fontSize:'13px', fontWeight:700, color:C.text }}>상담 기록 ({pConsults.length})</div>
                {pConsults.length === 0 && <div style={{ padding:'20px', textAlign:'center', fontSize:'13px', color:'#9ca3af' }}>없음</div>}
                <div style={{ padding:'10px' }}>
                  {pConsults.map(c => {
                    const selected = curId === c.id && !editing;
                    return (
                      <div key={c.id} onClick={() => { setCurId(c.id); setEditing(false); }} style={{ padding:'12px', marginBottom:'10px', borderRadius:'14px', border:selected?'1px solid #93c5fd':'1px solid #e5e7eb', background:selected?'#eff6ff':'#fff', cursor:'pointer' }}>
                        <div style={{ fontSize:'14px', fontWeight:700, color:selected?'#1d4ed8':'#1f2937', marginBottom:'6px' }}>{c.상담일}</div>
                        <div style={{ fontSize:'12px', color:'#6b7280', lineHeight:1.5, marginBottom:'10px', wordBreak:'break-word' }}>{makeConsultSummary(c)}</div>
                        <div style={{ display:'flex', gap:'6px' }}>
                          <button onClick={e => { e.stopPropagation(); editC(c); }} style={{ padding:'4px 8px', fontSize:'11px', background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe', borderRadius:'8px', cursor:'pointer', fontWeight:600 }}>수정</button>
                          <button onClick={e => { e.stopPropagation(); delC(c.id); }} style={{ padding:'4px 8px', fontSize:'11px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:'8px', cursor:'pointer', fontWeight:600 }}>삭제</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div onMouseDown={e => { dragRef.current = { dragging:true, startX:e.clientX, startW:listWidth }; e.preventDefault(); }} style={{ width:'10px', flexShrink:0, cursor:'col-resize', display:'flex', alignItems:'stretch', justifyContent:'center', padding:'0 3px' }}>
                <div style={{ width:'2px', background:'#d1d5db', borderRadius:'2px' }}/>
              </div>

              <div style={{ flex:1, minWidth:0, maxWidth:'980px' }}>
                {!display ? (
                  <div style={{ border:'1px solid #e5e7eb', borderRadius:'8px', padding:'48px', textAlign:'center', color:'#9ca3af', fontSize:'14px' }}>왼쪽에서 상담 기록을 선택하거나, <strong>+ 새 상담 작성</strong>을 누르세요</div>
                ) : (
                  <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:'16px', overflow:'hidden' }}>
                    <div style={{ padding:'18px 20px', borderBottom:`1px solid ${C.border}` }}>
                      <div style={{ fontSize:'20px', fontWeight:800, color:C.text, marginBottom:'6px' }}>개인건강 상담일지</div>
                      <div style={{ fontSize:'13px', color:C.sub }}>{st(selEmp['성명'])} · {st(selEmp['사번'])} · {st(selEmp['소속']??selEmp['부서']??'-')}</div>
                    </div>

                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={TH}>상 담 일</td>
                          <td style={{ ...TD, minWidth:'120px' }}>{editing?<input type="date" value={dv('상담일')} onChange={e=>uv('상담일',e.target.value)} style={{ border:'none', outline:'none', fontSize:'13px', fontFamily:'inherit', background:'transparent' }}/>:dv('상담일')}</td>
                          <td style={TH}>상담장소</td>
                          <td style={TD}>{editing?<input value={dv('상담장소')} onChange={e=>uv('상담장소',e.target.value)} style={{ ...iSt, width:'80px' }}/>:dv('상담장소')}</td>
                          <td style={TH}>상 담 자</td>
                          <td style={TD}>{editing?<input value={dv('상담자')} onChange={e=>uv('상담자',e.target.value)} style={iSt}/>:dv('상담자')}</td>
                        </tr>
                        <tr>
                          <td style={TH}>상담방법</td>
                          <td colSpan={5} style={TD}>
                            <div style={{ display:'flex', gap:'16px', alignItems:'center', fontSize:'13px', flexWrap:'wrap' }}>
                              {[['방문','방문상담'],['전화','전화상담']].map(([f,l]) => <label key={f} style={{ display:'flex', gap:'4px', alignItems:'center', cursor:editing?'pointer':'default' }}><input type="checkbox" checked={db(f)} onChange={e=>editing&&ub(f,e.target.checked)} disabled={!editing}/>{l}</label>)}
                              <span style={{ color:'#ccc' }}>|</span>
                              <span style={{ fontWeight:600 }}>추후관리</span>
                              {[['추후상담','상담'],['추후진료','진료']].map(([f,l]) => <label key={f} style={{ display:'flex', gap:'4px', alignItems:'center', cursor:editing?'pointer':'default' }}><input type="checkbox" checked={db(f)} onChange={e=>editing&&ub(f,e.target.checked)} disabled={!editing}/>{l}</label>)}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'auto' }}>
                      <tbody>
                        <tr>
                          <td style={{ ...TH, position:'relative' }}>사원번호<div onMouseDown={empH(0)} style={RH2}/></td>
                          <td style={{ ...TD, position:'relative' }}>{st(selEmp['사번'])}<div onMouseDown={empH(1)} style={RH2}/></td>
                          <td style={{ ...TH, position:'relative' }}>성  명<div onMouseDown={empH(2)} style={RH2}/></td>
                          <td style={{ ...TD, position:'relative' }}>{st(selEmp['성명'])}<div onMouseDown={empH(3)} style={RH2}/></td>
                          <td style={{ ...TH, position:'relative' }}>성  별<div onMouseDown={empH(4)} style={RH2}/></td>
                          <td style={{ ...TD, position:'relative' }}>{st(selEmp['성별'])||'-'}<div onMouseDown={empH(5)} style={RH2}/></td>
                          <td style={{ ...TH, position:'relative' }}>나  이<div onMouseDown={empH(6)} style={RH2}/></td>
                          <td style={{ ...TD, position:'relative' }}><span style={{ fontSize:'13px' }}>{calcAge(st(selEmp['생년월일']))}</span><div onMouseDown={empH(7)} style={RH2}/></td>
                          <td style={{ ...TH, position:'relative' }}>부  서<div onMouseDown={empH(8)} style={RH2}/></td>
                          <td style={{ ...TD, position:'relative' }}>{st(selEmp['소속']??selEmp['부서']??'-')}<div onMouseDown={empH(9)} style={RH2}/></td>
                        </tr>
                        <tr>
                          <td style={TH}>근무년수</td><td style={TD}>{calcTenure(st(selEmp['입사일']))}</td>
                          <td style={TH}>야간근무</td>
                          <td style={TD}>{editing?<input value={dv('야간근무')||st(selEmp['야간'])} onChange={e=>uv('야간근무',e.target.value)} style={iSt}/>:<span style={{ fontSize:'13px' }}>{dv('야간근무')||st(selEmp['야간'])||'-'}</span>}</td>
                          <td style={TH}>근무위치</td>
                          <td style={TD}>{editing?<input value={dv('근무위치')||st(selEmp['근무지'])} onChange={e=>uv('근무위치',e.target.value)} style={iSt}/>:<span style={{ fontSize:'13px' }}>{dv('근무위치')||st(selEmp['근무지'])||'-'}</span>}</td>
                          <td style={TH}>공 정 명</td><td style={TD}>{st(selEmp['공정명'])||'-'}</td>
                          <td style={TH}>운  동</td><td style={TD}><Txt fk="운동"/></td>
                        </tr>
                        <tr>
                          <td style={TH}>음  주</td>
                          <td style={TD}>{editing?<input value={dv('음주')||autoEmpVal('음주','DRINK')} onChange={e=>uv('음주',e.target.value)} style={iSt}/>:<span style={{ fontSize:'13px' }}>{dv('음주')||autoEmpVal('음주','DRINK')||'-'}</span>}</td>
                          <td style={TH}>흡  연</td>
                          <td style={TD}>{editing?<input value={dv('흡연')||autoEmpVal('흡연','SMOKE')} onChange={e=>uv('흡연',e.target.value)} style={iSt}/>:<span style={{ fontSize:'13px' }}>{dv('흡연')||autoEmpVal('흡연','SMOKE')||'-'}</span>}</td>
                          <td style={TH}>신체활동</td>
                          <td colSpan={5} style={TD}>{editing?<input value={dv('신체활동')||autoEmpVal('신체활동','EXERCISE')} onChange={e=>uv('신체활동',e.target.value)} style={iSt}/>:<span style={{ fontSize:'13px' }}>{dv('신체활동')||autoEmpVal('신체활동','EXERCISE')||'-'}</span>}</td>
                        </tr>
                        <tr>
                          <td style={TH}>가 족 력</td>
                          <td colSpan={3} style={TD}>{editing?<input value={dv('가족력')||autoEmpVal('가족력','FAMILY')} onChange={e=>uv('가족력',e.target.value)} style={iSt}/>:<span style={{ fontSize:'13px' }}>{dv('가족력')||autoEmpVal('가족력','FAMILY')||'-'}</span>}</td>
                          <td style={TH}>과거및현병력</td>
                          <td colSpan={5} style={TD}>{editing?<input value={dv('과거및현병력')||autoEmpVal('과거및현병력','HISTORY')} onChange={e=>uv('과거및현병력',e.target.value)} style={iSt}/>:<span style={{ fontSize:'13px' }}>{dv('과거및현병력')||autoEmpVal('과거및현병력','HISTORY')||'-'}</span>}</td>
                        </tr>
                        <tr>
                          <td style={TH}>약물치료</td>
                          <td colSpan={9} style={TD}>{editing?<input value={dv('약물치료')==='-'?'':dv('약물치료')} onChange={e=>uv('약물치료',e.target.value)} placeholder="약물치료 내용을 입력하세요" style={{ ...iSt, width:'100%' }}/>:<span style={{ fontSize:'13px' }}>{dv('약물치료')||'-'}</span>}</td>
                        </tr>
                        <tr>
                          <td style={TH}>유해인자</td>
                          <td colSpan={9} style={TD}>{editing?<input value={dv('유해인자')&&dv('유해인자')!=='-'?dv('유해인자'):특검유해인자} onChange={e=>uv('유해인자',e.target.value)} style={iSt}/>:<span style={{ fontSize:'13px' }}>{(dv('유해인자')&&dv('유해인자')!=='-')?dv('유해인자'):특검유해인자||'-'}</span>}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={sectionTitle(C.greenBg, C.greenText)}>검진 소견</div>
                    <div style={{ overflowX:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'600px' }}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width:'68px' }} rowSpan={2}>검진유형</th>
                            <th style={{ ...TH, width:'68px' }} rowSpan={2}>검진일</th>
                            {YEARS.map(y => <React.Fragment key={y}><th style={TH} colSpan={2}>{y}</th></React.Fragment>)}
                          </tr>
                          <tr>
                            {YEARS.map(y => <React.Fragment key={y}><th style={{ ...TH, width:'46px' }}>판정</th><th style={{ ...TH, minWidth:'80px' }}>소견</th></React.Fragment>)}
                          </tr>
                        </thead>
                        <tbody>
                          {SOGYEON_TYPES.map(({ type, n: rc }) =>
                            Array.from({ length: rc }).map((_, ri) => {
                              const slot = ri + 1;
                              const isFirst = ri === 0;
                              const dateKeyMap: Record<string,string> = { '정기특검':'특검검진일','일반검진':'일검검진일','배치전검진':'배치전검진일','배치후검진':'배치후검진일' };
                              return (
                                <tr key={`${type}-${ri}`} style={{ height:'26px' }}>
                                  {isFirst && <td style={{ ...TH, fontSize:'11px', verticalAlign:'middle' }} rowSpan={rc}>{type}</td>}
                                  <td style={TD}>{(() => { const yr=YEARS[ri]; if(yr===undefined) return <span style={{ fontSize:'12px',color:'#ccc' }}>-</span>; const yearRow=sogyeonDB.find(s=>s.사번===selSa&&String(s.year)===String(yr)); const rawDate=yearRow?String(yearRow[dateKeyMap[type]]??''):''; const dateVal=rawDate?fmtDate(rawDate):''; return dateVal?<span style={{ fontSize:'12px',color:'#0369a1' }}>{dateVal}</span>:<span style={{ fontSize:'12px',color:'#ccc' }}>-</span>; })()}</td>
                                  {YEARS.map(y => { const yearRow=sogyeonDB.find(s=>s.사번===selSa&&String(s.year)===String(y)); const 판정=yearRow?String(yearRow[`${type}_${slot}_판정`]??'').trim():''; const 소견=yearRow?String(yearRow[`${type}_${slot}_소견`]??'').trim():''; const hasAuto=!!(판정||소견); return <React.Fragment key={y}><td style={{ ...TD, textAlign:'center', background:hasAuto?'#f0f9ff':'transparent' }}>{hasAuto?<span style={{ fontSize:'12px',fontWeight:700,color:판정Color(판정) }}>{판정}</span>:<Cell ck={`${type}_${ri}_${y}_판정`} center/>}</td><td style={{ ...TD, background:hasAuto?'#f0f9ff':'transparent' }}>{hasAuto?<span style={{ fontSize:'12px',color:'#0369a1' }}>{소견}</span>:<Cell ck={`${type}_${ri}_${y}_소견`}/>}</td></React.Fragment>; })}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div style={sectionTitle(C.greenBg, C.greenText)}>검사 결과</div>
                    <div style={{ overflowX:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ ...TH, width:'100px', textAlign:'left', paddingLeft:'8px' }}>검진결과</th>
                            {YEARS.map(y => <th key={y} style={{ ...TH, width:'80px' }}>{y}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {RESULT_ROWS.map(({ label, key, auto }) => (
                            <tr key={key}>
                              <td style={{ ...TH, textAlign:'left', paddingLeft:'8px', fontWeight:500 }}>{label}{auto&&<span style={{ color:'#2563eb',fontSize:'9px',marginLeft:'3px' }}>●</span>}</td>
                              {YEARS.map(y => { const autoV=auto?st(examByYear[String(y)]?.[auto]??''):''; const isAuto=!!(autoV&&autoV!=='-'); const ck=`R_${y}_${key}`; const manV=getCell(ck); const showV=isAuto?autoV:(manV||'-'); return <td key={y} style={{ ...TD, textAlign:'center', background:isAuto?'#f0f9ff':'transparent' }}>{isAuto||!editing?<span style={{ color:abnormalLevel(key,showV)===2?'#dc2626':abnormalLevel(key,showV)===1?'#2563eb':'#374151', fontWeight:abnormalLevel(key,showV)>0?700:400 }}>{showV}</span>:<input value={manV==='-'?'':manV} onChange={e=>setCell(ck,e.target.value)} style={{ ...iSt, textAlign:'center' }}/>}</td>; })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {examRows.length > 0 && (
                      <>
                        <div style={sectionTitle(C.greenBg, C.greenText)}>검사 결과 그래프</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
                          {[
                            { t:'혈중지질', ms:[{key:'TC',label:'TC'},{key:'HDL',label:'HDL'},{key:'TG',label:'TG'},{key:'LDL',label:'LDL'}], c:['#2563eb','#16a34a','#d97706','#dc2626'] },
                            { t:'간기능', ms:[{key:'GOT',label:'GOT'},{key:'GPT',label:'GPT'},{key:'GTP',label:'GTP'}], c:['#d97706','#7c3aed','#0369a1'] },
                            { t:'폐기능', ms:[{key:'FVC',label:'FVC%'},{key:'FEV1',label:'FEV1%'},{key:'FEVR',label:'FEV1/FVC%'}], c:['#2563eb','#dc2626','#d97706'] },
                            { t:'혈압/혈당', ms:[{key:'SBP',label:'수축기'},{key:'DBP',label:'이완기'},{key:'GLU',label:'공복혈당'}], c:['#dc2626','#2563eb','#16a34a'] },
                          ].map(({ t, ms, c }) => (
                            <div key={t} style={{ padding:'8px', border:'1px solid #e5e7eb' }}>
                              <div style={{ fontSize:'12px', fontWeight:700, marginBottom:'4px' }}>{t}</div>
                              <TrendChart rows={examRows.slice(-5).reverse()} metrics={ms} colors={c}/>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
<div style={sectionTitle(C.greenBg, C.greenText)}>약품 · 처치 기록</div>
<BogunsilRecordSection
  editing={editing}
  record={editing ? (draft.약품기록 ?? {}) : (curC?.약품기록 ?? {})}
  onChange={r => setDraft(p => ({ ...p, 약품기록: r }))}
/>
                    <div style={sectionTitle(C.greenBg, C.greenText)}>상담 내용</div>
                    <div style={{ padding:'10px', minHeight:'90px' }}>
                      {editing
                        ? <textarea value={dv('상담내용')} onChange={e=>uv('상담내용',e.target.value)} rows={5} style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:'4px', padding:'8px', fontSize:'13px', outline:'none', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }}/>
                        : <div style={{ fontSize:'13px', whiteSpace:'pre-wrap', lineHeight:1.8, minHeight:'70px' }}>{dv('상담내용')||<span style={{ color:'#9ca3af' }}>내용 없음</span>}</div>
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
