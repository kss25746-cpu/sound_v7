import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type LandscapeBackButtonProps = {
  color?: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  onBack: () => void;
};

/** 탭바가 숨겨진 가로 화면용 나가기. 묶음 화면이 넘긴 `onBack`을 따른다. */
export function LandscapeBackButton({
  color = '#fff',
  iconSize = 22,
  style,
  onBack,
}: LandscapeBackButtonProps) {
  return (
    <Pressable
      onPress={onBack}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="나가기"
      style={[styles.button, style]}
    >
      <Ionicons name="arrow-back" size={iconSize} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 8,
  },
});
