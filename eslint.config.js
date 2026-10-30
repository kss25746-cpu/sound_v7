// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    /**
     * B(`chongyeon-0708`)에서 그대로 옮겨 온 화면·컴포넌트.
     *
     * A가 켠 규칙을 B는 쓰지 않았다. 지금 걸리는 건 렌더 중 ref 읽기(49) ·
     * effect 안 setState(5) · 불변 위반(3)이고, 전부 **B에서 돌아가는 코드**다.
     * 화면을 아직 배선도 하지 않은 상태에서 게임 로직 59곳을 고치는 건 이득 없이
     * 위험만 크다. 정본 §2.3 — 겹치는 종목은 B의 UX·구현을 그대로 살린다.
     *
     * React Compiler 쪽은 따로 막았다(해당 파일 맨 위 `"use no memo"`).
     * 화면을 하나씩 배선할 때 그 파일부터 규칙을 맞춰 고치고 여기서 뺀다.
     */
    files: ["src/chongyeon/**"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },
]);
