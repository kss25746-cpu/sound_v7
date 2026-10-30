/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo/android',
  // worklets가 `.native` 구현으로 풀리면 import만으로 네이티브 모듈을 찾다가 넘어진다.
  // 이 리졸버가 worklets 안에서만 `.native` 확장자를 빼 준다(패키지가 제공하는 공식 것).
  resolver: 'react-native-worklets/jest/resolver.js',
  // tsconfig의 `@/*` 경로 별칭을 Jest에도 동일하게 적용(assets가 먼저 매칭돼야 함).
  // CSS는 `@/*`보다 먼저 잡아야 한다 — `@/global.css`가 별칭으로 새면 파싱에 실패한다.
  // 프리셋의 `setupFiles`를 덮어쓰지 않도록 `setupFilesAfterEnv`를 쓴다.
  setupFilesAfterEnv: ['<rootDir>/jest/setup.js'],
  // RN 화면 첫 렌더가 무거워 기본 5초로는 첫 테스트가 간헐적으로 넘친다.
  testTimeout: 20000,
  moduleNameMapper: {
    '\\.css$': '<rootDir>/jest/styleMock.js',
    '^@/assets/(.*\\.wav)$': '<rootDir>/jest/assetMock.js',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
