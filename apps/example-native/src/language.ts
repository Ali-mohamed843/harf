import { createContext, useContext } from 'react';

/** The demo's two languages. Harf derives direction from whichever is active. */
export const LOCALES = ['ar-EG', 'en-GB'] as const;

export type Locale = (typeof LOCALES)[number];

export interface LanguageValue {
  readonly locale: string;
  setLocale(locale: string): void;
}

export const LanguageContext = createContext<LanguageValue>({
  locale: 'ar-EG',
  setLocale: () => {},
});

export function useLanguage(): LanguageValue {
  return useContext(LanguageContext);
}

/** Deliberately tiny. This demo is about direction, not about i18n tooling. */
const MESSAGES = {
  'ar-EG': {
    title: 'حرف · عرض توضيحي',
    switchTo: 'English',
    intro:
      'كل ما في هذه الشاشة يتبع اتجاه السياق. اضغط على الزر: لا إعادة تشغيل، ولا وميض أبيض، والحالة تبقى كما هي.',
    counter: 'عدد مرات التبديل',
    layout: 'التخطيط المنطقي',
    layoutBody: 'الهوامش والحشو والحواف وزوايا الاستدارة كلها منطقية، تُحلّ وقت العرض.',
    bidi: 'عزل النص ثنائي الاتجاه',
    numerals: 'الأرقام',
    numeralsBody: 'مصر تستخدم الأرقام الغربية أكثر مما يُظن، فهذا هو الوضع الافتراضي.',
    money: 'العملات',
    dates: 'التواريخ',
    mirror: 'انعكاس الأيقونات',
    pager: 'التمرير الأفقي',
    typography: 'الطباعة العربية',
    limits: 'الحدود الصادقة',
    order: 'رقم الطلب',
    phone: 'الهاتف',
    chat: 'فقاعات المحادثة',
    hello: 'أهلاً! وصل طلبك.',
    thanks: 'تمام، شكراً.',
  },
  'en-GB': {
    title: 'Harf · demo',
    switchTo: 'العربية',
    intro:
      'Everything on this screen follows the context direction. Tap the button: no restart, no white flash, and the state below is untouched.',
    counter: 'Switches so far',
    layout: 'Logical layout',
    layoutBody:
      'Margins, padding, borders and radius corners are all logical, resolved at render time.',
    bidi: 'Bidi isolation',
    numerals: 'Numerals',
    numeralsBody:
      'Egypt uses Western digits more than people assume, so that is the default.',
    money: 'Currency',
    dates: 'Dates',
    mirror: 'Icon mirroring',
    pager: 'Horizontal paging',
    typography: 'Arabic typography',
    limits: 'The honest limits',
    order: 'Order number',
    phone: 'Phone',
    chat: 'Chat bubbles',
    hello: 'Hello! Your order has arrived.',
    thanks: 'Great, thanks.',
  },
} as const;

export type MessageKey = keyof (typeof MESSAGES)['en-GB'];

export function useMessages(): Record<MessageKey, string> {
  const { locale } = useLanguage();
  return locale.startsWith('ar') ? MESSAGES['ar-EG'] : MESSAGES['en-GB'];
}
