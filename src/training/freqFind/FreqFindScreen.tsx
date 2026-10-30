import { StyleSheet, View } from "react-native";

import FreqApp from "./source/App";

interface FreqFindScreenProps {
  onBack?: () => void;
}

/**
 * 소리 찾기(소리를 찾는 바다 4단계).
 * 말소리 목록의 항목이다. 라우트 `/freq`는 없다.
 */
export function FreqFindScreen({ onBack }: FreqFindScreenProps) {
  return (
    <View style={styles.root}>
      <FreqApp onBack={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A2342",
  },
});

