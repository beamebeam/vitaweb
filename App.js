import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from './utils/theme';
import { useIsDesktop } from './utils/responsive';
import { isOnboardingCompleted, isPinEnabled, getProfile, getSession, subscribeAuthChanges } from './utils/storage';
import { rescheduleAllMedicineReminders, rescheduleControlReminder } from './utils/notifications';

import SidebarNav from './components/SidebarNav';
import AuthScreen from './screens/AuthScreen';
import PinLockScreen from './screens/PinLockScreen';
import HomeScreen from './screens/HomeScreen';
import MedicineListScreen from './screens/MedicineListScreen';
import AddMedicineScreen from './screens/AddMedicineScreen';
import MedicineDetailScreen from './screens/MedicineDetailScreen';
import ControlListScreen from './screens/ControlListScreen';
import AddControlScreen from './screens/AddControlScreen';
import ControlDetailScreen from './screens/ControlDetailScreen';
import TimelineScreen from './screens/TimelineScreen';
import AddTimelineScreen from './screens/AddTimelineScreen';
import SettingsScreen from './screens/SettingsScreen';
import OnboardingScreen from './screens/onboarding/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

// ===== Stack untuk tab Obat (daftar -> tambah / detail) =====
function ObatStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DaftarObat" component={MedicineListScreen} />
      <Stack.Screen name="TambahObat" component={AddMedicineScreen} />
      <Stack.Screen name="EditObat" component={AddMedicineScreen} />
      <Stack.Screen name="DetailObat" component={MedicineDetailScreen} />
    </Stack.Navigator>
  );
}

// ===== Stack untuk tab Kontrol =====
function KontrolStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DaftarKontrol" component={ControlListScreen} />
      <Stack.Screen name="TambahKontrol" component={AddControlScreen} />
      <Stack.Screen name="EditKontrol" component={AddControlScreen} />
      <Stack.Screen name="DetailKontrol" component={ControlDetailScreen} />
    </Stack.Navigator>
  );
}

// ===== Stack untuk tab Timeline =====
function TimelineStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DaftarTimeline" component={TimelineScreen} />
      <Stack.Screen name="TambahTimeline" component={AddTimelineScreen} />
      <Stack.Screen name="EditTimeline" component={AddTimelineScreen} />
      <Stack.Screen name="DetailKontrol" component={ControlDetailScreen} />
    </Stack.Navigator>
  );
}

// ===== Stack untuk tab Beranda (supaya bisa navigasi ke tab lain via banner) =====
function BerandaStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BerandaUtama" component={HomeScreen} />
    </Stack.Navigator>
  );
}

// ===== Stack untuk tab Pengaturan =====
function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PengaturanUtama" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

const ICONS = {
  Beranda: 'home',
  Obat: 'medical',
  Kontrol: 'pulse',
  Timeline: 'time',
  Pengaturan: 'settings',
};

export default function App() {
  const isDesktop = useIsDesktop();
  const [activeTabName, setActiveTabName] = useState('Beranda');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [pinUnlocked, setPinUnlocked] = useState(false);

  const checkOnboarding = useCallback(async () => {
    const done = await isOnboardingCompleted();
    setOnboardingDone(done);
    if (done) {
      const pinOn = await isPinEnabled();
      setPinRequired(pinOn);

      // Pastikan jadwal notifikasi selalu fresh setiap app dibuka, kalau user sudah pernah mengaktifkannya
      const profile = await getProfile();
      if (profile?.notificationsEnabled) {
        try {
          await rescheduleAllMedicineReminders();
          await rescheduleControlReminder();
        } catch (e) {
          console.log('Gagal refresh notifikasi saat app dibuka:', e);
        }
      }
    }
  }, []);

  // Cek sesi login Supabase saat pertama kali app dibuka, lalu dengarkan perubahan
  // (login/logout) sepanjang app berjalan.
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const currentSession = await getSession();
        if (!isMounted) return;
        setSession(currentSession);
        if (currentSession) {
          await checkOnboarding();
        }
      } catch (e) {
        // Kalau ada error jaringan/Supabase saat pengecekan awal, jangan biarkan app
        // macet selamanya di layar loading - tampilkan saja layar login/awal seadanya.
        console.log('Gagal memuat sesi awal:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    const subscription = subscribeAuthChanges((newSession) => {
      setSession(newSession);
      if (newSession) {
        checkOnboarding().catch((e) => console.log('Gagal cek onboarding:', e));
      } else {
        // Logout: reset semua state lokal supaya kembali bersih ke layar login
        setOnboardingDone(false);
        setPinRequired(false);
        setPinUnlocked(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
    };
  }, [checkOnboarding]);

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.screenBg }}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      </SafeAreaProvider>
    );
  }

  // Belum login sama sekali -> tampilkan layar Masuk/Daftar
  if (!session) {
    return (
      <SafeAreaProvider>
        <AuthScreen />
      </SafeAreaProvider>
    );
  }

  if (!onboardingDone) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onFinish={() => setOnboardingDone(true)} />
      </SafeAreaProvider>
    );
  }

  // Layar kunci PIN muncul di atas semua tab kalau PIN aktif dan belum di-unlock di sesi ini
  if (pinRequired && !pinUnlocked) {
    return (
      <SafeAreaProvider>
        <PinLockScreen onUnlock={() => setPinUnlocked(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column', backgroundColor: colors.screenBg }}>
        {isDesktop && (
          <SidebarNav
            activeTab={activeTabName}
            onTabPress={(tab) => navigationRef.current?.navigate(tab)}
          />
        )}
        <View style={{ flex: 1, alignItems: isDesktop ? 'center' : 'stretch' }}>
          <View style={{ flex: 1, width: '100%', maxWidth: isDesktop ? 720 : undefined }}>
            <NavigationContainer
              ref={navigationRef}
              onReady={() => {
                const rootState = navigationRef.current?.getRootState();
                setActiveTabName(rootState?.routes?.[rootState.index]?.name || 'Beranda');
              }}
              onStateChange={() => {
                // Ambil nama tab paling atas (bukan nama screen di dalam stack-nya) supaya
                // sidebar highlight-nya tetap benar walau lagi di halaman detail/tambah.
                const rootState = navigationRef.current?.getRootState();
                const rootRouteName = rootState?.routes?.[rootState.index]?.name;
                if (rootRouteName) setActiveTabName(rootRouteName);
              }}
            >
              <Tab.Navigator
                screenOptions={({ route }) => ({
                  headerShown: false,
                  tabBarActiveTintColor: colors.green,
                  tabBarInactiveTintColor: colors.textTertiary,
                  // Di desktop, tab bar bawah bawaan disembunyikan total - digantikan SidebarNav di kiri.
                  tabBarStyle: isDesktop
                    ? { display: 'none' }
                    : {
                        borderTopWidth: 0.5,
                        borderTopColor: colors.border,
                        backgroundColor: colors.screenBg,
                        height: 64,
                        paddingTop: 6,
                        paddingBottom: 8,
                      },
                  tabBarLabelStyle: {
                    fontSize: 10,
                  },
                  tabBarIcon: ({ color, focused }) => {
                    const name = focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`;
                    return <Ionicons name={name} size={20} color={color} />;
                  },
                })}
              >
                <Tab.Screen name="Beranda" component={BerandaStack} />
                <Tab.Screen name="Obat" component={ObatStack} />
                <Tab.Screen name="Kontrol" component={KontrolStack} />
                <Tab.Screen name="Timeline" component={TimelineStack} />
                <Tab.Screen name="Pengaturan" component={SettingsStack} />
              </Tab.Navigator>
            </NavigationContainer>
          </View>
        </View>
      </View>
    </SafeAreaProvider>
  );
}