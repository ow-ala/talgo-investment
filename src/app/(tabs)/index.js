import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { brand, radius, shadow, space } from '../../theme';
import { useApp } from '../../store';
import { formatMoney } from '../../lib/money';
import { partitionByDue } from '../../lib/loans';
import { AddButton, BrandHeader } from '../../components/BrandHeader';
import { LoanCard } from '../../components/LoanCard';
import { StatCard } from '../../components/StatCard';
import { Button, EmptyState, SectionTitle } from '../../components/ui';

export default function Dashboard() {
  const { loans, stats, settings } = useApp();
  const currency = settings.currency;
  const { overdue, dueToday, upcoming, settled } = partitionByDue(loans);
  const attention = [...overdue, ...dueToday];

  return (
    <View style={styles.root}>
      <BrandHeader right={<AddButton onPress={() => router.push('/loan-form')} />} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Collect today</Text>
          <Text style={styles.heroValue}>{formatMoney(stats.collectNowAmount, currency)}</Text>
          <Text style={styles.heroNote}>
            {stats.collectNowCount === 0
              ? 'Nothing falls due today. Reminders are scheduled ahead of each due date.'
              : `${stats.collectNowCount} debtor${stats.collectNowCount === 1 ? '' : 's'} to remind today`}
          </Text>
          {stats.collectNowCount > 0 && (
            <Button
              label="Remind them now"
              kind="gold"
              onPress={() => router.push('/(tabs)/reminders')}
              style={styles.heroButton}
            />
          )}
        </View>

        <Text style={styles.eyebrow}>Your money at a glance</Text>
        <View style={styles.grid}>
          <StatCard
            tone="given"
            label="Total given"
            value={formatMoney(stats.totalGiven, currency)}
            sub={`${stats.loanCount} loan${stats.loanCount === 1 ? '' : 's'} recorded`}
          />
          <StatCard
            tone="interest"
            label="Interest if all paid"
            value={formatMoney(stats.totalInterest, currency)}
            sub={`You will collect ${formatMoney(stats.expectedReturn, currency)}`}
          />
        </View>
        <View style={styles.grid}>
          <StatCard
            tone="profit"
            label="Profit collected"
            value={formatMoney(stats.profitCollected, currency)}
            sub={`${formatMoney(stats.profitPending, currency)} still to come`}
          />
          <StatCard
            tone="outstanding"
            label="Still owed"
            value={formatMoney(stats.outstanding, currency)}
            sub={`${stats.openCount} open · ${stats.paidCount} settled`}
          />
        </View>

        <SectionTitle right={<TabLink label="All loans" onPress={() => router.push('/(tabs)/loans')} />}>
          Needs attention
        </SectionTitle>
        {attention.length === 0 ? (
          <EmptyState
            title="No debtor is due yet"
            body="Add a loan and Talgo will remind you on the due date and the day before."
            actionLabel="Record a loan"
            onAction={() => router.push('/loan-form')}
          />
        ) : (
          attention.slice(0, 5).map((loan) => (
            <LoanCard key={loan.id} loan={loan} currency={currency} dialCode={settings.countryDialCode} onPress={() => router.push({ pathname: '/loan-detail', params: { id: loan.id } })} />
          ))
        )}

        {upcoming.length > 0 && (
          <>
            <SectionTitle>Coming up</SectionTitle>
            {upcoming.slice(0, 3).map((loan) => (
              <LoanCard key={loan.id} loan={loan} currency={currency} dialCode={settings.countryDialCode} onPress={() => router.push({ pathname: '/loan-detail', params: { id: loan.id } })} />
            ))}
          </>
        )}

        {settled.length > 0 && (
          <Text style={styles.footnote}>
            {settled.length} loan{settled.length === 1 ? '' : 's'} fully settled. Profit counts the interest actually
            collected, not what is still promised.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function TabLink({ label, onPress }) {
  return (
    <Text style={styles.tabLink} onPress={onPress}>
      {label} <Ionicons name="chevron-forward" size={12} color={brand.primary} />
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.bg },
  content: { padding: space(5), paddingBottom: space(12) },
  hero: {
    backgroundColor: brand.primaryDark,
    borderRadius: radius.lg,
    padding: space(5),
    ...shadow,
  },
  heroLabel: { color: brand.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  heroValue: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginTop: space(1) },
  heroNote: { color: '#C6DDD2', fontSize: 12.5, marginTop: space(1.5), lineHeight: 18 },
  heroButton: { marginTop: space(4) },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    color: brand.ink,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: space(6),
    marginBottom: space(3),
  },
  grid: { flexDirection: 'row', gap: space(3), marginBottom: space(3) },
  tabLink: { fontSize: 12.5, fontWeight: '800', color: brand.primary },
  footnote: { fontSize: 12, color: brand.inkMuted, lineHeight: 18, marginTop: space(6) },
});
