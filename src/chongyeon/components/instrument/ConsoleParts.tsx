import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CONSOLE } from '../../constants/consoleTheme';
import { soundPresets, type SoundPreset } from '../../constants/music';

/**
 * 콘솔 제어반(자유 모드 · 훈련 모드)이 **공유하는** 부품.
 *
 * 두 패널은 담는 내용이 다르지만(곡 선택 vs 점수·난이도) 세그먼트 토글,
 * 그림자 버튼, 음원 줄은 **글자만 다르고 생김새가 같다.** 각자 들고 있으면
 * 한쪽만 손보게 되고, 그러면 같은 화면 아래쪽이 모드마다 달라 보인다.
 *
 * 색은 `constants/consoleTheme.ts`의 `CONSOLE` 하나만 본다.
 */

/**
 * 둘 중 하나를 고르는 알약 토글. 난이도처럼 **셋 이상**도 받는다 —
 * 칸은 `flex: 1`이라 개수만큼 균등하게 나뉜다.
 */
export function SegmentToggle<T extends string>({
  options,
  selected,
  onSelect,
  accessibilityLabel,
  fontSize,
  style,
}: {
  options: readonly { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  accessibilityLabel: string;
  /** 칸이 많아지면(난이도 5칸) 글자를 줄여야 두 글자가 안 접힌다 */
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[styles.seg, style]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const isActive = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={[styles.segItem, isActive && styles.segItemActive]}
          >
            <Text
              style={[
                styles.segText,
                fontSize != null && { fontSize },
                isActive && styles.segTextActive,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * 아래에 단색 그림자가 깔린 실물 버튼.
 *
 * 그림자를 `elevation`이 아니라 **바깥 View의 4px 여백**으로 낸 이유는,
 * 안드로이드 `elevation`은 색을 못 정해서 네이비 바탕 위에서 회색으로 뜨기 때문이다.
 */
export function ShadowButton({
  background,
  textColor,
  icon,
  label,
  onPress,
  style,
}: {
  background: string;
  textColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.actionShadow, style]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.actionBtn, { backgroundColor: background }]}
      >
        <Ionicons name={icon} size={16} color={textColor} />
        <Text style={[styles.actionText, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * 음원 프리셋 1~5번 한 줄.
 *
 * 자유 모드와 훈련 모드가 **같은 값을 고른다**(`soundPresetRef` 하나). 그래서 줄도
 * 하나여야 한다 — 예전에는 훈련 쪽만 `DifficultyRow`로 그려 같은 설정이 두 모습이었다.
 */
export function PresetRow({
  selected,
  onSelect,
  style,
}: {
  selected: SoundPreset;
  onSelect: (id: SoundPreset) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.presetRow, style]}>
      <Text style={styles.presetCaption}>설정</Text>
      {soundPresets.map((preset) => {
        const isActive = preset.id === selected;
        // 라벨이 `1번`이라 칸 안에서는 숫자만 남긴다 — 「번」은 caption이 대신한다
        const number = preset.label.replace('번', '');
        return (
          <Pressable
            key={preset.id}
            onPress={() => onSelect(preset.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`음원 ${preset.label}`}
            style={[styles.presetBtn, isActive && styles.presetBtnActive]}
          >
            {isActive && <View style={styles.presetDot} />}
            <Text style={[styles.presetNum, isActive && styles.presetNumActive]}>
              {number}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  seg: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: CONSOLE.toggleBg,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 3,
  },
  segItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  segItemActive: {
    backgroundColor: CONSOLE.selected,
  },
  segText: {
    color: CONSOLE.toggleIdle,
    fontSize: 17,
    fontWeight: '800',
  },
  segTextActive: {
    color: CONSOLE.selectedText,
  },
  actionShadow: {
    flex: 1,
    backgroundColor: CONSOLE.shadow,
    borderRadius: 14,
    paddingBottom: 4,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  presetRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  presetCaption: {
    color: CONSOLE.idleText,
    fontSize: 16,
    fontWeight: '800',
    marginRight: 2,
  },
  presetBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: CONSOLE.idleBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnActive: {
    backgroundColor: CONSOLE.selected,
  },
  presetDot: {
    position: 'absolute',
    top: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CONSOLE.presetDot,
  },
  presetNum: {
    color: CONSOLE.idleText,
    fontSize: 18,
    fontWeight: '800',
  },
  presetNumActive: {
    color: CONSOLE.selectedText,
  },
});
