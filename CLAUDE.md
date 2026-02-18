# DealSignal

## What is this?
DealSignal is an embeddable gaming deals widget that surfaces curated, real-time discounts on gaming products (peripherals, monitors, chairs, games, subscriptions). It's designed to be placed on high-traffic gaming websites as added value — not ads.

## Business Context

- First deployment target: wzstats.gg (2M+ monthly visitors, gaming stats site)
- Monetization: affiliate links (Amazon Associates initially, then direct brand programs)
- Growth: prove on one site, then pitch to other gaming sites with conversion data
- Curated approach: whitelist of ~50-100 products across categories, checked daily for discounts. Only products with an active deal are shown.

## Product Categories
Mice, keyboards, headsets, monitors, chairs, controllers, gaming glasses, mousepads, microphones, webcams, games, subscriptions (Game Pass, etc.)

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Styling**: Tailwind CSS
- **Price tracking**: Vercel Cron + Amazon Product Advertising API (PA-API 5.0)

## Architecture

- `src/app/` — Next.js pages and API routes
- `src/app/deals/` — Deals page (proxied by client sites)
- `src/lib/supabase/` — Supabase client utilities
- `src/components/` — React components
- `src/types/` — TypeScript types

## Integration Model: Reverse Proxy

Client sites (e.g., wzstats.gg) proxy our `/deals` page under their domain:

```js
// Client's next.config.js
rewrites: async () => [
  {
    source: '/dealsignal/:path*',
    destination: 'https://dealsignal.vercel.app/deals/:path*',
  },
]
```

User visits `wzstats.gg/dealsignal` → sees our page → URL stays on their domain.

## Two UI surfaces

1. **Widget** — small embed showing 2-3 top deals, injected into host site via script tag
2. **Deals page** — full page at `/deals`, reverse-proxied by client at their `/dealsignal` route

## Design System (V1: wzstats.gg)

- **Background**: #0d1015
- **Text**: white
- **Primary**: #00ddff (cyan — discount badges, CTAs)
- **Secondary**: #35ffb5 (green — savings, prices)
- **Info**: #3b82f6 (blue — category labels)
- **Style**: Minimalist, clean, not pushy — must NOT feel like ads

## Key Design Principles

- Must NOT feel like ads — clean, minimal, curated
- Show original price, current price, % off — urgency drives clicks
- Only display products that currently have a discount
- Respect host site's design
- Fast load, no layout shift, no tracking beyond click counts

## Database Schema (Supabase)

### products
- id, name, category, image_url, amazon_asin, affiliate_url, is_active

### prices
- id, product_id, original_price, current_price, discount_percent, checked_at

### clicks
- id, product_id, partner_site, clicked_at

## Tech Notes

- Amazon PA-API requires valid Associates account + approval
- Widget injects via `<script src="https://dealsignal.vercel.app/widget.js">` + renders in shadow DOM
- All affiliate links tagged with partner site ID for attribution
