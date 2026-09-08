/**
 * The icon mirroring registry.
 *
 * Not everything mirrors under RTL, and mirroring the wrong thing is worse
 * than mirroring nothing: a flipped clock reads as a broken clock, a flipped
 * wordmark reads as a counterfeit, and a flipped photograph of a person is
 * simply a different photograph.
 *
 * The rule of thumb this list encodes: **mirror what encodes direction of
 * motion or progress through an interface; leave alone what depicts a real
 * object, a brand, or a convention that is itself unmirrored in the physical
 * world.**
 *
 * @module
 */

import type { Direction } from '../direction';

/**
 * Icons that must mirror under RTL.
 *
 * Names are normalised: lowercase, with `-`, `_` and spaces removed, so
 * `ArrowLeft`, `arrow-left` and `arrow_left` are all the same entry.
 */
const MIRROR: readonly string[] = [
  // Direction of travel through the interface.
  'arrowback',
  'arrowforward',
  'arrowleft',
  'arrowright',
  'arrowstart',
  'arrowend',
  'arrowbackward',
  'back',
  'forward',
  'next',
  'previous',
  'prev',
  'chevronleft',
  'chevronright',
  'chevronstart',
  'chevronend',
  'caretleft',
  'caretright',
  'triangleleft',
  'triangleright',
  'angleleft',
  'angleright',
  'navigatebefore',
  'navigatenext',
  'keyboardarrowleft',
  'keyboardarrowright',
  'doublechevronleft',
  'doublechevronright',
  'chevronsleft',
  'chevronsright',

  // History and messaging: the arrow points the way the action moves.
  'undo',
  'redo',
  'reply',
  'replyall',
  'forwardmessage',
  'share',
  'send',
  'rotateleft',
  'rotateright',
  'refreshccw',
  'redoalt',

  // Text and list operations.
  'indent',
  'outdent',
  'indentincrease',
  'indentdecrease',
  'formatindentincrease',
  'formatindentdecrease',
  'listbulleted',
  'listnumbered',
  'aligntextleft',
  'aligntextright',
  'textalignleft',
  'textalignright',

  // Progress through a sequence.
  'progress',
  'progressbar',
  'slider',
  'stepper',
  'trending',
  'trendingup',
  'trendingdown',
  'signal',
  'sortascending',
  'sortdescending',

  // Panels and drawers open from a side.
  'menuopen',
  'menufold',
  'menuunfold',
  'panelleft',
  'panelright',
  'sidebarleft',
  'sidebarright',
  'logout',
  'login',
  'exit',
  'enter',
  'import',
  'export',

  // Media transport controls, where the app is a *reading* experience.
  // See MEDIA_TRANSPORT below before using these.
  'skipnext',
  'skipprevious',
  'fastforward',
  'rewind',
];

/**
 * Icons that must **not** mirror, with the reason.
 *
 * This list is the more useful half. Anything not in either list is left
 * unmirrored by default, because "do nothing" is the safe failure mode.
 */
const NEVER: Readonly<Record<string, string>> = Object.freeze({
  // Real-world objects keep their real-world orientation.
  clock: 'A clock face runs clockwise in every culture. Mirroring it reads as broken.',
  watch: 'A watch face is a clock face; mirroring it reads as broken.',
  timer: 'A timer dial runs clockwise like any other clock face.',
  alarm: 'An alarm clock is a clock face with a bell, and neither mirrors.',
  history: 'The dial is a clock face, even though the arrow is not.',
  hourglass: 'A physical object; it has no direction of reading.',
  phone: 'A handset is a depiction of an object, not a direction.',
  telephone: 'A handset is a depiction of an object, not a direction of travel.',
  camera: 'A depiction of an object.',
  printer: 'A depiction of an object.',

  // Marks whose form is the meaning.
  check: 'The tick is a fixed mark. A mirrored tick reads as a different glyph.',
  checkmark: 'The tick is a fixed mark; a mirrored tick reads as a different glyph.',
  done: 'Drawn as a tick, and a tick is a fixed mark rather than a direction.',
  tick: 'A fixed mark. Mirroring it produces a glyph that means nothing.',
  close: 'Symmetrical anyway; mirroring only risks sub-pixel drift.',
  add: 'A plus sign is symmetrical; mirroring it achieves nothing.',
  remove: 'A minus sign is symmetrical; mirroring it achieves nothing.',

  // Brand and identity.
  logo: 'A wordmark or logo is never mirrored. It stops being the brand.',
  wordmark: 'A wordmark is set type; mirrored, it is no longer readable as the brand.',
  brand: 'Brand assets are never mirrored. They stop identifying the brand.',

  // Content, not chrome.
  image: 'A photograph is content. Mirroring it fabricates a different image.',
  photo: 'A photograph is content; mirroring fabricates a different photograph.',
  avatar: 'A person; mirroring changes who it looks like.',
  map: 'Geography does not mirror.',
  chart: 'The data has an axis order; mirroring it misreports the data.',

  // Numbers.
  number: 'Digits read left-to-right in every one of these scripts.',
  digit: 'Digits read left-to-right in Arabic, Hebrew and Persian alike.',

  // Media playback — the deliberate default. See MEDIA_TRANSPORT.
  play: 'See MEDIA_TRANSPORT: the play triangle is left-to-right in almost every design system, including Arabic-first ones.',
  pause: 'Two vertical bars. Symmetrical, so mirroring can only cost sub-pixel drift.',
  stop: 'A square. Symmetrical, so there is nothing for a mirror to change.',
  record: 'A circle. Symmetrical, so there is nothing for a mirror to change.',
  volume:
    'Conventionally drawn opening to the right, and left that way by the major systems.',
  mute: 'The same speaker glyph as volume, and left unmirrored for the same reason.',
});

/**
 * Why media transport controls are **not** mirrored by default.
 *
 * The play triangle is the case people argue about most, so the reasoning is
 * written down rather than assumed:
 *
 * - It is not a directional affordance in the way a "next page" chevron is. It
 *   denotes "start", and its shape has become a logogram for that — the same
 *   way the power symbol is not read as a direction.
 * - The major platform icon sets (Material Symbols, Apple's SF Symbols,
 *   Fluent) do not mirror `play` under RTL, and neither do the mainstream
 *   Arabic-language media apps.
 * - A timeline scrubber underneath it, however, *is* directional. If you
 *   mirror the scrubber you should mirror `skipnext`/`skipprevious` with it,
 *   which is why those are in the mirror list while `play` is not.
 *
 * If your design system has decided otherwise, that is a legitimate choice:
 * override it with {@link createMirrorRegistry}.
 */
export const MEDIA_TRANSPORT_REASONING =
  'play/pause/stop are not mirrored by default; skip and seek controls are. See MEDIA_TRANSPORT_REASONING.';

/** Normalises an icon name so casing and separators do not matter. */
export function normaliseIconName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]/g, '');
}

/** A mirroring registry: a decision function plus the data behind it. */
export interface MirrorRegistry {
  /** Whether this icon should be mirrored in this direction. */
  shouldMirror(name: string, dir: Direction): boolean;
  /** Whether this icon is in the mirror list at all, regardless of direction. */
  isMirrored(name: string): boolean;
  /** The reason an icon is on the never-mirror list, if it is. */
  reasonNotMirrored(name: string): string | null;
  /** Every icon name that mirrors, normalised. */
  readonly mirrored: ReadonlySet<string>;
  /** Every icon name explicitly excluded, normalised. */
  readonly never: ReadonlySet<string>;
}

/** Options for {@link createMirrorRegistry}. */
export interface MirrorRegistryOptions {
  /** Additional icon names that should mirror. */
  readonly mirror?: readonly string[];
  /** Additional icon names that must never mirror. */
  readonly never?: readonly string[];
  /** Start from an empty registry instead of Harf's curated one. */
  readonly extends?: 'default' | 'none';
}

/**
 * Builds a mirroring registry.
 *
 * @example Add your own icons
 * ```ts
 * import { createMirrorRegistry } from '@harf/core';
 *
 * const icons = createMirrorRegistry({
 *   mirror: ['swipe-hint', 'onboarding-arrow'],
 *   never: ['company-logo', 'play'],
 * });
 *
 * icons.shouldMirror('swipe-hint', 'rtl'); // true
 * icons.shouldMirror('company-logo', 'rtl'); // false
 * ```
 *
 * @example Start from scratch
 * ```ts
 * const strict = createMirrorRegistry({
 *   extends: 'none',
 *   mirror: ['arrow-left', 'arrow-right'],
 * });
 * ```
 */
export function createMirrorRegistry(
  options: MirrorRegistryOptions = {},
): MirrorRegistry {
  const useDefaults = (options.extends ?? 'default') === 'default';

  const mirrored = new Set<string>(useDefaults ? MIRROR.map(normaliseIconName) : []);
  const never = new Set<string>(
    useDefaults ? Object.keys(NEVER).map(normaliseIconName) : [],
  );

  for (const name of options.mirror ?? []) {
    const key = normaliseIconName(name);
    mirrored.add(key);
    never.delete(key);
  }
  for (const name of options.never ?? []) {
    const key = normaliseIconName(name);
    never.add(key);
    mirrored.delete(key);
  }

  const isMirrored = (name: string): boolean => {
    const key = normaliseIconName(name);
    if (never.has(key)) return false;
    return mirrored.has(key);
  };

  return {
    isMirrored,
    shouldMirror: (name, dir) => dir === 'rtl' && isMirrored(name),
    reasonNotMirrored: (name) => {
      const key = normaliseIconName(name);
      if (!never.has(key)) return null;
      return NEVER[key] ?? 'Excluded by this registry.';
    },
    mirrored,
    never,
  };
}

/** Harf's curated registry. */
export const defaultMirrorRegistry: MirrorRegistry = createMirrorRegistry();

/**
 * Whether an icon should be mirrored, using Harf's curated registry.
 *
 * @example
 * ```ts
 * import { shouldMirror } from '@harf/core';
 *
 * shouldMirror('arrow-back', 'rtl'); // true
 * shouldMirror('arrow-back', 'ltr'); // false
 * shouldMirror('clock', 'rtl');      // false — a clock face never mirrors
 * shouldMirror('play', 'rtl');       // false — see MEDIA_TRANSPORT_REASONING
 * shouldMirror('unknown-icon', 'rtl'); // false — the safe default
 * ```
 */
export function shouldMirror(name: string, dir: Direction): boolean {
  return defaultMirrorRegistry.shouldMirror(name, dir);
}

/** A transform value that flips horizontally, in the shape both platforms take. */
export interface MirrorTransform {
  readonly transform: readonly [{ readonly scaleX: -1 }];
}

const MIRROR_TRANSFORM: MirrorTransform = Object.freeze({
  transform: Object.freeze([Object.freeze({ scaleX: -1 as const })]) as readonly [
    { readonly scaleX: -1 },
  ],
});

const NO_TRANSFORM = Object.freeze({});

/**
 * A `scaleX(-1)` transform under RTL, and nothing under LTR.
 *
 * Both return values are frozen singletons, so passing this straight into a
 * style prop does not defeat memoisation.
 *
 * @example
 * ```tsx
 * import { mirrorIf } from '@harf/core';
 *
 * <Image source={chevron} style={mirrorIf(dir)} />
 * ```
 *
 * @example Only for icons that should mirror
 * ```tsx
 * import { mirrorIf, shouldMirror } from '@harf/core';
 *
 * <Icon style={mirrorIf(shouldMirror(name, dir) ? 'rtl' : 'ltr')} />
 * ```
 */
export function mirrorIf(dir: Direction): MirrorTransform | Record<string, never> {
  return dir === 'rtl' ? MIRROR_TRANSFORM : (NO_TRANSFORM as Record<string, never>);
}

/**
 * The CSS equivalent of {@link mirrorIf}, for the web.
 *
 * @example
 * ```tsx
 * <img style={{ transform: mirrorTransform(dir) }} />
 * ```
 */
export function mirrorTransform(dir: Direction): string {
  return dir === 'rtl' ? 'scaleX(-1)' : 'none';
}
