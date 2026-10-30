import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LandscapeBackButton } from '../LandscapeBackButton';
import { CONSOLE } from '../../constants/consoleTheme';
import { SEMANTIC } from '../../constants/instrumentTheme';
import type { SoundPreset } from '../../constants/music';
import type { Difficulty } from '../../types/music';
import { PresetRow, SegmentToggle, ShadowButton } from './ConsoleParts';

type TrainingModePanelProps = {
  onBack: () => void;
  score: number;
  feedback: string;
  /** 디버그용 정답 노출. 없으면 줄 자체를 숨긴다 */
  hint?: string | null;
  levels: readonly { name: Difficulty; label: string }[];
  difficulty: Difficulty;
  onSelectDifficulty: (name: Difficulty) => void;
  soundPreset: SoundPreset;
  onSelectPreset: (id: SoundPreset) => void;
  /** 낼 음이 이미 있는가. 버튼이 「다시 듣기」가 될지 「문제 재생」이 될지를 가른다 */
  hasQuestion: boolean;
  onPlayQuestion: () => void;
  onRepeat: () => void;
  onStop: () => void;
};

/**
 * 훈련 모드(청능 훈련) 하단 제어반. **자유 모드와 같은 네이비+노랑**이다.
 *
 * 가로 분할: 나가기 | 점수·피드백 액정 | 난이도+음원 | 문제 재생 / 훈련 종료.
 * 자리도 자유 모드와 맞춰 뒀다 — 왼쪽 끝이 나가기, 가운데가 액정, 오른쪽 끝이 액션이라
 * 모드를 오가도 **손이 가는 자리가 안 바뀐다.**
 *
 * 예전에는 `ScoreFeedback` + `DifficultyRow` 두 줄짜리 회색 제어반이었다.
 * 점수와 피드백이 그냥 검은 바탕 위 글자라 **훈련 중 가장 중요한 두 값이 가장 약하게**
 * 보였다. 여기서는 자유 모드의 곡 액정과 같은 자리·같은 상자에 넣는다.
 */
export function TrainingModePanel({
  onBack,
  score,
  feedback,
  hint = null,
  levels,
  difficulty,
  onSelectDifficulty,
  soundPreset,
  onSelectPreset,
  hasQuestion,
  onPlayQuestion,
  onRepeat,
  onStop,
}: TrainingModePanelProps) {
  const difficultyOptions = levels.map(({ name, label }) => ({ value: name, label }));

  return (
    <View style={styles.panel}>
      <LandscapeBackButton
        color={CONSOLE.idleText}
        iconSize={24}
        style={styles.backButton}
        onBack={onBack}
      />

      <View style={styles.lcd}>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreCaption}>점수</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
        {!!feedback && (
          <Text style={styles.feedback} numberOfLines={hint ? 2 : 3}>
            {feedback}
          </Text>
        )}
        {!!hint && <Text style={styles.hint}>★ 정답: {hint}</Text>}
      </View>

      <View style={styles.middle}>
        <PresetRow selected={soundPreset} onSelect={onSelectPreset} />

        {/*
          난이도는 5칸이라 자유 모드의 2칸 토글보다 글자를 줄인다. 그래도 같은 알약이라
          "고르는 것"이라는 생김새는 유지된다 — 예전 `DifficultyRow`는 네모 버튼 5개라
          위의 음원 동그라미와 따로 놀았다.
        */}
        <View style={styles.toggleRow}>
          <SegmentToggle
            options={difficultyOptions}
            selected={difficulty}
            onSelect={onSelectDifficulty}
            accessibilityLabel="난이도"
            fontSize={15}
          />
        </View>
      </View>

      <View style={styles.actionColumn}>
        {/*
          낼 음이 없으면 「다시 듣기」가 아니라 「문제 재생」이다. 뜻이 다르니 색도 다르다 —
          자유 모드의 주 동작(「자유 모드」)과 같은 노랑이 **시작**이고, 초록은 **반복**이다.
        */}
        <ShadowButton
          background={hasQuestion ? SEMANTIC.repeat : CONSOLE.free}
          textColor={hasQuestion ? '#0A1F12' : CONSOLE.selectedText}
          icon={hasQuestion ? 'repeat' : 'play'}
          label={hasQuestion ? '다시 듣기' : '문제 재생'}
          onPress={hasQuestion ? onRepeat : onPlayQuestion}
        />
        <ShadowButton
          background={SEMANTIC.stop}
          textColor="#FFFFFF"
          icon="stop"
          label="훈련 종료"
          onPress={onStop}
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
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  scoreCaption: {
    color: CONSOLE.dim,
    fontSize: 14,
    fontWeight: '800',
  },
  scoreValue: {
    fontFamily: 'DoHyeon',
    color: CONSOLE.title,
    fontSize: 34,
    lineHeight: 40,
  },
  /**
   * 안내 문구가 길다 — "난이도를 선택하고 [문제 재생]을 눌러 시작하세요!"
   * `numberOfLines`로 자르면 **뜻이 사라지므로** 글자를 줄여 세 줄까지 받는다.
   */
  feedback: {
    color: CONSOLE.idleText,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
  },
  hint: {
    color: CONSOLE.presetDot,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  /**
   * 자유 모드의 가운데 칸(262)보다 조금 넓다 — 난이도가 5칸이라 두 글자가 접히면 안 된다.
   * 대신 곡 액정보다 **안내 문구가 길어서** 왼쪽 액정에 더 줘야 하므로, 자유 모드에는 있는
   * 화살표 칸(56)이 여기 없는 만큼을 액정이 가져간다.
   */
  middle: {
    width: 274,
    flexShrink: 0,
    justifyContent: 'center',
    gap: 12,
  },
  toggleRow: {
    height: 48,
    flexDirection: 'row',
  },
  actionColumn: {
    width: 132,
    flexShrink: 0,
    gap: 10,
  },
});
