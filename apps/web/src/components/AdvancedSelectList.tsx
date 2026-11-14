"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, MapPin, Search, X, Building2, Globe } from "lucide-react";
import { Button } from "@stunet/ui";

export interface GeoFilterSelection {
  type: "ALL" | "MY_CAMPUS" | "STATE" | "CITY" | "CAMPUS";
  id?: string;
  name: string;
}

interface AdvancedSelectListProps {
  selectedCampuses?: string[];
  onApplyCampuses?: (campuses: string[]) => void;
  currentSelection?: GeoFilterSelection;
  onSelect?: (selection: GeoFilterSelection) => void;
  userCampusName?: string;
  compact?: boolean;
}

interface GeoRegion {
  state: string;
  cities: {
    name: string;
    campuses: { id: string; name: string; slug?: string }[];
  }[];
}

const STATIC_FALLBACK_REGIONS: GeoRegion[] = [
  {
    state: "Karnataka",
    cities: [
      {
        name: "Bengaluru",
        campuses: [
          { id: "niat-s-vyasa-bangalore", name: "S-VYASA University" },
          { id: "niat-yenepoya-bangalore", name: "Yenepoya University - Bangalore" },
          { id: "niat-spiher-bangalore", name: "SPIHER - Bangalore Campus" },
        ],
      },
      {
        name: "Mangalore",
        campuses: [
          { id: "niat-mangalore-yenepoya-university", name: "Yenepoya University - Mangalore" },
        ],
      },
    ],
  },
  {
    state: "Tamil Nadu",
    cities: [
      {
        name: "Chennai",
        campuses: [
          { id: "niat-chennai", name: "NIAT Chennai Central" },
          { id: "niat-amet-chennai", name: "AMET University" },
          { id: "niat-crescent-chennai", name: "B. S. Abdur Rahman Crescent Institute" },
          { id: "niat-biher-chennai", name: "Bharath Institute (BIHER)" },
          { id: "niat-spiher-chennai", name: "SPIHER - Chennai Campus" },
        ],
      },
      {
        name: "Coimbatore",
        campuses: [
          { id: "niat-sns-coimbatore", name: "SNS College of Technology" },
          { id: "niat-pk-das-coimbatore", name: "PK DAS Institute" },
        ],
      },
      {
        name: "Vadakkangulam",
        campuses: [{ id: "niat-joy-university", name: "Joy University" }],
      },
      {
        name: "Tindivanam",
        campuses: [{ id: "niat-takshashila-university", name: "Takshashila University" }],
      },
    ],
  },
  {
    state: "Telangana",
    cities: [
      {
        name: "Hyderabad",
        campuses: [
          { id: "niat-hyderabad", name: "NIAT Hyderabad Central" },
          { id: "niat-malla-reddy-hyderabad", name: "Malla Reddy Vishwavidyapeeth" },
          { id: "niat-aurora-hyderabad", name: "Aurora Deemed University" },
          { id: "niat-chaitanya-hyderabad", name: "Chaitanya (Deemed to be University)" },
          { id: "niat-smr-hyderabad", name: "SMR University" },
        ],
      },
    ],
  },
  {
    state: "Andhra Pradesh",
    cities: [
      {
        name: "Visakhapatnam",
        campuses: [
          { id: "niat-viet-visakhapatnam", name: "Visakha Institute (VIET)" },
          { id: "niat-nsrit-visakhapatnam", name: "NSRIT Visakhapatnam" },
        ],
      },
      {
        name: "Vijayawada",
        campuses: [
          { id: "niat-nri-technology-vijayawada", name: "NRI Institute of Technology" },
          { id: "niat-limat-vijayawada", name: "LIMAT Vijayawada" },
        ],
      },
      {
        name: "Guntur",
        campuses: [
          { id: "niat-chalapathi-technology-guntur", name: "Chalapathi Institute of Technology" },
          { id: "niat-chalapathi-university-guntur", name: "Chalapathi University (CIET)" },
        ],
      },
    ],
  },
  {
    state: "Maharashtra",
    cities: [
      {
        name: "Pune",
        campuses: [{ id: "niat-dypiu-pune", name: "D.Y. Patil International University" }],
      },
      {
        name: "Nagpur",
        campuses: [{ id: "niat-gh-raisoni-nagpur", name: "G H Raisoni University" }],
      },
    ],
  },
  {
    state: "Delhi NCR",
    cities: [
      {
        name: "Noida",
        campuses: [{ id: "niat-niu-noida", name: "Noida International University (NIU)" }],
      },
      {
        name: "Gurugram",
        campuses: [{ id: "niat-sushant-gurugram", name: "Sushant University" }],
      },
    ],
  },
];

const DEFAULT_EMPTY_CAMPUSES: string[] = [];

export default function AdvancedSelectList({
  selectedCampuses = DEFAULT_EMPTY_CAMPUSES,
  onApplyCampuses,
  currentSelection,
  onSelect,
  userCampusName = "S-VYASA University",
  compact: _compact = true,
}: AdvancedSelectListProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [regions, setRegions] = useState<GeoRegion[]>(STATIC_FALLBACK_REGIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelected, setTempSelected] = useState<string[]>(selectedCampuses);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({
    Karnataka: true,
    "Tamil Nadu": true,
  });

  const selectedCampusesKey = (selectedCampuses ?? []).join(",");

  // Sync state whenever modal opens or selectedCampuses prop updates
  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedCampuses ?? []);
    }
  }, [selectedCampusesKey, isOpen]);

  // Fetch live hierarchy from DB if available
  useEffect(() => {
    async function fetchHierarchy() {
      try {
        const res = await fetch("/api/campuses/hierarchy");
        if (res.ok) {
          const data = await res.json();
          if (data.hierarchy && data.hierarchy.length > 0) {
            setRegions(data.hierarchy);
          }
        }
      } catch {
        // use static fallback
      }
    }
    fetchHierarchy();
  }, []);

  function toggleState(stateName: string) {
    setExpandedStates((prev) => ({ ...prev, [stateName]: !prev[stateName] }));
  }

  function toggleCampus(campusName: string) {
    setTempSelected((prev) =>
      prev.includes(campusName) ? prev.filter((c) => c !== campusName) : [...prev, campusName],
    );
  }

  // Direct 1-Click Filter for "All" and "My Campus" (no need to press Apply Filter)
  function handleDirectFilter(filterType: "ALL" | "MY_CAMPUS") {
    if (filterType === "ALL") {
      setTempSelected([]);
      if (onApplyCampuses) {
        onApplyCampuses([]);
      }
      if (onSelect) {
        onSelect({ type: "ALL", name: "All Campuses" });
      }
    } else {
      const myCampus = userCampusName || "S-VYASA University";
      setTempSelected([myCampus]);
      if (onApplyCampuses) {
        onApplyCampuses([myCampus]);
      }
      if (onSelect) {
        onSelect({ type: "CAMPUS", name: myCampus });
      }
    }
    setIsOpen(false);
  }

  function handleSelectCityAll(campuses: { name: string }[]) {
    const campusNames = campuses.map((c) => c.name);
    const allSelected = campusNames.every((n) => tempSelected.includes(n));

    if (allSelected) {
      // Uncheck all in this city
      setTempSelected((prev) => prev.filter((c) => !campusNames.includes(c)));
    } else {
      // Check all in this city
      setTempSelected((prev) => Array.from(new Set([...prev, ...campusNames])));
    }
  }

  function handleApply() {
    if (onApplyCampuses) {
      onApplyCampuses(tempSelected);
    }
    if (onSelect) {
      if (tempSelected.length === 0) {
        onSelect({ type: "ALL", name: "All Campuses" });
      } else if (tempSelected.length === 1) {
        onSelect({ type: "CAMPUS", name: tempSelected[0] });
      } else {
        onSelect({ type: "CAMPUS", name: `${tempSelected.length} Campuses` });
      }
    }
    setIsOpen(false);
  }

  function handleClearAll() {
    setTempSelected([]);
  }

  // Filter regions based on search query
  const query = searchQuery.toLowerCase().trim();
  const filteredRegions = regions
    .map((reg) => {
      const stateMatches = reg.state.toLowerCase().includes(query);
      const matchingCities = reg.cities
        .map((city) => {
          const cityMatches = city.name.toLowerCase().includes(query);
          const matchingCampuses = city.campuses.filter(
            (c) =>
              stateMatches ||
              cityMatches ||
              c.name.toLowerCase().includes(query) ||
              (c.slug && c.slug.toLowerCase().includes(query)),
          );
          return { ...city, campuses: matchingCampuses };
        })
        .filter((city) => city.campuses.length > 0);

      return { ...reg, cities: matchingCities };
    })
    .filter((reg) => reg.cities.length > 0);

  // Compute trigger button label
  let triggerLabel = "Campus";
  if (selectedCampuses.length === 1) {
    const first = selectedCampuses[0];
    triggerLabel = first.length > 10 ? first.slice(0, 8) + "…" : first;
  } else if (selectedCampuses.length > 1) {
    triggerLabel = `Campus (${selectedCampuses.length})`;
  } else if (currentSelection && currentSelection.type !== "ALL") {
    triggerLabel =
      currentSelection.name.length > 10
        ? currentSelection.name.slice(0, 8) + "…"
        : currentSelection.name;
  }

  const isFilterActive = selectedCampuses.length > 0;

  return (
    <>
      {/* Trigger Button in Sub-Filters row */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
          isFilterActive
            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
        }`}
        title={
          selectedCampuses.length > 0
            ? `Filtered by: ${selectedCampuses.join(", ")}`
            : "Filter by Campus (Flipkart style multi-select)"
        }
      >
        <MapPin
          className={`h-3.5 w-3.5 shrink-0 ${isFilterActive ? "text-white" : "text-indigo-600 dark:text-indigo-400"}`}
        />
        <span className="truncate max-w-[95px]">{triggerLabel}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
      </button>

      {/* Flipkart-Style Multi-Campus Selection Modal */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsOpen(false);
            }}
          >
            <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[85vh] sm:max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-150 my-auto">
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/70 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Filter by Campus
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select multiple campuses across cities to customize your stream
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search Input */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search campuses by name, city, or state…"
                    className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Direct 1-Click Action Filters (No need to press Apply Filter) */}
              <div className="p-2.5 bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDirectFilter("ALL")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border shadow-2xs ${
                    selectedCampuses.length === 0 &&
                    (!currentSelection || currentSelection.type === "ALL")
                      ? "bg-slate-900 dark:bg-slate-700 text-white border-slate-900 dark:border-slate-700 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                  <span>All Campuses</span>
                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                    (Direct)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDirectFilter("MY_CAMPUS")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border shadow-2xs ${
                    (selectedCampuses.length === 1 &&
                      selectedCampuses[0] === (userCampusName || "S-VYASA University")) ||
                    (currentSelection &&
                      currentSelection.name === (userCampusName || "S-VYASA University"))
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span className="truncate">
                    My Campus ({userCampusName || "S-VYASA University"})
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                    (Direct)
                  </span>
                </button>
              </div>

              {/* Active Selected Badges Bar */}
              {tempSelected.length > 0 && (
                <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 border-b border-indigo-100/70 dark:border-indigo-900/50 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider shrink-0">
                      Selected ({tempSelected.length}):
                    </span>
                    {tempSelected.map((campName) => (
                      <span
                        key={campName}
                        className="inline-flex items-center gap-1 text-[11px] font-medium bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full shadow-2xs"
                      >
                        <span className="truncate max-w-[140px]">{campName}</span>
                        <button
                          type="button"
                          onClick={() => toggleCampus(campName)}
                          className="hover:text-rose-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:underline shrink-0 px-2"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Campus Hierarchy with Checkboxes (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRegions.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    No campuses match &quot;{searchQuery}&quot;. Try another search term.
                  </div>
                ) : (
                  filteredRegions.map((reg) => {
                    const isExpanded = Boolean(expandedStates[reg.state]);
                    return (
                      <div key={reg.state} className="pt-2 first:pt-0 space-y-1.5">
                        {/* State Group Header */}
                        <button
                          type="button"
                          onClick={() => toggleState(reg.state)}
                          className="w-full flex items-center justify-between py-1 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            )}
                            <span>{reg.state}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {reg.cities.reduce((acc, c) => acc + c.campuses.length, 0)} campuses
                          </span>
                        </button>

                        {/* Cities & Campuses List */}
                        {isExpanded && (
                          <div className="pl-4 space-y-3 pt-1">
                            {reg.cities.map((city) => {
                              const allCitySelected = city.campuses.every((c) =>
                                tempSelected.includes(c.name),
                              );

                              return (
                                <div key={city.name} className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg">
                                    <span>{city.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectCityAll(city.campuses)}
                                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                                    >
                                      {allCitySelected ? "Deselect City" : "Select City"}
                                    </button>
                                  </div>

                                  {/* Campus Rows with Checkboxes */}
                                  <div className="space-y-1 pl-2">
                                    {city.campuses.map((camp) => {
                                      const isChecked = tempSelected.includes(camp.name);
                                      return (
                                        <label
                                          key={camp.id}
                                          className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                            isChecked
                                              ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 font-semibold"
                                              : "bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleCampus(camp.name)}
                                            className="mt-0.5 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 shrink-0"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <p className="truncate font-medium">{camp.name}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                              {city.name}, {reg.state}
                                            </p>
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer (Flipkart-style: Clear All + Apply Filter) */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <strong>{tempSelected.length}</strong> campus
                  {tempSelected.length === 1 ? "" : "es"} selected
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClearAll}
                    disabled={tempSelected.length === 0}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                  <Button
                    type="button"
                    onClick={handleApply}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 font-bold"
                  >
                    Apply {tempSelected.length > 0 ? `(${tempSelected.length})` : "Filter"}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
