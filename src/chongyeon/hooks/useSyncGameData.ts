import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 서버 주소
const BASE_URL = 'https://rais.bigdata-lifelog.kr/sound/record';
const AUTH_STORAGE_KEY = '@auth_user_data';
const CACHE_PREFIX = '@cache_record_';
const PENDING_RECORDS_KEY = `${CACHE_PREFIX}pending_records`;

// 카테고리 명칭 자동 변환 맵
const CATEGORY_MAP: Record<string, string> = {
  guitar: 'guitar',
  music: 'music',
  matchGame: 'match_game',
  matchGameAI: 'match_game_ai',
  orderGame: 'order_game',
  ling6: 'ling6',
  wrsSingle: 'wrs_single',
  wrsDouble: 'wrs_double',
  sentenceListen: 'sentence_listen',
  listenChoose: 'listen_choose',
  pitch: 'pitch',
  freqFind: 'freq_find',
};

// 로그인된 유저 세션 정보 추출
async function getAuthUser(): Promise<{ platform: string; socialId: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const platform = parsed.provider;
    const socialId = parsed.user?.id || parsed.id;
    return platform && socialId ? { platform, socialId } : null;
  } catch {
    return null;
  }
}

// 미전송 데이터 전송
async function syncPendingRecords(): Promise<void> {
  const authUser = await getAuthUser();
  if (!authUser) return;

  try {
    const raw = await AsyncStorage.getItem(PENDING_RECORDS_KEY);
    if (!raw) return;

    const pendingRecords: {
      category: string;
      data: Record<string, any>;
    }[] = JSON.parse(raw);

    const remainingRecords = [];

    for (const record of pendingRecords) {
      // 현재 로그인한 계정의 데이터만 전송
      if (
        record.data.platform !== authUser.platform ||
        record.data.social_id !== authUser.socialId
      ) {
        remainingRecords.push(record);
        continue;
      }

      try {
        const response = await fetch(
          `${BASE_URL}/${record.category}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record.data),
          }
        );

        if (!response.ok) {
          throw new Error(`서버 에러: ${response.status}`);
        }

        console.log(`[${record.category}] 미전송 데이터 전송 완료`);
      } catch (error) {
        console.warn(`[${record.category}] 재전송 실패:`, error);
        remainingRecords.push(record);
      }
    }

    await AsyncStorage.setItem(
      PENDING_RECORDS_KEY,
      JSON.stringify(remainingRecords)
    );
  } catch (error) {
    console.error('미전송 데이터 처리 실패:', error);
  }
}

// 서버 전체 데이터 동기화
export async function syncAllFromServer(): Promise<boolean> {
  const authUser = await getAuthUser();
  if (!authUser) return false;

  try {
    const res = await fetch(`${BASE_URL}/sync-all?platform=${authUser.platform}&social_id=${authUser.socialId}`);
    const json = await res.json();
    if (!json.success || !json.data) return false;

    // 모든 카테고리 데이터를 AsyncStorage에 각각 캐싱 저장
    const pairs: [string, string][] = Object.entries(json.data).map(([cat, val]) => [
      `${CACHE_PREFIX}${cat}`,
      JSON.stringify(val),
    ]);
    await AsyncStorage.multiSet(pairs);
    console.log('동기화 완료: 서버 전체 데이터 스토리지 캐싱 완료');
    return true;
  } catch (error) {
    console.warn('동기화 실패:', error);
    return false;
  }
}

// 데이터 저장
export async function sendRecord(gameIdOrCategory: string, data: Record<string, any>): Promise<boolean> {
  const authUser = await getAuthUser();
  if (!authUser) return false;

  const category = CATEGORY_MAP[gameIdOrCategory] || gameIdOrCategory;
  const nowIso = new Date().toISOString();

  // Store들이 찾는 언더바 필드 추출
  const summary = data.summary || {};
  const byPhoneme = summary.byPhoneme || {};

  const newRecord = {
    platform: authUser.platform,
    social_id: authUser.socialId,
    timestamp: nowIso,
    played_at: nowIso,
    saved_at: data.savedAt || nowIso,
    date_key: data.dateKey || nowIso.slice(0, 10),

    schema_version: data.schemaVersion || 1,

    trial_count: summary.trialCount ?? data.total_attempts,
    correct_count: summary.correctCount ?? data.correct_count,
    percent: summary.percent ?? data.accuracy_rate,
    pass_count: summary.passCount,
    phoneme_m: byPhoneme.m,
    phoneme_u: byPhoneme.u,
    phoneme_a: byPhoneme.a,
    phoneme_i: byPhoneme.i,
    phoneme_sh: byPhoneme.sh,
    phoneme_s: byPhoneme.s,

    level_cents: summary.levelCents ?? null,
    end_reason: summary.endReason ?? 'complete',

    gameData: data,
    ...data,
  };

  // 로컬 스토리지에 데이터 저장
  try {
    const cacheKey = `${CACHE_PREFIX}${category}`;
    const raw = await AsyncStorage.getItem(cacheKey);
    let list: any[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    list.unshift(newRecord);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(list));
  } catch (error) {
    console.warn('로컬 스토리지 저장 실패:', error);
  }

  // 미전송 데이터 전송
  await syncPendingRecords();

  // 서버로 데이터 전송
  try {
    const response = await fetch(`${BASE_URL}/${category}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
    });
    if (!response.ok) {
      throw new Error(`서버 에러: ${response.status}`);
    }
    console.log(`[${category}] 서버 전송 완료`);
    return true;
  } catch (error) {
    console.warn(`[${category}] 서버 전송 실패 (오프라인 저장됨):`, error);

    // 미전송 데이터 저장
    try {
      const raw = await AsyncStorage.getItem(PENDING_RECORDS_KEY);
      const pendingRecords = raw ? JSON.parse(raw) : [];
      pendingRecords.push({ category, data: newRecord });
      await AsyncStorage.setItem(
        PENDING_RECORDS_KEY,
        JSON.stringify(pendingRecords)
      );
    } catch (storageError) {
      console.error('미전송 데이터 저장 실패:', storageError);
    }

    return false;
  }
}

// 데이터 불러오기
export async function fetchRecord(gameIdOrCategory: string, limit: number = 50): Promise<any[]> {
  const category = CATEGORY_MAP[gameIdOrCategory] || gameIdOrCategory;
  try {
    // 로컬 스토리지에서 데이터 조회
    const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${category}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed.slice(0, limit) : (parsed ? [parsed] : []);
    }
  } catch (error) {
    console.warn(`[${category}] 로컬 캐시 읽기 오류:`, error);
  }
  return [];
}

// 데이터 삭제
export async function deleteRecord(gameIdOrCategory: string, recordId?: string | number): Promise<boolean> {
  const authUser = await getAuthUser();
  if (!authUser) return false;

  const category = CATEGORY_MAP[gameIdOrCategory] || gameIdOrCategory;

  // 서버 데이터 삭제
  try {
    const idQuery = recordId !== undefined ? `&id=${recordId}` : '';
    const res = await fetch(`${BASE_URL}/${category}?platform=${authUser.platform}&social_id=${authUser.socialId}${idQuery}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      console.error(`[${category}] 서버 삭제 실패: 서버 에러 ${res.status}`);
      throw new Error(`서버 에러: ${res.status}`);
    }

    // 서버 삭제 성공 시 로컬 스토리지 캐시 삭제
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${category}`);

    // 미전송 대기열에서도 해당 카테고리 데이터 제거
    try {
      const raw = await AsyncStorage.getItem(PENDING_RECORDS_KEY);
      if (raw) {
        const pendingRecords = JSON.parse(raw);
        const filtered = pendingRecords.filter((item: any) => item.category !== category);
        await AsyncStorage.setItem(PENDING_RECORDS_KEY, JSON.stringify(filtered));
      }
    } catch (storageError) {
      console.warn('미전송 대기열 정리 실패:', storageError);
    }

    console.log(`[${category}] 서버 및 로컬 삭제 완료`);
    return true;
  } catch (error: any) {
    console.error(`[${category}] 서버 삭제 실패:`, error);

    const errMessage = String(error?.message || '').toLowerCase();
    
    // 네트워크 연결 실패, fetch 실패, 타임아웃, 연결 거부 등의 경우를 모두 포착
    if (
      error instanceof TypeError ||
      errMessage.includes('fetch failed') ||
      errMessage.includes('network request failed') ||
      errMessage.includes('networkerror') ||
      errMessage.includes('connect')
    ) {
      throw new Error('NETWORK_ERROR');
    }

    throw error;
  }
}

// 화면(Screen) 컴포넌트에서 쓰는 리액트 훅
export const useSyncGameData = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncData = useCallback(async (gameId: string, data: Record<string, any>) => {
    setIsSyncing(true);
    setSyncError(null);
    const success = await sendRecord(gameId, data);
    setIsSyncing(false);
    if (!success) setSyncError('전송 실패');
    return success;
  }, []);

  const fetchData = useCallback(async (gameId: string, limit: number = 50) => {
    return await fetchRecord(gameId, limit);
  }, []);

  return { syncData, fetchData, isSyncing, syncError };
};