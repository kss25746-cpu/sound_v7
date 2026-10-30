/**
 * P0-2 회귀 방지 — 저장소 접근 직렬화.
 *
 * AsyncStorage를 **지연이 있는** 인메모리 목으로 대체한다. 지연이 없으면
 * read→write 사이에 다른 호출이 끼어들 틈이 없어 경합 자체가 재현되지 않는다.
 */

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  return {
    __esModule: true,
    default: {
      getItem: async (key: string): Promise<string | null> => {
        await delay();
        return store[key] ?? null;
      },
      setItem: async (key: string, value: string): Promise<void> => {
        await delay();
        store[key] = value;
      },
      removeItem: async (key: string): Promise<void> => {
        await delay();
        delete store[key];
      },
      __setRaw: (key: string, value: string): void => {
        store[key] = value;
      },
      __reset: (): void => {
        store = {};
      },
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PitchCompareSummary } from '@/training/pitch2afc/pitchSummary';
import {
  MAX_MEASURE_SESSIONS,
  SESSION_RECORD_VERSION,
  appendFreqFindSessionRecord,
  appendPitch2SessionSummary,
  clearSavedSessions,
  deleteSavedSession,
  deleteSavedSessionsByTrack,
  getLatestFreqFindSession,
  isCountedInStats,
  listSavedFreqFindSessions,
  listSavedSessions,
} from '@/training/sessionStore';

const storageMock = AsyncStorage as unknown as {
  __reset: () => void;
  __setRaw: (key: string, value: string) => void;
};

const STORAGE_KEY = 'training.sessionHistory.v1';

function pitch2Summary(trialCount: number): PitchCompareSummary {
  return {
    trialCount,
    correctCount: trialCount,
    percent: trialCount <= 0 ? 0 : 100,
    levelCents: 200,
    endReason: 'complete',
  };
}

function freqFindData() {
  return {
    grades: {
      s1: {
        high: { heard: 3, total: 3, status: 'ok' as const },
        mid: { heard: 3, total: 3, status: 'ok' as const },
        low: { heard: 3, total: 3, status: 'ok' as const },
      },
      s2: {
        high: { correct: 5, total: 5, status: 'pass' as const },
        mid: { correct: 4, total: 5, status: 'pass' as const },
        low: { correct: 5, total: 5, status: 'pass' as const },
      },
      s3: null,
      s4: null,
    },
    summary: {
      high: {
        tone: null,
        screen: null,
        fine: null,
        versus: null,
        final: 'pass' as const,
      },
      mid: {
        tone: null,
        screen: null,
        fine: null,
        versus: null,
        final: 'pass' as const,
      },
      low: {
        tone: null,
        screen: null,
        fine: null,
        versus: null,
        final: 'pass' as const,
      },
    },
  };
}

beforeEach(() => {
  storageMock.__reset();
  storageMock.__setRaw(
    '@auth_user_data',
    JSON.stringify({ provider: 'test', id: 'user-1' }),
  );
  global.fetch = jest.fn(async () => ({ ok: true })) as unknown as typeof fetch;
});

describe('sessionStore — 저장 직렬화', () => {
  it('동시에 저장한 두 건이 모두 남는다', async () => {
    const [freq, am] = await Promise.all([
      appendPitch2SessionSummary(pitch2Summary(15)),
      appendFreqFindSessionRecord(freqFindData()),
    ]);

    const rows = await listSavedSessions();

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id).sort()).toEqual([freq.id, am.id].sort());
  });

  it('동시에 저장한 다섯 건이 모두 남는다', async () => {
    await Promise.all(
      Array.from({ length: 5 }, (_, i) => appendPitch2SessionSummary(pitch2Summary(i + 1)))
    );

    const rows = await listSavedSessions();

    expect(rows).toHaveLength(5);
    expect(new Set(rows.map((r) => r.id)).size).toBe(5);
  });

  it('저장 직후 목록 조회가 방금 저장한 건을 포함한다', async () => {
    const record = await appendPitch2SessionSummary(pitch2Summary(7));
    const rows = await listSavedSessions();

    expect(rows[0].id).toBe(record.id);
    expect(rows[0].track).toBe('pitch2');
  });

  it('pitch2 두 건과 소리 찾기를 동시에 저장해도 모두 남는다', async () => {
    const [freq, am, pitch2] = await Promise.all([
      appendPitch2SessionSummary(pitch2Summary(15)),
      appendFreqFindSessionRecord(freqFindData()),
      appendPitch2SessionSummary(pitch2Summary(21)),
    ]);

    const rows = await listSavedSessions();

    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.id).sort()).toEqual(
      [freq.id, am.id, pitch2.id].sort()
    );
  });
});

describe('sessionStore — pitch2 트랙', () => {
  it('pitch2 요약을 저장하고 track/schemaVersion과 함께 읽는다', async () => {
    const record = await appendPitch2SessionSummary(pitch2Summary(12));
    const rows = await listSavedSessions();

    expect(rows[0].id).toBe(record.id);
    expect(rows[0].track).toBe('pitch2');
    expect(rows[0].schemaVersion).toBe(SESSION_RECORD_VERSION);
    if (rows[0].track === 'pitch2') {
      expect(rows[0].summary.trialCount).toBe(12);
    }
  });

  it('계단법 구기록은 맞힌 비율로 읽는다', async () => {
    storageMock.__setRaw(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: 'legacy-pitch2',
          track: 'pitch2',
          savedAt: '2026-08-07T00:00:00.000Z',
          schemaVersion: 1,
          mode: 'measure',
          summary: {
            trialCount: 20,
            correctCount: 15,
            reversalCount: 6,
            endReason: 'reversals',
            meanReversalCents: 40,
            easiestCents: 200,
            hardestCents: 30,
          },
        },
      ]),
    );

    const rows = await listSavedSessions();

    expect(rows).toHaveLength(1);
    expect(rows[0].track).toBe('pitch2');
    if (rows[0].track === 'pitch2') {
      expect(rows[0].summary.percent).toBe(75);
      expect(rows[0].summary.levelCents).toBeNull();
      expect(rows[0].summary.correctCount).toBe(15);
    }
  });
});

describe('sessionStore — 기존 동작 유지', () => {
  it('최신 기록이 앞에 온다', async () => {
    const first = await appendPitch2SessionSummary(pitch2Summary(1));
    const second = await appendFreqFindSessionRecord(freqFindData());

    const rows = await listSavedSessions();

    expect(rows.map((r) => r.id)).toEqual([second.id, first.id]);
  });

  it(`한 트랙 측정이 ${MAX_MEASURE_SESSIONS}건을 넘으면 그 트랙 오래된 측정만 버린다`, async () => {
    for (let i = 0; i < MAX_MEASURE_SESSIONS + 3; i++) {
      await appendPitch2SessionSummary(pitch2Summary(i), 'measure');
    }

    const rows = await listSavedSessions();

    expect(rows).toHaveLength(MAX_MEASURE_SESSIONS);
    // 최신이 앞 → 마지막에 넣은 trialCount가 맨 앞
    if (rows[0].track === 'pitch2') {
      expect(rows[0].summary.trialCount).toBe(MAX_MEASURE_SESSIONS + 2);
    }
  });

  it('귀풀기(practice)는 저장하지 않는다', async () => {
    await appendPitch2SessionSummary(pitch2Summary(3), 'practice');

    expect(await listSavedSessions()).toEqual([]);
  });

  it('귀풀기를 넣어도 측정 이력은 그대로다', async () => {
    for (let i = 0; i < MAX_MEASURE_SESSIONS; i++) {
      await appendPitch2SessionSummary(pitch2Summary(i), 'measure');
    }
    for (let i = 0; i < 10; i++) {
      await appendFreqFindSessionRecord(freqFindData(), 'practice');
    }

    const rows = await listSavedSessions();
    const measureCount = rows.filter((r) => r.mode === 'measure').length;
    const practiceCount = rows.filter((r) => r.mode === 'practice').length;

    expect(measureCount).toBe(MAX_MEASURE_SESSIONS);
    expect(practiceCount).toBe(0);
    expect(rows).toHaveLength(MAX_MEASURE_SESSIONS);
  });

  it('측정 상한은 트랙별 — 한 트랙을 넘쳐도 다른 트랙 측정은 남는다', async () => {
    for (let i = 0; i < 5; i++) {
      await appendFreqFindSessionRecord(freqFindData(), 'measure');
    }
    for (let i = 0; i < MAX_MEASURE_SESSIONS + 3; i++) {
      await appendPitch2SessionSummary(pitch2Summary(i), 'measure');
    }

    const rows = await listSavedSessions();
    const pitchMeasure = rows.filter(
      (r) => r.track === 'pitch2' && r.mode === 'measure'
    );
    const findMeasure = rows.filter(
      (r) => r.track === 'freqFind' && r.mode === 'measure'
    );

    expect(pitchMeasure).toHaveLength(MAX_MEASURE_SESSIONS);
    expect(findMeasure).toHaveLength(5);
  });

  it('새 저장은 옛 키의 귀풀기 기록을 지우지 않는다', async () => {
    storageMock.__setRaw(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: 'old-practice',
          track: 'pitch2',
          savedAt: '2026-08-07T00:00:00.000Z',
          schemaVersion: 2,
          mode: 'practice',
          summary: pitch2Summary(3),
        },
      ])
    );

    await appendFreqFindSessionRecord(freqFindData(), 'measure');
    const rows = await listSavedSessions();

    expect(rows.map((r) => r.id)).toContain('old-practice');
    expect(rows.some((r) => r.track === 'freqFind' && r.mode === 'measure')).toBe(
      true,
    );
  });

  it('저장된 값이 깨져 있으면 빈 목록으로 시작한다', async () => {
    storageMock.__setRaw(STORAGE_KEY, '{not json');

    const rows = await listSavedSessions();

    expect(rows).toEqual([]);
  });

  it('배열이 아닌 값이 저장돼 있으면 빈 목록으로 본다', async () => {
    storageMock.__setRaw(STORAGE_KEY, '{"a":1}');

    expect(await listSavedSessions()).toEqual([]);
  });

  it('초기화하면 목록이 빈다', async () => {
    await appendPitch2SessionSummary(pitch2Summary(3));
    await clearSavedSessions();

    expect(await listSavedSessions()).toEqual([]);
  });
});

describe('sessionStore — 건별 삭제', () => {
  it('지정한 1건만 지우고 나머지는 순서를 유지한다', async () => {
    const a = await appendPitch2SessionSummary(pitch2Summary(1), 'measure');
    const b = await appendFreqFindSessionRecord(freqFindData(), 'measure');
    const c = await appendPitch2SessionSummary(pitch2Summary(3), 'measure');

    await deleteSavedSession(b.id);

    const rows = await listSavedSessions();
    expect(rows.map((r) => r.id)).toEqual([c.id, a.id]);
  });

  it('없는 id면 목록을 그대로 둔다', async () => {
    const kept = await appendPitch2SessionSummary(pitch2Summary(1));

    await deleteSavedSession('missing-id');

    const rows = await listSavedSessions();
    expect(rows.map((r) => r.id)).toEqual([kept.id]);
  });

  it('마지막 1건을 지우면 목록이 빈다', async () => {
    const only = await appendFreqFindSessionRecord(freqFindData(), 'measure');

    await deleteSavedSession(only.id);

    expect(await listSavedSessions()).toEqual([]);
  });
});

describe('sessionStore — 트랙별 삭제', () => {
  it('지정한 트랙만 지우고 다른 트랙은 남긴다', async () => {
    const pitch = await appendPitch2SessionSummary(pitch2Summary(1), 'measure');
    const freqFirst = await appendPitch2SessionSummary(pitch2Summary(2), 'measure');
    const freqSecond = await appendPitch2SessionSummary(pitch2Summary(3), 'measure');
    const am = await appendFreqFindSessionRecord(freqFindData(), 'measure');

    await deleteSavedSessionsByTrack('pitch2');

    const rows = await listSavedSessions();
    expect(rows.map((r) => r.id)).toEqual([am.id]);
    expect(rows.some((r) => r.id === pitch.id)).toBe(false);
    expect(rows.some((r) => r.id === freqFirst.id)).toBe(false);
    expect(rows.some((r) => r.id === freqSecond.id)).toBe(false);
  });

  it('해당 트랙이 없으면 목록을 그대로 둔다', async () => {
    const kept = await appendFreqFindSessionRecord(freqFindData());

    await deleteSavedSessionsByTrack('pitch2');

    const rows = await listSavedSessions();
    expect(rows.map((r) => r.id)).toEqual([kept.id]);
  });

  it('마지막 트랙을 지우면 목록이 빈다', async () => {
    await appendPitch2SessionSummary(pitch2Summary(1), 'measure');
    await appendPitch2SessionSummary(pitch2Summary(2), 'measure');

    await deleteSavedSessionsByTrack('pitch2');

    expect(await listSavedSessions()).toEqual([]);
  });
});

describe('sessionStore — 연습/측정 모드', () => {
  it('귀풀기 mode는 저장하지 않고 연습만 남긴다', async () => {
    await appendPitch2SessionSummary(pitch2Summary(4), 'practice');
    await appendFreqFindSessionRecord(freqFindData(), 'measure');

    const rows = await listSavedSessions();

    expect(rows).toHaveLength(1);
    expect(rows[0].track).toBe('freqFind');
    expect(rows[0].mode).toBe('measure');
  });

  it('mode를 생략하면 측정으로 저장한다(호환 기본값)', async () => {
    await appendPitch2SessionSummary(pitch2Summary(4));

    const rows = await listSavedSessions();

    expect(rows[0].mode).toBe('measure');
  });

  it('isCountedInStats: 귀풀기만 제외, 연습·구버전(mode 없음)은 포함', async () => {
    const practice = {
      id: 'practice-row',
      track: 'pitch2' as const,
      savedAt: '2026-08-07T00:00:00.000Z',
      schemaVersion: 2,
      mode: 'practice' as const,
      summary: pitch2Summary(4),
    };
    const measure = {
      id: 'measure-row',
      track: 'pitch2' as const,
      savedAt: '2026-08-07T00:00:01.000Z',
      schemaVersion: 2,
      mode: 'measure' as const,
      summary: pitch2Summary(8),
    };
    storageMock.__setRaw(STORAGE_KEY, JSON.stringify([practice, measure]));

    const rows = await listSavedSessions();
    const counted = rows.filter(isCountedInStats).map((r) => r.id);

    expect(counted).toEqual(['measure-row']);
  });

  it('mode가 없는 구버전 레코드는 통계에 포함(측정 간주)', async () => {
    const legacy = {
      id: 'legacy-no-mode',
      track: 'pitch2' as const,
      savedAt: '2026-08-07T00:00:00.000Z',
      schemaVersion: 2,
      summary: pitch2Summary(10),
    };
    storageMock.__setRaw(STORAGE_KEY, JSON.stringify([legacy]));

    const rows = await listSavedSessions();

    expect(rows[0].mode).toBeUndefined();
    expect(isCountedInStats(rows[0])).toBe(true);
  });

  it('mode가 아는 값이 아니면 레코드를 버린다', async () => {
    const bad = {
      id: 'bad-mode',
      track: 'pitch2' as const,
      savedAt: '2026-08-07T00:00:00.000Z',
      schemaVersion: 2,
      mode: 'exam',
      summary: pitch2Summary(10),
    };
    storageMock.__setRaw(STORAGE_KEY, JSON.stringify([bad]));

    expect(await listSavedSessions()).toEqual([]);
  });
});

describe('sessionStore — 손상 레코드 방어 (P0-3)', () => {
  /** 형태가 온전한 pitch2 레코드 1건. */
  function goodRecord(id: string) {
    return {
      id,
      track: 'pitch2',
      savedAt: '2026-08-07T00:00:00.000Z',
      schemaVersion: 2,
      summary: pitch2Summary(10),
    };
  }

  function seed(...records: unknown[]): void {
    storageMock.__setRaw(STORAGE_KEY, JSON.stringify(records));
  }

  it('정상 레코드 사이에 섞인 손상 레코드만 버린다', async () => {
    seed(goodRecord('ok-1'), { track: 'freq' }, goodRecord('ok-2'));

    const rows = await listSavedSessions();

    expect(rows.map((r) => r.id)).toEqual(['ok-1', 'ok-2']);
  });

  it.each([
    ['summary가 없음', { id: 'x', track: 'freq', savedAt: '2026-08-07T00:00:00.000Z' }],
    ['summary가 null', { id: 'x', track: 'freq', savedAt: 'z', summary: null }],
    ['track이 모르는 값', { ...goodRecord('x'), track: 'unknown' }],
    ['id가 없음', { ...goodRecord('x'), id: undefined }],
    ['savedAt이 빈 문자열', { ...goodRecord('x'), savedAt: '' }],
    ['레코드가 null', null],
    ['레코드가 숫자', 42],
    [
      'trialCount가 문자열',
      { ...goodRecord('x'), summary: { ...pitch2Summary(1), trialCount: '다섯' } },
    ],
    [
      'endReason이 모르는 값',
      { ...goodRecord('x'), summary: { ...pitch2Summary(1), endReason: 'exploded' } },
    ],
    [
      '옛 다른 음 찾기 기록',
      {
        id: 'x',
        track: 'freq',
        savedAt: '2026-08-07T00:00:00.000Z',
        summary: { trialCount: 3 },
      },
    ],
    [
      '옛 떨림 기록',
      {
        id: 'x',
        track: 'am',
        savedAt: '2026-08-07T00:00:00.000Z',
        summary: { trialCount: 3 },
      },
    ],
    [
      'pitch2 요약이 비율 필드가 없음',
      {
        ...goodRecord('x'),
        summary: {
          trialCount: 3,
          correctCount: 1,
          reversalCount: 1,
          endReason: 'reversals',
          meanReversalDeltaCents: 10,
          easiestDeltaCents: 20,
          hardestDeltaCents: 5,
        },
      },
    ],
    [
      'pitch2 요약의 비율이 문자열',
      {
        ...goodRecord('x'),
        track: 'pitch2',
        summary: { ...pitch2Summary(3), percent: '낮음' },
      },
    ],
  ])('버린다: %s', async (_label, broken) => {
    seed(broken, goodRecord('survivor'));

    const rows = await listSavedSessions();

    expect(rows.map((r) => r.id)).toEqual(['survivor']);
  });

  it('칸이 없는 높낮이 비교 기록은 정상으로 본다', async () => {
    seed({
      ...goodRecord('nulls'),
      summary: {
        trialCount: 12,
        correctCount: 0,
        percent: 0,
        levelCents: null,
        endReason: 'complete',
      },
    });

    expect((await listSavedSessions()).map((r) => r.id)).toEqual(['nulls']);
  });

  it('schemaVersion이 없는 초기 저장분도 읽는다', async () => {
    const { schemaVersion: _omit, ...legacy } = goodRecord('legacy');
    seed(legacy);

    expect((await listSavedSessions()).map((r) => r.id)).toEqual(['legacy']);
  });

  it('새로 저장한 레코드에는 schemaVersion이 붙는다', async () => {
    await appendPitch2SessionSummary(pitch2Summary(5));

    const rows = await listSavedSessions();

    expect(rows[0].schemaVersion).toBe(SESSION_RECORD_VERSION);
  });

  it('손상 레코드는 다음 저장 때 저장소에서도 사라진다', async () => {
    seed({ garbage: true }, goodRecord('ok-1'));

    await appendPitch2SessionSummary(pitch2Summary(1));
    const rows = await listSavedSessions();

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id)).toContain('ok-1');
  });
});

describe('sessionStore — freqFind 트랙', () => {
  function freqFindData() {
    return {
      grades: {
        s1: {
          high: { heard: 3, total: 3, status: 'ok' as const },
          mid: { heard: 3, total: 3, status: 'ok' as const },
          low: { heard: 3, total: 3, status: 'ok' as const },
        },
        s2: {
          high: { correct: 5, total: 5, status: 'pass' as const },
          mid: { correct: 4, total: 5, status: 'pass' as const },
          low: { correct: 5, total: 5, status: 'pass' as const },
        },
        s3: null,
        s4: null,
      },
      summary: {
        high: {
          tone: null,
          screen: null,
          fine: null,
          versus: null,
          final: 'pass' as const,
        },
        mid: {
          tone: null,
          screen: null,
          fine: null,
          versus: null,
          final: 'pass' as const,
        },
        low: {
          tone: null,
          screen: null,
          fine: null,
          versus: null,
          final: 'pass' as const,
        },
      },
    };
  }

  it('freqFind 결과를 저장하고 기존 freq와 섞이지 않는다', async () => {
    const find = await appendFreqFindSessionRecord(freqFindData());
    await appendPitch2SessionSummary(pitch2Summary(10));

    const latest = await getLatestFreqFindSession();
    expect(latest?.id).toBe(find.id);
    expect(latest?.track).toBe('freqFind');

    const findRows = await listSavedFreqFindSessions();
    expect(findRows).toHaveLength(1);

    const all = await listSavedSessions();
    expect(all.map((r) => r.track).sort()).toEqual(['freqFind', 'pitch2']);
  });

  it('트랙별 삭제 시 freqFind만 지운다', async () => {
    await appendPitch2SessionSummary(pitch2Summary(10));
    await appendFreqFindSessionRecord(freqFindData());

    await deleteSavedSessionsByTrack('freqFind');

    expect(await listSavedFreqFindSessions()).toHaveLength(0);
    const all = await listSavedSessions();
    expect(all).toHaveLength(1);
    expect(all[0].track).toBe('pitch2');
  });
});
