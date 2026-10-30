import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import * as exitBtn from '../constants/gameExitButtonLayout';
import { colors } from '../constants/gameExitButtonTheme';

type GameExitButtonProps = {
  onBack: () => void;
};

/**
 * 게임 셋에서 **목록으로 나가기.** 묶음 화면이 넘긴 `onBack`을 따른다.
 * 세 화면에 각각 넣지 말고 게임을 감싸는 쪽에 **한 번만** 올린다 —
 * 각각 넣으면 스타일·인셋·zIndex가 갈라진다.
 *
 * `LandscapeBackButton`과 나누어 둔 이유: 그쪽은 탭바가 숨겨진 **가로** 화면용이라
 * 반투명 흰 판 + 흰 아이콘이다. 게임 셋은 밝은 배경(사진 · 연노랑 · 연회색) 위라
 * 그 배색이 묻힌다.
 *
 * 감싼 쪽이 준 `onBack`으로 목록에 나간다.
 * 강화학습만 다르다. 홈이 아니면 화면이 먼저 받아 버튼 셋으로 되돌리고, 홈에서만 목록으로 나간다.
 * 그래서 강화학습 결과·통계에는 따로 「홈으로」를 두지 않는다 — 이 버튼과 같은 곳으로 가서 겹친다.
 * 글자를 함께 단 것은 「뒤로」가 아니라 나가는 버튼임을 눈으로 보이기 위해서다.
 *
 * 재생 중(`LISTENING`)에도 버튼은 그대로 둔다. 이 버튼은 소리를 끊지 않는다.
 * 목록으로 나갈 때는 `useStopAudioOnBlur`가 화면을 뜰 때 끊는다.
 * 강화학습이 버튼 셋으로만 돌아올 때는 그 화면이 재생만 멈춘다.
 */
export function GameExitButton({ onBack }: GameExitButtonProps) {
  return (
    <Pressable
      onPress={onBack}
      hitSlop={exitBtn.button.hitSlop}
      accessibilityRole="button"
      accessibilityLabel="게임 나가기"
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Ionicons
        name="arrow-back"
        size={exitBtn.button.iconSize}
        color={colors.icon}
      />
      <Text style={styles.label} numberOfLines={1}>나가기</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /**
   * 오른쪽 **아래.** 우상단은 미션아이콘(`top: 50, right: 20`)이 쓴다.
   * 이 레이아웃의 바닥은 이미 탭바 위라 **`insets.bottom`을 더하지 않는다.**
   * 자리·대비의 근거는 `gameExitButtonLayout.ts` 4절과 `gameExitButtonTheme.ts`에 있다.
   */
  button: {
    position: 'absolute',
    right: exitBtn.button.right,
    bottom: exitBtn.button.bottom,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: exitBtn.button.gap,
    minHeight: exitBtn.button.minHeight,
    paddingHorizontal: exitBtn.button.paddingH,
    // 알약 모양을 만드는 식이다. 높이가 바뀌면 따라온다
    borderRadius: exitBtn.button.minHeight / 2,
    backgroundColor: colors.bg,
    borderWidth: exitBtn.button.borderWidth,
    borderColor: colors.border,
    elevation: exitBtn.button.elevation,
    zIndex: exitBtn.button.zIndex,
  },
  buttonPressed: {
    backgroundColor: colors.pressedBg,
  },
  label: {
    fontSize: exitBtn.button.fontSize,
    fontWeight: '700',
    color: colors.label,
  },
});
