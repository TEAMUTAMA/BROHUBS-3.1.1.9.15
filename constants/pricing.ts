
export interface PricingTier {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  features: string[];
  highlight: boolean;
  highlightText?: string;
  buttonText: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'BASIC',
    name: 'BASIC',
    subtitle: 'STARTER KIT',
    price: '10',
    features: ['Standard Access', '720p Output', 'Community Assets', 'Standard Latency'],
    highlight: false,
    buttonText: 'GET BASIC'
  },
  {
    id: 'PREMIUM',
    name: 'PREMIUM',
    subtitle: 'PRO STUDIO',
    price: '89',
    features: ['Everything in Basic', '1080p 60FPS', 'Premium Assets', 'Low Latency', 'Blue Theme UI'],
    highlight: true,
    highlightText: 'POPULAR',
    buttonText: 'GET PREMIUM'
  },
  {
    id: 'ULTIMATE',
    name: 'ULTIMATE',
    subtitle: 'BROADCAST MASTER',
    price: '199',
    features: ['All Premium Features', '4K 60FPS HDR', 'Exclusive Assets', 'Ultra Low Latency', 'Priority Support', 'Neon Theme UI'],
    highlight: true,
    highlightText: 'BEST VALUE',
    buttonText: 'GET ULTIMATE'
  }
];
