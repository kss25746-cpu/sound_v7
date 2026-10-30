// B(`chongyeon-0708`) `app/(tabs)/new/index.tsx`에서 반입. 라우트가 아니라 `다른 소리` 묶음(`OtherSoundsTabScreen`) 안 상태다.
// 상대경로 `assets/`는 `@/assets/chongyeon/`으로, 오디오 정리 훅은 이식본 `@/hooks/use-stop-audio-on-blur`로 붙였다.
// 게임 로직·UX는 B 그대로 살린다(정본 §2.3). 경위: `docs/app_go8.md`.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, Text, View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ClearContext } from '../context/ClearContext';
import { StarContext } from '../context/StarContext';
import { GameExitButton } from '../components/GameExitButton';
import { colors, fontSize, opacity, iconBorderAlphaSuffix } from '../constants/animalGameHubTheme';
import * as hub from '../constants/animalGameHubLayout';

/** [DEV] 나중에 삭제: resetAll 관련 - 게임 저장 키들 */
const GAME_STORAGE_KEYS = [
    '@AuditoryTrainingApp:gameState',
];
const SUBTITLE_TEXT = '원하는 게임을 선택하여 청능 훈련을 시작하세요!';

// 게임 목록 직접 정의
const games = [
    {
        id: 'matchGame',
        name: '소리 맞추기',
        desc: '들린 동물 소리를 골라보세요',
        color: colors.gameAccent.matchGame,
        icon: 'paw'
    },
    {
        id: 'orderGame',
        name: '소리 순서',
        desc: '들은 순서대로 배열하세요',
        color: colors.gameAccent.orderGame,
        icon: 'shuffle'
    },
    {
        id: 'matchGameAI',
        name: '강화학습',
        desc: 'AI가 약점을 분석해 훈련해요',
        color: colors.gameAccent.matchGameAI,
        icon: 'rocket-outline'
    },
] as const;

export type AnimalGameId = (typeof games)[number]['id'];

type AnimalGameHubScreenProps = {
    /** 게임을 고르면 묶음 화면이 `AnimalGameScreen`으로 갈아 끼운다 */
    onSelectGame: (game: AnimalGameId) => void;
    onBack: () => void;
};

/**
 * 동물게임 허브 — 게임 셋을 고르는 화면.
 *
 * B에서 앱 전체의 유일한 `router.push`가 여기 있었다(`new/index.tsx:187`). A에서는
 * 라우트가 아니라 묶음이 준 `onSelectGame`을 부른다 — `GameExitButton`이 `onBack`을 받는 것과 같은 방식.
 * 나가기는 게임 안과 같은 우하단 「나가기」다. 허브가 탭이 아니라 묶음 항목이라 돌아갈 곳이 필요하다.
 */
export function AnimalGameHubScreen({ onSelectGame, onBack }: AnimalGameHubScreenProps) {
    const insets = useSafeAreaInsets();
    const starContext = useContext(StarContext);
    const clearContext = useContext(ClearContext);
    const [isResetting, setIsResetting] = useState(false);
    const [displayedSubtitle, setDisplayedSubtitle] = useState('');
    const [isSubtitleDone, setIsSubtitleDone] = useState(false);

    useEffect(() => {
        let index = 0;
        let interval: ReturnType<typeof setInterval> | undefined;
        const timeout = setTimeout(() => {
            interval = setInterval(() => {
                index += 1;
                setDisplayedSubtitle(SUBTITLE_TEXT.slice(0, index));

                if (index >= SUBTITLE_TEXT.length) {
                    clearInterval(interval);
                    setIsSubtitleDone(true);
                }
            }, hub.motion.subtitleStepMs);
        }, hub.motion.subtitleStartDelayMs);

        return () => {
            clearTimeout(timeout);
            if (interval) clearInterval(interval);
        };
    }, []);

    /** [DEV] 나중에 삭제: 전체 초기화 핸들러 */
    const handleResetAll = async () => {
        Alert.alert(
            '전체 초기화',
            '별, 완료, 게임 진행 데이터를 모두 초기화합니다. 계속할까요?',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '초기화',
                    style: 'destructive',
                    onPress: async () => {
                        if (isResetting) return;
                        setIsResetting(true);
                        try {
                            await clearContext?.resetAll();
                            await starContext?.resetAll();
                            await AsyncStorage.multiRemove(GAME_STORAGE_KEYS);
                            Alert.alert('완료', '모든 데이터가 초기화되었습니다.');
                        } catch (e) {
                            console.error('Reset failed:', e);
                            Alert.alert('오류', '초기화에 실패했습니다.');
                        } finally {
                            setIsResetting(false);
                        }
                    },
                },
            ]
        );
    };

    if (!starContext || !clearContext) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={[styles.container, { paddingTop: insets.top }]}>
                    <Text style={styles.loadingText}>로딩 중...</Text>
                </View>
            </GestureHandlerRootView>
        );
    }

    const { starData } = starContext;
    const { clearData } = clearContext;
    const totalStars = games.filter((game) => !!starData[game.id]).length;
    const totalClears = games.filter((game) => !!clearData[game.id]).length;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View
                style={[
                    styles.container,
                    { paddingTop: insets.top, paddingBottom: insets.bottom },
                ]}
            >
                <View style={styles.glowTop} />
                <View style={styles.glowLeft} />
                <View style={styles.glowBottom} />
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* 섹션: 게임 선택 */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.titleRow}>
                                <View style={styles.titleBlock}>
                                    <Text style={styles.kicker}>AUDITORY TRAINING</Text>
                                    <View style={styles.sectionTitleRow}>
                                        <Ionicons name="ear-outline" size={fontSize.sectionTitle} color={colors.textPrimary} />
                                        <Text style={styles.sectionTitle}>청능 훈련 게임</Text>
                                    </View>
                                </View>
                                <View style={styles.summaryRow}>
                                    {totalStars > 0 && (
                                        <View style={styles.starSummary}>
                                            <Ionicons name="star" size={hub.summary.iconSize} color={colors.star} />
                                            <Text style={styles.starSummaryText}>{totalStars}</Text>
                                        </View>
                                    )}
                                    {totalClears > 0 && (
                                        <View style={styles.clearSummary}>
                                            <Ionicons name="checkmark" size={hub.summary.iconSize} color={colors.clear} />
                                            <Text style={styles.clearSummaryText}>{totalClears}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={styles.subtitleBox}>
                                <Text style={styles.sectionSubtitle}>
                                    {displayedSubtitle}
                                    {!isSubtitleDone && <Text style={styles.cursorText}>|</Text>}
                                </Text>
                            </View>
                        </View>

                        {/* 게임 그리드 */}
                        <View style={styles.gameGrid}>
                            {games.map((game) => {
                                const hasStar = !!starData[game.id];
                                const isCleared = !!clearData[game.id];

                                return (
                                    <TouchableOpacity
                                        key={game.id}
                                        style={styles.gameCard}
                                        onPress={() => onSelectGame(game.id)}
                                        activeOpacity={opacity.cardPressed}
                                        accessibilityRole="button"
                                        // 별·클리어는 배지 아이콘에만 있어 토크백이 못 읽는다. 라벨이 대신 읽는다
                                        accessibilityLabel={
                                            `${game.name}, ${game.desc}` +
                                            (hasStar ? ', 별 획득' : '') +
                                            (isCleared ? ', 클리어 완료' : '')
                                        }
                                    >
                                        {/* 별 배지 */}
                                        {hasStar && (
                                            <View style={styles.starBadge}>
                                                <Ionicons name="star" size={hub.badge.starIconSize} color={colors.star} />
                                            </View>
                                        )}

                                        {/* 클리어 배지 */}
                                        {isCleared && (
                                            <View style={styles.clearedBadge}>
                                                <Ionicons name="checkmark" size={hub.badge.clearedIconSize} color={colors.clearedBadgeIcon} />
                                            </View>
                                        )}

                                        {/* 아이콘 컨테이너 — 클리어면 금테, 아니면 게임색에 알파를 붙인 테. 아이콘은 게임색 */}
                                        <View
                                            style={[
                                                styles.iconContainer,
                                                { borderColor: isCleared ? colors.star : `${game.color}${iconBorderAlphaSuffix}` },
                                            ]}
                                        >
                                            <View style={[styles.cardAccent, { backgroundColor: game.color }]} />
                                            <Ionicons name={game.icon} size={fontSize.gameIcon} color={game.color} />
                                        </View>

                                        {/* 게임 이름 */}
                                        <Text style={styles.gameName}>{game.name}</Text>
                                        <Text style={styles.gameDesc}>{game.desc}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* [DEV] 나중에 삭제: 초기화 버튼 */}
                        <TouchableOpacity
                            style={[styles.resetButton, isResetting && styles.resetButtonDisabled]}
                            onPress={handleResetAll}
                            disabled={isResetting}
                        >
                            <Ionicons name="refresh" size={hub.reset.iconSize} color={colors.resetText} />
                            <Text style={styles.resetButtonText}>
                                {isResetting ? '초기화 중...' : '전체 초기화'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
            {/* 패딩 있는 상자 밖에 둔다. 안에 두면 바닥 인셋만큼 떠오른다. */}
            <GameExitButton onBack={onBack} />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.screenBg,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: hub.scene.scrollBottomPadding,
    },
    loadingText: {
        fontSize: fontSize.loading,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    glowTop: {
        position: 'absolute',
        top: hub.glow.top.top,
        right: hub.glow.top.right,
        width: hub.glow.top.size,
        height: hub.glow.top.size,
        borderRadius: hub.glow.top.borderRadius,
        backgroundColor: colors.glowTop,
    },
    glowLeft: {
        position: 'absolute',
        top: hub.glow.left.top,
        left: hub.glow.left.left,
        width: hub.glow.left.size,
        height: hub.glow.left.size,
        borderRadius: hub.glow.left.borderRadius,
        backgroundColor: colors.glowLeft,
    },
    glowBottom: {
        position: 'absolute',
        right: hub.glow.bottom.right,
        bottom: hub.glow.bottom.bottom,
        width: hub.glow.bottom.size,
        height: hub.glow.bottom.size,
        borderRadius: hub.glow.bottom.borderRadius,
        backgroundColor: colors.glowBottom,
    },

    // 섹션 스타일
    section: {
        flex: 1,
        marginHorizontal: hub.section.marginHorizontal,
        paddingTop: hub.section.paddingTop,
    },
    sectionHeader: {
        marginBottom: hub.section.headerMarginBottom,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: hub.section.titleRowMarginBottom,
    },
    titleBlock: {
        flex: 1,
    },
    kicker: {
        color: colors.textMuted,
        fontSize: fontSize.kicker,
        fontWeight: '800',
        letterSpacing: hub.section.kickerLetterSpacing,
        marginBottom: hub.section.kickerMarginBottom,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: hub.section.titleIconGap,
    },
    sectionTitle: {
        flexShrink: 1,
        fontSize: fontSize.sectionTitle,
        fontWeight: '900',
        color: colors.textPrimary,
        letterSpacing: hub.section.titleLetterSpacing,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: hub.summary.rowGap,
    },
    starSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: hub.summary.chipGap,
        paddingVertical: hub.summary.chipPaddingVertical,
        paddingHorizontal: hub.summary.chipPaddingHorizontal,
        borderRadius: hub.summary.chipBorderRadius,
        backgroundColor: colors.starChipBg,
        borderWidth: hub.summary.chipBorderWidth,
        borderColor: colors.starChipBorder,
    },
    starSummaryText: {
        color: colors.star,
        fontSize: fontSize.chipValue,
        fontWeight: '900',
    },
    clearSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: hub.summary.chipGap,
        paddingVertical: hub.summary.chipPaddingVertical,
        paddingHorizontal: hub.summary.chipPaddingHorizontal,
        borderRadius: hub.summary.chipBorderRadius,
        backgroundColor: colors.clearChipBg,
        borderWidth: hub.summary.chipBorderWidth,
        borderColor: colors.clearChipBorder,
    },
    clearSummaryText: {
        color: colors.clear,
        fontSize: fontSize.chipValue,
        fontWeight: '900',
    },
    subtitleBox: {
        minHeight: hub.subtitle.minHeight,
        justifyContent: 'center',
        paddingHorizontal: hub.subtitle.paddingHorizontal,
        borderRadius: hub.subtitle.borderRadius,
        backgroundColor: colors.subtitleBoxBg,
        borderWidth: hub.subtitle.borderWidth,
        borderColor: colors.subtitleBoxBorder,
        elevation: hub.subtitle.elevation,
    },
    sectionSubtitle: {
        fontSize: fontSize.subtitle,
        color: colors.textSubtitle,
        lineHeight: hub.subtitle.lineHeight,
    },
    cursorText: {
        color: colors.star,
        fontWeight: '900',
    },
    resetButton: {
        alignSelf: 'center',
        marginTop: hub.reset.marginTop,
        flexDirection: 'row',
        alignItems: 'center',
        gap: hub.reset.gap,
        paddingVertical: hub.reset.paddingVertical,
        paddingHorizontal: hub.reset.paddingHorizontal,
        backgroundColor: colors.resetBg,
        borderRadius: hub.reset.borderRadius,
        borderWidth: hub.reset.borderWidth,
        borderColor: colors.resetBorder,
    },
    resetButtonDisabled: {
        opacity: opacity.resetDisabled,
    },
    resetButtonText: {
        fontSize: fontSize.resetLabel,
        color: colors.resetText,
        fontWeight: '800',
    },

    // 게임 그리드
    gameGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: hub.grid.columnGap,
        rowGap: hub.grid.rowGap,
    },

    // 게임 카드
    gameCard: {
        width: hub.card.width,
        alignItems: 'center',
        position: 'relative',
    },
    cardAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: hub.card.accentHeight,
        borderTopLeftRadius: hub.card.accentBorderRadius,
        borderTopRightRadius: hub.card.accentBorderRadius,
        zIndex: hub.zIndex.cardAccent,
    },
    // 아이콘 컨테이너
    iconContainer: {
        width: hub.card.iconSize,
        height: hub.card.iconSize,
        borderRadius: hub.card.iconBorderRadius,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: hub.card.iconMarginBottom,
        backgroundColor: colors.iconContainerBg,
        borderWidth: hub.card.iconBorderWidth,
        overflow: 'hidden',
        elevation: hub.card.iconElevation,
    },
    // 게임 이름
    gameName: {
        fontSize: fontSize.gameName,
        fontWeight: '900',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: hub.card.nameMarginBottom,
    },
    gameDesc: {
        fontSize: fontSize.gameDesc,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: hub.card.descLineHeight,
    },

    // 별 배지
    starBadge: {
        position: 'absolute',
        top: hub.badge.starTop,
        right: hub.badge.starRight,
        zIndex: hub.zIndex.badge,
    },

    // 클리어 배지
    clearedBadge: {
        position: 'absolute',
        top: hub.badge.clearedTop,
        right: hub.badge.clearedRight,
        width: hub.badge.clearedSize,
        height: hub.badge.clearedSize,
        borderRadius: hub.badge.clearedBorderRadius,
        backgroundColor: colors.star,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: hub.zIndex.badge,
    },
});
