import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { brand, radius, space } from '../theme';
import { useApp } from '../store';
import { formatMoney, toNumber } from '../lib/money';
import { addDaysISO, formatDate, nowHHMM, parseLocal, todayISO } from '../lib/dates';
import { effectiveRatePercent, resolveInterest } from '../lib/loans';
import { formatPhoneForDisplay, normalizePhone, phoneProblem } from '../lib/phone';
import { Button, Card, Chip, Field, Segmented } from '../components/ui';
import { BrandHeader } from '../components/BrandHeader';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default function LoanForm() {
  const { id } = useLocalSearchParams();
  const { loans, settings, upsertLoan } = useApp();
  const existing = id ? loans.find((loan) => loan.id === id) : null;

  const [form, setForm] = useState(() => ({
    name: existing?.name ?? '',
    phone: existing?.phone ?? '',
    principal: existing ? String(existing.principal) : '',
    interestMode: existing?.interestMode ?? 'percent',
    interestValue: existing ? String(existing.interestValue) : '20',
    dateGiven: existing?.dateGiven ?? todayISO(),
    timeGiven: existing?.timeGiven ?? nowHHMM(),
    dueDate: existing?.dueDate ?? addDaysISO(todayISO(), 30),
    reminderTime: existing?.reminderTime ?? settings.defaultReminderTime,
    remindDayBefore: existing?.remindDayBefore ?? settings.remindDayBefore,
    remindOverdue: existing?.remindOverdue ?? settings.remindOverdue,
    notes: existing?.notes ?? '',
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const messagingNumber = normalizePhone(form.phone, settings.countryDialCode);

  const preview = useMemo(() => {
    const principal = toNumber(form.principal);
    const interestValue = toNumber(form.interestValue);
    if (!Number.isFinite(principal) || principal <= 0) return null;
    return resolveInterest({
      principal,
      interestMode: form.interestMode,
      interestValue: Number.isFinite(interestValue) ? interestValue : 0,
    });
  }, [form.principal, form.interestMode, form.interestValue]);

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Enter the name of the person borrowing.';
    const phoneError = phoneProblem(form.phone, settings.countryDialCode);
    if (phoneError) next.phone = phoneError;
    const principal = toNumber(form.principal);
    if (!Number.isFinite(principal) || principal <= 0) next.principal = 'Enter the money you are giving out.';
    const interestValue = toNumber(form.interestValue);
    if (!Number.isFinite(interestValue) || interestValue < 0) {
      next.interestValue = form.interestMode === 'percent' ? 'Enter the interest percentage.' : 'Enter the interest amount.';
    } else if (form.interestMode === 'percent' && interestValue > 200) {
      next.interestValue = 'That is above 200%. Check the figure.';
    }
    if (!DATE_PATTERN.test(form.dateGiven) || !parseLocal(form.dateGiven)) {
      next.dateGiven = 'Use the format 2026-11-06.';
    }
    if (!DATE_PATTERN.test(form.dueDate) || !parseLocal(form.dueDate)) {
      next.dueDate = 'Use the format 2026-12-06.';
    } else if (parseLocal(form.dueDate) < parseLocal(form.dateGiven)) {
      next.dueDate = 'Repayment date must be after the date the money is given.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSave() {
    if (!validate()) return;
    setSaving(true);
    await upsertLoan(
      {
        ...form,
        name: form.name.trim(),
        principal: toNumber(form.principal),
        interestValue: toNumber(form.interestValue),
      },
      existing?.id,
    );
    setSaving(false);
    if (existing) router.replace({ pathname: '/loan-detail', params: { id: existing.id } });
    else router.dismissTo('/(tabs)');
  }

  const profit = preview ? preview.interestAmount : 0;
  const collectable = preview ? preview.totalToReturn : 0;

  return (
    <View style={styles.root}>
      <BrandHeader compact />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <Field
              label="BORROWER NAME"
              value={form.name}
              onChangeText={(name) => set({ name })}
              placeholder="e.g. Wanjiru Kamau"
              autoCapitalize="words"
              error={errors.name}
            />
            <Field
              label="PHONE NUMBER (WHATSAPP AND SMS REMINDERS)"
              value={form.phone}
              onChangeText={(phone) => set({ phone })}
              placeholder="0746 021 668"
              keyboardType="phone-pad"
              error={errors.phone}
              hint={
                messagingNumber
                  ? `Reminders open WhatsApp on ${formatPhoneForDisplay(messagingNumber)}`
                  : 'Talgo uses this number for WhatsApp and SMS reminders.'
              }
            />
            <Field
              label="MONEY GIVEN"
              value={form.principal}
              onChangeText={(principal) => set({ principal })}
              placeholder="50000"
              keyboardType="numeric"
              suffix={settings.currency}
              error={errors.principal}
            />

            <Text style={styles.label}>INTEREST</Text>
            <Segmented
              value={form.interestMode}
              onChange={(interestMode) => set({ interestMode })}
              options={[
                { value: 'percent', label: 'Percentage of loan' },
                { value: 'flat', label: `Flat amount (${settings.currency})` },
              ]}
            />
            <View style={styles.interestRow}>
              <Field
                label={form.interestMode === 'percent' ? 'RATE' : 'AMOUNT'}
                value={form.interestValue}
                onChangeText={(interestValue) => set({ interestValue })}
                placeholder={form.interestMode === 'percent' ? '20' : '10000'}
                keyboardType="numeric"
                suffix={form.interestMode === 'percent' ? '%' : settings.currency}
                error={errors.interestValue}
                style={styles.interestField}
              />
            </View>
          </View>

          <Card style={styles.preview}>
            <PreviewLine label="You give" value={formatMoney(toNumber(form.principal) || 0, settings.currency)} />
            <PreviewLine label="Interest" value={formatMoney(profit, settings.currency)} tone="gold" />
            <View style={styles.previewDivider} />
            <PreviewLine label="Total to return" value={formatMoney(collectable, settings.currency)} big />
            <PreviewLine
              label="Profit after all is paid"
              value={formatMoney(profit, settings.currency)}
              hint={preview ? `${effectiveRatePercent({ principal: toNumber(form.principal), interestAmount: profit })}% of what you gave` : ''}
            />
          </Card>

          <View style={styles.formCard}>
            <DateField
              label="DATE MONEY WAS GIVEN"
              value={form.dateGiven}
              onChange={(dateGiven) => set({ dateGiven })}
              error={errors.dateGiven}
            />
            <Field
              label="TIME GIVEN"
              value={form.timeGiven}
              onChangeText={(timeGiven) => set({ timeGiven })}
              placeholder="14:30"
              keyboardType="numbers-and-punctuation"
              hint="Recorded with the date so you know exactly when the money left."
            />
            <DateField
              label="DATE TO RETURN"
              value={form.dueDate}
              onChange={(dueDate) => set({ dueDate })}
              error={errors.dueDate}
              shortcuts={[
                { label: '7 days', iso: addDaysISO(form.dateGiven || todayISO(), 7) },
                { label: '14 days', iso: addDaysISO(form.dateGiven || todayISO(), 14) },
                { label: '30 days', iso: addDaysISO(form.dateGiven || todayISO(), 30) },
                { label: '60 days', iso: addDaysISO(form.dateGiven || todayISO(), 60) },
              ]}
            />
            <Field
              label="REMIND ME AT"
              value={form.reminderTime}
              onChangeText={(reminderTime) => set({ reminderTime })}
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
              hint="Talgo alerts you on the due date, the day before and every day it stays unpaid."
            />
            <View style={styles.chips}>
              {['08:00', '09:00', '10:00', '18:00'].map((time) => (
                <Chip key={time} label={time} active={form.reminderTime === time} onPress={() => set({ reminderTime: time })} />
              ))}
            </View>
            <SwitchRow
              label="Warn me one day before"
              value={form.remindDayBefore}
              onValueChange={(remindDayBefore) => set({ remindDayBefore })}
            />
            <SwitchRow
              label="Keep reminding while it is overdue"
              value={form.remindOverdue}
              onValueChange={(remindOverdue) => set({ remindOverdue })}
            />
            <Field
              label="NOTE (OPTIONAL)"
              value={form.notes}
              onChangeText={(notes) => set({ notes })}
              placeholder="e.g. salary comes on the 25th"
              multiline
            />
          </View>

          <Button label={existing ? 'Save changes' : 'Save loan and set reminders'} onPress={onSave} loading={saving} />
          <Button
            label={existing ? 'Cancel' : 'Discard'}
            kind="outline"
            onPress={() => (existing ? router.back() : router.dismissTo('/(tabs)'))}
            style={styles.cancel}
          />
          <Text style={styles.footnote}>
            Records stay on this phone. Export them from the Records tab before you change devices.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function DateField({ label, value, onChange, error, shortcuts }) {
  const valid = DATE_PATTERN.test(value) && parseLocal(value);
  return (
    <View>
      <Field label={label} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" error={error} />
      {!error && (
        <Text style={styles.datePreview}>
          {valid ? formatDate(value) : 'Type the date as 2026-11-06'}
        </Text>
      )}
      {shortcuts ? (
        <View style={styles.chips}>
          {shortcuts.map((shortcut) => (
            <Chip key={shortcut.label} label={shortcut.label} onPress={() => onChange(shortcut.iso)} tone="success" />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SwitchRow({ label, value, onValueChange }) {
  return (
    <Pressable accessibilityRole="switch" onPress={() => onValueChange(!value)} style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: brand.primary, false: brand.line }} thumbColor="#FFFFFF" />
    </Pressable>
  );
}

function PreviewLine({ label, value, tone, big, hint }) {
  return (
    <View style={styles.previewLine}>
      <View style={styles.previewLeft}>
        <Text style={[styles.previewLabel, tone === 'gold' && { color: '#8A6100' }]}>{label}</Text>
        {hint ? <Text style={styles.previewHint}>{hint}</Text> : null}
      </View>
      <Text style={[styles.previewValue, big && styles.previewValueBig, tone === 'gold' && { color: '#6B5300' }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.bg },
  flex: { flex: 1 },
  content: { padding: space(5), paddingBottom: space(14) },
  formCard: {
    backgroundColor: brand.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: brand.line,
    padding: space(4),
    marginBottom: space(4),
  },
  label: { fontSize: 12, fontWeight: '800', color: brand.inkMuted, marginBottom: space(2), letterSpacing: 0.3 },
  interestRow: { marginTop: space(3) },
  interestField: { marginBottom: 0 },
  preview: { marginBottom: space(4), backgroundColor: brand.goldSoft, borderColor: '#EBD9A3' },
  previewLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space(1.5) },
  previewLeft: { flex: 1, paddingRight: space(2) },
  previewLabel: { fontSize: 12.5, color: brand.inkMuted, fontWeight: '700' },
  previewHint: { fontSize: 11, color: brand.inkMuted, marginTop: 1 },
  previewValue: { fontSize: 14.5, fontWeight: '900', color: brand.ink },
  previewValueBig: { fontSize: 20, color: brand.primaryDark },
  previewDivider: { height: 1, backgroundColor: '#EBD9A3', marginVertical: space(1.5) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space(1) },
  datePreview: { fontSize: 12, color: brand.inkMuted, marginTop: -space(2.5), marginBottom: space(3) },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space(2.5),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.line,
  },
  switchLabel: { fontSize: 13.5, color: brand.ink, flex: 1, paddingRight: space(3), fontWeight: '600' },
  cancel: { marginTop: space(3) },
  footnote: { fontSize: 11.5, color: brand.inkMuted, textAlign: 'center', marginTop: space(5), lineHeight: 17 },
});
