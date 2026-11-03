"use client";

import { useState, useEffect } from "react";
import { Check, ChevronDown, ChevronRight, MapPin, Building, Globe } from "lucide-react";

export interface GeoFilterSelection {
  type: "ALL" | "MY_CAMPUS" | "STATE" | "CITY" | "CAMPUS";
  id?: string;
  name: string;
}

interface AdvancedSelectListProps {
  currentSelection: GeoFilterSelection;
  onSelect: (selection: GeoFilterSelection) => void;
  userCampusName?: string;
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
          { id: "niat-yenepoya-bangalore", name: "Yenepoya University - Bangalore" },
          { id: "niat-spiher-bangalore", name: "SPIHER - Bangalore Campus" },
          { id: "niat-s-vyasa-bangalore", name: "S-VYASA University School of Advanced Studies" },
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
          { id: "niat-crescent-chennai", name: "B. S. Abdur Rahman Crescent Institute" },
          { id: "niat-biher-chennai", name: "Bharath Institute (BIHER)" },
          { id: "niat-spiher-chennai", name: "SPIHER - Chennai Campus" },
          { id: "niat-amet-chennai", name: "AMET University" },
          { id: "niat-chennai", name: "NIAT Chennai Central" },
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
          { id: "niat-malla-reddy-hyderabad", name: "Malla Reddy Vishwavidyapeeth" },
          { id: "niat-aurora-hyderabad", name: "Aurora Deemed University" },
          { id: "niat-chaitanya-hyderabad", name: "Chaitanya (Deemed to be University)" },
          { id: "niat-smr-hyderabad", name: "SMR University" },
          { id: "niat-hyderabad", name: "NIAT Hyderabad Central" },
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
        name: "Paritala",
        campuses: [{ id: "niat-mvr-paritala", name: "MVR College of Engineering" }],
      },
      {
        name: "Guntur",
        campuses: [
          { id: "niat-chalapathi-technology-guntur", name: "Chalapathi Institute of Technology" },
          { id: "niat-chalapathi-university-guntur", name: "Chalapathi University (CIET)" },
        ],
      },
      {
        name: "Anantapur",
        campuses: [{ id: "niat-best-innovation-anantapur", name: "BEST Innovation University" }],
      },
      {
        name: "Rajam",
        campuses: [{ id: "niat-gmrit-rajam", name: "GMR Institute of Technology (GMRIT)" }],
      },
      {
        name: "Rajampet",
        campuses: [{ id: "niat-annamacharya-kadapa", name: "Annamacharya University (AITS)" }],
      },
      {
        name: "Kavali",
        campuses: [{ id: "niat-visvodaya-nellore", name: "PBR Visvodaya Institute" }],
      },
    ],
  },
  {
    state: "Maharashtra",
    cities: [
      {
        name: "Pune",
        campuses: [
          { id: "niat-adypu-pune", name: "Ajeenkya DY Patil University (ADYPU)" },
          { id: "niat-alard-pune", name: "Alard University" },
        ],
      },
      {
        name: "Kolhapur",
        campuses: [
          { id: "niat-sanjay-ghodawat-kolhapur", name: "Sanjay Ghodawat University (SGU)" },
        ],
      },
      {
        name: "Nashik",
        campuses: [{ id: "niat-sandip-nashik", name: "Sandip University" }],
      },
    ],
  },
  {
    state: "Uttar Pradesh",
    cities: [
      {
        name: "Lucknow",
        campuses: [{ id: "niat-ts-mishra-lucknow", name: "T.S. Mishra University" }],
      },
      {
        name: "Mathura",
        campuses: [{ id: "niat-sanskriti-mathura", name: "Sanskriti University" }],
      },
      {
        name: "Meerut",
        campuses: [{ id: "niat-subharti-meerut", name: "Swami Vivekanand Subharti University" }],
      },
      {
        name: "Noida",
        campuses: [{ id: "niat-niu-noida", name: "Noida International University (NIU)" }],
      },
    ],
  },
  {
    state: "Haryana",
    cities: [
      {
        name: "Gurugram",
        campuses: [{ id: "niat-sushant-gurugram", name: "Sushant University" }],
      },
      {
        name: "Faridabad",
        campuses: [{ id: "niat-lingayas-faridabad", name: "Lingaya’s Vidyapeeth" }],
      },
      {
        name: "Panipat",
        campuses: [{ id: "niat-geeta-panipat", name: "Geeta University" }],
      },
    ],
  },
  {
    state: "Rajasthan",
    cities: [
      {
        name: "Jaipur",
        campuses: [{ id: "niat-vgu-jaipur", name: "Vivekananda Global University (VGU)" }],
      },
    ],
  },
  {
    state: "Madhya Pradesh",
    cities: [
      {
        name: "Bhopal",
        campuses: [{ id: "niat-sgsu-bhopal", name: "Scope Global Skills University" }],
      },
    ],
  },
  {
    state: "Odisha",
    cities: [
      {
        name: "Cuttack",
        campuses: [{ id: "niat-sri-sri-cuttack", name: "Sri Sri University" }],
      },
    ],
  },
];

export default function AdvancedSelectList({
  currentSelection,
  onSelect,
  userCampusName = "Yenepoya Bangalore",
}: AdvancedSelectListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [regions, setRegions] = useState<GeoRegion[]>(STATIC_FALLBACK_REGIONS);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({
    Karnataka: true,
  });
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({
    Bengaluru: true,
  });

  // Fetch live hierarchy from DB
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

  function toggleCity(cityName: string) {
    setExpandedCities((prev) => ({ ...prev, [cityName]: !prev[cityName] }));
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
      >
        <MapPin className="h-3.5 w-3.5 text-indigo-600" />
        <span>{currentSelection.name}</span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />

          <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-100 ring-1 ring-black/5 z-50 overflow-hidden divide-y divide-slate-100 max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-100">
            {/* Header */}
            <div className="p-3.5 bg-slate-50/80">
              <p className="text-xs font-bold text-slate-800">Advanced Geographic Selection</p>
              <p className="text-[11px] text-slate-500">
                Filter feed, network, or boards by campus or region
              </p>
            </div>

            {/* Quick Presets */}
            <div className="p-2 space-y-1 bg-white">
              <button
                type="button"
                onClick={() => {
                  onSelect({ type: "ALL", name: "All Campuses (India)" });
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  currentSelection.type === "ALL"
                    ? "bg-indigo-50 text-indigo-700 font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-indigo-600" />
                  <span>All Campuses (India)</span>
                </div>
                {currentSelection.type === "ALL" && <Check className="h-4 w-4 text-indigo-600" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelect({ type: "MY_CAMPUS", name: `My Campus (${userCampusName})` });
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  currentSelection.type === "MY_CAMPUS"
                    ? "bg-indigo-50 text-indigo-700 font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-indigo-600" />
                  <span>My Campus ({userCampusName})</span>
                </div>
                {currentSelection.type === "MY_CAMPUS" && (
                  <Check className="h-4 w-4 text-indigo-600" />
                )}
              </button>
            </div>

            {/* 3-Tier Hierarchy Tree */}
            <div className="p-2 overflow-y-auto space-y-1 flex-1">
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Browse 41+ Campuses by State & City
              </p>

              {regions.map((reg) => {
                const isStateExpanded = Boolean(expandedStates[reg.state]);
                const isStateSelected =
                  currentSelection.type === "STATE" && currentSelection.name === reg.state;

                return (
                  <div
                    key={reg.state}
                    className="rounded-xl overflow-hidden border border-slate-100"
                  >
                    {/* State Row */}
                    <div className="flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 px-2.5 py-1.5 transition-colors">
                      <button
                        type="button"
                        onClick={() => toggleState(reg.state)}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-800 flex-1 text-left"
                      >
                        {isStateExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        <span>{reg.state}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onSelect({ type: "STATE", name: reg.state });
                          setIsOpen(false);
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-colors ${
                          isStateSelected
                            ? "bg-indigo-600 text-white"
                            : "text-indigo-600 hover:bg-indigo-50"
                        }`}
                      >
                        {isStateSelected ? "Selected" : "Select State"}
                      </button>
                    </div>

                    {/* Cities List */}
                    {isStateExpanded && (
                      <div className="pl-4 pr-1 py-1 space-y-1 bg-white border-t border-slate-100">
                        {reg.cities.map((city) => {
                          const isCityExpanded = Boolean(expandedCities[city.name]);
                          const isCitySelected =
                            currentSelection.type === "CITY" && currentSelection.name === city.name;

                          return (
                            <div key={city.name} className="space-y-1">
                              <div className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50">
                                <button
                                  type="button"
                                  onClick={() => toggleCity(city.name)}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 flex-1 text-left"
                                >
                                  {isCityExpanded ? (
                                    <ChevronDown className="h-3 w-3 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 text-slate-400" />
                                  )}
                                  <span>{city.name}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelect({ type: "CITY", name: city.name });
                                    setIsOpen(false);
                                  }}
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                                    isCitySelected
                                      ? "bg-indigo-600 text-white"
                                      : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                                  }`}
                                >
                                  {isCitySelected ? "Selected" : "Select City"}
                                </button>
                              </div>

                              {/* Campuses under City */}
                              {isCityExpanded && (
                                <div className="pl-5 space-y-0.5 pb-1">
                                  {city.campuses.map((camp) => {
                                    const isCampSelected =
                                      currentSelection.type === "CAMPUS" &&
                                      (currentSelection.id === camp.id ||
                                        currentSelection.name === camp.name);

                                    return (
                                      <button
                                        key={camp.id}
                                        type="button"
                                        onClick={() => {
                                          onSelect({
                                            type: "CAMPUS",
                                            id: camp.id,
                                            name: camp.name,
                                          });
                                          setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                                          isCampSelected
                                            ? "bg-indigo-50 text-indigo-700 font-bold"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                      >
                                        <span className="truncate">{camp.name}</span>
                                        {isCampSelected && (
                                          <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0 ml-1" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
