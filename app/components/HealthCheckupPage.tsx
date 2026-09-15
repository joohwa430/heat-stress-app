'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import HealthConsultationPage from '@/app/components/HealthConsultationPage';

type Row    = Record<string, string | number>;
type ColDef = { key: string; label: string; badge?: boolean; width?: number };

/* ── 뱃지 팔레트 ─────────────────────────────────────────── */
const BADGE: Record<string, { bg: string; c: string }> = {
  '수검완료':    { bg:'#dcfce7', c:'#166534' },
  '대상':        { bg:'#fef9c3', c:'#854d0e' },
  '미수검':      { bg:'#fef9c3', c:'#854d0e' },
  '휴직':        { bg:'#fee2e2', c:'#991b1b' },
  '육아휴직':    { bg:'#fee2e2', c:'#991b1b' },
  '배치전':      { bg:'#dbeafe', c:'#1e40af' },
  '26년입사':    { bg:'#ede9fe', c:'#5b21b6' },
  'O':           { bg:'#dcfce7', c:'#166534' },
  '10%부담':     { bg:'#ffedd5', c:'#9a3412' },
  '대상아님':    { bg:'#f3f4f6', c:'#6b7280' },
  '완료':        { bg:'#dcfce7', c:'#166534' },
  '제외':        { bg:'#f3f4f6', c:'#6b7280' },
  '미완료':      { bg:'#fee2e2', c:'#991b1b' },
  '검진대상':    { bg:'#fef9c3', c:'#854d0e' },
  '해당없음':    { bg:'#f3f4f6', c:'#6b7280' },
  '퇴사':        { bg:'#f3f4f6', c:'#9ca3af' },
  '기한초과':    { bg:'#fee2e2', c:'#991b1b' },
  'D-day':       { bg:'#fef9c3', c:'#92400e' },
  '비대상':      { bg:'#f3f4f6', c:'#9ca3af' },
  '정규직 매년': { bg:'#dbeafe', c:'#1e40af' },
  '정규직 격년 (해당)': { bg:'#dbeafe', c:'#1e40af' },
  '정규직 격년 (비해당)': { bg:'#ede9fe', c:'#5b21b6' },
  '계약직 90일': { bg:'#fef9c3', c:'#854d0e' },
'계약직 90일 (해당)':  { bg:'#fef9c3', c:'#854d0e' },
'계약직 90일 (비해당)': { bg:'#f3f4f6', c:'#9ca3af' },
  '확인필요':    { bg:'#fee2e2', c:'#991b1b' },
};

function Badge({ v }: { v: string }) {
  if (!v || v === '-') return <span style={{ color:'#d1d5db' }}>-</span>;
  if (/^D-\d+$/.test(v)) {
    const n = Number(v.slice(2));
    const bg = n <= 7 ? '#fee2e2' : n <= 21 ? '#fef9c3' : '#eff6ff';
    const c  = n <= 7 ? '#991b1b' : n <= 21 ? '#92400e' : '#1e40af';
    return <span style={{ fontSize:'11px', padding:'2px 7px', borderRadius:'4px', fontWeight:600, background:bg, color:c, whiteSpace:'nowrap' }}>{v}</span>;
  }
  const s = BADGE[v] ?? { bg:'#f3f4f6', c:'#6b7280' };
  return <span style={{ fontSize:'11px', padding:'2px 7px', borderRadius:'4px', fontWeight:600, background:s.bg, color:s.c, whiteSpace:'nowrap' }}>{v}</span>;
}

/* ── 물질명 툴팁 ─────────────────────────────────────────── */
function MatTooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [vis, setVis] = useState(false);
  const [pos, setPos] = useState({ x:0, y:0 });
  if (!content || content === '-') return <>{children}</>;
  return (
    <span
      style={{ cursor:'pointer', textDecoration:'underline dotted', textDecorationColor:'#9ca3af' }}
      onMouseEnter={e => { setVis(true); setPos({ x:e.clientX, y:e.clientY }); }}
      onMouseMove={e => setPos({ x:e.clientX, y:e.clientY })}
      onMouseLeave={() => setVis(false)}
    >
      {children}
      {vis && (
        <div style={{ position:'fixed', left:pos.x+14, top:pos.y-8, background:'#1f2937', color:'#fff',
          padding:'8px 12px', borderRadius:'6px', fontSize:'12px', maxWidth:'320px',
          whiteSpace:'pre-wrap', wordBreak:'break-word', zIndex:99999, pointerEvents:'none',
          lineHeight:1.6, boxShadow:'0 4px 16px rgba(0,0,0,0.35)' }}>
          <div style={{ fontWeight:700, marginBottom:'4px', color:'#6ee7b7', fontSize:'11px' }}>검진 대상 물질</div>
                    {content}
        </div>
      )}
    </span>
  );
}


/* ── 컬럼 정의 ──────────────────────────────────────────── */
const COLS_인명부: ColDef[] = [
  { key:'소속',label:'소속' },{ key:'공정명',label:'공정명' },{ key:'사번',label:'사번' },{ key:'성명',label:'성명' },
  { key:'생년월일',label:'생년월일' },{ key:'성별',label:'성별' },{ key:'직종',label:'직종' },
  { key:'근무지',label:'근무지' },{ key:'직원구분',label:'직원구분' },{ key:'입사일',label:'입사일' },
  { key:'수검25',label:'25년EDI',badge:true },{ key:'EDI26',label:'26년EDI',badge:true },
  { key:'일반',label:'일반',badge:true },
  { key:'특검',label:'특검',badge:true },{ key:'야간', label:'야간', badge:true },
  { key:'방사선',label:'방사선',badge:true },
  { key:'종검',label:'종검',badge:true },{ key:'종검검진일',label:'종검검진일' },
  { key:'휴직',label:'휴직',badge:true },
];
const COLS_EDI: ColDef[] = [
  { key:'성명',label:'성명' },{ key:'주민번호',label:'생년월일(앞6)' },
  { key:'근무구분',label:'근무구분' },{ key:'부서',label:'부서' },
  { key:'국가암',label:'국가암' },{ key:'일반검진',label:'일반검진',badge:true },
  { key:'구강검진',label:'구강검진',badge:true },{ key:'위암',label:'위암',badge:true },
  { key:'유방암',label:'유방암',badge:true },{ key:'대장암',label:'대장암',badge:true },
  { key:'자궁경부암',label:'자궁경부암',badge:true },
];
const COLS_야간: ColDef[] = [
  { key:'사번',label:'사번' },{ key:'성명',label:'성명' },
  { key:'야간작업',label:'야간작업' },{ key:'검진일',label:'검진일' },{ key:'비고',label:'비고' },
];
const COLS_특검: ColDef[] = [
  { key:'사번',label:'사번' },{ key:'성명',label:'성명' },
  { key:'공정명',label:'공정명'},
  { key:'유해인자',label:'유해인자' },{ key:'방사선',label:'방사선',badge:true },
  { key:'검진일',label:'검진일' },{ key:'비고',label:'비고' },
];
const COLS_배치전검진: ColDef[] = [
  { key:'사번',label:'사번' },{ key:'성명',label:'성명' },
  { key:'부서명',label:'부서명' },{ key:'공정명',label:'공정명' },
  { key:'검진대상여부',label:'검진대상여부',badge:true },
  { key:'부서이동일',label:'부서이동일' },
  { key:'물질명',label:'물질명',width:90 },
  { key:'배치전날짜',label:'배치전날짜' },
  { key:'배치전교육',label:'배치전교육',badge:true },
  { key:'배치후',label:'배치후',badge:true },
  { key:'배치후예정일',label:'배치후예정일' },
  { key:'배치후진행일',label:'배치후진행일' },
  { key:'특이사항',label:'특이사항' },{ key:'근무지역',label:'근무지역' },
];
const COLS_배치전교육: ColDef[] = [
  { key:'사번',label:'사번' },{ key:'성명',label:'성명' },
  { key:'부서명',label:'부서명' },{ key:'공정명',label:'공정명' },
  { key:'물질명',label:'물질명',width:80 },
  { key:'부서이동일',label:'부서이동일' },
  { key:'검사예정일',label:'배치전교육 예정일' },
  { key:'상태',label:'상태',badge:true },
  { key:'배치전날짜',label:'교육 진행일' },
  { key:'비고',label:'비고' },
];
const COLS_배치후예정일: ColDef[] = [
  { key:'사번',label:'사번' },{ key:'성명',label:'성명' },
  { key:'부서명',label:'부서명' },{ key:'공정명',label:'공정명' },
  { key:'배치후검진',label:'배치후예정일' },
  { key:'배치후진행일',label:'배치후진행일' },
  { key:'상태',label:'상태',badge:true },
];
const COLS_종검대상자: ColDef[] = [
  { key:'사번',label:'사번' },{ key:'성명',label:'성명' },
  { key:'소속',label:'소속' },{ key:'직원구분',label:'직원구분' },
  { key:'생년월일',label:'생년월일' },{ key:'만나이',label:'만나이' },
  { key:'입사일',label:'입사일' },{ key:'종검검진일',label:'종검검진일' },
  { key:'지원구분',label:'지원구분',badge:true },{ key:'근무지',label:'근무지' },
];
const COLS_공정: ColDef[] = [
  { key:'사번',label:'사번' },{ key:'성명',label:'성명' },
  { key:'조직',label:'조직' },{ key:'공정명',label:'공정명' },
];
const COLS_공정별유해인자: ColDef[] = [
  { key: '팀',       label: '팀',       width: 80  },
  { key: '공정명',   label: '공정명',   width: 120 },
  { key: '유해인자', label: '유해인자', width: 200 },
];
const COLS_종검: ColDef[] = [
  { key:'사원번호',label:'사원번호' },{ key:'성명',label:'성명' },
  { key:'검진일자',label:'검진일자' },{ key:'부서명',label:'부서명' },
  { key:'근무지',label:'근무지' },{ key:'비고',label:'비고' },
];
const COLS_휴직: ColDef[] = [
  { key:'사번',label:'사번' },{ key:'성명',label:'성명' },
  { key:'소속',label:'소속' },{ key:'근태사유',label:'근태사유',badge:true },
  { key:'종료일',label:'종료일' },{ key:'근무지',label:'근무지' },
];


const TABS: Array<{ label:string; key:string; cols:ColDef[]; derived?:boolean }> = [
  { label:'인명부',           key:'hc_인명부',           cols:COLS_인명부 },
  { label:'25년 EDI',         key:'hc_EDI25',             cols:COLS_EDI },
  { label:'26년 EDI',         key:'hc_EDI26',             cols:COLS_EDI },
  { label:'야간작업자',       key:'hc_야간작업자',       cols:COLS_야간 },
  { label:'특검 대상자',      key:'hc_특검',              cols:COLS_특검 },
  { label:'배치전검진',       key:'hc_배치전검진',       cols:COLS_배치전검진 },
  { label:'배치전교육',       key:'hc_배치전교육',       cols:COLS_배치전교육,       derived:true },
  { label:'종검 대상자',      key:'hc_종검대상자',       cols:COLS_종검대상자,       derived:true },
  { label:'공정확인',         key:'hc_공정',              cols:COLS_공정 },
  { key: 'hc_공정별유해인자', label: '공정별 유해인자', cols: COLS_공정별유해인자 },
  { label:'휴직',             key:'hc_휴직',              cols:COLS_휴직 },
];

/* ── 유틸리티 ────────────────────────────────────────────── */
function fmtDate(d: Date): string {
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function cv(v: unknown): string {
  if (v == null) return '-';
  if (v instanceof Date) return fmtDate(v);
  const s = String(v).trim();
  if (!s || s === 'NaN') return '-';
  if (s.includes('/')) { const p = s.split('/').map(x=>x.trim()).filter(Boolean); if (p.length) return p[0]; }
  return s;
}
function pd2(v: unknown): string {
  if (!v) return '-';
  if (v instanceof Date) return fmtDate(v);
  let s = String(v).trim();
  if (!s || s === 'NaN' || s === '-') return '-';
  if (s.includes('T')) s = s.split('T')[0];
  s = s.replace(/년\s*/g,'-').replace(/월\s*/g,'-').replace(/일\s*/g,'')
       .replace(/[\/\.]/g,'-')   // ← '/'도 추가
       
  // ← 이 블록 추가: 20240301 → 2024-03-01
  if (/^\d{8}$/.test(s.replace(/-/g,''))) {
    const r = s.replace(/-/g,'');
    s = `${r.slice(0,4)}-${r.slice(4,6)}-${r.slice(6,8)}`;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? '-' : fmtDate(d);
}

function nk(k: string) { return k.replace(/[\n\r\s()（）*＊]/g,'').toLowerCase(); }
function findCol(keys: string[], t: string): string|undefined {
  const nt = nk(t);
  return keys.find(k=>nk(k)===nt) ?? keys.find(k=>nk(k).includes(nt)||nt.includes(nk(k)));
}
function extractBirth6(j: unknown): string { return String(j??'').replace(/[^0-9]/g,'').slice(0,6); }
function birthTo6(b: unknown): string {
  const s = String(b??'').replace(/[^0-9]/g,'');
  return s.length===8 ? s.slice(2) : s.slice(0,6);
}
function normalizeEDI(v: string): string {
  const s = v.trim();
  if (s==='완료'||s==='수검') return '수검완료';
  if (s==='해당없음'||s==='제외'||s==='N') return '대상아님';
  if (s==='Y'||s==='해당') return '대상';
  return s;
}

function hasContent(v: unknown): boolean {
  const s = String(v ?? '').trim();
  return s !== '' && s !== '-';
}

function isExcludedLocation(r: Row): boolean {
  const values = [
    String(r['근무지역'] ?? '').trim(),
    String(r['근무지'] ?? '').trim(),
    String(r['부서명'] ?? '').trim(),
    String(r['소속'] ?? '').trim(),
    String(r['사업장'] ?? '').trim(),
    String(r['법인'] ?? '').trim(),
    String(r['근무장소'] ?? '').trim(),
  ].join(' ');

  return ['판교', '해외', '공주'].some(x => values.includes(x));
}
function mergeRows(existing: Row[], incoming: Row[], keyFn: (r: Row) => string): Row[] {
  const map = new Map(existing.map(r => [keyFn(r), r]));
  incoming.forEach(r => { map.set(keyFn(r), { ...r }); });
  return Array.from(map.values()).map((r, i) => ({ ...r, id: i + 1 }));
}
const defaultKey = (r: Row) => {
  const sa = String(r['사번'] ?? '').trim();
  if (sa && sa !== '-') return `sa_${sa}`;
  return `nm_${String(r['성명'] ?? '').trim()}`;
};

function toTs(s: string): number {

  if (!hasContent(s)) return 0;
  const d = new Date(s.replace(/\./g,'-'));
  return isNaN(d.getTime()) ? 0 : d.getTime();
}
function isRetiredRow(r: Row): boolean { return Object.values(r).some(v=>String(v).includes('퇴사')); }
function parseDate(s: string): Date|null {
  if (!hasContent(s)) return null;
  let c = s.replace(/년\s*/g,'-').replace(/월\s*/g,'-').replace(/일\s*/g,'')
           .replace(/\./g,'-').replace(/-{2,}/g,'-').replace(/-$/,'').trim();

  // 월/일만 입력된 경우 (예: 7/1, 7-1) → 올해 연도 자동 추가
  if (/^\d{1,2}[-\/]\d{1,2}$/.test(c)) {
    const parts = c.split(/[-\/]/);
    const year = new Date().getFullYear();
    c = `${year}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
  }

  if (/^\d{8}$/.test(c.replace(/-/g,''))) {
    const r = c.replace(/-/g,'');
    c = `${r.slice(0,4)}-${r.slice(4,6)}-${r.slice(6,8)}`;
  }
  const d = new Date(c);
  return isNaN(d.getTime()) ? null : d;
}

function daysUntil(ds: string): number {
  const t = new Date(); t.setHours(0,0,0,0);
  const d = new Date(ds.replace(/\./g,'-'));
  return Math.ceil((d.getTime()-t.getTime())/86400000);
}
function calc만나이(s: string): number|null {
  const b = parseDate(s); if (!b) return null;
  const t = new Date(); let age = t.getFullYear()-b.getFullYear();
  const m = t.getMonth()-b.getMonth();
  if (m<0||(m===0&&t.getDate()<b.getDate())) age--;
  return age;
}
/** 기기분석실 → 90일, 그 외 → 180일 */
function calc배치후(배치전날짜: string, 공정명: string): string {
  const d = parseDate(배치전날짜); if (!d) return '-';
  d.setDate(d.getDate()+(공정명.includes('기기분석실')?90:180));
  return fmtDate(d);
}
function get알람Items(data: Row[], key: string): Row[] {
  const t = new Date(); t.setHours(0,0,0,0);
  const dl = new Date(t); dl.setDate(dl.getDate()+21);
  return data.filter(r=>{
    const s = String(r[key]??''); if (!hasContent(s)) return false;
    const d = new Date(s.replace(/\./g,'-')); if (isNaN(d.getTime())) return false;
    return d>=t && d<=dl;
  });
}

/* ── 자동 계산 ───────────────────────────────────────────── */
function compute배치전교육(data: Row[]): Row[] {
  const rows = data
    .filter(r =>
      !isRetiredRow(r) &&
      String(r['검진대상여부']??'').trim()==='대상' &&
      String(r['배치전교육']??'').trim()!=='비대상'
    )
    .map((r,i) => {
      const 이동일 = String(r['부서이동일']??'-');
      let 검사예정일 = '-';
      if (hasContent(이동일)) {
        const d = parseDate(이동일);
        if (d) { d.setDate(d.getDate()+90); 검사예정일 = fmtDate(d); }
      }
      const 배치전교육Val = String(r['배치전교육'] ?? '').trim();
const 교육진행일 = (() => {
  const parsed = parseDate(배치전교육Val);
  return parsed ? fmtDate(parsed) : '-';
})();
const done = ['O', 'o', '○', '완료'].includes(배치전교육Val)
  || (hasContent(교육진행일) && 교육진행일 !== '-');
      let 상태 = '-';
      if (done) { 상태 = '완료'; }
      else if (검사예정일 !== '-') {
        const days = daysUntil(검사예정일);
        상태 = days<0 ? '기한초과' : days===0 ? 'D-day' : `D-${days}`;
      }
      return {
        id: `edu-${i+1}`,
        사번: r['사번'] ?? '-',
        성명: r['성명'] ?? '-',
        부서명: r['부서명'] ?? '-',
        공정명: r['공정명'] ?? '-',
        물질명: r['물질명'] ?? '-',
        부서이동일: 이동일,
        검사예정일,
        상태,
        배치전날짜: 교육진행일,
        비고: r['비고'] ?? '-',
        근무지역: r['근무지역'] ?? '-',
        근무지: r['근무지'] ?? '-',
        소속: r['소속'] ?? '-',
        사업장: r['사업장'] ?? '-',
        법인: r['법인'] ?? '-',
        근무장소: r['근무장소'] ?? '-',
      };
    });
  const active = rows.filter(r => r['상태'] !== '완료');
  const done   = rows.filter(r => r['상태'] === '완료');
  active.sort((a,b)=>toTs(String(a['검사예정일']))-toTs(String(b['검사예정일'])));
  return [...active,...done];
}


function compute배치후예정일(data: Row[]): Row[] {
  const rows = data
    .filter(r => !isRetiredRow(r) && hasContent(r['배치전날짜']))
    .map((r,i) => {
      const 대상여부 = String(r['검진대상여부']??'').trim();
      const 특이    = String(r['특이사항']??'').trim();
      if (특이.includes('특검') || 대상여부==='비대상' || 대상여부==='대상아님' || 대상여부==='제외') {
        return { ...r, 배치후검진:'-', 상태:'비대상' };
      }
      const raw    = String(r['배치후예정일']??'').trim();
      const 예정일 = hasContent(raw) ? raw : calc배치후(String(r['배치전날짜']), String(r['공정명']??''));
      const 완료   = hasContent(r['배치후진행일']);
      let 상태 = '-';
      if (완료) { 상태 = '완료'; }
      else if (hasContent(예정일)) {
        const days = daysUntil(예정일);
        상태 = days<0 ? '기한초과' : days===0 ? 'D-day' : `D-${days}`;
      }
      return { ...r, 배치후예정일:예정일, 상태 };
    });

  const urgent = rows.filter(r=>{
    const s = String(r['상태']??'');
    if (s==='기한초과'||s==='D-day') return true;
    const m = s.match(/^D-(\d+)$/); return m ? Number(m[1])<=21 : false;
  });
  const normal = rows.filter(r=>{
    const s = String(r['상태']??'');
    if (s==='기한초과'||s==='D-day'||s==='완료'||s==='비대상') return false;
    const m = s.match(/^D-(\d+)$/); return m ? Number(m[1])>21 : hasContent(s);
  });
  const done   = rows.filter(r=>r['상태']==='완료');
  const 비대상 = rows.filter(r=>r['상태']==='비대상');
  urgent.sort((a,b)=>toTs(String(a['배치후예정일']))-toTs(String(b['배치후예정일'])));
  normal.sort((a,b)=>toTs(String(a['배치후예정일']))-toTs(String(b['배치후예정일'])));
  return [...urgent,...normal,...done,...비대상];
}

function compute종검대상자(인명부: Row[], 종검: Row[]): Row[] {
  const today = new Date(); today.setHours(0,0,0,0);
  const currentYear = today.getFullYear();
  const isCurrentYearEven = currentYear % 2 === 0;
  const result: Row[] = [];

  인명부.forEach(r => {
    if (String(r['휴직'] ?? '') === 'O') return;
    if (String(r['검진필요'] ?? '').includes('휴직')) return;
    if (isRetiredRow(r)) return;

    const 직원구분 = String(r['직원구분'] ?? '');
    let computedStart = '-';
    let 지원구분 = '-';
    let ok = false;

    const age = calc만나이(String(r['생년월일'] ?? '-'));
    const birthDate = parseDate(String(r['생년월일'] ?? '-'));
    const birthYear = birthDate ? birthDate.getFullYear() : null;

    if (직원구분.includes('정규직')) {
      const d = parseDate(String(r['입사일'] ?? '-'));
      if (!d) return;
      // 입사 다음달 1일 (8월 입사 → 9월 1일 자동 처리)
      const g = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      computedStart = fmtDate(g);
      if (today < g) return;

      if (age !== null && age >= 35) {
        지원구분 = '정규직 매년';
        ok = true;
      } else if (age !== null && age < 35 && birthYear !== null) {
        // 짝수 년도 → 짝수 년생 해당 / 홀수 년도 → 홀수 년생 해당
        const isBirthYearEven = birthYear % 2 === 0;
if (isCurrentYearEven === isBirthYearEven) {
  지원구분 = '정규직 격년 (해당)';
  ok = true;
} else {
  // 비해당 연도는 목록에서 제외
  ok = false;
}
      } else {
        지원구분 = '확인필요';
        ok = true;
      }
    } else if (직원구분.includes('계약직')) {
  const d = parseDate(String(r['입사일'] ?? '-'));
  if (!d) return;
  const d90 = new Date(d);
  d90.setDate(d90.getDate() + 90);
  const g = new Date(d90.getFullYear(), d90.getMonth() + 1, 1);
  computedStart = fmtDate(g);
  if (today >= g) {
    지원구분 = '계약직 90일 (해당)';
  } else {
    지원구분 = '계약직 90일 (비해당)';
  }
  ok = true; // 목록엔 표시, 카운터에서만 제외
}

    const final종검검진일 = (r['종검검진일'] && String(r['종검검진일']).trim() && String(r['종검검진일']).trim() !== '-')
  ? String(r['종검검진일']).trim()
  : '-';

    // 올해 처음 지원 대상이 된 경우 → 주황색
    const startDate = parseDate(computedStart);
    const isNew = startDate !== null 
  && startDate.getFullYear() === today.getFullYear()
  && startDate.getMonth() === today.getMonth();

    if (ok) {
      result.push({
        ...r,
        id: result.length + 1,
        만나이: age !== null ? `${age}세` : '-',
        종검검진일: final종검검진일,
        지원구분,
        _isNew: isNew ? 'Y' : 'N',
      });
    }
  });
  return result;
}



/* ── 배치전검진 정렬 ─────────────────────────────────────── */
function sort배치전Data(data: Row[]): Row[] {
  const today = new Date(); today.setHours(0,0,0,0);
  const dl    = new Date(today); dl.setDate(dl.getDate()+21);
  const is비대상 = (r:Row)=>{ const v=String(r['검진대상여부']??'').trim(); return v==='비대상'||v==='대상아님'||v==='제외'; };
  const is알람   = (r:Row)=>{ const s=String(r['배치후예정일']??''); if (!hasContent(s)) return false; const d=new Date(s.replace(/\./g,'-')); return !isNaN(d.getTime())&&d>=today&&d<=dl; };
  const isDone   = (r:Row)=>hasContent(r['배치후진행일']);
  const alarm   = data.filter(r=>!isRetiredRow(r)&&!is비대상(r)&&is알람(r));
  const active  = data.filter(r=>!isRetiredRow(r)&&!is비대상(r)&&!is알람(r)&&!isDone(r));
  const 비대상g = data.filter(r=>!isRetiredRow(r)&&is비대상(r));
  const post    = data.filter(r=>!isRetiredRow(r)&&!is비대상(r)&&!is알람(r)&&isDone(r));
  const retired = data.filter(r=>isRetiredRow(r));
  alarm.sort((a,b)=>toTs(String(a['배치후예정일']))-toTs(String(b['배치후예정일'])));
  active.sort((a,b)=>toTs(String(b['부서이동일']))-toTs(String(a['부서이동일'])));
  비대상g.sort((a,b)=>toTs(String(b['부서이동일']))-toTs(String(a['부서이동일'])));
  return [...alarm,...active,...비대상g,...post,...retired];
}

/* ── 연동 함수 ───────────────────────────────────────────── */
function syncYaganToInMyungBu(인명부: Row[], 야간: Row[]): Row[] {
  const bySA = new Map(
    야간.filter(r => r['사번'] && r['사번'] !== '-')
        .map(r => [String(r['사번']).trim(), String(r['검진일'] ?? '-')])
  );
  const byNM = new Map(
    야간.filter(r => !r['사번'] || r['사번'] === '-')
        .map(r => [String(r['성명']).trim(), String(r['검진일'] ?? '-')])
  );
  return 인명부.map(r => {
    const v = bySA.get(String(r['사번'] ?? '').trim())
           ?? byNM.get(String(r['성명']).trim());
    if (v === undefined) return { ...r, 야간: '/' };         // 대상 아님
    return { ...r, 야간: hasContent(v) ? v : 'O' };          // 날짜 or O
  });
}
type SpecialEntry = {
  hasSpecial: boolean;
  hasRadiation: boolean;
  specialDate: string;
  radiationDate: string;
};

function syncSpecialToInMyungBu(인명부: Row[], 특검: Row[]): Row[] {
  type Entry = { hasSp: boolean; hasRd: boolean; spDate: string; rdDate: string };
  const bySA = new Map<string, Entry>();
  const byNM = new Map<string, Entry>();

  특검.forEach(r => {
    const isSp   = hasContent(r['유해인자']);
    const isRd   = String(r['방사선'] ?? '').trim() === 'O';
    const date   = hasContent(r['검진일']) && String(r['검진일']) !== '-'
                   ? String(r['검진일']) : '-';
    const sa     = r['사번'] && r['사번'] !== '-' ? String(r['사번']).trim() : null;
    const nm     = String(r['성명'] ?? '').trim();

    const merge = (m: Map<string, Entry>, k: string) => {
      const p = m.get(k);
      m.set(k, {
        hasSp:  isSp || (p?.hasSp  ?? false),
        hasRd:  isRd || (p?.hasRd  ?? false),
        spDate: isSp && date !== '-' ? date : (p?.spDate ?? '-'),  // 특검 날짜
        rdDate: isRd && date !== '-' ? date : (p?.rdDate ?? '-'),  // 방사선 날짜
      });
    };

    if (sa) merge(bySA, sa);
    else if (nm) merge(byNM, nm);
  });

  return 인명부.map(r => {
    const e = bySA.get(String(r['사번'] ?? '').trim())
           ?? byNM.get(String(r['성명']).trim());

    const 특검값   = e?.hasSp ? (e.spDate !== '-' ? e.spDate : 'O') : '/';
    const 방사선값 = e?.hasRd ? (e.rdDate !== '-' ? e.rdDate : 'O') : '/';

    return { ...r, 특검: 특검값, 방사선: 방사선값 };
  });
}



function syncEDIToInMyungBu(인명부: Row[], e25: Row[], e26: Row[]): {result:Row[];matched25:number;matched26:number;nameOnly:number} {
  const mk   = (n:string,b6:string)=>b6?`${n.trim()}_${b6}`:'';
  const mkIn = (n:string,b:string)=>{ const b6=birthTo6(b); return b6?`${n.trim()}_${b6}`:''; };
  const m25b = new Map(e25.filter(r=>r['주민번호']).map(r=>[mk(String(r['성명']),String(r['주민번호'])),r['일반검진']]));
  const m26b = new Map(e26.filter(r=>r['주민번호']).map(r=>[mk(String(r['성명']),String(r['주민번호'])),r['일반검진']]));
  const m25n = new Map(e25.map(r=>[String(r['성명']).trim(),r['일반검진']]));
  const m26n = new Map(e26.map(r=>[String(r['성명']).trim(),r['일반검진']]));
  let c25=0, c26=0, cN=0;
  const result = 인명부.map(r=>{
    const u={...r}, nm=String(r['성명']).trim(), ik=mkIn(nm,String(r['생년월일']??'')), hb=!!ik;
    if (hb&&m25b.has(ik))      { u['수검25']=m25b.get(ik)??r['수검25']; c25++; }
    else if (!hb&&m25n.has(nm)){ u['수검25']=m25n.get(nm)??r['수검25']; cN++; }
    if (r['EDI26']!=='26년입사') {
      if (hb&&m26b.has(ik))      { u['EDI26']=m26b.get(ik)??r['EDI26']; c26++; }
      else if (!hb&&m26n.has(nm)){ u['EDI26']=m26n.get(nm)??r['EDI26']; }
    }
    return u;
  });
  return {result,matched25:c25,matched26:c26,nameOnly:cN};
}
function sync공정ToInMyungBu(인명부: Row[], 공정: Row[]): Row[] {
  if (!공정.length) return 인명부;
  const bySA = new Map(
    공정.filter(r => r['사번'] && r['사번'] !== '-')
        .map(r => [String(r['사번']).trim(), String(r['공정명'] ?? '-')])
  );
  const byNM = new Map(
    공정.filter(r => !r['사번'] || r['사번'] === '-')
        .map(r => [String(r['성명']).trim(), String(r['공정명'] ?? '-')])
  );
  return 인명부.map(r => {
    const matched = bySA.get(String(r['사번'] ?? '').trim())
                 ?? byNM.get(String(r['성명']).trim());
    if (!matched) return r;
    return { ...r, 공정명: matched };  // 공정명만 업데이트, 특검/방사선 건드리지 않음
  });
}




function applyAllSync(
  인명부: Row[], e25: Row[], e26: Row[], 야간: Row[], 특검: Row[],
  공정: Row[] = []   // ← 6번째 파라미터 추가
): {result:Row[];matched25:number;matched26:number;nameOnly:number} {
  const edi = syncEDIToInMyungBu(인명부, e25, e26);
  return {
    ...edi,
    result: sync공정ToInMyungBu(
      syncSpecialToInMyungBu(syncYaganToInMyungBu(edi.result, 야간), 특검),
      공정
    ),
    
  };
}



/* ── 파싱 함수 ───────────────────────────────────────────── */
function parseEDIFile(rows: Record<string,unknown>[]): Row[] {
  if (!rows.length) return [];
  const ks = Object.keys(rows[0]);
  const jK = findCol(ks,'주민번호')??findCol(ks,'주민등록번호')??findCol(ks,'생년월일')??findCol(ks,'증번호');
  const nK = findCol(ks,'성명')??findCol(ks,'이름');
  const G  = (t:string)=>findCol(ks,t);
  return rows
    .filter(r=>{ if(!nK)return false; const n=String(r[nK]??'').trim(); return n&&n!=='-'&&n!=='성명'; })
    .map((r,i)=>({
      id:i+1, 성명:nK?cv(r[nK]):'-', 주민번호:extractBirth6(jK?r[jK]:''),
      근무구분:G('근무구분')?cv(r[G('근무구분')!]):'-',
      부서:(G('부서')??G('부서명'))?cv(r[(G('부서')??G('부서명'))!]):'-',
      국가암:G('국가암')?cv(r[G('국가암')!]):'-',
      일반검진:normalizeEDI(G('일반검진')?cv(r[G('일반검진')!]):'-'),
      구강검진:G('구강검진')?normalizeEDI(cv(r[G('구강검진')!])):'-',
      위암:G('위암')?normalizeEDI(cv(r[G('위암')!])):'-',
      유방암:G('유방암')?normalizeEDI(cv(r[G('유방암')!])):'-',
      대장암:G('대장암')?normalizeEDI(cv(r[G('대장암')!])):'-',
      자궁경부암:G('자궁경부암')?normalizeEDI(cv(r[G('자궁경부암')!])):'-',
    }));
}
function parseYaganFile(rows: Record<string,unknown>[]): Row[] {
  return rows
    .filter(r=>{ const k=findCol(Object.keys(r),'성명'); return k&&String(r[k]??'').trim()&&String(r[k]??'').trim()!=='성명'; })
    .map((r,i)=>{
      const ks=Object.keys(r);
      const g=(t:string)=>{ const k=findCol(ks,t); return k?cv(r[k]):'-'; };
      const pd=(t:string)=>{ const k=findCol(ks,t); return k?pd2(r[k]):'-'; };
      return {id:i+1,사번:g('사번'),성명:g('성명'),야간작업:g('야간작업'),검진일:pd('검진일'),비고:g('비고')};
    });
}
function parseSpecialFile(rows: Record<string,unknown>[]): Row[] {
  return rows
    .filter(r=>{ const k=findCol(Object.keys(r),'성명'); return k&&String(r[k]??'').trim()&&String(r[k]??'').trim()!=='성명'; })
    .map((r,i)=>{
      const ks=Object.keys(r);
      const g=(t:string)=>{ const k=findCol(ks,t); return k?cv(r[k]):'-'; };
      const pd=(t:string)=>{ const k=findCol(ks,t); return k?pd2(r[k]):'-'; };
      const 방Raw = g('방사선');
      return {id:i+1,사번:g('사번'),성명:g('성명'),공정명:g('공정명'),유해인자:g('유해인자'),
        방사선:(방Raw==='O'||방Raw==='o'||방Raw==='○')?'O':'-',검진일:pd('검진일'),비고:g('비고')};
    });
}
function parse배치전File(rows: Record<string, unknown>[]): Row[] {
  return rows
    .filter(r => {
      const k = findCol(Object.keys(r), '성명');
      return k && String(r[k] ?? '').trim() && String(r[k] ?? '').trim() !== '성명';
    })
    .map((r, i) => {
      const ks = Object.keys(r);
      const g  = (t: string) => { const k = findCol(ks, t); return k ? cv(r[k])  : '-'; };
      const pd = (t: string) => { const k = findCol(ks, t); return k ? pd2(r[k]) : '-'; };

      const 공정명     = g('공정명');
      const 배치전날짜 = pd('배치전날짜');
      const 예정Raw    = pd('배치후예정일');
const 배치전교육Raw = g('배치전교육');
let 배치전교육 = 배치전교육Raw.trim().normalize('NFC');
if (hasContent(배치전교육) && 배치전교육 !== '-') {
  const parsed = parseDate(배치전교육);
  if (parsed) 배치전교육 = 'O';
}
      return {
    id:     `post-${r.id ?? i}`,
    사번:         g('사번'),
    성명:         g('성명'),
    부서명:       g('부서명'),
    공정명,
    검진대상여부: g('검진대상여부'),
    부서이동일:   pd('부서이동일'),
    물질명:       g('물질명'),
    배치전날짜,
    배치전교육,    
    배치후:       g('배치후'),
    배치후예정일:   hasContent(예정Raw) ? 예정Raw : calc배치후(배치전날짜, 공정명),
    배치후진행일: pd('배치후진행일'),
    특이사항:     g('특이사항'),
    근무지역:     g('근무지역'),
    비고: g('비고'), 
  };
    });
}
function parse공정File(rows: Record<string,unknown>[]): Row[] {
  return rows
    .filter(r=>{ const k=findCol(Object.keys(r),'성명'); return k&&String(r[k]??'').trim()&&String(r[k]??'').trim()!=='성명'; })
    .map((r,i)=>{ const ks=Object.keys(r); const g=(t:string)=>{ const k=findCol(ks,t); return k?cv(r[k]):'-'; };
      return {id:i+1, 사번:g('사번'), 성명:g('성명'), 조직:g('조직'), 공정명:g('공정명')}; }); 
}

function parse종검File(rows: Record<string,unknown>[]): Row[] {
  return rows
    .filter(r=>{ const k=findCol(Object.keys(r),'성명'); return k&&String(r[k]??'').trim()&&String(r[k]??'').trim()!=='성명'; })
    .map((r,i)=>{ const ks=Object.keys(r);
      const g=(t:string)=>{ const k=findCol(ks,t); return k?cv(r[k]):'-'; };
      const pd=(t:string)=>{ const k=findCol(ks,t); return k?pd2(r[k]):'-'; };
      return {id:i+1,사원번호:g('사원번호'),성명:g('성명'),검진일자:pd('검진일자'),부서명:g('부서명'),근무지:g('근무지'),비고:g('비고')}; });
}
function parseInMyungBu(rows: Record<string,unknown>[]): Row[] {
  return rows
    .filter(r=>{ const ks=Object.keys(r); const k=ks.find(k2=>nk(k2)==='성명'); return k&&r[k]&&String(r[k]).trim(); })
    .map((r,i)=>{
      const ks=Object.keys(r);
      const g=(...ps:string[]):string=>{ for(const p of ps){ const k=findCol(ks,p); if(k&&r[k]!=null)return cv(r[k]); } return '-'; };
      const pd=(t:string)=>{ const k=findCol(ks,t); return k?pd2(r[k]):'-'; };
      return {id:i+1, 소속:g('소속'), 공정명: g('공정명'), 사번:g('사번'), 성명:g('성명'), 생년월일:g('생년월일'),
        성별:g('성별'), 직종:g('직종'), 근무지:g('근무지'), 직원구분:g('직원구분'), 입사일:pd('입사일'),
        수검25:g('25년도수검자','25년EDI','25년'), EDI26:g('26년도EDI대상','26년EDI','EDI대상'),
        일반:g('일반'), 특검:g('특검'), 야간:g('야간'),
        배치전:g('배치전'), 방사선:g('방사선'), 종검:g('종검대상','종검'),
        종검검진일:pd('종검검진일')!=='-'?pd('종검검진일'):pd('검진일'),
        휴직:g('휴직파견','휴직')};
    });
}
/* ── EditableTable ─────────────────────────────────────── */
function EditableTable({
  data = [], cols = [], onUpdate, syncBadge, onEDIUpload, onFileUpload,
  onTemplateDownload, tabKey, onAutoCalc, alertIds, readOnly, orangeIds,
}: {
  data: Row[]; cols: ColDef[];
 onUpdate: (d: Row[]) => void;
  syncBadge?: boolean; onEDIUpload?: (file: File) => void;
  onFileUpload?: (file: File) => void; onTemplateDownload?: () => void;
  tabKey?: string; onAutoCalc?: (row: Row) => Row;
  alertIds?: Set<string|number>; readOnly?: boolean;
  orangeIds?: Set<string|number>;
}) {const [colWidths, setColWidths] = useState<Record<string,number>>({});
const resizingRef = useRef<{key:string, startX:number, startW:number}|null>(null);
const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

const handleResizeStart = (e: React.MouseEvent, key: string) => {
  e.preventDefault();
  e.stopPropagation();
  const th = (e.target as HTMLElement).closest('th') as HTMLElement;
  const startW = th ? th.offsetWidth : (colWidths[key] ?? 100);
  resizingRef.current = { key, startX: e.clientX, startW };
  const onMove = (ev: MouseEvent) => {
  if (!resizingRef.current) return;
  const { key, startX, startW } = resizingRef.current;
  const diff = ev.clientX - startX;
  const newW = Math.max(40, startW + diff);
  setColWidths(prev => ({ ...prev, [key]: newW }));
};

  const onUp = () => {
    resizingRef.current = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
};

  const [editId, setEditId] = useState<string|number|null>(null);
  const [editRow, setEditRow]     = useState<Row|null>(null);
  const [search, setSearch]       = useState('');
  const [contextMenu, setContextMenu] = useState<{x:number;y:number;rowId:string}|null>(null);
  const [pendingRow, setPendingRow] = useState<Row|null>(null);
const [배치전안내Set, set배치전안내Set] = useState<Set<string>>(new Set());
const [배치후안내Set, set배치후안내Set] = useState<Set<string>>(new Set());
const [selectedIds, setSelectedIds] = useState<(string|number)[]>([]);
const allCheckRef = useRef<HTMLInputElement>(null);
const isSelectable = tabKey === 'hc_배치전검진' || tabKey === 'hc_종검대상자' || tabKey === 'hc_배치전교육';
const isCompletedRow = (r: Row): boolean => {
  if (tabKey === 'hc_배치전교육') return String(r['상태'] ?? '') === '완료';
  if (tabKey === 'hc_배치전검진') return hasContent(String(r['배치전날짜'] ?? ''));
  if (tabKey === 'hc_종검대상자') return String(r['_isNew'] ?? '') !== 'Y';  // ← 주황색(신규)만 선택 가능
  return false;
};

const toggleSelect = (id: string|number) =>
  setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

const toggleAll = () => {
  if (allSelected) {
    setSelectedIds(prev => prev.filter(id => !selectableFiltered.map(r => r.id).includes(id)));
  } else {
    setSelectedIds(prev => [...new Set([...prev, ...selectableFiltered.map(r => r.id)])]);
  }
};

const downloadSelected = async () => {
  const rows = filtered.filter(r => selectedIds.includes(r.id));
  if (!rows.length) { alert('선택된 인원이 없습니다.'); return; }
  const XLSX = await import('xlsx');

  let sheetData: Record<string, string>[];
  let sheetName: string;
  let fileName: string;

  if (tabKey === 'hc_종검대상자') {
  sheetData = rows.map(r => ({
    '사번':       String(r['사번']       ?? ''),
    '성명':       String(r['성명']       ?? ''),
    '소속':       String(r['소속']       ?? ''),
    '직원구분':   String(r['직원구분']   ?? ''),
    '생년월일':   String(r['생년월일']   ?? ''),
    '만나이':     String(r['만나이']     ?? ''),
    '입사일':     String(r['입사일']     ?? ''),
    '종검검진일': String(r['종검검진일'] ?? ''),
    '지원구분':   String(r['지원구분']   ?? ''),
    '근무지':     String(r['근무지']     ?? ''),
  }));
  sheetName = '종검대상자_선택인원';
  fileName  = `종검대상자_선택인원_${selectedCount}명.xlsx`;

// ✅ 이 블록 추가
} else if (tabKey === 'hc_배치전교육') {
  sheetData = rows.map(r => ({
    '사번':           String(r['사번']       ?? ''),
    '성명':           String(r['성명']       ?? ''),
    '부서명':         String(r['부서명']     ?? ''),
    '공정명':         String(r['공정명']     ?? ''),
    '물질명':         String(r['물질명']     ?? ''),
    '부서이동일':     String(r['부서이동일'] ?? ''),
    '배치전교육 예정일': String(r['검사예정일'] ?? ''),
    '상태':           String(r['상태']       ?? ''),
    '교육 진행일':    String(r['배치전날짜'] ?? ''),
  }));
  sheetName = '배치전교육_선택인원';
  fileName  = `배치전교육_선택인원_${selectedCount}명.xlsx`;

} else {
  sheetData = rows.map(r => ({
    '사번':       String(r['사번']       ?? ''),
    '성명':       String(r['성명']       ?? ''),
    '부서명':     String(r['부서명']     ?? ''),
    '공정명':     String(r['공정명']     ?? ''),
    '부서이동일': String(r['부서이동일'] ?? ''),
    '물질명':     String(r['물질명']     ?? ''),
  }));
  sheetName = '배치전검진_선택인원';
  fileName  = `배치전검진_선택인원_${selectedCount}명.xlsx`;
}

  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
};


const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
const [openFilter, setOpenFilter] = useState<string|null>(null);
const [filterSearch, setFilterSearch] = useState<string>('');
const [sortConfig, setSortConfig] = useState<{key:string, dir:'asc'|'desc'}|null>(null);
const [filterPos, setFilterPos] = useState<{x:number, y:number}>({x:0, y:0});

  const ediFileRef = useRef<HTMLInputElement>(null);
  const tabFileRef = useRef<HTMLInputElement>(null);

  const displayData = pendingRow ? [...data, pendingRow] : data;
const filtered = displayData
  .filter(r => !search || Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase())))
  .filter(r => Object.entries(colFilters).every(([key, vals]) => vals.includes(String(r[key] ?? ''))));
  const selectableFiltered = filtered.filter(r => !isCompletedRow(r));
const allSelected  = isSelectable && selectableFiltered.length > 0 && selectableFiltered.every(r => selectedIds.includes(r.id));
const someSelected = isSelectable && !allSelected && selectableFiltered.some(r => selectedIds.includes(r.id));
const selectedCount = isSelectable ? selectableFiltered.filter(r => selectedIds.includes(r.id)).length : 0;
useEffect(() => {
  if (allCheckRef.current) allCheckRef.current.indeterminate = someSelected;
}, [someSelected]);
  const startEdit = (r: Row) => { setEditId(r.id); setEditRow({...r}); };
  const cancel = () => {
  setPendingRow(null);
  setEditId(null);
  setEditRow(null);
};
  const save = () => {
  if (!editRow) return;
  const finalRow = onAutoCalc ? onAutoCalc(editRow) : editRow;
  if (pendingRow && finalRow.id === pendingRow.id) {
    onUpdate([...dataRef.current, finalRow]); // 처음으로 저장
    setPendingRow(null);
  } else {
    onUpdate(dataRef.current.map(r => r.id === finalRow.id ? finalRow : r));
  }
  setEditId(null);
  setEditRow(null);
};
  const del = (id: string|number) => {
  if (!window.confirm('이 행을 삭제하시겠습니까?')) return;
  onUpdate(dataRef.current.filter(r => r.id !== id));
};
  const addRow = () => {
  if (editId !== null) return; // 이미 편집 중이면 추가 방지
  const newId = `new-${Date.now()}`;
  const blank: Row = { id: newId };
  cols.forEach(c => { blank[c.key] = '-'; });
  setPendingRow(blank);       // 로컬에만 보관
  setEditId(newId);
  setEditRow({ ...blank });
};

  const handleFieldChange = (colKey: string, value: string) => {
    setEditRow(p=>{
      if (!p) return p;
      const updated = {...p, [colKey]:value};
      if (onAutoCalc && (colKey==='배치전날짜'||colKey==='공정명')) {
        return onAutoCalc(updated);
      }
      return updated;
    });
  };

  const TH: React.CSSProperties = { padding:'9px 10px', textAlign:'left', fontWeight:600, color:'#374151', fontSize:'12px', whiteSpace:'nowrap', background:'#f9fafb', borderBottom:'1px solid #e5e7eb', position:'sticky', top:0, zIndex:1 };
  const TD: React.CSSProperties = { padding:'7px 10px', fontSize:'12px', color:'#374151', whiteSpace:'nowrap', borderBottom:'1px solid #f3f4f6' };
  const HIGHLIGHT_COLS = ['유해인자','공정명','야간작업'];

  return (
    <div>
      {/* 툴바 */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="이름, 사번 검색..."
            style={{padding:'7px 12px',border:'1px solid #e5e7eb',borderRadius:'8px',fontSize:'13px',outline:'none',width:'200px'}} />
          <span style={{fontSize:'12px',color:'#9ca3af'}}>{filtered.length}건</span>

{isSelectable && (
  <button
    onClick={toggleAll}
    style={{
      padding:'5px 12px',
      background: allSelected ? '#fee2e2' : '#f3f4f6',
      color:      allSelected ? '#dc2626' : '#374151',
      border:`1px solid ${allSelected ? '#fca5a5' : '#d1d5db'}`,
      borderRadius:'8px', fontSize:'12px',
      cursor:'pointer', fontWeight:600,
    }}
  >
    {allSelected ? '전체 해제' : '전체 선택'}
  </button>
)}
{isSelectable && selectedCount > 0 && (
  <>
    <span style={{fontSize:'12px',fontWeight:700,background:'#e0f2fe',color:'#0369a1',padding:'2px 10px',borderRadius:'5px'}}>
      {selectedCount}명 선택됨
    </span>
    <button onClick={downloadSelected}
      style={{padding:'5px 12px',background:'#0369a1',color:'#fff',border:'none',borderRadius:'8px',fontSize:'12px',cursor:'pointer',fontWeight:700}}>
      {tabKey === 'hc_종검대상자' ? '종검대상자'
        : tabKey === 'hc_배치전교육' ? '배치전교육'
        : '배치전검진'} 선택 다운로드 ({selectedCount}명)
    </button>
  </>
)}

          {syncBadge && <span style={{fontSize:'11px',background:'#ede9fe',color:'#5b21b6',padding:'3px 8px',borderRadius:'4px',fontWeight:600}}>EDI 자동 연동 중</span>}
          {readOnly  && <span style={{fontSize:'11px',background:'#f0fdf4',color:'#166534',padding:'3px 8px',borderRadius:'4px',fontWeight:600}}>자동 계산 (읽기 전용)</span>}
        </div>
        {(!readOnly || onTemplateDownload || onFileUpload) && (
  <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            {onEDIUpload && (<>
              <input ref={ediFileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}}
                onChange={e=>{ const f=e.target.files?.[0]; if(f)onEDIUpload(f); if(ediFileRef.current)ediFileRef.current.value=''; }} />
              <button onClick={()=>ediFileRef.current?.click()}
                style={{padding:'7px 14px',background:'#7c3aed',color:'#fff',border:'none',borderRadius:'8px',fontSize:'12px',cursor:'pointer',fontWeight:600}}>EDI 파일 업로드</button>
            </>)}
            {onTemplateDownload && (
              <button onClick={onTemplateDownload}
                style={{padding:'7px 14px',background:'#fff',color:'#374151',border:'1px solid #d1d5db',borderRadius:'8px',fontSize:'12px',cursor:'pointer',fontWeight:600}}>양식 다운로드</button>
            )}
            {onFileUpload && (<>
              <input ref={tabFileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}}
                onChange={e=>{ const f=e.target.files?.[0]; if(f)onFileUpload(f); if(tabFileRef.current)tabFileRef.current.value=''; }} />
              <button onClick={()=>tabFileRef.current?.click()}
                style={{padding:'7px 14px',background:'#0369a1',color:'#fff',border:'none',borderRadius:'8px',fontSize:'12px',cursor:'pointer',fontWeight:600}}>파일 업로드</button>
            </>)}
            <button onClick={addRow}
              style={{padding:'7px 14px',background:'#16a34a',color:'#fff',border:'none',borderRadius:'8px',fontSize:'12px',cursor:'pointer',fontWeight:600}}>+ 행 추가</button>
          </div>
        )}
      </div>

      {/* 테이블 */}
      <div style={{border:'1px solid #e5e7eb',borderRadius:'10px',overflow:'auto',maxHeight:'500px',minHeight:'200px',resize:'vertical'}}>
        <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
          <thead style={{ position:'sticky', top:0, zIndex:10 }}>
            <tr>
             {isSelectable && (
      <th style={{
        ...TH,
        width:'44px', minWidth:'44px', maxWidth:'44px',
        textAlign:'center', backgroundColor:'#fff',
      }}>
        <input
          ref={allCheckRef}
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          style={{cursor:'pointer'}}
        />
      </th>
    )} 

              <th style={{ 
  ...TH, 
  position:'sticky', top:0, backgroundColor:'#fff',
  width:'44px', minWidth:'44px', maxWidth:'44px'  // ← 추가
}}>No</th>
              {cols.map(c => {
  const isFiltered   = !!colFilters[c.key];
  const isSorted     = sortConfig?.key === c.key;
  const uniqueVals   = [...new Set(data.map(r => String(r[c.key] ?? '-')))].sort((a,b)=>a.localeCompare(b,'ko'));
  const selectedVals = colFilters[c.key] ?? uniqueVals;
  const dropdownVals = !filterSearch ? uniqueVals : uniqueVals.filter(v => v.toLowerCase().includes(filterSearch.toLowerCase()));
  const allChecked   = !isFiltered;

  function handleColAllCheck() {
    if (allChecked) {
      setColFilters(prev => ({ ...prev, [c.key]: [] }));
    } else {
      setColFilters(prev => { const r = {...prev}; delete r[c.key]; return r; });
    }
  }

  return (
    <th key={c.key} style={{
      ...TH, position:'sticky', top:0, userSelect:'none',
      backgroundColor:'#fff',
      ...(colWidths[c.key]
        ? {width:colWidths[c.key], minWidth:colWidths[c.key], maxWidth:colWidths[c.key]}
        : c.width ? {width:c.width, minWidth:c.width, maxWidth:c.width} : {}
      )
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'4px'}}>
        <span>{c.label}</span>
        <button
          data-filter-dropdown
          onClick={e=>{
            e.stopPropagation();
            setFilterSearch('');
            if (openFilter !== c.key) {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setFilterPos({ x: rect.left, y: rect.bottom + 4 });
            }
            setOpenFilter(prev => prev === c.key ? null : c.key);
          }}
          style={{
            flexShrink:0, padding:'1px 4px', borderRadius:'3px', fontSize:'10px',
            cursor:'pointer', lineHeight:'16px',
            background: (isFiltered||isSorted) ? '#2563eb' : 'transparent',
            color:       (isFiltered||isSorted) ? '#fff'    : '#9ca3af',
            border:`1px solid ${(isFiltered||isSorted)?'#2563eb':'#d1d5db'}`,
          }}
        >▼</button>
      </div>
      {openFilter === c.key && createPortal(
        <div data-filter-dropdown style={{
          position:'fixed', top:filterPos.y, left:filterPos.x, zIndex:9999,
          background:'#fff', border:'1px solid #e5e7eb', borderRadius:'8px',
          minWidth:'180px', maxHeight:'320px',
          boxShadow:'0 4px 16px rgba(0,0,0,0.13)',
          display:'flex', flexDirection:'column',
        }}>
          <div style={{padding:'8px 10px', borderBottom:'1px solid #f3f4f6'}}>
            <button
              onClick={()=>{ setSortConfig({key:c.key,dir:'asc'}); setOpenFilter(null); }}
              style={{
                display:'block', width:'100%', textAlign:'left',
                padding:'5px 8px', fontSize:'12px', cursor:'pointer', borderRadius:'5px', border:'none',
                background: isSorted&&sortConfig?.dir==='asc' ? '#eff6ff' : 'transparent',
                color:      isSorted&&sortConfig?.dir==='asc' ? '#2563eb' : '#374151',
                fontWeight: isSorted&&sortConfig?.dir==='asc' ? 700 : 400,
              }}
            >▲ 오름차순 정렬</button>
            <button
              onClick={()=>{ setSortConfig({key:c.key,dir:'desc'}); setOpenFilter(null); }}
              style={{
                display:'block', width:'100%', textAlign:'left',
                padding:'5px 8px', fontSize:'12px', cursor:'pointer', borderRadius:'5px', border:'none',
                background: isSorted&&sortConfig?.dir==='desc' ? '#eff6ff' : 'transparent',
                color:      isSorted&&sortConfig?.dir==='desc' ? '#2563eb' : '#374151',
                fontWeight: isSorted&&sortConfig?.dir==='desc' ? 700 : 400,
              }}
            >▼ 내림차순 정렬</button>
            {isSorted && (
              <button
                onClick={()=>{ setSortConfig(null); setOpenFilter(null); }}
                style={{
                  display:'block', width:'100%', textAlign:'left',
                  padding:'5px 8px', fontSize:'12px', cursor:'pointer', borderRadius:'5px', border:'none',
                  background:'transparent', color:'#9ca3af',
                }}
              >✕ 정렬 해제</button>
            )}
          </div>
          <div style={{padding:'8px 10px', borderBottom:'1px solid #f3f4f6'}}>
            <input
              data-filter-dropdown
              autoFocus
              value={filterSearch}
              onChange={e=>setFilterSearch(e.target.value)}
              placeholder="검색..."
              style={{
                width:'100%', padding:'5px 8px', fontSize:'12px',
                border:'1px solid #d1d5db', borderRadius:'5px', outline:'none',
                boxSizing:'border-box',
              }}
            />
          </div>
          <div style={{overflowY:'auto', maxHeight:'180px', padding:'6px 10px'}}>
            {!filterSearch && (
              <label style={{display:'flex',alignItems:'center',gap:'7px',padding:'3px 0',
                fontSize:'12px',fontWeight:600,cursor:'pointer',borderBottom:'1px solid #f3f4f6',marginBottom:'4px'}}>
                <input type="checkbox" checked={allChecked} onChange={handleColAllCheck} />
                (모두 선택)
              </label>
            )}
            {dropdownVals.map(v=>(
              <label key={v} style={{display:'flex',alignItems:'center',gap:'7px',
                padding:'3px 0',fontSize:'12px',whiteSpace:'nowrap',cursor:'pointer'}}>
                <input type="checkbox"
                  checked={selectedVals.includes(v)}
                  onChange={e=>setColFilters(prev=>{
                    const base = prev[c.key] ?? uniqueVals;
                    const next = e.target.checked
                      ? [...new Set([...base, v])]
                      : base.filter(x=>x!==v);
                    if (next.length === 0) return prev;
                    if (next.length >= uniqueVals.length) { const r={...prev}; delete r[c.key]; return r; }
                    return {...prev, [c.key]: next};
                  })}
                />
                <span>{v || '(빈값)'}</span>
              </label>
            ))}
          </div>
          {isFiltered && (
            <div style={{padding:'8px 10px',borderTop:'1px solid #f3f4f6'}}>
              <button
                onClick={()=>setColFilters(prev=>{ const r={...prev}; delete r[c.key]; return r; })}
                style={{width:'100%',padding:'5px',fontSize:'12px',cursor:'pointer',
                  borderRadius:'5px',border:'1px solid #d1d5db',background:'#f9fafb',color:'#374151'}}>
                필터 지우기
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
      <div
        onMouseDown={e => handleResizeStart(e, c.key)}
        style={{
          position:'absolute', right:0, top:0, bottom:0, width:'5px',
          cursor:'col-resize', zIndex:1,
        }}
      />
    </th>
  );
})}

              {!readOnly && <th style={{...TH,minWidth:'110px'}}>관리</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row,i)=>{
              const isAlert   = alertIds?.has(row.id) ?? false;
              const isRetired = isRetiredRow(row);
              const isOrange = orangeIds?.has(row.id) ?? false;
const rowBg = (isSelectable && selectedIds.includes(row.id)) ? '#eff6ff'
  : isOrange ? '#ffedd5'
  : isAlert ? '#fef3c7'
  : 배치전안내Set.has(String(row.id)) ? '#e0f2fe'
  : isRetired ? '#f9fafb'
  : i%2===0 ? '#fff' : '#fafafa';

              return (
                <tr key={`${row.id ?? 'r'}-${i}`} style={{background:rowBg}}>
                  {isSelectable && (
  <td style={{...TD, textAlign:'center'}}>
    {isCompletedRow(row) ? (
      <span style={{color:'#d1d5db', fontSize:'11px'}}>-</span>
    ) : (
      <input type="checkbox"
        checked={selectedIds.includes(row.id)}
        onChange={() => toggleSelect(row.id)}
        style={{cursor:'pointer'}}/>
    )}
  </td>
)}

                  <td style={{...TD,color:'#9ca3af',opacity:isRetired?0.5:1}}>
                    {isAlert && <span style={{color:'#d97706',marginRight:'2px'}}>!</span>}{i+1}
                  </td>
                  {cols.map(col=>(
                    <td key={col.key}
  title={String(row[col.key] ?? '')}
  style={{
    ...TD,
    opacity:isRetired?0.5:1,
    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
    maxWidth: col.width ?? '150px',
    ...(col.width?{width:col.width,minWidth:col.width}:{}),
...(col.key==='성명'&&배치후안내Set.has(String(row.id))?{color:'#1e3a8a',fontWeight:700}:{}),
                      }}
                      onContextMenu={col.key==='성명'&&tabKey==='hc_배치전검진'?(e)=>{ e.preventDefault(); setContextMenu({x:e.clientX,y:e.clientY,rowId:String(row.id)}); }:undefined}
                    >
                      {editId===row.id && !readOnly ? (
                        /* 편집 모드 */
                        col.key==='방사선' && tabKey==='hc_특검' ? (
                          <button
                            onClick={()=>handleFieldChange('방사선',editRow?.['방사선']==='O'?'-':'O')}
                            style={{padding:'3px 14px',border:'1px solid #e5e7eb',borderRadius:'4px',fontSize:'12px',cursor:'pointer',fontWeight:700,
                              background:editRow?.['방사선']==='O'?'#dcfce7':'#f9fafb',
                              color:editRow?.['방사선']==='O'?'#166534':'#9ca3af'}}>
                            {editRow?.['방사선']==='O'?'O':'-'}
                          </button>
                        ) : col.key==='배치후예정일' && tabKey==='hc_배치전검진' ? (
                          <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                            <input value={String(editRow?.['배치후예정일']??'')}
                              onChange={e=>handleFieldChange('배치후예정일',e.target.value)}
                              style={{width:'110px',padding:'3px 6px',border:'1px solid #16a34a',borderRadius:'4px',fontSize:'11px',outline:'none'}} />
                            <span style={{fontSize:'10px',color:'#9ca3af',background:'#f3f4f6',padding:'1px 4px',borderRadius:'3px'}}>자동</span>
                          </div>
                        ) : (
                          <input value={String(editRow?.[col.key]??'')}
                            onChange={e=>handleFieldChange(col.key,e.target.value)}
                            style={{width:'100%',minWidth:HIGHLIGHT_COLS.includes(col.key)?'100px':'60px',padding:'3px 6px',
                              border:'1px solid #16a34a',borderRadius:'4px',fontSize:'11px',outline:'none',boxSizing:'border-box'}} />
                        )
                      ) : (
                        /* 읽기 모드 */
                        col.badge ? <Badge v={String(row[col.key]??'-')} />
                        : col.key==='물질명' ? (
                          <MatTooltip content={String(row[col.key]??'')}>
                            <span style={{color:'#374151',fontSize:'12px'}}>{String(row[col.key]??'-')}</span>
                          </MatTooltip>
                        ) : (
                          <span style={{
                            fontWeight: col.key==='성명' ? (배치후안내Set.has(String(row.id))?700:600) : 400,
                            color: col.key==='성명'
                              ? (배치후안내Set.has(String(row.id))?'#1e3a8a':'#111827')
                              : col.key==='배치후예정일'&&isAlert?'#b45309':'#374151',
                            background: HIGHLIGHT_COLS.includes(col.key)&&hasContent(String(row[col.key]??''))?'#fefce8':'transparent',
                            padding:    HIGHLIGHT_COLS.includes(col.key)&&hasContent(String(row[col.key]??''))?'1px 6px':'0',
                            borderRadius:'4px',
                          }}>
                            {String(row[col.key]??'-')}
                          </span>
                        )
                      )}
                    </td>
                  ))}
                  {!readOnly && (
                    <td style={TD}>
                      {editId===row.id ? (
                        <div style={{display:'flex',gap:'4px'}}>
                          <button onClick={save}   style={{padding:'4px 10px',background:'#16a34a',color:'#fff',border:'none',borderRadius:'4px',fontSize:'11px',cursor:'pointer'}}>저장</button>
                          <button onClick={cancel} style={{padding:'4px 10px',background:'#f3f4f6',color:'#374151',border:'none',borderRadius:'4px',fontSize:'11px',cursor:'pointer'}}>취소</button>
                        </div>
                      ) : (
                        <div style={{display:'flex',gap:'4px'}}>
                          <button onClick={()=>startEdit(row)} style={{padding:'4px 10px',background:'#dbeafe',color:'#1e40af',border:'none',borderRadius:'4px',fontSize:'11px',cursor:'pointer'}}>수정</button>
                          <button onClick={()=>del(row.id)}    style={{padding:'4px 10px',background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:'4px',fontSize:'11px',cursor:'pointer'}}>삭제</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length===0 && (
              <tr>
                <td colSpan={cols.length+(readOnly?1:2)} style={{...TD,textAlign:'center',color:'#9ca3af',padding:'40px'}}>
                  {readOnly ? '배치전검진 데이터를 등록하면 자동으로 표시됩니다.' : '데이터가 없습니다. 양식 다운로드 후 업로드 또는 행 추가로 입력하세요.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 우클릭 컨텍스트 메뉴 */}
      {contextMenu && (<>
        <div style={{position:'fixed',inset:0,zIndex:9998}} onClick={()=>setContextMenu(null)} />
        <div style={{position:'fixed',top:contextMenu.y,left:contextMenu.x,background:'#fff',border:'1px solid #d1d5db',
          borderRadius:'6px',boxShadow:'0 2px 8px rgba(0,0,0,0.15)',zIndex:9999,minWidth:'130px',padding:'4px 0'}}>
          <div
            style={{padding:'8px 16px',cursor:'pointer',fontSize:'13px',background:배치전안내Set.has(contextMenu.rowId)?'#e0f2fe':'#fff'}}
            onClick={()=>{ set배치전안내Set(prev=>{ const n=new Set(prev); n.has(contextMenu.rowId)?n.delete(contextMenu.rowId):n.add(contextMenu.rowId); return n; }); setContextMenu(null); }}>
            배치전 안내
          </div>
          <div
            style={{padding:'8px 16px',cursor:'pointer',fontSize:'13px',
              color:배치후안내Set.has(contextMenu.rowId)?'#1e3a8a':'#111827',
              fontWeight:배치후안내Set.has(contextMenu.rowId)?700:400}}
            onClick={()=>{ set배치후안내Set(prev=>{ const n=new Set(prev); n.has(contextMenu.rowId)?n.delete(contextMenu.rowId):n.add(contextMenu.rowId); return n; }); setContextMenu(null); }}>
            배치후 안내
          </div>
        </div>
      </>)}
    </div>
  );
}

/* ── 메인 컴포넌트 ─────────────────────────────────────── */
export default function HealthCheckupPage() {
  const [tab, setTab]         = useState('인명부');
  const [allData, setAllData] = useState<Record<string,Row[]>>({});
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg]         = useState('');
  const [msgType, setMsgType] = useState<'ok'|'warn'|'err'>('ok');
  const [alarmOpen, setAlarmOpen]       = useState(true);
  const [alarm90Open, setAlarm90Open]   = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
  const loaded: Record<string, Row[]> = {};
  TABS.forEach(t => {
    try {
      const raw = localStorage.getItem(t.key);
      const parsed: Row[] = raw ? JSON.parse(raw) : [];
      loaded[t.key] = parsed.filter(r => {
        if (String(r.id ?? '').startsWith('new-')) return false;
        const vals = Object.entries(r)
          .filter(([k]) => k !== 'id')
          .map(([, v]) => String(v ?? '').trim());
        return vals.some(v => v !== '' && v !== '-');
      });
    } catch { loaded[t.key] = []; }
  });
  Object.entries(loaded).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
  setAllData(loaded);
}, []);


  const persist  = (key: string, data: Row[]) => localStorage.setItem(key,JSON.stringify(data));
  const showMsg  = (text: string, type: 'ok'|'warn'|'err'='ok') => { setMsg(text); setMsgType(type); setTimeout(()=>setMsg(''),6000); };

  const handle배치전교육Update = (newData: Row[]) => {
  setAllData(prev => {
    const 원본 = [...(prev['hc_배치전검진'] || [])];
    newData.forEach(edu => {
      const idx = 원본.findIndex(src => {
        const sa    = String(src['사번'] ?? '').trim();
        const eduSa = String(edu['사번'] ?? '').trim();
        if (sa && sa !== '-' && eduSa && eduSa !== '-') return sa === eduSa;
        return String(src['성명'] ?? '').trim() === String(edu['성명'] ?? '').trim();
      });
      if (idx !== -1) {
        원본[idx] = { ...원본[idx], 비고: edu['비고'] ?? '-' };
      }
    });
    persist('hc_배치전검진', 원본);
    return { ...prev, 'hc_배치전검진': 원본 };
  });
};

  const 배치전AutoCalc = (row: Row): Row => {
    const 예정일 = calc배치후(String(row['배치전날짜']??'-'), String(row['공정명']??'-'));
    return 예정일 !== '-' ? {...row, 배치후예정일:예정일} : row;
  };
const 특검AutoCalc = (row: Row): Row => {
  const 공정 = String(row['공정명'] ?? '').trim();
  const 자동유해 = 공정유해인자Map[공정] ?? '';
  if (자동유해 && (!hasContent(String(row['유해인자'] ?? '')) || row['유해인자'] === '-')) {
    return { ...row, 유해인자: 자동유해 };
  }
  return row;
};
  const handleUpdate = (key: string) => (newData: Row[]) => {
  setAllData(prev => {
    const next: Record<string, Row[]> = { ...prev, [key]: newData };

    // ── 인명부 sync ──────────────────────────────────────
    if (['hc_EDI25','hc_EDI26','hc_야간작업자','hc_특검','hc_인명부','hc_공정'].includes(key)) {
      const 인명부 = next['hc_인명부'] || [];
      if (인명부.length > 0) {
        const { result } = applyAllSync(
          인명부,
          next['hc_EDI25']      || [],
          next['hc_EDI26']      || [],
          next['hc_야간작업자'] || [],
          next['hc_특검']       || [],
          next['hc_공정']       || []
        );
        next['hc_인명부'] = result;
        persist('hc_인명부', result);
      }
    }

    // ── 종검대상자 종검검진일 sync ────────────────────────
    if (['hc_EDI25','hc_EDI26','hc_야간작업자','hc_특검','hc_인명부','hc_공정'].includes(key)) {
      const 인명부 = next['hc_인명부'] || [];
      const 종검대상자 = next['hc_종검대상자'] || [];
      if (인명부.length > 0 && 종검대상자.length > 0) {
        const 인명부Map = new Map(
          인명부.map(r => [String(r['사번'] ?? '').trim(), r])
        );
        const updated = 종검대상자.map(r => {
          const matched = 인명부Map.get(String(r['사번'] ?? '').trim());
          if (matched && matched['종검검진일']) {
            return { ...r, 종검검진일: matched['종검검진일'] };
          }
          return r;
        });
        next['hc_종검대상자'] = updated;
        persist('hc_종검대상자', updated);
      }
    }

    // ── 공정별유해인자 ↔ 배치전검진 물질명 sync ──────────
    if (['hc_공정별유해인자', 'hc_배치전검진'].includes(key)) {
      const 인자Map: Record<string, string> = {};
      (next['hc_공정별유해인자'] || []).forEach((r: Row) => {
        const 공정 = String(r['공정명'] ?? '').trim();
        const 유해 = String(r['유해인자'] ?? '').trim();
        if (공정 && 유해) 인자Map[공정] = 유해;
      });

      if (Object.keys(인자Map).length > 0) {
        const updated = (next['hc_배치전검진'] || []).map((r: Row) => {
          const 공정 = String(r['공정명'] ?? '').trim();
          const 기존 = String(r['물질명'] ?? '').trim();
          return (!기존 || 기존 === '-') && 인자Map[공정]
            ? { ...r, 물질명: 인자Map[공정] }
            : r;
        });
        next['hc_배치전검진'] = updated;
        persist('hc_배치전검진', updated);
      }
    }

    persist(key, next[key]);
return next;
  });   // ← setAllData 닫기
};      // ← handleUpdate 닫기


  const makeFileUploadHandler = (
  key: string,
  parser: (rows: Record<string, unknown>[]) => Row[],
  successMsg: (n: number) => string,
  needsSync = false
) => async (file: File) => {
  try {
    const XLSX = await import('xlsx');
    const buf  = await file.arrayBuffer();
    const wb   = XLSX.read(buf, { type: 'array', cellDates: true, raw: false });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets[wb.SheetNames[0]],
      { defval: '', raw: false }
    );
    if (!rows.length) { showMsg('파일에 데이터가 없습니다.', 'err'); return; }
    const parsed = parser(rows);
    if (!parsed.length) { showMsg('성명 컬럼을 찾지 못했습니다.', 'err'); return; }

    setAllData(prev => {
      const merged = mergeRows(prev[key] || [], parsed, defaultKey);
const next = { ...prev, [key]: merged };
      if (needsSync) {
        const 인명부 = next['hc_인명부'] || [];
        if (인명부.length > 0) {
          const { result } = applyAllSync(
            인명부,
            next['hc_EDI25']      || [],
            next['hc_EDI26']      || [],
            next['hc_야간작업자'] || [],
            next['hc_특검']       || [],
            next['hc_공정']       || []
          );
          next['hc_인명부'] = result;
          persist('hc_인명부', result);
        }
      }
      persist(key, merged);
      return next;   // ← 핵심 수정: 반드시 return next 필요
    });

    showMsg(successMsg(parsed.length), 'ok');
  } catch (err) {
    console.error(err);
    showMsg('오류! 파일 형식을 확인해주세요.', 'err');
  }
};


  const handleEDIUpload = (year:'25'|'26') => async (file: File) => {
    try {
      const XLSX = await import('xlsx');
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf,{type:'array',cellDates:true,raw:false});
      const rows = XLSX.utils.sheet_to_json<Record<string,unknown>>(wb.Sheets[wb.SheetNames[0]],{defval:'',raw:false});
      if (!rows.length) { showMsg('파일에 데이터가 없습니다.','err'); return; }
      const parsed = parseEDIFile(rows);
      if (!parsed.length) { showMsg('성명 컬럼을 찾지 못했습니다.','err'); return; }
      const key = year==='25'?'hc_EDI25':'hc_EDI26';
      setAllData(prev=>{
        const ediKey = (r: Row) => {
  const b = String(r['주민번호'] ?? '').trim();
  return b ? `b_${b}` : `nm_${String(r['성명'] ?? '').trim()}`;
};
const merged = mergeRows(prev[key] || [], parsed, ediKey);
const next={...prev,[key]:merged};
        const 인명부=next['hc_인명부']||[];
        const edi25 = year==='25'?parsed:(next['hc_EDI25']||[]);
        const edi26 = year==='26'?parsed:(next['hc_EDI26']||[]);
        if (인명부.length>0) {
          const {result,matched25,matched26,nameOnly}=applyAllSync(인명부,edi25,edi26,next['hc_야간작업자']||[],next['hc_특검']||[],next['hc_공정']||[]);
          next['hc_인명부']=result; persist('hc_인명부',result);
          const matched=year==='25'?matched25:matched26;
          showMsg(nameOnly>0
            ? `${year}년 EDI ${parsed.length}명 · ${matched}명 연동 (⚠ ${nameOnly}명 이름 매칭)`
            : `${year}년 EDI ${parsed.length}명 완료 · ${matched}명 연동됨`,
            nameOnly>0?'warn':'ok');
        } else showMsg(`${year}년 EDI ${parsed.length}명 업로드 완료`,'ok');
        persist(key,parsed); return next;
      });
    } catch(err) { console.error(err); showMsg('오류! 파일 형식을 확인해주세요.','err'); }
  };

  /* ── 양식 다운로드 ───────────────────────────────────── */
  const downloadInMyungBuTemplate = async () => {
    const XLSX = await import('xlsx');
    const wb=XLSX.utils.book_new();
    const ws=XLSX.utils.aoa_to_sheet([
      ['소속','공정명','사번','성명','생년월일','성별','직종','근무지','직원구분','입사일','25년EDI','26년EDI','일반','특검','야간','배치전','방사선','종검','종검검진일','휴직'],
      ['예)생산1팀','예)122080048','예)홍길동','예)19850101','남자/여자','비사무직','예)평택1','정규직/계약직/파견직','예)2024-03-01','★EDI자동','★EDI자동','수검완료/-','★특검탭자동','★야간탭자동','O/-','★특검탭자동','O/-','예)2026-03-14','O/-'],
    ]);
    ws['!cols']=Array(20).fill(0).map(()=>({wch:16}));
    XLSX.utils.book_append_sheet(wb,ws,'인명부'); XLSX.writeFile(wb,'건강검진_인명부_양식.xlsx');
  };
  const downloadYaganTemplate = async () => {
    const XLSX=await import('xlsx'); const wb=XLSX.utils.book_new();
    const ws=XLSX.utils.aoa_to_sheet([['사번','성명','야간작업','검진일','비고'],['예) 122080048','예) 홍길동','예) 조립작업','비고']]);
    ws['!cols']=[{wch:14},{wch:12},{wch:30},{wch:20}];
    XLSX.utils.book_append_sheet(wb,ws,'야간작업자'); XLSX.writeFile(wb,'야간작업자_양식.xlsx');
  };
  const downloadSpecialTemplate = async () => {
    const XLSX=await import('xlsx'); const wb=XLSX.utils.book_new();
    const ws=XLSX.utils.aoa_to_sheet([['사번','성명','공정명','유해인자','방사선','검진일','비고'],['예) 122080048','예) 홍길동','예) 소음, 분진','★유해물질자동','O/-','예) 2026-03-14','비고']]);
    ws['!cols']=[{wch:14},{wch:12},{wch:24},{wch:20},{wch:10},{wch:16},{wch:18}];
    XLSX.utils.book_append_sheet(wb,ws,'특검대상자'); XLSX.writeFile(wb,'특검대상자_양식.xlsx');
  };
  const download배치전Template = async () => {
    const XLSX=await import('xlsx'); const wb=XLSX.utils.book_new();
    const headers=['사번','성명','부서명','공정명','검진대상여부','부서이동일','물질명','배치전날짜','배치전교육','배치후','배치후예정일','특이사항','근무지역'];
    const guide=['예) 122080048','예) 홍길동','예) 생산1팀','기기분석실(90일) 또는 기타(180일)','대상/비대상','예) 2026-01-15','예) 벤젠, 납','예) 2026-01-20','완료/미완료/비대상','완료/미완료','★공정명 기준 자동계산','예) 2026-07-20','특이사항','예) 평택1'];
    const ws=XLSX.utils.aoa_to_sheet([headers,guide]);
    ws['!cols']=headers.map((_,i)=>({wch:i===6?24:i===3||i===12?28:16}));
    XLSX.utils.book_append_sheet(wb,ws,'배치전검진'); XLSX.writeFile(wb,'배치전검진_양식.xlsx');
  };
  const download공정Template = async () => {
    const XLSX=await import('xlsx'); const wb=XLSX.utils.book_new();
    const ws=XLSX.utils.aoa_to_sheet([['사번','성명','조직','공정명'],['예) 122080048','예) 홍길동','예) 생산1팀','예) 평택 제조실']]);
    ws['!cols']=[{wch:14},{wch:12},{wch:16},{wch:16},{wch:14}];
    XLSX.utils.book_append_sheet(wb,ws,'공정확인'); XLSX.writeFile(wb,'공정확인_양식.xlsx');
  };
  const download종검Template = async () => {
    const XLSX=await import('xlsx'); const wb=XLSX.utils.book_new();
    const ws=XLSX.utils.aoa_to_sheet([['사원번호','성명','검진일자','부서명','근무지','비고'],['예) 122080048','예) 홍길동','예) 2026-03-14','예) 생산1팀','예) 평택1','비고']]);
    ws['!cols']=[{wch:14},{wch:12},{wch:16},{wch:16},{wch:12},{wch:18}];
    XLSX.utils.book_append_sheet(wb,ws,'종검검진일'); XLSX.writeFile(wb,'종검검진일_양식.xlsx');
  };
  const download종검대상자Template = async () => {
  const XLSX=await import('xlsx'); const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet([
    ['사원번호','성명','검진일자','부서명','근무지','비고'],
    ['예) 122080048','예) 홍길동','예) 2026-03-14','예) 생산1팀','예) 평택1','비고'],
  ]);
  ws['!cols']=[{wch:14},{wch:12},{wch:16},{wch:16},{wch:12},{wch:18}];
  XLSX.utils.book_append_sheet(wb,ws,'종검대상자'); XLSX.writeFile(wb,'종검대상자_양식.xlsx');
};
const download휴직Template = async () => {
  const XLSX=await import('xlsx'); const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet([
    ['사번','성명','휴직시작일','휴직종료일','휴직사유','비고'],
    ['예) 122080048','예) 홍길동','예) 2026-01-01','예) 2026-12-31','예) 육아휴직','비고'],
  ]);
  ws['!cols']=[{wch:14},{wch:12},{wch:16},{wch:16},{wch:20},{wch:18}];
  XLSX.utils.book_append_sheet(wb,ws,'휴직'); XLSX.writeFile(wb,'휴직_양식.xlsx');
};
const download공정별유해인자Template = async () => {
  const XLSX = await import('xlsx'); const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['팀', '공정명', '유해인자'],
    ['예) 생산1팀', '예) 기기분석실', '예) 소음, 분진'],
  ]);
  ws['!cols'] = [{wch:14},{wch:20},{wch:30}];
  XLSX.utils.book_append_sheet(wb, ws, '공정별유해인자');
  XLSX.writeFile(wb, '공정별유해인자_양식.xlsx');
};

  /* ── 파일 업로드 핸들러 ─────────────────────────────── */
  const handleYaganFileUpload    = makeFileUploadHandler('hc_야간작업자',parseYaganFile,n=>`야간작업자 ${n}명 업로드 · 인명부 야간 자동 반영됨`,true);
  const handle배치전FileUpload   = makeFileUploadHandler('hc_배치전검진',parse배치전File,n=>`배치전검진 ${n}명 업로드 · 배치후예정일 자동계산됨`);
  const handle공정FileUpload = makeFileUploadHandler('hc_공정', parse공정File, n=>`공정확인 ${n}명 업로드 · 인명부 공정명 자동 반영됨`, true);
  const handle종검FileUpload     = makeFileUploadHandler('hc_종검',parse종검File,n=>`종검 검진일 ${n}명 업로드 완료`);
const handle휴직FileUpload = makeFileUploadHandler(
  'hc_휴직',
  (rows: Record<string,unknown>[]) => rows.map((r,i)=>({ ...r, id:i+1 })),
  n=>`휴직 ${n}명 업로드 완료`
);
// ✅ handle공정별유해인자FileUpload 수정
const handle공정별유해인자FileUpload = async (file: File) => {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

  const withId = rows.map((r, i) => {
    const ks = Object.keys(r);
    const g = (t: string) => {
      const k = findCol(ks, t);
      return k ? String(r[k] ?? '').trim() || '-' : '-';
    };
    return {
      id: `공정-${i + 1}`,   // ← string prefix로 고유성 보장
      팀:       g('팀'),
      공정명:   g('공정명'),
      유해인자: g('유해인자'),
    };
  });

  const existing공정 = allData['hc_공정별유해인자'] || [];
const merged공정 = mergeRows(existing공정, withId, r => String(r['공정명'] ?? '').trim());
handleUpdate('hc_공정별유해인자')(merged공정);
  showMsg(`공정별 유해인자 ${withId.length}건 업로드 완료`, 'ok');
};


  const handleSpecialFileUpload = async (file: File) => {
  try {
    const XLSX = await import('xlsx');
    const buf  = await file.arrayBuffer();
    const wb   = XLSX.read(buf, { type:'array', cellDates:true, raw:false });
    const rows = XLSX.utils.sheet_to_json<Record<string,unknown>>(
      wb.Sheets[wb.SheetNames[0]], { defval:'', raw:false }
    );
    if (!rows.length) { showMsg('파일에 데이터가 없습니다.', 'err'); return; }
    const parsed = parseSpecialFile(rows);
    if (!parsed.length) { showMsg('성명 컬럼을 찾지 못했습니다.', 'err'); return; }

    console.log('[특검업로드] parsed 샘플:', parsed.slice(0,3));

    setAllData(prev => {
      const mergedSpecial = mergeRows(prev['hc_특검'] || [], parsed, defaultKey);
const next: Record<string,Row[]> = { ...prev, hc_특검: mergedSpecial };
      const 인명부 = next['hc_인명부'] || [];
      console.log('[특검업로드] 인명부 수:', 인명부.length);

      if (인명부.length > 0) {
        const { result } = applyAllSync(
          인명부,
          next['hc_EDI25']      || [],
          next['hc_EDI26']      || [],
          next['hc_야간작업자'] || [],
          mergedSpecial,
          next['hc_공정']       || []
        );
        next['hc_인명부'] = result;
        persist('hc_인명부', result);
        console.log('[특검업로드] 결과 샘플:', result.slice(0,5).map(r => ({
          성명: r['성명'], 특검: r['특검'], 방사선: r['방사선']
        })));
      }
      persist('hc_특검', parsed);
      return next;
    });
    showMsg(`특검 대상자 ${parsed.length}명 업로드 완료`, 'ok');
  } catch(err) {
    console.error(err);
    showMsg('오류!', 'err');
  }
};


  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const XLSX=await import('xlsx');
      const buf=await file.arrayBuffer();
      const wb=XLSX.read(buf,{type:'array',cellDates:true,raw:false});
      const find=(p:string)=>wb.SheetNames.find(n=>n.replace(/[\s()（）]/g,'').includes(p));
      const newData: Record<string,Row[]>={}; let count=0;
      const 인명부S=find('인명부');
      const cur = {...allData}; // 기존 데이터 참조용
if (인명부S) { newData['hc_인명부'] = mergeRows(cur['hc_인명부']||[], parseInMyungBu(XLSX.utils.sheet_to_json(wb.Sheets[인명부S],{defval:'',raw:false})), defaultKey); count++; }
if (공정S)   { newData['hc_공정']   = mergeRows(cur['hc_공정']  ||[], parse공정File(XLSX.utils.sheet_to_json(wb.Sheets[공정S],{defval:'',raw:false})),  defaultKey); count++; }
if (종검S)   { newData['hc_종검']   = mergeRows(cur['hc_종검']  ||[], parse종검File(XLSX.utils.sheet_to_json(wb.Sheets[종검S],{defval:'',raw:false})),  defaultKey); count++; }
if (휴직S) {
  const 휴직Parsed = (XLSX.utils.sheet_to_json(wb.Sheets[휴직S],{defval:'',raw:false}) as Record<string,unknown>[])
    .filter(r=>r['성명']&&String(r['성명']).trim()!=='')
    .map((row,i)=>({id:i+1,사번:cv(row['사번']),성명:cv(row['성명']),소속:cv(row['소속']),근태사유:cv(row['근태사유']),종료일:pd2(row['종료일']),근무지:cv(row['근무지'])}));
  newData['hc_휴직'] = mergeRows(cur['hc_휴직']||[], 휴직Parsed, defaultKey);
  count++;
}
      // ✅ 수정 후
Object.entries(newData).forEach(([k, v]) => persist(k, v));
setAllData(prev => {
  const next = { ...prev, ...newData };
  if (next['hc_인명부']?.length > 0) {
    const { result } = applyAllSync(
      next['hc_인명부'],
      next['hc_EDI25']     || [],
      next['hc_EDI26']     || [],
      next['hc_야간작업자'] || [],
      next['hc_특검']      || [],
      next['hc_공정']      || []  // ← 추가
    );
    next['hc_인명부'] = result;
    persist('hc_인명부', result);
  }
  return next;
});
showMsg(`완료! ${count}개 시트 업로드됨`, 'ok');

    } catch(err) { console.error(err); showMsg('오류! 파일을 확인해주세요.','err'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value=''; }
  };

  /* ── 계산 ──────────────────────────────────────────── */
  const 인명부D_raw    = allData?.['hc_인명부']      || [];
const _today일반           = new Date(); _today일반.setHours(0,0,0,0);
const 인명부D              = 인명부D_raw.map(r => {
  const edi   = normalizeEDI(String(r['26년EDI']  ?? '').trim());
const 종검일 = String(r['종검검진일'] ?? '').trim();
let 일반 = '대상자';
if (edi === '수검완료') {
  일반 = '수검완료';
} else {
  const d = parseDate(종검일);
  if (d && d < _today일반) 일반 = '수검완료';
}
return { ...r, 일반, '26년EDI': edi };
});
const 공정유해인자Map = useMemo(() => {
  const map: Record<string, string> = {};
  (allData['hc_공정별유해인자'] || []).forEach(r => {
    const 공정 = String(r['공정명'] ?? '').trim();
    const 유해 = String(r['유해인자'] ?? '').trim();
    if (공정) map[공정] = 유해;
  });
  return map;
}, [allData['hc_공정별유해인자']]);

  const 배치전Data     = allData?.['hc_배치전검진']   || [];
  const 배치전Data_물질명 = 배치전Data.map(r => {
  const 공정 = String(r['공정명'] ?? '').trim();
  const 자동 = 공정유해인자Map[공정] ?? '';
  const 기존 = String(r['물질명'] ?? '').trim();
  return { ...r, 물질명: (기존 && 기존 !== '-') ? 기존 : (자동 || '-') };
});
const 배치전교육Data = compute배치전교육(배치전Data_물질명);
  const 배치후검진Data = compute배치후예정일(배치전Data.filter(r => String(r['배치후'] ?? '').trim() === 'O')
);
  const 종검Data       = allData?.['hc_종검']          || [];
const 종검대상자Data = compute종검대상자(인명부D, 종검Data).sort((a, b) => {
  const aNew = a['_isNew'] === 'Y';
  const bNew = b['_isNew'] === 'Y';
  const aNon = String(a['지원구분']).includes('비해당');
  const bNon = String(b['지원구분']).includes('비해당');
  if (aNew && !bNew) return -1;
  if (!aNew && bNew) return 1;
  if (!aNon && bNon) return -1;
  if (aNon && !bNon) return 1;
  return 0;
});
const 종검NewIdSet = new Set(
  종검대상자Data.filter(r => r['_isNew'] === 'Y').map(r => Number(r.id))
);

  const sorted배치전Data     = sort배치전Data(배치전Data);
const 인명부D_제외반영 = 인명부D.filter(r => !isExcludedLocation(r));
const 인명부D_raw_제외반영 = 인명부D_raw.filter(r => !isExcludedLocation(r));
const 배치전Data_제외반영 = 배치전Data.filter(r => !isExcludedLocation(r));
const 배치전교육Data_제외반영 = 배치전교육Data.filter(r => !isExcludedLocation(r));
const 배치후예정일Data_제외반영 = 배치후검진Data.filter(r => !isExcludedLocation(r));
const 종검대상자Data_제외반영 = 종검대상자Data.filter(r => !isExcludedLocation(r));
const 야간Data_제외반영 = (allData?.['hc_야간작업자'] || []).filter(r => !isExcludedLocation(r));
const 특검Data_제외반영 = (allData?.['hc_특검'] || []).filter(r => !isExcludedLocation(r));
const 휴직Data_제외반영 = (allData?.['hc_휴직'] || []).filter(r => !isExcludedLocation(r));
const 배치후알람Items = get알람Items(
  배치후예정일Data_제외반영.filter(r => {
    if (hasContent(String(r['배치후진행일'] ?? ''))) return false;
    return true;
  }),
  '배치후예정일'
);



  const 배치후alertIdSet = new Set(배치후알람Items.map(r=>r.id));

  const 예정일알람Items = 배치전교육Data_제외반영.filter(r => {
  if (r['상태'] === '완료' || r['상태'] === '기한초과') return false;
  if (!hasContent(r['검사예정일'])) return false;

  const d = new Date(String(r['검사예정일']));
  if (isNaN(d.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dl = new Date(today);
  dl.setDate(dl.getDate() + 21);

  return d >= today && d <= dl;
});



  /* ── 통계 ─────────────────────────────────────────── */
const total = 인명부D_제외반영.length;

const done = 인명부D_raw_제외반영.filter(
  d => String(d['일반'] ?? '').trim() === '수검완료'
).length;

const pending = 인명부D_raw_제외반영.filter(d => {
  const v = String(d['일반'] ?? '').trim();
  return v === '미수검' || v === '대상자' || v === '대상';
}).length;

const leave = 휴직Data_제외반영.length;

const newEmp = 배치전Data_제외반영.filter(
  d => d['검진대상여부'] === '대상'
).length;

const 야간Count = 야간Data_제외반영.length;

const 특검Count = 특검Data_제외반영.filter(
  r => hasContent(r['유해인자'])
).length;

const 방사선Count = 특검Data_제외반영.filter(
  r => r['방사선'] === 'O'
).length;
const 배치전완료 = 배치전Data_제외반영.filter(
  d =>
    d['검진대상여부'] === '대상' &&
    hasContent(String(d['배치후진행일'] ?? ''))
).length;

  /* ── 현재 탭 데이터 ──────────────────────────────── */
  const curTabDef = TABS.find(t=>t.label===tab)||TABS[0];
  let curData: Row[] = [];
  if (tab==='배치전검진') curData = [...sorted배치전Data]
  .map(r => {
    const 공정 = String(r['공정명'] ?? '').trim();
    const 자동 = 공정유해인자Map[공정] ?? '';
    const 기존물질 = String(r['물질명'] ?? '').trim();

    // ✅ 배치후예정일 재계산 — 배치전날짜 없으면 배치전교육 날짜로 대체
    const 배치전날짜 = String(r['배치전날짜'] ?? '').trim();
    const 배치전교육값 = String(r['배치전교육'] ?? '').trim();
    const 기준날짜 = (hasContent(배치전날짜) && 배치전날짜 !== '-')
      ? 배치전날짜
      : (() => { const p = parseDate(배치전교육값); return p ? fmtDate(p) : '-'; })();
    const 기존예정일 = String(r['배치후예정일'] ?? '').trim();
    const 배치후예정일 = (hasContent(기존예정일) && 기존예정일 !== '-')
      ? 기존예정일
      : calc배치후(기준날짜, 공정);

    return {
      ...r,
      물질명: (기존물질 && 기존물질 !== '-') ? 기존물질 : (자동 || '-'),
      배치후예정일,  // ✅ 추가
    };
  })
  .sort((a, b) => {
    const aHas = hasContent(String(a['배치후진행일'] ?? ''));
    const bHas = hasContent(String(b['배치후진행일'] ?? ''));
    return aHas === bHas ? 0 : aHas ? 1 : -1;
  });
  else if (tab==='특검 대상자') curData = (allData['hc_특검']||[]).map(r => {
  const 공정 = String(r['공정명'] ?? '').trim();  // ← 공정명으로 수정
  const 자동유해 = 공정유해인자Map[공정] ?? '';
  const 기존유해 = String(r['유해인자'] ?? '').trim();
  const 유해인자 = (기존유해 && 기존유해 !== '-') ? 기존유해 : 자동유해;
  return { ...r, 유해인자: 유해인자 || '-' };
});
  else if (tab==='배치전교육')         curData = 배치전교육Data;
  else if (tab==='종검 대상자')        curData = 종검대상자Data;
  else                                 curData = allData?.[curTabDef.key] || [];

  const isReadOnly = tab==='종검 대상자';
  const msgColor   = msgType==='err'?{c:'#dc2626',bg:'#fee2e2'}:msgType==='warn'?{c:'#d97706',bg:'#fef3c7'}:{c:'#16a34a',bg:'#dcfce7'};

  const TAB_NOTICE: Record<string,{bg:string;border:string;color:string;text:React.ReactNode}> = {
    '25년 EDI':    {bg:'#eff6ff',border:'#bfdbfe',color:'#1e40af',text:<>보라색 <strong>EDI 파일 업로드</strong> → 주민번호 앞 6자리 기준 인명부 <strong>25년EDI</strong> 자동 반영</>},
    '26년 EDI':    {bg:'#eff6ff',border:'#bfdbfe',color:'#1e40af',text:<>보라색 <strong>EDI 파일 업로드</strong> → 주민번호 앞 6자리 기준 인명부 <strong>26년EDI</strong> 자동 반영</>},
    '야간작업자':  {bg:'#f0f9ff',border:'#bae6fd',color:'#0369a1',text:<><strong>양식 다운로드</strong> → 작성 후 <strong>파일 업로드</strong> · 등록 시 인명부 <strong>야간 O</strong> 자동 표시</>},
    '특검 대상자': {bg:'#fffbeb',border:'#fde68a',color:'#92400e',text:<><strong>검진일</strong> 입력 시 인명부 <strong>특검검진일</strong> 자동 반영 · 유해인자→특검 O, 방사선 O→방사선 O</>},
    '배치전검진':  {bg:'#ecfdf5',border:'#a7f3d0',color:'#065f46',text:<><strong>배치후 검진 기기분석실 90일 / 나머지 180일</strong> 자동계산 · 정렬: 알람→활성→비대상→완료→퇴사 · <strong>물질명 오버 시 전체 표시</strong></>},
    '배치전교육':  {bg:'#f0fdf4',border:'#86efac',color:'#166534',text:<><strong>검진대상여부=대상 & 배치전교육≠비대상</strong> 자동 선정 · 퇴사자 제외 · 교육 진행일 입력 시 완료 처리</>},
    '배치후예정일':{bg:'#eff6ff',border:'#bfdbfe',color:'#1e40af',text:<><strong>기기분석실 90일 / 그 외 180일</strong> 자동계산 · 비대상·특검 제외 · 3주 이내 알람 표시</>},
    '종검 대상자': {bg:'#eff6ff',border:'#bfdbfe',color:'#1e40af',text:<><strong>인명부 기준 자동 계산</strong> · 정규직: 입사 다음달부터, 만35세↑ 매년 / 35세↓ 격년(짝수년) · 계약직: 90일 후 다음달 1일</>},
    '공정확인':    {bg:'#f0fdf4',border:'#bbf7d0',color:'#166534',text:<><strong>양식 다운로드</strong> → 작성 후 <strong>파일 업로드</strong>, 또는 행 추가로 직접 입력</>},
    '종검 검진일': {bg:'#fdf4ff',border:'#e9d5ff',color:'#6b21a8',text:<><strong>양식 다운로드</strong> → 작성 후 <strong>파일 업로드</strong>, 또는 행 추가로 직접 입력</>},
  };
  const notice = TAB_NOTICE[tab];

  return (
    <div style={{padding:'24px 32px'}}>
      {/* 헤더 */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'8px'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
            <h2 style={{fontSize:'20px',fontWeight:700,color:'#111827',margin:0}}>건강진단</h2>
          </div>
          <p style={{fontSize:'13px',color:'#6b7280',margin:0}}>EDI · 야간 · 특검 · 배치전검진 자동 연동 · 날짜 YYYY-MM-DD 형식</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap',justifyContent:'flex-end'}}>
          {msg && <span style={{fontSize:'12px',fontWeight:500,color:msgColor.c,background:msgColor.bg,padding:'5px 10px',borderRadius:'6px',maxWidth:'420px'}}>{msg}</span>}
          <button onClick={downloadInMyungBuTemplate}
            style={{padding:'8px 16px',background:'#fff',color:'#374151',border:'1px solid #e5e7eb',borderRadius:'8px',fontSize:'13px',cursor:'pointer',fontWeight:600}}>양식 다운로드</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleUpload} style={{display:'none'}} />
          <button onClick={()=>fileRef.current?.click()} disabled={uploading}
            style={{padding:'8px 16px',background:uploading?'#f3f4f6':'#2563eb',color:uploading?'#9ca3af':'#fff',border:'none',borderRadius:'8px',fontSize:'13px',cursor:uploading?'not-allowed':'pointer',fontWeight:600}}>
            {uploading?'처리 중...':'인명부 업로드'}
          </button>
        </div>
      </div>

      {배치후알람Items.length>0 && (
        <div style={{background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:'8px',padding:'10px 14px',margin:'10px 0 0 0',fontSize:'12px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:alarmOpen?'8px':'0'}}>
            <span style={{fontWeight:700,color:'#92400e'}}>⚠ 배치후 검진 예정일 3주 이내 — {배치후알람Items.length}명</span>
            <button onClick={()=>setAlarmOpen(p=>!p)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'12px',color:'#92400e',fontWeight:600}}>{alarmOpen?'접기':'펼치기'}</button>
          </div>
          {alarmOpen && (
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
              {배치후알람Items.map(r=>{ const days=daysUntil(String(r['배치후예정일'])); return (
                <span key={r.id} style={{fontSize:'12px',background:days<=7?'#fee2e2':'#fff',border:`1px solid ${days<=7?'#fca5a5':'#fcd34d'}`,borderRadius:'6px',padding:'4px 10px',color:days<=7?'#991b1b':'#92400e'}}>
                  <strong>{r['성명']}</strong>{r['부서명']&&r['부서명']!=='-'?` (${r['부서명']})`:''} — {r['배치후예정일']}
                  <span style={{marginLeft:'6px',fontWeight:700}}>{days===0?'D-day':`D-${days}`}</span>
                </span>
              ); })}
            </div>
          )}
        </div>
      )}

      {/* 배너: 배치전교육 예정일 3주 이내 */}
      {예정일알람Items.length>0 && (
        <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:'8px',padding:'10px 14px',margin:'8px 0 0 0',fontSize:'12px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:alarm90Open?'8px':'0'}}>
            <span style={{fontWeight:700,color:'#166534'}}>⚠ 배치전교육 예정일 3주 이내 — {예정일알람Items.length}명</span>
            <button onClick={()=>setAlarm90Open(p=>!p)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'12px',color:'#166534',fontWeight:600}}>{alarm90Open?'접기':'펼치기'}</button>
          </div>
          {alarm90Open && (
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
              {예정일알람Items.map(r=>{ const days=daysUntil(String(r['검사예정일'])); return (
                <span key={r.id} style={{fontSize:'12px',background:days<=7?'#fee2e2':'#fff',border:`1px solid ${days<=7?'#fca5a5':'#86efac'}`,borderRadius:'6px',padding:'4px 10px',color:days<=7?'#991b1b':'#166534'}}>
                  <strong>{r['성명']}</strong>{r['부서명']&&r['부서명']!=='-'?` (${r['부서명']})`:''} — {r['검사예정일']}
                  <span style={{marginLeft:'6px',fontWeight:700}}>{days===0?'D-day':`D-${days}`}</span>
                </span>
              ); })}
            </div>
          )}
        </div>
      )}

      {/* 요약 카드 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))',gap:'10px',margin:'16px 0'}}>
        {[
          {label:'전체',           value:`${total}`,                  color:'#2563eb'},
          {label:'수검완료',       value:`${done}`,                   color:'#16a34a'},
          {label:'미수검(대상)',   value:`${pending}`,                color:'#d97706'},
          {label:'배치전',         value:`${newEmp}(${배치전완료})`,  color:'#7c3aed'},
          {label:'휴직',           value:`${leave}`,                  color:'#dc2626'},
          {label:'야간작업자',     value:`${야간Count}`,              color:'#0369a1'},
          {label:'특검 (방사선)', value:`${특검Count} (${방사선Count})`,color:'#b45309'},
          {label:'배치전검진',     value:`${배치전Data.filter(r=>String(r['검진대상여부']??'').trim()==='대상').length}`,color:'#0f766e'},
          {label:'종검 대상자', value:`${종검대상자Data.filter(r => !String(r['지원구분']).includes('비해당')).length}`, color:'#6d28d9'},
        ].map(c=>(
          <div key={c.label} style={{border:'1px solid #e5e7eb',borderRadius:'10px',padding:'12px 14px'}}>
            <div style={{fontSize:'11px',color:'#6b7280',marginBottom:'6px'}}>{c.label}</div>
            <div style={{fontSize:'20px',fontWeight:700,color:c.color}}>{c.value}<span style={{fontSize:'11px',fontWeight:400,color:'#9ca3af',marginLeft:'3px'}}>명</span></div>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',marginBottom:'16px',overflowX:'auto',flexShrink:0,scrollbarWidth:'thin'}}>

        {TABS.map(t=>{
          const count = t.label==='배치전교육'       ? 배치전교육Data.length
            : t.label==='배치후예정일'           ? 배치후검진Data.filter(r=>r['상태']!=='비대상').length
            : t.label==='종검 대상자' ? 종검대상자Data.filter(r => !String(r['지원구분']).includes('비해당')).length
            : (allData[t.key]||[]).length;
          const hasBanner = (t.label==='배치전검진'||t.label==='배치후예정일') && 배치후알람Items.length>0;
          const has90     = t.label==='배치전교육' && 예정일알람Items.length>0;
          return (
            <button key={t.label} onClick={()=>setTab(t.label)}
              style={{padding:'5px 10px',border:'none',background:'none',cursor:'pointer',fontSize:'12px',
                fontWeight:tab===t.label?600:400,color:tab===t.label?'#166534':'#6b7280',
                borderBottom:tab===t.label?'2px solid #16a34a':'2px solid transparent',marginBottom:'-1px',
                display:'flex',alignItems:'center',gap:'5px',whiteSpace:'nowrap'}}>
              {t.label}
              {(hasBanner||has90) && (
                <span style={{fontSize:'10px',background:'#fcd34d',color:'#92400e',padding:'1px 5px',borderRadius:'10px',fontWeight:700}}>
                  {hasBanner?배치후알람Items.length:예정일알람Items.length}
                </span>
              )}
              <span style={{fontSize:'11px',color:'#9ca3af',background:'#f3f4f6',padding:'1px 5px',borderRadius:'4px'}}>{count}</span>
            </button>
          );
        })}
      </div>

      {notice && (
        <div style={{background:notice.bg,border:`1px solid ${notice.border}`,borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',fontSize:'12px',color:notice.color}}>
          {notice.text}
        </div>
      )}
      

      <EditableTable
        key={tab}
        data={curData}
        cols={curTabDef.cols}
        onUpdate={
  tab==='배치전교육' ? handle배치전교육Update
  : isReadOnly      ? ()=>{}
  : handleUpdate(curTabDef.key)
}
        readOnly={isReadOnly}
        syncBadge={tab==='25년 EDI'||tab==='26년 EDI'}
        tabKey={curTabDef.key}
        onAutoCalc={
  tab==='배치전검진'  ? 배치전AutoCalc :
  tab==='특검 대상자' ? 특검AutoCalc   : undefined
}
        alertIds={tab==='배치전검진' ? 배치후alertIdSet : undefined}
orangeIds={tab==='종검 대상자' ? 종검NewIdSet : undefined}
        onEDIUpload={tab==='25년 EDI'?handleEDIUpload('25'):tab==='26년 EDI'?handleEDIUpload('26'):undefined}
        onTemplateDownload={
  tab==='야간작업자'  ? downloadYaganTemplate :
  tab==='특검 대상자' ? downloadSpecialTemplate :
  tab==='배치전검진'  ? download배치전Template :
  tab==='공정확인'    ? download공정Template :
  tab==='종검 검진일' ? download종검Template :
  tab==='종검 대상자' ? download종검대상자Template :
  tab==='휴직'        ? download휴직Template : 
  tab==='공정별 유해인자' ? download공정별유해인자Template : undefined
}
onFileUpload={
  tab==='야간작업자'  ? handleYaganFileUpload :
  tab==='특검 대상자' ? handleSpecialFileUpload :
  tab==='배치전검진'  ? handle배치전FileUpload :
  tab==='공정확인'    ? handle공정FileUpload :
  tab==='종검 검진일' ? handle종검FileUpload :
  tab==='종검 대상자' ? handle종검FileUpload :
  tab==='휴직'        ? handle휴직FileUpload : 
  tab==='공정별 유해인자' ? handle공정별유해인자FileUpload : undefined
}


      />
    </div>
  );
}
