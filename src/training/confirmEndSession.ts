import { Alert } from "react-native";

/** `confirmEndSession`의 선택 훅. */
export type ConfirmEndSessionHooks = {
  /**
   * 대화상자를 띄우기 **직전**에 부른다. 재생을 즉시 끊는 자리다.
   *
   * 이게 없던 동안, 「중지」는 대화상자만 띄우고 중단 신호는 「끝내기」를
   * 눌러야 걸렸다. 그래서 대화상자가 떠 있는 내내 시행이 계속 굴러가
   * **소리가 안 멈췄다**(P0-1과 같은 증상이 다른 원인으로 되살아난 것).
   */
  onOpen?: () => void;
  /**
   * 「취소」를 누르거나 대화상자를 그냥 닫았을 때 부른다.
   * `onOpen`에서 끊은 재생을 되살리는 자리다. **넣지 않으면 화면이
   * 재생 상태에 멈춘 채로 남는다** — `onOpen`을 쓰면 이것도 같이 써라.
   */
  onCancel?: () => void;
  /** 기본값 「연습 끝내기」. */
  title?: string;
};

/** 끝내기·중지 오탭 방지. 확인 시에만 onConfirm. */
export function confirmEndSession(
  onConfirm: () => void,
  hooks?: ConfirmEndSessionHooks,
): void {
  hooks?.onOpen?.();
  const title = hooks?.title ?? "연습 끝내기";

  // ★ 안드로이드는 **버튼을 눌러 닫아도** onDismiss가 뒤따라 불린다.
  // 이 빗장이 없으면 「끝내기」가 onConfirm과 onCancel을 둘 다 실행해,
  // 요약 화면으로 넘어간 뒤 취소 경로가 다음 문제를 재생해 버린다
  // (실기기에서 실제로 그렇게 났다). 먼저 정해진 쪽 하나만 실행한다.
  let settled = false;
  const cancel = () => {
    if (settled) {
      return;
    }
    settled = true;
    hooks?.onCancel?.();
  };
  const confirm = () => {
    if (settled) {
      return;
    }
    settled = true;
    onConfirm();
  };

  Alert.alert(
    title,
    "여기서 끝낼까요? 진행 중인 내용은 여기서 마무리돼요.",
    [
      { text: "취소", style: "cancel", onPress: cancel },
      { text: "끝내기", style: "destructive", onPress: confirm },
    ],
    // 바깥을 눌러 닫는 경우엔 어느 버튼의 onPress도 안 불린다.
    // 그때를 취소로 잡아 준다.
    { cancelable: true, onDismiss: cancel },
  );
}
