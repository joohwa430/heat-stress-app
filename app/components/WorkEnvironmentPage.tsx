'use client';
import * as XLSX from 'xlsx';
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf'; 
import html2canvas from 'html2canvas'; 

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
  dept: string; 
  usageAmount?: string;
  usageUnit?: string; 
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
/* 원료 리스트 업로드 분석용 */
interface AnalysisRow {
  rowIdx: number;
  uploadName: string;
  uploadCas: string;
  matched: Substance | null;
  include: boolean;
  usageAmount: string;  
  usageUnit: string;     
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
const SPECIAL_HEALTH_EXAM: Record<string, { cycle: string; note: string }> = {
  // ZA — 분진류
  'ZA001': { cycle: '12개월', note: '분진에 의한 폐 기능 영향 확인' },
  'ZA002': { cycle: '12개월', note: '분진에 의한 폐 기능 영향 확인' },
  'ZA003': { cycle: '12개월', note: '산화철 분진 폐 기능 영향 확인' },
  'ZA004': { cycle: '12개월', note: '산화철 분진 폐 기능 영향 확인' },
  'ZA005': { cycle: '12개월', note: '산화철 분진 폐 기능 영향 확인' },
  'ZA006': { cycle: '12개월', note: '탤크 분진 폐 기능·흉부 X선 확인' },
  'ZA014': { cycle: '12개월', note: '산화아연 분진 금속열 여부 확인' },
  // Z3 — 특별관리물질 (발암물질 6개월)
  'Z3009': { cycle: '6개월',  note: '발암물질·혈액독성·조혈기계 이상 확인' },
  'Z3010': { cycle: '6개월',  note: '발암물질·점막자극·신경독성 확인' },
  'Z3011': { cycle: '12개월', note: '간·신장 기능 이상 확인' },
  'Z3012': { cycle: '6개월',  note: '혈중납농도·신경독성·조혈기계 확인' },
  'Z3013': { cycle: '12개월', note: '발암물질·호흡기·피부 감작 확인' },
  'Z3014': { cycle: '6개월',  note: '신장·신경계 독성 확인' },
  'Z3015': { cycle: '6개월',  note: '발암물질·신장·뼈 독성 확인' },
  'Z3016': { cycle: '6개월',  note: '심장·폐·시력 이상 확인' },
  'Z3017': { cycle: '6개월',  note: '발암물질·피부궤양·호흡기 확인' },
  // Z4 — 금속류
  'Z4002': { cycle: '12개월', note: '알루미늄 분진 폐 기능 확인' },
  'Z4004': { cycle: '12개월', note: '산화아연 흄·금속열 확인' },
  'Z4005': { cycle: '12개월', note: '안티몬 독성·심장·폐 기능 확인' },
  'Z4006': { cycle: '12개월', note: '크롬 화합물 호흡기·피부 확인' },
  // Z6 — 용제·산류
  'Z6003': { cycle: '12개월', note: '시신경·간·신장 독성 확인' },
  'Z6004': { cycle: '12개월', note: '간·신장·흉부 이상 확인' },
  'Z6005': { cycle: '12개월', note: '신경계·눈·코·목 자극 확인' },
  'Z6006': { cycle: '12개월', note: '눈·코·목 자극·신경계 확인' },
  'Z6007': { cycle: '12개월', note: '신경독성·조혈기계·간독성 확인' },
  'Z6008': { cycle: '12개월', note: '신경독성·조혈기계·간독성 확인' },
  'Z6009': { cycle: '12개월', note: '말초신경병증·신경독성 확인' },
  'Z6010': { cycle: '12개월', note: '신경계·눈·코 자극 확인' },
  'Z6011': { cycle: '12개월', note: '눈·코·목·피부 자극 확인' },
  'Z6012': { cycle: '12개월', note: '호흡기·치아 부식 확인' },
  'Z6013': { cycle: '12개월', note: '호흡기·피부·점막 부식 확인' },
  'Z6014': { cycle: '12개월', note: '호흡기·치아·폐 부식 확인' },
  'Z6015': { cycle: '12개월', note: '호흡기·뼈·불소증 확인' },
  'Z6016': { cycle: '12개월', note: '간·신장·신경계 독성 확인' },
  'Z6017': { cycle: '12개월', note: '호흡기·눈·피부 자극 확인' },
  'Z6018': { cycle: '12개월', note: '호흡기·눈·피부 자극 확인' },
};

const CYCLE_BADGE: Record<Cycle, { bg: string; color: string }> = {
  '3개월':  { bg: '#fef2f2', color: '#dc2626' },
  '6개월':  { bg: '#fffbeb', color: '#d97706' },
  '12개월': { bg: '#f0fdf4', color: '#16a34a' },
};

const DEPTS = [
  '화성1공장', '화성2공장', '화성2공장 실험실', '화성3공장',
  '평택1공장', '평택2공장', '케이에스팩(도급)', '비티아이(도급)',
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

/* ─── CSV 파싱 유틸 ─────────────────────────────────────────────────────────── */


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
  const [analysisDept, setAnalysisDept] = useState<string>(DEPTS[0]); 
  const [csvHeaders,       setCsvHeaders]       = useState<string[]>([]);
const [rawCsvCache,      setRawCsvCache]      = useState<{text:string; name:string} | null>(null);
const [overrideUsageIdx, setOverrideUsageIdx] = useState<number>(-99); // -99 = 자동

const [historyDeptFilter,  setHistoryDeptFilter]  = useState<string>('ALL');
const [historyYearFilter,  setHistoryYearFilter]  = useState<string>('');
const [historyMonthFilter, setHistoryMonthFilter] = useState<string>('');
const [measDeptFilter, setMeasDeptFilter] = useState<string>('ALL');
const downloadUploadTemplate = () => {
  const headers = ['품목명(물질명)', 'CAS NO', '사용량', '단위(kg/L/mL)', '비고'];
  const examples = [
    ['벤젠', '71-43-2', '500', 'kg', '예시'],
    ['아세톤', '67-64-1', '50', 'L', '예시'],
    ['티타늄디옥사이드 (CI 77891)', '13463-67-7', '200', 'kg', '예시'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  ws['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '원료리스트');
  XLSX.writeFile(wb, `원료리스트_업로드양식_${todayStr()}.xlsx`);
};

  /* 원료 리스트 분석 상태 */
  const [analysisRows,    setAnalysisRows]    = useState<AnalysisRow[]>([]);
  const [analysisFileName,setAnalysisFileName] = useState('');
  const [showAnalysis,    setShowAnalysis]    = useState(false);
  const [analysisFilter,  setAnalysisFilter]  = useState<'all' | 'matched' | 'unmatched'>('all');

  /* 결과 등록 폼 */
  const [form, setForm] = useState({
    agency: '', dept: DEPTS[0], process: '', samplingDate: todayStr(), reportDate: '',
  });
  const [resultRows,  setResultRows]  = useState<ResultRow[]>([]);
  const [attachNames, setAttachNames] = useState<string[]>([]);
  const [checklist,   setChecklist]   = useState<boolean[]>([false, false, false, false]);

  /* ── localStorage 초기화 */
  useEffect(() => {
    setMounted(true);
    try {
      const t = localStorage.getItem('wem_targets');
      const r = localStorage.getItem('wem_records');
      if (t) setTargets(JSON.parse(t));
      if (r) setRecords(JSON.parse(r));
    } catch { /* ignore */ }
  }, []);
useEffect(() => {
  if (tab === 'register' && targets.length > 0) {
    const firstDept = DEPTS.find(d => targets.some(t => t.dept === d));
    if (firstDept) {
      setForm(p => ({ ...p, dept: firstDept }));
      setMeasDeptFilter(firstDept);
    }
  }
}, [tab, targets]);
  const saveTargets = (data: TargetItem[]) => {
    setTargets(data);
    try { localStorage.setItem('wem_targets', JSON.stringify(data)); } catch { /* ignore */ }
  };
  const saveRecords = (data: MeasRecord[]) => {
    setRecords(data);
    try { localStorage.setItem('wem_records', JSON.stringify(data)); } catch { /* ignore */ }
  };
const exportTargetsToExcel = (data: TargetItem[]) => {
  const rows = data.map(t => ({
    사업장: t.dept, 물질명: t.name, 'CAS 번호': t.cas,
    '노출기준(TWA)': `${t.tlv}`, 단위: t.unit, 측정주기: t.cycle,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch:14 }, { wch:32 }, { wch:16 }, { wch:14 }, { wch:8 }, { wch:10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '측정대상');
  XLSX.writeFile(wb, `측정대상물질_${todayStr()}.xlsx`);
};
const exportTargetsToPdf = async (data: TargetItem[]) => {
  const div = document.createElement('div');
  div.style.cssText = [
    'position:fixed', 'left:-9999px', 'top:0',
    'width:794px', 'padding:32px',
    'background:#fff', 'color:#111',
    'font-family:Malgun Gothic,Apple SD Gothic Neo,sans-serif',
    'font-size:12px',
  ].join(';');

  const deptGroups = DEPTS.filter(d => data.some(t => t.dept === d));

  div.innerHTML = `
    <h2 style="font-size:16px;text-align:center;margin-bottom:20px;font-weight:700;">
      작업환경측정 대상 물질 목록
    </h2>
    <p style="text-align:right;font-size:11px;color:#9ca3af;margin-bottom:16px;">
      출력일: ${todayStr()} · 총 ${data.length}종
    </p>
    ${deptGroups.map(dept => `
      <div style="margin-bottom:20px;">
        <div style="background:#e0f2fe;color:#0369a1;font-weight:700;font-size:12px;
          padding:5px 10px;border-radius:4px;margin-bottom:8px;display:inline-block;">
          ${dept} (${data.filter(t => t.dept === dept).length}종)
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="border:1px solid #ccc;padding:6px 8px;text-align:left;">물질명</th>
              <th style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:130px;">CAS 번호</th>
              <th style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:110px;">노출기준(TWA)</th>
              <th style="border:1px solid #ccc;padding:6px 8px;text-align:center;width:80px;">측정주기</th>
            </tr>
          </thead>
          <tbody>
            ${data.filter(t => t.dept === dept).map(t => `
              <tr>
                <td style="border:1px solid #ccc;padding:6px 8px;">${t.name}</td>
                <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;font-size:10px;">${t.cas}</td>
                <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;">${t.tlv} ${t.unit}</td>
                <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;">${t.cycle}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  `;

  document.body.appendChild(div);
  try {
    const canvas = await html2canvas(div, { scale: 2, useCORS: true, backgroundColor: '#fff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW   = pdf.internal.pageSize.getWidth();
    const pageH   = pdf.internal.pageSize.getHeight();
    const margin  = 10;
    const imgW    = pageW - margin * 2;
    const imgH    = (canvas.height * imgW) / canvas.width;

    pdf.addImage(imgData, 'PNG', margin, margin, imgW, imgH);
    let remaining = imgH - (pageH - margin * 2);
    while (remaining > 0) {
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, -(imgH - remaining) - margin, imgW, imgH);
      remaining -= (pageH - margin * 2);
    }
    pdf.save(`측정대상물질_${todayStr()}.pdf`);
  } finally {
    document.body.removeChild(div);
  }
};

const exportRecordToExcel = (rec: MeasRecord) => {
  const info = [
    ['사업장', rec.dept],
    ['결과보고일', rec.reportDate, '반기', rec.half],
    [],
    ['물질명', 'CAS 번호', '노출기준(TWA)', '측정값', '단위', '노출비(%)', '판정', '비고'],
    ...rec.items.map(i => [
      i.name, i.cas, `${i.tlv} ${i.unit}`,
      i.measured, i.unit,
      i.exposureRatio ? `${i.exposureRatio}%` : '',
      i.verdict, i.note,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(info);
  ws['!cols'] = [{ wch:28 }, { wch:14 }, { wch:14 }, { wch:10 }, { wch:8 }, { wch:10 }, { wch:8 }, { wch:20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '측정결과');
  XLSX.writeFile(wb, `작업환경측정_${rec.dept}_${rec.samplingDate}.xlsx`);
};

// ✨ PDF 저장
const exportRecordToPdf = async (rec: MeasRecord) => {
  const div = document.createElement('div');
  div.style.cssText = [
    'position:fixed', 'left:-9999px', 'top:0',
    'width:794px', 'padding:32px',
    'background:#fff', 'color:#111',
    'font-family:Malgun Gothic,Apple SD Gothic Neo,sans-serif',
    'font-size:12px',
  ].join(';');

  div.innerHTML = `
    <h2 style="font-size:16px;text-align:center;margin-bottom:20px;font-weight:700;">
      작업환경측정 결과보고서
    </h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="border:1px solid #ccc;padding:7px 10px;background:#f5f5f5;font-weight:700;width:110px;">측정기관</td>
        <td style="border:1px solid #ccc;padding:7px 10px;">${rec.agency}</td>
        <td style="border:1px solid #ccc;padding:7px 10px;background:#f5f5f5;font-weight:700;width:110px;">사업장</td>
        <td style="border:1px solid #ccc;padding:7px 10px;">${rec.dept}</td>
      </tr>
      <tr>
        <td style="border:1px solid #ccc;padding:7px 10px;">${rec.process || '-'}</td>
        <td style="border:1px solid #ccc;padding:7px 10px;background:#f5f5f5;font-weight:700;">반기</td>
        <td style="border:1px solid #ccc;padding:7px 10px;">${rec.half}</td>
      </tr>
      <tr>
        <td style="border:1px solid #ccc;padding:7px 10px;">${rec.samplingDate}</td>
        <td style="border:1px solid #ccc;padding:7px 10px;background:#f5f5f5;font-weight:700;">결과보고일</td>
        <td style="border:1px solid #ccc;padding:7px 10px;">${rec.reportDate || '-'}</td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="border:1px solid #ccc;padding:7px 8px;text-align:left;">물질명</th>
          <th style="border:1px solid #ccc;padding:7px 8px;text-align:center;">CAS 번호</th>
          <th style="border:1px solid #ccc;padding:7px 8px;text-align:center;">노출기준</th>
          <th style="border:1px solid #ccc;padding:7px 8px;text-align:center;">측정값</th>
          <th style="border:1px solid #ccc;padding:7px 8px;text-align:center;">노출비</th>
          <th style="border:1px solid #ccc;padding:7px 8px;text-align:center;">판정</th>
          <th style="border:1px solid #ccc;padding:7px 8px;text-align:left;">비고</th>
        </tr>
      </thead>
      <tbody>
        ${rec.items.map(i => `
          <tr>
            <td style="border:1px solid #ccc;padding:6px 8px;">${i.name}</td>
            <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;font-size:10px;">${i.cas}</td>
            <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;">${i.tlv} ${i.unit}</td>
            <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;font-weight:700;color:${i.verdict === '초과' ? '#dc2626' : '#111'};">
              ${i.measured ? `${i.measured} ${i.unit}` : '-'}
            </td>
            <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;font-weight:700;color:${i.verdict === '초과' ? '#dc2626' : '#16a34a'};">
              ${i.exposureRatio ? `${i.exposureRatio}%` : '-'}
            </td>
            <td style="border:1px solid #ccc;padding:6px 8px;text-align:center;font-weight:700;color:${i.verdict === '초과' ? '#dc2626' : '#16a34a'};">
              ${i.verdict || '-'}
            </td>
            <td style="border:1px solid #ccc;padding:6px 8px;">${i.note || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="margin-top:16px;font-size:11px;color:#9ca3af;text-align:right;">
      제${rec.seq}회 · 등록일: ${new Date(rec.createdAt).toLocaleDateString('ko-KR')}
    </div>
  `;

  document.body.appendChild(div);

  try {
    const canvas = await html2canvas(div, { scale: 2, useCORS: true, backgroundColor: '#fff' });
    const imgData  = canvas.toDataURL('image/png');
    const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW    = pdf.internal.pageSize.getWidth();
    const pageH    = pdf.internal.pageSize.getHeight();
    const margin   = 10;
    const imgW     = pageW - margin * 2;
    const imgH     = (canvas.height * imgW) / canvas.width;

    let y = margin;
    let remaining = imgH;

    pdf.addImage(imgData, 'PNG', margin, y, imgW, imgH);
    remaining -= (pageH - margin * 2);

    while (remaining > 0) {
      pdf.addPage();
      y = -(imgH - remaining) - margin;
      pdf.addImage(imgData, 'PNG', margin, y, imgW, imgH);
      remaining -= (pageH - margin * 2);
    }

    pdf.save(`작업환경측정_${rec.dept}_${rec.samplingDate}.pdf`);
  } finally {
    document.body.removeChild(div);
  }
};

// ✨ Excel → 측정 현황 불러오기
const importMeasRecordFromExcel = (file: File) => {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb   = XLSX.read(data, { type:'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' }) as string[][];

      // 기본 정보 파싱 (행 0~2: agency, dept, process, samplingDate, reportDate, half)
      const agency       = String(rows[0]?.[1] ?? '');
      const dept         = String(rows[0]?.[3] ?? DEPTS[0]);
      const process      = String(rows[1]?.[1] ?? '');
      const half         = String(rows[1]?.[3] ?? '');
      const samplingDate = String(rows[2]?.[1] ?? todayStr());
      const reportDate   = String(rows[2]?.[3] ?? '');

      // 데이터 행 파싱 (행 4부터: 물질명, CAS, 노출기준, 측정값, 단위, 노출비, 판정, 비고)
      const items: ResultRow[] = rows.slice(4).filter(r => r[0]).map(r => ({
        substanceId: '',
        name:         String(r[0] ?? ''),
        cas:          String(r[1] ?? ''),
        tlv:          String(r[2] ?? '').split(' ')[0],
        unit:         String(r[4] ?? 'mg/m³'),
        measured:     String(r[3] ?? ''),
        exposureRatio: String(r[5] ?? '').replace('%', ''),
        verdict:      (String(r[6] ?? '') as Verdict),
        note:         String(r[7] ?? ''),
      }));

      if (items.length === 0) { alert('측정 항목이 없습니다.'); return; }

      const newRecord: MeasRecord = {
        id: Date.now().toString(),
        seq: records.length + 1,
        half: half || getHalf(samplingDate),
        agency, dept, process, samplingDate, reportDate,
        items,
        createdAt: new Date().toISOString(),
      };
      saveRecords([...records, newRecord]);
      alert(`${items.length}종 측정 결과가 등록되었습니다.`);
    } catch (err) {
      console.error(err);
      alert('파일 파싱 오류: exportRecordToExcel로 저장한 파일을 업로드해주세요.');
    }
  };
  reader.readAsArrayBuffer(file);
};

const normStr = (s: string): string =>
  s.toLowerCase().replace(/[\s·,\-\/\.$$$$]/g, '');

const normCAS = (s: string): string =>
  s.replace(/[\s\-]/g, '');


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
// 노출기준(TWA) 파싱 → mg/m³ 숫자 추출
const parseTlv = (tlv: string): number => {
  const m = tlv.replace(/,/g,'').match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
};

// 사용량 판정: 사용량(kg) / 노출기준(mg/m³) 비율로 위험도 산출
const getUsageVerdict = (usageKg: number, tlv: string): {
  label: string; color: string; bg: string; guide: string;
} => {
  const tlvVal = parseTlv(tlv);
  if (!tlvVal || !usageKg) return {
    label: '확인 필요',
    color: '#92400e',
    bg: '#fef3c7',
    guide: '사용량 또는 노출기준 정보를 확인해주세요.',
  };

  const ratio = (usageKg * 1000) / tlvVal;

  if (ratio >= 100000) return {
    label: '측정 필수',
    color: '#991b1b',
    bg: '#fee2e2',
    guide: [
      '즉시 작업환경측정 실시',
      '국소배기장치 등 공학적 제어 즉각 검토',
      '작업자 특수건강진단 실시',
      '고농도 노출 시 작업 중지 및 개선 후 재개',
    ].join('\n'),
  };

  if (ratio >= 10000) return {
    label: '측정 권고',
    color: '#c2410c',
    bg: '#ffedd5',
    guide: [
      '정기 측정 주기보다 조기 측정 권고',
      '국소배기·전체환기 장치 점검 및 성능 확인',
      '취급량 저감 또는 밀폐 공정 전환 검토',
      '방진·방독 마스크 등 보호구 착용 철저 관리',
      '작업자 MSDS 교육 강화',
    ].join('\n'),
  };

  if (ratio >= 1000) return {
    label: '주의',
    color: '#92400e',
    bg: '#fef3c7',
    guide: [
      '환기 설비(국소배기·전체환기) 정상 작동 여부 점검',
      '개인보호구(방진마스크 등) 착용 지도 강화',
      '취급 시간·빈도 최소화 방안 검토',
      '대체 물질 사용 가능 여부 검토',
      'MSDS 교육 연 1회 이상 실시',
      '취급량 변동 시 즉시 재평가',
    ].join('\n'),
  };

  return {
    label: '양호',
    color: '#166534',
    bg: '#dcfce7',
    guide: [
      '정기 측정 주기 유지',
      '환기 설비 일상 점검 지속',
      '취급량 급격히 증가 시 재평가 필요',
    ].join('\n'),
  };
};


  /* ── 원료 리스트 분석 로직 ─────────────────────────────────────────────────── */
  const parseAndAnalyze = (csvText: string, fileName: string, forceUsageIdx?: number) => {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) { alert('데이터가 없습니다.'); return; }

  const headers = parseCSVLine(lines[0]);
  setCsvHeaders(headers);
  setRawCsvCache({ text: csvText, name: fileName });

  const casIdx      = headers.findIndex(h => h.toUpperCase().replace(/[\s\.]/g,'').includes('CAS'));
  const hazardIdx   = headers.findIndex(h => ['유해물질','hazard'].some(k => h.includes(k)));
  const nameIdx     = headers.findIndex(h =>
    ['품목명','물질명','성분명','원료명','화학물질명','원료','성분'].some(k => h.includes(k))
  );
  const unitIdx     = headers.findIndex(h => ['단위','unit'].some(k => h.toLowerCase().includes(k)));
  const matchNameIdx = hazardIdx >= 0 ? hazardIdx : nameIdx;

  if (casIdx === -1 && matchNameIdx === -1) {
    alert('CAS NO 또는 유해물질(품목명) 컬럼을 찾을 수 없습니다.\n감지된 헤더: ' + headers.slice(0,10).join(', '));
    return;
  }

  const normH = (s: string) => s.replace(/\s/g,'').toLowerCase();

  let usageIdx = -1;

  if (forceUsageIdx !== undefined && forceUsageIdx >= 0) {
    usageIdx = forceUsageIdx;
  } else {
    // 1순위: 월 평균 사용량
    usageIdx = headers.findIndex(h => normH(h).includes('월평균사용량'));
    // 2순위: 함량 포함 사용량
    if (usageIdx === -1)
      usageIdx = headers.findIndex(h => normH(h).includes('함량포함사용량'));
    // 3순위: 사용량(단위)
    if (usageIdx === -1)
      usageIdx = headers.findIndex(h => /사용량[($]?[kKgGlL]/.test(normH(h)));
    // 4순위: ~사용량 으로 끝나는 것 (마지막 등장 우선)
    if (usageIdx === -1)
      usageIdx = headers.reduce((found, h, i) =>
        normH(h) === '사용량' || normH(h).endsWith('사용량') ? i : found, -1);
    // 5순위: 수량/투입량
    if (usageIdx === -1)
      usageIdx = headers.findIndex(h =>
        ['수량','투입량','qty','quantity'].some(k => normH(h).includes(k))
      );
    // 6순위: 숫자 많은 컬럼 자동 감지
    if (usageIdx === -1) {
      const sampleRows = lines.slice(1, 10).map(l => parseCSVLine(l));
      const candidate = headers
        .map((_, ci) => {
          const vals = sampleRows
            .map(r => parseFloat((r[ci] ?? '').replace(/,/g,'')))
            .filter(v => !isNaN(v) && v > 0);
          const avg = vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : 0;
          const isCodeCol = avg > 100000 && vals.every(v => Number.isInteger(v));
          return { i: ci, cnt: vals.length, isCodeCol };
        })
        .filter(x => x.i !== casIdx && x.i !== matchNameIdx && x.cnt >= 2 && !x.isCodeCol)
        .sort((a,b) => b.cnt - a.cnt)[0];
      if (candidate) usageIdx = candidate.i;
    }
  }

  interface RawRow { uploadName:string; uploadCas:string; usageAmount:number; usageUnit:string; rowIdx:number; }
  const rawRows: RawRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.every(c => !c)) continue;
    const uploadCas  = (casIdx       >= 0 ? cols[casIdx]       ?? '' : '').trim();
    const uploadName = (matchNameIdx >= 0 ? cols[matchNameIdx] ?? '' : '').trim();
    const usageRaw   = (usageIdx     >= 0 ? cols[usageIdx]     ?? '' : '').trim();
    const usageUnit  = (unitIdx      >= 0 ? cols[unitIdx]      ?? 'KG' : 'KG').trim();
    if (!uploadCas && !uploadName) continue;
    rawRows.push({ uploadName, uploadCas, usageAmount: parseFloat(usageRaw.replace(/,/g,'')) || 0, usageUnit, rowIdx: i });
  }

  const mergeMap = new Map<string, RawRow & { totalUsage:number }>();
  for (const r of rawRows) {
    const key = r.uploadCas || r.uploadName;
    if (mergeMap.has(key)) {
      mergeMap.get(key)!.totalUsage += r.usageAmount;
    } else {
      mergeMap.set(key, { ...r, totalUsage: r.usageAmount });
    }
  }

  const rows: AnalysisRow[] = [];
  for (const [, r] of mergeMap) {
    let matched: Substance | null = null;
    if (r.uploadCas) {
      matched = SUBSTANCE_DB.find(s => normCAS(s.cas) === normCAS(r.uploadCas)) ?? null;
    }
    if (!matched && r.uploadName) {
      const q = normStr(r.uploadName);
      matched = SUBSTANCE_DB.find(s => {
        const d = normStr(s.name);
        return d === q || d.includes(q) || q.includes(d);
      }) ?? null;
    }
    rows.push({
      rowIdx:      r.rowIdx,
      uploadName:  r.uploadName,
      uploadCas:   r.uploadCas,
      matched,
      include:     !!matched,
      usageAmount: usageIdx >= 0 ? r.totalUsage.toFixed(3) : '',
      usageUnit:   r.usageUnit || 'KG',
    });
  }

  if (rows.length === 0) { alert('파싱된 행이 없습니다.'); return; }
  setAnalysisRows(rows);
  setAnalysisFileName(fileName);
  setShowAnalysis(true);
  setAnalysisFilter('all');
};
const handleAnalysisFile = (file: File) => {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // raw:true → 숫자를 JS number 타입으로 직접 읽어 서식 왜곡 방지
      const jsonRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(
        worksheet, { header: 1, raw: true, defval: '' }
      ) as (string | number | null)[][];

      const csvLines = jsonRows.map(row =>
        row.map(cell => {
          if (cell === null || cell === '') return '';
          if (typeof cell === 'number') return String(cell);
          const s = String(cell);
          return s.includes(',') ? `"${s}"` : s;
        }).join(',')
      );

      parseAndAnalyze(csvLines.join('\n'), file.name);
    } catch (err) {
      console.error(err);
      alert('파일 파싱 오류: Excel(.xlsx/.xls) 형식인지 확인해주세요.');
    }
  };
  reader.readAsArrayBuffer(file);
};


  const toggleAnalysisInclude = (idx: number) =>
    setAnalysisRows(prev => prev.map((r, i) => i === idx ? { ...r, include: !r.include } : r));

  const toggleAllInclude = (val: boolean) =>
    setAnalysisRows(prev => prev.map(r => r.matched ? { ...r, include: val } : r));

  // ✅ 최종 완성본
const addAnalyzedTargets = () => {
  const toAdd = analysisRows
    .filter(r => r.include && r.matched)
    .filter(r => !targets.find(t => t.substanceId === r.matched!.id && t.dept === analysisDept));

  if (toAdd.length === 0) {
    alert('추가할 새 물질이 없습니다.\n(이미 해당 사업장의 측정 대상에 모두 포함되어 있습니다.)');
    return;
  }

  const newTargets: TargetItem[] = toAdd.map(r => ({
    substanceId: r.matched!.id,
    name:        r.matched!.name,
    cas:         r.matched!.cas,
    cycle:       r.matched!.defaultCycle,
    tlv:         r.matched!.tlv,
    unit:        r.matched!.unit,
    dept:        analysisDept,
    usageAmount: r.usageAmount,      // ✨ row → r
    usageUnit:   r.usageUnit || 'KG',
  }));

  saveTargets([...targets, ...newTargets]);
  alert(`${toAdd.length}종이 [${analysisDept}] 측정 대상에 추가되었습니다.`);
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

  const confirmTargets = () => {
    const newTargets: TargetItem[] = [...selected].map(id => {
      const s = SUBSTANCE_DB.find(x => x.id === id)!;
      const existing = targets.find(t => t.substanceId === id);
      return existing ?? { substanceId: id, name: s.name, cas: s.cas, cycle: s.defaultCycle, tlv: s.tlv, unit: s.unit };
    });
    saveTargets(newTargets);
    setTab('register');
  };

  const updateTargetCycle = (substanceId: string, cycle: Cycle) => {
    saveTargets(targets.map(t => t.substanceId === substanceId ? { ...t, cycle } : t));
  };

  const removeTarget = (substanceId: string, dept: string) => {
  saveTargets(targets.filter(t => !(t.substanceId === substanceId && t.dept === dept)));
  setSelected(prev => { const n = new Set(prev); n.delete(substanceId); return n; });
};

  /* ── 결과 등록 로직 */
  const loadTargetsToForm = () => {
  const dept = measDeptFilter !== 'ALL' ? measDeptFilter : form.dept;
  const deptRows = targets.filter(t => t.dept === dept);
  if (deptRows.length === 0) {
    alert(`[${dept}]에 등록된 측정 대상 물질이 없습니다.\n측정 대상 물질 선정 탭에서 먼저 추가해주세요.`);
    return;
  }
  setForm(p => ({ ...p, dept }));
  setResultRows(
    deptRows.map(t => ({
      substanceId:   t.substanceId,
      name:          t.name,
      cas:           t.cas,
      tlv:           t.tlv,
      unit:          t.usageUnit ?? t.unit,
      measured:      t.usageAmount ?? '',
      exposureRatio: '',
      verdict:       '' as Verdict,
      note:          '',
    }))
  );
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

  const submitRecord = () => {
    if (resultRows.filter(r => r.name).length === 0) { alert('측정 결과를 1개 이상 입력해주세요.'); return; }
    const record: MeasRecord = {
      id: Date.now().toString(),
      seq: records.length + 1,
      half: getHalf(form.samplingDate),
      agency: form.agency,
      dept: form.dept,
      process: form.process,
      samplingDate: form.samplingDate,
      reportDate: form.reportDate,
      items: resultRows.filter(r => r.name),
      createdAt: new Date().toISOString(),
    };
    saveRecords([...records, record]);
    setResultRows([]);
    setAttachNames([]);
    setChecklist([false, false, false, false]);
    setForm({ agency: '', dept: DEPTS[0], process: '', samplingDate: todayStr(), reportDate: '' });
    setTab('history');
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
  const matchedCount   = analysisRows.filter(r => r.matched).length;
  const includeCount   = analysisRows.filter(r => r.include && r.matched).length;
  const displayedRows  = analysisRows.filter(r =>
    analysisFilter === 'all'       ? true :
    analysisFilter === 'matched'   ? !!r.matched :
    !r.matched
  );

  /* ─── 렌더 ─────────────────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '28px 32px' }}>

      {/* 페이지 헤더 */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
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
  유해물질 사용량 조사
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
                  사업장 원료 리스트 excel를 업로드하면 각 원료의 <strong>측정 대상 여부를 자동으로 판별</strong>합니다.<br />
                  <span style={{ color:'#6366f1' }}>필수 컬럼: <strong>품목명</strong>(물질명·원료명 등) 또는 <strong>CAS NO</strong> 중 하나 이상 포함</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'10px' }}>
                <span style={{ fontSize:'12px', color:'#3730a3', fontWeight:'600', flexShrink:0 }}>사업장 선택</span>
                <select
                  value={analysisDept}
                  onChange={e => setAnalysisDept(e.target.value)}
                  style={{ padding:'5px 10px', border:'1px solid #a5b4fc', borderRadius:'6px', fontSize:'12px', color:'#3730a3', background:'#fff', outline:'none', cursor:'pointer' }}
                >
                  {DEPTS.map(d => <option key={d}>{d}</option>)}
                </select>
                {analysisFileName && (
                  <span style={{ fontSize:'11px', color:'#6366f1', fontWeight:'600' }}>
                    현재: {analysisFileName} ({analysisDept})
                  </span>
                )}
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
                <input type="file" id="analysis-csv" accept=".xlsx,.xls" style={{ display:'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAnalysisFile(f); e.target.value = ''; }} />
                <label htmlFor="analysis-csv" style={{
                  display:'inline-block', padding:'8px 18px',
                  border:'none', borderRadius:'6px',
                  background:'#4338ca', color:'#fff',
                  fontSize:'13px', fontWeight:'600', cursor:'pointer',
                }}>
                  Excel 업로드
                </label>
              </div>
            </div>

            {/* 분석 결과 */}
            {showAnalysis && analysisRows.length > 0 && (
              <div style={{ marginTop:'16px' }}>
                {/* 사용량 컬럼 수동 선택 */}
{csvHeaders.length > 0 && (
  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px',
    padding:'8px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'6px' }}>
    <span style={{ fontSize:'12px', color:'#92400e', fontWeight:'600', flexShrink:0 }}>
      사용량 컬럼 선택
    </span>
    <select
      value={overrideUsageIdx}
      onChange={e => {
        const idx = parseInt(e.target.value);
        setOverrideUsageIdx(idx);
        if (rawCsvCache) parseAndAnalyze(rawCsvCache.text, rawCsvCache.name, idx >= 0 ? idx : undefined);
      }}
      style={{ padding:'4px 10px', border:'1px solid #fde68a', borderRadius:'4px',
        fontSize:'12px', background:'#fff', outline:'none', cursor:'pointer' }}
    >
      <option value={-99}>자동 감지</option>
      {csvHeaders.map((h, i) => (
        <option key={i} value={i}>{`열 ${i+1}${h ? ` — ${h}` : ''}`}</option>
      ))}
    </select>
    <span style={{ fontSize:'11px', color:'#b45309' }}>
      사용량이 잘못 표시되면 직접 선택해주세요
    </span>
  </div>
)}

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

                {/* 결과 테이블 */}
                <div style={{ border:'1px solid #e5e7eb', borderRadius:'6px', overflow:'hidden', maxHeight:'360px', overflowY:'auto', background:'#fff' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                    <thead>
                      <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                        <th style={{ padding:'9px 12px', textAlign:'center', width:'44px', fontWeight:'600', color:'#6b7280' }}>
                          <input type="checkbox"
                            checked={matchedCount > 0 && analysisRows.filter(r => r.matched).every(r => r.include)}
                            onChange={e => toggleAllInclude(e.target.checked)}
                          />
                        </th>
                        <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'90px' }}>사용량</th>
                        <th style={{ padding:'9px 12px', textAlign:'left', fontWeight:'600', color:'#6b7280' }}>원료명 (업로드)</th>
                        <th style={{ padding:'9px 12px', textAlign:'left', fontWeight:'600', color:'#6b7280', width:'130px' }}>CAS 번호</th>
                        <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'90px' }}>측정 대상</th>
                        <th style={{ padding:'9px 12px', textAlign:'left', fontWeight:'600', color:'#6b7280' }}>매칭 물질명 (DB)</th>
                        <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'68px' }}>분류</th>
                        <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'90px' }}>노출기준</th>
                        <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'78px' }}>측정 주기</th>
                        <th style={{ padding:'8px 12px', textAlign:'left', fontSize:'12px',
  color:'#6b7280', fontWeight:'600', borderBottom:'1px solid #e5e7eb' }}>
  판정
</th>
<th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'100px' }}>
  특수건강진단
</th>
                      </tr>

                    </thead>
                    <tbody>
  {displayedRows.length === 0
  ? <tr><td colSpan={11} style={{ padding:'28px', textAlign:'center', color:'#9ca3af' }}>표시할 항목이 없습니다.</td></tr>
    : displayedRows.map((row, idx) => {
        const isMatched = !!row.matched;
        const badge  = row.matched ? CAT_BADGE[row.matched.cat] : null;
        const cycBdg = row.matched ? CYCLE_BADGE[row.matched.defaultCycle] : null;
        return (
          <tr key={idx} style={{ borderBottom:'1px solid #f3f4f6', background: isMatched ? '#f0fdf4' : 'transparent' }}>
            {/* 체크박스 */}
            <td style={{ padding:'7px 12px', textAlign:'center' }}>
              {isMatched && (
                <input type="checkbox" checked={row.include}
                  onChange={() => toggleAnalysisInclude(analysisRows.indexOf(row))} />
              )}
            </td>
            {/* 사용량 */}
            <td style={{ padding:'7px 12px', textAlign:'center', color:'#374151', fontSize:'12px' }}>
              {row.usageAmount
                ? <span style={{ fontWeight:'600' }}>{row.usageAmount} <span style={{ fontSize:'10px', color:'#9ca3af' }}>{row.usageUnit}</span></span>
                : <span style={{ color:'#d1d5db' }}>미입력</span>
              }
            </td>
            {/* 원료명 */}
            <td style={{ padding:'7px 12px', color:'#111827', fontWeight: isMatched ? 600 : 400 }}>
              {row.uploadName || '-'}
            </td>
            {/* CAS */}
            <td style={{ padding:'7px 12px', color:'#6b7280', fontFamily:'monospace', fontSize:'11px' }}>
              {row.uploadCas || '-'}
            </td>
            {/* 측정대상 */}
            <td style={{ padding:'7px 12px', textAlign:'center' }}>
              {isMatched
                ? <span style={{ padding:'2px 8px', borderRadius:'4px', fontSize:'11px', fontWeight:'700', background:'#dcfce7', color:'#16a34a' }}>대상</span>
                : <span style={{ padding:'2px 8px', borderRadius:'4px', fontSize:'11px', color:'#9ca3af', background:'#f3f4f6' }}>해당없음</span>
              }
            </td>
            {/* 매칭 물질명 */}
            <td style={{ padding:'7px 12px', color:'#374151', fontSize:'12px' }}>
              {row.matched?.name ?? '-'}
            </td>
            {/* 분류 */}
            <td style={{ padding:'7px 12px', textAlign:'center' }}>
              {badge && (
                <span style={{ padding:'2px 6px', borderRadius:'3px', fontSize:'10px', fontWeight:'700', background:badge.bg, color:badge.color }}>
                  {row.matched?.cat}
                </span>
              )}
            </td>
            {/* 노출기준 */}
            <td style={{ padding:'7px 12px', textAlign:'center', color:'#374151', fontSize:'11px' }}>
              {row.matched ? `${row.matched.tlv} ${row.matched.unit}` : '-'}
            </td>
            {/* 측정 주기 */}
            <td style={{ padding:'7px 12px', textAlign:'center' }}>
              {cycBdg && (
                <span style={{ padding:'2px 6px', borderRadius:'3px', fontSize:'10px', fontWeight:'600', background:cycBdg.bg, color:cycBdg.color }}>
                  {row.matched?.defaultCycle}
                </span>
              )}
            </td>
            {/* 판정 td */}
{row.matched ? (() => {
  const usage = parseFloat(row.usageAmount ?? '0') || 0;
  const v = getUsageVerdict(usage, row.matched.tlv);
  return (
    <td style={{ padding:'7px 12px' }}>
      <span title={v.guide} style={{
        display:'inline-block', padding:'2px 8px', borderRadius:'4px',
        fontSize:'11px', fontWeight:'700', cursor:'help',
        color: v.color, background: v.bg,
        border: `1px solid ${v.color}33`,
      }}>
        {v.label}
      </span>
      <div style={{ fontSize:'10px', color:'#9ca3af', marginTop:'3px', lineHeight:1.5 }}>
        {v.guide.split('\n').map((line, i) => (
          <div key={i}>· {line}</div>
        ))}
      </div>
    </td>
  );
})() : <td />}

{/* ✨ 특수건강진단 td */}
{row.matched ? (() => {
  const exam = SPECIAL_HEALTH_EXAM[row.matched.id];
  return exam ? (
    <td style={{ padding:'7px 12px', textAlign:'center' }}>
      <span style={{
        display:'inline-block', padding:'2px 7px', borderRadius:'4px',
        fontSize:'11px', fontWeight:'700',
        background:'#ede9fe', color:'#5b21b6',
        border:'1px solid #c4b5fd',
      }}>
        대상
      </span>
      <div style={{ fontSize:'10px', color:'#7c3aed', marginTop:'3px', fontWeight:'600' }}>
        {exam.cycle}마다
      </div>
      <div style={{ fontSize:'10px', color:'#9ca3af', marginTop:'2px', lineHeight:1.4 }}>
        {exam.note}
      </div>
    </td>
  ) : (
    <td style={{ padding:'7px 12px', textAlign:'center' }}>
      <span style={{
        padding:'2px 7px', borderRadius:'4px', fontSize:'11px',
        background:'#f3f4f6', color:'#9ca3af',
      }}>
        해당없음
      </span>
    </td>
  );
})() : <td />}


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

          {/* 물질 테이블 */}
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
                 

                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={6} style={{ padding:'32px', textAlign:'center', color:'#9ca3af', fontSize:'13px' }}>검색 결과가 없습니다.</td></tr>
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
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>

          {/* 확정된 측정 대상 목록 */}
         {targets.length > 0 && (
  <div style={{ border:'1px solid #e5e7eb', borderRadius:'8px', padding:'16px', marginBottom:'16px', background:'#fafafa' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
      <div style={{ fontSize:'14px', fontWeight:'700', color:'#111827' }}>
        현재 확정된 측정 대상 ({targets.length}종)
        <span style={{ fontSize:'11px', color:'#9ca3af', fontWeight:'400', marginLeft:'8px' }}>공장별로 구분됩니다.</span>
      </div>
      <div style={{ display:'flex', gap:'8px' }}>
        <button onClick={() => exportTargetsToExcel(targets)} style={{
          padding:'6px 14px', border:'1px solid #16a34a', borderRadius:'6px',
          background:'#f0fdf4', color:'#16a34a', fontSize:'12px', fontWeight:'600', cursor:'pointer',
        }}>
          Excel 내보내기
        </button>
        <button onClick={async () => {
          const btn = document.activeElement as HTMLButtonElement;
          if (btn) btn.disabled = true;
          try { await exportTargetsToPdf(targets); }
          finally { if (btn) btn.disabled = false; }
        }} style={{
          padding:'6px 14px', border:'1px solid #0284c7', borderRadius:'6px',
          background:'#f0f9ff', color:'#0284c7', fontSize:'12px', fontWeight:'600', cursor:'pointer',
        }}>
          PDF 내보내기
        </button>
      </div>
    </div>

    {DEPTS.filter(d => targets.some(t => t.dept === d)).map(dept => (
      <div key={dept} style={{ marginBottom:'14px' }}>
        <div style={{ fontSize:'12px', fontWeight:'700', color:'#0369a1', marginBottom:'6px', padding:'4px 10px', background:'#e0f2fe', borderRadius:'4px', display:'inline-block' }}>
          {dept} ({targets.filter(t => t.dept === dept).length}종)
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'8px' }}>
          {targets.filter(t => t.dept === dept).map(t => {
            const s = SUBSTANCE_DB.find(x => x.id === t.substanceId);
            const badge  = s ? CAT_BADGE[s.cat] : { bg:'#f3f4f6', color:'#374151' };
            const cycBdg = CYCLE_BADGE[t.cycle];
            return (
              <div key={t.substanceId + dept} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:'6px', fontSize:'12px' }}>
                <span style={{ padding:'1px 6px', borderRadius:'3px', fontSize:'10px', fontWeight:'700', background:badge.bg, color:badge.color, flexShrink:0 }}>
                  {s?.cat ?? ''}
                </span>
                <span style={{ flex:1, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={t.name}>
                  {t.name}
                </span>
                <select
                  value={t.cycle}
                  onChange={e => updateTargetCycle(t.substanceId, e.target.value as Cycle)}
                  style={{ padding:'2px 6px', border:`1px solid ${cycBdg.color}40`, borderRadius:'4px', fontSize:'11px', color:cycBdg.color, background:cycBdg.bg, outline:'none', cursor:'pointer' }}
                >
                  <option>3개월</option>
                  <option>6개월</option>
                  <option>12개월</option>
                </select>
                <button onClick={() => removeTarget(t.substanceId)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:'16px', lineHeight:1, padding:0 }}>×</button>
              </div>
            );
          })}
        </div>
      </div>
    ))}
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
                <label style={{ fontSize:'12px', color:'#6b7280', display:'block', marginBottom:'5px' }}>사업장</label>
                <select value={form.dept} onChange={e => {
  setForm(p => ({...p, dept: e.target.value}));
  setMeasDeptFilter(e.target.value);  
}} style={inputStyle}>
                  {DEPTS.map(d => <option key={d}>{d}</option>)}
                </select>
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
  유해물질 사용량 조사
  {resultRows.length > 0 && <span style={{ fontSize:'12px', color:'#6b7280', fontWeight:'400', marginLeft:'8px' }}>{resultRows.length}종</span>}
</span>
              <button onClick={addManualRow} style={{ padding:'5px 12px', border:'1px solid #e5e7eb', borderRadius:'5px', background:'#fff', color:'#374151', fontSize:'12px', cursor:'pointer' }}>
                + 물질 직접 추가
              </button>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', margin:'12px 0' }}>
  {['ALL', ...DEPTS].map(d => (
  <button
    key={d}
    onClick={() => {
      setMeasDeptFilter(d);
      if (d !== 'ALL') setForm(p => ({ ...p, dept: d }));
    }}
    style={{
      padding:'5px 14px',
      borderRadius:'6px',
      border:`1px solid ${measDeptFilter === d ? '#2563eb' : '#e5e7eb'}`,
      background: measDeptFilter === d ? '#2563eb' : '#fff',
      color: measDeptFilter === d ? '#fff' : '#374151',
      fontSize:'12px',
      fontWeight: measDeptFilter === d ? '700' : '400',
      cursor:'pointer',
    }}
  >
    {d === 'ALL' ? '전체' : d}
    {d !== 'ALL' && ` (${targets.filter(t => t.dept === d).length})`}
  </button>
))}

</div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px', minWidth:'860px' }}>
                <thead>
  <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
    <th style={{ padding:'9px 12px', textAlign:'left',   fontWeight:'600', color:'#6b7280', width:'28%' }}>물질명</th>
    <th style={{ padding:'9px 12px', textAlign:'left',   fontWeight:'600', color:'#6b7280', width:'14%' }}>CAS 번호</th>
    <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'14%' }}>노출기준(TWA)</th>
    <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'12%' }}>월 평균 사용량</th>
    <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'10%' }}>단위</th>
    <th style={{ padding:'9px 12px', textAlign:'left',   fontWeight:'600', color:'#6b7280'              }}>비고</th>
    <th style={{ padding:'9px 12px', textAlign:'center', fontWeight:'600', color:'#6b7280', width:'30px'}}></th>
  </tr>
</thead>
                <tbody>
                  {resultRows.length === 0
                    ? <tr><td colSpan={9} style={{ padding:'40px', textAlign:'center', color:'#9ca3af', fontSize:'13px' }}>
                        "확정 대상 물질 불러오기" 또는 "물질 직접 추가" 버튼을 사용하세요.
                      </td></tr>
                    : resultRows.map((row, idx) => (
  <tr key={idx} style={{ borderBottom:'1px solid #f3f4f6' }}>
    <td style={{ padding:'7px 10px' }}>
      <input value={row.name} onChange={e => updateRow(idx,'name',e.target.value)} placeholder="물질명"
        style={{ width:'100%', padding:'5px 8px', border:'1px solid #e5e7eb', borderRadius:'4px', fontSize:'12px', outline:'none', boxSizing:'border-box' }} />
    </td>
    <td style={{ padding:'7px 10px' }}>
      <input value={row.cas} onChange={e => updateRow(idx,'cas',e.target.value)} placeholder="CAS No."
        style={{ width:'100%', padding:'5px 7px', border:'1px solid #e5e7eb', borderRadius:'4px', fontSize:'11px', fontFamily:'monospace', outline:'none', boxSizing:'border-box' }} />
    </td>
    <td style={{ padding:'7px 10px', textAlign:'center', color:'#374151', fontSize:'12px' }}>
      {row.tlv} {row.unit}
    </td>
    <td style={{ padding:'7px 10px', textAlign:'center' }}>
      <input value={row.measured} onChange={e => updateRow(idx,'measured',e.target.value)}
        placeholder="사용량" type="number" step="any"
        style={{ width:'90px', padding:'5px 6px', border:'1px solid #e5e7eb', borderRadius:'4px', fontSize:'12px', textAlign:'center', outline:'none' }} />
    </td>
    <td style={{ padding:'7px 10px', textAlign:'center' }}>
      <select value={row.unit} onChange={e => updateRow(idx,'unit',e.target.value)}
  style={{ padding:'4px', border:'1px solid #e5e7eb', borderRadius:'4px', fontSize:'11px', outline:'none', background:'#fff' }}>
  <option>KG</option>
  <option>L</option>
  <option>mL</option>
  <option>g</option>
  <option>mg/m³</option>
  <option>ppm</option>
</select>
    </td>
    <td style={{ padding:'7px 10px' }}>
      <input value={row.note} onChange={e => updateRow(idx,'note',e.target.value)} placeholder="비고"
        style={{ width:'100%', padding:'5px 8px', border:'1px solid #e5e7eb', borderRadius:'4px', fontSize:'12px', outline:'none', boxSizing:'border-box' }} />
    </td>
    <td style={{ padding:'7px 10px', textAlign:'center' }}>
  <div style={{ display:'flex', gap:'4px', justifyContent:'center' }}>
    <button
      onClick={() => removeRow(idx)}
      title="목록에서 제거"
      style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:'18px', lineHeight:1, padding:0 }}
    >×</button>
    <button
      onClick={() => {
        if (!confirm(`[${row.name}]을 측정 대상에서 영구 삭제하시겠습니까?`)) return;
        removeTarget(row.substanceId, form.dept);
        removeRow(idx);
      }}
      title="측정 대상에서 영구 삭제"
      style={{ background:'none', border:'1px solid #fca5a5', borderRadius:'3px', cursor:'pointer', color:'#dc2626', fontSize:'10px', lineHeight:1, padding:'2px 4px' }}
    >삭제</button>
  </div>
</td>
  </tr>
))
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
            <button onClick={() => {
  setResultRows([]);
  setAttachNames([]);
  setChecklist([false, false, false, false]);
  setForm({ agency: '', dept: DEPTS[0], process: '', samplingDate: todayStr(), reportDate: '' });
  setMeasDeptFilter('ALL');  // ✨ 필터도 초기화
}}
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
              사용량 조사 저장
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3 — 측정 현황
      ══════════════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div>
          {/* ✨ 전체 내보내기 버튼 추가 */}
    <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginBottom:'12px' }}>
  {/* ✨ Excel 업로드 */}
  <input type="file" id="history-upload" accept=".xlsx,.xls" style={{ display:'none' }}
    onChange={e => { const f = e.target.files?.[0]; if (f) importMeasRecordFromExcel(f); e.target.value = ''; }} />
  <label htmlFor="history-upload" style={{
    padding:'7px 16px', border:'1px solid #0284c7', borderRadius:'6px',
    background:'#f0f9ff', color:'#0284c7', fontSize:'13px', fontWeight:'600', cursor:'pointer',
  }}>
    Excel로 결과 등록
  </label>
  <button
  onClick={() => {
    if (records.length === 0) { alert('저장된 측정 결과가 없습니다.'); return; }
    const allRows = records.flatMap(rec =>
      rec.items.map(i => ({
        반기: rec.half,
        사업장: rec.dept,
        공정: rec.process,
        물질명: i.name,
        'CAS 번호': i.cas,
        '노출기준(TWA)': `${i.tlv} ${i.unit}`,
        측정값: i.measured,
        '노출비(%)': i.exposureRatio,
        판정: i.verdict,
        비고: i.note,
      }))
    );
    const ws = XLSX.utils.json_to_sheet(allRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '측정현황');
    XLSX.writeFile(wb, `작업환경측정_전체현황_${todayStr()}.xlsx`);
  }}
  style={{
    padding: '7px 16px',
    border: '1px solid #16a34a',
    borderRadius: '6px',
    background: '#f0fdf4',
    color: '#16a34a',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  }}
>
  전체 Excel 내보내기 ({records.length}건)
</button>
</div>
          <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
      <select
        value={historyDeptFilter}
        onChange={e => setHistoryDeptFilter(e.target.value)}
        style={{ padding:'7px 12px', border:'1px solid #e5e7eb', borderRadius:'6px', fontSize:'13px', outline:'none', background:'#fff' }}
      >
        <option value="ALL">전체 사업장</option>
        {DEPTS.map(d => <option key={d}>{d}</option>)}
      </select>
      <input
        type="number" placeholder="년도 (예: 2024)"
        value={historyYearFilter}
        onChange={e => setHistoryYearFilter(e.target.value)}
        style={{ width:'140px', padding:'7px 12px', border:'1px solid #e5e7eb', borderRadius:'6px', fontSize:'13px', outline:'none' }}
      />
      <select
        value={historyMonthFilter}
        onChange={e => setHistoryMonthFilter(e.target.value)}
        style={{ padding:'7px 12px', border:'1px solid #e5e7eb', borderRadius:'6px', fontSize:'13px', outline:'none', background:'#fff' }}
      >
        <option value="">전체 월</option>
        {Array.from({length:12}, (_,i) => (
          <option key={i+1} value={String(i+1).padStart(2,'0')}>{i+1}월</option>
        ))}
      </select>
      {(historyDeptFilter !== 'ALL' || historyYearFilter || historyMonthFilter) && (
        <button
          onClick={() => { setHistoryDeptFilter('ALL'); setHistoryYearFilter(''); setHistoryMonthFilter(''); }}
          style={{ padding:'7px 12px', border:'1px solid #e5e7eb', borderRadius:'6px', background:'#fff', color:'#6b7280', fontSize:'13px', cursor:'pointer' }}
        >
          필터 초기화
        </button>
      )}
      <span style={{ fontSize:'12px', color:'#9ca3af' }}>
        {records.filter(r =>
          (historyDeptFilter === 'ALL' || r.dept === historyDeptFilter) &&
          (!historyYearFilter || r.samplingDate.startsWith(historyYearFilter)) &&
          (!historyMonthFilter || r.samplingDate.slice(5,7) === historyMonthFilter)
        ).length}건
      </span>
    </div>
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
                <div style={{ fontSize:'13px', color:'#9ca3af', marginBottom:'16px' }}>아직 등록된 측정 결과가 없습니다.</div>
                <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
                  <input type="file" id="history-upload-empty" accept=".xlsx,.xls" style={{ display:'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) importMeasRecordFromExcel(f); e.target.value = ''; }} />
                  <label htmlFor="history-upload-empty" style={{
                    padding:'8px 20px', border:'1px solid #0284c7', borderRadius:'6px',
                    background:'#f0f9ff', color:'#0284c7', fontSize:'13px', fontWeight:'600', cursor:'pointer',
                  }}>
                    Excel로 결과 등록
                  </label>
                </div>
              </div>
            : <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {[...records].filter(r =>
                  (historyDeptFilter === 'ALL' || r.dept === historyDeptFilter) &&
                  (!historyYearFilter || r.samplingDate.startsWith(historyYearFilter)) &&
                  (!historyMonthFilter || r.samplingDate.slice(5,7) === historyMonthFilter)
                ).reverse().map(rec => {
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
  <div style={{ display:'flex', gap:'8px' }}>
  <button
    onClick={() => exportRecordToExcel(rec)}
    style={{ padding:'5px 12px', border:'1px solid #16a34a', borderRadius:'5px', background:'#f0fdf4', color:'#16a34a', fontSize:'12px', cursor:'pointer', fontWeight:'600' }}
  >
    Excel 저장
  </button>
  {/* ✨ PDF 버튼 추가 */}
  <button
    onClick={() => exportRecordToPdf(rec)}
    style={{ padding:'5px 12px', border:'1px solid #0284c7', borderRadius:'5px', background:'#f0f9ff', color:'#0284c7', fontSize:'12px', cursor:'pointer', fontWeight:'600' }}
  >
    PDF 저장
  </button>
  <button onClick={() => {
    if (!confirm(`제${rec.seq}회 측정 결과를 삭제하시겠습니까?`)) return;
    saveRecords(records.filter(r => r.id !== rec.id));
    setExpandedId(null);
  }} style={{ padding:'5px 12px', border:'1px solid #fca5a5', borderRadius:'5px', background:'#fff', color:'#dc2626', fontSize:'12px', cursor:'pointer' }}>
    삭제
  </button>
</div>
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
