import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { brand, radius, space } from '../theme';

const TONES = {
  given: { bg: '#FFFFFF', fg: brand.ink, label: brand.inkMuted, border: brand.line },
  interest: { bg: brand.goldSoft, fg: '#6B5300', label: '#8A6100', border: '#EBD9A3' },
  profit: { bg: brand.primary, fg: '#FFFFFF', label: '#B9DBCC', border: brand.primary },
  outstanding: { bg: brand.dangerSoft, fg: brand.danger, label: '#9B4B45', border: '#F0CFCB' },
};

export function StatCard({ tone = 'given', label, value, sub, style }) {
  const colors = TONES[tone] || TONES.given;
  return (
    <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }, style]}>
      <Text style={[styles.label, { color: colors.label }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.fg }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? (
        <Text style={[styles.sub, { color: colors.label }]} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: space(3.5),
    paddingHorizontal: space(3.5),
    minHeight: 96,
  },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  value: { fontSize: 19, fontWeight: '900', marginTop: space(1.5) },
  sub: { fontSize: 11, marginTop: space(1), lineHeight: 15 },
});
