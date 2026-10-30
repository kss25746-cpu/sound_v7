import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useEffect, useState, useMemo } from 'react';

const STAR_STORAGE_KEY = '@MiniGameApp:starData';

interface StarData {
    [gameId: string]: 1;
}

interface StarContextType {
    starData: StarData;
    addStar: (gameId: string) => void;
    resetAll: () => Promise<void>;
    /** 넘긴 키만 지운다. 미션 창 「초기화」가 쓴다 — 다른 콘텐츠의 기록은 남는다 */
    resetKeys: (keys: string[]) => void;
}

export const StarContext = createContext<StarContextType | undefined>(undefined);

export const StarProvider = ({ children }: { children: ReactNode }) => {
    const [starData, setStarData] = useState<StarData>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const loadStars = async () => {
            try {
                const savedStars = await AsyncStorage.getItem(STAR_STORAGE_KEY);
                if (savedStars) {
                    setStarData(JSON.parse(savedStars));
                }
            } catch (e) {
                console.error('Failed to load star data.', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadStars();
    }, []);

    useEffect(() => {
        if (!isLoading) {
            AsyncStorage.setItem(STAR_STORAGE_KEY, JSON.stringify(starData))
                .catch(e => console.error('Failed to save star data.', e));
        }
    }, [starData, isLoading]);

    const addStar = (gameId: string) => {
        if (starData[gameId]) {
            return;
        }
        console.log(`'${gameId}' 게임의 별을 획득했습니다!`);
        setStarData(prevData => ({
            ...prevData,
            [gameId]: 1,
        }));
    };

    const resetAll = async () => {
        try {
            await AsyncStorage.removeItem(STAR_STORAGE_KEY);
            setStarData({});
            console.log('Star 데이터 초기화 완료');
        } catch (e) {
            console.error('Failed to reset star data.', e);
        }
    };

    const resetKeys = (keys: string[]) => {
        // 저장은 위 effect가 맡는다 — 바뀐 객체가 통째로 다시 쓰인다
        setStarData(prevData => {
            const next = { ...prevData };
            keys.forEach(key => delete next[key]);
            return next;
        });
    };

    const value = useMemo(() => ({ starData, addStar, resetAll, resetKeys }), [starData, addStar]);

    return (
        <StarContext.Provider value={value}>
            {children}
        </StarContext.Provider>
    );
};