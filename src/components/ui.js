import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { brand, radius, shadow, space } from '../theme';

const TONE_COLORS = {
  success: { fg: brand.primary, bg: brand.primarySoft },
  danger: { fg: brand.danger, bg: brand.dangerSoft },
  warn: { fg: '#8A6100', bg: brand.goldSoft },
  info: { fg: brand.info, bg: '#E5EEF5' },
  muted: { fg: brand.inkMuted, bg: '#EDF0EE' },
  gold: { fg: '#6B5300', bg: brand.goldSoft },
};

export function Card({ children, style, tone }) {
  return (
    <View style={[styles.card, tone && { backgroundColor: TONE_COLORS[tone].bg }, style]}>{children}</View>
  );
}

export function Tag({ label, tone = 'muted' }) {
  const colors = TONE_COLORS[tone] || TONE_COLORS.muted;
  return (
    <View style={[styles.tag, { backgroundColor: colors.bg }]}>
      <Text style={[styles.tagText, { color: colors.fg }]}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function Button({ label, onPress, kind = 'primary', disabled, loading, small, style }) {
  const palette = {
    primary: { bg: brand.primary, fg: '#FFFFFF', border: brand.primary },
    gold: { bg: brand.gold, fg: '#3D2E00', border: brand.gold },
    soft: { bg: brand.primarySoft, fg: brand.primaryDark, border: brand.primarySoft },
    outline: { bg: 'transparent', fg: brand.primaryDark, border: brand.line },
    danger: { bg: 'transparent', fg: brand.danger, border: brand.danger },
  }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        small && styles.buttonSmall,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: palette.fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Chip({ label, onPress, active, tone = 'info' }) {
  const colors = TONE_COLORS[tone] || TONE_COLORS.info;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: colors.fg, borderColor: colors.fg },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, active && { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  hint,
  multiline,
  autoCapitalize = 'none',
  editable = true,
  suffix,
  style,
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputShell, !editable && styles.inputShellLocked, !!error && styles.inputShellError]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA8A1"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={editable}
          multiline={!!multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hintText}>{hint}</Text> : null}
    </View>
  );
}

export function KeyValue({ k, v, tone }) {
  return (
    <View style={styles.keyValue}>
      <Text style={styles.keyValueKey}>{k}</Text>
      <Text style={[styles.keyValueValue, tone && { color: TONE_COLORS[tone].fg }]}>{v}</Text>
    </View>
  );
}

export function ProgressBar({ value, tone = brand.primary }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.round(value * 100)}%`, backgroundColor: tone }]} />
    </View>
  );
}

export function EmptyState({ title, body, actionLabel, onAction }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel ? <Button label={actionLabel} onPress={onAction} small /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.card,
    borderRadius: radius.lg,
    padding: space(4),
    borderWidth: 1,
    borderColor: brand.line,
    ...shadow,
  },
  tag: { borderRadius: radius.pill, paddingHorizontal: space(2.5), paddingVertical: space(1) },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space(6),
    marginBottom: space(3),
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: brand.ink, letterSpacing: 0.6, textTransform: 'uppercase' },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space(4),
    backgroundColor: brand.primary,
  },
  buttonSmall: { minHeight: 40 },
  buttonText: { fontSize: 15, fontWeight: '800' },
  buttonTextSmall: { fontSize: 13 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: brand.line,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: space(3),
    paddingVertical: space(1.75),
    marginRight: space(2),
    marginBottom: space(2),
  },
  chipText: { fontSize: 12.5, fontWeight: '700', color: brand.inkMuted },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#EAEFEC',
    borderRadius: radius.md,
    padding: 3,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: space(2.25), borderRadius: radius.sm },
  segmentActive: { backgroundColor: '#FFFFFF', ...shadow },
  segmentText: { fontSize: 13.5, fontWeight: '700', color: brand.inkMuted },
  segmentTextActive: { color: brand.primaryDark },
  field: { marginBottom: space(4) },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: brand.inkMuted, marginBottom: space(2), letterSpacing: 0.3 },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: brand.line,
    borderRadius: radius.md,
    paddingHorizontal: space(3.5),
  },
  inputShellLocked: { backgroundColor: '#F1F4F2' },
  inputShellError: { borderColor: brand.danger },
  input: {
    flex: 1,
    minHeight: Platform.OS === 'ios' ? 46 : 48,
    fontSize: 16,
    color: brand.ink,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  inputMultiline: { minHeight: 84, paddingTop: 12 },
  suffix: { fontSize: 15, fontWeight: '800', color: brand.inkMuted, marginLeft: space(2) },
  errorText: { color: brand.danger, fontSize: 12, marginTop: space(1.5), fontWeight: '600' },
  hintText: { color: brand.inkMuted, fontSize: 12, marginTop: space(1.5) },
  keyValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.line,
  },
  keyValueKey: { fontSize: 13.5, color: brand.inkMuted, flex: 1, paddingRight: space(3) },
  keyValueValue: { fontSize: 14, fontWeight: '800', color: brand.ink, textAlign: 'right' },
  progressTrack: {
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: '#E7ECE9',
    overflow: 'hidden',
    marginTop: space(2.5),
  },
  progressFill: { height: '100%', borderRadius: radius.pill },
  empty: {
    alignItems: 'center',
    paddingVertical: space(10),
    paddingHorizontal: space(6),
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: brand.ink, textAlign: 'center' },
  emptyBody: {
    fontSize: 13.5,
    color: brand.inkMuted,
    textAlign: 'center',
    marginTop: space(2),
    marginBottom: space(4),
    lineHeight: 20,
  },
});
