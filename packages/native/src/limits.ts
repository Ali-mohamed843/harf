/**
 * What Harf can and cannot fix on React Native, as data.
 *
 * Harf implements direction at the style layer, so anything laid out by
 * JavaScript follows `<DirectionProvider>` and changes with an ordinary
 * re-render. Some React Native components are laid out or driven by *native*
 * code that reads `I18nManager.isRTL`, a value fixed at app start. Those
 * cannot be corrected from JavaScript at all.
 *
 * This module is the machine-readable form of the limits table in the README,
 * so the table is generated from the same data the runtime warnings use and
 * the two cannot drift apart.
 *
 * @module
 */

/** How completely Harf handles a given component or behaviour. */
export type LimitStatus =
  /** Fully handled from JavaScript. A direction change is a re-render. */
  | 'handled'
  /** Visual layout follows Harf; some native behaviour still does not. */
  | 'partial'
  /** Cannot be fixed from JavaScript. Needs `forceRTL` plus a restart. */
  | 'needs-restart'
  /** Harf has no opinion; the platform already does the right thing. */
  | 'not-applicable';

/** One row of the limits table. */
export interface Limit {
  /** The component or behaviour. */
  readonly subject: string;
  readonly status: LimitStatus;
  /** What actually happens, in one or two sentences. */
  readonly detail: string;
  /** What to do about it, when there is something to do. */
  readonly workaround?: string;
  /**
   * How this was established. Harf's README credibility rests on this column
   * being honest: `measured` means it was reproduced on a device or simulator
   * and the result recorded; `reasoned` means it follows from reading React
   * Native's source but has not been reproduced end to end; `unverified`
   * means neither, and the row is a hypothesis.
   */
  readonly evidence: 'measured' | 'reasoned' | 'unverified';
}

/**
 * The limits table.
 *
 * **Read the `evidence` column.** Rows marked `unverified` have not been
 * reproduced on a device by this project. They are recorded so the table is
 * complete, not because they are established. If you have a device and five
 * minutes, converting one to `measured` (or deleting it) is the single most
 * valuable contribution you can make.
 */
export const LIMITS: readonly Limit[] = Object.freeze([
  {
    subject: 'View / Text layout (margin, padding, position, border radius)',
    status: 'handled',
    detail:
      'Resolved to physical properties at render time by createStyles and useLogicalStyles. Changing direction is an ordinary React state update.',
    evidence: 'measured',
  },
  {
    subject: 'flexDirection: row',
    status: 'handled',
    detail:
      "Emitted as 'row-reverse' under RTL. Correct as long as I18nManager.isRTL stays false, which is what Harf asks you to keep.",
    workaround:
      'Do not call I18nManager.forceRTL(true). If you have, Yoga will reverse rows itself and Harf will reverse them again, cancelling out.',
    evidence: 'measured',
  },
  {
    subject: 'textAlign',
    status: 'handled',
    detail: "'start' and 'end' resolve to 'left' and 'right' at render time.",
    evidence: 'measured',
  },
  {
    subject: 'Text rendering and bidi reordering inside a string',
    status: 'not-applicable',
    detail:
      'The platform text engine runs the Unicode Bidirectional Algorithm itself and does so correctly. Harf only supplies isolation around embedded runs.',
    evidence: 'measured',
  },
  {
    subject: 'Icon and image mirroring',
    status: 'handled',
    detail:
      'A scaleX(-1) transform driven by the curated registry. Nothing native is involved.',
    evidence: 'measured',
  },
  {
    subject: 'ScrollView / FlatList content layout',
    status: 'handled',
    detail:
      'The content is laid out by Yoga from your styles, so a horizontal list reverses when its row does.',
    evidence: 'reasoned',
  },
  {
    subject: 'ScrollView / FlatList initial scroll offset and paging',
    status: 'partial',
    detail:
      'Content order follows Harf, but the initial content offset does not: a horizontal pager reversed by style still starts at offset 0, which is now the last page. The native scroll view has no notion of your context direction.',
    workaround:
      'Set contentOffset (or call scrollToEnd on mount) when the direction is RTL. useDirectionalScrollOffset does this arithmetic for you.',
    evidence: 'reasoned',
  },
  {
    subject: 'TextInput text alignment and typing direction',
    status: 'handled',
    detail:
      'textAlign resolves like any other style, and the platform keyboard determines the script.',
    evidence: 'reasoned',
  },
  {
    subject: 'TextInput caret position and selection handles',
    status: 'needs-restart',
    detail:
      'The caret and the selection grab-handles are drawn by the platform text widget, which reads the process-level RTL flag rather than any React prop. Harf cannot reach them.',
    workaround:
      'For a text-heavy Arabic-first app, this is the one case where forceRTL plus a restart is genuinely justified. For a mostly-LTR app with some Arabic fields, the mismatch is usually acceptable.',
    evidence: 'unverified',
  },
  {
    subject: 'Switch thumb travel direction',
    status: 'needs-restart',
    detail:
      'Rendered by the native platform control (UISwitch, SwitchCompat), which mirrors according to the process RTL flag.',
    workaround:
      'Wrap it in <Mirror force> if you want the visual flip without a restart. The touch target does not move, so this is a cosmetic fix.',
    evidence: 'unverified',
  },
  {
    subject: 'Modal presentation and dismissal animation',
    status: 'partial',
    detail:
      'Content inside the modal follows Harf normally. The presentation animation itself is native and its horizontal direction is not affected by context.',
    evidence: 'unverified',
  },
  {
    subject: 'DrawerLayoutAndroid drawer side',
    status: 'needs-restart',
    detail:
      'The drawer side is a native Android property. It has a drawerPosition prop you can set explicitly, but the gesture edge follows the native flag.',
    workaround:
      "Pass drawerPosition={dir === 'rtl' ? 'right' : 'left'} for the visual side. Prefer a JavaScript drawer (react-native-drawer-layout) for a fully context-driven one.",
    evidence: 'unverified',
  },
  {
    subject: 'Native date and time pickers',
    status: 'needs-restart',
    detail:
      'Presented by the platform. Layout, calendar and numeral system all come from the OS locale, not from your app.',
    workaround:
      'Use a JavaScript picker if the calendar must match your in-app language rather than the device language.',
    evidence: 'unverified',
  },
  {
    subject: "Android's native back gesture",
    status: 'not-applicable',
    detail:
      'The predictive back gesture edge follows the system, not the app. It is the same for every app on the device, so users do not experience it as an inconsistency.',
    evidence: 'unverified',
  },
  {
    subject: 'ActionSheetIOS / native alerts',
    status: 'needs-restart',
    detail: 'Presented by the OS and laid out by the OS locale.',
    evidence: 'unverified',
  },
  {
    subject: 'Accessibility reading order',
    status: 'handled',
    detail:
      'Follows the view hierarchy, which Harf reverses through flexDirection along with the visual order.',
    evidence: 'reasoned',
  },
]);

/** Every subject Harf fully handles from JavaScript. */
export function handledSubjects(): readonly string[] {
  return LIMITS.filter((limit) => limit.status === 'handled').map((l) => l.subject);
}

/**
 * Every subject that genuinely needs `I18nManager.forceRTL` and a restart.
 *
 * @example
 * ```ts
 * import { restartRequiredSubjects } from '@harf/native';
 *
 * console.log(restartRequiredSubjects());
 * ```
 */
export function restartRequiredSubjects(): readonly string[] {
  return LIMITS.filter((limit) => limit.status === 'needs-restart').map((l) => l.subject);
}

/**
 * Renders the limits table as Markdown.
 *
 * The README table is generated with this, so the two cannot drift apart.
 *
 * @example
 * ```ts
 * import { limitsAsMarkdown } from '@harf/native';
 *
 * console.log(limitsAsMarkdown());
 * ```
 */
export function limitsAsMarkdown(): string {
  const symbol: Record<LimitStatus, string> = {
    handled: 'Handled',
    partial: 'Partial',
    'needs-restart': 'Needs `forceRTL` + restart',
    'not-applicable': 'Not applicable',
  };

  const rows = LIMITS.map((limit) => {
    const detail =
      limit.workaround === undefined
        ? limit.detail
        : `${limit.detail} **Workaround:** ${limit.workaround}`;
    return `| ${limit.subject} | ${symbol[limit.status]} | ${limit.evidence} | ${detail} |`;
  });

  return [
    '| Subject | Status | Evidence | Detail |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}
