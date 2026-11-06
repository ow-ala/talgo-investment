import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../store';
import { brand } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <Routes />
      </AppProvider>
    </SafeAreaProvider>
  );
}

function Routes() {
  const { ready } = useApp();

  if (!ready) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashName}>TALGO</Text>
        <Text style={styles.splashKicker}>INVESTMENT</Text>
        <ActivityIndicator color={brand.gold} style={styles.spinner} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="loan-form" options={{ presentation: 'modal' }} />
      <Stack.Screen name="loan-detail" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center' },
  splashName: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', letterSpacing: 4 },
  splashKicker: { color: brand.gold, fontSize: 13, fontWeight: '800', letterSpacing: 6, marginTop: 4 },
  spinner: { marginTop: 30 },
});
