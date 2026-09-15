'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

type BodyPart = '목' | '어깨' | '팔/팔꿈치' | '손목/손' | '허리' | '무릎' | '발/발목';
type WorkType = '사무직' | '조립/생산' | '운반/물류' | '청소/시설' | '건설/현장' | '기타';
type RiskFactor = '반복 동작' | '무거운 하중' | '불편한 자세' | '장시간 고정 자세' | '진동 공구 사용' | '휴식 부족';
type PainFrequency = '없음' | '가끔 불편' | '주 1~2회 통증' | '거의 매일 통증' | '작업 수행 어려움';
type SymptomDuration = '1주 미만' | '1주 이상' | '1개월 이상' | '3개월 이상';
type RecoveryLevel = '충분히 회복됨' | '다음날 약간 남음' | '다음날에도 뚜렷함' | '계속 지속됨';
type PainIntensity = '약함' | '보통' | '강함';
type NeckPosture = '중립' | '약간 숙임/젖힘' | '많이 숙임/회전/비틀림';
type TrunkPosture = '중립' | '약간 굴곡' | '깊은 굴곡 또는 비틀림' | '깊은 굴곡 + 비틀림';
type LegPosture = '안정' | '체중 편중/무릎 굴곡/쪼그림' | '불안정/한발 지지/깊은 쪼그림';
type LoadLevel = '거의 없음' | '약간 있음' | '중량물 반복 취급' | '큰 하중';
type RepetitionLevel = '낮음' | '보통' | '높음';
type ShoulderPosture = '중립' | '약간 들림' | '어깨 높이 이상' | '장시간 들고 있음';
type ArmPosture = '편안한 범위' | '다소 불편' | '극단 자세';
type WristPosture = '중립' | '약간 꺾임' | '꺾임 큼/비틀림';
type NeckPostureRula = '중립' | '전방 굴곡' | '심한 굴곡/회전';
type UpperLimbUse = '없음' | '중간' | '큼';

type AiAnalysisResult = {
  postureSummary: string;
  burdenParts: BodyPart[];
  riskFactors: string[];
  recommendations: string[];
};

interface MskRecord {
  id: number;
  사번: string;
  성명: string;
  소속: string;
  공정명: string;
  검사일: string;
  작업내용: string;
  위험도: string;
  검사자: string;
  선택부위: BodyPart[];
  체크리스트점수: number;
  REBA점수: number;
  RULA점수: number;
  종합점수: number;
  위험도요약: string;
  평가근거: string[];
  권장조치: string[];
  관리팁: string[];
  사진?: string;  //
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

/* -- 보고서 Blob URL (세션 유지) -- */
/* ── IndexedDB 유틸 (파일 저장용) ── */
const IDB_NAME  = 'hc_msk_db';
const IDB_STORE = 'report_files';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
async function idbSave(id: string, base64: string) {
  const db = await openIDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(base64, id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}
async function idbGet(id: string): Promise<string | undefined> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
async function idbDelete(id: string) {
  const db = await openIDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

function base64ToBlobUrl(base64: string): string {
  const [header, data] = base64.split(',');
  const mime  = header.match(/:(.*?);/)?.[1] ?? 'application/pdf';
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}


interface MskReport {
  id: string;
  fileName: string;
  uploadedAt: string;
  size: number;
  note: string;
  site: string;
  year: string;
}
interface MskSurveyData {
  id: string;
  fileName: string;
  year: string;
  site: string;
  uploadedAt: string;
  total: { 정상: number; 관리대상자: number; 통증호소자: number; 합계: number };
  byDept:    Array<{ label: string; 정상: number; 관리대상자: number; 통증호소자: number; 합계: number }>;
  byAge:     Array<{ label: string; 정상: number; 관리대상자: number; 통증호소자: number; 합계: number }>;
  byGender:  Array<{ label: string; 정상: number; 관리대상자: number; 통증호소자: number; 합계: number }>;
  byBurden:  Array<{ label: string; 정상: number; 관리대상자: number; 통증호소자: number; 합계: number }>;
  byWorkYrs: Array<{ label: string; 정상: number; 관리대상자: number; 통증호소자: number; 합계: number }>;
}

function parseMskExcel(buf: ArrayBuffer): Pick<MskSurveyData, 'total'|'byDept'|'byAge'|'byGender'|'byBurden'|'byWorkYrs'> | null {
  try {
    const wb   = XLSX.read(buf, { type: 'array' });
    const name = wb.SheetNames.find(n => n.includes('전체결과'));
    if (!name) return null;
    const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null });

    // 섹션 위치
    const sec: Record<string, number> = {};
    rows.forEach((row, i) => {
      const v = String(row[1] ?? '');
      if (v.includes('[부서별 신체부위 평가 분석]'))         sec.dept    = i;
      if (v.includes('[연령 별 신체부위 평가 분석]'))         sec.age     = i;
      if (v.includes('[성별 별 신체부위 평가 분석]'))         sec.gender  = i;
      if (v.includes('[근무년수 별 신체부위 평가 분석]'))      sec.workYrs = i;
      if (v.includes('[육체적 부담정도 별 신체부위 평가 분석]')) sec.burden  = i;
    });

    // 부서별 (col: 1=부서명, 2=정상, 3=관리, 4=호소, 5=합계)
    const byDept: MskSurveyData['byDept'] = [];
    let total = { 정상: 0, 관리대상자: 0, 통증호소자: 0, 합계: 0 };
    if (sec.dept !== undefined) {
      const end = sec.age ?? rows.length;
      for (let i = sec.dept + 2; i < end; i++) {
        const r = rows[i];
        const label = String(r[1] ?? '').trim();
        if (!label || label === '부서명') continue;
        if (label.replace(/\s/g, '').includes('합계')) {
          total = { 정상: Number(r[2])||0, 관리대상자: Number(r[3])||0, 통증호소자: Number(r[4])||0, 합계: Number(r[5])||0 };
          continue;
        }
        const 합계 = Number(r[5]) || 0;
        if (합계 <= 0) continue;
        byDept.push({ label, 정상: Number(r[2])||0, 관리대상자: Number(r[3])||0, 통증호소자: Number(r[4])||0, 합계 });
      }
    }

    // 공통 파서 (col: 1=label, 3=정상, 4=관리, 5=호소)
    const parseSection = (startSec: number | undefined, endSec: number | undefined, skipLabel: string): MskSurveyData['byAge'] => {
      const result: MskSurveyData['byAge'] = [];
      if (startSec === undefined) return result;
      const end = endSec ?? startSec + 15;
      for (let i = startSec + 2; i < end; i++) {
        const r = rows[i];
        const label = String(r[1] ?? '').trim();
        if (!label || label === skipLabel || label.replace(/\s/g, '').includes('합계')) continue;
        const 정상 = Number(r[3])||0, 관리 = Number(r[4])||0, 호소 = Number(r[5])||0;
        if (정상 + 관리 + 호소 === 0) continue;
        result.push({ label, 정상, 관리대상자: 관리, 통증호소자: 호소, 합계: 정상 + 관리 + 호소 });
      }
      return result;
    };

    const byAge     = parseSection(sec.age,     sec.gender,  '연령');
    const byGender  = parseSection(sec.gender,  sec.workYrs, '성별');
    const byWorkYrs = parseSection(sec.workYrs, sec.burden,  '근무년수');
    const byBurden  = parseSection(sec.burden,  undefined,   '육체적 부담정도');

    if (total.합계 === 0)
      total = byDept.reduce((a, d) => ({ 정상: a.정상+d.정상, 관리대상자: a.관리대상자+d.관리대상자, 통증호소자: a.통증호소자+d.통증호소자, 합계: a.합계+d.합계 }), { 정상:0, 관리대상자:0, 통증호소자:0, 합계:0 });

    return { total, byDept, byAge, byGender, byBurden, byWorkYrs };
  } catch { return null; }
}
function BarRow({ label, 정상, 관리대상자, 통증호소자, 합계, maxVal, labelWidth = 90 }: {
  label: string; 정상: number; 관리대상자: number; 통증호소자: number; 합계: number; maxVal: number; labelWidth?: number;
}) {
  const pct = (v: number) => maxVal > 0 ? `${v / maxVal * 100}%` : '0%';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'5px' }}>
      <div style={{ width:labelWidth, fontSize:'11px', color:'#374151', textAlign:'right', flexShrink:0, lineHeight:1.3 }}>{label}</div>
      <div style={{ flex:1, display:'flex', height:'16px', borderRadius:'3px', overflow:'hidden', background:'#f3f4f6' }}>
        <div style={{ width:pct(정상),        background:'#16a34a' }} />
        <div style={{ width:pct(관리대상자),   background:'#f59e0b' }} />
        <div style={{ width:pct(통증호소자),   background:'#dc2626' }} />
      </div>
      <div style={{ width:'38px', fontSize:'11px', color:'#9ca3af', textAlign:'right', flexShrink:0 }}>{합계}명</div>
    </div>
  );
}

const bodyParts: BodyPart[] = ['목','어깨','팔/팔꿈치','손목/손','허리','무릎','발/발목'];
const workTypes: WorkType[] = ['사무직','조립/생산','운반/물류','청소/시설','건설/현장','기타'];
const riskFactors: RiskFactor[] = ['반복 동작','무거운 하중','불편한 자세','장시간 고정 자세','진동 공구 사용','휴식 부족'];
const painFrequencyOptions: PainFrequency[] = ['없음','가끔 불편','주 1~2회 통증','거의 매일 통증','작업 수행 어려움'];
const symptomDurationOptions: SymptomDuration[] = ['1주 미만','1주 이상','1개월 이상','3개월 이상'];
const recoveryOptions: RecoveryLevel[] = ['충분히 회복됨','다음날 약간 남음','다음날에도 뚜렷함','계속 지속됨'];
const painIntensityOptions: PainIntensity[] = ['약함','보통','강함'];
const neckPostureOptions: NeckPosture[] = ['중립','약간 숙임/젖힘','많이 숙임/회전/비틀림'];
const trunkPostureOptions: TrunkPosture[] = ['중립','약간 굴곡','깊은 굴곡 또는 비틀림','깊은 굴곡 + 비틀림'];
const legPostureOptions: LegPosture[] = ['안정','체중 편중/무릎 굴곡/쪼그림','불안정/한발 지지/깊은 쪼그림'];
const loadLevelOptions: LoadLevel[] = ['거의 없음','약간 있음','중량물 반복 취급','큰 하중'];
const repetitionLevelOptions: RepetitionLevel[] = ['낮음','보통','높음'];
const shoulderPostureOptions: ShoulderPosture[] = ['중립','약간 들림','어깨 높이 이상','장시간 들고 있음'];
const armPostureOptions: ArmPosture[] = ['편안한 범위','다소 불편','극단 자세'];
const wristPostureOptions: WristPosture[] = ['중립','약간 꺾임','꺾임 큼/비틀림'];
const neckPostureRulaOptions: NeckPostureRula[] = ['중립','전방 굴곡','심한 굴곡/회전'];
const upperLimbUseOptions: UpperLimbUse[] = ['없음','중간','큼'];

const painFrequencyScore: Record<PainFrequency,number> = {'없음':0,'가끔 불편':1,'주 1~2회 통증':2,'거의 매일 통증':3,'작업 수행 어려움':4};
const symptomDurationScore: Record<SymptomDuration,number> = {'1주 미만':0,'1주 이상':1,'1개월 이상':2,'3개월 이상':3};
const recoveryScore: Record<RecoveryLevel,number> = {'충분히 회복됨':0,'다음날 약간 남음':1,'다음날에도 뚜렷함':2,'계속 지속됨':3};
const painIntensityScore: Record<PainIntensity,number> = {'약함':1,'보통':2,'강함':3};
const riskFactorScore: Record<RiskFactor,number> = {'반복 동작':2,'무거운 하중':3,'불편한 자세':3,'장시간 고정 자세':2,'진동 공구 사용':2,'휴식 부족':1};
const neckPostureScore: Record<NeckPosture,number> = {'중립':0,'약간 숙임/젖힘':1,'많이 숙임/회전/비틀림':2};
const trunkPostureScore: Record<TrunkPosture,number> = {'중립':0,'약간 굴곡':1,'깊은 굴곡 또는 비틀림':2,'깊은 굴곡 + 비틀림':3};
const legPostureScore: Record<LegPosture,number> = {'안정':0,'체중 편중/무릎 굴곡/쪼그림':1,'불안정/한발 지지/깊은 쪼그림':2};
const loadLevelScore: Record<LoadLevel,number> = {'거의 없음':0,'약간 있음':1,'중량물 반복 취급':2,'큰 하중':3};
const repetitionLevelScore: Record<RepetitionLevel,number> = {'낮음':0,'보통':1,'높음':2};
const shoulderPostureScore: Record<ShoulderPosture,number> = {'중립':0,'약간 들림':1,'어깨 높이 이상':2,'장시간 들고 있음':3};
const armPostureScore: Record<ArmPosture,number> = {'편안한 범위':0,'다소 불편':1,'극단 자세':2};
const wristPostureScore: Record<WristPosture,number> = {'중립':0,'약간 꺾임':1,'꺾임 큼/비틀림':2};
const neckPostureRulaScore: Record<NeckPostureRula,number> = {'중립':0,'전방 굴곡':1,'심한 굴곡/회전':2};
const upperLimbUseScore: Record<UpperLimbUse,number> = {'없음':0,'중간':1,'큼':2};

function getRiskMeta(score: number) {
  if (score <= 4) return { label: '낮음', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', summary: '현재 입력 기준에서 근골격계 부담 위험은 낮은 수준입니다. 정기적인 자세 점검과 예방 활동을 유지하세요.' };
  if (score <= 8) return { label: '보통', color: '#b45309', bg: '#fffbeb', border: '#fcd34d', summary: '일부 부담 요인이 확인됩니다. 작업 자세, 반복 주기, 휴식 배치를 조정하면 부담을 줄일 수 있습니다.' };
  if (score <= 12) return { label: '높음', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', summary: '근골격계 부담이 높은 수준으로 판단됩니다. 작업 개선과 보건관리자 상담을 권장합니다.' };
  return { label: '매우 높음', color: '#7f1d1d', bg: '#fef2f2', border: '#fca5a5', summary: '다수의 위험요인과 불편 자세가 확인되어 부담이 매우 높은 수준입니다. 즉시 작업 재설계 및 정밀 평가가 필요합니다.' };
}

function BodyFigure({ selectedBodyParts, onSelect }: { selectedBodyParts: BodyPart[]; onSelect: (part: BodyPart) => void }) {
  const ps = (part: BodyPart, width: string, height: string, extra?: React.CSSProperties): React.CSSProperties => ({
    width, height, borderRadius: '999px',
    border: selectedBodyParts.includes(part) ? '2px solid #2563eb' : '1px solid #cbd5e1',
    background: selectedBodyParts.includes(part) ? '#dbeafe' : '#f8fafc',
    cursor: 'pointer', ...extra,
  });
  return (
    <div style={{ width:'200px', margin:'0 auto', display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
      <button type="button" onClick={() => onSelect('목')} style={ps('목','50px','50px',{ borderRadius:'50%' })} />
      <button type="button" onClick={() => onSelect('목')} style={ps('목','18px','18px')} />
      <button type="button" onClick={() => onSelect('어깨')} style={ps('어깨','100px','26px')} />
      <div style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
        <button type="button" onClick={() => onSelect('팔/팔꿈치')} style={ps('팔/팔꿈치','20px','80px')} />
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
          <button type="button" onClick={() => onSelect('허리')} style={ps('허리','54px','84px',{ borderRadius:'20px' })} />
          <button type="button" onClick={() => onSelect('손목/손')} style={ps('손목/손','70px','18px',{ borderRadius:'10px' })} />
        </div>
        <button type="button" onClick={() => onSelect('팔/팔꿈치')} style={ps('팔/팔꿈치','20px','80px')} />
      </div>
      <div style={{ display:'flex', gap:'22px' }}>
        {[0,1].map(i => (
          <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
            <button type="button" onClick={() => onSelect('무릎')} style={ps('무릎','20px','74px')} />
            <button type="button" onClick={() => onSelect('발/발목')} style={ps('발/발목','26px','18px',{ borderRadius:'8px' })} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:'15px', fontWeight:800, color:'#111827', marginBottom:'12px' }}>{children}</div>;
}

function OptionButtons<T extends string>({ options, value, onChange, columns=0 }: { options: readonly T[]; value: T; onChange: (v: T) => void; columns?: number }) {
  const containerStyle: React.CSSProperties = columns > 0
    ? { display:'grid', gridTemplateColumns:`repeat(${columns}, minmax(0,1fr))`, gap:'10px' }
    : { display:'flex', gap:'10px', flexWrap:'wrap' };
  return (
    <div style={containerStyle}>
      {options.map(option => {
        const active = value === option;
        return (
          <button key={option} type="button" onClick={() => onChange(option)} style={{ textAlign:'left', padding:'12px 14px', borderRadius:'14px', border: active ? '1px solid #93c5fd' : '1px solid #e5e7eb', background: active ? '#eff6ff' : '#fff', color: active ? '#1d4ed8' : '#374151', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>{option}</button>
        );
      })}
    </div>
  );
}

const riskBadgeStyle = (위험도: string): React.CSSProperties => ({
  padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
  background: 위험도 === '매우 높음' ? '#fef2f2' : 위험도 === '높음' ? '#fff7ed' : 위험도 === '보통' ? '#fffbeb' : '#f0fdf4',
  color: 위험도 === '매우 높음' ? '#dc2626' : 위험도 === '높음' ? '#ea580c' : 위험도 === '보통' ? '#d97706' : '#16a34a',
});

export default function MusculoskeletalPage() {
  const [activeTab, setActiveTab] = useState<'평가' | '기록' | '보고서' | '통계'>('평가');
  const [mskRecords, setMskRecords] = useState<MskRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MskRecord | null>(null);
  const [filters, setFilters] = useState<Record<string,string>>({ 검사일:'', 성명:'', 사번:'', 소속:'', 공정명:'', 위험도:'', 검사자:'' });
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
const [mskReports,    setMskReports]    = useState<MskReport[]>([]);
const [reportBlobMap, setReportBlobMap] = useState<Record<string, string>>({});

const [reportDragging, setReportDragging] = useState(false);
const reportFileRef = useRef<HTMLInputElement>(null);


  const [selectedWorkType, setSelectedWorkType] = useState<WorkType>('조립/생산');
  const [selectedBodyParts, setSelectedBodyParts] = useState<BodyPart[]>(['허리']);
  const [painFrequency, setPainFrequency] = useState<PainFrequency>('가끔 불편');
  const [symptomDuration, setSymptomDuration] = useState<SymptomDuration>('1주 미만');
  const [recoveryAfterWork, setRecoveryAfterWork] = useState<RecoveryLevel>('충분히 회복됨');
  const [painIntensity, setPainIntensity] = useState<PainIntensity>('보통');
  const [selectedFactors, setSelectedFactors] = useState<RiskFactor[]>(['불편한 자세']);
  const [neckPosture, setNeckPosture] = useState<NeckPosture>('중립');
  const [trunkPosture, setTrunkPosture] = useState<TrunkPosture>('약간 굴곡');
  const [legPosture, setLegPosture] = useState<LegPosture>('안정');
  const [loadLevel, setLoadLevel] = useState<LoadLevel>('약간 있음');
  const [repetitionLevel, setRepetitionLevel] = useState<RepetitionLevel>('보통');
  const [shoulderPosture, setShoulderPosture] = useState<ShoulderPosture>('중립');
  const [armPosture, setArmPosture] = useState<ArmPosture>('다소 불편');
  const [wristPosture, setWristPosture] = useState<WristPosture>('중립');
  const [neckPostureRula, setNeckPostureRula] = useState<NeckPostureRula>('중립');
  const [upperLimbUse, setUpperLimbUse] = useState<UpperLimbUse>('중간');
  const [workDescription, setWorkDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);

  const [empDB, setEmpDB] = useState<Array<Record<string,string>>>([]);
  const [showEmpDrop, setShowEmpDrop] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empId, setEmpId] = useState('');
  const [empDept, setEmpDept] = useState('');
  const [empProcess, setEmpProcess] = useState('');
  const [examiner, setExaminer] = useState('');
  const [examDate, setExamDate] = useState(todayStr());
  const [saveMsg, setSaveMsg] = useState('');
  const [surveyList,      setSurveyList]      = useState<MskSurveyData[]>([]);
const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
const [surveyDragging,  setSurveyDragging]  = useState(false);
const surveyFileRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    try { const s = localStorage.getItem('hc_인명부'); if (s) setEmpDB(JSON.parse(s)); } catch {}
    try { const r = localStorage.getItem('hc_msk_records'); if (r) setMskRecords(JSON.parse(r)); } catch {}
    try {
  const rp = localStorage.getItem('hc_msk_reports');
  if (rp) {
    const reports: MskReport[] = JSON.parse(rp);
    setMskReports(reports);
    // IndexedDB에서 파일 복원
    (async () => {
      const map: Record<string, string> = {};
      for (const r of reports) {
        try {
          const b64 = await idbGet(r.id);
          if (b64) map[r.id] = base64ToBlobUrl(b64);
        } catch {}
      }
      setReportBlobMap(map);
    })();
  }
} catch {}

    try { const sv = localStorage.getItem('hc_msk_surveys'); if (sv) { const list = JSON.parse(sv); setSurveyList(list); if (list.length > 0) setSelectedSurveyId(list[0].id); } } catch {}

  }, []);

  const toggleBodyPart = (part: BodyPart) => {
    setSelectedBodyParts(prev =>
      prev.includes(part)
        ? prev.length === 1 ? prev : prev.filter(p => p !== part)
        : [...prev, part]
    );
  };

  const checklistScore = useMemo(() => {
    const factorSum = selectedFactors.reduce((sum, f) => sum + riskFactorScore[f], 0);
    return painFrequencyScore[painFrequency] + symptomDurationScore[symptomDuration] + recoveryScore[recoveryAfterWork] + painIntensityScore[painIntensity] + factorSum;
  }, [painFrequency, symptomDuration, recoveryAfterWork, painIntensity, selectedFactors]);

  const rebaScore = useMemo(() =>
    neckPostureScore[neckPosture] + trunkPostureScore[trunkPosture] + legPostureScore[legPosture] + loadLevelScore[loadLevel] + repetitionLevelScore[repetitionLevel],
    [neckPosture, trunkPosture, legPosture, loadLevel, repetitionLevel]);

  const rulaScore = useMemo(() =>
    shoulderPostureScore[shoulderPosture] + armPostureScore[armPosture] + wristPostureScore[wristPosture] + neckPostureRulaScore[neckPostureRula] + upperLimbUseScore[upperLimbUse],
    [shoulderPosture, armPosture, wristPosture, neckPostureRula, upperLimbUse]);

  const finalScore = useMemo(() => Math.round(checklistScore * 0.5 + rebaScore * 0.25 + rulaScore * 0.25), [checklistScore, rebaScore, rulaScore]);
  const finalRisk = useMemo(() => getRiskMeta(finalScore), [finalScore]);

  const reasoning = useMemo(() => {
    const r: string[] = [];
    if (painFrequencyScore[painFrequency] >= 3) r.push('통증 빈도가 높은 편입니다.');
    if (symptomDurationScore[symptomDuration] >= 2) r.push('증상 지속기간이 길어 누적 부담 가능성이 있습니다.');
    if (recoveryScore[recoveryAfterWork] >= 2) r.push('작업 후 회복이 충분하지 않습니다.');
    if (selectedFactors.includes('반복 동작')) r.push('반복 동작이 체크되어 체크리스트 점수가 상승했습니다.');
    if (selectedFactors.includes('무거운 하중')) r.push('하중 부담이 체크되어 작업부하 점수가 상승했습니다.');
    if (selectedFactors.includes('불편한 자세')) r.push('불편한 자세가 체크되어 전반적인 부담이 증가했습니다.');
    if (trunkPostureScore[trunkPosture] >= 2) r.push('몸통 굴곡 또는 비틀림이 커서 REBA 참고 점수가 상승했습니다.');
    if (neckPostureScore[neckPosture] >= 1) r.push('목 자세 부담이 일부 확인됩니다.');
    if (shoulderPostureScore[shoulderPosture] >= 2) r.push('어깨 거상 부담이 있어 RULA 참고 점수가 상승했습니다.');
    if (wristPostureScore[wristPosture] >= 1) r.push('손목 꺾임 또는 비틀림 부담이 확인됩니다.');
    if (upperLimbUseScore[upperLimbUse] >= 1) r.push('상지의 반복 사용 또는 힘 사용이 확인됩니다.');
    return r;
  }, [painFrequency, symptomDuration, recoveryAfterWork, selectedFactors, trunkPosture, neckPosture, shoulderPosture, wristPosture, upperLimbUse]);

  const recommendations = useMemo(() => {
    const recs = new Set<string>();
    recs.add('작업 전·후 스트레칭과 짧은 회복 시간을 운영합니다.');
    if (selectedBodyParts.includes('허리')) recs.add('허리를 굽힌 상태의 반복 작업을 줄이고 작업대 높이를 조정합니다.');
    if (selectedBodyParts.includes('목') || selectedBodyParts.includes('어깨')) recs.add('모니터, 작업대, 자재 위치를 조정하여 상지와 목 부담을 줄입니다.');
    if (selectedBodyParts.includes('손목/손')) recs.add('손목 중립 자세를 유지할 수 있도록 공구와 작업 방법을 조정합니다.');
    if (selectedBodyParts.includes('무릎') || selectedBodyParts.includes('발/발목')) recs.add('쪼그림, 무릎 굴곡, 장시간 입식 작업을 줄이는 방안을 검토합니다.');
    if (selectedFactors.includes('반복 동작')) recs.add('반복 작업 사이에 미세 휴식과 작업 순환을 도입합니다.');
    if (selectedFactors.includes('무거운 하중')) recs.add('중량물 취급 시 운반 보조도구 또는 2인 1조 작업을 검토합니다.');
    if (selectedFactors.includes('불편한 자세')) recs.add('작업 자세를 재설계하여 부자연스러운 관절 각도를 줄입니다.');
    if (selectedFactors.includes('장시간 고정 자세')) recs.add('30~60분 단위로 자세를 변경하고 짧은 회복 시간을 배치합니다.');
    if (selectedFactors.includes('진동 공구 사용')) recs.add('진동 공구 사용 시간을 제한하고 장비 유지상태를 점검합니다.');
    if (selectedFactors.includes('휴식 부족')) recs.add('휴식 시간을 재배치하고 작업 밀도를 조정합니다.');
    if (finalScore >= 9) recs.add('보건관리자 상담 및 인간공학적 정밀 평가를 권장합니다.');
    if (finalScore >= 13) recs.add('고위험 작업으로 판단되므로 즉시 작업 방법 개선을 우선 검토합니다.');
    aiResult?.recommendations.forEach(item => recs.add(item));
    return Array.from(recs);
  }, [selectedBodyParts, selectedFactors, finalScore, aiResult]);

  const stretchTips = useMemo(() => {
    const tipMap: Record<BodyPart, string[]> = {
      '목': ['고개를 좌우로 천천히 기울입니다.','목을 앞뒤로 천천히 움직이고 반동은 주지 않습니다.'],
      '어깨': ['어깨를 천천히 으쓱했다 내립니다.','양팔을 뒤로 가볍게 젖혀 가슴을 엽니다.'],
      '팔/팔꿈치': ['팔을 편 상태에서 전완부를 부드럽게 늘립니다.','통증 없는 범위에서 팔꿈치를 천천히 움직입니다.'],
      '손목/손': ['손목 굴곡과 신전을 천천히 반복합니다.','손가락과 손바닥을 가볍게 펴줍니다.'],
      '허리': ['허리를 갑자기 비틀지 말고 천천히 펴줍니다.','잠깐 걷거나 일어나서 허리 부담을 분산합니다.'],
      '무릎': ['무릎을 완전히 잠그지 말고 가볍게 굽혔다 폅니다.','쪼그림 자세를 오래 유지하지 않습니다.'],
      '발/발목': ['발목을 천천히 돌립니다.','종아리 스트레칭으로 하체 긴장을 줄입니다.'],
    };
    return selectedBodyParts.flatMap(part => tipMap[part].map(tip => `[${part}] ${tip}`));
  }, [selectedBodyParts]);

  const filteredRecords = useMemo(() => {
    let result = [...mskRecords];
    Object.entries(filters).forEach(([key, val]) => {
      if (!val) return;
      result = result.filter(r => String((r as Record<string,unknown>)[key] ?? '').toLowerCase().includes(val.toLowerCase()));
    });
    if (sortConfig) {
      result.sort((a, b) => {
        const av = String((a as Record<string,unknown>)[sortConfig.key] ?? '');
        const bv = String((b as Record<string,unknown>)[sortConfig.key] ?? '');
        return sortConfig.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    } else {
      result.reverse();
    }
    return result;
  }, [mskRecords, filters, sortConfig]);

  const toggleSort = (key: string) => {
    setSortConfig(prev =>
      prev?.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const toggleFactor = (factor: RiskFactor) => {
    setSelectedFactors(prev => prev.includes(factor) ? prev.filter(f => f !== factor) : [...prev, factor]);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    if (selectedBodyParts.includes('허리')) {
      setAiResult({ postureSummary: '업로드 자료 기준으로 몸통 굴곡과 반복 작업 부담 가능성이 보이며, 하중 취급 시 허리 부담이 커질 수 있습니다.', burdenParts: ['허리','어깨'], riskFactors: ['불편한 자세','반복 동작','무거운 하중'], recommendations: ['작업대 높이를 조정하여 몸통 굴곡을 줄이세요.','하중 취급 시 보조도구 사용을 검토하세요.'] });
    } else {
      setAiResult({ postureSummary: '업로드 자료 기준으로 상지와 목 주변의 부담 가능성이 보이며, 반복 동작과 상지 사용 빈도가 높아 보입니다.', burdenParts: [selectedBodyParts[0],'어깨'], riskFactors: ['반복 동작','장시간 고정 자세'], recommendations: ['상지 부담을 줄일 수 있도록 자재 위치와 작업 높이를 조정하세요.','반복 작업 사이에 미세 휴식을 추가하세요.'] });
    }
    setIsAnalyzing(false);
  };

 const handleSave = () => {
  if (!empName.trim()) { alert('성명을 입력하세요.'); return; }

  const saveRecord = (base64?: string) => {
    try {
      const existing: MskRecord[] = JSON.parse(localStorage.getItem('hc_msk_records') || '[]');
      const newId = existing.length > 0 ? Math.max(...existing.map(r => r.id)) + 1 : 1;
      const record: MskRecord = {
        id: newId, 사번: empId, 성명: empName, 소속: empDept, 공정명: empProcess,
        검사일: examDate, 작업내용: workDescription, 위험도: finalRisk.label, 검사자: examiner,
        선택부위: selectedBodyParts, 체크리스트점수: checklistScore, REBA점수: rebaScore,
        RULA점수: rulaScore, 종합점수: finalScore, 위험도요약: finalRisk.summary,
        평가근거: reasoning, 권장조치: recommendations, 관리팁: stretchTips,
        사진: base64,
      };
      const updated = [...existing, record];
      localStorage.setItem('hc_msk_records', JSON.stringify(updated));
      setMskRecords(updated);
      setSaveMsg('저장되었습니다.');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch { alert('저장 실패'); }
  };

  if (imageFile) {
    const reader = new FileReader();
    reader.onload = e => saveRecord(e.target?.result as string);
    reader.readAsDataURL(imageFile);
  } else {
    saveRecord();
  }
};
const handleSurveyUpload = async (files: FileList | null) => {
  if (!files) return;
  const allowed = Array.from(files).filter(f => /\.(xlsx|xls)$/i.test(f.name));
  if (allowed.length === 0) { alert('Excel 파일(.xlsx)만 업로드 가능합니다.'); return; }
  for (const f of allowed) {
    const parsed = parseMskExcel(await f.arrayBuffer());
    if (!parsed) { alert(`${f.name}\n'전체결과' 시트가 있는 파일인지 확인해주세요.`); continue; }
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const entry: MskSurveyData = {
      id, fileName: f.name, year: String(new Date().getFullYear()),
      site: '', uploadedAt: new Date().toLocaleDateString('ko-KR'), ...parsed,
    };
    setSurveyList(prev => {
      const next = [entry, ...prev];
      try { localStorage.setItem('hc_msk_surveys', JSON.stringify(next)); } catch {}
      return next;
    });
    setSelectedSurveyId(id);
  }
};

const deleteSurvey = (id: string) => {
  if (!confirm('삭제하시겠습니까?')) return;
  setSurveyList(prev => {
    const next = prev.filter(s => s.id !== id);
    try { localStorage.setItem('hc_msk_surveys', JSON.stringify(next)); } catch {}
    return next;
  });
  setSelectedSurveyId(prev => prev === id ? (surveyList.find(s => s.id !== id)?.id ?? null) : prev);
};

const updateSurveyMeta = (id: string, field: 'year' | 'site', value: string) => {
  setSurveyList(prev => {
    const next = prev.map(s => s.id === id ? { ...s, [field]: value } : s);
    try { localStorage.setItem('hc_msk_surveys', JSON.stringify(next)); } catch {}
    return next;
  });
};


const saveMskReports = (next: MskReport[]) => {
  setMskReports(next);
  try { localStorage.setItem('hc_msk_reports', JSON.stringify(next)); } catch {}
};

const handleReportUpload = async (files: FileList | null) => {
  if (!files) return;
  const allowed = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
  if (allowed.length === 0) { alert('PDF 파일만 업로드 가능합니다.'); return; }

  const newReports: MskReport[] = [];
  const newBlobMap: Record<string, string> = {};

  for (const f of allowed) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      const base64 = await fileToBase64(f);
      await idbSave(id, base64);                        // IndexedDB에 저장
      newBlobMap[id] = URL.createObjectURL(f);          // 현재 세션용 BlobURL
    } catch { alert(`${f.name} 저장 실패`); continue; }
    newReports.push({
      id, fileName: f.name, size: f.size, note: '', site: '',
      year: String(new Date().getFullYear()),
      uploadedAt: new Date().toLocaleDateString('ko-KR'),
    });
  }

  setReportBlobMap(prev => ({ ...prev, ...newBlobMap }));
  saveMskReports([...newReports, ...mskReports]);
};


const deleteReport = (id: string) => {
  if (!confirm('이 보고서를 삭제하시겠습니까?')) return;
  idbDelete(id);
  setReportBlobMap(prev => { const n = { ...prev }; delete n[id]; return n; });
  saveMskReports(mskReports.filter(r => r.id !== id));
};


const updateReport = (id: string, field: keyof MskReport, value: string) => {
  saveMskReports(mskReports.map(r => r.id === id ? { ...r, [field]: value } : r));
};


    const sectionCard: React.CSSProperties = { border:'1px solid #e5e7eb', borderRadius:'18px', background:'#fff', padding:'18px' };

  // ↓ 여기에 추가
  const renderReports = () => (
    <div>
      {/* 업로드 영역 */}
      <div
        onDragOver={e => { e.preventDefault(); setReportDragging(true); }}
        onDragLeave={() => setReportDragging(false)}
        onDrop={e => { e.preventDefault(); setReportDragging(false); handleReportUpload(e.dataTransfer.files); }}
        onClick={() => reportFileRef.current?.click()}
        style={{
          border: `2px dashed ${reportDragging ? '#2563eb' : '#d1d5db'}`,
          borderRadius: '12px', padding: '36px', textAlign: 'center',
          cursor: 'pointer', marginBottom: '20px', transition: 'all 0.15s',
          background: reportDragging ? '#eff6ff' : '#fafafa',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 700, color: reportDragging ? '#2563eb' : '#6b7280', marginBottom: '6px' }}>
          {reportDragging ? '여기에 놓으세요' : '보고서 PDF를 드래그하거나 클릭하여 업로드'}
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
          PDF 파일만 지원 · 여러 파일 동시 업로드 가능
        </div>
        <input ref={reportFileRef} type="file"
          accept=".pdf" multiple style={{ display: 'none' }}
          onChange={e => { handleReportUpload(e.target.files); e.target.value = ''; }} />
      </div>

      {/* 목록 */}
      {mskReports.length === 0 ? (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
          업로드된 보고서가 없습니다.
        </div>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: '13px', fontWeight: 700, color: '#374151' }}>
            전체 {mskReports.length}건
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['파일명', '연도', '사업장', '비고', '크기', '업로드일', ''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mskReports.map(report => {
                  const url = reportBlobMap[report.id];


                  return (
                    <tr key={report.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                      <td style={{ padding: '10px 12px', maxWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {url ? (
                            <a href={url} target="_blank" rel="noreferrer"
                              style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                              {report.fileName}
                            </a>
                          ) : (
                            <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap', maxWidth: '140px' }}>{report.fileName}</span>
                          )}
                          {!url && (
  <span style={{ fontSize: '10px', color: '#f59e0b', flexShrink: 0,
    background: '#fffbeb', border: '1px solid #fde68a', padding: '1px 5px', borderRadius: '3px' }}>
    재첨부 필요
  </span>
)}

                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <input value={report.year}
                          onChange={e => updateReport(report.id, 'year', e.target.value)}
                          style={{ width: '58px', padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: '5px', fontSize: '12px', outline: 'none' }} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <input value={report.site} placeholder="화성/평택"
                          onChange={e => updateReport(report.id, 'site', e.target.value)}
                          style={{ width: '80px', padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: '5px', fontSize: '12px', outline: 'none' }} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <input value={report.note} placeholder="비고 입력"
                          onChange={e => updateReport(report.id, 'note', e.target.value)}
                          style={{ width: '150px', padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: '5px', fontSize: '12px', outline: 'none' }} />
                      </td>
                      <td style={{ padding: '10px 12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {(report.size / 1024).toFixed(0)} KB
                      </td>
                      <td style={{ padding: '10px 12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {report.uploadedAt}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={() => deleteReport(report.id)}
                          style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626',
                            border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 16px', fontSize: '11px', color: '#d1d5db', borderTop: '1px solid #f3f4f6' }}>
            ※ 파일은 브라우저 로컬에 저장됩니다. 다른 기기·다른 브라우저에서는 열리지 않습니다.

          </div>
        </div>
      )}
    </div>
  );
const renderStats = () => {
  const cur = surveyList.find(s => s.id === selectedSurveyId) ?? null;
  const legend = (
    <div style={{ display:'flex', gap:'14px', marginBottom:'14px', fontSize:'12px', color:'#6b7280' }}>
      {[{ c:'#16a34a', l:'정상' }, { c:'#f59e0b', l:'관리대상자' }, { c:'#dc2626', l:'통증호소자' }].map(i => (
        <div key={i.l} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
          <div style={{ width:'10px', height:'10px', borderRadius:'2px', background:i.c }} />{i.l}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {/* 업로드 + 파일 선택 */}
      <div style={{ display:'flex', gap:'12px', marginBottom:'20px', flexWrap:'wrap', alignItems:'flex-start' }}>
        <div
          onDragOver={e => { e.preventDefault(); setSurveyDragging(true); }}
          onDragLeave={() => setSurveyDragging(false)}
          onDrop={e => { e.preventDefault(); setSurveyDragging(false); handleSurveyUpload(e.dataTransfer.files); }}
          onClick={() => surveyFileRef.current?.click()}
          style={{ border:`2px dashed ${surveyDragging ? '#2563eb' : '#d1d5db'}`, borderRadius:'10px', padding:'16px 22px', textAlign:'center', cursor:'pointer', background: surveyDragging ? '#eff6ff' : '#fafafa', fontSize:'13px', color: surveyDragging ? '#2563eb' : '#6b7280', whiteSpace:'nowrap' }}
        >
          분석 결과 Excel 업로드
          <input ref={surveyFileRef} type="file" accept=".xlsx,.xls" multiple style={{ display:'none' }}
            onChange={e => { handleSurveyUpload(e.target.files); e.target.value = ''; }} />
        </div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', flex:1 }}>
          {surveyList.map(s => (
            <div key={s.id} onClick={() => setSelectedSurveyId(s.id)}
              style={{ padding:'8px 12px', borderRadius:'8px', cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', gap:'8px', border: selectedSurveyId===s.id ? '1px solid #2563eb' : '1px solid #e5e7eb', background: selectedSurveyId===s.id ? '#eff6ff' : '#fff', color: selectedSurveyId===s.id ? '#1d4ed8' : '#374151' }}>
              <span>{s.year}년 {s.site || s.fileName.replace(/\.[^.]+$/, '')}</span>
              <button onClick={e => { e.stopPropagation(); deleteSurvey(s.id); }}
                style={{ background:'none', border:'none', color:'#9ca3af', cursor:'pointer', fontSize:'14px', padding:0, lineHeight:1 }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {!cur ? (
        <div style={{ border:'1px solid #e5e7eb', borderRadius:'12px', padding:'60px', textAlign:'center', color:'#9ca3af', fontSize:'14px' }}>
          분석 결과 Excel 파일을 업로드하면 통계가 표시됩니다.<br />
          <span style={{ fontSize:'12px', marginTop:'6px', display:'block' }}>'전체결과' 시트가 포함된 파일을 업로드해주세요.</span>
        </div>
      ) : (
        <>
          {/* 메타 편집 */}
          <div style={{ display:'flex', gap:'10px', marginBottom:'16px', alignItems:'center' }}>
            <input value={cur.year} onChange={e => updateSurveyMeta(cur.id, 'year', e.target.value)}
              placeholder="연도" style={{ width:'68px', padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:'6px', fontSize:'13px', outline:'none' }} />
            <input value={cur.site} onChange={e => updateSurveyMeta(cur.id, 'site', e.target.value)}
              placeholder="사업장 (예: 화성)" style={{ width:'130px', padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:'6px', fontSize:'13px', outline:'none' }} />
            <span style={{ fontSize:'12px', color:'#9ca3af' }}>{cur.fileName} · {cur.uploadedAt}</span>
          </div>

          {/* 요약 카드 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
            {[
              { label:'총 응답자', value:cur.total.합계, color:'#111827', rate:'' },
              { label:'정상', value:cur.total.정상, color:'#16a34a', rate:`${cur.total.합계>0?(cur.total.정상/cur.total.합계*100).toFixed(1):0}%` },
              { label:'관리대상자', value:cur.total.관리대상자, color:'#d97706', rate:`${cur.total.합계>0?(cur.total.관리대상자/cur.total.합계*100).toFixed(1):0}%` },
              { label:'통증호소자', value:cur.total.통증호소자, color:'#dc2626', rate:`${cur.total.합계>0?(cur.total.통증호소자/cur.total.합계*100).toFixed(1):0}%` },
            ].map(item => (
              <div key={item.label} style={{ border:'1px solid #e5e7eb', borderRadius:'12px', padding:'16px', background:'#fff' }}>
                <div style={{ fontSize:'12px', color:'#9ca3af', fontWeight:600, marginBottom:'6px' }}>{item.label}</div>
                <div style={{ fontSize:'26px', fontWeight:800, color:item.color }}>{item.value.toLocaleString()}</div>
                {item.rate && <div style={{ fontSize:'12px', color:item.color, fontWeight:600, marginTop:'4px' }}>{item.rate}</div>}
              </div>
            ))}
          </div>

          {/* 부서별 (전체 폭) */}
          <div style={{ border:'1px solid #e5e7eb', borderRadius:'12px', padding:'18px', background:'#fff', marginBottom:'14px' }}>
            <div style={{ fontSize:'14px', fontWeight:800, color:'#111827', marginBottom:'12px' }}>부서별 현황 (통증호소율 높은 순)</div>
            {legend}
            {(() => {
              const sorted = [...cur.byDept]
                .sort((a,b) => ((b.관리대상자+b.통증호소자)/b.합계) - ((a.관리대상자+a.통증호소자)/a.합계));
              const maxVal = Math.max(...sorted.map(d => d.합계));
              return sorted.map(d => <BarRow key={d.label} {...d} maxVal={maxVal} />);
            })()}
          </div>

          {/* 하단 2×2 그리드 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
            {/* 연령별 */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:'12px', padding:'18px', background:'#fff' }}>
              <div style={{ fontSize:'14px', fontWeight:800, color:'#111827', marginBottom:'10px' }}>연령별 현황</div>
              {legend}
              {(() => { const maxVal = Math.max(...cur.byAge.map(d=>d.합계)); return cur.byAge.map(d => <BarRow key={d.label} {...d} maxVal={maxVal} labelWidth={60} />); })()}
            </div>

            {/* 성별 */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:'12px', padding:'18px', background:'#fff' }}>
              <div style={{ fontSize:'14px', fontWeight:800, color:'#111827', marginBottom:'10px' }}>성별 현황</div>
              {legend}
              {(() => { const maxVal = Math.max(...cur.byGender.map(d=>d.합계)); return cur.byGender.map(d => <BarRow key={d.label} {...d} maxVal={maxVal} labelWidth={40} />); })()}
            </div>

            {/* 근무년수별 */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:'12px', padding:'18px', background:'#fff' }}>
              <div style={{ fontSize:'14px', fontWeight:800, color:'#111827', marginBottom:'10px' }}>근무년수별 현황</div>
              {legend}
              {(() => { const maxVal = Math.max(...cur.byWorkYrs.map(d=>d.합계)); return cur.byWorkYrs.map(d => <BarRow key={d.label} {...d} maxVal={maxVal} labelWidth={110} />); })()}
            </div>

            {/* 육체적 부담정도 */}
            <div style={{ border:'1px solid #e5e7eb', borderRadius:'12px', padding:'18px', background:'#fff' }}>
              <div style={{ fontSize:'14px', fontWeight:800, color:'#111827', marginBottom:'10px' }}>육체적 부담정도별 현황</div>
              {legend}
              {(() => { const maxVal = Math.max(...cur.byBurden.map(d=>d.합계)); return cur.byBurden.map(d => <BarRow key={d.label} {...d} maxVal={maxVal} labelWidth={90} />); })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

  return (   // ← 기존 return

    <div style={{ padding:'28px 32px', background:'#f9fafb', minHeight:'100%' }}>

      {/* 상단 고정 바 */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'10px 0', marginBottom:'18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <h2 style={{ fontSize:'22px', fontWeight:800, color:'#111827', margin:0 }}>근골격계 부담 평가</h2>
          <div style={{ display:'flex', gap:'6px' }}>
  {(['평가','기록','보고서','통계'] as const).map(tab => (
    <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding:'6px 16px', borderRadius:'8px', fontSize:'13px', fontWeight:700, border: activeTab===tab ? '1px solid #2563eb' : '1px solid #e5e7eb', background: activeTab===tab ? '#eff6ff' : '#fff', color: activeTab===tab ? '#2563eb' : '#6b7280', cursor:'pointer' }}>
      {tab === '기록' ? `기록 (${mskRecords.length})` : tab === '보고서' ? `보고서 (${mskReports.length})` : tab === '통계' ? `통계 (${surveyList.length})` : tab}
    </button>
  ))}
</div>

        </div>
        {activeTab === '평가' && (
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            {saveMsg && <span style={{ fontSize:'13px', color:'#16a34a', fontWeight:600 }}>{saveMsg}</span>}
            <button onClick={handleSave} style={{ padding:'10px 24px', background:'#16a34a', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>저장</button>
          </div>
        )}
      </div>

      {/* 평가 탭 */}
      {activeTab === '평가' && (
        <>
          {/* 직원 정보 */}
          <div style={{ border:'1px solid #e5e7eb', borderRadius:'14px', background:'#fff', padding:'16px', marginBottom:'18px' }}>
            <div style={{ fontSize:'14px', fontWeight:700, color:'#166534', marginBottom:'12px' }}>조사 대상자 정보</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
              <div style={{ position:'relative' }}>
                <div style={{ fontSize:'12px', color:'#6b7280', fontWeight:600, marginBottom:'4px' }}>성명</div>
                <input
                  value={empName}
                  onChange={e => { setEmpName(e.target.value); setShowEmpDrop(true); if (!e.target.value) { setEmpId(''); setEmpDept(''); setEmpProcess(''); } }}
                  onBlur={() => setTimeout(() => setShowEmpDrop(false), 150)}
                  onFocus={() => empName.trim() && setShowEmpDrop(true)}
                  placeholder="이름 입력"
                  style={{ width:'100%', padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:'8px', fontSize:'13px', outline:'none', boxSizing:'border-box' as const }}
                />
                {showEmpDrop && empName.trim().length >= 1 && (() => {
                  const matched = empDB.filter(r => String(r['성명'] ?? '').includes(empName.trim()));
                  if (!matched.length) return null;
                  return (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e5e7eb', borderRadius:'8px', zIndex:300, maxHeight:'200px', overflowY:'auto', marginTop:'2px', boxShadow:'0 4px 12px rgba(0,0,0,.1)' }}>
                      {matched.slice(0,8).map((r,i) => (
                        <div key={i}
                          onMouseDown={() => { setEmpName(String(r['성명']??'')); setEmpId(String(r['사번']??'')); setEmpDept(String(r['소속']??'')); setEmpProcess(String(r['공정명']??'')); setShowEmpDrop(false); }}
                          style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #f3f4f6', background:'#fff' }}
                          onMouseEnter={e => (e.currentTarget.style.background='#f0f9ff')}
                          onMouseLeave={e => (e.currentTarget.style.background='#fff')}
                        >
                          <div style={{ fontSize:'13px', fontWeight:600 }}>{String(r['성명']??'')}</div>
                          <div style={{ fontSize:'11px', color:'#9ca3af' }}>{String(r['사번']??'')} · {String(r['소속']??'')} · {String(r['공정명']??'')}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {[
                { label:'사번', value:empId, set:setEmpId, placeholder:'사번 입력' },
                { label:'소속', value:empDept, set:setEmpDept, placeholder:'부서명 입력' },
                { label:'공정명', value:empProcess, set:setEmpProcess, placeholder:'공정명 입력' },
                { label:'조사자', value:examiner, set:setExaminer, placeholder:'조사자 이름' },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <div style={{ fontSize:'12px', color:'#6b7280', fontWeight:600, marginBottom:'4px' }}>{label}</div>
                  <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder} style={{ width:'100%', padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:'8px', fontSize:'13px', outline:'none', boxSizing:'border-box' as const }} />
                </div>
              ))}
              <div>
                <div style={{ fontSize:'12px', color:'#6b7280', fontWeight:600, marginBottom:'4px' }}>조사일</div>
                <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} style={{ width:'100%', padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:'8px', fontSize:'13px', outline:'none', boxSizing:'border-box' as const }} />
              </div>
            </div>
          </div>

          {/* 요약 카드 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'12px', marginBottom:'18px' }}>
            <div style={sectionCard}><div style={{ fontSize:'12px', color:'#9ca3af', fontWeight:700, marginBottom:'8px' }}>선택 부위</div><div style={{ fontSize:'16px', fontWeight:800, color:'#111827' }}>{selectedBodyParts.join(', ')}</div></div>
            <div style={sectionCard}><div style={{ fontSize:'12px', color:'#9ca3af', fontWeight:700, marginBottom:'8px' }}>작업 유형</div><div style={{ fontSize:'20px', fontWeight:800, color:'#111827' }}>{selectedWorkType}</div></div>
            <div style={sectionCard}><div style={{ fontSize:'12px', color:'#9ca3af', fontWeight:700, marginBottom:'8px' }}>체크리스트 점수</div><div style={{ fontSize:'20px', fontWeight:800, color:'#111827' }}>{checklistScore}점</div></div>
            <div style={{ ...sectionCard, border:`1px solid ${finalRisk.border}`, background:finalRisk.bg }}><div style={{ fontSize:'12px', color:'#9ca3af', fontWeight:700, marginBottom:'8px' }}>종합 위험도</div><div style={{ fontSize:'20px', fontWeight:800, color:finalRisk.color }}>{finalRisk.label}</div></div>
          </div>

          {/* 2열 */}
          <div style={{ display:'grid', gridTemplateColumns:'1.08fr 0.92fr', gap:'18px' }}>
            <div style={{ display:'grid', gap:'18px' }}>
              <div style={sectionCard}>
                <SectionTitle>신체 부위 선택 (다중 선택 가능)</SectionTitle>
                <div style={{ display:'grid', gridTemplateColumns:'0.95fr 1.05fr', gap:'18px', alignItems:'center' }}>
                  <BodyFigure selectedBodyParts={selectedBodyParts} onSelect={toggleBodyPart} />
                  <div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0,1fr))', gap:'10px' }}>
                      {bodyParts.map(part => {
                        const active = selectedBodyParts.includes(part);
                        return (
                          <button key={part} type="button" onClick={() => toggleBodyPart(part)} style={{ textAlign:'left', padding:'12px 14px', borderRadius:'14px', border: active ? '1px solid #93c5fd' : '1px solid #e5e7eb', background: active ? '#eff6ff' : '#fff', color: active ? '#1d4ed8' : '#374151', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>
                            {part}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ marginTop:'12px', border:'1px solid #e5e7eb', borderRadius:'12px', background:'#f8fafc', padding:'12px 14px', fontSize:'13px', color:'#6b7280', lineHeight:1.7 }}>사람 도형 또는 버튼을 눌러 주요 불편 부위를 선택하세요. 여러 부위 동시 선택이 가능합니다.</div>
                  </div>
                </div>
              </div>
              <div style={sectionCard}><SectionTitle>기본 정보</SectionTitle><OptionButtons options={workTypes} value={selectedWorkType} onChange={setSelectedWorkType} /></div>
              <div style={sectionCard}>
                <SectionTitle>간이 체크리스트</SectionTitle>
                <div style={{ display:'grid', gap:'16px' }}>
                  <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>통증 빈도</div><OptionButtons options={painFrequencyOptions} value={painFrequency} onChange={setPainFrequency} /></div>
                  <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>증상 지속기간</div><OptionButtons options={symptomDurationOptions} value={symptomDuration} onChange={setSymptomDuration} /></div>
                  <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>작업 후 회복 여부</div><OptionButtons options={recoveryOptions} value={recoveryAfterWork} onChange={setRecoveryAfterWork} /></div>
                  <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>통증 강도</div><OptionButtons options={painIntensityOptions} value={painIntensity} onChange={setPainIntensity} /></div>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>작업 유해요인</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:'10px' }}>
                      {riskFactors.map(factor => { const active = selectedFactors.includes(factor); return <button key={factor} type="button" onClick={() => toggleFactor(factor)} style={{ textAlign:'left', padding:'12px 14px', borderRadius:'14px', border: active ? '1px solid #93c5fd' : '1px solid #e5e7eb', background: active ? '#eff6ff' : '#fff', color: active ? '#1d4ed8' : '#374151', fontSize:'14px', fontWeight:700, cursor:'pointer' }}>{factor}</button>; })}
                    </div>
                  </div>
                </div>
              </div>
              <div style={sectionCard}>
                <SectionTitle>REBA 참고형 평가</SectionTitle>
                <div style={{ display:'grid', gap:'16px' }}>
                  <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>목 자세</div><OptionButtons options={neckPostureOptions} value={neckPosture} onChange={setNeckPosture} /></div>
                  <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>몸통 자세</div><OptionButtons options={trunkPostureOptions} value={trunkPosture} onChange={setTrunkPosture} /></div>
                  <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>다리 자세</div><OptionButtons options={legPostureOptions} value={legPosture} onChange={setLegPosture} /></div>
                  <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>하중 수준</div><OptionButtons options={loadLevelOptions} value={loadLevel} onChange={setLoadLevel} /></div>
                  <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>반복성</div><OptionButtons options={repetitionLevelOptions} value={repetitionLevel} onChange={setRepetitionLevel} /></div>
                </div>
              </div>
              <div style={sectionCard}>
                <SectionTitle>RULA 참고형 평가</SectionTitle>
                <div style={{ display:'grid', gap:'16px' }}>
                  <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>어깨/상완 자세</div><OptionButtons options={shoulderPostureOptions} value={shoulderPosture} onChange={setShoulderPosture} /></div>
                  <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>팔꿈치/전완 자세</div><OptionButtons options={armPostureOptions} value={armPosture} onChange={setArmPosture} /></div>
                  <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>손목 자세</div><OptionButtons options={wristPostureOptions} value={wristPosture} onChange={setWristPosture} /></div>
                  <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>목 자세</div><OptionButtons options={neckPostureRulaOptions} value={neckPostureRula} onChange={setNeckPostureRula} /></div>
                  <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>상지 반복/힘 사용</div><OptionButtons options={upperLimbUseOptions} value={upperLimbUse} onChange={setUpperLimbUse} /></div>
                </div>
              </div>
              <div style={sectionCard}>
                <SectionTitle>AI 업로드 평가</SectionTitle>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                  <label style={{ border:'1px dashed #cbd5e1', borderRadius:'14px', padding:'18px', background:'#f8fafc', cursor:'pointer', display:'block' }}>
                    <div style={{ fontSize:'14px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>작업 사진 업로드</div>
                    <div style={{ fontSize:'12px', color:'#6b7280', lineHeight:1.6 }}>정면 또는 측면 자세가 잘 보이도록 업로드하세요.</div>
                    <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => setImageFile(e.target.files?.[0]||null)} />
                  </label>
                  <label style={{ border:'1px dashed #cbd5e1', borderRadius:'14px', padding:'18px', background:'#f8fafc', cursor:'pointer', display:'block' }}>
                    <div style={{ fontSize:'14px', fontWeight:700, color:'#111827', marginBottom:'6px' }}>작업 영상 업로드</div>
                    <div style={{ fontSize:'12px', color:'#6b7280', lineHeight:1.6 }}>반복 작업이 보이도록 5~20초 내외 영상을 권장합니다.</div>
                    <input type="file" accept="video/*" style={{ display:'none' }} onChange={e => setVideoFile(e.target.files?.[0]||null)} />
                  </label>
                </div>
                <div style={{ border:'1px solid #e5e7eb', borderRadius:'12px', background:'#fff', padding:'12px 14px', fontSize:'13px', color:'#6b7280', marginBottom:'12px' }}>
                  {videoFile ? `영상 업로드됨: ${videoFile.name}` : imageFile ? `사진 업로드됨: ${imageFile.name}` : '업로드된 파일이 없습니다.'}
                </div>
                <div><div style={{ fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>작업 설명</div><textarea value={workDescription} onChange={e => setWorkDescription(e.target.value)} placeholder="예: 허리를 굽혀 자재를 반복적으로 들어 올리고, 하루 4시간 정도 작업합니다." style={{ width:'100%', minHeight:'110px', border:'1px solid #e5e7eb', borderRadius:'12px', padding:'12px 14px', fontSize:'14px', color:'#111827', resize:'vertical', outline:'none' }} /></div>
                <div style={{ marginTop:'16px' }}>
                  <button type="button" onClick={handleAnalyze} disabled={isAnalyzing||(!imageFile&&!videoFile)} style={{ padding:'12px 18px', borderRadius:'12px', border:'1px solid #2563eb', background: isAnalyzing||(!imageFile&&!videoFile) ? '#dbeafe' : '#2563eb', color:'#fff', fontSize:'14px', fontWeight:800, cursor: isAnalyzing||(!imageFile&&!videoFile) ? 'not-allowed' : 'pointer' }}>
                    {isAnalyzing ? 'AI 평가 중...' : 'AI 평가하기'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display:'grid', gap:'18px' }}>
              <div style={{ ...sectionCard, border:`1px solid ${finalRisk.border}`, background:finalRisk.bg }}>
                <SectionTitle>종합 평가 결과</SectionTitle>
                <div style={{ fontSize:'30px', fontWeight:800, color:finalRisk.color, marginBottom:'8px' }}>{finalRisk.label}</div>
                <div style={{ fontSize:'14px', color:'#374151', lineHeight:1.7, marginBottom:'10px' }}>{finalRisk.summary}</div>
                <div style={{ fontSize:'13px', color:'#6b7280' }}>체크리스트 {checklistScore}점 / REBA 참고 {rebaScore}점 / RULA 참고 {rulaScore}점 / 종합 {finalScore}점</div>
              </div>
              <div style={sectionCard}><SectionTitle>점수 세부</SectionTitle><div style={{ display:'grid', gap:'10px', fontSize:'14px', color:'#374151' }}><div>간이 체크리스트 점수: <b>{checklistScore}점</b></div><div>REBA 참고형 점수: <b>{rebaScore}점</b></div><div>RULA 참고형 점수: <b>{rulaScore}점</b></div></div></div>
              <div style={sectionCard}><SectionTitle>평가 근거</SectionTitle><ul style={{ margin:0, paddingLeft:'18px', color:'#374151', fontSize:'14px', lineHeight:1.8 }}>{reasoning.length > 0 ? reasoning.map((item,i) => <li key={i}>{item}</li>) : <li>현재 선택된 항목에서 두드러진 고위험 근거는 많지 않습니다.</li>}</ul></div>
              <div style={sectionCard}>
                <SectionTitle>AI 참고 결과</SectionTitle>
                {!aiResult ? (
                  <div style={{ border:'1px dashed #d1d5db', borderRadius:'14px', background:'#fafafa', padding:'26px 18px', textAlign:'center', color:'#9ca3af', fontSize:'13px', lineHeight:1.7 }}>사진 또는 영상을 업로드한 뒤 AI 평가를 실행하면<br />자세 요약과 참고 결과가 표시됩니다.</div>
                ) : (
                  <div style={{ display:'grid', gap:'12px' }}>
                    <div style={{ border:'1px solid #eef2f7', borderRadius:'14px', padding:'14px', background:'#fcfcfd' }}><div style={{ fontSize:'14px', fontWeight:800, color:'#111827', marginBottom:'8px' }}>자세 요약</div><div style={{ fontSize:'14px', color:'#374151', lineHeight:1.7 }}>{aiResult.postureSummary}</div></div>
                    <div style={{ border:'1px solid #eef2f7', borderRadius:'14px', padding:'14px', background:'#fcfcfd' }}><div style={{ fontSize:'14px', fontWeight:800, color:'#111827', marginBottom:'8px' }}>추정 부담 부위</div><div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>{aiResult.burdenParts.map(part => <span key={part} style={{ padding:'6px 10px', borderRadius:'999px', border:'1px solid #bfdbfe', background:'#eff6ff', color:'#1d4ed8', fontSize:'12px', fontWeight:700 }}>{part}</span>)}</div></div>
                    <div style={{ border:'1px solid #eef2f7', borderRadius:'14px', padding:'14px', background:'#fcfcfd' }}><div style={{ fontSize:'14px', fontWeight:800, color:'#111827', marginBottom:'8px' }}>추정 위험요인</div><ul style={{ margin:0, paddingLeft:'18px', color:'#374151', fontSize:'14px', lineHeight:1.8 }}>{aiResult.riskFactors.map((f,i) => <li key={i}>{f}</li>)}</ul></div>
                  </div>
                )}
              </div>
              <div style={sectionCard}><SectionTitle>권장 조치</SectionTitle><ol style={{ margin:0, paddingLeft:'18px', color:'#374151', fontSize:'14px', lineHeight:1.8 }}>{recommendations.map((item,i) => <li key={i}>{item}</li>)}</ol></div>
              <div style={sectionCard}><SectionTitle>부위별 관리 팁</SectionTitle><ul style={{ margin:0, paddingLeft:'18px', color:'#374151', fontSize:'14px', lineHeight:1.8 }}>{stretchTips.map((tip,i) => <li key={i}>{tip}</li>)}</ul></div>
              <div style={sectionCard}><SectionTitle>안내</SectionTitle><div style={{ fontSize:'13px', color:'#6b7280', lineHeight:1.8 }}>본 평가는 간이 체크리스트와 REBA/RULA 참고형 논리를 결합한 내부 참고용 스크리닝 결과입니다. 의료 진단이나 법적 판정 결과를 대체하지 않으며, 고위험 작업 또는 증상 지속 시 보건관리자 상담과 정밀 평가가 필요합니다.</div></div>
            </div>
          </div>
        </>
      )}

      {/* 기록 탭 */}
      {activeTab === '기록' && (
        <div style={{ border:'1px solid #e5e7eb', borderRadius:'14px', background:'#fff', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#374151' }}>
              전체 {mskRecords.length}건 · 표시 {filteredRecords.length}건
            </div>
            <button
              onClick={() => { setFilters({ 검사일:'', 성명:'', 사번:'', 소속:'', 공정명:'', 위험도:'', 검사자:'' }); setSortConfig(null); }}
              style={{ padding:'5px 12px', fontSize:'12px', fontWeight:600, border:'1px solid #e5e7eb', borderRadius:'6px', background:'#f9fafb', color:'#6b7280', cursor:'pointer' }}
            >
              필터 초기화
            </button>
          </div>
          {mskRecords.length === 0 ? (
            <div style={{ padding:'60px', textAlign:'center', color:'#9ca3af', fontSize:'14px' }}>저장된 기록이 없습니다.</div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead>
                  <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
                    {[
                      { key:'검사일', label:'검사일' },
                      { key:'성명',   label:'성명' },
                      { key:'사번',   label:'사번' },
                      { key:'소속',   label:'소속' },
                      { key:'공정명', label:'공정명' },
                      { key:'위험도', label:'위험도' },
                      { key:'작업내용', label:'작업내용' },
                      { key:'검사자', label:'검사자' },
                    ].map(col => (
                      <th key={col.key}
                        style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'#374151', whiteSpace:'nowrap', cursor:'pointer', userSelect:'none' }}
                        onClick={() => toggleSort(col.key)}
                      >
                        {col.label}{sortConfig?.key === col.key ? (sortConfig.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                      </th>
                    ))}
                    <th style={{ padding:'10px 12px', textAlign:'center', fontWeight:700, color:'#374151' }}>삭제</th>
                  </tr>
                  <tr style={{ background:'#fff', borderBottom:'1px solid #e5e7eb' }}>
                    {['검사일','성명','사번','소속','공정명','위험도','작업내용','검사자'].map(key => (
                      <td key={key} style={{ padding:'6px 8px' }}>
                        {key === '위험도' ? (
                          <select
                            value={filters[key] ?? ''}
                            onChange={e => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                            style={{ width:'100%', padding:'5px 6px', border:'1px solid #e5e7eb', borderRadius:'6px', fontSize:'12px', color:'#374151', background:'#fff' }}
                          >
                            <option value=''>전체</option>
                            {['낮음','보통','높음','매우 높음'].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        ) : (
                          <input
                            value={filters[key] ?? ''}
                            onChange={e => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder="검색..."
                            style={{ width:'100%', padding:'5px 6px', border:'1px solid #e5e7eb', borderRadius:'6px', fontSize:'12px', outline:'none', boxSizing:'border-box' as const }}
                          />
                        )}
                      </td>
                    ))}
                    <td />
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding:'30px', textAlign:'center', color:'#9ca3af', fontSize:'13px' }}>검색 결과가 없습니다.</td></tr>
                  ) : filteredRecords.map(rec => (
                    <tr key={rec.id} style={{ borderBottom:'1px solid #f3f4f6' }}
                      onMouseEnter={e => (e.currentTarget.style.background='#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.background='#fff')}
                    >
                      <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>{rec.검사일}</td>
                      <td style={{ padding:'10px 12px', fontWeight:600, color:'#2563eb', cursor:'pointer', textDecoration:'underline' }} onClick={() => setSelectedRecord(rec)}>{rec.성명}</td>
                      <td style={{ padding:'10px 12px', color:'#6b7280' }}>{rec.사번}</td>
                      <td style={{ padding:'10px 12px' }}>{rec.소속}</td>
                      <td style={{ padding:'10px 12px' }}>{rec.공정명}</td>
                      <td style={{ padding:'10px 12px' }}><span style={riskBadgeStyle(rec.위험도)}>{rec.위험도}</span></td>
                      <td style={{ padding:'10px 12px', color:'#6b7280', maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{rec.작업내용||'-'}</td>
                      <td style={{ padding:'10px 12px' }}>{rec.검사자||'-'}</td>
                      <td style={{ padding:'10px 12px', textAlign:'center' }}>
                        <button onClick={() => { const upd = mskRecords.filter(r => r.id!==rec.id); setMskRecords(upd); localStorage.setItem('hc_msk_records',JSON.stringify(upd)); }} style={{ padding:'4px 10px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:'6px', fontSize:'12px', cursor:'pointer', fontWeight:600 }}>삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
{activeTab === '보고서' && (
  <div style={{ padding: '28px 32px' }}>
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>
        근골격계 부담작업 유해요인조사 보고서
      </h3>
      <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
        3년 주기 정기조사 및 수시조사 보고서를 업로드하여 관리합니다.
      </p>
    </div>
    {renderReports()}
  </div>
)}
{activeTab === '통계' && (
  <div style={{ padding:'28px 32px' }}>
    <div style={{ marginBottom:'20px' }}>
      <h3 style={{ fontSize:'16px', fontWeight:800, color:'#111827', margin:'0 0 6px' }}>근골격계질환 증상조사 분석 결과</h3>
      <p style={{ fontSize:'13px', color:'#6b7280', margin:0 }}>Excel 분석 파일을 업로드하면 부서별·연령별·성별·근무년수별·부담정도별 통계를 자동으로 시각화합니다.</p>
    </div>
    {renderStats()}
  </div>
)}


      {/* 상세 기록 모달 */}
      {selectedRecord && (() => {
        const 부위목록: BodyPart[] = Array.isArray(selectedRecord.선택부위)
          ? selectedRecord.선택부위
          : [selectedRecord.선택부위 as BodyPart];
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setSelectedRecord(null)}>
            <div style={{ background:'#fff', borderRadius:'16px', padding:'28px', width:'600px', maxWidth:'92vw', maxHeight:'88vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                <div style={{ fontSize:'18px', fontWeight:800, color:'#111827' }}>기록 상세</div>
                <button onClick={() => setSelectedRecord(null)} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#6b7280' }}>✕</button>
              </div>
              <div style={{ marginBottom:'16px', display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={riskBadgeStyle(selectedRecord.위험도)}>{selectedRecord.위험도}</span>
                <span style={{ fontSize:'13px', color:'#6b7280' }}>종합 {selectedRecord.종합점수}점 · 체크리스트 {selectedRecord.체크리스트점수}점 · REBA {selectedRecord.REBA점수}점 · RULA {selectedRecord.RULA점수}점</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>
                {[{label:'성명',value:selectedRecord.성명},{label:'사번',value:selectedRecord.사번},{label:'소속',value:selectedRecord.소속},{label:'공정명',value:selectedRecord.공정명},{label:'검사일',value:selectedRecord.검사일},{label:'검사자',value:selectedRecord.검사자||'-'}].map(({ label, value }) => (
                  <div key={label} style={{ background:'#f9fafb', borderRadius:'10px', padding:'12px' }}>
                    <div style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, marginBottom:'4px' }}>{label}</div>
                    <div style={{ fontSize:'14px', fontWeight:700, color:'#111827' }}>{value||'-'}</div>
                  </div>
                ))}
              </div>
              {selectedRecord.작업내용 && (
                <div style={{ background:'#f9fafb', borderRadius:'10px', padding:'12px', marginBottom:'16px' }}>
                  <div style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, marginBottom:'6px' }}>작업내용</div>
                  <div style={{ fontSize:'14px', color:'#374151', lineHeight:1.7 }}>{selectedRecord.작업내용}</div>
                </div>
              )}
              {selectedRecord.사진 && (
  <div style={{ border:'1px solid #bfdbfe', borderRadius:'12px', overflow:'hidden', marginBottom:'16px' }}>
    <div style={{ padding:'10px 14px', background:'#f5f9ff', borderBottom:'1px solid #bfdbfe', fontSize:'12px', fontWeight:700, color:'#6b7280' }}>
      첨부 사진
    </div>
    <div style={{ padding:'12px', background:'#fff', textAlign:'center' }}>
      <img
        src={selectedRecord.사진}
        alt="작업 사진"
        style={{ maxWidth:'100%', maxHeight:'320px', borderRadius:'8px', objectFit:'contain' }}
      />
    </div>
  </div>
)}

              <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'16px', alignItems:'center', marginBottom:'16px', background:'#f9fafb', borderRadius:'12px', padding:'16px' }}>
                <div>
                  <div style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, marginBottom:'8px' }}>평가 부위</div>
                  <BodyFigure selectedBodyParts={부위목록} onSelect={() => {}} />
                </div>
                <div>
                  <div style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, marginBottom:'6px' }}>종합 평가 요약</div>
                  <div style={{ fontSize:'13px', color:'#374151', lineHeight:1.8 }}>{selectedRecord.위험도요약}</div>
                </div>
              </div>
              {selectedRecord.평가근거?.length > 0 && (
                <div style={{ border:'1px solid #e5e7eb', borderRadius:'12px', padding:'14px', marginBottom:'12px' }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'#111827', marginBottom:'8px' }}>평가 근거</div>
                  <ul style={{ margin:0, paddingLeft:'18px', color:'#374151', fontSize:'13px', lineHeight:1.8 }}>{selectedRecord.평가근거.map((item,i) => <li key={i}>{item}</li>)}</ul>
                </div>
              )}
              {selectedRecord.권장조치?.length > 0 && (
                <div style={{ border:'1px solid #e5e7eb', borderRadius:'12px', padding:'14px', marginBottom:'12px' }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'#111827', marginBottom:'8px' }}>권장 조치</div>
                  <ol style={{ margin:0, paddingLeft:'18px', color:'#374151', fontSize:'13px', lineHeight:1.8 }}>{selectedRecord.권장조치.map((item,i) => <li key={i}>{item}</li>)}</ol>
                </div>
              )}
              {selectedRecord.관리팁?.length > 0 && (
                <div style={{ border:'1px solid #e5e7eb', borderRadius:'12px', padding:'14px', marginBottom:'12px' }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'#111827', marginBottom:'8px' }}>부위별 관리 팁 ({부위목록.join(', ')})</div>
                  <ul style={{ margin:0, paddingLeft:'18px', color:'#374151', fontSize:'13px', lineHeight:1.8 }}>{selectedRecord.관리팁.map((tip,i) => <li key={i}>{tip}</li>)}</ul>
                </div>
              )}
              <div style={{ background:'#f9fafb', borderRadius:'10px', padding:'12px' }}>
                <div style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, marginBottom:'6px' }}>안내</div>
                <div style={{ fontSize:'12px', color:'#6b7280', lineHeight:1.8 }}>본 평가는 간이 체크리스트와 REBA/RULA 참고형 논리를 결합한 내부 참고용 스크리닝 결과입니다. 의료 진단이나 법적 판정 결과를 대체하지 않으며, 고위험 작업 또는 증상 지속 시 보건관리자 상담과 정밀 평가가 필요합니다.</div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
