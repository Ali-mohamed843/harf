/**
 * `@harf/core` — framework-agnostic RTL and Arabic logic.
 *
 * **Zero runtime dependencies.** Everything is a named export from a
 * side-effect-free module, so a bundler keeps only what you import.
 *
 * @packageDocumentation
 */

// Direction
export {
  DIRECTIONS,
  directionSign,
  isDirection,
  oppositeDirection,
  type Direction,
} from './direction';
export { directionForLocale, isRtlLocale } from './locale';

// Logical styles
export {
  EDGE_PROPERTIES,
  LOGICAL_PROPERTY_NAMES,
  PHYSICAL_PROPERTIES,
  VALUE_PROPERTIES,
} from './style/properties';
export {
  createStyles,
  resetStyleCacheStats,
  resolveStyle,
  styleCacheStats,
  type LogicalStyleSheet,
} from './style/resolve';
export type { StyleInput, StyleObject, StyleValue } from './style/types';

// Bidirectional text
export {
  ALM,
  BIDI_CONTROL_CLASS,
  FSI,
  LRE,
  LRI,
  LRM,
  LRO,
  PDF,
  PDI,
  RLE,
  RLI,
  RLM,
  RLO,
  hasBidiControls,
  stripBidi,
} from './bidi/controls';
export {
  classifyCodePoint,
  containsLtr,
  containsRtl,
  firstStrongDirection,
  type CharClass,
} from './bidi/classify';
export { isolate, isolateIfNeeded, type IsolateOptions } from './bidi/isolate';
export {
  autoIsolate,
  findBidiRuns,
  type AutoIsolateOptions,
  type BidiRun,
} from './bidi/auto';

// Numerals
export {
  convertDigits,
  detectNumeralSystem,
  isCopySensitive,
  numeralSystemForLocale,
  toArabicDigits,
  toPersianDigits,
  toWesternDigits,
  type CopySensitiveKind,
  type NumeralSystem,
} from './numerals';

// Numbers, currency and dates
export {
  CURRENCIES,
  DEFAULT_CURRENCY_DISPLAY,
  currencyDisplay,
  type CurrencyDisplay,
} from './intl/currency-data';
export {
  formatCurrency,
  formatNumber,
  intlCurrencyReference,
  type CurrencyDisplayMode,
  type FormatCurrencyOptions,
  type FormatNumberOptions,
} from './intl/number';
export {
  INTL_POLYFILLS,
  getIntlCapabilities,
  missingIntlFeatures,
  resetIntlCapabilities,
  type IntlCapabilities,
} from './intl/capabilities';
export {
  formatDate,
  formatHijriDate,
  toHijriParts,
  type FormatDateOptions,
  type FormatHijriOptions,
  type HijriCalendar,
} from './intl/date';

// Icon mirroring
export {
  MEDIA_TRANSPORT_REASONING,
  createMirrorRegistry,
  defaultMirrorRegistry,
  mirrorIf,
  mirrorTransform,
  normaliseIconName,
  shouldMirror,
  type MirrorRegistry,
  type MirrorRegistryOptions,
  type MirrorTransform,
} from './mirror/registry';
