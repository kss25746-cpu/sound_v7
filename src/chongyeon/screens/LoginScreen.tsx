import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/chongyeon/context/AuthContext';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithKakao } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* 로고 */}
        <View style={styles.brandingContainer}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('@/assets/images/android-icon-foreground.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* 타이틀 */}
          <Text style={styles.appTitle}>사운드퀘스트</Text>
          <Text style={styles.appSubtitle}>게임처럼 즐겁게 시작하는 청능 훈련</Text>
        </View>

        <View style={styles.actionContainer}>
          {/* 구글 로그인 버튼 */}
          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={() => signInWithGoogle()}
            activeOpacity={0.85}
          >
            <View style={styles.buttonContent}>
              <Image
                source={require('@/assets/images/google_logo.png')}
                style={styles.buttonIcon}
                resizeMode="contain"
              />
              <Text style={styles.googleText}>Google 계정으로 계속하기</Text>
            </View>
          </TouchableOpacity>

          {/* 카카오 로그인 버튼 */}
          <TouchableOpacity
            style={[styles.button, styles.kakaoButton]}
            onPress={() => signInWithKakao()}
            activeOpacity={0.85}
          >
            <View style={styles.buttonContent}>
              <Image
                source={require('@/assets/images/kakao_logo.png')}
                style={styles.buttonIcon}
                resizeMode="contain"
              />
              <Text style={styles.kakaoText}>카카오 계정으로 계속하기</Text>
            </View>
          </TouchableOpacity>

          {/* 하단 약관 안내 문구 */}
          <Text style={styles.termsText}>
            로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 36,
  },

  // 로고, 타이틀 영역
  brandingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  logoWrapper: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appTitle: {
    fontFamily: 'DoHyeon',
    fontSize: 36,
    color: '#0F172A',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: -0.3,
  },

  // 버튼 영역
  actionContainer: {
    width: '100%',
    paddingBottom: 12,
  },
  button: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
  },

  // 구글 버튼 스타일
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },

  // 카카오 버튼 스타일
  kakaoButton: {
    backgroundColor: '#FEE500',
  },
  kakaoText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#191919',
  },

  // 하단 이용약관
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 12,
    lineHeight: 18,
  },
});