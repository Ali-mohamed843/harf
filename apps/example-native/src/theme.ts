/**
 * The demo's design tokens and logical style sheets.
 *
 * Every sheet here is declared with `createStyles`, never `StyleSheet.create`,
 * and every horizontal value is logical. That is the whole discipline: if a
 * physical property appears anywhere in this file, `@harf/eslint-plugin`
 * fails the build.
 */

import { createStyles } from '@harf/core';

export const colors = {
  background: '#0b1120',
  surface: '#151d2e',
  surfaceAlt: '#1d2740',
  border: '#2a3550',
  text: '#f1f5f9',
  muted: '#94a3b8',
  accent: '#38bdf8',
  accentText: '#0b1120',
  good: '#4ade80',
  warn: '#fbbf24',
  bad: '#f87171',
} as const;

export const styles = createStyles({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'start',
    flex: 1,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    // A start-side accent bar. Under RTL it must move to the other edge, and
    // the rounded corners must follow it.
    borderStartWidth: 4,
    borderStartColor: colors.accent,
    borderTopStartRadius: 4,
    borderBottomStartRadius: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'start',
  },
  cardBody: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'start',
  },
  cardHint: {
    color: colors.muted,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'start',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  // A chat bubble: the classic case where the radius corners have to mirror or
  // the tail ends up on the wrong side.
  bubbleMine: {
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderEndEndRadius: 4,
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  bubbleTheirs: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderEndStartRadius: 4,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  bubbleTextMine: { color: colors.accentText, fontSize: 14, textAlign: 'start' },
  bubbleTextTheirs: { color: colors.text, fontSize: 14, textAlign: 'start' },

  button: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonGhost: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonLabel: {
    color: colors.accentText,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonGhostLabel: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },

  // An absolutely positioned badge. `end` flips; `top` does not.
  badge: {
    position: 'absolute',
    top: -6,
    end: -6,
    backgroundColor: colors.bad,
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: { color: colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  listItemBody: { flex: 1, gap: 2 },

  page: {
    width: 280,
    marginEnd: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    gap: 6,
  },

  statusGood: { color: colors.good, fontSize: 12, textAlign: 'start' },
  statusWarn: { color: colors.warn, fontSize: 12, textAlign: 'start' },
  statusBad: { color: colors.bad, fontSize: 12, textAlign: 'start' },

  divider: { height: 1, backgroundColor: colors.surfaceAlt },

  code: {
    color: colors.accent,
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'start',
  },
});
