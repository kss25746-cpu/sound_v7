import { StyleSheet, View } from 'react-native';
import type { MutableRefObject } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameExitButton } from '../components/GameExitButton';
import { COLORS } from '../constants/colors';
import type { AnimalGameId } from './AnimalGameHubScreen';
import { MatchGameAIScreen, type MatchGameLeave } from './MatchGameAIScreen';
import { MatchGameScreen } from './MatchGameScreen';
import { OrderGameScreen } from './OrderGameScreen';

export type { MatchGameLeave };

type AnimalGameScreenProps = {
  game: AnimalGameId;
  onBack: () => void;
  /**
   * 강화학습이 채운다. 홈이 아니면 true를 돌려 버튼 셋으로 돌아온다.
   * 비어 있으면 목록으로 나간다. 소리 맞추기·소리 순서는 비운 채로 둔다.
   */
  leaveRef: MutableRefObject<MatchGameLeave | null>;
};

/**
 * B `app/(tabs)/new/(games)/_layout.tsx`의 자리. 게임 셋을 감싸 **「나가기」를 한 번만** 올린다 —
 * 세 화면에 각각 넣으면 스타일·인셋·zIndex가 갈라진다(`GameExitButton` 주석).
 *
 * B는 `Stack`으로 넷을 라우트로 갈아 끼웠고 `GameExitButton`이 `router.back()`으로 나갔다.
 * A는 `OtherSoundsTabScreen`이 든 `animalGame` 상태로 갈아 끼우고, 나가기는 묶음이 준 `onBack`이다.
 * 강화학습은 예외다. 홈이 아니면 `leaveRef`가 버튼 셋으로 되돌리고, 홈에서만 `onBack`이다.
 * 상단 인셋은 B 껍데기의 빈 헤더(`paddingTop: insets.top`)가 하던 일이라 여기서 준다 —
 * 게임 셋은 스스로 인셋을 걸지 않는다(미션 아이콘이 `top: 50` 절대배치인 것도 그 전제다).
 *
 * 게임을 바꾸면 컴포넌트가 달라 이전 게임은 언마운트된다. 각 게임의 `useStopAudioOnBlur`
 * 클린업이 그때 돌아 소리·타이머가 남지 않는다(`app_go3.md` 교차검증과 같은 근거).
 */
export function AnimalGameScreen({ game, onBack, leaveRef }: AnimalGameScreenProps) {
  const insets = useSafeAreaInsets();

  const handleExit = () => {
    if (leaveRef.current?.()) return;
    onBack();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {game === 'matchGame' ? <MatchGameScreen /> : null}
      {game === 'orderGame' ? <OrderGameScreen /> : null}
      {game === 'matchGameAI' ? <MatchGameAIScreen leaveRef={leaveRef} /> : null}

      <GameExitButton onBack={handleExit} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // B `Stack`의 기본 화면 배경(흰색). 인셋만큼 비는 위쪽에 이 색이 보인다
    backgroundColor: COLORS.background,
  },
});
