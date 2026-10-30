import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * 하단 탭바를 **가로 화면에서 숨긴다.**
 *
 * B(`chongyeon-0708`)는 피아노·기타가 각자 라우트라 `app/(tabs)/_layout.tsx`에서
 * `tabBarStyle: { display: 'none' }`으로 껐다. A는 그 둘이 악기 탭 **묶음 안 상태**라
 * 라우트가 바뀌지 않는다 — `NativeTabs`는 그 전환을 볼 길이 없다. 그래서 숨김 요청을
 * 여기 모아 루트(`app-tabs.tsx`)까지 올린다.
 *
 * 숨기는 이유는 자리싸움이 아니라 **나가기가 둘이 되기 때문이다.** 가로에서는 건반·프렛이
 * 화면을 다 쓰고 나가는 문은 `LandscapeBackButton` 하나다. 거기에 세로용 6탭이 남으면
 * 겹치는 데다 "나가는 방법"이 두 갈래가 된다.
 *
 * `NativeTabs`의 `hidden`은 안드로이드에서 `Tabs.Host`의 `tabBarHidden`으로 간다.
 * 값이 바뀌면 그때그때 반영되고(`TabsContainer.kt`의 observable), 하단 인셋도 0으로
 * 내려가 콘텐츠가 탭바 자리까지 넓어진다. 우리가 따로 여백을 걷을 일은 없다.
 *
 * **요청은 소유자별로 담는다.** 화면 방향에서 이미 한 번 겪은 것과 같은 이유다 —
 * 나가는 쪽이 "숨김 해제"를 걸면 들어온 쪽이 막 켠 숨김을 덮는다. 여기서는 각자
 * 자기 것만 빼고, 남은 요청이 하나라도 있으면 숨긴 채로 둔다.
 */

type TabBarVisibilityValue = {
  hidden: boolean;
  setHideRequest: (owner: string, hide: boolean) => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityValue | null>(
  null,
);

export function TabBarVisibilityProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [hiders, setHiders] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  const setHideRequest = useCallback((owner: string, hide: boolean) => {
    setHiders((prev) => {
      if (hide === prev.has(owner)) {
        return prev;
      }
      const next = new Set(prev);
      if (hide) {
        next.add(owner);
      } else {
        next.delete(owner);
      }
      return next;
    });
  }, []);

  const value = useMemo<TabBarVisibilityValue>(
    () => ({ hidden: hiders.size > 0, setHideRequest }),
    [hiders, setHideRequest],
  );

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

function useTabBarVisibility(): TabBarVisibilityValue {
  const context = useContext(TabBarVisibilityContext);
  if (!context) {
    throw new Error(
      "탭바 숨김은 TabBarVisibilityProvider 안에서만 쓴다",
    );
  }
  return context;
}

/** 루트 탭(`app-tabs.tsx`)이 읽는다. 지금 탭바를 숨겨야 하는가. */
export function useTabBarHidden(): boolean {
  return useTabBarVisibility().hidden;
}

/**
 * 화면이 "지금은 탭바를 숨겨 달라"고 건다.
 *
 * `hide`에 **포커스 여부를 같이 넣을 것.** 가로 상태로 둔 채 다른 탭으로 가면
 * (딥링크·알림) 숨김이 남는다. 언마운트·`hide` 해제 때 자기 요청만 뺀다.
 */
export function useHideTabBar(hide: boolean): void {
  const owner = useId();
  const { setHideRequest } = useTabBarVisibility();

  useEffect(() => {
    setHideRequest(owner, hide);
    return () => {
      setHideRequest(owner, false);
    };
  }, [hide, owner, setHideRequest]);
}
