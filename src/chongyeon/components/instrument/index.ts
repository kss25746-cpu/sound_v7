/**
 * 악기 화면(피아노 `screens/MusicTrainingScreen.tsx` · 기타 `app/(tabs)/guitar/_layout.tsx`)이
 * 공유하는 UI 조각. 색 토큰은 `constants/instrumentTheme.ts`(공통)와
 * `constants/consoleTheme.ts`(피아노 콘솔)에 있다.
 */
export { InstrumentControlBar } from './InstrumentControlBar';
export { InstrumentButton, type InstrumentButtonVariant } from './InstrumentButton';
export { DifficultyRow, type DifficultyLevel } from './DifficultyRow';
export { PresetRow, SegmentToggle, ShadowButton } from './ConsoleParts';
export { FreeModePanel } from './FreeModePanel';
export { TrainingModePanel } from './TrainingModePanel';
export { ScoreFeedback } from './ScoreFeedback';
export { useInstrumentMetrics, clamp, clampRound } from './useInstrumentMetrics';
