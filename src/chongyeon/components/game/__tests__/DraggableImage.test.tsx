import React from 'react';
import { act, render } from '@testing-library/react-native';
import DraggableImage from '../DraggableImage';

/** 끌어 놓기의 손 뗌만 흉내 낸다. 처리기가 쓰는 값은 좌표뿐이다. */
const release = (el: { props: Record<string, any> }) =>
  el.props.onResponderRelease({
    nativeEvent: { pageX: 10, pageY: 10, touches: [], changedTouches: [] },
    touchHistory: { touchBank: [], numberActiveTouches: 0, indexOfSingleActiveTouch: -1, mostRecentTimeStamp: 0 },
  });

describe('DraggableImage - 놓을 때 최신 값', () => {
  it('같은 카드의 동물이 바뀐 뒤 놓으면 바뀐 동물로 옮긴다', () => {
    const first = jest.fn().mockReturnValue(true);
    const props = {
      image: 1,
      checkDropZone: () => 2,
      sourceZoneIndex: 1,
    };
    const screen = render(
      <DraggableImage {...props} index={3} name="원숭이" onDrop={first} />
    );

    const latest = jest.fn().mockReturnValue(true);
    screen.rerender(<DraggableImage {...props} index={5} name="개" onDrop={latest} />);
    act(() => {
      release(screen.getByLabelText('2번째 자리, 개'));
    });

    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledWith(5, 2, 1);
  });
});
