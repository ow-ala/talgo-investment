import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { brand, radius, shadow, space } from '../../theme';
import { useApp } from '../../store';
import { formatMoney } from '../../lib/money';
import { daysUntil, formatDate } from '../../lib/dates';
import { balance, partitionByDue } from '../../lib/loans';
import { formatPhoneForDisplay, normalizePhone } from '../../lib/phone';
import { openLink, reminderTextFor, smsUrl, telUrl, whatsappUrl } from '../../lib/reminders';
import { BrandHeader } from '../../components/BrandHeader';
import { Button, Card, EmptyState, SectionTitle, Tag } from '../../components/ui';
import { permissionSupported } from '../../lib/notifications';

export default function RemindersScreen() {
  const { loans, settings, permission, requestPermission, stats } = useApp();
  const [queue, setQueue] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const { overdue, dueToday, upcoming } = partitionByDue(loans);
  const dueNow = [...overdue, ...dueToday];
  const mappable = dueNow.filter((loan) => normalizePhone(loan.phone, settings.countryDialCode));
  const missingPhone = dueNow.length - mappable.length;
  const soon = upcoming.filter((loan) => {
    const days = daysUntil(loan.dueDate);
    return days !== null && days <= 7;
  });

  function startQueue() {
    setQueue(mappable);
    openLink(whatsappUrl(mappable[0], settings));
  }

  function advanceQueue() {
    const rest = queue.slice(1);
    setQueue(rest);
    if (rest[0]) openLink(whatsappUrl(rest[0], settings));
  }

  async function copyMessage(loan) {
    await Clipboard.setStringAsync(reminderTextFor(loan, settings));
    setCopiedId(loan.id);
  }

  return (
    <View style={styles.root}>
      <BrandHeader compact />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {permissionSupported && !permission.granted && (
          <Card tone="warn" style={styles.banner}>
            <Text style={styles.bannerTitle}>Date alerts are off</Text>
            <Text style={styles.bannerBody}>
              Allow notifications so Talgo tells you the morning a debtor must pay. Sending WhatsApp works either way.
            </Text>
            <Button label="Allow notifications" onPress={requestPermission} small style={styles.bannerButton} />
          </Card>
        )}
        {!permissionSupported && (
          <Card tone="muted" style={styles.banner}>
            <Text style={styles.bannerBody}>
              Scheduled phone alerts need the Talgo app on Android or iPhone. WhatsApp reminders work from anywhere.
            </Text>
          </Card>
        )}

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>To collect today</Text>
          <Text style={styles.totalValue}>{formatMoney(stats.collectNowAmount, settings.currency)}</Text>
          <Text style={styles.totalNote}>
            {formatMoney(stats.overdueAmount, settings.currency)} of that is already overdue
          </Text>
        </View>

        <SectionTitle>Remind today · {dueNow.length}</SectionTitle>

        {dueNow.length === 0 ? (
          <EmptyState title="Nobody is due today" body="Talgo queues these names automatically when a due date arrives." />
        ) : (
          <>
            <Card style={styles.batchCard}>
              <Text style={styles.batchTitle}>WhatsApp run</Text>
              <Text style={styles.batchBody}>
                Opens the WhatsApp chat for each debtor with the amount already typed in. You tap send, then come back
                for the next one.
              </Text>
              {missingPhone > 0 && (
                <Text style={styles.batchWarn}>{missingPhone} debtor(s) have no usable number — add it on their loan.</Text>
              )}
              <Button
                label={`Send ${mappable.length} WhatsApp reminder${mappable.length === 1 ? '' : 's'}`}
                onPress={startQueue}
                disabled={mappable.length === 0}
                style={styles.batchButton}
              />
            </Card>

            {queue.length > 0 && (
              <Card tone="success" style={styles.queueCard}>
                <Text style={styles.queueProgress}>
                  {queue.length} left · {queue[0].name} · {formatMoney(balance(queue[0]), settings.currency)}
                </Text>
                <Text style={styles.queueBody}>{reminderTextFor(queue[0], settings)}</Text>
                <View style={styles.actions}>
                  <Button
                    label="Open again"
                    kind="soft"
                    small
                    style={styles.action}
                    onPress={() => openLink(whatsappUrl(queue[0], settings))}
                  />
                  <Button label="Next debtor" small style={styles.action} onPress={advanceQueue} />
                  <Button label="Stop" kind="danger" small style={styles.action} onPress={() => setQueue([])} />
                </View>
              </Card>
            )}

            {dueNow.map((loan) => (
              <ReminderRow
                key={loan.id}
                loan={loan}
                settings={settings}
                copied={copiedId === loan.id}
                onCopy={() => copyMessage(loan)}
              />
            ))}
          </>
        )}

        {soon.length > 0 && (
          <>
            <SectionTitle>Queued for the next 7 days</SectionTitle>
            <Card>
              {soon.map((loan) => {
                const days = daysUntil(loan.dueDate);
                return (
                  <View key={loan.id} style={styles.upcomingRow}>
                    <View style={styles.upcomingDot} />
                    <View style={styles.upcomingText}>
                      <Text style={styles.upcomingName}>{loan.name}</Text>
                      <Text style={styles.upcomingMeta}>
                        {formatMoney(balance(loan), settings.currency)} · {formatDate(loan.dueDate)}
                      </Text>
                    </View>
                    <Tag label={`${days}d`} tone={days <= 2 ? 'danger' : 'muted'} />
                  </View>
                );
              })}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ReminderRow({ loan, settings, copied, onCopy }) {
  const [showText, setShowText] = useState(false);
  const message = reminderTextFor(loan, settings);
  const isOverdue = loan.dueDate && daysUntil(loan.dueDate) < 0;
  const number = normalizePhone(loan.phone, settings.countryDialCode);

  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <View style={styles.rowNames}>
          <Text style={styles.rowName}>{loan.name}</Text>
          <Text style={styles.rowMeta}>
            {number ? formatPhoneForDisplay(number) : 'No phone saved'} · due {formatDate(loan.dueDate)}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowAmount}>{formatMoney(balance(loan), settings.currency)}</Text>
          <Tag label={isOverdue ? 'Overdue' : 'Due today'} tone="danger" />
        </View>
      </View>

      <View style={styles.actions}>
        <Button label="WhatsApp" onPress={() => openLink(whatsappUrl(loan, settings))} style={styles.action} small disabled={!number} />
        <Button label="SMS" kind="outline" onPress={() => openLink(smsUrl(loan, settings))} style={styles.action} small disabled={!number} />
        <Button label={copied ? 'Copied' : 'Copy'} kind="outline" onPress={onCopy} style={styles.action} small />
        <Button
          label="Call"
          kind="outline"
          onPress={() => openLink(telUrl(loan, settings))}
          style={styles.action}
          small
          disabled={!number}
        />
      </View>

      <Text style={styles.previewToggle} onPress={() => setShowText((prev) => !prev)}>
        <Ionicons name={showText ? 'chevron-up' : 'chevron-down'} size={12} color={brand.inkMuted} />{' '}
        {showText ? 'Hide message' : 'Preview message'}
      </Text>
      {showText && <Text style={styles.preview}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.bg },
  content: { padding: space(5), paddingBottom: space(14) },
  banner: { marginBottom: space(4) },
  bannerTitle: { fontSize: 14.5, fontWeight: '900', color: '#6B5300' },
  bannerBody: { fontSize: 13, color: '#6B5300', lineHeight: 19, marginTop: space(1.5) },
  bannerButton: { marginTop: space(3), alignSelf: 'flex-start' },
  totalCard: { backgroundColor: brand.primaryDark, borderRadius: radius.lg, padding: space(5), ...shadow },
  totalLabel: { color: brand.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  totalValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: space(1) },
  totalNote: { color: '#C6DDD2', fontSize: 12, marginTop: space(1) },
  batchCard: { marginBottom: space(3) },
  batchTitle: { fontSize: 15, fontWeight: '900', color: brand.ink },
  batchBody: { fontSize: 12.5, color: brand.inkMuted, lineHeight: 19, marginTop: space(1.5) },
  batchWarn: { fontSize: 12, color: brand.danger, fontWeight: '700', marginTop: space(2) },
  batchButton: { marginTop: space(3) },
  queueCard: { marginBottom: space(3) },
  queueProgress: { fontSize: 13, fontWeight: '900', color: '#08513B' },
  queueBody: { fontSize: 12.5, color: brand.ink, lineHeight: 19, marginTop: space(2) },
  row: {
    backgroundColor: brand.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: brand.line,
    padding: space(4),
    marginBottom: space(3),
    ...shadow,
  },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start' },
  rowNames: { flex: 1, paddingRight: space(2) },
  rowName: { fontSize: 16, fontWeight: '900', color: brand.ink },
  rowMeta: { fontSize: 12, color: brand.inkMuted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowAmount: { fontSize: 15.5, fontWeight: '900', color: brand.danger, marginBottom: space(1.5) },
  actions: { flexDirection: 'row', marginTop: space(3.5), gap: space(2) },
  action: { flex: 1 },
  previewToggle: { fontSize: 12, fontWeight: '700', color: brand.inkMuted, marginTop: space(3) },
  preview: {
    fontSize: 12.5,
    color: brand.ink,
    lineHeight: 19,
    backgroundColor: '#F4F6F5',
    borderRadius: radius.sm,
    padding: space(3),
    marginTop: space(2),
  },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space(2) },
  upcomingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: brand.gold, marginRight: space(3) },
  upcomingText: { flex: 1 },
  upcomingName: { fontSize: 14, fontWeight: '800', color: brand.ink },
  upcomingMeta: { fontSize: 12, color: brand.inkMuted, marginTop: 1 },
});
