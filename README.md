# AFPK 재무설계안 점검 시뮬레이터

재무설계 보고서(가상 고객 사례)의 설계안을 직접 점검하는 웹 시뮬레이터입니다.
계산은 코드(JavaScript)가 하고, AI는 계산된 수치를 바탕으로 원인과 조정 방향을 설명하거나 검토합니다.
모든 사례는 가상 고객이며 개인정보를 포함하지 않습니다.

## 주요 기능

| 화면 | 내용 |
|---|---|
| 재무계획 | 고객 현금흐름·자산·부채, 연차별 월 저축 배분표와 가용 재원 비교, **설계안 충격 점검**(식비 절감 미이행, 소득 감소, 지출 증가, ISA 평가손실, 복합 충격) |
| 시나리오 비교 | 소득·지출 변화에 따른 월 현금흐름, 목표금액 부족 점검, 계획 수정 전후 비교, 기간별 스트레스 테스트, 몬테카를로 시뮬레이션 |
| AI 답변 검토 | 입력한 계획을 AI가 점검하고 대화로 이어가는 화면 (백엔드 필요) |

- 금액 단위는 원이며, 보고서의 만원 단위 값은 원 단위로 환산해 사용합니다.
- 설계안의 식비 절감(월 13만 원)은 연차별 배분 비교와 설계안 충격 점검에 반영하며, 시나리오 비교는 입력한 고객 정보 그대로 계산합니다. 값은 `src/data/allocationPlan.js`에 있습니다.
- 충격 조건은 발생 가능성이 낮은 최악의 상황을 가정한 점검용이며 예측이 아닙니다.

## 구조

```text
src/                프론트(React + Vite)
  data/             고객 정보, 연차별 배분, 스트레스 조건
  utils/            계산 로직(calculations.js)
  pages/, components/
backend/            Spring Boot 백엔드(Gemini 연동, AI 검토·설명 API)
DEVELOPMENT.md      개발 환경 상세 설명
```

## 실행 방법

필요한 도구: Node.js(LTS), 그리고 AI 기능을 쓸 때만 JDK 21.

### 1. 프론트만 실행 (계산 기능 전체 사용 가능)

```bash
npm install
npm start
```

브라우저에서 http://127.0.0.1:5173 을 엽니다. 재무계획과 시나리오 비교 화면은 백엔드 없이 동작합니다.

### 2. AI 기능까지 실행 (백엔드 필요)

AI 검토·설명은 백엔드와 Gemini API 키가 필요합니다. 키는 코드나 저장소에 넣지 않습니다.

```bash
cd backend
export GEMINI_API_KEY='발급받은_키'
export GEMINI_MODEL='gemini-3.5-flash-lite'
./gradlew bootRun
```

Windows PowerShell에서는 `$env:GEMINI_API_KEY = '...'` 후 `.\gradlew.bat bootRun`을 사용합니다.
백엔드가 켜진 상태에서 프론트를 실행하면 `/api` 요청이 `127.0.0.1:8080`으로 전달됩니다.
연결 확인: http://127.0.0.1:5173/api/health 가 `{"status":"UP"...}`을 보여주면 성공입니다.

API 키가 없으면 AI 화면은 오류를 안내하며, 나머지 화면은 정상 동작합니다.

## 빌드

```bash
npm run build
```

## 제출·배포 시 주의

- API 키가 들어 있는 파일(`.env`, `backend/.idea` 등)은 압축 파일이나 저장소에 포함하지 않습니다.
- 압축 시 `node_modules`, `dist`, `backend/build`, `backend/.gradle`은 제외합니다.
- 공개 배포 전에는 AI 호출 빈도와 사용량 제한을 추가해야 합니다.
