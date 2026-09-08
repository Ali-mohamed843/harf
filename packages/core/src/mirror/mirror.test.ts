import { describe, expect, it } from 'vitest';
import { DIRECTIONS } from '../direction';
import {
  createMirrorRegistry,
  defaultMirrorRegistry,
  mirrorIf,
  mirrorTransform,
  normaliseIconName,
  shouldMirror,
} from './registry';

describe('normaliseIconName', () => {
  it('makes casing and separators irrelevant', () => {
    const forms = ['ArrowLeft', 'arrow-left', 'arrow_left', 'Arrow Left', 'ARROWLEFT'];
    const normalised = forms.map(normaliseIconName);
    expect(new Set(normalised).size).toBe(1);
    expect(normalised[0]).toBe('arrowleft');
  });
});

describe('shouldMirror — things that must mirror', () => {
  it.each([
    'arrow-back',
    'arrow-forward',
    'arrow-left',
    'arrow-right',
    'chevron-left',
    'chevron-right',
    'back',
    'forward',
    'next',
    'previous',
    'undo',
    'redo',
    'reply',
    'send',
    'indent',
    'outdent',
    'progress-bar',
    'slider',
    'menu-open',
    'logout',
    'skip-next',
    'fast-forward',
  ])('mirrors %s under RTL and not under LTR', (name) => {
    expect(shouldMirror(name, 'rtl')).toBe(true);
    expect(shouldMirror(name, 'ltr')).toBe(false);
  });
});

describe('shouldMirror — the names real icon sets actually use', () => {
  // A registry that only knows 'chevron-left' is useless to an Expo app, which
  // writes 'chevron-forward'. Each of these is the spelling a widely used set
  // ships, and each was added because a test caught it missing.
  it.each([
    ['Ionicons', 'chevron-forward'],
    ['Ionicons', 'chevron-back'],
    ['Ionicons', 'arrow-forward'],
    ['Ionicons', 'arrow-back'],
    ['Ionicons', 'arrow-redo'],
    ['Ionicons', 'arrow-undo'],
    ['Ionicons', 'caret-forward'],
    ['Ionicons', 'caret-back'],
    ['Material', 'keyboard-arrow-left'],
    ['Material', 'keyboard-arrow-right'],
    ['Material', 'navigate-before'],
    ['Material', 'navigate-next'],
    ['Material', 'format-indent-increase'],
    ['Material Community', 'menu-left'],
    ['Material Community', 'menu-right'],
    ['Material Community', 'page-first'],
    ['Material Community', 'page-last'],
    ['Material Community', 'step-forward'],
    ['Material Community', 'step-backward'],
    ['Feather', 'chevrons-left'],
    ['Feather', 'chevrons-right'],
    ['Feather', 'corner-up-left'],
    ['Feather', 'corner-down-right'],
    ['Feather', 'log-out'],
    ['Lucide', 'circle-chevron-left'],
    ['Lucide', 'circle-chevron-right'],
  ])('knows the %s name %s', (_set, name) => {
    expect(shouldMirror(name, 'rtl')).toBe(true);
    expect(shouldMirror(name, 'ltr')).toBe(false);
  });
});

describe('shouldMirror — things that must NOT mirror', () => {
  it.each([
    ['clock', 'a clock face runs clockwise everywhere'],
    ['watch', 'as clock'],
    ['timer', 'as clock'],
    ['alarm', 'as clock'],
    ['history', 'the dial is a clock face'],
    ['hourglass', 'a physical object'],
    ['check', 'the tick is a fixed mark'],
    ['checkmark', 'as check'],
    ['done', 'as check'],
    ['logo', 'a mirrored wordmark stops being the brand'],
    ['wordmark', 'as logo'],
    ['phone', 'a handset is an object, not a direction'],
    ['camera', 'an object'],
    ['image', 'a photograph is content'],
    ['photo', 'as image'],
    ['avatar', 'mirroring changes who it looks like'],
    ['map', 'geography does not mirror'],
    ['chart', 'the axis order carries the data'],
    ['number', 'digits read left to right in these scripts'],
    ['play', 'see MEDIA_TRANSPORT_REASONING'],
    ['pause', 'symmetrical'],
    ['volume', 'drawn opening right by every major system'],
  ])('never mirrors %s (%s)', (name) => {
    for (const dir of DIRECTIONS) {
      expect(shouldMirror(name, dir)).toBe(false);
    }
  });

  it('gives a reason for every excluded icon, so the choice is reviewable', () => {
    for (const name of defaultMirrorRegistry.never) {
      const reason = defaultMirrorRegistry.reasonNotMirrored(name);
      expect(reason).toBeTruthy();
      expect((reason ?? '').length).toBeGreaterThan(10);
    }
  });

  it('returns no reason for an icon that is not excluded', () => {
    expect(defaultMirrorRegistry.reasonNotMirrored('arrow-left')).toBeNull();
    expect(defaultMirrorRegistry.reasonNotMirrored('something-unknown')).toBeNull();
  });
});

describe('shouldMirror — the safe default', () => {
  it('does nothing for an icon it has never heard of', () => {
    // Mirroring the wrong thing is worse than mirroring nothing, so an
    // unknown name is left alone rather than guessed at.
    for (const dir of DIRECTIONS) {
      expect(shouldMirror('some-custom-brand-glyph', dir)).toBe(false);
      expect(shouldMirror('', dir)).toBe(false);
    }
  });
});

describe('registry integrity', () => {
  it('never lists the same icon as both mirrored and excluded', () => {
    for (const name of defaultMirrorRegistry.mirrored) {
      expect(defaultMirrorRegistry.never.has(name)).toBe(false);
    }
  });

  it('stores every name in normalised form', () => {
    for (const name of [
      ...defaultMirrorRegistry.mirrored,
      ...defaultMirrorRegistry.never,
    ]) {
      expect(name).toBe(normaliseIconName(name));
    }
  });
});

describe('createMirrorRegistry', () => {
  it('adds icons to the mirror list', () => {
    const icons = createMirrorRegistry({ mirror: ['swipe-hint'] });
    expect(icons.shouldMirror('swipe-hint', 'rtl')).toBe(true);
    expect(icons.shouldMirror('swipe-hint', 'ltr')).toBe(false);
  });

  it('adds icons to the never list', () => {
    const icons = createMirrorRegistry({ never: ['company-logo'] });
    expect(icons.shouldMirror('company-logo', 'rtl')).toBe(false);
  });

  it('lets a caller overrule a default in either direction', () => {
    // A design system that has decided the play triangle should mirror is
    // making a legitimate choice. Harf must not fight it.
    const mirrorsPlay = createMirrorRegistry({ mirror: ['play'] });
    expect(mirrorsPlay.shouldMirror('play', 'rtl')).toBe(true);
    expect(shouldMirror('play', 'rtl')).toBe(false);

    const noArrows = createMirrorRegistry({ never: ['arrow-back'] });
    expect(noArrows.shouldMirror('arrow-back', 'rtl')).toBe(false);
    expect(shouldMirror('arrow-back', 'rtl')).toBe(true);
  });

  it('does not mutate the default registry', () => {
    createMirrorRegistry({ mirror: ['brand-new-icon'], never: ['arrow-back'] });
    expect(shouldMirror('brand-new-icon', 'rtl')).toBe(false);
    expect(shouldMirror('arrow-back', 'rtl')).toBe(true);
  });

  it('can start from an empty registry', () => {
    const strict = createMirrorRegistry({ extends: 'none', mirror: ['arrow-left'] });
    expect(strict.shouldMirror('arrow-left', 'rtl')).toBe(true);
    expect(strict.shouldMirror('arrow-back', 'rtl')).toBe(false);
    expect(strict.never.size).toBe(0);
  });

  it('normalises names supplied by the caller', () => {
    const icons = createMirrorRegistry({ mirror: ['Swipe Hint'] });
    expect(icons.shouldMirror('swipe-hint', 'rtl')).toBe(true);
    expect(icons.shouldMirror('SWIPE_HINT', 'rtl')).toBe(true);
  });
});

describe('mirrorIf', () => {
  it('returns a scaleX(-1) transform under RTL and nothing under LTR', () => {
    expect(mirrorIf('rtl')).toEqual({ transform: [{ scaleX: -1 }] });
    expect(mirrorIf('ltr')).toEqual({});
  });

  it('returns frozen singletons, so it never defeats memoisation', () => {
    expect(mirrorIf('rtl')).toBe(mirrorIf('rtl'));
    expect(mirrorIf('ltr')).toBe(mirrorIf('ltr'));
    expect(Object.isFrozen(mirrorIf('rtl'))).toBe(true);
  });
});

describe('mirrorTransform', () => {
  it('produces the CSS equivalent', () => {
    expect(mirrorTransform('rtl')).toBe('scaleX(-1)');
    expect(mirrorTransform('ltr')).toBe('none');
  });
});
