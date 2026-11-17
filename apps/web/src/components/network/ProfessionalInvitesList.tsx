"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Briefcase,
  Plus,
  Check,
  AlertTriangle,
  Laptop,
  MapPin,
  Calendar,
  Clock,
  UserPlus,
} from "lucide-react";
import { Avatar, Button, Card, CardContent } from "@stunet/ui";
import type { InviteItem } from "./types";

export interface ProfessionalInvitesListProps {
  invites: InviteItem[];
  loadingInvites: boolean;
  postPublishedSuccess: boolean;
  onOpenNewPostModal: () => void;
  mobileTab?: "POSTS" | "GROUPS";
}

export function ProfessionalInvitesList({
  invites,
  loadingInvites,
  postPublishedSuccess,
  onOpenNewPostModal,
  mobileTab = "POSTS",
}: ProfessionalInvitesListProps) {
  const [invitesFilterTab, setInvitesFilterTab] = useState<"ALL" | "NON_CONNECTED">("ALL");

  const filteredInvites = invites.filter((inv) =>
    invitesFilterTab === "NON_CONNECTED" ? Boolean(inv.isFromNonConnected) : true,
  );

  const nonConnectedCount = invites.filter((i) => Boolean(i.isFromNonConnected)).length;

  return (
    <div
      className={`lg:col-span-7 space-y-4 ${mobileTab === "POSTS" ? "block" : "hidden lg:block"}`}
    >
      {postPublishedSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2 shadow-2xs">
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Professional collaboration post published to your target audience!</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
            Professional Collaboration Posts & Team-Up Invites
          </h2>
        </div>

        {/* Filter Tabs: All Opportunities vs Invites from Non-Connected Members */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setInvitesFilterTab("ALL")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              invitesFilterTab === "ALL"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            All Opportunities ({invites.length})
          </button>
          <button
            type="button"
            onClick={() => setInvitesFilterTab("NON_CONNECTED")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              invitesFilterTab === "NON_CONNECTED"
                ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <span>Invites from Non-Connected</span>
            {nonConnectedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500 text-white font-extrabold">
                {nonConnectedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Feed of Collaboration Posts and Invitations */}
      {loadingInvites ? (
        <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          Loading opportunities…
        </div>
      ) : filteredInvites.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Briefcase className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            {invitesFilterTab === "NON_CONNECTED"
              ? "No invitations received from non-connected members."
              : "No active collaboration calls yet."}
          </p>
          {invitesFilterTab === "ALL" && (
            <button
              type="button"
              onClick={onOpenNewPostModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              <span>Publish the First Post</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredInvites.map((inv) => (
            <Card
              key={inv.id}
              className="border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all rounded-3xl overflow-hidden bg-white dark:bg-slate-900"
            >
              <CardContent className="p-5 space-y-3">
                {/* Header Row: Type & Mode & Expiry & Non-Connected Tag */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 tracking-wider">
                      {inv.type}
                    </span>

                    {inv.isFromNonConnected && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        <span>From Non-Connected Member</span>
                      </span>
                    )}

                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      {inv.mode === "ONLINE" ? (
                        <>
                          <Laptop className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Online Remote</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3.5 w-3.5 text-rose-500" />
                          <span>{inv.location || "In-Person"}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {inv.eventDate && (
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Event:{" "}
                          {new Date(inv.eventDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </span>
                    )}

                    {inv.expiresAt && (
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          Open until{" "}
                          {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Post Title & Description */}
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 leading-snug">
                    {inv.name}
                  </h3>
                  {inv.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1.5">
                      {inv.description}
                    </p>
                  )}
                </div>

                {/* Tech Stacks / Requirements */}
                {inv.requirements && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {inv.requirements.split(",").map((req, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-0.5 rounded-lg text-slate-700 dark:text-slate-300"
                      >
                        {req.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer Row: Creator & Team Up Action */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar name={inv.creator.displayName} size="sm" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 leading-none">
                        {inv.creator.displayName}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        @{inv.creator.username} · {inv.creator.campus?.name || "Campus Peer"}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() =>
                      alert(
                        `Expressed interest! A direct team-up ping has been sent to ${inv.creator.displayName}.`,
                      )
                    }
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3.5 rounded-xl shadow-2xs flex items-center gap-1.5"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Team Up</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
