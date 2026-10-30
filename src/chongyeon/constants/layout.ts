import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** 세로 전용 앱 기준, 600px 이상을 태블릿으로 구분 */
const isTablet = SCREEN_WIDTH >= 600;

/** UI 레이아웃 상수 (반응형·동적 상수) */
export const LAYOUT = {
  /** 화면 크기 */
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,

  /** 태블릿 여부 (세로 기준 600px 이상) */
  isTablet,

  /** 간격 (Spacing) */
  spacingXS: isTablet ? 6 : 4,
  spacingSM: isTablet ? 10 : 8,
  spacingMD: isTablet ? 20 : 16,
  spacingLG: isTablet ? 30 : 24,

  /** 공통 텍스트 (index 등) */
  sectionTitleFontSize: isTablet ? 30 : 24,
  totalCountFontSize: isTablet ? 17 : 14,
  hintTextFontSize: isTablet ? 17 : 14,
  completedTitleFontSize: isTablet ? 22 : 18,
  completionTextFontSize: isTablet ? 30 : 24,
  buttonTextFontSize: isTablet ? 18 : 16,
  smallButtonTextFontSize: isTablet ? 15 : 12,

  /** 카드·버튼 공통 (index 등) */
  cardBorderRadius: Math.min(isTablet ? 32 : 24, Math.round(SCREEN_WIDTH * 0.04)),
  completeButtonPaddingV: 14,
  completeButtonElevation: 4,

  modalTitleFontSize: isTablet ? 22 : 18,

  /**
   * 게임 셋 공용 — 소리를 내는 동안 보여 주는 물결과 안내 문구.
   * `matchGame` · `matchGameAI` · `orderGame`이 모두 쓴다.
   * 물결 색은 `COLORS.waveRipple`이다.
   */
  waveAnimationSize: isTablet ? 240 : 200,
  loadingTextMarginTop: 20,
} as const;
