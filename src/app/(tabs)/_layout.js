import React from 'react';
import { StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { brand } from '../../theme';
import { useApp } from '../../store';

export default function TabsLayout() {
  const { stats } = useApp();
  const attention = stats.openCount ? stats.overdueCount + stats.dueTodayCount : 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brand.primary,
        tabBarInactiveTintColor: brand.inkMuted,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Money',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Loans',
          tabBarBadge: attention > 0 ? attention : undefined,
          tabBarBadgeStyle: { backgroundColor: brand.danger },
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Records',
          tabBarIcon: ({ color, size }) => <Ionicons name="archive-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#FFFFFF', borderTopColor: brand.line, height: 62, paddingTop: 4 },
  label: { fontSize: 11, fontWeight: '700' },
});
