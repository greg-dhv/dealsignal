"use client";

import { useState, useMemo } from "react";
import { Deal, Platform, SignalLabel } from "@/types/database";
import { DealCard } from "./DealCard";
import { PlatformTabs, FiltersSidebar } from "./DealsFilters";

type DealsGridProps = {
  deals: Deal[];
  categories: string[];
  partnerSite?: string;
};

function FilterIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function DealsGrid({ deals, categories, partnerSite }: DealsGridProps) {
  // Calculate max price from all deals
  const maxPrice = useMemo(() => {
    return Math.ceil(Math.max(...deals.map((d) => d.current_price), 0));
  }, [deals]);

  // Extract unique retailers from deals
  const retailers = useMemo(() => {
    const unique = [...new Set(deals.map((d) => d.retailer).filter(Boolean))];
    return unique.sort();
  }, [deals]);

  // Filter state
  const [priceRange, setPriceRange] = useState<number>(maxPrice);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedSignals, setSelectedSignals] = useState<SignalLabel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Apply filters
  const filteredDeals = useMemo(() => {
    let filtered = deals;

    // Filter by price
    filtered = filtered.filter((deal) => deal.current_price <= priceRange);

    // Filter by platform (if any selected)
    if (selectedPlatforms.length > 0) {
      filtered = filtered.filter((deal) =>
        deal.platforms?.some((p) => selectedPlatforms.includes(p))
      );
    }

    // Filter by signal (if any selected)
    if (selectedSignals.length > 0) {
      filtered = filtered.filter(
        (deal) => deal.signal_label && selectedSignals.includes(deal.signal_label)
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((deal) => deal.category === selectedCategory);
    }

    // Filter by retailer
    if (selectedRetailers.length > 0) {
      filtered = filtered.filter((deal) => selectedRetailers.includes(deal.retailer));
    }

    return filtered;
  }, [deals, priceRange, selectedPlatforms, selectedSignals, selectedCategory, selectedRetailers]);

  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSignalToggle = (signal: SignalLabel) => {
    if (signal === null) return;
    setSelectedSignals((prev) =>
      prev.includes(signal)
        ? prev.filter((s) => s !== signal)
        : [...prev, signal]
    );
  };

  const handleRetailerToggle = (retailer: string) => {
    setSelectedRetailers((prev) =>
      prev.includes(retailer)
        ? prev.filter((r) => r !== retailer)
        : [...prev, retailer]
    );
  };

  const clearFilters = () => {
    setPriceRange(maxPrice);
    setSelectedPlatforms([]);
    setSelectedSignals([]);
    setSelectedCategory(null);
    setSelectedRetailers([]);
  };

  const activeFilterCount =
    (priceRange < maxPrice ? 1 : 0) +
    selectedPlatforms.length +
    selectedSignals.length +
    (selectedCategory ? 1 : 0) +
    selectedRetailers.length;

  return (
    <div className="flex flex-col">
      {/* Top bar - Platform tabs + results count */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <PlatformTabs
          selectedPlatforms={selectedPlatforms}
          onPlatformToggle={handlePlatformToggle}
        />

        <div className="flex items-center gap-4">
          <p className="text-white/50 text-sm hidden sm:block">
            {filteredDeals.length} {filteredDeals.length === 1 ? "result" : "results"}
          </p>

          {/* Mobile filter button */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
          >
            <FilterIcon />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-[#00ddff] text-[#0d1015] text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile results count */}
      <p className="text-white/50 text-sm mb-4 sm:hidden">
        {filteredDeals.length} {filteredDeals.length === 1 ? "result" : "results"}
      </p>

      {/* Main content with sidebar */}
      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <FiltersSidebar
            maxPrice={maxPrice}
            priceRange={priceRange}
            selectedSignals={selectedSignals}
            selectedCategory={selectedCategory}
            selectedRetailers={selectedRetailers}
            categories={categories}
            retailers={retailers}
            onPriceChange={setPriceRange}
            onSignalToggle={handleSignalToggle}
            onCategoryChange={setSelectedCategory}
            onRetailerToggle={handleRetailerToggle}
            onClearFilters={clearFilters}
          />
        </div>

        {/* Mobile sidebar overlay */}
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowMobileFilters(false)}
            />

            {/* Sidebar */}
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#0d1015] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Filters</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-1 text-white/70 hover:text-white"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="p-4">
                <FiltersSidebar
                  maxPrice={maxPrice}
                  priceRange={priceRange}
                  selectedSignals={selectedSignals}
                  selectedCategory={selectedCategory}
                  selectedRetailers={selectedRetailers}
                  categories={categories}
                  retailers={retailers}
                  onPriceChange={setPriceRange}
                  onSignalToggle={handleSignalToggle}
                  onCategoryChange={setSelectedCategory}
                  onRetailerToggle={handleRetailerToggle}
                  onClearFilters={clearFilters}
                  hideHeader
                />
              </div>
            </div>
          </div>
        )}

        {/* Deals grid */}
        <div className="flex-1">
          {filteredDeals.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/50 mb-4">No deals match your filters.</p>
              <button
                onClick={clearFilters}
                className="text-[#00ddff] hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} partnerSite={partnerSite} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
