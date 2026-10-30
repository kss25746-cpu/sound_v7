import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { login as kakaoLogin, logout as kakaoLogout, unlink as kakaoUnlink } from '@react-native-seoul/kakao-login';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncAllFromServer } from '@/chongyeon/hooks/useSyncGameData';

const AuthContext = createContext<any>(null);
const USER_STORAGE_KEY = '@auth_user_data';
const BASE_URL = 'https://rais.bigdata-lifelog.kr/sound/auth';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 네이티브 구글 로그인 초기화
    GoogleSignin.configure({
      webClientId: '940228751594-aotfip87hn09h9uifj5bflqtrfor84td.apps.googleusercontent.com', // 백엔드 검증용
    });

    // 로그인 유지 확인
    const loadStoredUser = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (storedUserData) {
          // 저장된 유저 데이터가 있다면 바로 상태에 세팅
          setUser(JSON.parse(storedUserData));
          // 로그인 시 데이터 동기화
          void syncAllFromServer();
        }
      } catch (error) {
        console.error('로그인 정보 복원 실패:', error);
      } finally {
        // 복원 시도가 끝나면 로딩 해제
        setIsLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  // 로그인 성공시 데이터 저장
  const saveUserSession = async (userData: any, provider: 'google' | 'kakao') => {
    try {
      const sessionData = { ...userData, provider };
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionData));
      setUser(sessionData);
      // 로그인 시 데이터 동기화
      void syncAllFromServer();
    } catch (error) {
      console.error('로그인 세션 저장 실패:', error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      const idToken = response.data?.idToken;

      if (idToken) {
        sendGoogleTokenToServer(idToken);
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('사용자가 로그인을 취소함');
      } else {
        console.error('구글 로그인 에러:', error);
      }
    }
  };

  const signInWithKakao = async () => {
    try {
      const response = await kakaoLogin();
      const idToken = response?.idToken;

      if (idToken) {
        sendKakaoTokenToServer(idToken);
      } else {
        console.warn('idToken이 없습니다. 카카오 콘솔에서 OpenID Connect 활성화를 확인하세요.');
      }
    } catch (error: any) {
      if (error.code === 'E_CANCELLED_OPERATION') {
        console.log('사용자가 카카오 로그인을 취소함');
      } else {
        console.error('카카오 로그인 에러:', error);
      }
    }
  };

  const sendGoogleTokenToServer = async (idToken: string) => {
    try {
      const response = await fetch(`${BASE_URL}/login/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const userData = await response.json();
      await saveUserSession(userData, 'google');
      console.log('구글 로그인 성공', userData);
    } catch (error) {
      console.error('구글 로그인 에러:', error);
    }
  };

    const sendKakaoTokenToServer = async (idToken: string) => {
    try {
      const response = await fetch(`${BASE_URL}/login/kakao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const userData = await response.json();
      await saveUserSession(userData, 'kakao');
      console.log('카카오 로그인 성공:', userData);
    } catch (error) {
      console.error('카카오 서버 인증 에러:', error);
    }
  };

  // 로그아웃
  const signOut = async () => {
    try {
      const provider = user?.provider;

      // 소셜 로그인 SDK 세션 해제
      if (provider === 'google') {
        try {
          await GoogleSignin.signOut();
        } catch (e) {
          console.warn('구글 로그아웃 에러:', e);
        }
      } else if (provider === 'kakao') {
        try {
          await kakaoLogout();
        } catch (e) {
          console.warn('카카오 로그아웃 에러:', e);
        }
      }
    } catch (error) {
      console.error('소셜 로그아웃 중 오류:', error);
    } finally {
      // 스토리지 삭제 및 상태 초기화 이후 로그인 화면으로 이동
      await AsyncStorage.clear();
      setUser(null);
      console.log('로그아웃 완료');
    }
  };

  // 회원탈퇴
  const withdraw = async () => {
    try {
      const provider = user?.provider;
      // 사용자 id를 꺼내기
      const userId = user?.user?.id || user?.id;

      // 백엔드 서버에 탈퇴 요청 (DB 유저 데이터 삭제)
      const response = await fetch(`${BASE_URL}/withdraw`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
          userId, 
          platform: provider 
        }),
      });

      if (!response.ok) {
        throw new Error('서버에서 탈퇴 처리에 실패했습니다.');
      }

      // 소셜 계정 연동 해제
      if (provider === 'google') {
        try {
          await GoogleSignin.revokeAccess(); // 구글 앱 권한 철회
          await GoogleSignin.signOut();
        } catch (e) {
          console.warn('구글 연동 해제 에러:', e);
        }
      } else if (provider === 'kakao') {
        try {
          await kakaoUnlink(); // 카카오 앱 연결 끊기
        } catch (e) {
          console.warn('카카오 연동 해제 에러:', e);
        }
      }

      // 스토리지 삭제 및 상태 초기화 이후 로그인 화면으로 이동
      await AsyncStorage.clear();
      setUser(null);
      console.log('회원탈퇴 완료');
      return true;
    } catch (error) {
      console.error('회원탈퇴 처리 중 오류:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signInWithGoogle, signInWithKakao, signOut, withdraw }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);