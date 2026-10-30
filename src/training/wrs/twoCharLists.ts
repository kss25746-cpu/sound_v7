/**
 * 두 글자 연습 3장. 사용자 이미지 표(장당 정답 12 + 어려운 오답).
 * 공식 검사 표와 같다고 보지 않음. UI에 표준 검사 이름을 쓰지 않음.
 */

export type TwoCharItem = {
  target: string;
  hard: string;
};

export const TWO_CHAR_LISTS: readonly (readonly TwoCharItem[])[] = [
  [
    { target: "편지", hard: "먼지" },
    { target: "달걀", hard: "달력" },
    { target: "시간", hard: "시각" },
    { target: "육군", hard: "육교" },
    { target: "신발", hard: "선반" },
    { target: "땅콩", hard: "땅굴" },
    { target: "안개", hard: "날개" },
    { target: "마음", hard: "마을" },
    { target: "허리", hard: "머리" },
    { target: "욕심", hard: "욕실" },
    { target: "노래", hard: "모래" },
    { target: "저녁", hard: "전역" },
  ],
  [
    { target: "사람", hard: "사랑" },
    { target: "토끼", hard: "도끼" },
    { target: "병원", hard: "정원" },
    { target: "등대", hard: "들개" },
    { target: "논밭", hard: "눈밭" },
    { target: "과일", hard: "파일" },
    { target: "송곳", hard: "송금" },
    { target: "딸기", hard: "말기" },
    { target: "문제", hard: "문체" },
    { target: "나무", hard: "나물" },
    { target: "극장", hard: "복장" },
    { target: "가위", hard: "바위" },
  ],
  [
    { target: "그림", hard: "기름" },
    { target: "아들", hard: "하늘" },
    { target: "팥죽", hard: "반죽" },
    { target: "동생", hard: "고생" },
    { target: "목표", hard: "모포" },
    { target: "냄새", hard: "냄비" },
    { target: "바다", hard: "바닥" },
    { target: "자연", hard: "자원" },
    { target: "접시", hard: "접수" },
    { target: "권투", hard: "전투" },
    { target: "방석", hard: "방식" },
    { target: "느낌", hard: "눈길" },
  ],
];

export const TWO_CHAR_LIST_COUNT = TWO_CHAR_LISTS.length;
export const TWO_CHAR_TRIAL_COUNT = 12;
