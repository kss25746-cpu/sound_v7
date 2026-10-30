// B(`chongyeon-0708`) `app/(tabs)/new/(games)/orderGame.tsx`에서 반입. 라우트가 아니라 `다른 소리` 묶음(`OtherSoundsTabScreen`) 안 상태다.
// 상대경로 `assets/`는 `@/assets/chongyeon/`으로, 오디오 정리 훅은 이식본 `@/hooks/use-stop-audio-on-blur`로 붙였다.
// 게임 로직·UX는 B 그대로 살린다(정본 §2.3). 경위: `docs/app_go8.md`.

import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MissionProgressIcon from '../components/MissionProgressIcon';
import WaveRipple from '../components/WaveRipple';
import DraggableImage from '../components/game/DraggableImage';
import { ClearContext } from '../context/ClearContext';
import { StarContext } from '../context/StarContext';
import { LAYOUT } from '../constants/layout';
import * as og from '../constants/orderGameLayout';
import { colors, fontSize, opacity } from '../constants/orderGameTheme';
import { SOUNDS_WITH_IMAGE } from '../constants/animalSounds';
import { sendRecord } from '@/chongyeon/hooks/useSyncGameData';
import { useStopAudioOnBlur } from "@/hooks/use-stop-audio-on-blur";

const sounds = SOUNDS_WITH_IMAGE;

/** [DEBUG] 드롭존 디버깅 - false로 변경하면 로그 비활성화 */
const DEBUG_DROP = false;

export function OrderGameScreen() {
  const [playList, setPlayList] = useState<{ sound: AudioPlayer; name: string }[]>([]);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [correctSoundNames, setCorrectSoundNames] = useState<(string)[]>([]);
  const [dropZonesLayout, setDropZonesLayout] = useState<any[]>([]);
  const [droppedImages, setDroppedImages] = useState<(string | null)[]>([null, null, null]);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [showWaveAnimation, setShowWaveAnimation] = useState(false);
  const [draggingSource, setDraggingSource] = useState<'grid' | number | null>(null);
  const dropZoneRefs = useRef<(View | null)[]>([]);
  const dropZonesLayoutRef = useRef<any[]>([]);

  const starContext = useContext(StarContext);
  const clearContext = useContext(ClearContext);

  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [wrongSequences, setWrongSequences] = useState<string[][]>([]); // 틀렸던 순서들 누적 기록
  
  const DROP_ZONE_MARGIN = 20;

  const checkDropZone = (x: number, y: number) => {
    const zones = dropZonesLayoutRef.current;
    const m = DROP_ZONE_MARGIN;
    const idx = zones.findIndex((zone) => {
      if (!zone) return false;
      const { x: zoneX, y: zoneY, width, height } = zone;
      return x >= zoneX - m && x <= zoneX + width + m && y >= zoneY - m && y <= zoneY + height + m;
    });
    if (DEBUG_DROP) {
      console.log('[DROP] checkDropZone', { x, y, zones, result: idx });
    }
    return idx;
  };

  /** 드롭존 좌표 측정 (measureInWindow 우선, 0이면 measure fallback) */
  const measureDropZones = useCallback(() => {
    const measureOne = (ref: View | null, i: number): Promise<{ i: number; x: number; y: number; width: number; height: number } | null> =>
      new Promise((resolve) => {
        if (!ref) {
          resolve(null);
          return;
        }
        ref.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (DEBUG_DROP) console.log(`[DROP] measureInWindow zone${i}:`, { x, y, width, height });
          if (x !== 0 || y !== 0) {
            resolve({ i, x, y, width, height });
            return;
          }
          ref.measure((_x: number, _y: number, w: number, h: number, pageX: number, pageY: number) => {
            if (DEBUG_DROP) console.log(`[DROP] measure fallback zone${i}:`, { pageX, pageY, w, h });
            resolve({ i, x: pageX, y: pageY, width: w, height: h });
          });
        });
      });

    const promises = dropZoneRefs.current.map((ref, i) => measureOne(ref, i));
    Promise.all(promises).then((results) => {
      if (DEBUG_DROP) console.log('[DROP] measureDropZones results:', results);
      const newLayouts: any[] = [];
      results.forEach((r) => {
        if (r) newLayouts[r.i] = { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      dropZonesLayoutRef.current = newLayouts;
      setDropZonesLayout(newLayouts);
    });
  }, []);

  /** 게임 시작 시 드롭존 재측정 (레이아웃 안정화 대기) */
  useEffect(() => {
    if (isGameStarted && !showWaveAnimation) {
      const t = setTimeout(() => measureDropZones(), og.motion.measureOnStartMs);
      return () => clearTimeout(t);
    }
  }, [isGameStarted, showWaveAnimation, measureDropZones]);

  /** 문제음으로 로드된 사운드들. 탭을 떠날 때 멈추려면 state가 아니라 ref로도 들고 있어야 한다 */
  const questionSoundsRef = useRef<{ sound: AudioPlayer; name: string }[]>([]);
  /** 탭을 떠났다는 신호. 문제음 재생 루프가 이걸 보고 빠져나온다 */
  const leftScreenRef = useRef(false);

  /** 로드된 문제음을 전부 멈춘다 (언로드하지 않음 — endGame에서 정리한다) */
  const pauseQuestionSounds = () => {
    for (const soundObj of questionSoundsRef.current) {
      try {
        soundObj.sound.pause();
      } catch (error) { }
    }
  };

  // 🐾 탭(또는 이 게임 화면)을 떠날 때 문제음을 끊는다.
  // 소리가 겹쳐 들리는 것은 훈련 설계이므로 **탭 안 재생 순서·간격(1300ms)은 그대로 둔다.**
  // 떠났을 때만 루프가 중간에 빠져나오도록 신호를 준다.
  useStopAudioOnBlur(() => {
    leftScreenRef.current = true;
    pauseQuestionSounds();
  });

  /** 떠난 뒤 남은 재생을 중단하고 시작 전 상태로 되돌린다 */
  const abandonQuestionPlayback = async () => {
    pauseQuestionSounds();
    for (const soundObj of questionSoundsRef.current) {
      try {
        soundObj.sound.remove();
      } catch (error) { }
    }
    questionSoundsRef.current = [];
    setPlayList([]);
    setCorrectSoundNames([]);
    setShowWaveAnimation(false);
    setIsGameStarted(false);
  };

  const startGame = async () => {
    setAttemptCount(0);
    setWrongSequences([]); // 오답 기록 초기화
    setShowWaveAnimation(true);
    leftScreenRef.current = false;

    try {
      // 오디오 모드는 `AudioManagerProvider`가 앱 시작 시 1회 설정한다(4-B에서 일원화).
      // 여기 있던 `duckOthers` 설정은 앱 전체에 잔류하던 것이라 제거했다.

      // 선택된 3개의 사운드만 로드 (메모리 최적화 + 최대 안정성)
      const randomSounds = getRandomElements(sounds, 3);
      console.log('[소리 순서] 정답 3개:', randomSounds.map((s) => s.name).join(' → '));

      // 순차적 로드 (하나씩 안정적으로)
      const soundList: { sound: AudioPlayer; name: string }[] = [];

      for (const soundPath of randomSounds) {
        let retryCount = 0;
        const maxRetries = 2;
        let loadedSound: AudioPlayer | null = null;

        // 각 사운드마다 최대 2번 재시도
        while (retryCount <= maxRetries && !loadedSound) {
          try {
            const sound = createAudioPlayer(soundPath.sound, { updateInterval: 500 });
            loadedSound = sound;
            soundList.push({ sound, name: soundPath.name });
            break;
          } catch (error) {
            retryCount++;
            console.error(`❌ ${soundPath.name} 로드 실패 (${retryCount}/${maxRetries + 1}):`, error);

            if (retryCount <= maxRetries) {
              await new Promise(resolve => setTimeout(resolve, og.motion.loadRetryDelayMs)); // 재시도 전 대기
            }
          }
        }

        // 로드에 실패한 소리는 그냥 건너뛴다 (남은 것만으로 진행)
      }

      if (soundList.length === 0) {
        throw new Error('모든 사운드 로드에 실패했습니다.');
      }

      setPlayList(soundList);
      questionSoundsRef.current = soundList;

      // 로드하는 동안 탭을 떠났으면 소리를 내지 않고 접는다
      if (leftScreenRef.current) {
        await abandonQuestionPlayback();
        return;
      }

      // 소리 재생 (안정적 순차 재생)
      const correctNames = [];

      for (let i = 0; i < soundList.length; i++) {
        const soundObj = soundList[i];
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries) {
          try {
            soundObj.sound.play();
            correctNames.push(soundObj.name);
            break; // 성공하면 루프 탈출
          } catch (playError) {
            retryCount++;
            console.error(`❌ ${soundObj.name} 재생 실패 (${retryCount}/${maxRetries + 1}):`, playError);

            if (retryCount <= maxRetries) {
              await new Promise(resolve => setTimeout(resolve, og.motion.playRetryDelayMs)); // 재시도 전 잠시 대기
            } else {
              correctNames.push(soundObj.name); // 실패해도 이름은 추가
            }
          }
        }

        // 각 소리 사이 간격 (마지막 소리 제외)
        if (i < soundList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, og.motion.questionGapMs));
        }

        // 재생 도중 탭을 떠났으면 남은 소리는 내지 않는다
        if (leftScreenRef.current) {
          await abandonQuestionPlayback();
          return;
        }
      }

      if (correctNames.length === 0) {
        throw new Error('모든 소리 재생에 실패했습니다.');
      }

      setCorrectSoundNames(correctNames);

      // 소리 재생이 완전히 끝난 후 약간의 추가 대기 (사용자 경험 개선)
      await new Promise(resolve => setTimeout(resolve, og.motion.afterQuestionsDelayMs));

      if (leftScreenRef.current) {
        await abandonQuestionPlayback();
        return;
      }

      setShowWaveAnimation(false);
      setIsGameStarted(true);

      Alert.alert(
        '🎵 준비 완료!',
        '소리를 듣고 순서를 맞춰보세요! 🔀',
        [
          {
            text: '시작하기',
            onPress: () => setGameStartTime(Date.now()), // 시간 측정 시작
            style: 'default',
          },
        ],
        {
          cancelable: false,
        }
      );

    } catch (error) {
      console.error('게임 시작 오류:', error);
      setShowWaveAnimation(false);

      Alert.alert(
        '⚠️ 음성 로드 실패',
        '소리를 불러올 수 없어요. 앱을 다시 시작해주세요.',
        [
          {
            text: '확인',
            style: 'default',
          },
        ]
      );
    }
  };

  const submit = () => {
    if (droppedImages.includes(null)) {
      Alert.alert(
        '⚠️ 확인 필요',
        '빈 공간을 모두 채워주세요.',
        [
          {
            text: '확인',
            style: 'default',
          },
        ]
      );
      return;
    }

    const currentAttempt = attemptCount + 1;
    setAttemptCount(currentAttempt);
    
    let correct = true;
    for (let i = 0; i < correctSoundNames.length; i++) {
      if (correctSoundNames[i] != droppedImages[i]) {
        correct = false;
        break;
      }
    }

    if (correct) {
      // 데이터 전송. 「정답 제출」 onPress — 렌더가 아니다 (기타의 프렛 핸들러와 같은 처리, go3)
      // eslint-disable-next-line react-hooks/purity -- 완료 시각
      const endTime = Date.now();
      const durationSeconds = gameStartTime ? (endTime - gameStartTime) / 1000 : 0;

      const medicalDataPayload = {
        presented_sequence: correctSoundNames,       // 정답 순서 (예: ['개', '소', '말'])
        wrong_sequences: [...wrongSequences],        // 환자가 시도했던 오답 배열들
        total_attempts: currentAttempt,              // 총 시도 횟수
        completion_time_seconds: parseFloat(durationSeconds.toFixed(2)), // 소요 시간 (소수점 2자리)
        is_perfect: currentAttempt === 1             // 한 번에 맞췄는지 여부
      };

      console.log("🚀 [의료 데이터 전송] orderGame:", medicalDataPayload);
      void sendRecord('orderGame', medicalDataPayload); // 서버 전송

      Alert.alert(
        '🎉 축하합니다!',
        '정답을 맞추셨어요! 정말 대단해요! 🌟',
        [
          {
            text: '확인',
            style: 'default',
          },
        ]
      );

      starContext?.addStar('orderGame');
      if (currentAttempt === 1) {
        clearContext?.markAsCleared('orderGame');
      }
      endGame();
    } else {
      // 틀렸을 때 환자가 배치한 순서를 기록에 추가
      setWrongSequences(prev => [...prev, [...droppedImages] as string[]]);

      Alert.alert(
        '😅 아쉬워요!',
        '다시 시도해보세요!',
        [
          {
            text: '다시 시도',
            style: 'default',
          },
        ]
      );
    }
  }

  const endGame = async () => {
    for (const soundObj of playList) {
      try {
        if (soundObj.sound.currentStatus.isLoaded) {
          soundObj.sound.remove();
        }
      } catch (error) {
        console.error(`${soundObj.name} 해제 오류: `, error);
      }
    }

    questionSoundsRef.current = [];
    setIsGameStarted(false);
    setPlayList([]);
    setDroppedImages([null, null, null]);
  };


  const getRandomElements = (arr: any[], num: number): any[] => {
    const result: any[] = [];
    const seenIndexes = new Set<number>();

    while (result.length < num) {
      const randomIndex = Math.floor(Math.random() * arr.length);
      if (!seenIndexes.has(randomIndex)) {
        result.push(arr[randomIndex]);
        seenIndexes.add(randomIndex);
      }
    }
    return result;
  };


  const handleDrop = (
    imageIndex: number,
    targetZoneIndex: number,
    sourceZoneIndex?: number
  ): boolean => {
    if (DEBUG_DROP) {
      console.log('[DROP] handleDrop', { imageIndex, targetZoneIndex, sourceZoneIndex });
    }
    const imageName = sounds[imageIndex].name;
    let consumed = false;

    setDroppedImages((prev) => {
      const newDroppedImages = [...prev];
      if (sourceZoneIndex !== undefined) {
        if (targetZoneIndex === -1) {
          newDroppedImages[sourceZoneIndex] = null;
          consumed = true;
        } else if (sourceZoneIndex === targetZoneIndex) {
          return prev;
        } else {
          const imageThatWasInTarget = newDroppedImages[targetZoneIndex];
          newDroppedImages[targetZoneIndex] = imageName;
          newDroppedImages[sourceZoneIndex] = imageThatWasInTarget;
          consumed = true;
        }
      } else {
        if (targetZoneIndex !== -1) {
          const existingIndex = newDroppedImages.indexOf(imageName);
          if (existingIndex > -1) {
            newDroppedImages[existingIndex] = null;
          }
          newDroppedImages[targetZoneIndex] = imageName;
          consumed = true;
        }
      }
      return newDroppedImages;
    });
    return consumed;
  };

  return (
    <View style={styles.big_container}>
      <View style={styles.container}>
        {/* Wave 애니메이션 */}
        {showWaveAnimation && (
          <View style={styles.waveContainer}>
            <WaveRipple
              size={LAYOUT.waveAnimationSize}
              color={colors.waveRipple}
              style={styles.waveAnimation}
            />
            <Text style={styles.loadingText}>소리를 재생하고 있습니다...</Text>
          </View>
        )}

        {/* 게임 시작 버튼 */}
        {!isGameStarted && !showWaveAnimation && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={startGame}
            activeOpacity={opacity.pressed}
            accessibilityRole="button"
            accessibilityLabel="게임 시작"
          >
            <Ionicons name="game-controller-outline" size={og.button.iconSize} color={colors.buttonText} />
            <Text style={styles.startButtonText} numberOfLines={1}>게임시작</Text>
          </TouchableOpacity>
        )}

        {/* 게임 진행 중 UI */}
        {isGameStarted && !showWaveAnimation && (
          <ScrollView
            style={{ flexGrow: 1 }}
            contentContainerStyle={{ alignItems: 'center', paddingTop: og.play.paddingTop }}
            onScrollEndDrag={measureDropZones}
            onMomentumScrollEnd={measureDropZones}
          >
            {DEBUG_DROP && (
              <Text style={styles.debugText}>
                zones: {dropZonesLayout.filter(Boolean).length}/3
                {dropZonesLayout[0] && ` [0]x=${Math.round(dropZonesLayout[0].x)} y=${Math.round(dropZonesLayout[0].y)}`}
              </Text>
            )}
            {/* 드래그 가능한 이미지들 */}
            <View style={[styles.imagesContainer, draggingSource === 'grid' && { zIndex: og.zIndex.draggingLayer, elevation: og.zIndex.draggingLayer }]}>
              {sounds.map((soundItem, index) => {
                const isDropped = droppedImages.includes(soundItem.name);
                return (
                  <DraggableImage
                    key={`top-${soundItem.name}`}
                    image={soundItem.image}
                    index={index}
                    name={soundItem.name}
                    onDrop={handleDrop}
                    onDragStart={(sourceZoneIndex) => setDraggingSource(sourceZoneIndex ?? 'grid')}
                    onDragEnd={() => setDraggingSource(null)}
                    disabled={isDropped}
                    checkDropZone={checkDropZone}
                    debug={DEBUG_DROP}
                  />
                );
              })}
            </View>

            {/* 드롭 존 */}
            <View style={styles.dropZoneContainer}>
              {Array.from({ length: 3 }, (_, i) => {
                const imageName = droppedImages[i];
                const soundItem = sounds.find((s) => s.name === imageName);
                return (
                  <View
                    key={`zone-${i}`}
                    ref={(el) => {
                      dropZoneRefs.current[i] = el;
                    }}
                    // 끄는 칸은 **이 바깥 칸**을 올린다. 형제(옆 칸) 사이 순서는 여기서 정해지고,
                    // 안쪽(dropZoneInner)만 올리면 오른쪽 칸 배경 뒤로 카드가 숨는다.
                    // elevation은 배경 있는 칸에 그림자를 그려서 zIndex만 준다.
                    style={[styles.dropZone, draggingSource === i && { zIndex: og.zIndex.draggingLayer }]}
                    onLayout={() => {
                      setTimeout(() => measureDropZones(), og.motion.measureOnLayoutMs);
                    }}
                    collapsable={false}
                  >
                    <View style={[styles.dropZoneInner, draggingSource === i && { zIndex: og.zIndex.draggingLayer, elevation: og.zIndex.draggingLayer }]}>
                      {imageName && soundItem ? (
                        // 동물이 바뀌면 카드를 새로 만든다. 같은 칸에서 재사용하면 끌기 상태가
                        // 앞 동물 것으로 남는다(DraggableImage의 latestRef와 이중 방어).
                        <DraggableImage
                          key={`zone-${i}-${soundItem.name}`}
                          image={soundItem.image}
                          index={sounds.indexOf(soundItem)}
                          name={soundItem.name}
                          onDrop={handleDrop}
                          onDragStart={(sourceZoneIndex) => setDraggingSource(sourceZoneIndex ?? 'grid')}
                          onDragEnd={() => setDraggingSource(null)}
                          sourceZoneIndex={i}
                          checkDropZone={checkDropZone}
                          debug={DEBUG_DROP}
                        />
                      ) : (
                        <Text
                          style={{ color: colors.dropZonePlaceholder }}
                          accessibilityLabel={`${i + 1}번째 자리, 비어 있음`}
                        >
                          놓는곳
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={submit}
              activeOpacity={opacity.pressed}
              accessibilityRole="button"
              accessibilityLabel="정답 제출"
            >
              <Ionicons name="checkmark-circle-outline" size={og.button.iconSize} color={colors.buttonText} />
              <Text style={styles.submitButtonText}>정답 제출</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      <MissionProgressIcon
        gameId="orderGame"
        title="소리 순서 미션"
        missionText="정답 맞추기"
        clearText="첫 번째 시도에서 정답 맞추기"
        progressItems={[
          { label: '현재 시도 횟수', value: `${attemptCount}회` }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  big_container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.screenBg,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: LAYOUT.spacingMD,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: og.grid.padding,
    marginBottom: og.grid.marginBottom,
  },
  dropZoneContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    height: og.dropZone.containerHeight,
  },
  dropZone: {
    width: og.card.size,
    height: og.card.size,
    backgroundColor: colors.dropZoneBg,
    borderWidth: og.dropZone.borderWidth,
    borderColor: colors.dropZoneBorder,
    borderStyle: 'dashed',
    margin: og.dropZone.margin,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropZoneInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveAnimation: {
    width: LAYOUT.waveAnimationSize,
    height: LAYOUT.waveAnimationSize,
  },
  loadingText: {
    marginTop: LAYOUT.loadingTextMarginTop,
    fontSize: LAYOUT.smallButtonTextFontSize,
    color: colors.loadingText,
    textAlign: 'center',
  },
  debugText: {
    fontSize: fontSize.debugText,
    color: colors.debugText,
    marginBottom: og.debug.textMarginBottom,
  },
  /** 버튼 둘 다 Ionicons + 글자 한 줄 (orderGameLayout.ts 1절) */
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: og.button.iconGap,
    backgroundColor: colors.startButtonBg,
    paddingVertical: LAYOUT.completeButtonPaddingV,
    paddingHorizontal: LAYOUT.spacingLG,
    borderRadius: og.button.borderRadius,
    elevation: og.button.elevation,
    minWidth: og.button.minWidth,
  },
  startButtonText: {
    color: colors.buttonText,
    fontSize: LAYOUT.buttonTextFontSize,
    fontWeight: 'bold',
    textAlign: 'center',
    flexShrink: 0,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: og.button.iconGap,
    backgroundColor: colors.submitButtonBg,
    paddingVertical: LAYOUT.completeButtonPaddingV,
    paddingHorizontal: LAYOUT.spacingLG,
    borderRadius: og.button.borderRadius,
    marginTop: og.button.submitMarginTop,
    elevation: og.button.elevation,
    minWidth: og.button.minWidth,
  },
  submitButtonText: {
    color: colors.buttonText,
    fontSize: LAYOUT.buttonTextFontSize,
    fontWeight: 'bold',
    textAlign: 'center',
    flexShrink: 0,
  },
});