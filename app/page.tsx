'use client';
import { useState, useEffect } from 'react';
import HealthCheckupPage from '@/app/components/HealthCheckupPage';
import HealthConsultationPage from '@/app/components/HealthConsultationPage';
import BogunsilPage from '@/app/components/BogunsilPage';
import MusculoskeletalPage from '@/app/components/MusculoskeletalPage';
import EmergencyPage from '@/app/components/EmergencyPage';
import FieldInspectionPage from '@/app/components/FieldInspectionPage';
import AccidentReportPage from '@/app/components/AccidentReportPage';
import MillpePublicPage from '@/app/components/MillpePublicPage';
import WorkEnvironmentPage from '@/app/components/WorkEnvironmentPage';
import HeatStressPage  from '@/app/components/HeatStressPage';

interface ScheduleItem { text: string; type: 'health' | 'safety' | 'both'; done?: boolean; }
interface MonthSchedule { month: string; items: ScheduleItem[]; }

const typeColor = (type: string) => {
  if (type === 'health') return '#f97316';
  if (type === 'safety') return '#1d4ed8';
  return '#7c3aed';
};

function getInitSchedule(): MonthSchedule[] {
  return [
    { month: '1월', items: [
      { text: '신규 채용자 건강진단', type: 'health' },
      { text: '상반기 특수건강진단 실시', type: 'health' },
      { text: '신규 화학물질 업데이트', type: 'health' },
      { text: '안전보건계획 이사회 보고', type: 'both' },
      { text: '중대재해처벌법 의무이행 점검', type: 'both' },
      { text: '보건실 상비약 정비', type: 'health' },
      { text: '전년도 작업환경측정 결과 보고', type: 'safety' },
    ]},
    { month: '2월', items: [
      { text: '신규 채용자 건강진단', type: 'health' },
      { text: '보건관리 연간계획 수립', type: 'health' },
      { text: '정기 안전보건교육 (1분기)', type: 'safety' },
    ]},
    { month: '3월', items: [
      { text: '신규 채용자 건강진단', type: 'health' },
      { text: '신규 화학물질 업데이트', type: 'health' },
      { text: '뇌심혈관질환 발병위험도 평가(간이검사)', type: 'both' },
      { text: '산업안전보건위원회 (화성1,2/평택1,2공장)', type: 'both' },
      { text: '상반기 작업환경측정 실시', type: 'safety' },
      { text: '신규입사자 안전보건교육 (심화)', type: 'safety' },
      { text: '감지기 검교정 (보일러)', type: 'safety' },
    ]},
    { month: '4월', items: [
      { text: '신규 채용자 건강진단', type: 'health' },
      { text: '상반기 헌혈행사', type: 'health' },
      { text: '근골격계 유해요인조사 (2025 실시 -> 2028 예정)', type: 'health' },
      { text: '정기 위험성평가 (화성/평택)', type: 'both' },
      { text: '감지기 검교정 (산소농도측정기)', type: 'safety' },
    ]},
    { month: '5월', items: [
      { text: '신규 채용자 건강진단', type: 'health' },
      { text: '신규 화학물질 업데이트', type: 'health' },
      { text: '건강증진프로그램 진행', type: 'health' },
      { text: '협력업체 안전보건수준평가 (상반기)', type: 'both' },
      { text: '밀폐공간 구조 훈련 (화성/평택)', type: 'safety' },
    ]},
    { month: '6월', items: [
      { text: '신규 채용자 건강진단', type: 'health' },
      { text: '하반기 특수건강진단 대상자 확인', type: 'health' },
      { text: '뇌심혈관질환 발병위험도 평가(간이검사)', type: 'both' },
      { text: '온열질환 예방대책 수립', type: 'health' },
      { text: '온열질환 자율점검표 운영 시작 (6-9월)', type: 'health' },
      { text: '산업안전보건위원회 (화성/판교)', type: 'both' },
      { text: '정기 안전보건교육 (2분기)', type: 'safety' },
      { text: '신규입사자 안전보건교육 (심화)', type: 'safety' },
      { text: '안전벨브 검사 (화성/평택)', type: 'safety' },
    ]},
    { month: '7월', items: [
      { text: '신규 채용자 건강진단', type: 'health' },
      { text: '신규 화학물질 업데이트', type: 'health' },
      { text: '하반기 특수건강진단/건강진단 실시', type: 'health' },
      { text: '직무스트레스 평가', type: 'health' },
      { text: '뇌심혈관질환 발병위험도 평가', type: 'both' },
      { text: '폭염 작업관리 점검', type: 'health' },
      { text: '상반기 보건관리 실적 정리', type: 'health' },
      { text: '중대재해처벌법 의무이행 점검 (상반기)', type: 'both' },
    ]},
    { month: '8월', items: [
      { text: '신규 채용자 건강진단', type: 'health' },
      { text: '하반기 작업환경측정 계획 수립', type: 'health' },
      { text: '정기 위험성평가 (판교)', type: 'safety' },
    ]},
    { month: '9월', items: [
      { text: '신규 채용자 건강진단', type: 'health' },
      { text: '신규 화학물질 업데이트', type: 'health' },
      { text: '뇌심혈관질환 발병위험도 평가(간이검사)', type: 'both' },
      { text: '온열질환 자율점검표 운영 종료', type: 'health' },
      { text: '건강진단 결과 확정', type: 'health' },
      { text: '하반기 작업환경측정 실시', type: 'safety' },
      { text: '정기 안전보건교육 (3분기)', type: 'safety' },
      { text: '산업안전보건위원회 (화성/판교)', type: 'both' },
      { text: '신규입사자 안전보건교육 (심화)', type: 'safety' },
      { text: '협력업체 안전보건수준평가 (하반기)', type: 'both' },
      { text: '밀폐공간 구조 훈련 (화성/평택)', type: 'safety' },
    ]},
    { month: '10월', items: [
      { text: '신규 채용자 건강진단', type: 'health' },
      { text: '하반기 헌혈행사', type: 'health' },
      { text: '사후관리 대상자 조치', type: 'health' },
    ]},
    { month: '11월', items: [
      { text: '신규 채용자 건강진단', type: 'health' },
      { text: '신규 화학물질 업데이트', type: 'health' },
      { text: '정기 안전보건교육 (4분기)', type: 'safety' },
      { text: '신규입사자 안전보건교육 (심화)', type: 'safety' },
      { text: '가스계 소화설비 비상대응 교육 및 훈련 (화성/평택)', type: 'safety' },
    ]},
    { month: '12월', items: [
      { text: '신규 채용자 건강진단', type: 'health' },
      { text: '하반기 특수건강진단 대상자 확인', type: 'health' },
      { text: '뇌심혈관질환 발병위험도 평가(간이검사)', type: 'both' },
      { text: '연간 보건관리 실적 보고', type: 'health' },
      { text: '다음연도 계획 수립', type: 'health' },
      { text: '산업안전보건위원회 (화성/판교)', type: 'both' },
      { text: '물류부서 중대산업재해 대응 훈련 (화성/평택)', type: 'safety' },
    ]},
  ];
}

export default function Home() {
  const curYear  = new Date().getFullYear();
  const curMonth = new Date().getMonth() + 1;

  const [activeMenu, setActiveMenu]             = useState('HOME');
  const [consultationView, setConsultationView] = useState('health-opinion-stats');
  const [editingMonth, setEditingMonth]         = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
const [loaded, setLoaded]   = useState(false); 
  const [dragSrc, setDragSrc]                   = useState<{ month: string; idx: number } | null>(null);
  const [dragOverIdx, setDragOverIdx]           = useState<number | null>(null);
  const [dragOver, setDragOver]                 = useState<string | null>(null);
  const [selectedYear, setSelectedYear]         = useState<number>(curYear);
  const [showMoreMonths, setShowMoreMonths]     = useState<Set<string>>(new Set());
  const [selectedConsultId, setSelectedConsultId] = useState<number | null>(null);
const [selectedConsultSa, setSelectedConsultSa] = useState<string>('');
const [now, setNow] = useState<Date | null>(null);

useEffect(() => {
  setNow(new Date());
  const timer = setInterval(() => setNow(new Date()), 1000); // 1초마다 갱신
  return () => clearInterval(timer);
}, []);

const formatDateTime = (date: Date) => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const y   = date.getFullYear();
  const m   = String(date.getMonth() + 1).padStart(2, '0');
  const d   = String(date.getDate()).padStart(2, '0');
  const day = days[date.getDay()];
  const h   = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');
  return `${y}.${m}.${d} (${day}) ${h}:${min}:${sec}`;
};
  const toggleShowMore = (month: string) => {
    setShowMoreMonths(prev => {
      const next = new Set(prev);
      next.has(month) ? next.delete(month) : next.add(month);
      return next;
    });
  };

  const [scheduleByYear, setScheduleByYear] = useState<Record<number, MonthSchedule[]>>(() => ({
    [curYear]: getInitSchedule(),
  }));

  const schedule = scheduleByYear[selectedYear] ?? getInitSchedule();
const openConsultFromBogunsil = (payload: { consultId: number; 사번: string }) => {
  setSelectedConsultId(payload.consultId);
  setSelectedConsultSa(payload.사번);
  setActiveMenu('건강상담');
  setConsultationView('default');
};
  const setSchedule = (updater: (prev: MonthSchedule[]) => MonthSchedule[]) => {
    setScheduleByYear(prev => {
      const cur = prev[selectedYear] ?? getInitSchedule();
      return { ...prev, [selectedYear]: updater(cur) };
    });
  };

  useEffect(() => {
  setMounted(true);
  try {
    const loaded: Record<number, MonthSchedule[]> = {};
    for (let y = curYear - 3; y <= curYear + 2; y++) {
      const raw = localStorage.getItem(`hc_schedule_${y}`);
      if (raw) loaded[y] = JSON.parse(raw);
    }
    if (Object.keys(loaded).length > 0) {
      setScheduleByYear(prev => ({ ...prev, ...loaded }));
    }
  } catch {}
  setLoaded(true);
}, []);



  useEffect(() => {
    if (!mounted) return;  //
    if (typeof window === 'undefined') return;
    Object.entries(scheduleByYear).forEach(([year, data]) => {
      localStorage.setItem(`hc_schedule_${year}`, JSON.stringify(data));
    });
  }, [scheduleByYear, mounted]); 

  const menuItems = ['HOME','연간 보건일정','사내안전사고 발생현황','현장점검','건강상담','건강진단','작업환경측정','근골격계','밀폐공간','보건실','응급처치','온열질환 체감온도','법정 보건업무','자료실'];

  const tools = [
    { title: 'MSDS 통합관리', badge: '웹앱', color: '#0369a1', bg: '#e0f2fe', desc: '사내 취급 화학물질과 물질안전보건자료를 통합 조회·관리합니다.', url: 'https://rms.cosmax.com/login/loginForm.do' },
    { title: '작업환경측정 관리보드', badge: '웹앱', color: '#0369a1', bg: '#e0f2fe', desc: '공정·물질별 측정 이력과 노출기준 대비 결과, 다음 측정 시기를 관리합니다.', action: 'work-environment' },
    { title: '사내안전사고 발생현황', badge: '대시보드', color: '#1e40af', bg: '#dbeafe', desc: '재해 발생 현황과 추이를 한눈에 봅니다. 원인 분석과 재발방지 대책 관리에 사용합니다.', action: 'accident' },
    { title: '건강진단 사후관리', badge: '웹앱', color: '#0369a1', bg: '#e0f2fe', desc: '검진 결과 판정별 사후관리 조치와 이행 상황을 관리합니다.', action: 'health-opinion-stats' },
    { title: '건강관리실 일지', badge: '웹앱', color: '#0369a1', bg: '#e0f2fe', desc: '보건실 이용 기록, 응급처치·건강상담·혈압 측정 등 방문 내역을 남깁니다.', action: 'health-consultation' },
    { title: '근골격계 유해요인조사표', badge: '웹앱', color: '#0369a1', bg: '#e0f2fe', desc: '부담작업 공정별 유해요인조사 입력. 3년 주기 정기조사·수시조사에 사용합니다.' },
   { title: '근골격계 증상조사표', badge: '웹앱', color: '#0369a1', bg: '#e0f2fe', desc: '근로자 자각증상 조사 응답 원본. 유해요인조사와 짝으로 실시하고 부서별로 집계합니다.', action: 'musculoskeletal' },

    { title: '뇌심혈관질환 발병위험도평가', badge: '웹앱', color: '#0369a1', bg: '#e0f2fe', desc: 'KOSAH guide' },
    { title: '온열질환 예방 자율점검표', badge: '웹앱 · 6~9월', color: '#0369a1', bg: '#e0f2fe', desc: '체감온도 31°C 이상 폭염 작업 시 조치 이행 여부 점검. 6월~9월 상시 운영합니다.', action: 'heat-stress' },
  ];

  const updateItem = (month: string, idx: number, text: string) => {
    setSchedule(prev => prev.map(s =>
      s.month === month ? { ...s, items: s.items.map((item, i) => i === idx ? { ...item, text } : item) } : s
    ));
  };

  // ★ 핵심 수정: draggable 간섭 차단
  const toggleType = (month: string, idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSchedule(prev => prev.map(s => {
      if (s.month !== month) return s;
      return {
        ...s,
        items: s.items.map((item, i) => {
          if (i !== idx) return item;
          const nextType: 'health' | 'safety' | 'both' =
            item.type === 'health' ? 'safety' : item.type === 'safety' ? 'both' : 'health';
          return { ...item, type: nextType };
        }),
      };
    }));
  };

  const deleteItem = (month: string, idx: number) => {
    setSchedule(prev => prev.map(s =>
      s.month === month ? { ...s, items: s.items.filter((_, i) => i !== idx) } : s
    ));
  };

  const toggleDone = (month: string, idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSchedule(prev => prev.map(s => {
      if (s.month !== month) return s;
      const items = s.items.map((item, i) =>
        i === idx ? { ...item, done: !item.done } : item
      );
      const notDone = items.filter(i => !i.done);
      const done    = items.filter(i =>  i.done);
      return { ...s, items: [...notDone, ...done] };
    }));
  };

  const addItem = (month: string, type: 'health' | 'safety' | 'both') => {
    setSchedule(prev => prev.map(s =>
      s.month === month ? { ...s, items: [...s.items, { text: '', type }] } : s
    ));
  };

  const handleDragStart = (month: string, idx: number) => setDragSrc({ month, idx });
  const handleDragOver  = (e: React.DragEvent, month: string) => { e.preventDefault(); setDragOver(month); };
  const handleDragEnd   = () => { setDragSrc(null); setDragOver(null); };

  const handleDrop = (e: React.DragEvent, targetMonth: string) => {
    e.preventDefault();
    if (!dragSrc || dragSrc.month === targetMonth) return;
    setSchedule(prev => {
      const next = prev.map(s => ({ ...s, items: [...s.items] }));
      const src  = next.find(s => s.month === dragSrc.month);
      const tgt  = next.find(s => s.month === targetMonth);
      if (!src || !tgt) return prev;
      const [moved] = src.items.splice(dragSrc.idx, 1);
      tgt.items.push(moved);
      return next;
    });
    setDragSrc(null); setDragOver(null); setDragOverIdx(null);
  };

  const handleDropOnItem = (e: React.DragEvent, targetMonth: string, targetIdx: number) => {
    e.preventDefault(); e.stopPropagation();
    if (!dragSrc) return;
    if (dragSrc.month === targetMonth) {
      if (dragSrc.idx !== targetIdx) {
        setSchedule(prev => prev.map(s => {
          if (s.month !== targetMonth) return s;
          const items = [...s.items];
          const [moved] = items.splice(dragSrc.idx, 1);
          items.splice(targetIdx, 0, moved);
          return { ...s, items };
        }));
      }
    } else {
      setSchedule(prev => {
        const next = prev.map(s => ({ ...s, items: [...s.items] }));
        const src  = next.find(s => s.month === dragSrc.month);
        const tgt  = next.find(s => s.month === targetMonth);
        if (!src || !tgt) return prev;
        const [moved] = src.items.splice(dragSrc.idx, 1);
        tgt.items.splice(targetIdx, 0, moved);
        return next;
      });
    }
    setDragSrc(null); setDragOver(null); setDragOverIdx(null);
  };

  const availableYears = [...new Set([...Object.keys(scheduleByYear).map(Number), curYear])].sort((a, b) => a - b);

  const renderContent = () => {
    if (activeMenu === 'HOME') {
      const yearSchedule  = scheduleByYear[curYear] ?? getInitSchedule();
      const curMonthItems = yearSchedule.find(s => s.month === `${curMonth}월`)?.items ?? [];
      const today = new Date();
      const upcomingItems = yearSchedule
        .filter(s => parseInt(s.month) > curMonth)
        .slice(0, 3)
        .map(s => {
          const m = parseInt(s.month);
          const firstDay = new Date(curYear, m - 1, 1);
          const diffDays = Math.ceil((firstDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return {
            label:  diffDays <= 90 ? `D-${diffDays}` : `+${m - curMonth}개월`,
            title:  s.items[0]?.text ?? '(항목 없음)',
            date:   `${curYear}.${String(m).padStart(2, '0')}`,
            urgent: diffDays <= 60,
            count:  s.items.length,
          };
        });

      return (
        <div style={{padding:'28px 32px'}}>
          <div style={{border:'1px solid #e5e7eb',borderRadius:'12px',padding:'24px',marginBottom:'28px',display:'flex',gap:'32px'}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
                <span style={{background:'#e0f2fe',color:'#0369a1',fontSize:'11px',padding:'3px 10px',borderRadius:'12px',fontWeight:'600'}}>{curYear}년 {curMonth}월</span>
                <h2 style={{fontSize:'20px',fontWeight:'700',color:'#111827',margin:0}}>{curMonth}월 보건업무</h2>
              </div>
              {curMonthItems.length === 0 ? (
                <div style={{fontSize:'13px',color:'#9ca3af'}}>이번 달 등록된 일정이 없습니다.</div>
              ) : (
                curMonthItems.map((item, i) => (
                  <div key={i} style={{display:'flex',gap:'8px',marginBottom:'8px',fontSize:'14px',color:'#374151'}}>
                    <span style={{color: typeColor(item.type), fontSize:'16px', lineHeight:1.1, flexShrink:0}}>{'●'}</span>
                    {item.text}
                  </div>
                ))
              )}
            </div>
            <div style={{minWidth:'220px'}}>
              <div style={{fontSize:'12px',color:'#9ca3af',marginBottom:'10px'}}>다음 주요 일정</div>
              {upcomingItems.length === 0 ? (
                <div style={{fontSize:'13px',color:'#9ca3af'}}>다음 일정이 없습니다.</div>
              ) : (
                upcomingItems.map((s, i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',background:s.urgent?'#fef2f2':'#f0f9ff',borderRadius:'8px',border:`1px solid ${s.urgent?'#fecaca':'#bae6fd'}`,marginBottom:'8px'}}>
                    <span style={{fontSize:'14px',fontWeight:'700',color:s.urgent?'#ef4444':'#0284c7',minWidth:'52px'}}>{s.label}</span>
                    <div>
                      <div style={{fontSize:'13px',fontWeight:'600',color:'#111827'}}>{s.title}</div>
                      <div style={{fontSize:'11px',color:'#9ca3af'}}>
                        {s.date}{s.count > 1 && ` 외 ${s.count - 1}건`}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
              <span style={{background:'#f3f4f6',color:'#6b7280',fontSize:'11px',fontWeight:'700',padding:'2px 8px',borderRadius:'4px'}}>01</span>
              <h2 style={{fontSize:'20px',fontWeight:'700',color:'#111827',margin:0}}>사내 웹앱</h2>
            </div>
            <p style={{fontSize:'13px',color:'#6b7280',marginBottom:'18px',lineHeight:1.6}}>공장지원팀에서 운영 중인 조사·평가 웹앱입니다.</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'14px'}}>
              {tools.map((tool) => (
                <div key={tool.title}
                  onClick={() => {
  if (tool.action === 'health-opinion-stats') { setActiveMenu('건강상담'); setConsultationView('health-opinion-stats'); return; }
  if (tool.action === 'health-consultation') { setActiveMenu('건강상담'); setConsultationView('default'); return; }
  if (tool.action === 'accident') { setActiveMenu('사내안전사고 발생현황'); return; }
  if (tool.action === 'musculoskeletal') { setActiveMenu('근골격계'); return; }
  if (tool.action === 'work-environment') { setActiveMenu('작업환경측정'); return; }  // ✨ 추가
 if (tool.action === 'heat-stress')      { setActiveMenu('온열질환 체감온도'); return; }
  if (tool.url) window.open(tool.url, '_blank');
}}
                  style={{border:'1px solid #e5e7eb',borderRadius:'10px',padding:'18px',cursor:(tool.url||tool.action)?'pointer':'default'}}
                >
                  <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:'8px',marginBottom:'8px'}}>
                    <span style={{fontSize:'14px',fontWeight:'600',color:'#111827'}}>{tool.title}</span>
                    <span style={{fontSize:'10px',padding:'2px 7px',borderRadius:'4px',background:tool.bg,color:tool.color,whiteSpace:'nowrap'}}>{tool.badge}</span>
                  </div>
                  <p style={{fontSize:'12px',color:'#6b7280',lineHeight:1.6,margin:'0 0 12px'}}>{tool.desc}</p>
                  <div style={{fontSize:'12px',color:'#0284c7',fontWeight:'500'}}>{(tool.url||tool.action)?'열기 →':'준비 중'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeMenu === '연간 보건일정') {
      const displaySchedule = selectedYear === curYear
        ? [
            ...schedule.filter(s => parseInt(s.month) >= curMonth),
            ...schedule.filter(s => parseInt(s.month) <  curMonth),
          ]
        : schedule;

      return (
        <div style={{padding:'28px 32px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
            <span style={{background:'#f3f4f6',color:'#6b7280',fontSize:'11px',fontWeight:'700',padding:'2px 8px',borderRadius:'4px'}}>02</span>
            <h2 style={{fontSize:'20px',fontWeight:'700',color:'#111827',margin:0}}>연간 보건일정</h2>
          </div>
          <p style={{fontSize:'13px',color:'#6b7280',marginBottom:'14px'}}>연간 보건관리·안전 주요 일정입니다.</p>

          {/* 연도 탭 */}
          <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'16px',flexWrap:'wrap'}}>
            {availableYears.map(y => (
              <button key={y} onClick={() => setSelectedYear(y)} style={{
                padding:'5px 14px', borderRadius:'6px', fontSize:'13px', cursor:'pointer',
                border:     selectedYear === y ? '1px solid #0284c7' : '1px solid #e5e7eb',
                background: selectedYear === y ? '#e0f2fe' : '#fff',
                color:      selectedYear === y ? '#0369a1' : '#6b7280',
                fontWeight: selectedYear === y ? 700 : 400,
              }}>
                {y}년
                {y === curYear && <span style={{marginLeft:'4px',fontSize:'10px',color:'#0369a1'}}>{'●'}</span>}
              </button>
            ))}
            <button
              onClick={() => {
                const input = window.prompt('추가할 연도를 입력하세요 (예: 2027)');
                if (!input) return;
                const y = parseInt(input);
                if (isNaN(y) || y < 2020 || y > 2040) { alert('올바른 연도를 입력하세요.'); return; }
                if (!scheduleByYear[y]) setScheduleByYear(prev => ({ ...prev, [y]: getInitSchedule() }));
                setSelectedYear(y);
              }}
              style={{padding:'5px 12px',borderRadius:'6px',border:'1px dashed #d1d5db',background:'#fff',color:'#9ca3af',fontSize:'13px',cursor:'pointer'}}
            >+ 연도 추가</button>
          </div>

          {/* 범례 */}
          <div style={{display:'flex',gap:'16px',marginBottom:'20px',fontSize:'12px',color:'#6b7280',alignItems:'center',flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:'5px'}}><span style={{color:'#f97316',fontSize:'14px'}}>{'●'}</span> 보건</div>
            <div style={{display:'flex',alignItems:'center',gap:'5px'}}><span style={{color:'#1d4ed8',fontSize:'14px'}}>{'●'}</span> 안전</div>
            <div style={{display:'flex',alignItems:'center',gap:'5px'}}><span style={{color:'#7c3aed',fontSize:'14px'}}>{'●'}</span> 보건+안전</div>
            <span style={{fontSize:'11px',color:'#9ca3af'}}>
              {'· 편집 모드: 색상점 클릭 → 유형 전환 / 드래그 → 월 이동 · 보기 모드: ✓ 클릭 → 완료 처리'}
              {selectedYear === curYear && ' · 지난달은 뒤쪽에 표시'}
            </span>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:'14px'}}>
            {displaySchedule.map((s) => {
              const isEditing = editingMonth === s.month;
              const monthNum  = parseInt(s.month);
              const isPast    = selectedYear === curYear && monthNum < curMonth;
              const isCurrent = selectedYear === curYear && monthNum === curMonth;

              return (
                <div key={s.month}
                  onDragOver={e => handleDragOver(e, s.month)}
                  onDrop={e => handleDrop(e, s.month)}
                  onDragLeave={() => setDragOver(null)}
                  style={{
                    border: dragOver === s.month ? '2px solid #0284c7'
                      : isCurrent ? '1px solid #bae6fd'
                      : isPast    ? '1px solid #f0f0f0'
                      : isEditing ? '1px solid #bae6fd'
                      : '1px solid #e5e7eb',
                    borderRadius: '10px', padding: '16px',
                    background: dragOver === s.month ? '#e0f2fe'
                      : isPast    ? '#fafafa'
                      : isCurrent ? '#f0f9ff'
                      : isEditing ? '#f0f9ff' : '#fff',
                    opacity: isPast ? 0.72 : 1,
                    transition: 'border 0.15s, background 0.15s',
                  }}
                >
                  {/* 카드 헤더 */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <span style={{fontSize:'15px',fontWeight:'700',
                        color: isCurrent ? '#1d4ed8' : isPast ? '#9ca3af' : '#0369a1'}}>
                        {s.month}
                      </span>
                      {isCurrent && (
                        <span style={{fontSize:'10px',background:'#dbeafe',color:'#1d4ed8',padding:'1px 6px',borderRadius:'4px',fontWeight:600}}>이번달</span>
                      )}
                      {isPast && (
                        <span style={{fontSize:'10px',color:'#9ca3af',background:'#f3f4f6',padding:'1px 5px',borderRadius:'3px'}}>지난달</span>
                      )}
                    </div>
                    <button onClick={() => setEditingMonth(isEditing ? null : s.month)} style={{
                      fontSize:'11px', padding:'2px 10px', borderRadius:'4px', cursor:'pointer',
                      border:     isEditing ? '1px solid #86efac' : '1px solid #e5e7eb',
                      background: isEditing ? '#f0fdf4' : '#f9fafb',
                      color:      isEditing ? '#16a34a' : '#6b7280',
                      fontWeight: isEditing ? 700 : 400,
                    }}>
                      {isEditing ? '✓ 완료' : '편집'}
                    </button>
                  </div>

                  {/* ★ 편집 모드 */}
                  {isEditing ? (
                    <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                      {s.items.map((item, idx) => (
                        <div key={`edit-${s.month}-${idx}`} draggable
                          onDragStart={(e) => { e.stopPropagation(); handleDragStart(s.month, idx); }}
                          onDragEnd={handleDragEnd}
                          style={{display:'flex',alignItems:'center',gap:'5px',cursor:'grab',
                            opacity: dragSrc?.month===s.month && dragSrc?.idx===idx ? 0.4 : 1}}
                        >
                          {/* ★ 색상 토글 버튼 — draggable={false} + onMouseDown 차단 */}
                          <button
                            draggable={false}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => toggleType(s.month, idx, e)}
                            title="클릭 → 유형 전환 (보건→안전→보건+안전)"
                            style={{
                              width:'14px', height:'14px', borderRadius:'50%', border:'none',
                              cursor:'pointer', flexShrink:0,
                              background: item.done ? '#d1d5db' : typeColor(item.type),
                            }}
                          />
                          <input value={item.text} onChange={e => updateItem(s.month, idx, e.target.value)}
                            style={{flex:1,fontSize:'12px',padding:'4px 7px',border:'1px solid #d1d5db',
                              borderRadius:'5px',outline:'none',background:'#fff',color:'#111827',
                              textDecoration: item.done ? 'line-through' : 'none'}} />
                          {/* 완료 버튼 */}
                          <button
                            draggable={false}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => toggleDone(s.month, idx, e)}
                            title={item.done ? '완료 취소' : '완료 처리'}
                            style={{
                              flexShrink:0, width:'18px', height:'18px', borderRadius:'50%',
                              border:`1.5px solid ${item.done ? '#16a34a' : '#d1d5db'}`,
                              background: item.done ? '#16a34a' : '#fff',
                              color: item.done ? '#fff' : '#d1d5db',
                              cursor:'pointer', fontSize:'11px',
                              display:'flex', alignItems:'center', justifyContent:'center', padding:0,
                            }}
                          >{'✓'}</button>
                          {/* 삭제 버튼 */}
                          <button
                            draggable={false}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); deleteItem(s.month, idx); }}
                            style={{
                              width:'18px', height:'18px', borderRadius:'50%', border:'none',
                              background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:'13px',
                              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, padding:0,
                            }}
                          >{'×'}</button>
                        </div>
                      ))}
                      <div style={{display:'flex',gap:'4px',marginTop:'6px'}}>
                        <button onClick={() => addItem(s.month, 'health')}
                          style={{flex:1,padding:'5px',border:'1px dashed #fed7aa',borderRadius:'6px',background:'transparent',fontSize:'11px',color:'#f97316',cursor:'pointer'}}>+ 보건</button>
                        <button onClick={() => addItem(s.month, 'safety')}
                          style={{flex:1,padding:'5px',border:'1px dashed #93c5fd',borderRadius:'6px',background:'transparent',fontSize:'11px',color:'#1d4ed8',cursor:'pointer'}}>+ 안전</button>
                        <button onClick={() => addItem(s.month, 'both')}
                          style={{flex:1,padding:'5px',border:'1px dashed #c4b5fd',borderRadius:'6px',background:'transparent',fontSize:'11px',color:'#7c3aed',cursor:'pointer'}}>+ 둘 다</button>
                      </div>
                    </div>
                  ) : (
                    /* ★ 보기 모드 */
                    <div>
                      {s.items.length === 0 ? (
                        <div style={{fontSize:'12px',color:'#9ca3af',fontStyle:'italic'}}>항목 없음</div>
                      ) : (
                        <>
                          {(showMoreMonths.has(s.month) ? s.items : s.items.slice(0, 5)).map((item) => {
                            const actualIdx = s.items.indexOf(item);
                            return (
                              <div key={`view-${s.month}-${actualIdx}`} draggable
                                onDragStart={() => handleDragStart(s.month, actualIdx)}
                                onDragEnd={handleDragEnd}
                                onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverIdx(actualIdx); }}
                                onDrop={e => handleDropOnItem(e, s.month, actualIdx)}
                                style={{
                                  display:'flex', alignItems:'center', gap:'6px',
                                  fontSize:'12px',
                                  color: item.done ? '#9ca3af' : isPast ? '#9ca3af' : '#374151',
                                  marginBottom:'6px', lineHeight:1.5, cursor:'grab',
                                  opacity: dragSrc?.month===s.month && dragSrc?.idx===actualIdx ? 0.4 : 1,
                                  borderTop: dragSrc && dragOverIdx===actualIdx && !(dragSrc.month===s.month && dragSrc.idx===actualIdx)
                                    ? '2px solid #0284c7' : '2px solid transparent',
                                  paddingTop:'2px',
                                }}
                              >
                                <span style={{
                                  color: item.done ? '#d1d5db' : typeColor(item.type),
                                  flexShrink:0, marginTop:'1px',
                                }}>{'●'}</span>
                                <span style={{
                                  flex:1,
                                  textDecoration: item.done ? 'line-through' : 'none',
                                  color: item.done ? '#9ca3af' : 'inherit',
                                }}>
                                  {item.text}
                                </span>
                                {/* ★ 보기 모드 완료 버튼 */}
                                <button
                                  onClick={e => toggleDone(s.month, actualIdx, e)}
                                  title={item.done ? '완료 취소' : '완료 처리'}
                                  style={{
                                    flexShrink:0, width:'16px', height:'16px', borderRadius:'50%',
                                    border:`1.5px solid ${item.done ? '#16a34a' : '#d1d5db'}`,
                                    background: item.done ? '#16a34a' : '#fff',
                                    color: item.done ? '#fff' : '#d1d5db',
                                    cursor:'pointer', fontSize:'10px',
                                    display:'flex', alignItems:'center', justifyContent:'center', padding:0,
                                  }}
                                >{'✓'}</button>
                              </div>
                            );
                          })}
                          {s.items.length > 5 && (
                            <button onClick={() => toggleShowMore(s.month)} style={{
                              marginTop:'4px', background:'none', border:'none',
                              cursor:'pointer', fontSize:'12px', color:'#9ca3af', padding:'2px 0',
                            }}>
                              {showMoreMonths.has(s.month) ? '▲ 접기' : `▼ 더보기 +${s.items.length - 5}개`}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (activeMenu === '사내안전사고 발생현황') return <AccidentReportPage />;
if (activeMenu === '건강진단')  return <HealthCheckupPage />;
    if (activeMenu === '건강상담') {
  return (
    <HealthConsultationPage
      view={consultationView}
      selectedConsultId={selectedConsultId}
      selectedConsultSa={selectedConsultSa}
    />
  );
}
  
    if (activeMenu === '작업환경측정') return <WorkEnvironmentPage />;
    if (activeMenu === '근골격계')  return <MusculoskeletalPage />;
    if (activeMenu === '응급처치')  return <EmergencyPage />;
    if (activeMenu === '현장점검')  return <FieldInspectionPage />;
    if (activeMenu === '보건실') {
  return <BogunsilPage onOpenConsult={openConsultFromBogunsil} />;
}
if (activeMenu === '온열질환 체감온도') return <HeatStressPage />;
    if (activeMenu === '밀폐공간')  return <MillpePublicPage />;

    return (
      <div style={{padding:'28px 32px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'24px'}}>
          <h2 style={{fontSize:'20px',fontWeight:'700',color:'#111827',margin:0}}>{activeMenu}</h2>
        </div>
        <div style={{border:'1px solid #e5e7eb',borderRadius:'12px',padding:'48px',textAlign:'center'}}>
          <div style={{fontSize:'32px',marginBottom:'12px'}}>🚧</div>
          <div style={{fontSize:'16px',fontWeight:'600',color:'#374151',marginBottom:'8px'}}>준비 중입니다</div>
          <div style={{fontSize:'13px',color:'#9ca3af'}}>{activeMenu} 페이지는 곧 추가될 예정입니다.</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{display:'flex',minHeight:'100vh',fontFamily:'Pretendard,-apple-system,sans-serif',background:'#fff'}}>
      <aside style={{width:'200px',minHeight:'100vh',background:'#f0f9ff',borderRight:'1px solid #e5e7eb',padding:'24px 0',display:'flex',flexDirection:'column',position:'fixed',left:0,top:0,bottom:0}}>
        <div style={{padding:'16px 20px 12px'}}>
          <img src="/Cosmax_Horizontal_Logo_Black_Red_RGB.png" alt="COSMAX" style={{width:'130px',marginBottom:'16px',display:'block'}} />
        </div>
        <div style={{padding:'0 20px 20px'}}>
          <div style={{fontSize:'10px',color:'#9ca3af',letterSpacing:'0.1em',marginBottom:'6px'}}>OCCUPATIONAL HEALTH</div>
          <div style={{fontSize:'17px',fontWeight:'700',color:'#111827',lineHeight:1.3}}>사내 보건관리 허브</div>
          <div style={{fontSize:'12px',color:'#6b7280',marginTop:'4px'}}>· 공장지원팀</div>
        </div>
        <nav style={{flex:1}}>
          {menuItems.map((item) => {
            const isActive = mounted && activeMenu === item;
            return (
              <button key={item}
                onClick={() => {
                  setActiveMenu(item);
                  setConsultationView(item==='건강상담' ? 'health-opinion-stats' : 'default');
                }}
                style={{
                  width:'100%', textAlign:'left', padding:'9px 20px',
                  background: isActive ? '#e0f2fe' : 'transparent',
                  color:      isActive ? '#0369a1' : '#374151',
                  borderLeft: isActive ? '3px solid #0284c7' : '3px solid transparent',
                  borderTop:'none', borderRight:'none', borderBottom:'none',
                  cursor:'pointer', fontSize:'13px', fontWeight: isActive ? 600 : 400,
                }}
              >{item}</button>
            );
          })}
        </nav>
        <div style={{padding:'16px 20px',fontSize:'10px',color:'#9ca3af',lineHeight:1.6}}>
          본 페이지의 법령 내용은 실무 참고용 정리입니다. 시행 시점의 개정 법령 원문을 확인한 뒤 적용하세요.
        </div>
      </aside>

      <main style={{marginLeft:'200px',flex:1,minWidth:0}}>
        <div style={{padding:'14px 32px',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',gap:'16px',background:'#fff',position:'sticky',top:0,zIndex:10}}>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:'8px',padding:'10px 16px'}}>
            <input placeholder="MSDS, 특수건강진단, 부담작업, 응급처치... 검색" style={{border:'none',background:'transparent',outline:'none',fontSize:'14px',color:'#374151',flex:1}} />
          </div>
          <div style={{fontSize:'13px',color:'#6b7280',whiteSpace:'nowrap'}}>
  {now ? formatDateTime(now) : ''}
</div>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}
