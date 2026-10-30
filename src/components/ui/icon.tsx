import { useId } from 'react';
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { Colors } from '@/constants/theme';

export type IconName =
  /** 앱 상징(귀·나선). */
  | 'logo'
  /** 높낮이 비교 — 높이가 다른 두 막대. */
  | 'bars'
  /** ② 다른 음 찾기 — 돋보기로 다른 하나를 찾기. */
  | 'findTone'
  /** ① 떨림 찾기 — 진동하는 소리. */
  | 'vibrate'
  /** 연습 기록 — 목록. */
  | 'list'
  /** 연습 통계 — 다색 채움 막대(예외: 단색 stroke 아님). */
  | 'chart'
  | 'check'
  | 'headphones'
  | 'speaker'
  | 'stop'
  /** 높낮이 비교 — 더 높아요 / 더 낮아요. */
  | 'arrowUp'
  | 'arrowDown'
  /** 단어 빙고 — 3×3 중 한 줄이 이어짐. */
  | 'bingoLine'
  /** 단어 듣기 — 한 글자. */
  | 'oneChar'
  /** 단어 듣기 — 두 글자. */
  | 'twoChar'
  /** 문장 듣기 — 그림 세 장. */
  | 'sentence'
  /** 악기 소리 — 건반(피아노). 탭·통계 제목줄도 이걸 쓴다. */
  | 'pianoKeys'
  /** 악기 소리 — 퉁기는 줄(기타). */
  | 'guitar'
  /** 악기 소리 — 북. */
  | 'drum'
  /** 악기 소리 — 활로 켜는 줄(바이올린). 활이 줄을 가로지른다. */
  | 'violin'
  /** 악기 소리 — 입김을 부는 관(플루트). */
  | 'flute'
  /** 단어 듣기 묶음 — 동물 소리 게임(발자국). */
  | 'paw'
  /** 단어 듣기 묶음 — 단어 카드(겹친 카드). */
  | 'cards'
  /* --- 소리 찾기(freqFind)가 쓰는 것. --- */
  | 'waves'
  | 'frequency'
  | 'snorkel'
  | 'close'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'chevronUp'
  | 'play'
  | 'pause'
  | 'sliders'
  | 'mic'
  | 'alert'
  | 'info'
  | 'minus'
  | 'plus'
  | 'compass';

type IconProps = {
  name: IconName;
  size?: number;
  color: string;
  /** 시안은 얇은 선(1.8). 작게 쓸 때만 올린다. */
  strokeWidth?: number;
};

/**
 * 시안의 선 아이콘 세트. 24×24 그리드·라운드 캡으로 통일한다.
 * 새 아이콘은 여기에 이름을 추가해서 쓴다(화면에서 SVG를 직접 그리지 않음).
 */
export function Icon({ name, size = 24, color, strokeWidth = 1.8 }: Readonly<IconProps>) {
  const freqGradId = `freqGrad${useId().replace(/:/g, '')}`;
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'logo' ? (
        <>
          <Path d="M3 12a9 9 0 0 1 9-9v9" {...stroke} />
          <Path d="M12 12a9 9 0 0 0 9 9" {...stroke} />
          <Circle cx="12" cy="12" r="2.5" {...stroke} />
        </>
      ) : null}

      {/*
        훈련 3종은 **아이콘만으로 구분되어야 한다**. 예전엔 높낮이·다른 음이 같은
        파형(wave)을 써서 제목을 읽어야 구분됐다. 그래서 각 과제의 성격을 그림에 담는다:
        높이 대비(bars) / 다른 하나 찾기(findTone) / 진동(vibrate).
        연습 선택 카드와 시작 화면이 같은 아이콘을 쓰므로 여기서 바꾸면 둘 다 따라온다.
      */}
      {name === 'bars' ? (
        <>
          {/* 낮은 쪽은 흐리게 — 두 소리의 '높이 차'가 그림의 주제. */}
          <Rect x="4" y="14" width="5" height="6" rx="1.4" fill={color} opacity={0.4} />
          <Rect x="15" y="7" width="5" height="13" rx="1.4" fill={color} />
        </>
      ) : null}

      {name === 'findTone' ? (
        <>
          <Circle cx="10" cy="10" r="6.4" {...stroke} />
          <Path d="M14.7 14.7L20 20" {...stroke} />
          {/* 렌즈 안 점 셋 — 가운데 하나만 크다(= 찾아야 할 다른 음). */}
          <Circle cx="7.7" cy="10" r="0.9" fill={color} opacity={0.5} />
          <Circle cx="10.6" cy="10" r="1.5" fill={color} />
          <Circle cx="13" cy="10" r="0.9" fill={color} opacity={0.5} />
        </>
      ) : null}

      {name === 'vibrate' ? (
        <>
          <Circle cx="12" cy="12" r="2" fill={color} />
          <Path d="M7.5 8.5a6 6 0 0 0 0 7" {...stroke} />
          <Path d="M16.5 8.5a6 6 0 0 1 0 7" {...stroke} />
        </>
      ) : null}

      {name === 'list' ? <Path d="M4 5h16M4 12h16M4 19h10" {...stroke} /> : null}

      {name === 'chart' ? (
        <>
          {/* 통계 진입점용 — 막대별 fill. color prop은 기준선에만 쓴다. */}
          <Path d="M4 20h16" {...stroke} />
          <Rect x="5.5" y="14" width="3" height="6" rx="0.8" fill={Colors.light.accent} />
          <Rect x="10.5" y="9" width="3" height="11" rx="0.8" fill={Colors.light.highlight} />
          <Rect x="15.5" y="5" width="3" height="15" rx="0.8" fill={Colors.light.positive} />
        </>
      ) : null}

      {name === 'check' ? <Path d="M20 6L9 17l-5-5" {...stroke} strokeWidth={strokeWidth + 0.4} /> : null}

      {name === 'headphones' ? (
        <>
          <Path d="M4 13v-1a8 8 0 0 1 16 0v1" {...stroke} />
          <Rect x="3" y="13" width="4" height="7" rx="1.5" {...stroke} />
          <Rect x="17" y="13" width="4" height="7" rx="1.5" {...stroke} />
        </>
      ) : null}

      {name === 'speaker' ? (
        <>
          <Path d="M4 9v6h4l5 4V5L8 9H4z" {...stroke} />
          <Path d="M17 8a5 5 0 0 1 0 8" {...stroke} />
        </>
      ) : null}

      {name === 'stop' ? (
        <Rect x="6" y="6" width="12" height="12" rx="2" {...stroke} strokeWidth={strokeWidth + 0.2} />
      ) : null}

      {name === 'arrowUp' ? (
        <Path d="M12 5v14M12 5l-6 6M12 5l6 6" {...stroke} />
      ) : null}

      {name === 'arrowDown' ? (
        <Path d="M12 19V5M12 19l-6-6M12 19l6-6" {...stroke} />
      ) : null}

      {name === 'bingoLine' ? (
        <>
          <Rect x="3" y="3" width="5" height="5" rx="1" {...stroke} opacity={0.45} />
          <Rect x="9.5" y="3" width="5" height="5" rx="1" {...stroke} opacity={0.45} />
          <Rect x="16" y="3" width="5" height="5" rx="1" {...stroke} opacity={0.45} />
          <Rect x="3" y="9.5" width="5" height="5" rx="1" fill={color} />
          <Rect x="9.5" y="9.5" width="5" height="5" rx="1" fill={color} />
          <Rect x="16" y="9.5" width="5" height="5" rx="1" fill={color} />
          <Rect x="3" y="16" width="5" height="5" rx="1" {...stroke} opacity={0.45} />
          <Rect x="9.5" y="16" width="5" height="5" rx="1" {...stroke} opacity={0.45} />
          <Rect x="16" y="16" width="5" height="5" rx="1" {...stroke} opacity={0.45} />
        </>
      ) : null}

      {name === 'oneChar' ? (
        <Rect x="7" y="5" width="10" height="14" rx="2" {...stroke} />
      ) : null}

      {name === 'twoChar' ? (
        <>
          <Rect x="3" y="5" width="8" height="14" rx="2" {...stroke} />
          <Rect x="13" y="5" width="8" height="14" rx="2" {...stroke} />
        </>
      ) : null}

      {name === 'sentence' ? (
        <>
          <Rect x="3" y="6" width="5.5" height="12" rx="1" {...stroke} />
          <Rect x="9.25" y="6" width="5.5" height="12" rx="1" {...stroke} />
          <Rect x="15.5" y="6" width="5.5" height="12" rx="1" {...stroke} />
        </>
      ) : null}

      {/*
        악기 넷은 **보기 칸에서 서로 구분되어야 한다** — 글자를 읽기 전에 어느
        악기인지 짚을 수 있게 실루엣을 최대한 다르게 잡았다. 건반(가로 사각 + 검은
        건반) / 몸통 원 + 목(기타) / 줄을 가로지르는 활(바이올린) / 구멍 뚫린 가로
        관(플루트). 기타와 바이올린이 둘 다 「줄」이라 가장 헷갈리므로, 바이올린은
        몸통을 그리지 않고 활 하나로 못 박는다.
      */}
      {name === 'pianoKeys' ? (
        <>
          <Rect x="3" y="6" width="18" height="12" rx="2" {...stroke} />
          <Path d="M9 6v12M15 6v12" {...stroke} />
          <Rect x="7.6" y="6" width="2.8" height="7" rx="0.6" fill={color} />
          <Rect x="13.6" y="6" width="2.8" height="7" rx="0.6" fill={color} />
        </>
      ) : null}

      {name === 'guitar' ? (
        <>
          <Circle cx="8.5" cy="15.5" r="5.5" {...stroke} />
          <Circle cx="8.5" cy="15.5" r="1.6" fill={color} />
          <Path d="M12.4 11.6L18.6 5.4" {...stroke} />
          <Path d="M17.2 4L20 6.8" {...stroke} />
        </>
      ) : null}

      {name === 'drum' ? (
        <>
          <Rect x="3.5" y="8" width="17" height="10" rx="5" {...stroke} />
          <Path d="M3.5 13h17" {...stroke} />
          <Path d="M14 7L19.5 3.2" {...stroke} />
          <Path d="M16 8.2L21.2 5" {...stroke} />
        </>
      ) : null}

      {name === 'violin' ? (
        <>
          <Path d="M8 4v16M12 4v16M16 4v16" {...stroke} opacity={0.45} />
          <Path d="M3 16.5L21 8.5" {...stroke} strokeWidth={strokeWidth + 0.6} />
        </>
      ) : null}

      {name === 'flute' ? (
        <>
          <Rect x="2.5" y="10" width="19" height="4" rx="2" {...stroke} />
          <Circle cx="5.8" cy="12" r="1.1" {...stroke} />
          <Circle cx="10.2" cy="12" r="0.9" fill={color} />
          <Circle cx="13.4" cy="12" r="0.9" fill={color} />
          <Circle cx="16.6" cy="12" r="0.9" fill={color} />
        </>
      ) : null}
      {/*
        단어 듣기 묶음에 붙은 B 화면 둘. 기존 단어 아이콘(한 글자·두 글자·빙고)이 전부
        「네모 칸」이라, 둘은 칸이 아닌 실루엣으로 갈라 놓았다 — 발자국 / 겹친 카드.
      */}
      {name === 'paw' ? (
        <>
          <Path d="M12 20c-3 0-5.4-1.7-5.4-4.1 0-1.8 1.3-2.9 2.5-4.2C10.2 10.4 11 9.2 12 9.2s1.8 1.2 2.9 2.5c1.2 1.3 2.5 2.4 2.5 4.2C17.4 18.3 15 20 12 20z" {...stroke} />
          <Circle cx="5.8" cy="9.5" r="1.6" fill={color} />
          <Circle cx="9.4" cy="5.6" r="1.6" fill={color} />
          <Circle cx="14.6" cy="5.6" r="1.6" fill={color} />
          <Circle cx="18.2" cy="9.5" r="1.6" fill={color} />
        </>
      ) : null}

      {name === 'cards' ? (
        <>
          <Rect x="7" y="3" width="14" height="15" rx="2" {...stroke} opacity={0.45} />
          <Rect x="3" y="6.5" width="14" height="15" rx="2" {...stroke} />
          <Path d="M6.5 12h7M6.5 15.5h4.5" {...stroke} />
        </>
      ) : null}

      {name === 'waves' ? (
        <>
          <Path
            d="M3 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 4 2"
            {...stroke}
          />
          <Path
            d="M3 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 4 2"
            {...stroke}
          />
        </>
      ) : null}

      {name === 'frequency' ? (
        <>
          <Defs>
            <RadialGradient
              id={freqGradId}
              cx="12"
              cy="12"
              r="12"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#E14BFF" />
              <Stop offset="0.5" stopColor="#7B6CFF" />
              <Stop offset="1" stopColor="#2EE6E0" />
            </RadialGradient>
          </Defs>
          <Circle cx="12" cy="12" r="1.55" fill={`url(#${freqGradId})`} />
          <Path
            d="M8.6 8.6a4.8 4.8 0 0 0 0 6.8"
            stroke={`url(#${freqGradId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M15.4 8.6a4.8 4.8 0 0 1 0 6.8"
            stroke={`url(#${freqGradId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M6.4 6.2a8.2 8.2 0 0 0 0 11.6"
            stroke={`url(#${freqGradId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M17.6 6.2a8.2 8.2 0 0 1 0 11.6"
            stroke={`url(#${freqGradId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M4.2 3.8a11.4 11.4 0 0 0 0 16.4"
            stroke={`url(#${freqGradId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M19.8 3.8a11.4 11.4 0 0 1 0 16.4"
            stroke={`url(#${freqGradId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : null}

      {name === 'snorkel' ? (
        <>
          <Rect x="3" y="11" width="15" height="5.5" rx="2.75" {...stroke} />
          <Rect x="9.5" y="7.5" width="4.5" height="3.5" rx="1" {...stroke} />
          <Path d="M12 7.5V5" {...stroke} />
          <Path d="M10.5 5h3" {...stroke} strokeWidth={strokeWidth + 0.2} />
          <Circle cx="6.5" cy="13.8" r="1.1" {...stroke} />
          <Circle cx="10" cy="13.8" r="1.1" {...stroke} />
          <Path d="M18 10.5v6" {...stroke} />
        </>
      ) : null}

      {name === 'close' ? <Path d="M6 6l12 12M18 6L6 18" {...stroke} /> : null}
      {name === 'chevronLeft' ? <Path d="M15 5l-7 7 7 7" {...stroke} /> : null}
      {name === 'chevronRight' ? <Path d="M9 5l7 7-7 7" {...stroke} /> : null}
      {name === 'chevronDown' ? <Path d="M5 9l7 7 7-7" {...stroke} /> : null}
      {name === 'chevronUp' ? <Path d="M5 15l7-7 7 7" {...stroke} /> : null}

      {name === 'play' ? (
        <Path d="M8 5.5v13l10-6.5-10-6.5z" fill={color} />
      ) : null}

      {name === 'pause' ? (
        <>
          <Rect x="6" y="5" width="4" height="14" rx="1.2" fill={color} />
          <Rect x="14" y="5" width="4" height="14" rx="1.2" fill={color} />
        </>
      ) : null}

      {name === 'sliders' ? (
        <>
          <Path d="M4 8h16M4 16h16" {...stroke} />
          <Circle cx="9" cy="8" r="2.2" fill={color} />
          <Circle cx="15" cy="16" r="2.2" fill={color} />
        </>
      ) : null}

      {name === 'mic' ? (
        <>
          <Rect x="9" y="3" width="6" height="11" rx="3" {...stroke} />
          <Path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" {...stroke} />
        </>
      ) : null}

      {name === 'alert' ? (
        <>
          <Path d="M12 4L3 19h18L12 4z" {...stroke} />
          <Path d="M12 10v4" {...stroke} />
          <Circle cx="12" cy="16.5" r="0.9" fill={color} />
        </>
      ) : null}

      {name === 'info' ? (
        <>
          <Circle cx="12" cy="12" r="8.5" {...stroke} />
          <Path d="M12 11v5" {...stroke} />
          <Circle cx="12" cy="8" r="0.9" fill={color} />
        </>
      ) : null}

      {name === 'minus' ? (
        <Path d="M6 12h12" {...stroke} strokeWidth={strokeWidth + 0.4} />
      ) : null}
      {name === 'plus' ? (
        <Path
          d="M12 6v12M6 12h12"
          {...stroke}
          strokeWidth={strokeWidth + 0.4}
        />
      ) : null}

      {name === 'compass' ? (
        <>
          <Circle cx="12" cy="12" r="8.5" {...stroke} />
          <Path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" fill={color} />
        </>
      ) : null}
    </Svg>
  );
}
