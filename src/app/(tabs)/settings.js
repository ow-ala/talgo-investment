import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { brand, space } from '../../theme';
import { useApp } from '../../store';
import { formatMoney } from '../../lib/money';
import { exportBackup, exportLoansCsv, pickBackup } from '../../lib/storage';
import { BrandHeader } from '../../components/BrandHeader';
import { Button, Card, Field, KeyValue, SectionTitle } from '../../components/ui';

export default function RecordsScreen() {
  const { loans, stats, settings, updateSettings, replaceAll, resyncAll, permission, requestPermission } = useApp();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);

  // Tabs stay mounted, so an armed wipe would otherwise survive leaving the screen.
  useFocusEffect(useCallback(() => {
    setConfirmWipe(false);
  }, []));

  async function run(key, task, message) {
    setBusy(key);
    try {
      const result = await task();
      setStatus({
        tone: 'success',
        text: typeof message === 'function' ? message(result) : message,
      });
    } catch (error) {
      setStatus({ tone: 'danger', text: error?.message || 'That did not work. Try again.' });
    } finally {
      setBusy('');
    }
  }

  return (
    <View style={styles.root}>
      <BrandHeader compact />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionTitle>Portfolio</SectionTitle>
        <Card>
          <KeyValue k="Loans recorded" v={String(stats.loanCount)} />
          <KeyValue k="Total money given" v={formatMoney(stats.totalGiven, settings.currency)} />
          <KeyValue k="Total collected" v={formatMoney(stats.collected, settings.currency)} />
          <KeyValue k="Still owed to you" v={formatMoney(stats.outstanding, settings.currency)} tone="danger" />
          <KeyValue k="Interest if every debtor pays" v={formatMoney(stats.totalInterest, settings.currency)} tone="gold" />
          <KeyValue k="Profit already in hand" v={formatMoney(stats.profitCollected, settings.currency)} tone="success" />
        </Card>

        {status ? (
          <Card tone={status.tone === 'danger' ? 'danger' : 'success'} style={styles.status}>
            <Text style={styles.statusText}>{status.text}</Text>
          </Card>
        ) : null}

        <SectionTitle>Reminders</SectionTitle>
        <Card>
          <View style={styles.permRow}>
            <Text style={styles.permText}>
              {permissionSupportedText(permission)}
            </Text>
            {!permission.granted && Platform.OS !== 'web' && (
              <Button
                label="Turn on"
                small
                kind="soft"
                onPress={async () => {
                  const response = await requestPermission();
                  setStatus({
                    tone: response.granted ? 'success' : 'danger',
                    text: response.granted ? 'Notifications allowed.' : 'Still blocked. Enable it in phone settings.',
                  });
                }}
                style={styles.permButton}
              />
            )}
          </View>
          <Field
            label="DEFAULT REMINDER TIME"
            value={settings.defaultReminderTime}
            onChangeText={(defaultReminderTime) => updateSettings({ defaultReminderTime })}
            placeholder="09:00"
            keyboardType="numbers-and-punctuation"
          />
          <Button
            label="Re-arm reminders for every loan"
            kind="outline"
            loading={busy === 'resync'}
            onPress={() => run('resync', resyncAll, resyncMessage)}
          />
        </Card>

        <SectionTitle>Business details</SectionTitle>
        <Card>
          <Field
            label="BUSINESS NAME (ON REMINDER MESSAGES)"
            value={settings.businessName}
            onChangeText={(businessName) => updateSettings({ businessName })}
            autoCapitalize="words"
          />
          <Field
            label="CURRENCY SYMBOL"
            value={settings.currency}
            onChangeText={(currency) => updateSettings({ currency: currency.slice(0, 3) })}
          />
          <Field
            label="COUNTRY CODE FOR WHATSAPP"
            value={settings.countryDialCode}
            onChangeText={(countryDialCode) => updateSettings({ countryDialCode })}
            keyboardType="phone-pad"
            hint="Kenya is 254. Numbers starting with 0 are converted automatically."
          />
        </Card>

        <SectionTitle>Records</SectionTitle>
        <Card>
          <Button
            label="Export spreadsheet (CSV)"
            loading={busy === 'csv'}
            onPress={() => run('csv', () => exportLoansCsv(loans), 'Spreadsheet ready to send by WhatsApp or email.')}
          />
          <Button
            label="Export full backup (JSON)"
            kind="soft"
            onPress={() => run('json', () => exportBackup(loans, settings), 'Backup saved. Keep it somewhere safe.')}
            style={styles.stackButton}
            loading={busy === 'json'}
          />
          {Platform.OS !== 'web' && (
            <Button
              label="Restore from backup file"
              kind="outline"
              style={styles.stackButton}
              loading={busy === 'restore'}
              onPress={() =>
                run('restore', async () => {
                  const backup = await pickBackup();
                  return replaceAll(backup.loans, backup.settings);
                }, (count) => `${count} loan record${count === 1 ? '' : 's'} restored.`)
              }
            />
          )}
          <Text style={styles.warning}>
            A backup contains every debtor name, phone number and amount. Store it privately.
          </Text>
        </Card>

        <SectionTitle>Erase this device</SectionTitle>
        <Button
          label={confirmWipe ? 'Tap again to delete all records' : 'Delete every loan on this phone'}
          kind="danger"
          onPress={async () => {
            if (!confirmWipe) {
              setConfirmWipe(true);
              return;
            }
            await run('wipe', () => replaceAll([], null), 'All records cleared from this device.');
            setConfirmWipe(false);
          }}
        />
        <Text style={styles.footnote}>Talgo Investment · records stay on this phone unless you export them.</Text>
      </ScrollView>
    </View>
  );
}

function permissionSupportedText(permission) {
  if (Platform.OS === 'web') return 'Open Talgo on Android or iPhone to get scheduled alerts.';
  if (permission.granted) return 'Notifications are allowed. You will be alerted on each due date.';
  return 'Notifications are off. Turn them on so no due date slips past.';
}

function resyncMessage(count) {
  if (Platform.OS === 'web') {
    return 'Date alerts only run inside the Talgo app on Android or iPhone. WhatsApp reminders work from here.';
  }
  if (!count) return 'No future alert to schedule — every due date has already passed.';
  return `${count} date alert${count === 1 ? '' : 's'} scheduled on this phone.`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.bg },
  content: { padding: space(5), paddingBottom: space(14) },
  status: { marginTop: space(3) },
  statusText: { fontSize: 13, fontWeight: '700', color: brand.ink },
  permRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space(3) },
  permText: { flex: 1, fontSize: 13, color: brand.ink, lineHeight: 19, paddingRight: space(3) },
  permButton: { alignSelf: 'flex-start' },
  stackButton: { marginTop: space(2.5) },
  warning: { fontSize: 11.5, color: brand.inkMuted, marginTop: space(3.5), lineHeight: 17 },
  footnote: { fontSize: 11, color: brand.inkMuted, textAlign: 'center', marginTop: space(8) },
});
