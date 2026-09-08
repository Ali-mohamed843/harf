import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bidi,
  LIMITS,
  Mirror,
  Num,
  useArabicSafeText,
  useDirection,
  useDirectionalData,
  useDirectionalScrollOffset,
  useLogicalStyles,
  useScreenTransition,
} from '@harf/native';
import { formatDate, formatHijriDate, getIntlCapabilities } from '@harf/core';
import { styles as sheet, colors } from '../src/theme';
import { useLanguage, useMessages } from '../src/language';

const PRODUCTS = ['iPhone 15 Pro', 'Galaxy S24', 'Redmi Note 13', 'Pixel 9'];

export default function Home() {
  const s = useLogicalStyles(sheet);
  const t = useMessages();
  const insets = useSafeAreaInsets();
  const { dir, isRTL } = useDirection();
  const { locale, setLocale } = useLanguage();

  // Held across the direction switch on purpose: if the app restarted, this
  // would be back at zero. It is the proof that nothing remounted.
  const [switches, setSwitches] = useState(0);
  const mounts = useRef(0);
  if (mounts.current === 0) mounts.current = 1;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[
        s.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <View style={s.header}>
        <Text style={s.headerTitle}>{t.title}</Text>
        <Pressable
          style={s.button}
          accessibilityRole="button"
          onPress={() => {
            setLocale(locale.startsWith('ar') ? 'en-GB' : 'ar-EG');
            setSwitches((n) => n + 1);
          }}
        >
          <Text style={s.buttonLabel}>{t.switchTo}</Text>
        </Pressable>
      </View>

      <Card title={t.layout} body={t.intro}>
        <View style={s.rowBetween}>
          <Text style={s.cardBody}>{t.counter}</Text>
          <Num style={s.cardTitle}>{switches}</Num>
        </View>
        <Text style={s.code}>dir = {dir}</Text>
        <Text style={s.cardHint}>{t.layoutBody}</Text>
      </Card>

      <BidiCard />
      <NumeralsCard />
      <MoneyCard />
      <DatesCard />
      <MirrorCard />
      <ChatCard />
      <PagerCard />
      <TypographyCard />
      <NavigationCard />
      <LimitsCard />

      <Text style={s.cardHint}>
        {isRTL ? 'حرف · بدون إعادة تشغيل' : 'Harf · no restart, ever'}
      </Text>
    </ScrollView>
  );
}

function Card({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  const s = useLogicalStyles(sheet);
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {body === undefined ? null : <Text style={s.cardBody}>{body}</Text>}
      {children}
    </View>
  );
}

/** Problem 2: an LTR run inside an RTL sentence reorders at its boundaries. */
function BidiCard() {
  const s = useLogicalStyles(sheet);
  const t = useMessages();

  return (
    <Card title={t.bidi}>
      <Text style={s.cardHint}>Without isolation:</Text>
      <Text style={s.cardBody}>مرحبا بك في Karnak Holidays 2026 اليوم</Text>

      <Text style={s.cardHint}>With &lt;Bidi auto&gt;:</Text>
      <Bidi auto style={s.cardBody}>
        مرحبا بك في Karnak Holidays 2026 اليوم
      </Bidi>

      <Bidi auto style={s.cardBody}>
        اتصل على +20 114 919 9190 الآن
      </Bidi>
      <Bidi auto style={s.cardBody}>
        راسلنا على ali@karnak-holidays.com لأي استفسار
      </Bidi>
      <Bidi auto style={s.cardBody}>
        المنتجات: iPhone 15 Pro، Galaxy S24، وشاومي Redmi Note 13
      </Bidi>
    </Card>
  );
}

/** Problem 3: digits that must never be converted. */
function NumeralsCard() {
  const s = useLogicalStyles(sheet);
  const t = useMessages();

  return (
    <Card title={t.numerals} body={t.numeralsBody}>
      <View style={s.rowBetween}>
        <Text style={s.cardBody}>Western</Text>
        <Num style={s.cardTitle} decimals={2}>
          {1234.5}
        </Num>
      </View>
      <View style={s.rowBetween}>
        <Text style={s.cardBody}>Arabic-Indic</Text>
        <Num style={s.cardTitle} numerals="arabic" decimals={2}>
          {1234.5}
        </Num>
      </View>
      <View style={s.rowBetween}>
        <Text style={s.cardBody}>Persian</Text>
        <Num style={s.cardTitle} numerals="persian" decimals={2}>
          {1234.5}
        </Num>
      </View>

      <View style={s.divider} />

      {/* literal: never converted, so it stays dialable and pasteable. */}
      <View style={s.rowBetween}>
        <Text style={s.cardBody}>{t.order}</Text>
        <Num style={s.code} literal>
          KRN-2026-0042
        </Num>
      </View>
      <View style={s.rowBetween}>
        <Text style={s.cardBody}>{t.phone}</Text>
        <Num style={s.code} literal>
          +20 114 919 9190
        </Num>
      </View>
      <Text style={s.cardHint}>
        Both use &lt;Num literal&gt;. Converting either would break tap-to-dial and
        copy-paste.
      </Text>
    </Card>
  );
}

/** Problem 5: prices identical on every engine. */
function MoneyCard() {
  const s = useLogicalStyles(sheet);
  const t = useMessages();
  const prices: readonly [string, number][] = [
    ['EGP', 1250.5],
    ['SAR', 1250.5],
    ['AED', 1250.5],
    ['KWD', 19.5],
    ['QAR', 99],
  ];

  return (
    <Card title={t.money}>
      {prices.map(([code, value]) => (
        <View key={code} style={s.rowBetween}>
          <Text style={s.cardBody}>{code}</Text>
          <Num style={s.cardTitle} currency={code}>
            {value}
          </Num>
        </View>
      ))}
      <Text style={s.cardHint}>
        KWD carries three decimal places. Treating it as two is a thousand-fold error.
      </Text>
    </Card>
  );
}

/** Problem 4: Hijri, and an honest answer when the engine cannot do it. */
function DatesCard() {
  const s = useLogicalStyles(sheet);
  const t = useMessages();
  const { locale } = useLanguage();
  const now = new Date();

  const gregorian = formatDate(now, { locale, numerals: 'western' });
  const hijri = formatHijriDate(now, { locale, numerals: 'western' });
  const capabilities = getIntlCapabilities();

  return (
    <Card title={t.dates}>
      <View style={s.rowBetween}>
        <Text style={s.cardBody}>Gregorian</Text>
        <Text style={s.cardTitle}>{gregorian}</Text>
      </View>
      <View style={s.rowBetween}>
        <Text style={s.cardBody}>Hijri (umalqura)</Text>
        <Text style={hijri === null ? s.statusBad : s.cardTitle}>
          {hijri ?? 'unsupported on this engine'}
        </Text>
      </View>
      <Text style={capabilities.hasUmalquraCalendar ? s.statusGood : s.statusWarn}>
        Intl: {capabilities.hasUmalquraCalendar ? 'umalqura available' : 'no Hijri data'}
        {capabilities.hasArabicLocaleData ? ', Arabic data present' : ', no Arabic data'}
      </Text>
      <Text style={s.cardHint}>
        Harf returns null rather than a Gregorian date under a Hijri heading.
      </Text>
    </Card>
  );
}

/** Problem 6: what mirrors and what must not. */
function MirrorCard() {
  const s = useLogicalStyles(sheet);
  const t = useMessages();

  const glyphs: readonly [string, string, boolean][] = [
    ['chevron-forward', '›', true],
    ['arrow-back', '←', true],
    ['reply', '↩', true],
    ['clock', '🕐', false],
    ['check', '✓', false],
    ['play', '▶', false],
  ];

  return (
    <Card title={t.mirror}>
      <View style={s.row}>
        {glyphs.map(([name, glyph, mirrors]) => (
          <View key={name} style={s.listItemBody}>
            <Mirror name={name}>
              <Text style={{ fontSize: 26, color: colors.text }}>{glyph}</Text>
            </Mirror>
            <Text style={mirrors ? s.statusGood : s.statusWarn}>{name}</Text>
          </View>
        ))}
      </View>
      <Text style={s.cardHint}>
        A flipped clock reads as broken; a flipped tick is a different glyph. Unknown
        names are left alone.
      </Text>
    </Card>
  );
}

/** Border radius corners are the most visible mirroring bug in a chat UI. */
function ChatCard() {
  const s = useLogicalStyles(sheet);
  const t = useMessages();
  return (
    <Card title={t.chat}>
      <View style={s.bubbleTheirs}>
        <Bidi auto style={s.bubbleTextTheirs}>
          {t.hello}
        </Bidi>
      </View>
      <View style={s.bubbleMine}>
        <Bidi auto style={s.bubbleTextMine}>
          {t.thanks}
        </Bidi>
      </View>
      <Text style={s.cardHint}>
        The clipped corner follows the speaker in both directions.
      </Text>
    </Card>
  );
}

/**
 * Problem 7, and one of the documented *partial* limits: a reversed pager still
 * starts at content offset zero, which under RTL is the last page.
 */
function PagerCard() {
  const s = useLogicalStyles(sheet);
  const t = useMessages();
  const pages = useDirectionalData(PRODUCTS);
  const contentOffset = useDirectionalScrollOffset(PRODUCTS.length * 292, 292);

  return (
    <Card title={t.pager}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentOffset={contentOffset}
      >
        {pages.map((product, index) => (
          <View key={product} style={s.page}>
            <Bidi style={s.cardTitle}>{product}</Bidi>
            <Num style={s.cardBody} currency="EGP">
              {(index + 1) * 4999}
            </Num>
          </View>
        ))}
      </ScrollView>
      <Text style={s.cardHint}>
        useDirectionalScrollOffset starts the list at the correct end; the native scroll
        view knows nothing about context direction.
      </Text>
    </Card>
  );
}

/** Problem 8: Arabic faces clip against a Latin line height. */
function TypographyCard() {
  const s = useLogicalStyles(sheet);
  const t = useMessages();
  const safe = useArabicSafeText({ family: 'Cairo', fontSize: 16 });

  return (
    <Card title={t.typography}>
      <Text style={s.cardHint}>lineHeight: fontSize * 1.2 — clips</Text>
      <Text style={[s.cardBody, { fontSize: 16, lineHeight: 16 * 1.2 }]}>
        مجموعة حروف عربية تحتاج مساحة رأسية أكبر
      </Text>

      <Text style={s.cardHint}>useArabicSafeText — does not</Text>
      <Text
        style={[s.cardBody, { fontSize: safe.fontSize, lineHeight: safe.lineHeight }]}
      >
        مجموعة حروف عربية تحتاج مساحة رأسية أكبر
      </Text>
      <Text style={s.code}>Cairo at 16 → lineHeight {safe.lineHeight}</Text>
    </Card>
  );
}

/** Problem 7 continued: navigation sides, without depending on React Navigation. */
function NavigationCard() {
  const s = useLogicalStyles(sheet);
  const transition = useScreenTransition();
  return (
    <Card title="useScreenTransition()">
      <Text style={s.code}>backButtonSide: {transition.backButtonSide}</Text>
      <Text style={s.code}>backGestureEdge: {transition.backGestureEdge}</Text>
      <Text style={s.code}>enterFrom: {String(transition.enterFrom)}</Text>
      <Text style={s.cardHint}>
        Plain numbers and sides, so Harf takes no dependency on Reanimated or React
        Navigation.
      </Text>
    </Card>
  );
}

/** The limits table, read from the package rather than retyped. */
function LimitsCard() {
  const s = useLogicalStyles(sheet);
  const t = useMessages();

  const style = (status: string) =>
    status === 'handled' || status === 'not-applicable'
      ? s.statusGood
      : status === 'partial'
        ? s.statusWarn
        : s.statusBad;

  return (
    <Card title={t.limits}>
      {LIMITS.map((limit) => (
        <View key={limit.subject} style={s.listItem}>
          <View style={s.listItemBody}>
            <Bidi style={s.cardBody}>{limit.subject}</Bidi>
            <Text style={style(limit.status)}>
              {limit.status} · {limit.evidence}
            </Text>
          </View>
        </View>
      ))}
      <Text style={s.cardHint}>
        Read straight from @harf/native, so this screen cannot disagree with the README.
      </Text>
    </Card>
  );
}
