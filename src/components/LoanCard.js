import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { brand, radius, shadow, space } from '../theme';
import { formatMoney } from '../lib/money';
import { formatDate, dueLabel } from '../lib/dates';
import { STATUS_META, balance, paidAmount, progressOf, statusOf } from '../lib/loans';
import { formatPhoneForDisplay, normalizePhone } from '../lib/phone';
import { ProgressBar, Tag } from './ui';

export function LoanCard({ loan, currency, dialCode, onPress }) {
  const status = statusOf(loan);
  const meta = STATUS_META[status];
  const due = dueLabel(loan.dueDate);
  const owed = balance(loan);
  const digits = normalizePhone(loan.phone, dialCode);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.name} numberOfLines={1}>{loan.name}</Text>
          <Text style={styles.meta}>{digits ? formatPhoneForDisplay(digits) : 'No phone'} · {formatDate(loan.dueDate)}</Text>
        </View>
        <Tag label={meta.label} tone={meta.tone} />
      </View>

      <View style={styles.figures}>
        <Figure label="Given" value={formatMoney(loan.principal, currency)} />
        <Figure label="To return" value={formatMoney(loan.totalToReturn, currency)} />
        <Figure
          label="Balance"
          value={formatMoney(owed, currency)}
          color={status === 'paid' ? brand.primary : owed > 0 ? brand.danger : brand.ink}
        />
      </View>

      <ProgressBar value={progressOf(loan)} tone={status === 'paid' ? brand.primary : brand.gold} />
      <View style={styles.foot}>
        <Text style={styles.footText}>
          Paid {formatMoney(paidAmount(loan), currency)} of {formatMoney(loan.totalToReturn, currency)}
        </Text>
        <Text style={[styles.footText, due.tone === 'danger' && styles.danger]}>{due.text}</Text>
      </View>
    </Pressable>
  );
}

function Figure({ label, value, color }) {
  return (
    <View style={styles.figure}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={[styles.figureValue, color && { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: brand.line,
    padding: space(4),
    marginBottom: space(3),
    ...shadow,
  },
  pressed: { opacity: 0.9 },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  headText: { flex: 1, paddingRight: space(3) },
  name: { fontSize: 17, fontWeight: '900', color: brand.ink },
  meta: { fontSize: 12.5, color: brand.inkMuted, marginTop: 2 },
  figures: { flexDirection: 'row', marginTop: space(3.5) },
  figure: { flex: 1, paddingRight: space(2) },
  figureLabel: { fontSize: 11, color: brand.inkMuted, fontWeight: '700', letterSpacing: 0.4 },
  figureValue: { fontSize: 14.5, fontWeight: '900', color: brand.ink, marginTop: 2 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space(2.5) },
  footText: { fontSize: 11.5, color: brand.inkMuted, fontWeight: '600' },
  danger: { color: brand.danger, fontWeight: '800' },
});
