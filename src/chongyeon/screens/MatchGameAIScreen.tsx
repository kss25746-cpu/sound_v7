"use no memo";

// A는 React Compiler가 켜져 있고(app.json experiments.reactCompiler) B는 아니었다.
// 이 파일은 렌더 중 ref 읽기 등 컴파일러가 가정하는 규칙을 어긴다. 그대로 컴파일하면
// 잘못 메모이즈될 수 있어 **명시적으로 옵트아웃한다.** 규칙을 맞춰 고치면 이 줄을 지운다.

// B(`chongyeon-0708`) `app/(tabs)/new/(games)/matchGameAI.tsx`에서 반입. 라우트가 아니라 `다른 소리` 묶음(`OtherSoundsTabScreen`) 안 상태다.
// 상대경로 `assets/`는 `@/assets/chongyeon/`으로, 오디오 정리 훅은 이식본 `@/hooks/use-stop-audio-on-blur`로 붙였다.
// 게임 로직·UX는 B 그대로 살린다(정본 §2.3). 경위: `docs/app_go8.md`.

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { memo, useCallback, useContext, useEffect, useReducer, useRef, type MutableRefObject } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MissionProgressIcon from '../components/MissionProgressIcon';
import WaveRipple from '../components/WaveRipple';
import { ClearContext } from '../context/ClearContext';
import { StarContext } from '../context/StarContext';
import { LAYOUT } from '../constants/layout';
import * as aud from '../constants/auditoryLayout';
import { colors, opacity } from '../constants/auditoryTheme';
import { SOUNDS_CONFIG } from '../constants/animalSounds';
import { gameAudioManager } from '../services/GameAudioManager';
import { sendRecord, fetchRecord } from '@/chongyeon/hooks/useSyncGameData';
import { useStopAudioOnBlur } from "@/hooks/use-stop-audio-on-blur";

const LEARNING_RATE = 0.1;
const DISCOUNT_FACTOR = 0.9;
const MAX_CHOICES = 3;
const STORAGE_KEY = '@AuditoryTrainingApp:gameState';

type GameStatus = 'HOME' | 'LOADING' | 'LISTENING' | 'PLAYING' | 'RESULTS' | 'STATS';

/** 홈·로딩이 아니면 true. 그때는 버튼 셋으로 되돌린다. */
export type MatchGameLeave = () => boolean;
type GameMode = 'STANDARD' | 'WEAKNESS';
type QTable = { [state: string]: { [action: string]: number } };
type UserStats = { [sound: string]: { correct: number; total: number } };

type GameState = {
    status: GameStatus;
    mode: GameMode;
    difficulty: number;
    qTable: QTable;
    userStats: UserStats;
    remainingChoices: number;
    correctSoundNames: Set<string>;
    userSelections: { [key: string]: 'correct' | 'incorrect' };
    score: number;
    roundResult: 'WIN' | 'LOSE' | null;
    // ====[ 미션 추가 1: 미션 달성을 위한 상태 추가 ]====
    hasLostChanceInRun: boolean;
    // ===============================================
    // 전송용 데이터 수집 상태
    playedDifficulty: number;      // 이번 라운드 시작 시 난이도
    gameStartTime: number | null;  // 조작 시작 시간
    roundWrongAttempts: string[];  // 이번 라운드 오답 목록
};

type Action =
    | { type: 'LOAD_DATA_SUCCESS'; payload: Partial<Pick<GameState, 'difficulty' | 'qTable' | 'userStats'>> }
    | { type: 'LOAD_DATA_FAILURE' }
    | { type: 'SET_STATUS'; payload: GameStatus }
    | { type: 'GAME_START_REQUEST'; payload: { mode: GameMode; isNewRun: boolean } } // isNewRun 추가
    | { type: 'GAME_START_SUCCESS'; payload: { correctNames: Set<string> } }
    | { type: 'SELECT_ANSWER'; payload: { selectedName: string; isCorrect: boolean } };

const initialQTable = SOUNDS_CONFIG.reduce((acc, s) => ({ ...acc, [s.name]: SOUNDS_CONFIG.reduce((q, i) => ({ ...q, [i.name]: 0 }), {}) }), {});
const initialUserStats = SOUNDS_CONFIG.reduce((acc, s) => ({ ...acc, [s.name]: { correct: 0, total: 0 } }), {});

const initialState: GameState = {
    status: 'LOADING',
    mode: 'STANDARD',
    difficulty: 1,
    qTable: initialQTable,
    userStats: initialUserStats,
    remainingChoices: MAX_CHOICES,
    correctSoundNames: new Set(),
    userSelections: {},
    score: 0,
    roundResult: null,
    // ====[ 미션 추가 2: 상태 초기값 설정 ]====
    hasLostChanceInRun: false,
    // =====================================
    playedDifficulty: 1,
    gameStartTime: null,
    roundWrongAttempts: [],
};

function gameReducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case 'LOAD_DATA_SUCCESS':
            return { ...state, ...action.payload, status: 'HOME' };
        case 'LOAD_DATA_FAILURE':
             return { ...state, status: 'HOME' };
        case 'SET_STATUS':
            return { ...state, status: action.payload };
        case 'GAME_START_REQUEST':
            return {
                ...state,
                status: 'PLAYING',
                mode: action.payload.mode,
                userSelections: {},
                score: 0,
                remainingChoices: MAX_CHOICES,
                roundResult: null,
                // ====[ 미션 추가 3: 게임 시작 시 미션 상태 초기화 ]====
                hasLostChanceInRun: action.payload.isNewRun ? false : state.hasLostChanceInRun,
                // ===============================================
                // 라운드 기록 초기화 및 현재 난이도 고정
                playedDifficulty: state.difficulty,
                roundWrongAttempts: [],
                gameStartTime: Date.now(), // 여기서부터 시간 측정 시작
            };
        case 'GAME_START_SUCCESS':
            return { ...state, correctSoundNames: action.payload.correctNames };
        case 'SELECT_ANSWER': {
            const { selectedName, isCorrect } = action.payload;
            if (state.userSelections[selectedName]) return state; // 같은 것을 두 번 채점하지 않는다
            const newSelections = { ...state.userSelections, [selectedName]: isCorrect ? 'correct' : 'incorrect' } as const;
            const newStats = { ...state.userStats };
            if (isCorrect) {
                const statsForSelection = newStats[selectedName] || { correct: 0, total: 0 };
                newStats[selectedName] = { 
                    correct: statsForSelection.correct + 1, 
                    total: statsForSelection.total + 1 
                };
            }
            const newQTable = JSON.parse(JSON.stringify(state.qTable));
            const reward = isCorrect ? 1 : -1;

            state.correctSoundNames.forEach(name => {
                if(!state.userSelections[name]){
                    const futureQValues = Object.values(newQTable[selectedName] ?? {}) as number[];
                    const maxFutureQ = futureQValues.length > 0 ? Math.max(...futureQValues) : 0;
                    const oldQ = newQTable[name]?.[selectedName] ?? 0;
                    newQTable[name][selectedName] = oldQ + LEARNING_RATE * (reward + DISCOUNT_FACTOR * maxFutureQ - oldQ);
                }
            });
            
            const newCorrectNames = new Set(state.correctSoundNames);
            if (isCorrect) newCorrectNames.delete(selectedName);

            const didWin = newCorrectNames.size === 0;
            const didLose = !isCorrect && state.remainingChoices - 1 <= 0;
            const isFinished = didWin || didLose;
            const newDifficulty = didWin ? state.difficulty + 1 : (didLose && state.difficulty > 1 ? state.difficulty - 1 : state.difficulty); // 오답 시 난이도 하락 로직 추가
            if (didLose) {
                newCorrectNames.forEach(missedName => {
                    const prev = newStats[missedName] || { correct: 0, total: 0 };
                    newStats[missedName] = {
                        correct: prev.correct, // 맞춘 횟수는 그대로
                        total: prev.total + 1  // 시도 수만 +1 -> 정답률 하락 (약점화!)
                    };
                });
            } 

            return {
                ...state,
                userSelections: newSelections,
                correctSoundNames: newCorrectNames,
                remainingChoices: isCorrect ? state.remainingChoices : state.remainingChoices - 1,
                score: isCorrect ? state.score + (10 * state.difficulty) : state.score,
                status: isFinished ? 'RESULTS' : 'PLAYING',
                difficulty: newDifficulty,
                userStats: newStats,
                qTable: newQTable,
                roundResult: isFinished ? (didWin ? 'WIN' : 'LOSE') : null,
                // ====[ 미션 추가 4: 실수 기록 ]====
                hasLostChanceInRun: state.hasLostChanceInRun || !isCorrect,
                // =================================
                // 오답 시 동물 이름 기록
                roundWrongAttempts: isCorrect ? state.roundWrongAttempts : [...state.roundWrongAttempts, selectedName],
            };
        }
        default:
            return state;
    }
}

const useAuditoryGame = () => {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    /** 나가기로 홈에 돌아오면 재생 루프가 이 값과 어긋나 멈춘다. */
    const playGeneration = useRef(0);

    // ====[ 미션 추가 5: 컨텍스트 및 Ref 사용 ]====
    const starContext = useContext(StarContext);
    const clearContext = useContext(ClearContext);
    const prevDifficultyRef = useRef<number>(state.difficulty);
    useEffect(() => {
        prevDifficultyRef.current = state.difficulty;
    });
    const previousDifficulty = prevDifficultyRef.current;
    
    useEffect(() => {
        // 난이도가 2에서 3으로 상승하는 순간
        if (previousDifficulty === 2 && state.difficulty === 3) {
            starContext?.addStar('matchGameAI');
            if (!state.hasLostChanceInRun) {
                clearContext?.markAsCleared('matchGameAI');
            }
        }
    }, [state.difficulty, state.hasLostChanceInRun, previousDifficulty, starContext, clearContext]);
    // ===============================================

    // ✅ 서버 및 로컬 데이터 불러오기 (loadData)
    useEffect(() => {
        const loadData = async () => {
            try {
                await gameAudioManager.loadSoundsAsync();

                // 1. 서버에서 최신 matchGameAI 기록 1건 조회
                const serverRecords = await fetchRecord('matchGameAI', 1);
                const latest = Array.isArray(serverRecords) && serverRecords.length > 0 ? serverRecords[0] : null;

                // 2. 로컬 AsyncStorage 조회 (AI 모델용 qTable 확보)
                const savedData = await AsyncStorage.getItem(STORAGE_KEY);
                const localData = savedData ? JSON.parse(savedData) : null;

                // 3. 서버에 기록이 있으면 서버의 userStats와 difficulty를 최우선 반영
                if (latest && latest.user_stats) {
                    const parsedUserStats = typeof latest.user_stats === 'string'
                        ? JSON.parse(latest.user_stats)
                        : latest.user_stats;

                    const isWin = latest.round_result === 'WIN' || latest.roundResult === 'WIN';
                    const restoredDifficulty = localData?.difficulty ?? (isWin ? Number(latest.difficulty) + 1 : Number(latest.difficulty));

                    dispatch({
                        type: 'LOAD_DATA_SUCCESS',
                        payload: {
                            difficulty: restoredDifficulty || 1,
                            userStats: parsedUserStats,
                            qTable: localData?.qTable ?? initialQTable, // qTable은 로컬 모델 병합
                        }
                    });
                    return;
                }

                // 4. 서버 기록이 없으면 로컬 스토리지 데이터 사용
                if (localData) {
                    const { difficulty, qTable, userStats } = localData;
                    dispatch({ type: 'LOAD_DATA_SUCCESS', payload: { difficulty, qTable, userStats } });
                } else {
                    dispatch({ type: 'LOAD_DATA_FAILURE' });
                }
            } catch (e) {
                console.error("데이터 로딩/초기화 실패", e);
                dispatch({ type: 'LOAD_DATA_FAILURE' });
            }
        };
        loadData();
    }, []);

    /**
     * 🐾 화면을 떠나면 동물 12개를 **반납한다.**
     * 남겨두면 앱을 끌 때까지 AudioTrack 12칸을 붙잡아, 아무 소리도 내지 않으면서
     * 피아노·기타 예산을 그만큼 깎는다(안드로이드는 앱당 약 40개 제한).
     * 재진입 시 다시 만드는 것은 `startGame` 첫 줄이 맡는다.
     * 경위: `doc/audio-무음-원인과-방향.md`
     */
    useStopAudioOnBlur(() => {
        gameAudioManager.unloadAll();
    });

    // RESULTS 상태가 되면 전송
    useEffect(() => {
        if (state.status === 'RESULTS') {
            const endTime = Date.now();
            const durationSeconds = state.gameStartTime ? (endTime - state.gameStartTime) / 1000 : 0;

            const medicalDataPayload = {
                difficulty: state.playedDifficulty, // 💡 다음 난이도가 아닌 '플레이한' 난이도 전송
                score: state.score,
                roundResult: state.roundResult,
                userStats: state.userStats,         // 전체 통계
                wrong_selections: state.roundWrongAttempts, // 이번 판 오답
                error_count: state.roundWrongAttempts.length,
                completion_time_seconds: parseFloat(durationSeconds.toFixed(2)) // 소수점 2자리
            };

            console.log("🚀 [의료 데이터 전송] matchGameAI:", medicalDataPayload);
            void sendRecord('matchGameAI', medicalDataPayload);
        }
    }, [state.status]);

    useEffect(() => {
        if (state.status === 'RESULTS' || state.status === 'HOME') {
            const dataToSave = {
                difficulty: state.difficulty,
                qTable: state.qTable,
                userStats: state.userStats,
            };
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        }
    }, [state.status, state.difficulty, state.qTable, state.userStats]);
    
    const startGame = useCallback(async (mode: GameMode, isNewRun: boolean = false) => {
        const generation = ++playGeneration.current;
        // 떠났다 돌아온 뒤라면 여기서 다시 만든다 (이미 있으면 즉시 돌아온다)
        await gameAudioManager.loadSoundsAsync();
        if (playGeneration.current !== generation) return;

        let quizSounds: { name: string; file: any }[] = [];
        const soundCount = Math.min(state.difficulty + 2, SOUNDS_CONFIG.length);

        if (mode === 'WEAKNESS') {
            // [1] 시도 3회 이상 & 정답률 100% 미만인 '진짜 약점'만 오답률 높은 순으로 추출
            const trueWeaknesses = Object.entries(state.userStats)
                .filter(([_, stat]) => stat.total >= 3 && stat.correct / stat.total < 1.0)
                .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))
                .map(([name]) => name);

            // [2] 이번 난이도에 필요한 개수(soundCount)만큼 약점 동물을 먼저 채움
            const selectedWeakNames = trueWeaknesses.slice(0, soundCount);
            const remainingSlots = soundCount - selectedWeakNames.length;

            let finalSoundNames = [...selectedWeakNames];

            // [3] 빈자리가 남아있다면 나머지 동물들 중에서 랜덤으로 채움
            if (remainingSlots > 0) {
                const otherAnimals = SOUNDS_CONFIG
                    .map(s => s.name)
                    .filter(name => !selectedWeakNames.includes(name))
                    .sort(() => 0.5 - Math.random()) // 나머지 동물 무작위 셔플
                    .slice(0, remainingSlots);

                finalSoundNames = [...finalSoundNames, ...otherAnimals];
            }

            // [4] ★핵심★ 최종 뽑힌 동물들의 '소리 재생 순서'를 무작위로 뒤섞음
            quizSounds = SOUNDS_CONFIG
                .filter(s => finalSoundNames.includes(s.name))
                .sort(() => 0.5 - Math.random());
        } else {
            // 표준 모드(STANDARD): 전체 무작위 출제
            const shuffled = [...SOUNDS_CONFIG].sort(() => 0.5 - Math.random());
            quizSounds = shuffled.slice(0, soundCount);
        }

        // ✅ 소리 재생 전: "LISTENING" 상태로 전환
        dispatch({ type: 'SET_STATUS', payload: 'LISTENING' });
        if (playGeneration.current !== generation) return;

        // --- 디버그 로그 ---
        const playOrder = quizSounds.map((s) => s.name);
        console.log('[matchGameAI] 이번 라운드 재생 순서 (정답 후보):', playOrder.join(' → '));

        for (let i = 0; i < quizSounds.length; i++) {
            if (playGeneration.current !== generation) return;
            const sound = quizSounds[i];
            console.log(`[matchGameAI] 재생 ${i + 1}/${quizSounds.length}: "${sound.name}"`);
            await gameAudioManager.playSound(sound.name, () => playGeneration.current === generation);
            if (playGeneration.current !== generation) return;
            await new Promise(resolve => setTimeout(resolve, aud.motion.questionGapMs));
        }
        if (playGeneration.current !== generation) return;
        // --- /디버그 ---

        // 게임 시작 디스패치 (AI 버전 규격: 2단계 분리 디스패치)
        dispatch({ type: 'GAME_START_REQUEST', payload: { mode, isNewRun } });
        dispatch({
            type: 'GAME_START_SUCCESS',
            payload: { correctNames: new Set(quizSounds.map(s => s.name)) }
        });
    }, [state.difficulty, state.userStats, state.qTable]);


    const handleSelectAnswer = useCallback((selectedName: string) => {
        if (state.status !== 'PLAYING') return;
        const isCorrect = state.correctSoundNames.has(selectedName);
        dispatch({ type: 'SELECT_ANSWER', payload: { selectedName, isCorrect } });
    }, [state.status, state.correctSoundNames]);

    const navigate = (status: GameStatus) => dispatch({ type: 'SET_STATUS', payload: status });

    const tryLeaveToHome = useCallback((): boolean => {
        if (state.status === 'HOME' || state.status === 'LOADING') return false;
        playGeneration.current += 1;
        gameAudioManager.pauseAll();
        dispatch({ type: 'SET_STATUS', payload: 'HOME' });
        return true;
    }, [state.status]);

    return { state, startGame, handleSelectAnswer, navigate, tryLeaveToHome };
};

const HomeScreen = memo(({ onStartGame, onShowStats }: { onStartGame: (mode: GameMode, isNewRun: boolean) => void, onShowStats: () => void }) => (
    <View style={styles.centered}>
        <Text style={styles.mainTitle}>🎯 청능 훈련 (Q-Learning)</Text>
        <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => onStartGame('STANDARD', true)}
            activeOpacity={opacity.pressed}
            accessibilityRole="button"
            accessibilityLabel="표준 모드 시작"
        >
            <Text style={styles.primaryButtonText}>🎮 표준 모드</Text>
        </TouchableOpacity>
        <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onStartGame('WEAKNESS', true)}
            activeOpacity={opacity.pressed}
            accessibilityRole="button"
            accessibilityLabel="약점 훈련 모드 시작"
        >
            <Text style={styles.secondaryButtonText}>🔥 약점 훈련 모드</Text>
        </TouchableOpacity>
        <TouchableOpacity
            style={styles.statsButton}
            onPress={onShowStats}
            activeOpacity={opacity.pressed}
            accessibilityRole="button"
            accessibilityLabel="내 통계 보기"
        >
            <Text style={styles.statsButtonText} numberOfLines={1}>📊 내 통계 보기</Text>
        </TouchableOpacity>
    </View>
));

const GameScreen = memo(({ state, onSelect }: { state: GameState, onSelect: (name: string) => void }) => (
    <View style={styles.centered}>
        <Text style={styles.statusText}>난이도: {state.difficulty} | 남은 기회: {state.remainingChoices} | 점수: {state.score}</Text>
        <Text style={styles.statusText}>들었던 소리를 모두 선택하세요</Text>
        <View style={styles.gameBoard}>
            {SOUNDS_CONFIG.map(({ name }) => {
                const status = state.userSelections[name];
                return (
                    <TouchableOpacity
                        key={name}
                        style={[
                            styles.gameButton,
                            status === 'correct' && styles.correctButton,
                            status === 'incorrect' && styles.incorrectButton,
                        ]}
                        onPress={() => onSelect(name)}
                        disabled={!!status}
                        activeOpacity={opacity.choicePressed}
                        accessibilityRole="button"
                        // 정답·오답이 색으로만 구분돼 토크백에는 안 읽힌다 — 라벨이 결과를 말한다
                        accessibilityLabel={status ? `${name}, ${status === 'correct' ? '정답' : '오답'}` : name}
                        accessibilityState={{ disabled: !!status, selected: status === 'correct' }}
                    >
                        <Text style={styles.gameButtonText}>
                            {name}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    </View>
));

const ResultsScreen = memo(({ state, onContinue }: { state: GameState, onContinue: (mode: GameMode, isNewRun: boolean) => void }) => (
    <View style={styles.centered}>
        <Text style={styles.mainTitle}>{state.roundResult === 'WIN' ? '🎉 라운드 성공! 🎉' : '😥 라운드 실패 😥'}</Text>
        <Text style={styles.resultText}>최종 점수: {state.score}</Text>
        {state.roundResult === 'LOSE' && 
            <Text style={styles.resultText}>정답: {[...state.correctSoundNames].join(', ')}</Text>
        }
        <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => onContinue(state.mode, false)}
            activeOpacity={opacity.pressed}
            accessibilityRole="button"
            accessibilityLabel="계속하기"
        >
            <Text style={styles.primaryButtonText}>▶️ 계속하기</Text>
        </TouchableOpacity>
    </View>
));

const StatsScreen = memo(({ stats }: { stats: UserStats }) => {
    // 원래 로직: 약점 우선 정렬 (낮은 정확도부터)
    const sortedStats = Object.entries(stats)
        .sort(([,a],[,b])=>(a.total === 0 ? 1 : a.correct/a.total) - (b.total === 0 ? 1 : b.correct/b.total));
    
    // 전체 통계 계산
    const totalAttempts = sortedStats.reduce((sum, [, { total }]) => sum + total, 0);
    const totalCorrect = sortedStats.reduce((sum, [, { correct }]) => sum + correct, 0);
    const overallAccuracy = totalAttempts === 0 ? 0 : (totalCorrect / totalAttempts) * 100;

    // 등급 함수
    const getGrade = (correct: number, total: number) => {
        if (total === 0) return { emoji: '❓', label: '미도전', color: colors.gradeUntried };
        const acc = (correct / total) * 100;
        if (acc >= 90) return { emoji: '🔥', label: '완벽', color: colors.gradePerfect };
        if (acc >= 75) return { emoji: '⭐', label: '우수', color: colors.gradeExcellent };
        if (acc >= 50) return { emoji: '👍', label: '보통', color: colors.gradeNormal };
        return { emoji: '💪', label: '연습필요', color: colors.gradePractice };
    };

    return (
        <View style={styles.container}>
            <View style={styles.statsHeaderSection}>
                <Text style={styles.title}>📊 내 통계</Text>
                <View style={styles.overallStatsCard}>
                    <Text style={styles.overallStatsTitle}>전체 정확도</Text>
                    <Text style={styles.overallStatsValue}>
                        {totalAttempts === 0 ? 'N/A' : `${Math.round(overallAccuracy)}%`}
                    </Text>
                    <Text style={styles.overallStatsDetail}>
                        총 {totalAttempts}회 시도 · {totalCorrect}회 정답
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.statsContainer}>
                {sortedStats.map(([name, { correct, total }]) => {
                    const accuracy = total === 0 ? 'N/A' : `${Math.round((correct / total) * 100)}%`;
                    const grade = getGrade(correct, total);
                    return (
                        <View key={name} style={styles.statCard}>
                            <View style={styles.statCardHeader}>
                                <Text style={styles.statName}>{name}</Text>
                                <View style={styles.gradeContainer}>
                                    <Text style={styles.gradeEmoji}>{grade.emoji}</Text>
                                    <Text style={[styles.gradeLabel, { color: grade.color }]}>
                                        {grade.label}
                                    </Text>
                                </View>
                            </View>
                            
                            {total > 0 ? (
                                <>
                                    <View style={styles.progressBarContainer}>
                                        <View 
                                            style={[
                                                styles.progressBar, 
                                                { 
                                                    width: `${(correct / total) * 100}%`,
                                                    backgroundColor: grade.color 
                                                }
                                            ]} 
                                        />
                                    </View>
                                    <View style={styles.statDetails}>
                                        <Text style={styles.accuracyText}>
                                            {accuracy}
                                        </Text>
                                        <Text style={styles.attemptText}>
                                            {correct}/{total}회
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <Text style={styles.noDataText}>아직 시도하지 않았습니다</Text>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
});

// A의 lint(`react/display-name`) — 익명 `memo` 컴포넌트에 이름을 준다(go2가 `RiveAnimalGame`에 한 것과 같은 규칙).
HomeScreen.displayName = 'HomeScreen';
GameScreen.displayName = 'GameScreen';
ResultsScreen.displayName = 'ResultsScreen';
StatsScreen.displayName = 'StatsScreen';

export function MatchGameAIScreen({ leaveRef }: { leaveRef: MutableRefObject<MatchGameLeave | null> }) {
    const { state, startGame, handleSelectAnswer, navigate, tryLeaveToHome } = useAuditoryGame();

    useEffect(() => {
        leaveRef.current = tryLeaveToHome;
        return () => {
            leaveRef.current = null;
        };
    }, [leaveRef, tryLeaveToHome]);

    const renderScreen = () => {
        switch (state.status) {
            case 'HOME': return <HomeScreen onStartGame={startGame} onShowStats={() => navigate('STATS')} />;
            case 'PLAYING': return <GameScreen state={state} onSelect={handleSelectAnswer} />;
            case 'RESULTS': return <ResultsScreen state={state} onContinue={startGame} />;
            case 'STATS': return <StatsScreen stats={state.userStats} />;
            case 'LISTENING':
                return (
                    <View style={styles.loadingContainer}>
                    <WaveRipple
                        size={LAYOUT.waveAnimationSize}
                        color={colors.waveRipple}
                        style={styles.waveAnimation}
                    />
                    <Text style={styles.loadingText}>소리를 재생하고 있습니다...</Text>
                    </View>
                );
            case 'LOADING': default: return <View style={styles.centered}><ActivityIndicator size="large" color={colors.spinner} /></View>;
            }
        };

    return (
        <View style={styles.container}>
            {/* ====[ UI 추가: 미션 아이콘 ]==== */}
            {state.status !== 'LOADING' && state.status !== 'HOME' && (
              <MissionProgressIcon
                gameId="matchGameAI"
                title="Q-러닝 미션"
                missionText="난이도 3 도달하기"
                clearText="기회 소모 없이 난이도 3 도달"
                progressItems={[
                  { label: '현재 난이도', value: state.difficulty },
                  { label: '이번 런 기회 소모', value: state.hasLostChanceInRun ? '있음' : '없음' }
                ]}
              />
            )}
            {/* ================================ */}
            {renderScreen()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.screenBg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: LAYOUT.spacingMD },
    mainTitle: { fontSize: LAYOUT.sectionTitleFontSize, fontWeight: 'bold', color: colors.title, marginBottom: LAYOUT.spacingLG, textAlign: 'center' },
    title: { fontSize: LAYOUT.completionTextFontSize, fontWeight: 'bold', color: colors.title, marginBottom: LAYOUT.spacingLG, textAlign: 'center' },
    statusText: { fontSize: LAYOUT.hintTextFontSize, fontWeight: '500', color: colors.statusText, marginBottom: LAYOUT.spacingMD, textAlign: 'center' },
    gameBoard: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%' },
    resultText: { fontSize: LAYOUT.completedTitleFontSize, marginVertical: LAYOUT.spacingXS, textAlign: 'center' },
    statsHeaderSection: {
        paddingHorizontal: LAYOUT.spacingMD,
        paddingTop: LAYOUT.spacingMD,
        paddingBottom: LAYOUT.spacingSM,
    },
    overallStatsCard: {
        backgroundColor: colors.statsCardBg,
        borderRadius: LAYOUT.cardBorderRadius,
        padding: LAYOUT.spacingMD,
        marginTop: LAYOUT.spacingSM,
        elevation: aud.stats.overallCardElevation,
        alignItems: 'center',
    },
    overallStatsTitle: {
        fontSize: LAYOUT.smallButtonTextFontSize,
        color: colors.overallLabel,
        marginBottom: LAYOUT.spacingXS,
    },
    overallStatsValue: {
        fontSize: aud.stats.overallValueFontSize,
        fontWeight: 'bold',
        color: colors.overallValue,
        marginBottom: LAYOUT.spacingXS,
    },
    overallStatsDetail: {
        fontSize: LAYOUT.totalCountFontSize,
        color: colors.overallDetail,
    },
    statsContainer: { 
        paddingHorizontal: LAYOUT.spacingMD, 
        paddingTop: LAYOUT.spacingSM,
        paddingBottom: LAYOUT.spacingMD 
    },
    statCard: {
        backgroundColor: colors.statsCardBg,
        borderRadius: aud.stats.cardBorderRadius,
        padding: aud.stats.cardPadding,
        marginBottom: aud.stats.cardMarginBottom,
        elevation: aud.stats.cardElevation,
    },
    statCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: LAYOUT.spacingSM,
    },
    statName: {
        fontSize: LAYOUT.completedTitleFontSize,
        fontWeight: 'bold',
        color: colors.statName,
    },
    gradeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: LAYOUT.spacingXS,
    },
    gradeEmoji: {
        fontSize: LAYOUT.completedTitleFontSize,
    },
    gradeLabel: {
        fontSize: LAYOUT.totalCountFontSize,
        fontWeight: '600',
    },
    progressBarContainer: {
        height: aud.progress.barHeight,
        backgroundColor: colors.progressTrack,
        borderRadius: aud.progress.barBorderRadius,
        overflow: 'hidden',
        marginBottom: LAYOUT.spacingXS,
    },
    progressBar: {
        height: '100%',
        borderRadius: aud.progress.barBorderRadius,
    },
    statDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    accuracyText: {
        fontSize: LAYOUT.smallButtonTextFontSize,
        fontWeight: 'bold',
        color: colors.accuracyText,
    },
    attemptText: {
        fontSize: LAYOUT.totalCountFontSize,
        color: colors.attemptText,
    },
    noDataText: {
        fontSize: LAYOUT.totalCountFontSize,
        color: colors.noDataText,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: LAYOUT.spacingXS,
    },
    primaryButton: {
        backgroundColor: colors.primaryButtonBg,
        paddingVertical: LAYOUT.completeButtonPaddingV,
        paddingHorizontal: LAYOUT.spacingLG,
        borderRadius: LAYOUT.cardBorderRadius,
        marginVertical: LAYOUT.spacingXS,
        width: aud.button.primaryWidthPercent,
        elevation: aud.button.elevation,
    },
    primaryButtonText: {
        color: colors.buttonText,
        fontSize: LAYOUT.buttonTextFontSize,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    secondaryButton: {
        backgroundColor: colors.secondaryButtonBg,
        paddingVertical: LAYOUT.completeButtonPaddingV,
        paddingHorizontal: LAYOUT.spacingLG,
        borderRadius: LAYOUT.cardBorderRadius,
        marginVertical: LAYOUT.spacingXS,
        width: aud.button.primaryWidthPercent,
        elevation: aud.button.elevation,
    },
    secondaryButtonText: {
        color: colors.buttonText,
        fontSize: LAYOUT.buttonTextFontSize,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    statsButton: {
        backgroundColor: colors.statsButtonBg,
        paddingVertical: LAYOUT.completeButtonPaddingV,
        paddingHorizontal: LAYOUT.spacingLG,
        borderRadius: LAYOUT.cardBorderRadius,
        marginVertical: LAYOUT.spacingXS,
        width: aud.button.primaryWidthPercent,
        elevation: aud.button.elevation,
    },
    statsButtonText: {
        color: colors.buttonText,
        fontSize: LAYOUT.buttonTextFontSize,
        fontWeight: 'bold',
        textAlign: 'center',
        flexShrink: 0,
    },
    gameButton: {
        backgroundColor: colors.choiceBg,
        paddingVertical: LAYOUT.spacingSM,
        paddingHorizontal: LAYOUT.spacingMD,
        borderRadius: aud.choice.borderRadius,
        borderWidth: aud.choice.borderWidth,
        borderColor: colors.choiceBorder,
        margin: aud.choice.margin,
        minWidth: aud.choice.minWidth,
    },
    correctButton: {
        backgroundColor: colors.choiceCorrectBg,
        borderColor: colors.choiceCorrectBorder,
    },
    incorrectButton: {
        backgroundColor: colors.choiceIncorrectBg,
        borderColor: colors.choiceIncorrectBorder,
    },
    gameButtonText: {
        color: colors.choiceLabel,
        fontSize: LAYOUT.smallButtonTextFontSize,
        fontWeight: '600',
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: LAYOUT.loadingTextMarginTop,
        fontSize: LAYOUT.smallButtonTextFontSize,
        color: colors.loadingText,
        textAlign: 'center',
        fontWeight: '500',
    },
    waveAnimation: {
        width: LAYOUT.waveAnimationSize,
        height: LAYOUT.waveAnimationSize,
    },
});