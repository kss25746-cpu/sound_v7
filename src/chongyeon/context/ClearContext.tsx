import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useEffect, useState, useMemo } from 'react';

const CLEAR_STORAGE_KEY = '@MiniGameApp:clearData';

interface ClearData {
    [gameId: string]: true;
}

interface ClearContextType {
    clearData: ClearData;
    markAsCleared: (gameId: string) => void;
    resetAll: () => Promise<void>;
    /** 넘긴 키만 지운다. 미션 창 「초기화」가 쓴다 — 다른 콘텐츠의 기록은 남는다 */
    resetKeys: (keys: string[]) => void;
}

export const ClearContext = createContext<ClearContextType | undefined>(undefined);

export const ClearProvider = ({ children }: { children: ReactNode }) => {
    const [clearData, setClearData] = useState<ClearData>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const loadClearData = async () => {
            try {
                const savedData = await AsyncStorage.getItem(CLEAR_STORAGE_KEY);
                if (savedData) {
                    setClearData(JSON.parse(savedData));
                }
            } catch (e) {
                console.error('Failed to load clear data.', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadClearData();
    }, []);

    useEffect(() => {
        if (!isLoading) {
            AsyncStorage.setItem(CLEAR_STORAGE_KEY, JSON.stringify(clearData))
                .catch(e => console.error('Failed to save clear data.', e));
        }
    }, [clearData, isLoading]);

    const markAsCleared = (gameId: string) => {
        if (clearData[gameId]) {
            return;
        }
        console.log(`🎉 '${gameId}' 게임을 클리어했습니다! 🎉`);
        setClearData(prevData => ({
            ...prevData,
            [gameId]: true,
        }));
    };

    const resetAll = async () => {
        try {
            await AsyncStorage.removeItem(CLEAR_STORAGE_KEY);
            setClearData({});
            console.log('Clear 데이터 초기화 완료');
        } catch (e) {
            console.error('Failed to reset clear data.', e);
        }
    };

    const resetKeys = (keys: string[]) => {
        // 저장은 위 effect가 맡는다 — 바뀐 객체가 통째로 다시 쓰인다
        setClearData(prevData => {
            const next = { ...prevData };
            keys.forEach(key => delete next[key]);
            return next;
        });
    };

    const value = useMemo(() => ({ clearData, markAsCleared, resetAll, resetKeys }), [clearData, markAsCleared]);

    return (
        <ClearContext.Provider value={value}>
            {children}
        </ClearContext.Provider>
    );
};