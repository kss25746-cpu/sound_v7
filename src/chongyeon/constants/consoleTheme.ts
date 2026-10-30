/**
 * 피아노 하단 **제어반(콘솔)** 의 색·치수.
 *
 * 원래 이 값들은 `FreeModePanel.tsx` 안의 지역 상수 `C`였다. 훈련 모드 제어반이
 * 같은 톤으로 서면서 **두 벌이 되면 곧 갈라진다** — 한쪽만 노랑을 바꾸면 자유↔훈련을
 * 오갈 때 같은 화면의 아래쪽만 색이 바뀐다. 그래서 한 군데로 올렸다.
 *
 * `instrumentTheme.ts`(제어반 **치수**·악기 액센트)와 나누는 기준은 범위다.
 * 저기는 피아노와 기타가 같이 쓰는 값이고, 여기는 **피아노 콘솔만의** 네이비+노랑이다.
 * 기타는 자기 나무색을 쓰므로 여기 값을 가져가면 안 된다.
 *
 * 쓰는 곳: `components/instrument/FreeModePanel.tsx` ·
 * `components/instrument/TrainingModePanel.tsx` · `components/instrument/ConsoleParts.tsx` ·
 * `components/MiniKeyboardMap.tsx` · `screens/MusicTrainingScreen.tsx`
 */

export const CONSOLE = {
  /** 제어반 바탕 */
  panel: '#1F2B3B',
  /** 버튼 아래 깔리는 그림자 · 제어반 윗선 */
  shadow: '#0C131C',
  /** 눌리지 않은 버튼 */
  idleBtn: '#2E3D52',
  idleText: '#EEF2F7',
  /** 액정 바탕. 곡 제목도 점수도 여기 올라간다 */
  lcd: '#0A1017',
  /** 액정 글자(노랑) */
  title: '#FFD166',
  /** 고른 것 */
  selected: '#FFD166',
  /** 노랑 위에 얹는 글자 — 검정이 아니라 **탁한 갈색**이라야 노랑이 튀지 않는다 */
  selectedText: '#1A1406',
  toggleIdle: '#B4C0CF',
  toggleBg: '#17212E',
  /** 고른 음원 위 점 · 옥타브 가이드 강조. 노랑(평상시)과 **구분되는** 주황이다 */
  presetDot: '#FF8A4C',
  /** 자유 모드 시작 · 문제 재생 — 제어반의 주 동작 */
  free: '#FFC247',
  /** 훈련 모드 전환 — 주 동작 옆에 서는 보조 */
  train: '#3E5068',
  /** 액정 안 작은 설명 글자 */
  dim: '#8A99AB',
} as const;

/**
 * 콘솔 제어반 높이.
 *
 * 음원 줄(48)과 토글/난이도 줄(48)이 서야 해서 표준(`CONTROL_BAR.standardHeight` 110)보다
 * 높다. **자유 모드와 훈련 모드가 같은 값을 써야 한다** — 두 모드를 오갈 때 높이가 달라지면
 * 그만큼 건반이 튀어 오른다.
 */
export const CONSOLE_BAR_HEIGHT = 148;
