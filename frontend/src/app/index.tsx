import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { AuthService } from '../services/api';
import { Colors } from '../constants/theme';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const token = await AuthService.getToken();
        if (!token) {
          router.replace('/(auth)/login');
          return;
        }

        const user = await AuthService.getMe();
        if (user) {
          router.replace('/(tabs)');
        } else {
          await AuthService.logout();
          router.replace('/(auth)/login');
        }
      } catch (error) {
        await AuthService.logout();
        router.replace('/(auth)/login');
      }
    })();
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
