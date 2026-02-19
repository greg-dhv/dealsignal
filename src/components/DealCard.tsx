"use client";

import { Deal } from "@/types/database";

type DealCardProps = {
  deal: Deal;
  partnerSite?: string;
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
        {deal.image_url ? (
          <img
            src={deal.image_url}
            alt={deal.name}
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
          {deal.name}
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
