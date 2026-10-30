import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/chongyeon/context/AuthContext';

export default function MyPageScreen() {
  const { user, signOut, withdraw } = useAuth();

  const userName = '사용자';//user?.user?.name || '사용자';
  const provider = user?.provider;
  // 로그아웃 알림
  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  // 회원탈퇴 알림
  const handleWithdraw = () => {
    Alert.alert(
      '회원 탈퇴',
      '탈퇴 시 모든 학습 및 훈련 기록이 영구히 삭제됩니다. 정말 탈퇴하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: async () => {
            try {
              await withdraw();
              Alert.alert('알림', '회원탈퇴가 완료되었습니다.');
            } catch (error) {
              Alert.alert('오류', '탈퇴 처리에 실패했습니다. 다시 시도해 주세요.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* 상단 타이틀 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>설정</Text>
        </View>

        {/* 내 프로필 요약 카드 */}
        <View style={styles.profileBox}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#3B82F6" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName} 님</Text>
            {/* 로그인 플랫폼 배지 */}
            <View style={styles.providerBadge}>
              <Text style={styles.providerText}>
                {provider === 'kakao' ? '카카오 로그인' : provider === 'google' ? 'Google 로그인' : '소셜 로그인'}
              </Text>
            </View>
          </View>
        </View>

        {/* 계정 관리 설정 메뉴 그룹 */}
        <Text style={styles.sectionTitle}>계정 설정</Text>
        <View style={styles.menuGroup}>
          {/* 로그아웃 행 */}
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.6}>
            <Text style={styles.menuText}>로그아웃</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* 구분선 */}
          <View style={styles.divider} />

          {/* 회원탈퇴 행 */}
          <TouchableOpacity style={styles.menuItem} onPress={handleWithdraw} activeOpacity={0.6}>
            <Text style={[styles.menuText, styles.withdrawText]}>회원탈퇴</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* 앱 정보 푸터 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>사운드퀘스트 v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC', // 캡처본과 동일한 라이트 그레이 배경
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // 헤더
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },

  // 프로필 영역
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF3FE', // 탭/아이콘에 쓰인 시그니처 연파랑
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileInfo: {
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  providerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  providerText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },

  // 메뉴 그룹 (설정 리스트)
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    paddingLeft: 4,
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  withdrawText: {
    color: '#EF4444', // 탈퇴 강조색
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },

  // 하단 버전 정보
  footer: {
    marginTop: 36,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});