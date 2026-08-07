import { Stack } from 'expo-router';

// The (tabs) group now uses a Stack navigator.
// Each screen is wrapped in DashboardLayout (TopBar + Sidebar) inside its own file.
export default function TabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
