import React, { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet, Animated, Easing } from "react-native";

import { Icon } from "@/components/ui/icon";

import { C, S, T } from "./theme";
import { WaveButton } from "./Sea";

export interface PauseModalProps {
  visible: boolean;
  onResume: () => void;
  onExit: () => void;
  stageName?: string;
}

export function PauseModal({
  visible,
  onResume,
  onExit,
  stageName,
}: PauseModalProps) {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) {
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.1] });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onResume}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Animated.View
              style={[styles.halo, { transform: [{ scale: haloScale }], opacity: haloOpacity }]}
            />
            <View style={styles.iconCircle}>
              <Icon name="pause" size={30} color={C.deep} />
            </View>
          </View>

          <Text style={styles.title}>측정이 일시정지되었어요</Text>
          {stageName ? <Text style={styles.stageNotice}>현재 단계: {stageName}</Text> : null}

          <Text style={styles.desc}>
            전화나 알림, 화면 전환으로 소리와 타이머를 멈췄어요. 조용한 곳에서 이어폰을 다시
            확인한 뒤 이어서 진행하세요.
          </Text>

          <View style={styles.actionWrap}>
            <WaveButton title="측정 계속하기" icon="play" onPress={onResume} tone="primary" />
            <WaveButton title="측정 중단하고 메인으로" onPress={onExit} tone="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(6, 21, 41, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: S.pad,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: C.white,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: "center",
    gap: 6,
    elevation: 12,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    width: 80,
    height: 80,
  },
  halo: {
    position: "absolute",
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: C.shallow,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(30,127,192,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...T.title,
    color: C.ink,
    textAlign: "center",
  },
  stageNotice: {
    ...T.tiny,
    color: C.mid,
    fontWeight: "600",
  },
  desc: {
    ...T.bodySoft,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  actionWrap: {
    width: "100%",
    gap: 10,
  },
});
