/**
 * Jest용 CSS 스텁. `constants/theme.ts`가 웹 폰트 변수 때문에 `global.css`를
 * 임포트하는데, Jest는 CSS를 파싱하지 못한다. 테스트에서는 빈 객체면 충분하다.
 */
module.exports = {};
