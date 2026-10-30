import React from "react";
import { render, fireEvent, act, waitFor } from "@testing-library/react-native";
import { BackHandler, Alert, AppState, type AppStateStatus } from "react-native";
import * as SafeAreaContext from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import App from "../App";
import { audio } from "../audioAdapter";
import * as sessionStore from "@/training/sessionStore";

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

jest.mock("@/training/StatsScreen", () => {
  const React = require("react");
  const { Text, Pressable } = require("react-native");
  return {
    StatsScreen: ({ onBack }: { onBack: () => void }) =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement(Text, null, "연습 기록"),
        React.createElement(
          Pressable,
          { accessibilityRole: "button", onPress: onBack },
          React.createElement(Text, null, "뒤로 가기")
        )
      ),
  };
});

jest.mock("@/audio/pureTone", () => ({
  playPureTone: jest.fn(async () => undefined),
  stopPureTone: jest.fn(),
}));

describe("Freq App BackHandler & Exit Confirmation", () => {
  let backPressListeners: ((...args: never[]) => boolean | null | undefined)[] = [];
  let appStateListeners: ((state: AppStateStatus) => void)[] = [];

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    jest.spyOn(Alert, "alert");

    backPressListeners = [];
    appStateListeners = [];

    jest
      .spyOn(BackHandler, "addEventListener")
      .mockImplementation((event, handler) => {
        if (event === "hardwareBackPress") {
          backPressListeners.push(handler);
        }
        return {
          remove: jest.fn(() => {
            backPressListeners = backPressListeners.filter((h) => h !== handler);
          }),
        } as any;
      });

    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((event: string, handler: any) => {
        if (event === "change") {
          appStateListeners.push(handler);
        }
        return {
          remove: jest.fn(() => {
            appStateListeners = appStateListeners.filter((h) => h !== handler);
          }),
        } as any;
      });
  });

  const triggerAppStateChange = (state: AppStateStatus) => {
    appStateListeners.forEach((h) => h(state));
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const triggerHardwareBack = () => {
    // React Native calls listeners in reverse order (LIFO) until one returns true
    for (let i = backPressListeners.length - 1; i >= 0; i--) {
      const handled = backPressListeners[i]();
      if (handled) break;
    }
  };

  it("홈 화면에서 뒤로가기 버튼 누르면 onBack이 호출된다", () => {
    const handleBack = jest.fn();
    render(<App onBack={handleBack} />);

    act(() => {
      triggerHardwareBack();
    });

    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it("여정 시작을 누르면 곧바로 1단계(s1)로 들어가고 중단 버튼이 표시된다", () => {
    const { getByText, queryByText } = render(<App />);

    fireEvent.press(getByText("여정 시작"));

    expect(queryByText("중단")).toBeTruthy();
    expect(getByText("1단계 · 소리의 파동")).toBeTruthy();
  });

  it("1단계를 마치면 막간 없이 곧바로 2단계로 넘어간다", async () => {
    const { getByText, getByLabelText, queryByText } = render(<App />);
    fireEvent.press(getByText("여정 시작"));
    expect(getByText("1단계 · 소리의 파동")).toBeTruthy();

    // 1단계 문항이 남아 있는 동안 「소리 듣기 → 들렸어요」를 반복한다(안전 상한 20회).
    for (let i = 0; i < 20 && queryByText("1단계 · 소리의 파동"); i++) {
      await act(async () => {
        fireEvent.press(getByLabelText("소리 듣기"));
      });
      await act(async () => {
        fireEvent.press(getByText("들렸어요"));
      });
    }

    expect(queryByText("계속 내려가기")).toBeNull();
    expect(getByText("2단계 · 바다 둘러보기")).toBeTruthy();
  });

  it("단계 진행 중 중단 버튼을 누르면 confirmEndSession (Alert.alert)이 호출된다", () => {
    const { getByText } = render(<App />);

    // s1으로 진입
    fireEvent.press(getByText("여정 시작"));
    const exitBtn = getByText("중단");
    fireEvent.press(exitBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      "여정 끝내기",
      "여기서 끝낼까요? 진행 중인 내용은 여기서 마무리돼요.",
      expect.any(Array),
      expect.any(Object)
    );
  });

  it("단계 진행 중 안드로이드 하드웨어 뒤로가기를 누르면 이탈하지 않고 Alert.alert 확인창이 뜬다", () => {
    const handleBack = jest.fn();
    const { getByText, queryByText } = render(<App onBack={handleBack} />);

    // s1으로 진입
    fireEvent.press(getByText("여정 시작"));
    // 하드웨어 뒤로가기 발생
    act(() => {
      triggerHardwareBack();
    });

    // 앱 루트 onBack은 불리지 않아야 함
    expect(handleBack).not.toHaveBeenCalled();

    // 대신 확인 알림창이 떠야 함
    expect(Alert.alert).toHaveBeenCalledWith(
      "여정 끝내기",
      "여기서 끝낼까요? 진행 중인 내용은 여기서 마무리돼요.",
      expect.any(Array),
      expect.any(Object)
    );

    // 여전히 화면에 중단이 남아있어야 함 (즉시 홈으로 이탈되지 않음)
    expect(queryByText("중단")).toBeTruthy();
  });

  it("확인 알림창에서 '끝내기'를 선택하면 홈 화면으로 안전하게 복귀한다", () => {
    const { getByText, queryByText } = render(<App />);

    // s1 진입
    fireEvent.press(getByText("여정 시작"));
    // 중단 클릭
    fireEvent.press(getByText("중단"));

    // Alert.alert의 버튼 콜백 찾아서 '끝내기' 실행
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const buttons = alertCalls[0][2];
    const confirmButton = buttons.find((b: { text: string }) => b.text === "끝내기");

    act(() => {
      confirmButton.onPress();
    });

    // 홈 화면으로 복귀 확인
    expect(getByText("소리를 찾는 바다")).toBeTruthy();
    expect(queryByText("중단")).toBeNull();
  });

  it("중단 버튼은 단계 헤더 안에 있고, 화면 상단 패딩이 SafeArea top insets를 따른다", () => {
    jest.spyOn(SafeAreaContext, "useSafeAreaInsets").mockReturnValue({
      top: 50,
      left: 0,
      right: 0,
      bottom: 34,
    });

    const { getByText, getByLabelText, getByTestId } = render(<App />);
    fireEvent.press(getByText("여정 시작"));
    expect(getByLabelText("측정 중단하고 메인으로 가기")).toBeTruthy();
    expect(getByTestId("stage-header")).toBeTruthy();
    expect(getByTestId("stage-wrap").props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          paddingTop: 60, // Math.max(50 + 10, 44) = 60
        }),
      ])
    );
  });

  describe("오디오 포커스 및 백그라운드 전환 (AppState) 처리", () => {
    it("측정 단계 진행 중 앱이 백그라운드로 전환되면 소리가 정지되고 일시정지 모달이 표시된다", () => {
      const stopSpy = jest.spyOn(audio, "stop");
      const { getByText, queryByText } = render(<App />);

      // s1 진입
      fireEvent.press(getByText("여정 시작"));
      expect(queryByText("측정이 일시정지되었어요")).toBeNull();

      // 백그라운드 이벤트 발생
      act(() => {
        triggerAppStateChange("background");
      });

      // 소리 정지 호출 및 모달 노출 확인
      expect(stopSpy).toHaveBeenCalled();
      expect(getByText("측정이 일시정지되었어요")).toBeTruthy();
      expect(getByText("현재 단계: 1단계 · 소리의 파동")).toBeTruthy();
    });

    it("일시정지 모달에서 '측정 계속하기'를 누르면 모달이 닫히고 정상적으로 검사가 재개된다", () => {
      const { getByText, queryByText } = render(<App />);

      fireEvent.press(getByText("여정 시작"));
      act(() => {
        triggerAppStateChange("background");
      });

      expect(getByText("측정이 일시정지되었어요")).toBeTruthy();

      // 측정 계속하기 버튼 클릭
      fireEvent.press(getByText("측정 계속하기"));

      expect(queryByText("측정이 일시정지되었어요")).toBeNull();
      expect(getByText("1단계 · 소리의 파동")).toBeTruthy();
    });

    it("일시정지 모달에서 '측정 중단하고 메인으로'를 누르면 모달이 닫히고 홈 화면으로 복귀한다", () => {
      const stopSpy = jest.spyOn(audio, "stop");
      const { getByText, queryByText } = render(<App />);

      fireEvent.press(getByText("여정 시작"));
      act(() => {
        triggerAppStateChange("background");
      });

      expect(getByText("측정이 일시정지되었어요")).toBeTruthy();

      // 측정 중단하고 메인으로 클릭
      fireEvent.press(getByText("측정 중단하고 메인으로"));

      expect(stopSpy).toHaveBeenCalled();
      expect(queryByText("측정이 일시정지되었어요")).toBeNull();
      expect(getByText("소리를 찾는 바다")).toBeTruthy();
    });

    it("일시정지 모달이 떠 있는 상태에서 하드웨어 뒤로가기를 누르면 측정이 재개된다", () => {
      const { getByText, queryByText } = render(<App />);

      fireEvent.press(getByText("여정 시작"));
      act(() => {
        triggerAppStateChange("background");
      });

      expect(getByText("측정이 일시정지되었어요")).toBeTruthy();

      // 안드로이드 뒤로가기 누름
      act(() => {
        triggerHardwareBack();
      });

      expect(queryByText("측정이 일시정지되었어요")).toBeNull();
      expect(getByText("1단계 · 소리의 파동")).toBeTruthy();
    });
  });

  describe("결과 화면 라우팅 및 복귀 흐름 (fromResult & onViewResult)", () => {
    const mockWeakRecord: sessionStore.SavedFreqFindSessionRecord = {
      id: "test-rec-weak",
      track: "freqFind",
      savedAt: "2026-09-14T05:00:00.000Z",
      grades: {
        s1: null,
        s2: {
          high: { correct: 2, total: 5, status: "weak" },
          mid: { correct: 5, total: 5, status: "pass" },
          low: { correct: 5, total: 5, status: "pass" },
        },
        s3: {
          high: { correct: 2, total: 6, status: "weak" },
          mid: { correct: 0, total: 0, status: "skip" },
          low: { correct: 0, total: 0, status: "skip" },
        },
        s4: null,
      },
      summary: {
        high: {
          tone: null,
          screen: { correct: 2, total: 5, status: "weak" },
          fine: { correct: 2, total: 6, status: "weak" },
          versus: null,
          final: "weak",
        },
        mid: {
          tone: null,
          screen: { correct: 5, total: 5, status: "pass" },
          fine: null,
          versus: null,
          final: "pass",
        },
        low: {
          tone: null,
          screen: { correct: 5, total: 5, status: "pass" },
          fine: null,
          versus: null,
          final: "pass",
        },
      },
    };

    it("홈에서 [지난 결과 보기] 클릭 시 직전 결과 화면으로 진입한다", async () => {
      jest.spyOn(sessionStore, "getLatestFreqFindSession").mockResolvedValue(mockWeakRecord);

      const { findByText, getByText, getByLabelText } = render(<App />);

      const viewBtn = await findByText("지난 결과 보기");
      expect(viewBtn).toBeTruthy();

      fireEvent.press(viewBtn);

      // 결과 화면의 타이틀 및 내용 확인
      expect(getByText(/수면층이 흐릿하게 들렸어요/)).toBeTruthy();
      expect(getByText("연습")).toBeTruthy();
      expect(getByLabelText("수면층 연습")).toBeTruthy();
    });

    it("연습 기록을 지운 뒤 통계에서 돌아오면 결과 지도를 닫고 홈으로 간다", async () => {
      const spy = jest.spyOn(sessionStore, "getLatestFreqFindSession");
      spy.mockResolvedValue(mockWeakRecord);

      const { findByText, getByText, getByLabelText, getByTestId, queryByText, queryByTestId } = render(<App />);
      fireEvent.press(await findByText("지난 결과 보기"));
      expect(getByTestId("depth-layers")).toBeTruthy();

      fireEvent.press(getByLabelText("탐사 기록 통계 보기"));
      expect(getByText("연습 기록")).toBeTruthy();

      spy.mockResolvedValue(null);
      fireEvent.press(getByText("뒤로 가기"));

      await waitFor(() => {
        expect(getByText("소리를 찾는 바다")).toBeTruthy();
      });
      expect(queryByTestId("depth-layers")).toBeNull();
      expect(queryByText("최근 탐사 기록")).toBeNull();
    });

    it("연습 중 상단 버튼이 '결과로 돌아가기'로 표시되고 클릭 시 직전 결과 화면으로 복귀한다", async () => {
      jest.spyOn(sessionStore, "getLatestFreqFindSession").mockResolvedValue(mockWeakRecord);

      const { findByText, getByText, getByLabelText, queryByText } = render(<App />);
      fireEvent.press(await findByText("지난 결과 보기"));

      fireEvent.press(getByLabelText("수면층 연습"));

      expect(getByText("연습 · 고대역")).toBeTruthy();
      expect(getByText(/흐릿했던 고대역\(3,350 ~ 7,000 Hz\)의 단어들/)).toBeTruthy();
      expect(queryByText(/대역의 단어들/)).toBeNull();
      expect(getByText("결과로 돌아가기")).toBeTruthy();

      fireEvent.press(getByText("계속 내려가기"));
      expect(getByText("연습 · 깊이 들어가기")).toBeTruthy();
      expect(getByText("결과로 돌아가기")).toBeTruthy();

      fireEvent.press(getByText("결과로 돌아가기"));

      expect(Alert.alert).not.toHaveBeenCalled();
      expect(getByText(/수면층이 흐릿하게 들렸어요/)).toBeTruthy();
      expect(queryByText("연습 · 깊이 들어가기")).toBeNull();
    });

    it("연습 중 하드웨어 뒤로가기 누르면 확인 창 없이 결과 화면으로 안전하게 복귀한다", async () => {
      jest.spyOn(sessionStore, "getLatestFreqFindSession").mockResolvedValue(mockWeakRecord);

      const { findByText, getByText, getByLabelText } = render(<App />);
      fireEvent.press(await findByText("지난 결과 보기"));
      fireEvent.press(getByLabelText("수면층 연습"));
      fireEvent.press(getByText("계속 내려가기"));

      expect(getByText("연습 · 깊이 들어가기")).toBeTruthy();

      // 하드웨어 뒤로가기 누름
      act(() => {
        triggerHardwareBack();
      });

      // 홈으로 튕기거나 Alert 없이 결과 화면으로 안전 복귀
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(getByText(/수면층이 흐릿하게 들렸어요/)).toBeTruthy();
    });
  });
});


