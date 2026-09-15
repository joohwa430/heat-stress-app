'use client';
import * as XLSX from 'xlsx';
import { useState, useEffect } from 'react';

/* ─── 타입 정의 ─────────────────────────────────────────────────────────────── */
type Cat = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'Z6' | 'ZA';
type Cycle = '3개월' | '6개월' | '12개월';
type Tab = 'target' | 'register' | 'history';
type Verdict = '적합' | '초과' | '';

interface Substance {
  id: string;
  cat: Cat;
  name: string;
  cas: string;
  tlv: string;
  unit: string;
  defaultCycle: Cycle;
}
interface TargetItem {
  substanceId: string;
  name: string;
  cas: string;
  cycle: Cycle;
  tlv: string;
  unit: string;
}
interface ResultRow {
  substanceId: string;
  name: string;
  cas: string;
  unit: string;
  tlv: string;
  measured: string;
  exposureRatio: string;
  verdict: Verdict;
  note: string;
}
interface MeasRecord {
  id: string;
  seq: number;
  half: string;
  agency: string;
  dept: string;
  process: string;
  samplingDate: string;
  reportDate: string;
  items: ResultRow[];
  createdAt: string;
}

// 🔧 FIX: matchType 필드 추가 (매칭 방법 추적)
interface AnalysisRow {
  rowIdx: number;
  uploadName: string;
  uploadCas: string;
  matched: Substance | null;
  matchType: 'cas' | 'name' | null; // ✨ NEW
  include: boolean;
}

/* ─── 상수 ──────────────────────────────────────────────────────────────────── */
const CAT_LABEL: Record<Cat, string> = {
  Z1: 'Z1 안료·색소',
  Z2: 'Z2 방부제·알칼리류',
  Z3: 'Z3 특별관리물질',
  Z4: 'Z4 고분자·금속류',
  Z5: 'Z5 자외선차단제',
  Z6: 'Z6 용제·산류',
  ZA: 'ZA 분진류',
};

const CAT_BADGE: Record<Cat, { bg: string; color: string }> = {
  Z1: { bg: '#fef3c7', color: '#92400e' },
  Z2: { bg: '#f0fdf4', color: '#166534' },
  Z3: { bg: '#fef2f2', color: '#991b1b' },
  Z4: { bg: '#f5f3ff', color: '#5b21b6' },
  Z5: { bg: '#fff7ed', color: '#9a3412' },
  Z6: { bg: '#f1f5f9', color: '#475569' },
  ZA: { bg: '#eff6ff', color: '#1e40af' },
};

const CYCLE_BADGE: Record<Cycle, { bg: string; color: string }> = {
  '3개월':  { bg: '#fef2f2', color: '#dc2626' },
  '6개월':  { bg: '#fffbeb', color: '#d97706' },
  '12개월': { bg: '#f0fdf4', color: '#16a34a' },
};

// ✨ NEW: 분류별 법적 근거 매핑
const CAT_LEGAL: Record<Cat, string> = {
  Z3: '특별관리물질 (산안법§125·규칙§186·별표22)',
  ZA: '분진 (산안법§125·고시 제4조)',
  Z6: '유기용제·산류 (유기용제중독예방규칙·고시)',
  Z1: '안료·색소류 (화학물질 노출기준 고시)',
  Z2: '방부제·알칼리류 (화학물질 노출기준 고시)',
  Z4: '고분자·금속류 (화학물질 노출기준 고시)',
  Z5: '자외선차단제 (화학물질 노출기준 고시)',
};

const DEPTS = [
  '화성1공장', '화성2공장', '화성2공장 실험실', '화성3공장',
  '평택1공장', '평택2공장', '케이에스팩(도급)', '비티아이(도급)',
];
const PROCS   = ['원료 칭량', '충진공정', '제조공정', '포장공정', '품질관리실', '연구소'];
const AGENCIES = [
  '한국산업위생협회', '서울노동환경연구원', '인하대산업의학연구소',
  '(주)위생환경연구소', '한국환경측정분석원',
];

/* ─── SUBSTANCE_DB ──────────────────────────────────────────────────────────── */
const SUBSTANCE_DB: Substance[] = [
  /* ZA — 분진류 (6개월) */
  { id:'ZA001', cat:'ZA', name:'티타늄디옥사이드 (CI 77891)',        cas:'13463-67-7',  tlv:'10',   unit:'mg/m³', defaultCycle:'6개월' },
  { id:'ZA002', cat:'ZA', name:'마이카 (CI 77019)',                   cas:'12001-26-2',  tlv:'3',    unit:'mg/m³', defaultCycle:'6개월' },
  { id:'ZA003', cat:'ZA', name:'적색산화철 (CI 77491)',               cas:'1309-37-1',   tlv:'5',    unit:'mg/m³', defaultCycle:'6개월' },
  { id:'ZA004', cat:'ZA', name:'황색산화철 (CI 77492)',               cas:'51274-00-1',  tlv:'5',    unit:'mg/m³', defaultCycle:'6개월' },
  { id:'ZA005', cat:'ZA', name:'흑색산화철 (CI 77499)',               cas:'1317-61-9',   tlv:'5',    unit:'mg/m³', defaultCycle:'6개월' },
  { id:'ZA006', cat:'ZA', name:'탤크 (CI 77718)',                     cas:'14807-96-6',  tlv:'3',    unit:'mg/m³', defaultCycle:'6개월' },
  { id:'ZA007', cat:'ZA', name:'페릭암모늄페로시아나이드 (CI 77510)', cas:'25869-00-5',  tlv:'5',    unit:'mg/m³', defaultCycle:'6개월' },
  { id:'ZA008', cat:'ZA', name:'메칠이소치아졸리논',                  cas:'2682-20-4',   tlv:'0.2',  unit:'mg/m³', defaultCycle:'6개월' },
  { id:'ZA009', cat:'ZA', name:'메칠클로로이소치아졸리논',            cas:'26172-55-4',  tlv:'0.2',  unit:'mg/m³', defaultCycle:'6개월' },
  { id:'ZA010', cat:'ZA', name:'마그네슘나이트레이트',                cas:'10377-60-3',  tlv:'5',    unit:'mg/m³', defaultCycle:'6개월' },
  { id:'ZA011', cat:'ZA', name:'마그네슘클로라이드',                  cas:'7786-30-3',   tlv:'10',   unit:'mg/m³', defaultCycle:'6개월' },
  { id:'ZA012', cat:'ZA', name:'벤조페논-3',                          cas:'131-57-7',    tlv:'10',   unit:'mg/m³', defaultCycle:'6개월' },
  { id:'ZA013', cat:'ZA', name:'메티콘',                              cas:'9004-73-3',   tlv:'10',   unit:'mg/m³', defaultCycle:'6개월' },
  { id:'ZA014', cat:'ZA', name:'징크옥사이드 (CI 77947)',             cas:'1314-13-2',   tlv:'4',    unit:'mg/m³', defaultCycle:'6개월' },
  /* Z3 — 특별관리물질 (3개월) */
  { id:'Z3001', cat:'Z3', name:'카보머',                              cas:'9003-01-4',   tlv:'3',    unit:'mg/m³', defaultCycle:'3개월' },
  { id:'Z3002', cat:'Z3', name:'다이소듐이디티에이',                  cas:'139-33-3',    tlv:'1',    unit:'mg/m³', defaultCycle:'3개월' },
  { id:'Z3003', cat:'Z3', name:'테트라소듐이디티에이',                cas:'64-02-8',     tlv:'1',    unit:'mg/m³', defaultCycle:'3개월' },
  { id:'Z3004', cat:'Z3', name:'바닐린',                              cas:'121-33-5',    tlv:'10',   unit:'mg/m³', defaultCycle:'3개월' },
  { id:'Z3005', cat:'Z3', name:'에틸퍼플루오로아이소부틸에터',        cas:'163702-06-5', tlv:'0.01', unit:'ppm',   defaultCycle:'3개월' },
  { id:'Z3006', cat:'Z3', name:'에틸퍼플루오로부틸에터',              cas:'163702-05-4', tlv:'0.01', unit:'ppm',   defaultCycle:'3개월' },
  { id:'Z3007', cat:'Z3', name:'메틸퍼플루오로부틸에터',              cas:'163702-07-6', tlv:'0.01', unit:'ppm',   defaultCycle:'3개월' },
  { id:'Z3008', cat:'Z3', name:'우유단백질',                          cas:'91053-68-8',  tlv:'10',   unit:'mg/m³', defaultCycle:'3개월' },
  { id:'Z3009', cat:'Z3', name:'벤젠',                                cas:'71-43-2',     tlv:'0.5',  unit:'ppm',   defaultCycle:'3개월' },
  { id:'Z3010', cat:'Z3', name:'포름알데히드',                        cas:'50-00-0',     tlv:'0.3',  unit:'ppm',   defaultCycle:'3개월' },
  { id:'Z3011', cat:'Z3', name:'1,4-디옥산',                          cas:'123-91-1',    tlv:'20',   unit:'ppm',   defaultCycle:'3개월' },
  { id:'Z3012', cat:'Z3', name:'납 및 그 무기화합물',                 cas:'7439-92-1',   tlv:'0.05', unit:'mg/m³', defaultCycle:'3개월' },
  { id:'Z3013', cat:'Z3', name:'니켈 및 그 무기화합물',               cas:'7440-02-0',   tlv:'1',    unit:'mg/m³', defaultCycle:'3개월' },
  { id:'Z3014', cat:'Z3', name:'수은 및 그 화합물',                   cas:'7439-97-6',   tlv:'0.025',unit:'mg/m³', defaultCycle:'3개월' },
  { id:'Z3015', cat:'Z3', name:'카드뮴 및 그 화합물',                 cas:'7440-43-9',   tlv:'0.01', unit:'mg/m³', defaultCycle:'3개월' },
  { id:'Z3016', cat:'Z3', name:'코발트 및 그 무기화합물',             cas:'7440-48-4',   tlv:'0.02', unit:'mg/m³', defaultCycle:'3개월' },
  { id:'Z3017', cat:'Z3', name:'6가크롬 및 그 화합물',               cas:'18540-29-9',  tlv:'0.01', unit:'mg/m³', defaultCycle:'3개월' },
  /* Z1 — 안료·색소 (12개월) */
  { id:'Z1001', cat:'Z1', name:'비즈왁스',                            cas:'8006-40-4',   tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z1002', cat:'Z1', name:'칸데릴라왁스',                        cas:'8006-44-8',   tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z1003', cat:'Z1', name:'세레신',                              cas:'8001-75-0',   tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z1004', cat:'Z1', name:'라놀린',                              cas:'8006-54-0',   tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z1005', cat:'Z1', name:'적색202호 (CI 15850:1)',              cas:'5281-04-9',   tlv:'5',    unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z1006', cat:'Z1', name:'적색218호 (CI 45410:1)',              cas:'13473-26-2',  tlv:'5',    unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z1007', cat:'Z1', name:'페릭페로시아나이드 (CI 77510)',       cas:'14038-43-8',  tlv:'5',    unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z1008', cat:'Z1', name:'흑색산화철 (CI 77499)',               cas:'12227-89-3',  tlv:'5',    unit:'mg/m³', defaultCycle:'12개월' },
  /* Z2 — 방부제·알칼리류 (12개월) */
  { id:'Z2001', cat:'Z2', name:'시트릭애씨드',                        cas:'77-92-9',     tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z2002', cat:'Z2', name:'포타슘솔베이트',                      cas:'590-00-1',    tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z2003', cat:'Z2', name:'소듐벤조에이트',                      cas:'532-32-1',    tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z2004', cat:'Z2', name:'부틸파라벤',                          cas:'94-26-8',     tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z2005', cat:'Z2', name:'비에이치티',                          cas:'128-37-0',    tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z2006', cat:'Z2', name:'소듐하이드록사이드',                  cas:'1310-73-2',   tlv:'2',    unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z2007', cat:'Z2', name:'알로에베라잎즙',                      cas:'85507-69-3',  tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z2008', cat:'Z2', name:'포타슘하이드록사이드',                cas:'1310-58-3',   tlv:'2',    unit:'mg/m³', defaultCycle:'12개월' },
  /* Z4 — 고분자·금속류 (12개월) */
  { id:'Z4001', cat:'Z4', name:'폴리우레탄-11',                       cas:'68258-82-2',  tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z4002', cat:'Z4', name:'알루미늄 및 그 화합물',               cas:'7429-90-5',   tlv:'1',    unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z4003', cat:'Z4', name:'황색4호 (CI 19140:1)',                cas:'12225-21-7',  tlv:'5',    unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z4004', cat:'Z4', name:'아연 및 그 화합물',                   cas:'7440-66-6',   tlv:'2',    unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z4005', cat:'Z4', name:'안티몬 및 그 화합물',                 cas:'7440-36-0',   tlv:'0.5',  unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z4006', cat:'Z4', name:'크롬 및 그 화합물',                   cas:'7440-47-3',   tlv:'0.5',  unit:'mg/m³', defaultCycle:'12개월' },
  /* Z5 — 자외선차단제 (12개월) */
  { id:'Z5001', cat:'Z5', name:'이소아밀p-메톡시신나메이트',          cas:'71617-10-2',  tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z5002', cat:'Z5', name:'운데실레노일페닐알라닌',              cas:'175357-18-3', tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  /* Z6 — 용제·산류 (12개월) */
  { id:'Z6001', cat:'Z6', name:'알루미늄글리시네이트',                cas:'13682-92-3',  tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z6002', cat:'Z6', name:'리마콩씨추출물',                      cas:'85085-22-9',  tlv:'10',   unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z6003', cat:'Z6', name:'메탄올',                              cas:'67-56-1',     tlv:'200',  unit:'ppm',   defaultCycle:'12개월' },
  { id:'Z6004', cat:'Z6', name:'아세토니트릴',                        cas:'75-05-8',     tlv:'40',   unit:'ppm',   defaultCycle:'12개월' },
  { id:'Z6005', cat:'Z6', name:'아세톤',                              cas:'67-64-1',     tlv:'500',  unit:'ppm',   defaultCycle:'12개월' },
  { id:'Z6006', cat:'Z6', name:'이소프로필알코올 (IPA)',               cas:'67-63-0',     tlv:'400',  unit:'ppm',   defaultCycle:'12개월' },
  { id:'Z6007', cat:'Z6', name:'크실렌',                              cas:'1330-20-7',   tlv:'100',  unit:'ppm',   defaultCycle:'12개월' },
  { id:'Z6008', cat:'Z6', name:'톨루엔',                              cas:'108-88-3',    tlv:'50',   unit:'ppm',   defaultCycle:'12개월' },
  { id:'Z6009', cat:'Z6', name:'n-헥산',                              cas:'110-54-3',    tlv:'50',   unit:'ppm',   defaultCycle:'12개월' },
  { id:'Z6010', cat:'Z6', name:'메틸에틸케톤 (MEK)',                  cas:'78-93-3',     tlv:'200',  unit:'ppm',   defaultCycle:'12개월' },
  { id:'Z6011', cat:'Z6', name:'에틸아세테이트',                      cas:'141-78-6',    tlv:'400',  unit:'ppm',   defaultCycle:'12개월' },
  { id:'Z6012', cat:'Z6', name:'염화수소',                            cas:'7647-01-0',   tlv:'1',    unit:'ppm',   defaultCycle:'12개월' },
  { id:'Z6013', cat:'Z6', name:'질산',                                cas:'7697-37-2',   tlv:'2',    unit:'ppm',   defaultCycle:'12개월' },
  { id:'Z6014', cat:'Z6', name:'황산',                                cas:'7664-93-9',   tlv:'0.2',  unit:'mg/m³', defaultCycle:'12개월' },
  { id:'Z6015', cat:'Z6', name:'불화수소',                            cas:'7664-39-3',   tlv:'0.5',  unit:'ppm',   defaultCycle:'12개월' },
  { id:'Z6016', cat:'Z6', name:'테트라히드로푸란',                    cas:'109-99-9',    tlv:'200',  unit:'ppm',   defaultCycle:'12개월' },
  { id:'Z6017', cat:'Z6', name:'트리에틸아민',                        cas:'121-44-8',    tlv:'1',    unit:'ppm',   defaultCycle:'12개월' },
  { id:'Z6018', cat:'Z6', name:'무수초산',                            cas:'108-24-7',    tlv:'1',    unit:'ppm',   defaultCycle:'12개월' },
];

/* ─── 유틸 함수 ─────────────────────────────────────────────────────────────── */
const todayStr = () => new Date().toISOString().slice(0, 10);

const addMonths = (dateStr: string, m: number): string => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + m);
  return d.toISOString().slice(0, 10);
};

const dDays = (target: string): number =>
  Math.ceil((new Date(target).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

const getHalf = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() < 6 ? '상' : '하'}반기`;
};

const cycleMonths = (c: Cycle): number =>
  c === '3개월' ? 3 : c === '6개월' ? 6 : 12;

const calcExposure = (measured: string, tlv: string): { ratio: string; verdict: Verdict } => {
  const m = parseFloat(measured);
  const t = parseFloat(tlv);
  if (isNaN(m) || isNaN(t) || t === 0) return { ratio: '', verdict: '' };
  const r = (m / t * 100).toFixed(1);
  return { ratio: r, verdict: parseFloat(r) > 100 ? '초과' : '적합' };
};

// ✨ NEW: 문자열 정규화 (매칭 품질 향상)
const normStr = (s: string): string =>
  s.toLowerCase().replace(/[\s$$$$·,\-\/\.]/g, '');

// ✨ NEW: CAS 번호 정규화 (하이픈·공백 제거)
const normCAS = (s: string): string =>
  s.replace(/[\s\-]/g, '');

/* ─── CSV 파싱 유틸 ─────────────────────────────────────────────────────────── */
// 🔧 FIX: parseCSVLine 함수 추가 (기존 코드에서 사용만 하고 정의 없음)
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
};

/* ─── ✨ NEW: Excel 내보내기 ─────────────────────────────────────────────────── */
const exportTargetsToExcel = (targets: TargetItem[]) => {
  const rows = [
    ['No', '분류', '물질명', 'CAS 번호', '노출기준(TWA)', '단위', '측정 주기', '법적 근거'],
    ...targets.map((t, i) => {
      const s = SUBSTANCE_DB.find(x => x.id === t.substanceId);
      return [
        i + 1, s?.cat ?? '', t.name, t.cas,
        t.tlv, t.unit, t.cycle,
        s ? CAT_LEGAL[s.cat] : '',
      ];
    }),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 }, { wch: 8 }, { wch: 36 }, { wch: 16 },
    { wch: 14 }, { wch: 8 }, { wch: 9 }, { wch: 48 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '측정대상물질');
  XLSX.writeFile(wb, `측정대상물질_${todayStr()}.xlsx`);
};
const downloadUploadTemplate = () => {
  const headers = ['품목명(물질명)', 'CAS NO', '비고'];
  const examples = [
    ['벤젠', '71-43-2', '예시 데이터'],
    ['아세톤', '67-64-1', '예시 데이터'],
    ['티타늄디옥사이드 (CI 77891)', '13463-67-7', '예시 데이터'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);

  // 컬럼 너비
  ws['!cols'] = [
    { wch: 36 },
    { wch: 18 },
    { wch: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '원료리스트');
  XLSX.writeFile(wb, `원료리스트_업로드양식_${todayStr()}.xlsx`);
};
/* ─── 컴포넌트 ───────────────────────────────────────────────────────────────── */
export default function WorkEnvironmentPage() {
  const [tab,        setTab]        = useState<Tab>('target');
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState<Cat | 'ALL'>('ALL');
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [targets,    setTargets]    = useState<TargetItem[]>([]);
  const [records,    setRecords]    = useState<MeasRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mounted,    setMounted]    = useState(false);

  /* 원료 리스트 분석 상태 */
  const [analysisRows,     setAnalysisRows]     = useState<AnalysisRow[]>([]);
  const [analysisFileName, setAnalysisFileName] = useState('');
  const [showAnalysis,     setShowAnalysis]     = useState(false);
  const [analysisFilter,   setAnalysisFilter]   = useState<'all' | 'matched' | 'unmatched'>('all');

  /* 결과 등록 폼 */
  const [form, setForm] = useState({
    agency: '', dept: DEPTS[0], process: '', samplingDate: todayStr(), reportDate: '',
  });
  const [resultRows,  setResultRows]  = useState<ResultRow[]>([]);
  const [attachNames, setAttachNames] = useState<string[]>([]);
  const [checklist,   setChecklist]   = useState<boolean[]>([false, false, false, false]);
const loadInitialData = async () => {
  try {
    const [targetsRes, recordsRes] = await Promise.all([
      fetch('/api/work-environment/targets'),
      fetch('/api/work-environment/records'),
    ]);

    // ✅ ok일 때만, 배열일 때만 setState
    if (targetsRes.ok) {
      const targetsData = await targetsRes.json();
      if (Array.isArray(targetsData)) setTargets(targetsData);
    }
    if (recordsRes.ok) {
      const recordsData = await recordsRes.json();
      if (Array.isArray(recordsData)) setRecords(recordsData);
    }
  } catch (e) {
    console.error('데이터 로딩 실패:', e);
    // ← alert 제거, API 없어도 조용히 실패
  }
};
  /* ── localStorage 초기화 */
  useEffect(() => {
  setMounted(true);
  loadInitialData();
}, []);

  const saveTargetsToServer = async (
  data: TargetItem[],
  siteName: string,
  analysisHistoryId?: string
) => {
  const res = await fetch('/api/work-environment/targets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteName,
      items: data.map(item => ({
        substanceId: item.substanceId,
        cycle: item.cycle,
        tlv: item.tlv,
        unit: item.unit,
        sourceAnalysisHistoryId: analysisHistoryId ?? null,
      })),
    }),
  });
  if (!res.ok) throw new Error('측정 대상 저장 실패');
  return await res.json();
};
// ─── 추가 ──────────────────────────────────────────────────
const saveAnalysisHistory = async () => {
  const res = await fetch('/api/work-environment/analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: analysisFileName,
      rows: analysisRows.map(r => ({
        rowIdx: r.rowIdx,
        uploadName: r.uploadName,
        uploadCas: r.uploadCas,
        matchedSubstanceId: r.matched?.id ?? null,
        matchType: r.matchType ?? null,
        include: r.include,
      })),
    }),
  });
  if (!res.ok) throw new Error('판별 이력 저장 실패');
  return await res.json();
};

  /* ── ✨ NEW: parseAndAnalyze — normStr/normCAS 기반 개선된 매칭 + matchType 기록 */
  const parseAndAnalyze = (csvText: string, fileName: string) => {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { alert('데이터가 없습니다.'); return; }

    const headers = parseCSVLine(lines[0]);

    const casIdx  = headers.findIndex(h =>
      h.toUpperCase().replace(/[\s\.]/g, '').includes('CAS')
    );
    const nameIdx = headers.findIndex(h =>
      ['품목명','물질명','성분명','원료명','화학물질명','화학물질','원료','성분']
        .some(k => h.includes(k))
    );

    if (casIdx === -1 && nameIdx === -1) {
      alert(
        'CAS NO 또는 품목명(물질명) 컬럼을 찾을 수 없습니다.\n' +
        '첫 행이 헤더인지 확인해 주세요.\n\n' +
        '감지된 헤더: ' + headers.slice(0, 8).join(', ')
      );
      return;
    }

    const rows: AnalysisRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.every(c => !c)) continue;

      const uploadCas  = (casIdx  >= 0 ? cols[casIdx]  ?? '' : '').trim();
      const uploadName = (nameIdx >= 0 ? cols[nameIdx] ?? '' : '').trim();
      if (!uploadCas && !uploadName) continue;

      let matched: Substance | null = null;
      let matchType: 'cas' | 'name' | null = null;

      // 🔧 FIX + ✨: 1) CAS 정규화 일치 (우선순위 1)
      if (uploadCas) {
        const nc = normCAS(uploadCas);
        matched = SUBSTANCE_DB.find(s => normCAS(s.cas) === nc) ?? null;
        if (matched) matchType = 'cas';
      }

      // 🔧 FIX + ✨: 2) 정규화된 이름 포함 일치 (우선순위 2)
      if (!matched && uploadName) {
        const q = normStr(uploadName);
        matched = SUBSTANCE_DB.find(s => {
          const dbN = normStr(s.name);
          return dbN === q || dbN.includes(q) || q.includes(dbN);
        }) ?? null;
        if (matched) matchType = 'name';
      }

      rows.push({ rowIdx: i, uploadName, uploadCas, matched, matchType, include: matched !== null });
    }

    if (rows.length === 0) { alert('파싱된 행이 없습니다.'); return; }
    setAnalysisRows(rows);
    setAnalysisFileName(fileName);
    setShowAnalysis(true);
    setAnalysisFilter('all');
  };

  // 🔧 FIX: handleAnalysisFile — XLSX 라이브러리로 Excel/CSV 통합 파싱
  const handleAnalysisFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        // XLSX.read는 Excel(.xlsx/.xls)과 CSV 모두 처리 가능
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // sheet_to_csv로 통일된 포맷 변환 후 파싱
        const csvText = XLSX.utils.sheet_to_csv(worksheet);
        parseAndAnalyze(csvText, file.name);
      } catch {
        alert('파일 파싱 오류: Excel(.xlsx/.xls) 또는 CSV(.csv) 형식인지 확인해주세요.');
      }
    };
    // 🔧 FIX: readAsArrayBuffer는 인코딩 파라미터 없음 (두 번째 인자 제거)
    reader.readAsArrayBuffer(file);
  };

  const toggleAnalysisInclude = (idx: number) =>
    setAnalysisRows(prev => prev.map((r, i) => i === idx ? { ...r, include: !r.include } : r));

  const toggleAllInclude = (val: boolean) =>
    setAnalysisRows(prev => prev.map(r => r.matched ? { ...r, include: val } : r));

  const addAnalyzedTargets = async () => {
  const toAdd = analysisRows
    .filter(r => r.include && r.matched)
    .map(r => r.matched!)
    .filter(s => !targets.find(t => t.substanceId === s.id));

  if (toAdd.length === 0) {
    alert('추가할 새 물질이 없습니다.\n(이미 측정 대상에 모두 포함되어 있습니다.)');
    return;
  }

  const newTargets: TargetItem[] = toAdd.map(s => ({
    substanceId: s.id, name: s.name, cas: s.cas,
    cycle: s.defaultCycle, tlv: s.tlv, unit: s.unit,
  }));

  try {
    const analysisSaved = await saveAnalysisHistory();       // ← 판별 이력 저장
    await saveTargetsToServer(newTargets, form.dept, analysisSaved.id); // ← 대상 저장
    const ns = new Set(selected);
    toAdd.forEach(s => ns.add(s.id));
    setSelected(ns);
    await loadInitialData();                                 // ← 서버 재조회
    alert(`${toAdd.length}종이 측정 대상에 추가되었습니다.`);
  } catch (e) {
    console.error(e);
    alert('저장 중 오류가 발생했습니다.');
  }
};

  /* ── 물질 선정 로직 */
  const filtered = SUBSTANCE_DB.filter(s => {
    const matchCat = catFilter === 'ALL' || s.cat === catFilter;
    const q = search.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.cas.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const confirmTargets = async () => {
  const newTargets: TargetItem[] = [...selected].map(id => {
    const s = SUBSTANCE_DB.find(x => x.id === id)!;
    const existing = targets.find(t => t.substanceId === id);
    return existing ?? {
      substanceId: id, name: s.name, cas: s.cas,
      cycle: s.defaultCycle, tlv: s.tlv, unit: s.unit,
    };
  });

  try {
    await saveTargetsToServer(newTargets, form.dept);  // ← 서버 저장
    await loadInitialData();                           // ← 재조회
    setTab('register');
  } catch (e) {
    console.error(e);
    alert('저장 중 오류가 발생했습니다.');
  }
};

  const updateTargetCycle = async (substanceId: string, cycle: Cycle) => {
  try {
    const res = await fetch(`/api/work-environment/targets/${substanceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycle }),
    });
    if (!res.ok) throw new Error('주기 변경 실패');
    await loadInitialData();  // ← 재조회
  } catch (e) {
    console.error(e);
    alert('측정 주기 변경 중 오류가 발생했습니다.');
  }
};

  const removeTarget = async (substanceId: string) => {
  try {
    const res = await fetch(`/api/work-environment/targets/${substanceId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('삭제 실패');
    setSelected(prev => { const n = new Set(prev); n.delete(substanceId); return n; });
    await loadInitialData();  // ← 재조회
  } catch (e) {
    console.error(e);
    alert('측정 대상 삭제 중 오류가 발생했습니다.');
  }
};

  /* ── 결과 등록 로직 */
  const loadTargetsToForm = () => {
    setResultRows(targets.map(t => ({
      substanceId: t.substanceId, name: t.name, cas: t.cas,
      unit: t.unit, tlv: t.tlv, measured: '', exposureRatio: '', verdict: '', note: '',
    })));
  };

  const updateRow = (idx: number, field: keyof ResultRow, val: string) => {
    setResultRows(prev => {
      const next = [...prev];
      const row = { ...next[idx], [field]: val };
      if (field === 'measured' || field === 'tlv') {
        const { ratio, verdict } = calcExposure(
          field === 'measured' ? val : row.measured,
          field === 'tlv'      ? val : row.tlv,
        );
        row.exposureRatio = ratio;
        row.verdict = verdict;
      }
      next[idx] = row;
      return next;
    });
  };

  const addManualRow = () =>
    setResultRows(prev => [...prev, {
      substanceId: '', name: '', cas: '', unit: 'mg/m³',
      tlv: '', measured: '', exposureRatio: '', verdict: '', note: '',
    }]);

  const removeRow = (idx: number) =>
    setResultRows(prev => prev.filter((_, i) => i !== idx));

  const submitRecord = async () => {
  if (!form.agency.trim()) { alert('측정기관을 입력해주세요.'); return; }
  if (!form.samplingDate)  { alert('시료채취일을 입력해주세요.'); return; }
  if (resultRows.filter(r => r.name).length === 0) { alert('측정 결과를 1개 이상 입력해주세요.'); return; }

  try {
    const res = await fetch('/api/work-environment/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteName: form.dept,
        agency: form.agency,
        dept: form.dept,
        process: form.process,
        samplingDate: form.samplingDate,
        reportDate: form.reportDate,
        items: resultRows.filter(r => r.name),
      }),
    });
    if (!res.ok) throw new Error('저장 실패');

    await loadInitialData();  // ← 재조회
    setResultRows([]);
    setAttachNames([]);
    setChecklist([false, false, false, false]);
    setForm({ agency: '', dept: DEPTS[0], process: '', samplingDate: todayStr(), reportDate: '' });
    setTab('history');
  } catch (e) {
    console.error(e);
    alert('측정 결과 저장 중 오류가 발생했습니다.');
  }
};
const deleteRecord = async (recordId: string, seq: number) => {
    if (!confirm(`제${seq}회 측정 결과를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/work-environment/records/${recordId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('삭제 실패');
      await loadInitialData();
      setExpandedId(null);
    } catch (e) {
      console.error(e);
      alert('측정 결과 삭제 중 오류가 발생했습니다.');
    }
  };

  /* ── 스타일 */
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '9px 20px', border: 'none',
    borderBottom: active ? '2px solid #0284c7' : '2px solid transparent',
    background: 'transparent',
    color: active ? '#0284c7' : '#6b7280',
    fontWeight: active ? 700 : 400,
    fontSize: '13px', cursor: 'pointer', marginBottom: '-1px',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb',
    borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Pretendard,-apple-system,sans-serif',
  };

  /* ── 다음 측정 예정일 */
  const nextSchedule = (() => {
    if (!targets.length || !records.length) return [];
    const lastRecord = records[records.length - 1];
    return targets
      .map(t => {
        const nextDate = addMonths(lastRecord.samplingDate, cycleMonths(t.cycle));
        return { ...t, nextDate, d: dDays(nextDate) };
      })
      .sort((a, b) => a.d - b.d);
  })();

  /* ── 분석 파생 값 */
  const matchedCount  = analysisRows.filter(r => r.matched).length;
  const includeCount  = analysisRows.filter(r => r.include && r.matched).length;
  const displayedRows = analysisRows.filter(r =>
    analysisFilter === 'all'       ? true :
    analysisFilter === 'matched'   ? !!r.matched :
    !r.matched
  );

  /* ─── 렌더 ─────────────────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '28px 32px' }}>

      {/* 페이지 헤더 */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
        <span style={{ background:'#f3f4f6', color:'#6b7280', fontSize:'11px', fontWeight:'700', padding:'2px 8px', borderRadius:'4px' }}>06</span>
        <h2 style={{ fontSize:'20px', fontWeight:'700', color:'#111827', margin:0 }}>작업환경측정</h2>
      </div>
      <p style={{ fontSize:'13px', color:'#6b7280', marginBottom:'16px', lineHeight:1.6 }}>
        산업안전보건법 제125조 및 작업환경측정 고시(고용노동부고시 제2020-44호)에 따른 측정 대상 물질 관리 및 측정 결과 등록
      </p>

      {/* 법적 요약 인포박스 */}
      <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:'8px', padding:'12px 16px', marginBottom:'20px', fontSize:'12px', color:'#0369a1', lineHeight:1.8 }}>
        <span style={{ fontWeight:'700' }}>측정 주기 기준 (고시 제4조)</span>
        {'  ·  '}
        <span style={{ color:'#dc2626', fontWeight:'600' }}>Z3 특별관리물질: 3개월 1회 이상 (45일 이상 간격)</span>
        {'  ·  '}
        <span style={{ color:'#d97706', fontWeight:'600' }}>ZA 분진 등 일반: 반기(6개월) 1회 이상 (3개월 이상 간격)</span>
        {'  ·  '}
        <span style={{ color:'#16a34a', fontWeight:'600' }}>노출기준 이하 확인: 연(12개월) 1회 이상 (6개월 이상 간격)</span>
        <br />
        결과 보존 기간: <strong>일반 물질 5년</strong> / <strong>특별관리물질 30년</strong>&nbsp;·&nbsp;결과 통보 후 30일 이내 사업주 제출
      </div>

      {/* 탭 */}
      <div style={{ display:'flex', gap:'2px', marginBottom:'24px', borderBottom:'1px solid #e5e7eb', paddingBottom:'0' }}>
        <button style={tabBtnStyle(tab==='target')} onClick={() => setTab('target')}>
          측정 대상 물질 선정{targets.length > 0 ? ` (${targets.length}종)` : ''}
        </button>
        <button style={tabBtnStyle(tab==='register')} onClick={() => setTab('register')}>
          측정 결과 등록
        </button>
        <button style={tabBtnStyle(tab==='history')} onClick={() => setTab('history')}>
          측정 현황{records.length > 0 ? ` (${records.length}건)` : ''}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1 — 측정 대상 물질 선정
      ══════════════════════════════════════════════════════════════ */}
      {tab === 'target' && (
        <div>

          {/* ★ 원료 리스트 업로드 분석 섹션 ★ */}
          <div style={{ border:'1px solid #c7d2fe', borderRadius:'8px', padding:'16px', marginBottom:'20px', background:'#eef2ff' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px' }}>
              <div>
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#3730a3', marginBottom:'3px' }}>
                  원료 리스트 업로드 → 측정 대상 자동 판별
                </div>
                <div style={{ fontSize:'12px', color:'#4338ca', lineHeight:1.7 }}>
                  사업장 원료 리스트를 업로드하면 각 원료의 <strong>측정 대상 여부를 자동으로 판별</strong>합니다.<br />
                  {/* 🔧 FIX: xlsx/xls/csv 모두 지원 */}
                  <span style={{ color:'#6366f1' }}>지원 형식: <strong>Excel(.xlsx/.xls)</strong> · <strong>CSV(.csv)</strong>&nbsp;|&nbsp;
                    필수 컬럼: <strong>품목명</strong>(물질명·원료명 등) 또는 <strong>CAS NO</strong> 중 하나 이상
                  </span>
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px', flexShrink:0, alignItems:'center' }}>
                {showAnalysis && (
                  <button onClick={() => { setShowAnalysis(false); setAnalysisRows([]); setAnalysisFileName(''); }}
                    style={{ padding:'7px 14px', border:'1px solid #a5b4fc', borderRadius:'6px', background:'#fff', color:'#4338ca', fontSize:'12px', cursor:'pointer' }}>
                    초기화
                  </button>
                )}
                 <button onClick={downloadUploadTemplate} style={{
    padding:'8px 14px',
    border:'1px solid #6366f1',
    borderRadius:'6px',
    background:'#fff',
    color:'#4338ca',
    fontSize:'13px',
    fontWeight:'600',
    cursor:'pointer',
  }}>
    양식 다운로드
  </button>

  <input type="file" id="analysis-csv" accept=".xlsx,.xls,.csv" style={{ display:'none' }}
    onChange={e => { const f = e.target.files?.[0]; if (f) handleAnalysisFile(f); e.target.value = ''; }} />
  <label htmlFor="analysis-csv" style={{
    display:'inline-block', padding:'8px 18px',
    border:'none', borderRadius:'6px',
    background:'#4338ca', color:'#fff',
    fontSize:'13px', fontWeight:'600', cursor:'pointer',
  }}>
    파일 업로드
  </label>
</div>
            </div>

            {/* 분석 결과 */}
            {showAnalysis && analysisRows.length > 0 && (
              <div style={{ marginTop:'16px' }}>
                {/* 요약 배지 */}
                <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'10px', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'12px', color:'#374151' }}>
                    파일: <strong style={{ color:'#111827' }}>{analysisFileName}</strong>
                  </span>
                  <button onClick={() => setAnalysisFilter('all')} style={{
                    padding:'3px 10px', borderRadius:'4px', fontSize:'12px', cursor:'pointer', border:'none',
                    background: analysisFilter==='all' ? '#312e81' : '#e0e7ff',
                    color: analysisFilter==='all' ? '#fff' : '#3730a3', fontWeight: analysisFilter==='all' ? 700 : 400,
                  }}>전체 {analysisRows.length}종</button>
                  <button onClick={() => setAnalysisFilter('matched')} style={{
                    padding:'3px 10px', borderRadius:'4px', fontSize:'12px', cursor:'pointer', border:'none',
                    background: analysisFilter==='matched' ? '#15803d' : '#dcfce7',
                    color: analysisFilter==='matched' ? '#fff' : '#16a34a', fontWeight: analysisFilter==='matched' ? 700 : 400,
                  }}>측정 대상 {matchedCount}종</button>
                  <button onClick={() => setAnalysisFilter('unmatched')} style={{
                    padding:'3px 10px', borderRadius:'4px', fontSize:'12px', cursor:'pointer', border:'none',
                    background: analysisFilter==='unmatched' ? '#6b7280' : '#f3f4f6',
                    color: analysisFilter==='unmatched' ? '#fff' : '#6b7280', fontWeight: analysisFilter==='unmatched' ? 700 : 400,
                  }}>해당없음 {analysisRows.length - matchedCount}종</button>
                </div>

                {/* 결과 테이블 — ✨ NEW: 매칭 방법·법적 근거 컬럼 추가 */}
                <div style={{ border:'1px solid #e5e7eb', borderRadius:'6px', overflow:'hidden', maxHeight:'380px', overflowY:'auto', background:'#fff' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                    <thead>
                      <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                        <th style={{ padding:'9px 12px', textAlign:'center', width:'44px', fontWeight:'600', color:'#6b7280' }}>
                          <input type="checkbox"
                            checked={matchedCount > 0 && analysisRows.filter(r => r.matched).every(r => r.include)}
                            onChange={e => toggleAllInclude(e.target.checked)}
                          />
                        </th>
                        <th style={{ padding:'9px 12px', textAlign:'left', fontWeight:'600', color:'#6b7280' }}>원료명 (업로드)</th>
                        <th style={{ padding:'9px 12px', textAlign:'left', fontWeight:'600', color:'#6b7280', width:'120px' }}>CAS (업로드)</th>
                        <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'80px' }}>측정 대상</th>
                        {/* ✨ NEW */}
                        <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'72px' }}>매칭 방법</th>
                        <th style={{ padding:'9px 12px', textAlign:'left', fontWeight:'600', color:'#6b7280' }}>매칭 물질명 (DB)</th>
                        <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'60px' }}>분류</th>
                        <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'86px' }}>노출기준</th>
                        <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'72px' }}>주기</th>
                        {/* ✨ NEW */}
                        <th style={{ padding:'9px 12px', textAlign:'left', fontWeight:'600', color:'#6b7280', minWidth:'160px' }}>법적 근거</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedRows.length === 0
                        ? <tr><td colSpan={10} style={{ padding:'28px', textAlign:'center', color:'#9ca3af' }}>표시할 항목이 없습니다.</td></tr>
                        : displayedRows.map((row, idx) => {
                          const isMatched = !!row.matched;
                          const badge  = row.matched ? CAT_BADGE[row.matched.cat] : null;
                          const cycBdg = row.matched ? CYCLE_BADGE[row.matched.defaultCycle] : null;
                          return (
                            <tr key={idx} style={{
                              borderBottom:'1px solid #f3f4f6',
                              background: isMatched ? '#f0fdf4' : 'transparent',
                            }}>
                              <td style={{ padding:'7px 12px', textAlign:'center' }}>
                                {isMatched && (
                                  <input type="checkbox" checked={row.include}
                                    onChange={() => toggleAnalysisInclude(analysisRows.indexOf(row))} />
                                )}
                              </td>
                              <td style={{ padding:'7px 12px', color:'#111827', fontWeight: isMatched ? 600 : 400 }}>
                                {row.uploadName || '-'}
                              </td>
                              <td style={{ padding:'7px 12px', color:'#6b7280', fontFamily:'monospace', fontSize:'11px' }}>
                                {row.uploadCas || '-'}
                              </td>
                              <td style={{ padding:'7px 12px', textAlign:'center' }}>
                                {isMatched
                                  ? <span style={{ padding:'2px 8px', borderRadius:'4px', fontSize:'11px', fontWeight:'700', background:'#dcfce7', color:'#16a34a' }}>대상</span>
                                  : <span style={{ padding:'2px 8px', borderRadius:'4px', fontSize:'11px', color:'#9ca3af', background:'#f3f4f6' }}>해당없음</span>
                                }
                              </td>
                              {/* ✨ NEW: 매칭 방법 표시 */}
                              <td style={{ padding:'7px 12px', textAlign:'center' }}>
                                {row.matchType === 'cas' && (
                                  <span style={{ padding:'2px 6px', borderRadius:'3px', fontSize:'10px', fontWeight:'700', background:'#dbeafe', color:'#1e40af' }}>CAS</span>
                                )}
                                {row.matchType === 'name' && (
                                  <span style={{ padding:'2px 6px', borderRadius:'3px', fontSize:'10px', fontWeight:'700', background:'#fef9c3', color:'#854d0e' }}>이름</span>
                                )}
                              </td>
                              <td style={{ padding:'7px 12px', color:'#374151', fontSize:'12px' }}>
                                {row.matched?.name ?? '-'}
                              </td>
                              <td style={{ padding:'7px 12px', textAlign:'center' }}>
                                {badge && (
                                  <span style={{ padding:'2px 6px', borderRadius:'3px', fontSize:'10px', fontWeight:'700', background:badge.bg, color:badge.color }}>
                                    {row.matched?.cat}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding:'7px 12px', textAlign:'center', color:'#374151', fontSize:'11px' }}>
                                {row.matched ? `${row.matched.tlv} ${row.matched.unit}` : '-'}
                              </td>
                              <td style={{ padding:'7px 12px', textAlign:'center' }}>
                                {cycBdg && (
                                  <span style={{ padding:'2px 6px', borderRadius:'3px', fontSize:'10px', fontWeight:'600', background:cycBdg.bg, color:cycBdg.color }}>
                                    {row.matched?.defaultCycle}
                                  </span>
                                )}
                              </td>
                              {/* ✨ NEW: 법적 근거 */}
                              <td style={{ padding:'7px 12px', color:'#6b7280', fontSize:'11px' }}>
                                {row.matched ? CAT_LEGAL[row.matched.cat] : '-'}
                              </td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                </div>

                {/* 하단 버튼 */}
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'10px' }}>
                  <button onClick={addAnalyzedTargets}
                    disabled={includeCount === 0}
                    style={{
                      padding:'8px 20px', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'600',
                      background: includeCount > 0 ? '#4338ca' : '#e5e7eb',
                      color:      includeCount > 0 ? '#fff'    : '#9ca3af',
                      cursor:     includeCount > 0 ? 'pointer' : 'default',
                    }}>
                    선택 {includeCount}종 → 측정 대상에 추가
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* ★ 업로드 분석 섹션 끝 ★ */}

          {/* 검색 & 분류 필터 */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap', alignItems:'center' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="물질명 또는 CAS 번호 검색..."
              style={{ flex:'1', minWidth:'220px', padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:'6px', fontSize:'13px', outline:'none' }}
            />
            {(['ALL','ZA','Z3','Z1','Z2','Z4','Z5','Z6'] as const).map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{
                padding:'6px 12px', borderRadius:'6px', fontSize:'12px', cursor:'pointer',
                border:     catFilter === cat ? '1px solid #0284c7' : '1px solid #e5e7eb',
                background: catFilter === cat ? '#e0f2fe' : '#fff',
                color:      catFilter === cat ? '#0369a1' : '#6b7280',
                fontWeight: catFilter === cat ? 700 : 400,
              }}>
                {cat === 'ALL' ? '전체' : cat}
              </button>
            ))}
            <span style={{ fontSize:'12px', color:'#9ca3af' }}>
              {selected.size}개 선택 / {filtered.length}개
            </span>
          </div>

          {/* 선택 칩 */}
          {selected.size > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'12px', padding:'10px 14px', background:'#f0f9ff', borderRadius:'8px', border:'1px solid #bae6fd' }}>
              <span style={{ fontSize:'12px', color:'#0369a1', fontWeight:'600', alignSelf:'center', marginRight:'2px' }}>선택됨:</span>
              {[...selected].map(id => {
                const s = SUBSTANCE_DB.find(x => x.id === id)!;
                if (!s) return null;
                const badge = CAT_BADGE[s.cat];
                return (
                  <span key={id} style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 8px 3px 10px', background:'#dbeafe', color:'#1e40af', borderRadius:'12px', fontSize:'12px' }}>
                    <span style={{ fontSize:'10px', padding:'1px 5px', borderRadius:'3px', background:badge.bg, color:badge.color, fontWeight:'700', marginRight:'2px' }}>{s.cat}</span>
                    {s.name}
                    <button onClick={() => toggleSelect(id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:'15px', lineHeight:1, padding:0, marginLeft:'2px' }}>×</button>
                  </span>
                );
              })}
            </div>
          )}

          {/* 물질 테이블 — ✨ NEW: 법적 근거 컬럼 추가 */}
          <div style={{ border:'1px solid #e5e7eb', borderRadius:'8px', overflow:'hidden', marginBottom:'16px' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                  <th style={{ padding:'10px 14px', textAlign:'center', width:'44px', fontWeight:'600', color:'#6b7280' }}>
                    <input type="checkbox"
                      checked={filtered.length > 0 && filtered.every(s => selected.has(s.id))}
                      onChange={e => {
                        const n = new Set(selected);
                        if (e.target.checked) filtered.forEach(s => n.add(s.id));
                        else filtered.forEach(s => n.delete(s.id));
                        setSelected(n);
                      }}
                    />
                  </th>
                  <th style={{ padding:'10px 14px', textAlign:'left',   fontWeight:'600', color:'#6b7280', width:'90px'  }}>분류</th>
                  <th style={{ padding:'10px 14px', textAlign:'left',   fontWeight:'600', color:'#6b7280'               }}>물질명</th>
                  <th style={{ padding:'10px 14px', textAlign:'left',   fontWeight:'600', color:'#6b7280', width:'140px' }}>CAS 번호</th>
                  <th style={{ padding:'10px 14px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'130px' }}>노출기준 (TWA)</th>
                  <th style={{ padding:'10px 14px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'100px' }}>측정 주기</th>
                  {/* ✨ NEW */}
                  <th style={{ padding:'10px 14px', textAlign:'left',   fontWeight:'600', color:'#6b7280'               }}>법적 근거</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={7} style={{ padding:'32px', textAlign:'center', color:'#9ca3af', fontSize:'13px' }}>검색 결과가 없습니다.</td></tr>
                  : filtered.map((s, i) => {
                    const isSel  = selected.has(s.id);
                    const badge  = CAT_BADGE[s.cat];
                    const cycBdg = CYCLE_BADGE[s.defaultCycle];
                    return (
                      <tr key={s.id} onClick={() => toggleSelect(s.id)} style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
                        background: isSel ? '#f0f9ff' : 'transparent',
                        cursor: 'pointer',
                      }}>
                        <td style={{ padding:'10px 14px', textAlign:'center' }}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleSelect(s.id)} onClick={e => e.stopPropagation()} />
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ padding:'2px 8px', borderRadius:'4px', fontSize:'11px', fontWeight:'700', background:badge.bg, color:badge.color }}>
                            {s.cat}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px', color:'#111827', fontWeight: isSel ? 600 : 400 }}>{s.name}</td>
                        <td style={{ padding:'10px 14px', color:'#6b7280', fontFamily:'monospace', fontSize:'12px' }}>{s.cas}</td>
                        <td style={{ padding:'10px 14px', textAlign:'center', color:'#374151' }}>{s.tlv} {s.unit}</td>
                        <td style={{ padding:'10px 14px', textAlign:'center' }}>
                          <span style={{ padding:'2px 8px', borderRadius:'4px', fontSize:'11px', fontWeight:'600', background:cycBdg.bg, color:cycBdg.color }}>
                            {s.defaultCycle}
                          </span>
                        </td>
                        {/* ✨ NEW */}
                        <td style={{ padding:'10px 14px', color:'#6b7280', fontSize:'11px' }}>
                          {CAT_LEGAL[s.cat]}
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>

          {/* 확정된 측정 대상 목록 — ✨ NEW: 엑셀 내보내기 버튼 추가 */}
          {targets.length > 0 && (
            <div style={{ border:'1px solid #e5e7eb', borderRadius:'8px', padding:'16px', marginBottom:'16px', background:'#fafafa' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                <div style={{ fontSize:'14px', fontWeight:'700', color:'#111827' }}>
                  현재 확정된 측정 대상 ({targets.length}종)
                  <span style={{ fontSize:'11px', color:'#9ca3af', fontWeight:'400', marginLeft:'8px' }}>측정 주기를 직접 조정할 수 있습니다.</span>
                </div>
                {/* ✨ NEW: Excel 내보내기 */}
                <button onClick={() => exportTargetsToExcel(targets)} style={{
                  padding:'6px 14px', border:'1px solid #16a34a', borderRadius:'6px',
                  background:'#f0fdf4', color:'#16a34a', fontSize:'12px', fontWeight:'600', cursor:'pointer',
                }}>
                  Excel 내보내기
                </button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'8px' }}>
                {targets.map(t => {
                  const s = SUBSTANCE_DB.find(x => x.id === t.substanceId);
                  const badge  = s ? CAT_BADGE[s.cat] : { bg:'#f3f4f6', color:'#374151' };
                  const cycBdg = CYCLE_BADGE[t.cycle];
                  return (
                    <div key={t.substanceId} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', fontSize:'12px' }}>
                      <span style={{ padding:'1px 6px', borderRadius:'3px', fontSize:'10px', fontWeight:'700', background:badge.bg, color:badge.color, flexShrink:0 }}>
                        {s?.cat ?? ''}
                      </span>
                      <span style={{ flex:1, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={t.name}>
                        {t.name}
                      </span>
                      <select
                        value={t.cycle}
                        onChange={e => updateTargetCycle(t.substanceId, e.target.value as Cycle)}
                        onClick={e => e.stopPropagation()}
                        style={{ padding:'2px 6px', border:`1px solid ${cycBdg.color}40`, borderRadius:'4px', fontSize:'11px', color:cycBdg.color, background:cycBdg.bg, outline:'none', cursor:'pointer' }}
                      >
                        <option>3개월</option>
                        <option>6개월</option>
                        <option>12개월</option>
                      </select>
                      <button onClick={() => removeTarget(t.substanceId)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:'16px', lineHeight:1, padding:0, flexShrink:0 }}>×</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 하단 버튼 */}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px' }}>
            <button onClick={() => setSelected(new Set())} style={{ padding:'9px 18px', border:'1px solid #e5e7eb', borderRadius:'6px', background:'#fff', color:'#6b7280', fontSize:'13px', cursor:'pointer' }}>
              선택 초기화
            </button>
            <button
              onClick={confirmTargets}
              disabled={selected.size === 0}
              style={{
                padding:'9px 22px', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'600',
                background: selected.size > 0 ? '#0284c7' : '#e5e7eb',
                color:      selected.size > 0 ? '#fff'    : '#9ca3af',
                cursor:     selected.size > 0 ? 'pointer' : 'default',
              }}
            >
              {selected.size}개 물질 측정 대상 확정 →
            </button>
          </div>
        </div>
      )}

            {/* ══════════════════════════════════════════════════════════════
          TAB 2 — 측정 결과 등록
      ══════════════════════════════════════════════════════════════ */}
      {tab === 'register' && (
        <div>
          {targets.length === 0 && (
            <div style={{ padding:'14px 18px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'8px', fontSize:'13px', color:'#92400e', marginBottom:'16px', display:'flex', alignItems:'center', gap:'10px' }}>
              <span>측정 대상 물질을 먼저 선정해야 합니다.</span>
              <button onClick={() => setTab('target')} style={{ padding:'5px 14px', border:'none', borderRadius:'5px', background:'#f59e0b', color:'#fff', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
                물질 선정 탭으로 이동 →
              </button>
            </div>
          )}

          <div style={{ border:'1px solid #e5e7eb', borderRadius:'8px', padding:'20px', marginBottom:'16px' }}>
            <div style={{ fontSize:'14px', fontWeight:'700', color:'#111827', marginBottom:'14px' }}>측정 기본 정보</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
              <div>
                <label style={{ fontSize:'12px', color:'#6b7280', display:'block', marginBottom:'5px' }}>측정기관 *</label>
                <input value={form.agency} onChange={e => setForm(p => ({...p, agency:e.target.value}))}
                  list="agency-list" placeholder="기관명 입력 또는 선택" style={inputStyle} />
                <datalist id="agency-list">{AGENCIES.map(a => <option key={a} value={a}/>)}</datalist>
              </div>
              <div>
                <label style={{ fontSize:'12px', color:'#6b7280', display:'block', marginBottom:'5px' }}>사업장</label>
                <select value={form.dept} onChange={e => setForm(p => ({...p, dept:e.target.value}))} style={inputStyle}>
                  {DEPTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:'12px', color:'#6b7280', display:'block', marginBottom:'5px' }}>측정 공정</label>
                <input value={form.process} onChange={e => setForm(p => ({...p, process:e.target.value}))}
                  list="process-list" placeholder="공정명 입력 또는 선택" style={inputStyle} />
                <datalist id="process-list">{PROCS.map(p => <option key={p} value={p}/>)}</datalist>
              </div>
              <div>
                <label style={{ fontSize:'12px', color:'#6b7280', display:'block', marginBottom:'5px' }}>시료채취일 *</label>
                <input type="date" value={form.samplingDate}
                  onChange={e => setForm(p => ({...p, samplingDate:e.target.value}))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize:'12px', color:'#6b7280', display:'block', marginBottom:'5px' }}>결과보고일</label>
                <input type="date" value={form.reportDate}
                  onChange={e => setForm(p => ({...p, reportDate:e.target.value}))} style={inputStyle} />
              </div>
              <div style={{ display:'flex', alignItems:'flex-end' }}>
                <button onClick={loadTargetsToForm} style={{
                  width:'100%', padding:'8px 12px', border:'1px dashed #0284c7',
                  borderRadius:'6px', background:'#f0f9ff', color:'#0284c7',
                  fontSize:'12px', fontWeight:'600', cursor:'pointer',
                }}>
                  확정 대상 물질 불러오기 ({targets.length}종)
                </button>
              </div>
            </div>
          </div>

          <div style={{ border:'1px solid #e5e7eb', borderRadius:'8px', overflow:'hidden', marginBottom:'16px' }}>
            <div style={{ padding:'12px 16px', background:'#f9fafb', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:'14px', fontWeight:'700', color:'#111827' }}>
                측정 결과 입력
                {resultRows.length > 0 && <span style={{ fontSize:'12px', color:'#6b7280', fontWeight:'400', marginLeft:'8px' }}>{resultRows.length}종</span>}
              </span>
              <button onClick={addManualRow} style={{ padding:'5px 12px', border:'1px solid #e5e7eb', borderRadius:'5px', background:'#fff', color:'#374151', fontSize:'12px', cursor:'pointer' }}>
                + 물질 직접 추가
              </button>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px', minWidth:'860px' }}>
                <thead>
                  <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                    <th style={{ padding:'9px 12px', textAlign:'left',   fontWeight:'600', color:'#6b7280', width:'26%' }}>물질명</th>
                    <th style={{ padding:'9px 12px', textAlign:'left',   fontWeight:'600', color:'#6b7280', width:'14%' }}>CAS 번호</th>
                    <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'10%' }}>노출기준(TWA)</th>
                    <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'9%'  }}>측정값</th>
                    <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'7%'  }}>단위</th>
                    <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'9%'  }}>노출비(%)</th>
                    <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'7%'  }}>판정</th>
                    <th style={{ padding:'9px 12px', textAlign:'left',   fontWeight:'600', color:'#6b7280'              }}>비고</th>
                    <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'30px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {resultRows.length === 0
                    ? <tr><td colSpan={9} style={{ padding:'40px', textAlign:'center', color:'#9ca3af', fontSize:'13px' }}>
                        "확정 대상 물질 불러오기" 또는 "물질 직접 추가" 버튼을 사용하세요.
                      </td></tr>
                    : resultRows.map((row, idx) => {
                      const ratio  = parseFloat(row.exposureRatio);
                      const isOver = !isNaN(ratio) && ratio > 100;
                      const pct    = isNaN(ratio) ? 0 : Math.min(ratio, 120);
                      return (
                        <tr key={idx} style={{ borderBottom:'1px solid #f3f4f6', background: isOver ? '#fff5f5' : 'transparent' }}>
                          <td style={{ padding:'7px 10px' }}>
                            <input value={row.name} onChange={e => updateRow(idx,'name',e.target.value)} placeholder="물질명"
                              style={{ width:'100%', padding:'5px 8px', border:'1px solid #e5e7eb', borderRadius:'4px', fontSize:'12px', outline:'none', boxSizing:'border-box' }} />
                          </td>
                          <td style={{ padding:'7px 10px' }}>
                            <input value={row.cas} onChange={e => updateRow(idx,'cas',e.target.value)} placeholder="CAS No."
                              style={{ width:'100%', padding:'5px 7px', border:'1px solid #e5e7eb', borderRadius:'4px', fontSize:'11px', fontFamily:'monospace', outline:'none', boxSizing:'border-box' }} />
                          </td>
                          <td style={{ padding:'7px 10px', textAlign:'center' }}>
                            <input value={row.tlv} onChange={e => updateRow(idx,'tlv',e.target.value)} placeholder="TLV"
                              style={{ width:'72px', padding:'5px 6px', border:'1px solid #e5e7eb', borderRadius:'4px', fontSize:'12px', textAlign:'center', outline:'none' }} />
                          </td>
                          <td style={{ padding:'7px 10px', textAlign:'center' }}>
                            <input value={row.measured} onChange={e => updateRow(idx,'measured',e.target.value)}
                              placeholder="값" type="number" step="any"
                              style={{ width:'80px', padding:'5px 6px', border:`1px solid ${isOver?'#fca5a5':'#e5e7eb'}`, borderRadius:'4px', fontSize:'12px', textAlign:'center', outline:'none', background: isOver?'#fef2f2':'#fff' }} />
                          </td>
                          <td style={{ padding:'7px 10px', textAlign:'center' }}>
                            <select value={row.unit} onChange={e => updateRow(idx,'unit',e.target.value)}
                              style={{ padding:'4px', border:'1px solid #e5e7eb', borderRadius:'4px', fontSize:'11px', outline:'none', background:'#fff' }}>
                              <option>mg/m³</option>
                              <option>ppm</option>
                              <option>f/cc</option>
                              <option>dB(A)</option>
                              <option>개/cc</option>
                            </select>
                          </td>
                          <td style={{ padding:'7px 10px', textAlign:'center' }}>
                            {row.exposureRatio
                              ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' }}>
                                  <div style={{ width:'56px', height:'5px', background:'#f3f4f6', borderRadius:'3px', overflow:'hidden' }}>
                                    <div style={{ width:`${Math.min(pct, 100)}%`, height:'100%', background: isOver?'#ef4444':'#22c55e', borderRadius:'3px', transition:'width 0.3s' }}/>
                                  </div>
                                  <span style={{ fontSize:'11px', fontWeight:'700', color: isOver?'#dc2626':'#16a34a' }}>{row.exposureRatio}%</span>
                                </div>
                              : <span style={{ color:'#d1d5db' }}>-</span>
                            }
                          </td>
                          <td style={{ padding:'7px 10px', textAlign:'center' }}>
                            {row.verdict &&
                              <span style={{ padding:'2px 8px', borderRadius:'4px', fontSize:'11px', fontWeight:'700',
                                background: isOver?'#fef2f2':'#f0fdf4', color: isOver?'#dc2626':'#16a34a' }}>
                                {row.verdict}
                              </span>
                            }
                          </td>
                          <td style={{ padding:'7px 10px' }}>
                            <input value={row.note} onChange={e => updateRow(idx,'note',e.target.value)} placeholder="비고"
                              style={{ width:'100%', padding:'5px 8px', border:'1px solid #e5e7eb', borderRadius:'4px', fontSize:'12px', outline:'none', boxSizing:'border-box' }} />
                          </td>
                          <td style={{ padding:'7px 10px', textAlign:'center' }}>
                            <button onClick={() => removeRow(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:'18px', lineHeight:1, padding:0 }}>×</button>
                          </td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'18px' }}>
            <div style={{ border:'1px solid #e5e7eb', borderRadius:'8px', padding:'16px' }}>
              <div style={{ fontSize:'13px', fontWeight:'700', color:'#111827', marginBottom:'10px' }}>결과보고서 첨부</div>
              <input type="file" id="wem-file" multiple accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.png"
                onChange={e => setAttachNames(prev => [...prev, ...Array.from(e.target.files||[]).map(f => f.name)])}
                style={{ display:'none' }} />
              <label htmlFor="wem-file" style={{ display:'inline-block', padding:'7px 16px', border:'1px dashed #d1d5db', borderRadius:'6px', cursor:'pointer', fontSize:'12px', color:'#6b7280', background:'#f9fafb' }}>
                + 파일 선택 (PDF, Excel, 이미지)
              </label>
              {attachNames.length > 0 && (
                <div style={{ marginTop:'10px', display:'flex', flexDirection:'column', gap:'5px' }}>
                  {attachNames.map((name, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:'12px', color:'#374151', padding:'5px 10px', background:'#f3f4f6', borderRadius:'4px' }}>
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{name}</span>
                      <button onClick={() => setAttachNames(p => p.filter((_,j) => j!==i))} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', flexShrink:0, marginLeft:'6px' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ border:'1px solid #e5e7eb', borderRadius:'8px', padding:'16px' }}>
              <div style={{ fontSize:'13px', fontWeight:'700', color:'#111827', marginBottom:'10px' }}>
                법적 의무 체크리스트
                <span style={{ fontSize:'11px', color:'#9ca3af', fontWeight:'400', marginLeft:'6px' }}>저장 전 이행 여부 확인</span>
              </div>
              {[
                '측정 결과를 근로자에게 게시 또는 통보함 (법 §125⑥)',
                '산업안전보건위원회 또는 근로자대표에 결과 설명',
                '노출기준 초과 시 시설·설비 개선 또는 건강진단 조치',
                '결과 보고서 보존 (일반 5년 / 특별관리물질 30년)',
              ].map((item, i) => (
                <label key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'12px', color: checklist[i]?'#16a34a':'#374151', marginBottom:'8px', cursor:'pointer', lineHeight:1.5 }}>
                  <input type="checkbox" checked={checklist[i]} style={{ marginTop:'2px', flexShrink:0, accentColor:'#0284c7' }}
                    onChange={() => setChecklist(p => p.map((v,j) => j===i ? !v : v))} />
                  <span style={{ textDecoration: checklist[i]?'line-through':'none', color: checklist[i]?'#9ca3af':'inherit' }}>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px' }}>
            <button onClick={() => { setResultRows([]); setAttachNames([]); setChecklist([false,false,false,false]); }}
              style={{ padding:'9px 18px', border:'1px solid #e5e7eb', borderRadius:'6px', background:'#fff', color:'#6b7280', fontSize:'13px', cursor:'pointer' }}>
              초기화
            </button>
            <button onClick={submitRecord} disabled={resultRows.filter(r=>r.name).length===0}
              style={{
                padding:'9px 24px', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'600',
                background: resultRows.filter(r=>r.name).length>0 ? '#0284c7' : '#e5e7eb',
                color:      resultRows.filter(r=>r.name).length>0 ? '#fff'    : '#9ca3af',
                cursor:     resultRows.filter(r=>r.name).length>0 ? 'pointer' : 'default',
              }}>
              측정 결과 저장
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3 — 측정 현황
      ══════════════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div>
          {nextSchedule.length > 0 && (
            <div style={{ marginBottom:'20px' }}>
              <div style={{ fontSize:'13px', fontWeight:'700', color:'#374151', marginBottom:'10px' }}>다음 측정 예정일</div>
              <div style={{ display:'flex', gap:'10px', overflowX:'auto', paddingBottom:'4px' }}>
                {nextSchedule.slice(0, 5).map(item => {
                  const urgent = item.d <= 45;
                  const soon   = item.d <= 90;
                  const over   = item.d <= 0;
                  const s      = SUBSTANCE_DB.find(x => x.id === item.substanceId);
                  const catBdg = s ? CAT_BADGE[s.cat] : { bg:'#f3f4f6', color:'#374151' };
                  const cycBdg = CYCLE_BADGE[item.cycle];
                  return (
                    <div key={item.substanceId} style={{
                      minWidth:'190px', padding:'14px 16px', borderRadius:'8px', flexShrink:0,
                      border: `1px solid ${over?'#fca5a5':urgent?'#fde68a':'#e5e7eb'}`,
                      background: over?'#fef2f2':urgent?'#fffbeb':'#fff',
                    }}>
                      <div style={{ fontSize:'18px', fontWeight:'800', color: over?'#dc2626':urgent?'#d97706':soon?'#0284c7':'#374151', marginBottom:'4px' }}>
                        {over ? '기한초과' : `D-${item.d}`}
                      </div>
                      <div style={{ fontSize:'12px', fontWeight:'600', color:'#111827', lineHeight:1.4, marginBottom:'6px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={item.name}>
                        {item.name}
                      </div>
                      <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                        <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'3px', background:catBdg.bg, color:catBdg.color, fontWeight:'700' }}>{s?.cat}</span>
                        <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'3px', background:cycBdg.bg, color:cycBdg.color, fontWeight:'600' }}>{item.cycle}</span>
                      </div>
                      <div style={{ fontSize:'11px', color:'#9ca3af', marginTop:'5px' }}>{item.nextDate}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {records.length === 0
            ? <div style={{ padding:'56px', textAlign:'center', border:'1px solid #e5e7eb', borderRadius:'8px' }}>
                <div style={{ fontSize:'13px', color:'#9ca3af', marginBottom:'12px' }}>아직 등록된 측정 결과가 없습니다.</div>
                <button onClick={() => setTab('register')} style={{ padding:'8px 20px', border:'none', borderRadius:'6px', background:'#0284c7', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
                  결과 등록하러 가기 →
                </button>
              </div>
            : <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {[...records].reverse().map(rec => {
                  const overItems = rec.items.filter(i => i.verdict === '초과');
                  const isExp     = expandedId === rec.id;
                  return (
                    <div key={rec.id} style={{ border:`1px solid ${overItems.length>0?'#fca5a5':'#e5e7eb'}`, borderRadius:'8px', overflow:'hidden' }}>
                      <div onClick={() => setExpandedId(isExp ? null : rec.id)} style={{
                        padding:'14px 18px', display:'flex', alignItems:'center', gap:'12px',
                        cursor:'pointer', background: overItems.length>0 ? '#fff5f5' : '#fff',
                      }}>
                        <span style={{ fontSize:'11px', fontWeight:'700', padding:'2px 8px', borderRadius:'4px', background:'#f3f4f6', color:'#374151', flexShrink:0 }}>
                          제{rec.seq}회
                        </span>
                        <span style={{ fontSize:'12px', padding:'2px 8px', borderRadius:'4px', background:'#eff6ff', color:'#1e40af', fontWeight:'600', flexShrink:0 }}>
                          {rec.half}
                        </span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <span style={{ fontSize:'13px', fontWeight:'600', color:'#111827' }}>
                            {rec.dept}{rec.process ? ` · ${rec.process}` : ''}
                          </span>
                          <span style={{ fontSize:'12px', color:'#6b7280', marginLeft:'10px' }}>
                            {rec.agency} · {rec.samplingDate}
                          </span>
                        </div>
                        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexShrink:0 }}>
                          {overItems.length > 0 &&
                            <span style={{ fontSize:'11px', fontWeight:'700', padding:'2px 8px', borderRadius:'4px', background:'#fef2f2', color:'#dc2626' }}>
                              초과 {overItems.length}건
                            </span>
                          }
                          <span style={{ fontSize:'12px', color:'#9ca3af' }}>{rec.items.length}종 측정</span>
                          <span style={{ fontSize:'11px', color:'#9ca3af' }}>{isExp ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {isExp && (
                        <div style={{ borderTop:'1px solid #e5e7eb' }}>
                          <div style={{ overflowX:'auto' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px', minWidth:'640px' }}>
                              <thead>
                                <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                                  <th style={{ padding:'8px 12px', textAlign:'left',   fontWeight:'600', color:'#6b7280' }}>물질명</th>
                                  <th style={{ padding:'8px 12px', textAlign:'left',   fontWeight:'600', color:'#6b7280' }}>CAS 번호</th>
                                  <th style={{ padding:'8px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280' }}>노출기준</th>
                                  <th style={{ padding:'8px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280' }}>측정값</th>
                                  <th style={{ padding:'8px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'160px' }}>노출비</th>
                                  <th style={{ padding:'8px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280' }}>판정</th>
                                  <th style={{ padding:'8px 12px', textAlign:'left',   fontWeight:'600', color:'#6b7280' }}>비고</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rec.items.map((item, i) => {
                                  const ratio  = parseFloat(item.exposureRatio);
                                  const isOver = item.verdict === '초과';
                                  const pct    = isNaN(ratio) ? 0 : Math.min(ratio, 120);
                                  return (
                                    <tr key={i} style={{ borderBottom:'1px solid #f3f4f6', background: isOver?'#fff5f5':'transparent' }}>
                                      <td style={{ padding:'8px 12px', color:'#111827', fontWeight: isOver?600:400 }}>{item.name}</td>
                                      <td style={{ padding:'8px 12px', color:'#6b7280', fontFamily:'monospace', fontSize:'11px' }}>{item.cas}</td>
                                      <td style={{ padding:'8px 12px', textAlign:'center', color:'#6b7280' }}>{item.tlv} {item.unit}</td>
                                      <td style={{ padding:'8px 12px', textAlign:'center', fontWeight:'600', color: isOver?'#dc2626':'#111827' }}>
                                        {item.measured ? `${item.measured} ${item.unit}` : '-'}
                                      </td>
                                      <td style={{ padding:'8px 12px', textAlign:'center' }}>
                                        {item.exposureRatio
                                          ? <div style={{ display:'flex', alignItems:'center', gap:'8px', justifyContent:'center' }}>
                                              <div style={{ width:'72px', height:'6px', background:'#f3f4f6', borderRadius:'3px', overflow:'hidden', flexShrink:0 }}>
                                                <div style={{ width:`${pct/1.2}%`, height:'100%', background: isOver?'#ef4444':'#22c55e', borderRadius:'3px' }}/>
                                              </div>
                                              <span style={{ fontSize:'12px', fontWeight:'700', color: isOver?'#dc2626':'#16a34a', minWidth:'42px', textAlign:'left' }}>
                                                {item.exposureRatio}%
                                              </span>
                                            </div>
                                          : <span style={{ color:'#d1d5db' }}>-</span>
                                        }
                                      </td>
                                      <td style={{ padding:'8px 12px', textAlign:'center' }}>
                                        {item.verdict &&
                                          <span style={{ padding:'2px 8px', borderRadius:'4px', fontSize:'11px', fontWeight:'700',
                                            background: isOver?'#fef2f2':'#f0fdf4', color: isOver?'#dc2626':'#16a34a' }}>
                                            {item.verdict}
                                          </span>
                                        }
                                      </td>
                                      <td style={{ padding:'8px 12px', color:'#6b7280' }}>{item.note || '-'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div style={{ padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid #f3f4f6', background:'#fafafa' }}>
                            <span style={{ fontSize:'11px', color:'#9ca3af' }}>등록: {new Date(rec.createdAt).toLocaleString('ko-KR')}</span>
                            {/* ✅ deleteRecord 연결 */}
                            <button onClick={() => deleteRecord(rec.id, rec.seq)}
                              style={{ padding:'5px 12px', border:'1px solid #fca5a5', borderRadius:'5px', background:'#fff', color:'#dc2626', fontSize:'12px', cursor:'pointer' }}>
                              삭제
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

    </div>
  );
}
