# AFPK 로컬 개발 환경

프론트는 저장소 루트의 React/Vite 프로젝트, 백엔드는 `backend`의 Spring Boot 프로젝트입니다.

## 설치 도구

- Java: Eclipse Temurin JDK 21
- Node.js: LTS 버전, npm 포함
- Spring Boot: 4.1.2
- 빌드: 프로젝트에 포함된 Gradle Wrapper 사용. Gradle 별도 설치 불필요.

설치 후 기존 터미널과 IDE를 닫고 다시 열어 환경변수를 반영합니다.

```powershell
java -version
javac -version
node --version
npm.cmd --version
```

`npm.cmd`를 사용하면 PowerShell의 `npm.ps1` 실행 정책 문제를 피할 수 있습니다.

## React 실행: 터미널 1

```powershell
Set-Location 'C:\Users\Rann\Documents\GitHub\afpk'
npm.cmd ci
npm.cmd start
```

패키지는 처음 받거나 `package-lock.json`이 변경됐을 때 설치하면 됩니다.
화면: http://127.0.0.1:5173

## Spring Boot 실행: 터미널 2

```powershell
Set-Location 'C:\Users\Rann\Documents\GitHub\afpk\backend'
.\gradlew.bat bootRun
```

첫 실행은 Gradle과 Java 의존성을 다운로드하므로 인터넷 연결이 필요합니다.
기본적으로 로컬 PC에서만 접근하도록 `127.0.0.1:8080`에 바인딩합니다.

## 연결 확인

두 서버가 실행 중인 상태에서 아래 주소를 브라우저에서 엽니다.

- 백엔드 직접 확인: http://127.0.0.1:8080/api/health
- React 개발 서버를 통한 확인: http://127.0.0.1:5173/api/health

두 주소 모두 다음 JSON이 표시되면 연결 성공입니다. JSON 필드의 순서는 달라도 됩니다.

```json
{"status":"UP","application":"afpk-backend"}
```

React에서 API를 요청할 때는 `fetch('/api/health')`처럼 상대 경로를 사용합니다.
Vite의 `/api` 프록시는 개발 서버에서만 작동합니다. 배포 시에는 별도 라우팅 설정이 필요합니다.

## 빌드 확인

프론트 저장소 루트에서:

```powershell
npm.cmd run build
```

백엔드 폴더에서:

```powershell
.\gradlew.bat test bootJar
```

## Gemini AI 설명 API

`POST /api/analyze-scenario`는 React의 시나리오 화면에 있는 ‘계산 결과 설명 보기’ 버튼과 연결됩니다.
서버가 입력값을 검증하고 재무 결과를 다시 계산한 뒤 Gemini에 설명을 요청합니다.
DB 없이 사용할 수 있으며, 현재 단계에는 질문 채팅이나 검토 이력 저장이 포함되지 않습니다.

### API 키 설정

1. https://aistudio.google.com/api-keys 에서 사용할 프로젝트의 API 키를 발급합니다.
2. IntelliJ에서 `AfpkBackendApplication` 실행 구성을 열고 **Edit Configurations → Environment variables**에 `GEMINI_API_KEY`를 추가한 뒤 실제 키를 값으로 입력합니다.
3. 필요하면 `GEMINI_MODEL`도 설정합니다. 기본 모델은 `gemini-3.8-flash`입니다. 계정의 모델 접근 권한과 호출 한도는 AI Studio에서 확인합니다.
4. 실행 중인 백엔드를 종료하고 다시 실행합니다.

PowerShell에서 실행한다면 서버를 시작하는 터미널에 환경변수를 설정합니다.

```powershell
$env:GEMINI_API_KEY = '발급받은_API_키'
$env:GEMINI_MODEL = 'gemini-3.8-flash'
.\gradlew.bat bootRun
```

`backend/.env.example`은 변수 이름을 안내하는 예시입니다. `.env` 파일을 자동으로 읽는 설정은 없습니다.
실제 키는 프론트 코드, `VITE_` 변수, Git 커밋에 넣지 않습니다.
Gemini 무료 티어 시연에는 가상 재무 데이터를 사용합니다.

키 없이도 서버는 실행됩니다. AI 요청 시에는 HTTP 503과 `AI_KEY_MISSING` 안내를 반환합니다.
API 키가 잘못됐거나 권한이 없으면 503, 호출 한도 초과는 429, AI 응답 시간 초과는 504로 안내합니다.
키 자체가 유효해도 Google이 해당 프로젝트의 무료 등급 사용을 허용하지 않으면 503 `AI_FREE_TIER_UNAVAILABLE`을 반환합니다. 키를 다시 복사하는 문제와 다르므로 프로젝트의 무료 사용 자격을 확인해야 합니다. 유료 전환은 별도 비용 결정입니다.
실패하거나 잘린 AI 응답을 정상 설명으로 표시하지 않습니다.

### 설정된 IntelliJ 실행 구성

개인 실행 설정이 생성된 PC에서는 `backend` 프로젝트를 열고 실행 구성 **AFPK Backend (Gemini)**를 선택하면 `bootRun`을 실행합니다. 이 구성은 `backend/.idea/runConfigurations/AfpkBackendGemini.xml`에 있으며 `.idea`는 Git에서 제외됩니다.
실행 설정에는 API 키가 있으므로 파일 내용이나 해당 값이 보이는 화면을 공유하지 않습니다.

### 프론트에서 사용

1. React와 백엔드를 모두 실행합니다.
2. **시나리오 비교**에서 변경 조건·목표금액·남은 기간을 입력합니다.
3. 필요한 경우 계획 조정과 충격 지속 기간을 입력합니다.
4. **계산 결과 설명 보기**를 누릅니다.

입력값을 변경하거나 시나리오 화면에서 나가면 진행 중인 브라우저 요청을 취소하고 이전 설명을 지웁니다.
브라우저 요청 취소가 이미 시작한 외부 AI 호출까지 취소한다는 보장은 없습니다.

서버는 프론트가 보낸 결과와 자유 형식의 `assumptions`를 신뢰하지 않고 원본 값으로 계산합니다.
현재 범위는 금액 0~1조 원(목표는 1원 이상), 목표 기간 1~600개월, 소득 감소율 0~100%, 지출 증가율 0~1000%, 비율 소수점 4자리 이내입니다.
월 금액은 정수이며 기간 중 충격은 0개월도 허용합니다. 스트레스 조건은 최대 10개입니다.

### 테스트

백엔드: `backend` 폴더에서 `.\gradlew.bat test bootJar`.
프론트 API 처리: 저장소 루트에서 `node --test src/services/scenarioApi.test.js`.
백엔드 테스트는 Gemini의 응답을 모의 처리하므로 실제 API 키나 사용료 없이 실행됩니다.
설명용 결과는 DB에 저장하지 않습니다. 공개 배포 전에는 호출 빈도·전체 사용량 제한과 저장 API의 접근 제어를 추가해야 합니다.

## IDE

사용하는 Java IDE에서 `backend` 폴더를 Gradle 프로젝트로 열고 Project SDK와 Gradle JVM을 JDK 21로 설정합니다.
백엔드 환경설정에 MySQL, Docker 또는 별도 Python 서버는 필요하지 않습니다.
