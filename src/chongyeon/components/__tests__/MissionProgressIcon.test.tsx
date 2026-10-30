import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Dimensions } from 'react-native';
import { ClearContext } from '../../context/ClearContext';
import { StarContext } from '../../context/StarContext';
import MissionProgressIcon from '../MissionProgressIcon';

/**
 * 2안(콘솔) 모달이 **터지지 않고 그려지는지**와, 기능 계약이 그대로인지를 본다.
 * 색·간격은 여기서 보지 않는다 — 실기기에서 볼 것.
 */

function renderWithContexts(
  ui: React.ReactElement,
  // 저장 값이 별은 `1`, 클리어는 `true`다 (컨텍스트 두 개가 원래 다르다)
  {
    starData = {},
    clearData = {},
  }: { starData?: Record<string, 1>; clearData?: Record<string, true> } = {},
) {
  return render(
    <StarContext.Provider value={{ starData, addStar: jest.fn(), resetAll: jest.fn(), resetKeys: jest.fn() }}>
      <ClearContext.Provider value={{ clearData, markAsCleared: jest.fn(), resetAll: jest.fn(), resetKeys: jest.fn() }}>
        {ui}
      </ClearContext.Provider>
    </StarContext.Provider>,
  );
}

const PIANO_LEVELS = ['입문', '초급', '중급', '상급', '전문'];

function pianoIcon() {
  return (
    <MissionProgressIcon
      gameId="music"
      title="피아노 미션"
      missionText="각 난이도에서 정답 누적 3회"
      clearText="각 난이도에서 총점 5점 달성"
      levelNames={PIANO_LEVELS}
      progressItems={[
        { name: '입문', count: 5, best: 5, star: true, cleared: true },
        { name: '초급', count: 4, best: 3, star: true, cleared: true },
        { name: '중급', count: 50, best: 14, star: true, cleared: true },
        { name: '상급', count: 2, best: 2, star: false, cleared: false },
        { name: '전문', count: 0, best: 0, star: false, cleared: false },
      ]}
    />
  );
}

describe('MissionProgressIcon (2안 · 콘솔)', () => {
  it('트리거를 누르면 제목·미션·클리어 조건과 레벨 행이 모두 보인다', () => {
    renderWithContexts(pianoIcon(), { starData: { music_입문: 1 } });

    fireEvent.press(screen.getByLabelText('피아노 미션 안내 열기'));

    expect(screen.getByText('피아노 미션')).toBeTruthy();
    expect(screen.getByText('각 난이도에서 정답 누적 3회')).toBeTruthy();
    expect(screen.getByText('각 난이도에서 총점 5점 달성')).toBeTruthy();
    expect(screen.getByText('레벨별 기록')).toBeTruthy();
    // 스텝 레일은 한 덩어리로 읽어준다 — 낱개 노드·라벨은 낭독에서 감춘다
    expect(screen.getByLabelText('난이도 5단계 중 별 3단계 획득')).toBeTruthy();
    // 행은 난이도마다 하나씩
    PIANO_LEVELS.forEach(name => {
      expect(screen.getAllByText(name)).toHaveLength(1);
    });
    expect(screen.getByText('최고 14점')).toBeTruthy();
    expect(screen.getByLabelText('상급. 누적 2회, 최고 2점. 별 미획득, 클리어 못 함')).toBeTruthy();
  });

  it('별·클리어는 전 난이도 달성일 때만 채운다', () => {
    const allStars: Record<string, 1> = Object.fromEntries(PIANO_LEVELS.map(l => [`music_${l}`, 1]));
    const allClears: Record<string, true> = Object.fromEntries(PIANO_LEVELS.map(l => [`music_${l}`, true]));

    renderWithContexts(pianoIcon(), { starData: { music_입문: 1 } });
    fireEvent.press(screen.getByLabelText('피아노 미션 안내 열기'));
    expect(screen.getByText('별 · 미획득')).toBeTruthy();
    expect(screen.getByText('클리어 · 미달성')).toBeTruthy();
    screen.unmount();

    renderWithContexts(pianoIcon(), { starData: allStars, clearData: allClears });
    fireEvent.press(screen.getByLabelText('피아노 미션 안내 열기'));
    expect(screen.getByText('별 · 획득')).toBeTruthy();
    expect(screen.getByText('클리어 · 달성')).toBeTruthy();
  });

  it('「닫기」와 딤을 누르면 닫힌다', () => {
    renderWithContexts(pianoIcon());

    fireEvent.press(screen.getByLabelText('피아노 미션 안내 열기'));
    fireEvent.press(screen.getByLabelText('닫기'));
    expect(screen.queryByText('레벨별 기록')).toBeNull();

    fireEvent.press(screen.getByLabelText('피아노 미션 안내 열기'));
    fireEvent.press(screen.getByLabelText('미션 안내 닫기'));
    expect(screen.queryByText('레벨별 기록')).toBeNull();
  });

  /**
   * 피아노·기타는 `InstTabScreen`의 `LANDSCAPE_TRACKS`가 **가로로 잠그는** 화면이다.
   * 가로에서는 두 칸으로 접히는데, 그때도 제목·별·클리어·목록이 다 그려져야 한다.
   *
   * 여기서 **잘리는지는 알 수 없다** — 테스트 렌더러는 레이아웃을 계산하지 않는다.
   * 가로 분기가 터지지 않는다는 것까지만 본다.
   */
  it('가로에서도 제목·배지·목록이 모두 그려진다', () => {
    const spy = jest.spyOn(Dimensions, 'get').mockReturnValue({
      width: 844,
      height: 390,
      scale: 3,
      fontScale: 1,
    });

    try {
      renderWithContexts(pianoIcon(), { starData: { music_입문: 1 } });
      fireEvent.press(screen.getByLabelText('피아노 미션 안내 열기'));

      expect(screen.getByText('피아노 미션')).toBeTruthy();
      expect(screen.getByText('별 · 미획득')).toBeTruthy();
      expect(screen.getByText('클리어 · 미달성')).toBeTruthy();
      expect(screen.getByText('레벨별 기록')).toBeTruthy();
      expect(screen.getByText('최고 14점')).toBeTruthy();
      expect(screen.getByLabelText('닫기')).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });

  it('난이도가 없는 화면은 예전 {label,value} 그대로 받고 레일 없이 그린다', () => {
    renderWithContexts(
      <MissionProgressIcon
        gameId="matchgame"
        title="짝맞추기 미션"
        missionText="실수 없이 한 판"
        clearText="한 판 완료"
        progressItems={[{ label: '이번 판 실수 여부', value: '없음' }]}
      />,
    );

    fireEvent.press(screen.getByLabelText('짝맞추기 미션 안내 열기'));

    expect(screen.getByText('현재 진행 상황')).toBeTruthy();
    expect(screen.getByText('이번 판 실수 여부')).toBeTruthy();
    expect(screen.getByText('없음')).toBeTruthy();
    expect(screen.queryByText('레벨별 기록')).toBeNull();
  });
});
