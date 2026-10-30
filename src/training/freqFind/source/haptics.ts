// haptics.ts
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

/**
 * 청각 장애 및 고령층 보조 감각을 위한 햅틱 피드백 유틸리티
 * 플랫폼 미지원(웹 등) 및 예외 발생 시 안전하게 실패(silent fallback)하도록 처리합니다.
 */
export const hapticFeedback = {
  /** 보기 선택 및 가벼운 탭 피드백 */
  async selection(): Promise<void> {
    if (!hapticsEnabled || Platform.OS === "web") return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // safe fallback
    }
  },

  /** 정답/성공 시 경쾌한 피드백 */
  async success(): Promise<void> {
    if (!hapticsEnabled || Platform.OS === "web") return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // safe fallback
    }
  },

  /** 오답/실패 시 주의 경고 피드백 */
  async error(): Promise<void> {
    if (!hapticsEnabled || Platform.OS === "web") return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // safe fallback
    }
  },

  /** 경고 또는 주의 상태 피드백 */
  async warning(): Promise<void> {
    if (!hapticsEnabled || Platform.OS === "web") return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // safe fallback
    }
  },

  /** 가벼운 터치 충격감 (버튼 클릭 등) */
  async light(): Promise<void> {
    if (!hapticsEnabled || Platform.OS === "web") return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // safe fallback
    }
  },

  /** 중간 터치 충격감 */
  async medium(): Promise<void> {
    if (!hapticsEnabled || Platform.OS === "web") return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // safe fallback
    }
  },
};
