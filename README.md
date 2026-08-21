# Echoes — Share Your Shadows, Light the Way

익명으로 현재의 두려움을 털어놓고, 과거 두려움을 극복한 경험을 공유하는 미니멀 커뮤니티 웹 애플리케이션 (MVP)입니다.

---

## 🚀 1. 빠른 시작 (Local Development)

```bash
# 의존성 패키지 설치
npm install

# 로컬 개발 서버 실행 (기본 포트: 3000)
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하시면 즉시 확인하실 수 있습니다.  
*(Supabase 설정 전에도 내장된 로컬 스토리지 & Mock 데이터를 통해 즉시 글 작성 및 인터랙션을 테스트할 수 있습니다.)*

---

## 🗄️ 2. Supabase 백엔드 연동 가이드

1. **[Supabase](https://supabase.com)** 에 접속하여 새 프로젝트를 생성합니다.
2. 좌측 메뉴의 **SQL Editor**로 이동합니다.
3. 프로젝트 내의 [`supabase_schema.sql`](./supabase_schema.sql) 파일 내용을 복사하여 붙여넣고 **Run** 버튼을 클릭합니다.
4. 좌측 메뉴의 **Project Settings $\rightarrow$ API**로 이동하여:
   - **Project URL**
   - **anon / public key**
   를 복사합니다.
5. 프로젝트 루트에 `.env` 파일을 만들고 아래와 같이 입력합니다:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
6. 개발 서버를 재시작하면 실시간 Supabase 데이터베이스와 자동 연결됩니다!

---

## 📊 3. Google Analytics 4 (GA4) 및 Google Search Console 등록

### A. Google Analytics 4 (GA4) 등록
1. [Google Analytics](https://analytics.google.com)에서 **속성(Property)**을 생성하고 **웹 데이터 스트림**을 추가합니다.
2. 발급받은 **측정 ID (예: `G-XXXXXXXXXX`)**를 복사합니다.
3. [`index.html`](./index.html)의 주석 처리된 GA4 스크립트 태그의 주석을 해제하고 측정 ID를 입력하거나 `.env`의 `VITE_GA_ID`를 설정합니다.

### B. Google Search Console (GSC) 등록
1. [Google Search Console](https://search.google.com/search-console)에 접속하여 배포된 웹사이트 URL을 입력합니다.
2. 소유권 확인 방식 중 **HTML 태그(HTML Tag)** 방식을 선택합니다.
3. 제공되는 메타 태그(`content="..."`)의 인증 코드를 복사하여 [`index.html`](./index.html)의 해당 위치에 추가합니다:
   ```html
   <meta name="google-site-verification" content="YOUR_GSC_VERIFICATION_CODE_HERE" />
   ```
4. 사이트맵 제출 메뉴에서 `https://your-domain.com/sitemap.xml`을 제출합니다.

---

## 🌐 4. 무료 배포 가이드 (Vercel)

1. 코드를 GitHub 저장소에 푸시합니다.
2. [Vercel.com](https://vercel.com)에 로그인 후 **Add New Project**를 선택하고 해당 저장소를 가져옵니다.
3. **Environment Variables** 설정에서 다음 환경변수를 추가합니다:
   - `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon key
4. **Deploy** 버튼을 누르면 1분 이내에 글로벌 CDN을 통해 무료 배포가 완료됩니다.
