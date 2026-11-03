"use client";

import { useState } from "react";
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
    campuses: { id: string; name: string }[];
  }[];
}

const REGION_DATA: GeoRegion[] = [
  {
    state: "Karnataka",
    cities: [
      {
        name: "Bengaluru",
        campuses: [
          { id: "campus-blr-main", name: "NIAT S-VYASA Bengaluru" },
          { id: "campus-blr-tech", name: "NIAT Whitefield Tech Campus" },
        ],
      },
      {
        name: "Mysuru",
        campuses: [{ id: "campus-mys-1", name: "NIAT Mysuru Heritage Campus" }],
      },
    ],
  },
  {
    state: "Telangana",
    cities: [
      {
        name: "Hyderabad",
        campuses: [
          { id: "campus-hyd-hitech", name: "NIAT Hi-Tech City Hyderabad" },
          { id: "campus-hyd-central", name: "NIAT Central Campus Hyderabad" },
        ],
      },
    ],
  },
  {
    state: "Tamil Nadu",
    cities: [
      {
        name: "Chennai",
        campuses: [{ id: "campus-chn-omr", name: "NIAT OMR Tech Hub Chennai" }],
      },
      {
        name: "Coimbatore",
        campuses: [{ id: "campus-cbe-1", name: "NIAT Coimbatore Campus" }],
      },
    ],
  },
];

export default function AdvancedSelectList({
  currentSelection,
  onSelect,
  userCampusName = "S-VYASA Bengaluru",
}: AdvancedSelectListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({
    Karnataka: true,
  });
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({
    Bengaluru: true,
  });

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
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-1.5 w-72 max-h-96 overflow-y-auto rounded-xl bg-white p-2 shadow-xl border border-slate-200 z-50 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
              Geographic Scope
            </div>

            {/* All Campuses */}
            <button
              type="button"
              onClick={() => {
                onSelect({ type: "ALL", name: "All Campuses" });
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                currentSelection.type === "ALL"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-indigo-500" />
                <span>All Campuses (Global)</span>
              </div>
              {currentSelection.type === "ALL" && <Check className="h-3.5 w-3.5 text-indigo-600" />}
            </button>

            {/* My Campus Quick Select */}
            <button
              type="button"
              onClick={() => {
                onSelect({ type: "MY_CAMPUS", name: `My Campus (${userCampusName})` });
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                currentSelection.type === "MY_CAMPUS"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Building className="h-3.5 w-3.5 text-emerald-500" />
                <span>My Campus ({userCampusName})</span>
              </div>
              {currentSelection.type === "MY_CAMPUS" && (
                <Check className="h-3.5 w-3.5 text-indigo-600" />
              )}
            </button>

            <div className="my-1 border-t border-slate-100" />
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              State & Campus Hierarchy
            </div>

            {/* Hierarchy Tree */}
            <div className="space-y-1">
              {REGION_DATA.map((region) => {
                const isStateExpanded = !!expandedStates[region.state];
                const isStateSelected =
                  currentSelection.type === "STATE" && currentSelection.name === region.state;

                return (
                  <div key={region.state} className="rounded-md">
                    <div className="flex items-center justify-between hover:bg-slate-50 rounded-md px-2 py-1">
                      <button
                        type="button"
                        onClick={() => toggleState(region.state)}
                        className="flex items-center gap-1.5 text-slate-700 font-semibold flex-1 text-left"
                      >
                        {isStateExpanded ? (
                          <ChevronDown className="h-3 w-3 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-slate-400" />
                        )}
                        <span>{region.state}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onSelect({ type: "STATE", name: region.state });
                          setIsOpen(false);
                        }}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                          isStateSelected
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                        }`}
                      >
                        Select All
                      </button>
                    </div>

                    {isStateExpanded && (
                      <div className="pl-4 pr-1 py-0.5 space-y-1 border-l-2 border-slate-100 ml-3">
                        {region.cities.map((city) => {
                          const isCityExpanded = !!expandedCities[city.name];
                          const isCitySelected =
                            currentSelection.type === "CITY" && currentSelection.name === city.name;

                          return (
                            <div key={city.name}>
                              <div className="flex items-center justify-between hover:bg-slate-50 rounded px-1.5 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => toggleCity(city.name)}
                                  className="flex items-center gap-1 text-slate-600 text-[11px] font-medium flex-1 text-left"
                                >
                                  {isCityExpanded ? (
                                    <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="h-2.5 w-2.5 text-slate-400" />
                                  )}
                                  <span>{city.name}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelect({ type: "CITY", name: city.name });
                                    setIsOpen(false);
                                  }}
                                  className={`text-[9px] px-1 py-0.2 rounded border ${
                                    isCitySelected
                                      ? "bg-indigo-600 text-white border-indigo-600"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200"
                                  }`}
                                >
                                  City
                                </button>
                              </div>

                              {isCityExpanded && (
                                <div className="pl-3 py-0.5 space-y-0.5">
                                  {city.campuses.map((camp) => {
                                    const isCampSelected =
                                      currentSelection.type === "CAMPUS" &&
                                      currentSelection.id === camp.id;
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
                                        className={`w-full flex items-center justify-between text-[11px] px-2 py-1 rounded text-left transition-colors ${
                                          isCampSelected
                                            ? "bg-indigo-50 text-indigo-700 font-semibold"
                                            : "hover:bg-slate-50 text-slate-600"
                                        }`}
                                      >
                                        <span className="truncate">{camp.name}</span>
                                        {isCampSelected && (
                                          <Check className="h-3 w-3 text-indigo-600 shrink-0" />
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
