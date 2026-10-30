import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { BackHandler } from "react-native";

import { ListeningCheckScreen } from "@/training/ListeningCheckScreen";
import { PitchCompareScreen } from "@/training/pitch2afc/PitchCompareScreen";
import { StatsScreen } from "@/training/StatsScreen";

/**
 * 소리 높낮이 탭 — 높낮이 비교만. 다른 음 찾기는 넣지 않는다.
 * 듣기 준비·통계는 헤더 버튼으로 이 탭 안에서 스와프.
 */
type PtaSessionScreenProps = {
  onBack?: () => void;
};

export function PtaSessionScreen({ onBack }: PtaSessionScreenProps) {
  const [showStats, setShowStats] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  const closeStats = useCallback(() => {
    setShowStats(false);
  }, []);

  const closeCheck = useCallback(() => {
    setShowCheck(false);
  }, []);

  const openCheck = useCallback(() => {
    setShowCheck(true);
  }, []);

  const openStats = useCallback(() => {
    setShowStats(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (showStats) {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
          closeStats();
          return true;
        });
        return () => sub.remove();
      }
      if (showCheck) {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
          closeCheck();
          return true;
        });
        return () => sub.remove();
      }
      return undefined;
    }, [showStats, showCheck, closeStats, closeCheck]),
  );

  if (showStats) {
    return <StatsScreen initialKind="pitch2" onBack={closeStats} />;
  }

  if (showCheck) {
    return (
      <ListeningCheckScreen onBack={closeCheck} />
    );
  }

  return (
    <PitchCompareScreen
      onBack={onBack}
      onOpenStats={openStats}
      onOpenListeningCheck={openCheck}
    />
  );
}
