import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { brand, radius, space } from '../theme';

function Mark({ size = 34 }) {
  return (
    <View style={[styles.mark, { width: size, height: size }]}>
      <Text style={[styles.markText, { fontSize: size * 0.5 }]}>T</Text>
    </View>
  );
}

export function BrandHeader({ compact = false, right }) {
  return (
    <View style={[styles.band, compact && styles.bandCompact]}>
      <View style={styles.row}>
        <Mark size={compact ? 30 : 38} />
        <View style={styles.names}>
          <Text style={[styles.name, compact && styles.nameCompact]}>TALGO</Text>
          {!compact && <Text style={styles.kicker}>INVESTMENT</Text>}
        </View>
        {right}
      </View>
      {!compact && <Text style={styles.tagline}>Lend well. Collect better.</Text>}
    </View>
  );
}

export function Screen({ children, header }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {header ?? <BrandHeader compact />}
      {children}
    </SafeAreaView>
  );
}

export function AddButton({ onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
      <Text style={styles.addText}>+ New loan</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.bg },
  band: {
    backgroundColor: brand.primary,
    paddingHorizontal: space(5),
    paddingTop: space(4),
    paddingBottom: space(5),
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  bandCompact: {
    paddingBottom: space(3.5),
    paddingTop: space(3),
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  names: { marginLeft: space(3), flex: 1 },
  mark: {
    borderRadius: radius.sm,
    backgroundColor: brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: brand.primaryDark, fontWeight: '900' },
  name: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  nameCompact: { fontSize: 16, letterSpacing: 1.6 },
  kicker: { color: brand.gold, fontSize: 11, fontWeight: '800', letterSpacing: 4, marginTop: 1 },
  tagline: { color: '#CFE3DA', fontSize: 12.5, marginTop: space(3) },
  add: {
    backgroundColor: brand.gold,
    borderRadius: radius.pill,
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  addText: { color: brand.primaryDark, fontWeight: '900', fontSize: 13 },
  pressed: { opacity: 0.85 },
});
