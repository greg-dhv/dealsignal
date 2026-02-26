"use client";

import { Deal, Platform, SignalLabel } from "@/types/database";

type DealsFiltersProps = {
  deals: Deal[];
  maxPrice: number;
  priceRange: number;
  selectedPlatforms: Platform[];
  selectedSignals: SignalLabel[];
  selectedCategory: string | null;
  selectedRetailers: string[];
  categories: string[];
  retailers: string[];
  onPriceChange: (value: number) => void;
  onPlatformToggle: (platform: Platform) => void;
  onSignalToggle: (signal: SignalLabel) => void;
  onCategoryChange: (category: string | null) => void;
  onRetailerToggle: (retailer: string) => void;
  onClearFilters: () => void;
};

const SIGNAL_OPTIONS: { value: Exclude<SignalLabel, null>; label: string }[] = [
  { value: "historical_low", label: "Historical Low" },
  { value: "low_90d", label: "90-Day Low" },
  { value: "low_30d", label: "30-Day Low" },
  { value: "recent_drop", label: "Price Drop" },
];

// Platform icons as simple SVG components
function PCIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
    </svg>
  );
}

function PlayStationIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.5 4.27v10.54c0 .59-.33 1.13-.86 1.39l-3.28 1.64A1.5 1.5 0 0 1 3 16.5V5.77c0-.59.33-1.13.86-1.39l3.28-1.64A1.5 1.5 0 0 1 9.5 4.27zm11.64 8.89l-3.28 1.64a1.5 1.5 0 0 1-2.36-1.23V3.04c0-.59.33-1.13.86-1.39l3.28-1.64A1.5 1.5 0 0 1 22 1.35v10.54c0 .59-.33 1.13-.86 1.39v-.12z"/>
    </svg>
  );
}

function XboxIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  );
}

const PLATFORMS: { value: Platform; label: string; icon: React.ReactNode }[] = [
  { value: "PC", label: "PC", icon: <PCIcon /> },
  { value: "PS5", label: "PlayStation", icon: <PlayStationIcon /> },
  { value: "Xbox", label: "Xbox", icon: <XboxIcon /> },
];

export function PlatformTabs({
  selectedPlatforms,
  onPlatformToggle,
}: {
  selectedPlatforms: Platform[];
  onPlatformToggle: (platform: Platform) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
      {PLATFORMS.map((platform) => (
        <button
          key={platform.value}
          onClick={() => onPlatformToggle(platform.value)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedPlatforms.includes(platform.value)
              ? "bg-[#00ddff] text-[#0d1015]"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          {platform.icon}
          <span className="hidden sm:inline">{platform.label}</span>
        </button>
      ))}
    </div>
  );
}

export function FiltersSidebar({
  maxPrice,
  priceRange,
  selectedSignals,
  selectedCategory,
  selectedRetailers,
  categories,
  retailers,
  onPriceChange,
  onSignalToggle,
  onCategoryChange,
  onRetailerToggle,
  onClearFilters,
  hideHeader = false,
}: Omit<DealsFiltersProps, "deals" | "selectedPlatforms" | "onPlatformToggle"> & { hideHeader?: boolean }) {
  const hasActiveFilters =
    priceRange < maxPrice ||
    selectedSignals.length > 0 ||
    selectedCategory !== null ||
    selectedRetailers.length > 0;

  return (
    <aside className="w-64 flex-shrink-0 bg-white/5 rounded-lg p-4 h-fit lg:sticky lg:top-4">
      {!hideHeader && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-xs text-[#00ddff] hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Price Range */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-white/70 mb-3">Price</h3>
        <input
          type="range"
          min={0}
          max={maxPrice}
          value={priceRange}
          onChange={(e) => onPriceChange(Number(e.target.value))}
          className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#00ddff]"
        />
        <p className="text-xs text-white/50 mt-2">
          Between $0 and ${priceRange}
        </p>
      </div>

      {/* Deal Types */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-white/70 mb-3">Deal Type</h3>
        <div className="space-y-2">
          {SIGNAL_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  selectedSignals.includes(option.value)
                    ? "bg-[#00ddff] border-[#00ddff]"
                    : "border-white/30 bg-white/5 group-hover:border-white/50"
                }`}
                onClick={() => onSignalToggle(option.value)}
              >
                {selectedSignals.includes(option.value) && (
                  <svg className="w-3 h-3 text-[#0d1015]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span
                className="text-sm text-white/70 group-hover:text-white transition-colors"
                onClick={() => onSignalToggle(option.value)}
              >
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Retailers */}
      {retailers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-white/70 mb-3">Retailer</h3>
          <div className="space-y-2">
            {retailers.map((retailer) => (
              <label
                key={retailer}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    selectedRetailers.includes(retailer)
                      ? "bg-[#00ddff] border-[#00ddff]"
                      : "border-white/30 bg-white/5 group-hover:border-white/50"
                  }`}
                  onClick={() => onRetailerToggle(retailer)}
                >
                  {selectedRetailers.includes(retailer) && (
                    <svg className="w-3 h-3 text-[#0d1015]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  className="text-sm text-white/70 group-hover:text-white transition-colors"
                  onClick={() => onRetailerToggle(retailer)}
                >
                  {retailer}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div>
        <h3 className="text-sm font-medium text-white/70 mb-3">Categories</h3>
        <div className="space-y-1">
          <button
            onClick={() => onCategoryChange(null)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              selectedCategory === null
                ? "bg-[#00ddff]/20 text-[#00ddff]"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`w-full text-left px-3 py-2 rounded text-sm capitalize transition-colors ${
                selectedCategory === cat
                  ? "bg-[#00ddff]/20 text-[#00ddff]"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
