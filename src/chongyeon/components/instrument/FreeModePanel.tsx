import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LandscapeBackButton } from '../LandscapeBackButton';
import { fallingScaleLabels } from '../../screens/musicTrainingHelpers';
import { CONSOLE } from '../../constants/consoleTheme';
import type { SoundPreset } from '../../constants/music';
import type { SongScale } from '../../data/songs';
import { PresetRow, SegmentToggle, ShadowButton } from './ConsoleParts';

type FreeModePanelProps = {
  onBack: () => void;
  soundPreset: SoundPreset;
  onSelectPreset: (id: SoundPreset) => void;
  songTitle: string;
  onCycleSong: (direction: 1 | -1) => void;
  selectedScale: SongScale;
  onSelectScale: (scale: SongScale) => void;
  /** 0 = slowBpm, 1 = normalBpm. 양자택일 */
  tempoRatio: number;
  onTempoRatioChange: (ratio: number) => void;
  onStartPerformance: () => void;
  onStartTraining: () => void;
};

/**
 * 자유 모드(대기 화면) 하단 제어반. 레이아웃 C · 네이비 + 노랑.
 *
 * 가로 분할: 나가기 | 곡 액정 | 위·아래 화살표 | 음원+토글 | 자유/훈련 버튼.
 *
 * 색·부품은 `constants/consoleTheme.ts`와 `ConsoleParts.tsx`에서 온다 —
 * 훈련 모드 제어반(`TrainingModePanel`)이 **같은 것을 본다.**
 */
export function FreeModePanel({
  onBack,
  soundPreset,
  onSelectPreset,
  songTitle,
  onCycleSong,
  selectedScale,
  onSelectScale,
  tempoRatio,
  onTempoRatioChange,
  onStartPerformance,
  onStartTraining,
}: FreeModePanelProps) {
  const tempoSelected = tempoRatio >= 0.5 ? '1' : '0';

  return (
    <View style={styles.panel}>
      <LandscapeBackButton
        color={CONSOLE.idleText}
        iconSize={24}
        style={styles.backButton}
        onBack={onBack}
      />

      <View style={styles.lcd}>
        <Text style={styles.songTitle} numberOfLines={2}>
          {songTitle}
        </Text>
      </View>

      <View style={styles.arrowColumn}>
        <Pressable
          onPress={() => onCycleSong(-1)}
          accessibilityRole="button"
          accessibilityLabel="이전 곡"
          style={styles.arrowBtn}
        >
          <Ionicons name="chevron-up" size={30} color={CONSOLE.selectedText} />
        </Pressable>
        <Pressable
          onPress={() => onCycleSong(1)}
          accessibilityRole="button"
          accessibilityLabel="다음 곡"
          style={styles.arrowBtn}
        >
          <Ionicons name="chevron-down" size={30} color={CONSOLE.selectedText} />
        </Pressable>
      </View>

      <View style={styles.middle}>
        <PresetRow selected={soundPreset} onSelect={onSelectPreset} />

        <View style={styles.toggleRow}>
          <SegmentToggle
            options={[
              { value: '0', label: '느림' },
              { value: '1', label: '보통' },
            ]}
            selected={tempoSelected}
            onSelect={(next) => onTempoRatioChange(next === '1' ? 1 : 0)}
            accessibilityLabel="연주 속도"
          />
          <SegmentToggle
            options={[
              { value: 'penta5', label: fallingScaleLabels.penta5 },
              { value: 'white8', label: fallingScaleLabels.white8 },
            ]}
            selected={selectedScale}
            onSelect={onSelectScale}
            accessibilityLabel="음 스케일"
          />
        </View>
      </View>

      <View style={styles.actionColumn}>
        <ShadowButton
          background={CONSOLE.free}
          textColor={CONSOLE.selectedText}
          icon="play"
          label="자유 모드"
          onPress={onStartPerformance}
        />
        <ShadowButton
          background={CONSOLE.train}
          textColor="#FFFFFF"
          icon="radio-button-on"
          label="훈련 모드"
          onPress={onStartTraining}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: CONSOLE.panel,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignSelf: 'center',
    backgroundColor: CONSOLE.idleBtn,
  },
  lcd: {
    flex: 1,
    minWidth: 0,
    backgroundColor: CONSOLE.lcd,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  songTitle: {
    fontFamily: 'DoHyeon',
    color: CONSOLE.title,
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'center',
  },
  arrowColumn: {
    width: 56,
    flexShrink: 0,
    gap: 6,
  },
  arrowBtn: {
    flex: 1,
    backgroundColor: CONSOLE.selected,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    width: 262,
    flexShrink: 0,
    justifyContent: 'center',
    gap: 12,
  },
  toggleRow: {
    height: 48,
    flexDirection: 'row',
    gap: 8,
  },
  actionColumn: {
    width: 132,
    flexShrink: 0,
    gap: 10,
  },
});
