# 청능 애플리케이션 (rn-hear-1)

React Native / Expo SDK 57 기반 **청능 웰니스·훈련** 앱. 안드로이드 우선, **dev-client** 전용(Expo Go 불가).

📖 **문서 지도 — 어떤 문서를 어떤 순서로 읽는지: [`docs/README.md`](./docs/README.md)**

상세 컨텍스트: [`docs/dev-client-setup-context.md`](./docs/dev-client-setup-context.md)  
훈련·자극 설계(AMP/MDT·트랙): [`docs/amp-mdt-training-design.md`](./docs/amp-mdt-training-design.md)  
개선 백로그 + **진행 현황**: [`docs/improvement-backlog.md`](./docs/improvement-backlog.md) · [쉬운 말 버전](./docs/improvement-backlog-easy.md)  
구현·결과 로그: [`docs/impl-log_3.md`](./docs/impl-log_3.md)(정본) · [과거 3](./docs/impl-log_2.md) · [과거 2](./docs/impl-log_1.md) · [과거](./docs/impl-log.md) · 수정 리뷰: [`docs/fix-reviews.md`](./docs/fix-reviews.md)  
인계문(최신): [`docs/handoff8.md`](./docs/handoff8.md) · [과거](./docs/handoff7.md)  
Cursor 규칙 2번 vs 3번: [`docs/cursor-rules-2-vs-3.md`](./docs/cursor-rules-2-vs-3.md)

## 요구 환경

- Node.js **22.13+**
- JDK + Android Studio (compile/target SDK 36)
- 에뮬레이터 또는 USB 디버깅 실기기

## 시작하기 (Android)

```bash
npm install                   # postinstall에서 metro 패치 적용
npx expo run:android          # dev client 빌드·설치 (네이티브 변경 시 재실행)
npm start                     # expo start --dev-client
# Bundle Mode 최초/설정 변경 후: npx expo start --dev-client -- --reset-cache
```

상태 점검:

```bash
npm run doctor
```

## 왜 Expo Go가 아닌가

`react-native-audio-api`, `@shopify/react-native-skia`, `rive-react-native`, Reanimated/worklets 등 **커스텀 네이티브 모듈**을 사용합니다. 기기에 한 번 설치한 **development build**에 Metro를 붙이는 방식입니다.

## 프로젝트 구조 (요약)

| 경로 | 역할 |
|------|------|
| `src/app/` | expo-router 화면 |
| `src/components/` | UI 컴포넌트 |
| `babel.config.js` | worklets Bundle Mode |
| `metro.config.js` | SVG transformer + Bundle Mode |
| `patches/` | metro / metro-runtime Bundle Mode 패치 |
| `docs/dev-client-setup-context.md` | 스택·설정·경량화 방침 |
| `docs/amp-mdt-training-design.md` | 웰니스·훈련 / ①② 트랙·AM 스펙 |
| `docs/impl-log_3.md` | 구현·결과 날짜별 로그(**현재 정본**) |
| `docs/impl-log.md` | 구현·결과 로그 과거(2026-08-19 01:04까지) |
| `docs/handoff8.md` | 새 채팅 AI용 인계문(**현재 정본**) |
| `docs/handoff7.md` | 인계문 과거(2026-10-30 02:40까지) |
| `docs/handoff6.md` | 인계문 과거(2026-10-26 12:45까지) |
| `docs/README.md` | **문서 지도** — 분류 규칙·어디에 적을지·읽는 순서 |
| `docs/improvement-backlog.md` | 개선 백로그 + **진행 현황**(무엇이 고쳐졌고 무엇이 남았는지) |
| `docs/fix-reviews.md` | 수정 전후 코드·평가·검증 리뷰(누적, 최신이 위) |
| `.cursor/rules/android-dev-client.mdc` | Cursor AI always-apply 규칙 |

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm start` | Metro (dev-client) |
| `npm run android` | `expo run:android` |
| `npm run lint` | ESLint (`expo lint`) |
| `npm test` | Jest (`jest-expo/android`) |
| `npm run doctor` | `expo-doctor` |

## 경량화 방침

중사양 안드로이드 기준. 저사양 전용은 하지 않음. 측정·훈련 화면은 듣는 중 애니메이션을 얹지 않고 정적으로. 결과·연출은 중사양에 맞춰 Rive/Skia 사용 가능. 자세한 내용은 `docs/dev-client-setup-context.md` §5.
