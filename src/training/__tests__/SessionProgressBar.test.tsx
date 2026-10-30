import { act, render } from "@testing-library/react-native";
import type { ReactTestInstance } from "react-test-renderer";

import { SessionProgressBar } from "@/training/SessionProgressBar";

/**
 * 채움 막대는 트랙(바깥 View)의 유일한 자식(Animated.View)이다.
 * width는 Animated 보간 객체라 문자열이 아니므로 __getValue()로 실제 값을 읽는다.
 */
function fillWidth(tree: ReactTestInstance): string | number | undefined {
  const track = tree.children[0] as ReactTestInstance;
  const fill = track.children[0] as ReactTestInstance;
  const width = StyleSheetFlatten(fill.props.style)?.width as
    | { __getValue?: () => string | number }
    | string
    | number
    | undefined;
  if (width && typeof width === "object" && "__getValue" in width) {
    return width.__getValue?.();
  }
  return width as string  | number | undefined;
}

function StyleSheetFlatten(
  style: unknown,
): Record<string, unknown> | undefined {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(StyleSheetFlatten));
  }
  return style as Record<string, unknown> | undefined;
}

describe("SessionProgressBar", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("진행에 따라 채움 폭이 늘어난다", () => {
    const { root, rerender } = render(
      <SessionProgressBar current={0} total={25} />,
    );
    expect(fillWidth(root)).toBe("0%");

    rerender(<SessionProgressBar current={1} total={25} />);
    act(() => {
      jest.runAllTimers();
    });
    expect(fillWidth(root)).toBe("4%");

    rerender(<SessionProgressBar current={25} total={25} />);
    act(() => {
      jest.runAllTimers();
    });
    expect(fillWidth(root)).toBe("100%");
  });

  it("total을 넘겨도 100%를 넘지 않는다", () => {
    const { root } = render(<SessionProgressBar current={40} total={25} />);
    expect(fillWidth(root)).toBe("100%");
  });

  it("음수는 0%로 본다", () => {
    const { root } = render(<SessionProgressBar current={-3} total={25} />);
    expect(fillWidth(root)).toBe("0%");
  });

  /** 귀풀기 모드는 목표가 없어 total이 0으로 올 수 있다 — 0으로 나누면 안 된다. */
  it("total이 0이어도 터지지 않고 0%", () => {
    const { root } = render(<SessionProgressBar current={5} total={0} />);
    expect(fillWidth(root)).toBe("0%");
  });
});
