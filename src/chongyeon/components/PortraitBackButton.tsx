import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { COLORS } from '../constants/colors';

type PortraitBackButtonProps = {
  /** 아이콘 색. 어두운 바탕에서만 바꾼다 */
  color?: string;
  style?: StyleProp<ViewStyle>;
  onBack: () => void;
};

/**
 * 세로 화면(탭바가 보이는 쪽)의 **목록으로 나가기.** 묶음 화면이 넘긴 `onBack`을 따른다.
 *
 * B에서는 이 화면들(단어 카드 등)이 각자 하단 탭이라 나가는 문이 없었다.
 * A에서는 `wrs` 묶음 항목이라 돌아갈 곳이 필요하다 — 드럼(`DrumScreen`)이
 * 헤더 왼쪽에 둔 것과 같은 자리(좌상단)·같은 아이콘이다.
 *
 * `GameExitButton`(우하단 「나가기」 알약)과 나눈 이유: 게임 셋·동물 허브는 우하단을 쓰고,
 * 이 화면들은 바닥에 카드·선반이 있어 우하단이 막힌다. 좌상단 한 자리로 둔다.
 * `LandscapeBackButton`과 나눈 이유: 그쪽은 어두운 가로 화면용 반투명 흰 판이라 밝은 배경에 묻힌다.
 */
export function PortraitBackButton({
  color = COLORS.textPrimary,
  style,
  onBack,
}: PortraitBackButtonProps) {
  return (
    <Pressable
      onPress={onBack}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="나가기"
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, style]}
    >
      <Ionicons name="arrow-back" size={22} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /**
   * 배경 사진·연한 바탕 위에 얹히므로 **불투명**하게 깐다. 그림자는 `elevation`만 (규칙 4).
   * 테두리가 `textSecondary`인 이유는 `GameExitButton`과 같다 — 흰 판 위에서 경계가 유일한 구분이다.
   */
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    elevation: 2,
  },
  buttonPressed: {
    backgroundColor: COLORS.backgroundLight,
  },
});
