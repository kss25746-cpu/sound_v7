import { fireEvent, render, screen } from "@testing-library/react-native";

import { WrsVoiceGuideScreen } from "@/training/wrs/WrsVoiceGuideScreen";

describe("WrsVoiceGuideScreen", () => {
  it("한국어 음성이 없다는 안내와 받는 방법을 보여준다", () => {
    render(<WrsVoiceGuideScreen onRetry={() => {}} onBack={() => {}} />);

    expect(screen.getByText("한국어 음성이 없어요")).toBeTruthy();
    expect(screen.getByText("받는 방법")).toBeTruthy();
    // 설치 안내는 4단계 — 번호가 다 그려져야 한다.
    for (const step of ["1", "2", "3", "4"]) {
      expect(screen.getByText(step)).toBeTruthy();
    }
  });

  it("«다시 확인»을 누르면 onRetry가 불린다", () => {
    const onRetry = jest.fn();
    render(<WrsVoiceGuideScreen onRetry={onRetry} onBack={() => {}} />);

    fireEvent.press(screen.getByText("다시 확인"));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("«뒤로 가기»를 누르면 onBack이 불린다", () => {
    const onBack = jest.fn();
    render(<WrsVoiceGuideScreen onRetry={() => {}} onBack={onBack} />);

    fireEvent.press(screen.getByText("뒤로 가기"));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  /**
   * 확인 중 재탭은 `hasKoreanVoice` 조회를 중복으로 띄운다.
   * 라벨도 «확인 중…»으로 바뀌어 사용자가 기다릴 것을 안다.
   */
  it("확인 중에는 버튼이 잠기고 라벨이 바뀐다", () => {
    const onRetry = jest.fn();
    const onBack = jest.fn();
    render(
      <WrsVoiceGuideScreen onRetry={onRetry} onBack={onBack} checking />,
    );

    expect(screen.queryByText("다시 확인")).toBeNull();
    fireEvent.press(screen.getByText("확인 중…"));
    fireEvent.press(screen.getByText("뒤로 가기"));

    expect(onRetry).not.toHaveBeenCalled();
    expect(onBack).not.toHaveBeenCalled();
  });
});
