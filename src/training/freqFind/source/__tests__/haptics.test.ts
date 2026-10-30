// haptics.test.ts
import * as Haptics from "expo-haptics";
import { hapticFeedback, setHapticsEnabled, isHapticsEnabled } from "../haptics";

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Heavy: "heavy",
  },
}));

describe("hapticFeedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setHapticsEnabled(true);
  });

  it("selection() 호출 시 Haptics.selectionAsync가 호출된다", async () => {
    await hapticFeedback.selection();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("success() 호출 시 Haptics.notificationAsync(Success)가 호출된다", async () => {
    await hapticFeedback.success();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("success");
  });

  it("error() 호출 시 Haptics.notificationAsync(Error)가 호출된다", async () => {
    await hapticFeedback.error();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("error");
  });

  it("warning() 호출 시 Haptics.notificationAsync(Warning)가 호출된다", async () => {
    await hapticFeedback.warning();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("warning");
  });

  it("light() 호출 시 Haptics.impactAsync(Light)가 호출된다", async () => {
    await hapticFeedback.light();
    expect(Haptics.impactAsync).toHaveBeenCalledWith("light");
  });

  it("medium() 호출 시 Haptics.impactAsync(Medium)가 호출된다", async () => {
    await hapticFeedback.medium();
    expect(Haptics.impactAsync).toHaveBeenCalledWith("medium");
  });

  it("햅틱이 비활성화되면 Haptics 함수를 호출하지 않는다", async () => {
    setHapticsEnabled(false);
    expect(isHapticsEnabled()).toBe(false);

    await hapticFeedback.selection();
    await hapticFeedback.success();
    await hapticFeedback.error();

    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("Haptics 내부에서 에러가 발생해도 예외를 던지지 않고 안전하게 fallback된다", async () => {
    (Haptics.selectionAsync as jest.Mock).mockRejectedValueOnce(new Error("Native error"));
    await expect(hapticFeedback.selection()).resolves.toBeUndefined();
  });
});
