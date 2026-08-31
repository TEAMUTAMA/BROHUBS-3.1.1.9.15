
export interface PricingTier {
  id: string;
  name: string;
  subtitle: string;      // kunci terjemahan (i18n)
  price: string;
  features: string[];    // array kunci terjemahan
  highlight: boolean;
  highlightText?: string; // kunci terjemahan
  buttonText: string;     // kunci terjemahan
}

// Catatan: subtitle/features/highlightText/buttonText berisi KUNCI terjemahan.
// Render dengan t(...) di komponen (LandingPage, PricingModal). name & price tetap literal.
export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'BASIC',
    name: 'BASIC',
    subtitle: 'pricing.basic.subtitle',
    price: '10',
    features: ['pricing.basic.f1', 'pricing.basic.f2', 'pricing.basic.f3', 'pricing.basic.f4'],
    highlight: false,
    buttonText: 'pricing.basic.button'
  },
  {
    id: 'PREMIUM',
    name: 'PREMIUM',
    subtitle: 'pricing.premium.subtitle',
    price: '89',
    features: ['pricing.premium.f1', 'pricing.premium.f2', 'pricing.premium.f3', 'pricing.premium.f4', 'pricing.premium.f5'],
    highlight: true,
    highlightText: 'pricing.premium.badge',
    buttonText: 'pricing.premium.button'
  },
  {
    id: 'ULTIMATE',
    name: 'ULTIMATE',
    subtitle: 'pricing.ultimate.subtitle',
    price: '199',
    features: ['pricing.ultimate.f1', 'pricing.ultimate.f2', 'pricing.ultimate.f3', 'pricing.ultimate.f4', 'pricing.ultimate.f5', 'pricing.ultimate.f6'],
    highlight: true,
    highlightText: 'pricing.ultimate.badge',
    buttonText: 'pricing.ultimate.button'
  }
];
