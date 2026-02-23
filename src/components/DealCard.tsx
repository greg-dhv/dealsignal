"use client";

import { Deal, SignalLabel } from "@/types/database";

type DealCardProps = {
  deal: Deal;
  partnerSite?: string;
};

const SIGNAL_LABELS: Record<Exclude<SignalLabel, null>, { text: string; className: string }> = {
  historical_low: {
    text: "Historical Low",
    className: "bg-gradient-to-r from-orange-500 to-red-500 text-white",
  },
  low_90d: {
    text: "90-Day Low",
    className: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
  },
  low_30d: {
    text: "30-Day Low",
    className: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white",
  },
  recent_drop: {
    text: "Price Drop",
    className: "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
  },
};

export function DealCard({ deal, partnerSite }: DealCardProps) {
  const handleClick = async () => {
    await fetch("/api/clicks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: deal.id,
        partner_site: partnerSite,
      }),
    });
  };

  return (
    <a
      href={deal.affiliate_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="group block rounded-lg overflow-hidden border border-white/10 hover:border-[#00ddff]/50 transition-all"
    >
      <div className="aspect-square bg-white relative rounded-t-lg">
        {deal.signal_label && (
          <div
            className={`absolute top-2 left-2 z-10 px-2 py-1 rounded text-xs font-bold shadow-lg ${SIGNAL_LABELS[deal.signal_label].className}`}
          >
            {SIGNAL_LABELS[deal.signal_label].text}
          </div>
        )}
        {deal.image_url ? (
          <img
            src={deal.image_url}
            alt={deal.display_name || deal.name}
            className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm">No image</div>
        )}
      </div>

      <div className="p-4 bg-white/5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-[#3b82f6] uppercase tracking-wide">
            {deal.category}
          </span>
          <span className="text-xs font-bold text-[#0d1015] bg-[#35ffb5] px-2 py-0.5 rounded">
            -{deal.discount_percent}%
          </span>
        </div>

        <h3 className="font-medium text-white mb-3 line-clamp-2 group-hover:text-[#00ddff] transition-colors">
          {deal.display_name || deal.name}
        </h3>

        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-[#35ffb5]">
            ${deal.current_price}
          </span>
          <span className="text-sm text-white/50 line-through">
            ${deal.original_price}
          </span>
        </div>
      </div>
    </a>
  );
}
