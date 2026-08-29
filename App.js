import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from './utils/theme';
import { isOnboardingCompleted, isPinEnabled, getProfile, getSession, subscribeAuthChanges } from './utils/storage';
import { rescheduleAllMedicineReminders, rescheduleControlReminder } from './utils/notifications';

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
      const currentSession = await getSession();
      if (!isMounted) return;
      setSession(currentSession);
      if (currentSession) {
        await checkOnboarding();
      }
      setLoading(false);
    })();

    const subscription = subscribeAuthChanges((newSession) => {
      setSession(newSession);
      if (newSession) {
        checkOnboarding();
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
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: colors.green,
            tabBarInactiveTintColor: colors.textTertiary,
            tabBarStyle: {
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
    </SafeAreaProvider>
  );
}