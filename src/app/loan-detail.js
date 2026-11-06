import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { brand, radius, shadow, space } from '../theme';
import { useApp } from '../store';
import { formatMoney, toNumber } from '../lib/money';
import { formatDate, formatDateTime, formatTime, dueLabel, daysUntil } from '../lib/dates';
import { STATUS_META, balance, effectiveRatePercent, paidAmount, progressOf, statusOf } from '../lib/loans';
import { openLink, reminderTextFor, smsUrl, telUrl, whatsappUrl } from '../lib/reminders';
import { formatPhoneForDisplay, isValidMobile, normalizePhone } from '../lib/phone';
import { permissionSupported } from '../lib/notifications';
import { BrandHeader } from '../components/BrandHeader';
import { Button, Card, EmptyState, Field, KeyValue, ProgressBar, SectionTitle, Tag } from '../components/ui';

export default function LoanDetail() {
  const { id } = useLocalSearchParams();
  const { loans, settings, recordPayment, removePayment, deleteLoan } = useApp();
  const loan = loans.find((item) => item.id === id);

  const [payment, setPayment] = useState('');
  const [note, setNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!loan) {
    return (
      <View style={styles.root}>
        <BrandHeader compact />
        <EmptyState
          title="That loan is no longer here"
          body="It may have been deleted on this device."
          actionLabel="Back to loans"
          onAction={() => router.replace('/(tabs)/loans')}
        />
      </View>
    );
  }

  const currency = settings.currency;
  const messagingNumber = normalizePhone(loan.phone, settings.countryDialCode);
  const numberUsable = isValidMobile(messagingNumber, settings.countryDialCode);
  const status = statusOf(loan);
  const meta = STATUS_META[status];
  const owed = balance(loan);
  const due = dueLabel(loan.dueDate);
  const rate = effectiveRatePercent({ principal: loan.principal, interestAmount: loan.interestAmount });

  async function onRecord() {
    const amount = toNumber(payment);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setBusy(true);
    await recordPayment(loan.id, amount, note);
    setPayment('');
    setNote('');
    setBusy(false);
  }

  return (
    <View style={styles.root}>
      <BrandHeader
        compact
        right={
          <Text style={styles.editLink} onPress={() => router.push({ pathname: '/loan-form', params: { id: loan.id } })}>
            Edit
          </Text>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroNames}>
              <Text style={styles.heroName}>{loan.name}</Text>
              <Text style={styles.heroMeta}>
                {messagingNumber ? formatPhoneForDisplay(messagingNumber) : 'No phone saved'} · Ref {loan.id}
              </Text>
            </View>
            <Tag label={meta.label} tone={meta.tone} />
          </View>
          <Text style={styles.heroLabel}>Balance still owed</Text>
          <Text style={styles.heroValue}>{formatMoney(owed, currency)}</Text>
          <ProgressBar value={progressOf(loan)} tone={status === 'paid' ? '#8FD3B6' : brand.gold} />
          <Text style={styles.heroFoot}>
            Paid {formatMoney(paidAmount(loan), currency)} of {formatMoney(loan.totalToReturn, currency)} ·{' '}
            {status === 'paid' ? 'Settled' : due.text}
          </Text>
        </View>

        {status !== 'paid' && (
          <>
            <SectionTitle>Send the reminder</SectionTitle>
            <Card>
              <Text style={styles.message}>{reminderTextFor(loan, settings)}</Text>
              <View style={styles.actionRow}>
                <Button
                  label="WhatsApp"
                  onPress={() => openLink(whatsappUrl(loan, settings))}
                  style={styles.action}
                  small
                  disabled={!messagingNumber}
                />
                <Button
                  label="SMS"
                  kind="outline"
                  onPress={() => openLink(smsUrl(loan, settings))}
                  style={styles.action}
                  small
                  disabled={!messagingNumber}
                />
                <Button
                  label="Call"
                  kind="outline"
                  onPress={() => openLink(telUrl(loan, settings))}
                  style={styles.action}
                  small
                  disabled={!messagingNumber}
                />
              </View>
              <Button
                label={copied ? 'Message copied' : 'Copy message'}
                kind="soft"
                style={styles.copyButton}
                onPress={async () => {
                  await Clipboard.setStringAsync(reminderTextFor(loan, settings));
                  setCopied(true);
                }}
              />
              {!numberUsable && (
                <Text style={styles.numberWarn}>
                  {messagingNumber
                    ? `${formatPhoneForDisplay(messagingNumber)} does not look like a Kenyan mobile number. Check it in Edit.`
                    : 'No phone number saved, so this debtor cannot be messaged yet.'}
                </Text>
              )}
              <Text style={styles.reminderNote}>{reminderNoteFor(loan, status)}</Text>
            </Card>
          </>
        )}

        <SectionTitle>Loan terms</SectionTitle>
        <Card>
          <KeyValue k="Money given" v={formatMoney(loan.principal, currency)} />
          <KeyValue
            k={loan.interestMode === 'percent' ? `Interest (${loan.interestValue}% agreed)` : 'Interest (flat)'}
            v={formatMoney(loan.interestAmount, currency)}
          />
          <KeyValue k="Effective interest" v={`${rate}%`} />
          <KeyValue k="Total money to return" v={formatMoney(loan.totalToReturn, currency)} tone="gold" />
          <KeyValue k="Date and time given" v={formatDateTime(loan.dateGiven, loan.timeGiven)} />
          <KeyValue k="Date to return" v={formatDate(loan.dueDate)} />
          {loan.dueDate ? <KeyValue k="Days until due" v={String(daysUntil(loan.dueDate))} /> : null}
          {loan.notes ? <KeyValue k="Note" v={loan.notes} /> : null}
        </Card>

        <SectionTitle>Record a payment</SectionTitle>
        <Card>
          <Field
            label="AMOUNT RECEIVED"
            value={payment}
            onChangeText={setPayment}
            placeholder={owed > 0 ? String(owed) : '0'}
            keyboardType="numeric"
            suffix={currency}
          />
          <Field label="NOTE (OPTIONAL)" value={note} onChangeText={setNote} placeholder="e.g. half now, half next week" />
          <Button
            label={owed > 0 ? 'Add to payments' : 'Add anyway'}
            onPress={onRecord}
            loading={busy}
            disabled={!toNumber(payment)}
          />
          {owed > 0 && toNumber(payment) >= owed ? (
            <Text style={styles.overpayNote}>This clears the loan in full and banks the profit.</Text>
          ) : null}
        </Card>

        {(loan.payments || []).length > 0 && (
          <>
            <SectionTitle>Payment history</SectionTitle>
            <Card>
              {loan.payments.map((item) => (
                <View key={item.id} style={styles.paymentRow}>
                  <View style={styles.paymentText}>
                    <Text style={styles.paymentAmount}>{formatMoney(item.amount, currency)}</Text>
                    <Text style={styles.paymentMeta}>
                      {formatDate(item.date)}
                      {item.note ? ` · ${item.note}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.paymentRemove} onPress={() => removePayment(loan.id, item.id)}>
                    Remove
                  </Text>
                </View>
              ))}
            </Card>
          </>
        )}

        <SectionTitle>Danger zone</SectionTitle>
        <Button
          label={confirmDelete ? 'Tap again to delete for good' : 'Delete this loan'}
          kind="danger"
          onPress={async () => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            await deleteLoan(loan.id);
            router.replace('/(tabs)/loans');
          }}
        />
      </ScrollView>
    </View>
  );
}

function reminderNoteFor(loan, status) {
  if (status === 'paid') return 'Settled — Talgo stops alerting you about this loan.';
  if (loan.notificationIds?.length) {
    const count = loan.notificationIds.length;
    return `Talgo will alert you ${count} more time${count === 1 ? '' : 's'} around ${formatTime(loan.reminderTime)}.`;
  }
  if (!permissionSupported) {
    return 'Date alerts only run inside the Talgo app on Android or iPhone. WhatsApp reminders work from here.';
  }
  if (daysUntil(loan.dueDate) >= 0) {
    return `Talgo has no alert queued for ${formatDate(loan.dueDate)} yet — turn on notifications and it schedules one.`;
  }
  return `No alert left to schedule for ${formatDate(loan.dueDate)} — the reminder times have already passed. Move the date to return forward and Talgo queues them again.`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.bg },
  content: { padding: space(5), paddingBottom: space(14) },
  editLink: { color: brand.gold, fontWeight: '900', fontSize: 14 },
  hero: {
    backgroundColor: brand.primaryDark,
    borderRadius: radius.lg,
    padding: space(5),
    ...shadow,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  heroNames: { flex: 1, paddingRight: space(2) },
  heroName: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  heroMeta: { color: '#B9DBCC', fontSize: 12, marginTop: 2 },
  heroLabel: { color: brand.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: space(5) },
  heroValue: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', marginTop: space(1) },
  heroFoot: { color: '#C6DDD2', fontSize: 12, marginTop: space(2.5) },
  message: { fontSize: 13, color: brand.ink, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: space(2), marginTop: space(3.5) },
  action: { flex: 1 },
  copyButton: { marginTop: space(2.5) },
  numberWarn: { fontSize: 12, color: brand.danger, fontWeight: '700', marginTop: space(2.5), lineHeight: 17 },
  reminderNote: { fontSize: 11.5, color: brand.inkMuted, marginTop: space(3), lineHeight: 17 },
  overpayNote: { fontSize: 12, color: brand.primary, fontWeight: '700', marginTop: space(2.5) },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.line,
  },
  paymentText: { flex: 1 },
  paymentAmount: { fontSize: 14.5, fontWeight: '900', color: brand.primaryDark },
  paymentMeta: { fontSize: 12, color: brand.inkMuted, marginTop: 1 },
  paymentRemove: { fontSize: 12.5, fontWeight: '800', color: brand.danger, paddingHorizontal: space(2) },
});
