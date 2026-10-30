import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type ScreenHeaderProps = {
  title: string;
  /** 제목 아래 한 줄 안내. 「병원 검사가 아니에요」 같은 고지가 여기 들어간다. */
  caption?: string;
  /** 제목 오른쪽에 붙일 것 — 보통 `StatsEntryButton`. 없으면 제목만 놓인다. */
  action?: ReactNode;
};

/**
 * 목록·연습 화면 위쪽의 제목줄. 다섯 화면이 똑같은 마크업과 `caption` 스타일을
 * 각자 복사해 두고 있던 것을 하나로 모은 것이다.
 *
 * 안내 문구는 `small`(14/20) 그대로 쓴다 — 화면에서 `fontSize`로 더 줄이지 말 것
 * (`themed-text.tsx` 참고: 고령·난청 사용자 가독성 하한이 14px다).
 *
 * **가운데 히어로를 쓰는 화면(떨림·다른 음 찾기·높낮이 비교)은 이걸 쓰지 않는다.**
 * 그쪽은 큰 아이콘 + `heading` 제목이 화면 한가운데 서는 다른 짜임이다.
 */
export function ScreenHeader({ title, caption, action }: Readonly<ScreenHeaderProps>) {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <ThemedText type="screenTitle">{title}</ThemedText>
        {action}
      </View>
      {caption ? (
        <ThemedText themeColor="textSecondary" type="small">
          {caption}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
