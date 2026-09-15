'use client';

import React, { useMemo, useState } from 'react';

type UrgencyType = '응급' | '비응급';

type EmergencyGuide = {
  id: string;
  symptom: string;
  urgency: UrgencyType;
  condition: string;
  summary: string;
  immediateActions: string[];
  dontDos: string[];
  contact: string;
  hospital: string;
  notes?: string[];
  image?: string;
  imageAlt?: string;
  source: string;
};

const EMERGENCY_DB: EmergencyGuide[] = [
  {
    id: 'unconscious-emergency',
    symptom: '의식 소실',
    urgency: '응급',
    condition: '혼수 또는 반응 없음',
    summary: '의식 소실은 기도 폐쇄와 호흡·순환 정지 위험이 있어 즉시 응급 대응이 필요합니다.',
    immediateActions: [
      '즉시 119에 신고합니다.',
      '환자를 평평한 곳에 눕히고 주변 위험요소를 제거합니다.',
      '머리기울임-턱 들어올리기 방법으로 기도를 확보합니다.',
      '호흡과 맥박 유무를 확인합니다.',
      '호흡과 맥박이 없으면 즉시 심폐소생술을 시행합니다.',
      '호흡이 있으면 회복자세를 취하게 합니다.',
    ],
    dontDos: [
      '의식을 잃은 환자에게 물이나 음식을 먹이지 않습니다.',
      '상태 확인 없이 억지로 일으켜 세우지 않습니다.',
    ],
    contact: '119 신고와 동시에 보건관리자에게 즉시 연락하여 의식, 호흡, 맥박 상태를 알립니다.',
    hospital: '119 신고 후 즉시 응급 이송이 필요합니다.',
    notes: [
      '호흡이 있으면 회복자세를 유지하면서 상태를 관찰합니다.',
      '구토물 흡인과 기도 폐쇄를 계속 주의합니다.',
    ],
    image: 'emergency/recovery-position.png',
    imageAlt: '회복자세 예시',
    source: '[최종본]응급환자 매뉴얼 (제2판)최종.pdf page 1',
  },
  {
    id: 'fainting-nonemergency',
    symptom: '실신',
    urgency: '비응급',
    condition: '짧은 시간 의식 소실 후 회복',
    summary: '실신은 일시적 뇌혈류 감소로 발생할 수 있으며, 회복 후에도 원인 확인이 필요합니다.',
    immediateActions: [
      '환자를 눕히고 다리를 올려주는 쇼크 자세를 취합니다.',
      '목, 가슴, 허리 부위의 조이는 옷을 풀어줍니다.',
      '의식이 돌아오면 안심시키고 천천히 상태를 확인합니다.',
      '완전히 회복되기 전까지는 눕힌 상태를 유지합니다.',
    ],
    dontDos: [
      '회복 전 물이나 음식을 먹이지 않습니다.',
      '갑자기 일으켜 세우지 않습니다.',
    ],
    contact: '보건관리자에게 즉시 연락하여 실신 시점과 회복 여부를 알립니다.',
    hospital: '의식 회복 후에도 병원 방문이 권장됩니다.',
    image: '/emergency/fainting.png',
    imageAlt: '실신 환자 자세',
    source: '[최종본]응급환자 매뉴얼 (제2판)최종.pdf page 1',
  },
  {
    id: 'aed-emergency',
    symptom: '심정지/AED',
    urgency: '응급',
    condition: '호흡·맥박 없음 또는 심정지 의심',
    summary: '심정지 의심 시 심폐소생술과 AED 사용이 즉시 필요합니다.',
    immediateActions: [
      '즉시 119에 신고합니다.',
      '주변에 AED를 요청합니다.',
      '심폐소생술을 시작합니다.',
      'AED 전원을 켭니다.',
      '패드 두 개를 오른쪽 쇄골 아래와 왼쪽 젖꼭지 아래 중간 겨드랑선에 부착합니다.',
      '심장리듬 분석 중에는 환자에게 손대지 않습니다.',
      '제세동 필요 안내가 나오면 주변 접촉이 없는지 확인 후 제세동 버튼을 누릅니다.',
      '제세동 후 즉시 심폐소생술을 다시 시작합니다.',
    ],
    dontDos: [
      '리듬 분석 중 환자를 만지지 않습니다.',
      '제세동 후 가만히 기다리지 않습니다.',
    ],
    contact: '119 신고와 동시에 AED 요청 및 보건관리자 연락을 진행합니다.',
    hospital: '즉시 응급 대응 및 이송이 필요합니다.',
    image: '/emergency/aed.png',
    imageAlt: 'AED 사용 그림',
    source: '[최종본]응급환자 매뉴얼 (제2판)최종.pdf page 1',
  },
  {
    id: 'fracture-nonemergency',
    symptom: '골절',
    urgency: '비응급',
    condition: '경미 골절 또는 미세골절 의심',
    summary: '변형이 크지 않은 골절도 고정 후 진료가 필요합니다.',
    immediateActions: [
      '안전한 장소로 이동합니다.',
      '보건관리자에게 연락합니다.',
      '손상 부위를 확인하고 움직이지 않게 고정합니다.',
      '병원 진료를 진행합니다.',
    ],
    dontDos: [
      '뼈를 맞추려고 억지로 당기거나 비틀지 않습니다.',
    ],
    contact: '보건관리자에게 부위와 통증 정도를 알립니다.',
    hospital: '골절 의심 시 병원 진료가 필요합니다.',
    image: '/emergency/fracture.png',
    imageAlt: '골절 고정 그림',
    source: '응급처치 기준표',
  },
  {
    id: 'fracture-emergency',
    symptom: '골절',
    urgency: '응급',
    condition: '다발성골절, 분쇄골절, 개방성골절',
    summary: '중증 골절은 대량출혈과 조직 손상 위험이 있어 즉시 이송이 필요합니다.',
    immediateActions: [
      '즉시 119에 신고합니다.',
      '보건관리자에게 연락합니다.',
      '골절 부위를 원상복구하려 하지 않습니다.',
      '가능하면 부목으로 움직이지 않게 고정합니다.',
    ],
    dontDos: [
      '노출된 뼈를 밀어 넣지 않습니다.',
      '무리하게 환자를 걷게 하지 않습니다.',
    ],
    contact: '보건관리자에게 출혈과 변형 여부를 즉시 알립니다.',
    hospital: '119 신고 후 응급 이송이 필요합니다.',
    image: '/emergency/fracture.png',
    imageAlt: '손가락 골절 고정 그림',
    source: '응급처치 기준표',
  },
  {
    id: 'amputation-emergency',
    symptom: '절단',
    urgency: '응급',
    condition: '손가락 또는 신체 일부 절단',
    summary: '절단은 즉시 119 신고가 필요한 응급상황이며, 출혈 조절과 절단 부위 보존이 중요합니다.',
    immediateActions: [
      '즉시 119에 신고하고 절단 부위를 눌러 지혈합니다.',
      '절단된 부위를 깨끗한 거즈로 감쌉니다.',
      '비닐 주머니에 넣어 밀봉합니다.',
      '밀봉한 절단물을 얼음이 있는 봉투에 2차 밀봉합니다.',
      '보건관리자에게 즉시 연락합니다.',
    ],
    dontDos: [
      '절단 부위를 세척하지 않습니다.',
      '절단물을 얼음물에 직접 닿게 하지 않습니다.',
    ],
    contact: '보건관리자에게 절단 부위와 출혈 정도를 즉시 알립니다.',
    hospital: '119 신고 후 즉시 응급실 이송이 필요합니다.',
    image: '/emergency/amputation.png',
    imageAlt: '절단물 보존 그림',
    source: '응급처치카드.pptx slide 5',
  },
  {
    id: 'burn-nonemergency',
    symptom: '화상',
    urgency: '비응급',
    condition: '가벼운 화상 또는 국소 범위 화상',
    summary: '가벼운 화상은 빠른 냉각과 수포 보호가 중요합니다.',
    immediateActions: [
      '즉시 흐르는 찬물로 15~30분 동안 환부를 식힙니다.',
      '원인 물체에서 떨어지고 환부를 안정시킵니다.',
      '필요 시 화상연고를 바르고 거즈로 감쌉니다.',
      '보건관리자에게 연락합니다.',
    ],
    dontDos: [
      '물집을 터뜨리지 않습니다.',
      '환부를 문지르지 않습니다.',
    ],
    contact: '보건관리자에게 화상 범위와 물집 여부를 알립니다.',
    hospital: '물집이 생기거나 범위가 크면 병원 방문이 필요합니다.',
    image: '/emergency/burn.png',
    imageAlt: '가벼운 화상 그림',
    source: '응급처치카드.pptx slide 5',
  },
  {
    id: 'burn-emergency',
    symptom: '화상',
    urgency: '응급',
    condition: '넓은 부위 화상, 중증 화상, 3도화상 의심',
    summary: '넓은 범위 또는 깊은 화상은 쇼크와 감염 위험이 커 즉시 이송이 필요합니다.',
    immediateActions: [
      '원인 물체에서 즉시 떨어집니다.',
      '즉시 119에 신고합니다.',
      '환부가 쓸리거나 마찰되지 않도록 보호합니다.',
      '보건관리자에게 즉시 연락합니다.',
    ],
    dontDos: [
      '물집을 터뜨리지 않습니다.',
      '환부를 문지르지 않습니다.',
      '임의 약품을 바르지 않습니다.',
    ],
    contact: '보건관리자에게 화상 범위와 의식 상태를 알립니다.',
    hospital: '119 신고 후 즉시 응급 이송이 필요합니다.',
    image: '/emergency/burn-1.jpg',
    imageAlt: '중증 화상 그림',
    source: '응급처치 기준표',
  },
  {
    id: 'puncture-nonemergency',
    symptom: '자상',
    urgency: '비응급',
    condition: '찔린 상처, 박힌 물체, 깊은 자상',
    summary: '자상은 외형보다 내부 손상이 클 수 있어 주의가 필요합니다.',
    immediateActions: [
      '박힌 물체가 있으면 빼지 않고 움직이지 않도록 고정합니다.',
      '보건관리자에게 즉시 연락합니다.',
      '출혈이 있으면 가능한 범위에서 압박합니다.',
      '병원 진료를 진행합니다.',
    ],
    dontDos: [
      '박힌 물체를 임의로 제거하지 않습니다.',
      '상처 안쪽을 함부로 만지지 않습니다.',
    ],
    contact: '보건관리자에게 물체 종류와 출혈 여부를 알립니다.',
    hospital: '자상은 병원 진료가 권장됩니다.',
    image: '/emergency/puncture.png',
    imageAlt: '자상 고정 그림',
    source: '응급처치카드.pptx slide 5',
  },
  {
    id: 'heat-nonemergency',
    symptom: '열사병/일사병',
    urgency: '비응급',
    condition: '의식이 있는 경우',
    summary: '의식이 있는 열손상은 시원한 곳으로 이동시키고 상태를 안정시키는 것이 우선입니다.',
    immediateActions: [
      '그늘지고 시원한 장소로 이동합니다.',
      '보건관리자에게 연락합니다.',
      '어지러움, 구토감, 피부 상태를 확인합니다.',
      '휴식시키고 상태를 관찰합니다.',
    ],
    dontDos: [
      '증상이 있는데 작업을 계속시키지 않습니다.',
      '고온 장소에 계속 두지 않습니다.',
    ],
    contact: '보건관리자에게 증상 발생 시점과 현재 상태를 알립니다.',
    hospital: '증상이 지속되거나 악화되면 병원 진료가 필요합니다.',
    image: '/emergency/heat.png',
    imageAlt: '열사병 대응 그림',
    source: '응급처치 기준표',
  },
  {
    id: 'heat-emergency',
    symptom: '열사병/일사병',
    urgency: '응급',
    condition: '의식이 없는 경우',
    summary: '의식이 없는 열손상은 즉시 119 신고가 필요한 응급상황입니다.',
    immediateActions: [
      '즉시 119에 신고합니다.',
      '보건관리자에게 연락합니다.',
      '물을 먹이지 않도록 합니다.',
      '벨트와 단추를 풀어 호흡을 편하게 합니다.',
      '미온수로 몸을 닦으며 이송 준비를 합니다.',
    ],
    dontDos: [
      '의식 없는 환자에게 물이나 음료를 먹이지 않습니다.',
      '환자를 혼자 두지 않습니다.',
    ],
    contact: '보건관리자에게 의식과 호흡 상태를 즉시 알립니다.',
    hospital: '119 신고 후 즉시 응급 이송이 필요합니다.',
    image: '/emergency/heat-1.png',
    imageAlt: '의식 없는 열사병 그림',
    source: '응급처치 기준표',
  },
  {
    id: 'eye-chemical-emergency',
    symptom: '눈 화학물질',
    urgency: '응급',
    condition: '눈에 화학물질이 들어감',
    summary: '눈 화학물질 노출은 즉시 세척이 가장 중요하며, 이후 병원 진료가 필요합니다.',
    immediateActions: [
      '즉시 눈 주위를 세척합니다.',
      '15~30분 동안 깨끗한 물로 충분히 헹굽니다.',
      '젖은 천으로 눈을 덮습니다.',
      '보건관리자에게 연락하고 병원으로 이동합니다.',
    ],
    dontDos: [
      '세척을 늦추지 않습니다.',
      '눈을 비비지 않습니다.',
      '임의로 약을 넣지 않습니다.',
    ],
    contact: '보건관리자에게 노출 물질 종류와 세척 시작 시간을 즉시 알립니다.',
    hospital: '즉시 병원 방문이 필요합니다.',
    image: '/emergency/eye-chemical.png',
    imageAlt: '눈 세척 그림',
    source: '응급처치카드.pptx slide 6',
  },
  {
  id: 'seizure-emergency',
  symptom: '경련/발작',
  urgency: '응급',
  condition: '경련이 지속되거나 반복됨, 의식 회복이 늦음',
  summary: '경련/발작 시에는 환자 주변을 안전하게 정리하고 기도 확보를 우선하며, 지속되면 즉시 응급 대응이 필요합니다.',
  immediateActions: [
    '즉시 주변의 위험한 물건을 치워 환자 부상을 막습니다.',
    '환자를 억지로 붙잡지 않습니다.',
    '머리 아래에 부드러운 물건을 받쳐 보호합니다.',
    '호흡 상태를 확인합니다.',
    '경련이 멈춘 뒤 회복자세를 취하게 합니다.',
    '경련이 5분 이상 지속되거나 반복되면 119에 신고합니다.',
  ],
  dontDos: [
    '입 안에 물건을 넣지 않습니다.',
    '억지로 팔다리를 누르거나 움직임을 멈추게 하지 않습니다.',
    '의식이 돌아오기 전 물이나 약을 먹이지 않습니다.',
  ],
  contact: '보건관리자에게 경련 시작 시간, 지속 시간, 의식 회복 여부를 즉시 알립니다.',
  hospital: '5분 이상 지속되거나 반복되면 즉시 응급 이송이 필요합니다.',
  image: '/emergency/seizure.png',
  imageAlt: '경련/발작 시 안전 확보 그림',
  source: '응급처치 기준표',
},
{
  id: 'seizure-nonemergency',
  symptom: '경련/발작',
  urgency: '비응급',
  condition: '짧게 끝나고 의식이 회복됨',
  summary: '짧은 경련 후 회복된 경우에도 원인 확인과 상태 관찰이 필요합니다.',
  immediateActions: [
    '주변 위험요소를 제거하고 안전을 확보합니다.',
    '경련이 끝날 때까지 시간을 확인합니다.',
    '회복 후 안정을 취하게 합니다.',
    '보건관리자에게 즉시 연락합니다.',
  ],
  dontDos: [
    '입 안에 물건을 넣지 않습니다.',
    '억지로 일으켜 세우지 않습니다.',
  ],
  contact: '보건관리자에게 발생 시간과 회복 여부를 알립니다.',
  hospital: '반복되거나 회복이 불완전하면 병원 진료가 필요합니다.',
  image: '/emergency/seizure.png',
  imageAlt: '경련/발작 대응 그림',
  source: '응급처치 기준표',
},

];

const symptomCards = [
  { title: '의식 소실', desc: '반응 없음, 혼수, 의식 저하', accent: '#fee2e2' },
  { title: '심정지/AED', desc: '호흡·맥박 없음, CPR/AED', accent: '#fee2e2' },
  { title: '골절', desc: '경미 골절부터 개방성골절까지', accent: '#e0f2fe' },
  { title: '절단', desc: '손가락·신체 일부 절단', accent: '#fee2e2' },
  { title: '화상', desc: '가벼운 화상, 넓은 부위 화상', accent: '#ffedd5' },
  { title: '자상', desc: '찔린 상처, 박힌 물체', accent: '#fef3c7' },
  { title: '열사병/일사병', desc: '의식 있음/없음 구분', accent: '#dcfce7' },
  { title: '눈 화학물질', desc: '즉시 세척 후 병원 이동', accent: '#e0e7ff' },
  { title: '실신', desc: '짧은 의식 소실 후 회복', accent: '#f3e8ff' },
  { title: '경련/발작', desc: '기도 보호와 안전 확보', accent: '#ede9fe' },
];

const sectionTitle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 800,
  color: '#111827',
  marginBottom: '8px',
};

export default function EmergencyPage() {
  const [selectedSymptom, setSelectedSymptom] = useState<string>('의식 소실');
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyType>('응급');

  const availableUrgencies = useMemo(() => {
    return Array.from(
      new Set(
        EMERGENCY_DB
          .filter((item) => item.symptom === selectedSymptom)
          .map((item) => item.urgency)
      )
    ) as UrgencyType[];
  }, [selectedSymptom]);

  const selectedGuide = useMemo(() => {
    return EMERGENCY_DB.find(
      (item) =>
        item.symptom === selectedSymptom &&
        item.urgency === selectedUrgency
    );
  }, [selectedSymptom, selectedUrgency]);

  const handleSelectSymptom = (symptom: string) => {
    setSelectedSymptom(symptom);

    const urgencies = Array.from(
      new Set(
        EMERGENCY_DB
          .filter((item) => item.symptom === symptom)
          .map((item) => item.urgency)
      )
    ) as UrgencyType[];

    if (urgencies.includes('응급')) {
      setSelectedUrgency('응급');
    } else {
      setSelectedUrgency(urgencies[0]);
    }
  };

  const summaryBadgeStyle =
    selectedGuide?.urgency === '응급'
      ? {
          color: '#b91c1c',
          background: '#fef2f2',
          border: '1px solid #fecaca',
        }
      : {
          color: '#1d4ed8',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
        };

  return (
    <div style={{ padding: '28px 32px', background: '#f9fafb', minHeight: '100%' }}>
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>
          응급처치
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
          대표 증상을 선택하고 응급 여부를 고르면 매뉴얼 기반 대처방법과 참고 그림을 확인할 수 있습니다.
        </p>
      </div>
{selectedGuide?.urgency === '응급' && (
  <div
    style={{
      position: 'sticky',
      top: '76px',
      zIndex: 5,
      marginBottom: '18px',
      border: '1px solid #fecaca',
      background: '#fef2f2',
      borderRadius: '14px',
      padding: '14px 16px',
    }}
  >
    <div
      style={{
        fontSize: '15px',
        fontWeight: 800,
        color: '#b91c1c',
        marginBottom: '6px',
      }}
    >
      응급 상황입니다
    </div>
    <div
      style={{
        fontSize: '13px',
        color: '#7f1d1d',
        lineHeight: 1.7,
      }}
    >
      119 신고와 보건관리자 연락이 우선입니다. 환자의 의식, 호흡, 출혈 상태를 지속적으로 확인하고 무리한 이동이나 임의 처치는 피하세요.
    </div>
  </div>
)}

      {selectedGuide && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.9fr 1fr',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '16px', background: '#fff', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 700 }}>현재 선택</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '6px' }}>
              {selectedGuide.symptom}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              {selectedGuide.condition}
            </div>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: '16px', background: '#fff', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 700 }}>응급 단계</div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 12px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 800,
                ...summaryBadgeStyle,
              }}
            >
              {selectedGuide.urgency}
            </span>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: '16px', background: '#fff', padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 700 }}>이송 기준</div>
            <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
              {selectedGuide.hospital}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '18px',
          background: '#fff',
          padding: '18px',
          marginBottom: '18px',
        }}
      >
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>
          대표 증상 선택
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '12px' }}>
          {symptomCards.map((card) => {
            const active = selectedSymptom === card.title;

            return (
              <button
                key={card.title}
                type="button"
                onClick={() => handleSelectSymptom(card.title)}
                style={{
                  textAlign: 'left',
                  border: active ? '1px solid #93c5fd' : '1px solid #e5e7eb',
                  background: active ? '#eff6ff' : '#fff',
                  borderRadius: '16px',
                  padding: '14px',
                  cursor: 'pointer',
                  minHeight: '108px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: active ? '#dbeafe' : card.accent,
                    marginBottom: '10px',
                  }}
                />
                <div style={{ fontSize: '15px', fontWeight: 800, color: active ? '#1d4ed8' : '#111827', marginBottom: '6px' }}>
                  {card.title}
                </div>
                <div style={{ fontSize: '12px', color: active ? '#1e40af' : '#6b7280', lineHeight: 1.5 }}>
                  {card.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '18px',
          background: '#fff',
          padding: '18px',
          marginBottom: '18px',
        }}
      >
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>
          응급 여부 선택
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {(['비응급', '응급'] as UrgencyType[]).map((type) => {
            const enabled = availableUrgencies.includes(type);
            const active = selectedUrgency === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() => enabled && setSelectedUrgency(type)}
                disabled={!enabled}
                style={{
                  minWidth: '150px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: !enabled
                    ? '1px solid #e5e7eb'
                    : active
                      ? type === '응급'
                        ? '1px solid #fca5a5'
                        : '1px solid #93c5fd'
                      : '1px solid #e5e7eb',
                  background: !enabled
                    ? '#f9fafb'
                    : active
                      ? type === '응급'
                        ? '#fef2f2'
                        : '#eff6ff'
                      : '#fff',
                  color: !enabled
                    ? '#9ca3af'
                    : active
                      ? type === '응급'
                        ? '#dc2626'
                        : '#1d4ed8'
                      : '#374151',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: enabled ? 'pointer' : 'not-allowed',
                }}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '18px',
          background: '#fff',
          overflow: 'hidden',
        }}
      >
        {!selectedGuide ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            선택한 조건에 해당하는 대처방법이 없습니다.
          </div>
        ) : (
          <>
            <div
              style={{
                padding: '18px 20px',
                borderBottom: '1px solid #e5e7eb',
                background: selectedGuide.urgency === '응급' ? '#fff7ed' : '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '5px 10px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 800,
                    border: `1px solid ${selectedGuide.urgency === '응급' ? '#fecaca' : '#bfdbfe'}`,
                    background: selectedGuide.urgency === '응급' ? '#fef2f2' : '#eff6ff',
                    color: selectedGuide.urgency === '응급' ? '#b91c1c' : '#1d4ed8',
                  }}
                >
                  {selectedGuide.urgency}
                </span>

                <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827' }}>
                  {selectedGuide.symptom}
                </div>
              </div>

              <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>
                상태파악: <span style={{ fontWeight: 700 }}>{selectedGuide.condition}</span>
              </div>
            </div>

            <div style={{ padding: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '18px', alignItems: 'start' }}>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ border: '1px solid #eef2f7', borderRadius: '14px', padding: '14px', background: '#fcfcfd' }}>
                    <div style={sectionTitle}>상황 요약</div>
                    <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.8 }}>
                      {selectedGuide.summary}
                    </div>
                  </div>

                  <div style={{ border: '1px solid #eef2f7', borderRadius: '14px', padding: '14px', background: '#fcfcfd' }}>
                    <div style={sectionTitle}>대처방법</div>
                    <ol style={{ margin: 0, paddingLeft: '18px', color: '#374151', fontSize: '14px', lineHeight: 1.8 }}>
                      {selectedGuide.immediateActions.map((step, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div style={{ border: '1px solid #fef3c7', borderRadius: '14px', padding: '14px', background: '#fffbeb' }}>
                    <div style={{ ...sectionTitle, color: '#92400e' }}>하면 안 되는 행동</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: '#b45309', fontSize: '14px', lineHeight: 1.8 }}>
                      {selectedGuide.dontDos.map((step, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ border: '1px solid #eef2f7', borderRadius: '14px', padding: '14px', background: '#fcfcfd' }}>
                    <div style={sectionTitle}>보고 및 연락</div>
                    <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.8 }}>
                      {selectedGuide.contact}
                    </div>
                  </div>

                  <div style={{ border: '1px solid #fecaca', borderRadius: '14px', padding: '14px', background: '#fef2f2' }}>
                    <div style={{ ...sectionTitle, color: '#b91c1c' }}>병원·이송 기준</div>
                    <div style={{ fontSize: '14px', color: '#b91c1c', fontWeight: 700, lineHeight: 1.8 }}>
                      {selectedGuide.hospital}
                    </div>
                  </div>

                  {selectedGuide.notes && selectedGuide.notes.length > 0 && (
                    <div style={{ border: '1px solid #eef2f7', borderRadius: '14px', padding: '14px', background: '#fcfcfd' }}>
                      <div style={sectionTitle}>참고사항</div>
                      <ul style={{ margin: 0, paddingLeft: '18px', color: '#6b7280', fontSize: '13px', lineHeight: 1.8 }}>
                        {selectedGuide.notes.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{ fontSize: '12px', color: '#9ca3af', padding: '2px 2px 0' }}>
                    출처: {selectedGuide.source}
                  </div>
                </div>

                <div>
                  <div style={{ border: '1px solid #eef2f7', borderRadius: '14px', padding: '14px', background: '#fcfcfd' }}>
                    <div style={sectionTitle}>참고 그림</div>

                    {selectedGuide.image ? (
                      <div
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: '#fff',
                        }}
                      >
                        <img
                          src={selectedGuide.image}
                          alt={selectedGuide.imageAlt || selectedGuide.symptom}
                          style={{
                            display: 'block',
                            width: '100%',
                            height: 'auto',
                            background: '#f9fafb',
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          border: '1px dashed #d1d5db',
                          borderRadius: '12px',
                          background: '#fafafa',
                          padding: '30px 18px',
                          textAlign: 'center',
                          color: '#9ca3af',
                          fontSize: '13px',
                          lineHeight: 1.6,
                        }}
                      >
                        그림 파일을 추가하면 이 영역에 표시됩니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
