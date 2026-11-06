import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { brand, radius, space } from '../../theme';
import { useApp } from '../../store';
import { statusOf } from '../../lib/loans';
import { AddButton, BrandHeader } from '../../components/BrandHeader';
import { Chip, EmptyState } from '../../components/ui';
import { LoanCard } from '../../components/LoanCard';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'due_today', label: 'Due today' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
];

export default function LoansScreen() {
  const { loans, settings } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return loans.filter((loan) => {
      if (filter !== 'all' && statusOf(loan) !== filter) return false;
      if (!needle) return true;
      return (
        String(loan.name).toLowerCase().includes(needle) ||
        String(loan.phone).toLowerCase().includes(needle) ||
        String(loan.id).toLowerCase().includes(needle)
      );
    });
  }, [loans, filter, query]);

  return (
    <View style={styles.root}>
      <BrandHeader compact right={<AddButton onPress={() => router.push('/loan-form')} />} />
      <View style={styles.toolbar}>
        <View style={styles.search}>
          <Ionicons name="search" size={17} color={brand.inkMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, phone or ref"
            placeholderTextColor="#9AA8A1"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Text onPress={() => setQuery('')} style={styles.clear}>
              <Ionicons name="close-circle" size={18} color={brand.inkMuted} />
            </Text>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {FILTERS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              active={filter === item.key}
              onPress={() => setFilter(item.key)}
              tone={item.key === 'overdue' || item.key === 'due_today' ? 'danger' : 'info'}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <LoanCard loan={item} currency={settings.currency} dialCode={settings.countryDialCode} onPress={() => router.push({ pathname: '/loan-detail', params: { id: item.id } })} />
        )}
        ListEmptyComponent={
          <EmptyState
            title={loans.length === 0 ? 'No loans recorded yet' : 'Nothing matches that'}
            body={
              loans.length === 0
                ? 'Record the first loan and Talgo will track the interest, the due date and the reminders.'
                : 'Try another name, phone number or filter.'
            }
            actionLabel={loans.length === 0 ? 'Record a loan' : undefined}
            onAction={() => router.push('/loan-form')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.bg },
  toolbar: { backgroundColor: brand.primary, paddingHorizontal: space(5), paddingBottom: space(3) },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingHorizontal: space(3.5),
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, color: brand.ink, marginLeft: space(2), paddingVertical: 0 },
  clear: { marginLeft: space(2) },
  chipsRow: { marginTop: space(3), flexGrow: 0 },
  list: { padding: space(5), paddingTop: space(4), paddingBottom: space(10) },
});
