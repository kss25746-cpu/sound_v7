import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useState, type ReactNode } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ClearContext } from '../context/ClearContext';
import { StarContext } from '../context/StarContext';

/**
 * 아이콘 색 — **밝기가 아니라 색상으로** 세 단계를 가른다.
 *
 * 이 컴포넌트는 검은 배경(피아노 `#000` · 기타 `#0B0E13`)과 흰 배경(게임 4화면
 * `#ffffff`~`#f0f0f0`) **양쪽에** 올라간다. 밝기로만 구분하면 밝은 쪽이 흰 배경에서
 * 사라진다 — 예전 은색 `#c0c0c0`이 회색 `#a0a0a0`과 구분되지 않던 이유다.
 */
const ICON_COLOR = {
  /** 아무것도 못 얻음 */
  none: '#a0a0a0',
  /** 하나라도 별을 얻음. 동메달 → 금메달 순서라 뜻도 읽힌다 */
  partial: '#CD7F32',
  /** 전부 클리어 */
  cleared: '#FFD700',
} as const;

/**
 * 2안 「콘솔」 팔레트 — 8개 화면이 **같은 값을 쓴다.**
 *
 * 패널이 스스로 어두운 판이라, 밑에 깔린 화면이 검든 희든 모양이 변하지 않는다.
 * 보라 `#8B6BFF`·핑크 `#FF5FA2`는 기타 라임 `#A8E85C`·시안 `#5CD0E8`,
 * 피아노 노랑 `#FFD166`과 색역이 겹치지 않는다.
 */
const C = {
  panel: '#17122B',
  surfaceInset: '#100C20',
  surfaceRow: '#1C1634',
  surfaceTile: '#211A3D',
  line: '#2C244F',
  accent: '#8B6BFF',
  /** 보라 버튼 위에 얹는 글자. 흰 글자보다 이쪽이 대비가 높다 */
  accentInk: '#14102A',
  pink: '#FF5FA2',
  textPrimary: '#F4F1FF',
  textSecondary: '#C8C0E8',
  textMuted: '#9B90C0',
  starInk: '#FFFFFF',
} as const;

/** 시안 기준값 (390pt 캔버스) */
const PANEL_WIDTH = 358;
/** 가로에서 두 칸으로 펼칠 때의 폭. 한 칸이 시안 패널의 속폭(310)과 비슷해진다 */
const PANEL_WIDTH_LANDSCAPE = 760;
const PANEL_PAD = 24;
/** 피아노 5줄(52×5 + 8×4 = 292)이 다 보이는 높이 */
const LIST_CAP = 300;
/**
 * 세로에서 목록 밖이 먹는 높이.
 * 패널 패딩 48 + 제목 34 + 레일 75 + 여백 16 + 배지 125 + 「레벨별 기록」 48
 * + 목록 판 여백·패딩 34 + 버튼 74 ≈ 454. 조금 넉넉히 잡는다.
 */
const PORTRAIT_CHROME = 460;
/**
 * 가로 **오른쪽 칸**에서 목록 밖이 먹는 높이.
 * 패널 패딩 48 + 제목 34 + 목록 판 여백 10 + 목록 판 패딩 24 = 116.
 *
 * 「닫기」가 여기 있지 않다 — 가로에서는 **왼쪽 칸 바닥**으로 내린다. 실기기(885×419dp)에서
 * 배지 아래가 126dp 비는데 목록은 5줄 중 3.6줄만 보였다. 버튼을 옮겨 그 74dp를 목록에 준다.
 * (목록 판 안쪽 패딩 24를 빼먹으면 가로에서 아래가 잘린다 — 실제로 한 번 틀렸다)
 */
const LANDSCAPE_CHROME = 116;
const ROW_HEIGHT = 52;
const ROW_GAP = 8;
const RING_SIZE = 34;
const RING_STROKE = 4;
const STEP_NODE = 26;
/** 링이 각도로 그리는 목표 횟수. 지금 피아노·기타 미션이 모두 「누적 3회」다 */
const DEFAULT_STAR_TARGET = 3;

/** 난이도가 있는 화면(피아노 5 · 기타 4)이 넘기는 형태. 링·스텝 레일은 이때만 그린다 */
export interface MissionLevelItem {
  name: string;
  /** 누적 성공 횟수 — 링의 각도가 된다 */
  count: number;
  /** 최고 점수 */
  best: number;
  star?: boolean;
  cleared?: boolean;
}

/** 난이도 구분이 없는 화면(매칭 3종 · 순서)이 쓰던 형태. 그대로 받는다 */
export interface MissionPlainItem {
  label: string;
  value: string | number;
}

export type MissionProgressItem = MissionLevelItem | MissionPlainItem;

const isLevelItem = (item: MissionProgressItem): item is MissionLevelItem =>
  typeof (item as MissionLevelItem).name === 'string';

// 컴포넌트가 받을 props의 타입을 정의합니다.
interface MissionProgressIconProps {
  gameId: string;
  title: string;
  missionText: string;
  clearText: string;
  /**
   * 난이도 항목(`{name,count,best,star,cleared}`)이면 링과 스텝 레일이 붙고,
   * 예전 `{label,value}` 항목이면 글자 행만 나온다. 섞어 넘기지 말 것.
   *
   * 문자열을 파싱해 숫자를 꺼내지 않는다 — 문구가 바뀌면 조용히 깨진다.
   */
  progressItems: MissionProgressItem[];
  /** 우상단 위치를 화면이 정한다. 악기 두 화면은 `useInstrumentMetrics().missionIconStyle`을 넘긴다 */
  style?: StyleProp<ViewStyle>;
  /**
   * 넘기면 제목 오른쪽에 「초기화」가 생긴다(피아노 · 기타).
   * 별·클리어는 이 컴포넌트가 이 미션 키만 지우고, 화면은 자기 기록만 지운다.
   */
  onReset?: () => void | Promise<void>;
  /**
   * 난이도별로 별·클리어가 갈리는 화면(피아노 5단계 · 기타 4단계)은 난이도 이름을 넘긴다.
   * 저장 키가 `${gameId}_${난이도}` 꼴이기 때문이다.
   *
   * 안 넘기면 `gameId` 하나로 판정한다 (게임 화면들이 그렇다).
   */
  levelNames?: string[];
  /** 링이 가득 차는 누적 횟수. 미션 조건이 바뀌면 이 값도 바꾼다 (기본 3) */
  starTarget?: number;
  /**
   * 기본 우상단 물음표 대신 쓸 트리거.
   * 기타 A안은 하단 미션 고리가 이 모달을 연다.
   */
  renderTrigger?: (opts: { onPress: () => void; iconColor: string }) => ReactNode;
}

export default function MissionProgressIcon({
  gameId,
  title,
  missionText,
  clearText,
  progressItems,
  style,
  onReset,
  levelNames,
  starTarget = DEFAULT_STAR_TARGET,
  renderTrigger,
}: MissionProgressIconProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const starContext = useContext(StarContext);
  const clearContext = useContext(ClearContext);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // 컨텍스트 데이터가 없으면 아무것도 렌더링하지 않습니다.
  if (!starContext || !clearContext) {
    return null;
  }

  // 난이도가 여럿인 화면은 난이도별 키를, 아니면 gameId 하나를 본다
  const keys = levelNames?.length
    ? levelNames.map(level => `${gameId}_${level}`)
    : [gameId];

  /**
   * 이 미션의 별·클리어만 지우고, 화면 자기 기록(누적·최고점)은 `onReset`이 지운다.
   * 예전에는 `resetAll`이라 피아노 초기화가 기타·동물 게임 별·클리어까지 지웠다.
   */
  const handleReset = () => {
    Alert.alert(
      '데이터 초기화',
      `${title}의 별·클리어와 레벨별 기록을 초기화하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            try {
              starContext.resetKeys(keys);
              clearContext.resetKeys(keys);
              if (onReset) {
                await onReset();
              }
              Alert.alert('초기화 완료', '기록이 성공적으로 초기화되었습니다.');
            } catch (e) {
              console.error('Reset failed', e);
            }
          }
        }
      ]
    );
  };
  const starCount = keys.filter(key => starContext.starData[key]).length;
  const clearCount = keys.filter(key => clearContext.clearData[key]).length;

  // 모달의 별·체크 표시는 예전대로 **전부 달성**이 기준이다
  const hasStar = starCount === keys.length;
  const isCleared = clearCount === keys.length;

  /**
   * 아이콘 색은 **하나만 얻어도 바뀐다.**
   * 전부 달성해야 바뀌면 피아노는 다섯 단계를 채우는 동안 아무 변화가 없어,
   * 별을 얻었는지 모달을 열어야만 알 수 있었다.
   */
  const iconColor = isCleared
    ? ICON_COLOR.cleared
    : starCount > 0
      ? ICON_COLOR.partial
      : ICON_COLOR.none;

  const levelItems = progressItems.filter(isLevelItem);
  /** 섞여 들어오면 레일을 그리지 않는다 — 반쯤 그린 레일이 더 헷갈린다 */
  const hasLevels = levelItems.length > 1 && levelItems.length === progressItems.length;

  /**
   * **가로에서는 두 칸으로 접는다.**
   *
   * 난이도가 붙는 두 화면(피아노 · 기타)은 `InstTabScreen`의 `LANDSCAPE_TRACKS`가
   * **가로로 잠근다.** 가로 높이는 390 남짓인데 제목·레일·배지·버튼만 460을 먹어서,
   * 세로로 쌓으면 위아래가 잘린다 — 글자를 줄이는 게 아니라 레이아웃을 바꾼다(디자인 제약).
   *
   * 왼쪽 칸 = 제목 · 스텝 레일 · 배지 두 장 (**항상 보인다**)
   * 오른쪽 칸 = 「레벨별 기록」 · 목록(**여기만 스크롤**) · 닫기
   */
  const isLandscape = screenWidth > screenHeight;

  /** 가로는 좌우를 96 비운다 — 노치가 옆으로 오는 기기에서 패널 모서리가 물리지 않게 */
  const panelWidth = isLandscape
    ? Math.min(PANEL_WIDTH_LANDSCAPE, screenWidth - 96)
    : Math.min(PANEL_WIDTH, screenWidth - 32);
  const panelMaxHeight = screenHeight - 32;
  /**
   * **스크롤은 진행 항목에만.** 제목·별·클리어는 항상 보인다 (확정사항).
   * 목록 밖이 먹는 높이를 빼고 남는 만큼만 목록에 준다.
   * 세로는 제목·레일·배지·버튼까지 약 460, 가로는 오른쪽 칸의 제목·버튼·여백만 약 156이다.
   * 피아노 5줄(292)은 큰 세로 화면에서 스크롤 없이 들어간다.
   */
  const listMaxHeight = Math.max(
    72,
    Math.min(
      LIST_CAP,
      isLandscape
        ? panelMaxHeight - LANDSCAPE_CHROME
        : screenHeight * 0.92 - PORTRAIT_CHROME,
    ),
  );

  /**
   * 「닫기」는 **세로면 패널 바닥, 가로면 왼쪽 칸 바닥**에 붙는다.
   * 가로에서 배지 아래가 크게 비는데 목록은 모자랐기 때문이다 — 빈자리에 버튼을 넣고
   * 그만큼(여백 20 + 높이 54 = 74) 목록에 돌려준다.
   */
  const closeButton = (
    <TouchableOpacity
      style={[styles.closeButton, isLandscape && styles.closeButtonLandscape]}
      onPress={() => setModalVisible(false)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="닫기"
    >
      <Text style={styles.closeButtonText}>닫기</Text>
    </TouchableOpacity>
  );

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ onPress: () => setModalVisible(true), iconColor })
      ) : (
        <TouchableOpacity
          style={[styles.iconContainer, style]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`${title} 안내 열기`}
        >
          <Ionicons name="help-circle-outline" size={32} color={iconColor} importantForAccessibility="no" />
        </TouchableOpacity>
      )}

      {/* 아이콘 클릭 시 나타날 모달 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent
        /**
         * iOS는 이걸 안 주면 모달이 **세로로 고정된다** (기본값이 `['portrait']`).
         * 피아노·기타는 가로로 잠긴 화면이라 모달만 누워 있게 된다.
         */
        supportedOrientations={['portrait', 'portrait-upside-down', 'landscape']}
      >
        <View style={styles.modalContainer}>
          {/* Sibling Pressable Backdrop to capture background taps without blocking child gestures */}
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="미션 안내 닫기"
          />

          <View
            style={[
              styles.panel,
              { width: panelWidth, maxHeight: panelMaxHeight },
              isLandscape && styles.panelLandscape,
            ]}
          >
            {/* 왼쪽 칸(가로) / 위쪽(세로) — 항상 보이는 것들 */}
            <View style={isLandscape ? styles.column : undefined}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{title}</Text>
                {/* 시안에는 없지만 유지한다(2026-10-23 결정). `onReset`을 넘긴 화면에만 보인다 */}
                {onReset ? (
                  <TouchableOpacity
                    onPress={handleReset}
                    style={styles.resetButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="별·클리어 기록 초기화"
                  >
                    <Text style={styles.resetLabel} importantForAccessibility="no">초기화</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {hasLevels ? <StepRail items={levelItems} /> : null}

              <View style={styles.tileRow}>
                <BadgeTile
                  icon={hasStar ? 'star' : 'star-outline'}
                  achieved={hasStar}
                  label={`별 · ${hasStar ? '획득' : '미획득'}`}
                  body={missionText}
                  accessibilityLabel={`별 ${hasStar ? '획득' : '미획득'}. 조건 ${missionText}`}
                />
                <BadgeTile
                  icon={isCleared ? 'checkmark-circle' : 'ellipse-outline'}
                  achieved={isCleared}
                  label={`클리어 · ${isCleared ? '달성' : '미달성'}`}
                  body={clearText}
                  accessibilityLabel={`${isCleared ? '클리어함' : '클리어 못 함'}. 조건 ${clearText}`}
                />
              </View>

              {isLandscape ? closeButton : null}
            </View>

            {/* 오른쪽 칸(가로) / 아래쪽(세로) — 목록과 닫기 */}
            <View style={isLandscape ? styles.column : undefined}>
              <Text style={[styles.sectionTitle, isLandscape && styles.sectionTitleLandscape]}>
                {hasLevels ? '레벨별 기록' : '현재 진행 상황'}
              </Text>

              <View style={styles.listInset}>
                <ScrollView
                  style={{ maxHeight: listMaxHeight }}
                  showsVerticalScrollIndicator={true}
                >
                  {progressItems.map((item, index) => (
                    <View key={index} style={index > 0 ? { marginTop: ROW_GAP } : undefined}>
                      {isLevelItem(item) ? (
                        <LevelRow item={item} target={starTarget} />
                      ) : (
                        <PlainRow item={item} />
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>

              {isLandscape ? null : closeButton}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/**
 * 스텝 레일 — 난이도 다섯(기타는 넷)을 한 줄로 세운다.
 * 채워진 노드 = 그 난이도의 별을 얻었다는 뜻이고, 노드 사이 선은 **양쪽이 다 채워졌을 때만** 밝다.
 */
function StepRail({ items }: { items: MissionLevelItem[] }) {
  const starred = items.filter(item => item.star).length;
  return (
    <View
      style={styles.stepRail}
      accessibilityRole="text"
      accessibilityLabel={`난이도 ${items.length}단계 중 별 ${starred}단계 획득`}
    >
      {items.map((item, index) => {
        const filled = !!item.star;
        const next = items[index + 1];
        return (
          <View key={item.name} style={styles.stepColumn} importantForAccessibility="no-hide-descendants">
            {/**
             * 다음 노드로 가는 선은 **이 칸**에서 오른쪽으로 내민다.
             * 뒤 칸에 그려 왼쪽으로 내밀면, 뒤 칸이 나중에 그려지는 탓에 그 선이
             * **앞 노드 위를 덮는다** — 실기기에서 별 오른쪽 절반이 잘려 나갔다.
             */}
            {next ? (
              <View style={[styles.stepLink, filled && !!next.star && { backgroundColor: C.accent }]} />
            ) : null}
            <View style={[styles.stepNode, filled ? styles.stepNodeOn : styles.stepNodeOff]}>
              {filled ? <Ionicons name="star" size={13} color={C.starInk} /> : null}
            </View>
            <Text style={[styles.stepLabel, filled && styles.stepLabelOn]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** 별·클리어 두 칸. 달성하면 아이콘과 라벨이 핑크로 돈다 */
function BadgeTile({
  icon,
  achieved,
  label,
  body,
  accessibilityLabel,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  achieved: boolean;
  label: string;
  body: string;
  accessibilityLabel: string;
}) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={accessibilityLabel}>
      <View style={styles.tileHead}>
        <Ionicons name={icon} size={20} color={achieved ? C.pink : C.textMuted} importantForAccessibility="no" />
        <Text style={[styles.tileLabel, achieved && { color: C.pink }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.tileBody}>{body}</Text>
    </View>
  );
}

/** 난이도 한 줄 — 링(누적) · 이름 · 최고점 · 클리어 체크 */
function LevelRow({ item, target }: { item: MissionLevelItem; target: number }) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={
        `${item.name}. 누적 ${item.count}회, 최고 ${item.best}점. ` +
        `별 ${item.star ? '획득' : '미획득'}, ${item.cleared ? '클리어함' : '클리어 못 함'}`
      }
    >
      <ProgressRing count={item.count} target={target} star={!!item.star} />
      <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
      <View style={styles.rowSpacer} />
      <Text style={styles.rowBest} numberOfLines={1}>최고 {item.best}점</Text>
      {item.cleared ? (
        <Ionicons name="checkmark" size={18} color={C.pink} style={styles.rowCheck} importantForAccessibility="no" />
      ) : (
        <View style={styles.rowCheckHole} />
      )}
    </View>
  );
}

/** 난이도가 없는 화면(매칭·순서)이 쓰던 글자 행 */
function PlainRow({ item }: { item: MissionPlainItem }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${item.label} ${item.value}`}>
      <Text style={styles.rowName} numberOfLines={1}>{item.label}</Text>
      <View style={styles.rowSpacer} />
      <Text style={styles.rowBest} numberOfLines={1}>{item.value}</Text>
    </View>
  );
}

/**
 * 누적 횟수를 각도로 그리는 링. 12시에서 시계방향.
 * 별을 얻었으면 가득 찬 원 안에 ★, 0회면 트랙만 남고 가운데에 숫자 `0`이 선다.
 */
function ProgressRing({ count, target, star }: { count: number; target: number; star: boolean }) {
  const r = (RING_SIZE - RING_STROKE) / 2;
  const center = RING_SIZE / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = star ? 1 : target <= 0 ? 0 : Math.min(1, Math.max(0, count / target));

  return (
    <View style={styles.ring} importantForAccessibility="no-hide-descendants">
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={center} cy={center} r={r} stroke={C.line} strokeWidth={RING_STROKE} fill="none" />
        {ratio > 0 ? (
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke={C.accent}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - ratio)}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null}
      </Svg>
      {star ? (
        <Ionicons name="star" size={15} color={C.starInk} />
      ) : (
        <Text style={[styles.ringCount, count === 0 && { color: C.textMuted }]}>{count}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
    elevation: 100,
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  panel: {
    backgroundColor: C.panel,
    borderRadius: 28,
    padding: PANEL_PAD,
    elevation: 12,
    zIndex: 1,
  },
  /** 가로: 두 칸으로 눕힌다. 세로로 쌓으면 390 높이에 들어가지 않는다 */
  panelLandscape: {
    flexDirection: 'row',
    gap: 24,
  },
  column: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: 'bold',
    color: C.textPrimary,
    textAlign: 'center',
  },
  resetButton: {
    position: 'absolute',
    right: 0,
    padding: 4,
  },
  resetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textMuted,
  },

  stepRail: {
    flexDirection: 'row',
    marginTop: 18,
  },
  stepColumn: {
    flex: 1,
    alignItems: 'center',
  },
  /**
   * 이 노드 중심에서 **다음** 노드 중심까지 잇는 선.
   * 칸 폭의 절반만큼 오른쪽으로 내밀면 정확히 두 중심을 잇는다.
   *
   * 방향이 중요하다. 왼쪽 끝은 **같은 칸의** 노드가 뒤에 그려져 덮고,
   * 오른쪽 끝은 **다음 칸**이 나중에 그려져 덮는다 — 양끝이 모두 노드 밑으로 들어간다.
   * 반대로 왼쪽으로 내밀면 앞 노드를 덮어 별이 잘린다.
   */
  stepLink: {
    position: 'absolute',
    top: (STEP_NODE - 3) / 2,
    left: '50%',
    width: '100%',
    height: 3,
    backgroundColor: C.line,
  },
  stepNode: {
    width: STEP_NODE,
    height: STEP_NODE,
    borderRadius: STEP_NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNodeOn: {
    backgroundColor: C.accent,
  },
  stepNodeOff: {
    /** 선이 노드 속을 지나가 보이지 않도록 패널 색으로 막는다 */
    backgroundColor: C.panel,
    borderWidth: 2,
    borderColor: C.line,
  },
  stepLabel: {
    marginTop: 8,
    fontSize: 18,
    color: C.textMuted,
  },
  stepLabelOn: {
    color: C.textPrimary,
    fontWeight: '600',
  },

  tileRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  tile: {
    flex: 1,
    backgroundColor: C.surfaceTile,
    borderRadius: 16,
    padding: 14,
  },
  tileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tileLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textMuted,
    flexShrink: 1,
  },
  tileBody: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 23,
    color: C.textSecondary,
  },

  sectionTitle: {
    marginTop: 24,
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
  },
  /** 가로에서는 오른쪽 칸의 첫 줄이라, 제목과 같은 높이에서 시작해야 한다 */
  sectionTitleLandscape: {
    marginTop: 0,
    lineHeight: 34,
  },
  listInset: {
    marginTop: 10,
    backgroundColor: C.surfaceInset,
    borderRadius: 18,
    padding: 12,
  },
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceRow,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ringCount: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
  },
  rowName: {
    fontSize: 20,
    fontWeight: '600',
    color: C.textPrimary,
    flexShrink: 1,
  },
  rowSpacer: {
    flex: 1,
    minWidth: 8,
  },
  rowBest: {
    fontSize: 16,
    color: C.textMuted,
  },
  rowCheck: {
    marginLeft: 8,
  },
  /** 체크가 없는 줄도 「최고 N점」이 같은 자리에서 끝나도록 자리를 비워 둔다 */
  rowCheckHole: {
    width: 18,
    marginLeft: 8,
  },

  closeButton: {
    marginTop: 20,
    height: 54,
    backgroundColor: C.accent,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 가로: 왼쪽 칸 **바닥**에 붙인다. `auto`가 배지와 버튼 사이의 빈자리를 전부 먹는다 */
  closeButtonLandscape: {
    marginTop: 'auto',
  },
  closeButtonText: {
    color: C.accentInk,
    fontSize: 20,
    fontWeight: 'bold',
  },
});
