"use client";

import React, { useState } from "react";
import { Search, Send } from "lucide-react";
import { Avatar, Button, Modal } from "@stunet/ui";
import AdvancedSelectList, { GeoFilterSelection } from "@/components/AdvancedSelectList";
import type { InviteItem } from "./types";

export interface RecipientUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  isConnected?: boolean;
}

export interface NewProfessionalPostFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPost: InviteItem) => void;
  topInteractedMembers?: RecipientUser[];
}

export function NewProfessionalPostForm({
  isOpen,
  onClose,
  onSuccess,
  topInteractedMembers = [],
}: NewProfessionalPostFormProps) {
  // Form fields
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [targetUsers, setTargetUsers] = useState<"ALL" | "CONNECTED">("ALL");
  const [targetRegion, setTargetRegion] = useState<GeoFilterSelection>({
    type: "ALL",
    name: "All Campuses",
  });
  const [purpose, setPurpose] = useState<"HACKATHON" | "PROJECT" | "COMPETITION" | "MEETUP">(
    "HACKATHON",
  );
  const [expireDate, setExpireDate] = useState("2026-11-20");
  const [eventDate, setEventDate] = useState("");
  const [inviteMode, setInviteMode] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [inviteRequirements, setInviteRequirements] = useState("");
  const [inviteLocation, setInviteLocation] = useState("");

  // Direct recipient invitation state
  const [sendDirectOnly, setSendDirectOnly] = useState(false);
  const [recipientSearchQuery, setRecipientSearchQuery] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientUser | null>(null);
  const [searchedMembers, setSearchedMembers] = useState<RecipientUser[]>([]);

  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  const resetForm = () => {
    setPostTitle("");
    setPostDescription("");
    setTargetUsers("ALL");
    setPurpose("HACKATHON");
    setExpireDate("2026-11-20");
    setEventDate("");
    setInviteMode("ONLINE");
    setInviteRequirements("");
    setInviteLocation("");
    setSendDirectOnly(false);
    setSelectedRecipient(null);
    setRecipientSearchQuery("");
    setSearchedMembers([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  async function handleSearchMembers(q: string) {
    if (!q.trim()) {
      setSearchedMembers([]);
      return;
    }
    try {
      const res = await fetch(`/api/users?query=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) {
          setSearchedMembers(data.users);
        }
      }
    } catch {
      // silent
    }
  }

  async function handlePublishCollaborationPost(e: React.FormEvent) {
    e.preventDefault();
    if (!postTitle.trim() || !postDescription.trim()) return;

    setIsSubmittingPost(true);
    try {
      const inviteType =
        purpose === "HACKATHON"
          ? "HACKATHON"
          : purpose === "PROJECT"
            ? "PROJECT"
            : purpose === "COMPETITION"
              ? "COMPETITION"
              : "MEETUP";

      const newPost: InviteItem = {
        id: `inv-${Date.now()}`,
        name: postTitle.trim(),
        description: postDescription.trim(),
        mode: inviteMode,
        type: inviteType,
        requirements: inviteRequirements.trim() || undefined,
        eventDate: eventDate ? new Date(eventDate).toISOString() : undefined,
        location:
          inviteMode === "OFFLINE" ? inviteLocation.trim() || "Campus Innovation Hub" : undefined,
        expiresAt: expireDate ? new Date(expireDate).toISOString() : undefined,
        isDirectInvite: Boolean(sendDirectOnly && selectedRecipient),
        recipient: selectedRecipient
          ? {
              id: selectedRecipient.id,
              displayName: selectedRecipient.displayName,
              username: selectedRecipient.username,
              avatarUrl: selectedRecipient.avatarUrl,
            }
          : null,
        createdAt: new Date().toISOString(),
        creator: {
          id: "usr-you",
          displayName: "You",
          username: "you",
          role: "STUDENT",
          campus: { name: "S-VYASA Bengaluru" },
        },
      };

      try {
        await fetch("/api/invites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: postTitle.trim(),
            description: postDescription.trim(),
            mode: inviteMode,
            type: inviteType,
            requirements: inviteRequirements.trim() || undefined,
            eventDate: eventDate ? new Date(eventDate).toISOString() : undefined,
            location:
              inviteMode === "OFFLINE"
                ? inviteLocation.trim() || "Campus Innovation Hub"
                : undefined,
            expiresAt: expireDate ? new Date(expireDate).toISOString() : undefined,
            recipientUserId: sendDirectOnly && selectedRecipient ? selectedRecipient.id : undefined,
            isDirectInvite: Boolean(sendDirectOnly && selectedRecipient),
          }),
        });
      } catch {
        // Fallback
      }

      onSuccess(newPost);
      resetForm();
      onClose();
    } finally {
      setIsSubmittingPost(false);
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="New Professional Collaboration Post"
      className="max-w-xl"
    >
      <form onSubmit={handlePublishCollaborationPost} className="space-y-3.5 pt-2 text-xs">
        {/* Audience, Purpose, Mode, Expiry, Event Date */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
              Audience
            </label>
            <select
              value={targetUsers}
              onChange={(e) => setTargetUsers(e.target.value as "ALL" | "CONNECTED")}
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-2 focus:bg-white dark:focus:bg-slate-800"
            >
              <option value="CONNECTED">Connected Only (Standard)</option>
              <option value="ALL">All Network</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
              Opportunity Type
            </label>
            <select
              value={purpose}
              onChange={(e) =>
                setPurpose(e.target.value as "HACKATHON" | "PROJECT" | "COMPETITION" | "MEETUP")
              }
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-2 focus:bg-white dark:focus:bg-slate-800"
            >
              <option value="HACKATHON">Hackathon Team</option>
              <option value="PROJECT">Project Teammate</option>
              <option value="COMPETITION">Competition</option>
              <option value="MEETUP">Meetup</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
              Mode
            </label>
            <select
              value={inviteMode}
              onChange={(e) => setInviteMode(e.target.value as "ONLINE" | "OFFLINE")}
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-2 focus:bg-white dark:focus:bg-slate-800"
            >
              <option value="ONLINE">Online Remote</option>
              <option value="OFFLINE">Offline (In-Person)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
              Expiry Date
            </label>
            <input
              type="date"
              value={expireDate}
              onChange={(e) => setExpireDate(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-1.5 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
              Event Date (Optional)
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full text-xs font-semibold bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-slate-100 rounded-xl p-1.5 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>
        </div>

        {/* ── DIRECT MEMBER INVITATION (Connected or Non-Connected) ── */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Send Only to Selected Member
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Send to a specific connected or non-connected peer directly.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSendDirectOnly(!sendDirectOnly);
                setSelectedRecipient(null);
                setRecipientSearchQuery("");
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sendDirectOnly
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {sendDirectOnly ? "Direct Mode (Active)" : "Broadcast to Network"}
            </button>
          </div>

          {sendDirectOnly && (
            <div className="space-y-2 pt-1">
              {!selectedRecipient ? (
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={recipientSearchQuery}
                      onChange={(e) => {
                        setRecipientSearchQuery(e.target.value);
                        void handleSearchMembers(e.target.value);
                      }}
                      placeholder="Type name to search connected & non-connected members..."
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Before typing: display top interacted connected members */}
                  {!recipientSearchQuery.trim() && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        Top Interacted Connected Members:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {topInteractedMembers.length === 0 ? (
                          <span className="text-[11px] text-slate-400">
                            No recent connection interactions yet.
                          </span>
                        ) : (
                          topInteractedMembers.map((member) => (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => setSelectedRecipient(member)}
                              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-[11px] font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span className="h-4 w-4 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center">
                                {member.displayName[0]}
                              </span>
                              <span>{member.displayName}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* While typing: search results dropdown */}
                  {recipientSearchQuery.trim() && (
                    <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
                      {searchedMembers.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 text-[11px]">
                          No members found.
                        </div>
                      ) : (
                        searchedMembers.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => {
                              setSelectedRecipient(member);
                              setRecipientSearchQuery("");
                            }}
                            className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar name={member.displayName} size="sm" />
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                  {member.displayName}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  @{member.username}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                member.isConnected
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              }`}
                            >
                              {member.isConnected ? "Connected" : "Non-Connected"}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Recipient Card */
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={selectedRecipient.displayName} size="sm" />
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {selectedRecipient.displayName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        @{selectedRecipient.username}
                      </p>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        selectedRecipient.isConnected
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {selectedRecipient.isConnected ? "Connected" : "Non-Connected Member"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRecipient(null)}
                    className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {inviteMode === "OFFLINE" && (
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
              Location / Venue
            </label>
            <input
              type="text"
              value={inviteLocation}
              onChange={(e) => setInviteLocation(e.target.value)}
              placeholder="e.g. Innovation Hub Room 204, Central Campus"
              className="w-full text-xs font-semibold p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800"
            />
          </div>
        )}

        {/* Requirements */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
            Requirements / Tech Stacks Sought (comma-separated)
          </label>
          <input
            type="text"
            value={inviteRequirements}
            onChange={(e) => setInviteRequirements(e.target.value)}
            placeholder="e.g. Next.js, PyTorch, Figma UI, FastApi"
            className="w-full text-xs font-semibold p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800"
          />
        </div>

        {/* Campus Scope / Region with AdvancedSelectList */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
            Campus Scope / Region
          </label>
          <AdvancedSelectList
            currentSelection={targetRegion}
            onSelect={(sel) => setTargetRegion(sel)}
          />
        </div>

        {/* Title */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
            Opportunity Title
          </label>
          <input
            type="text"
            required
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            placeholder="e.g., Looking for Frontend Dev & FastApi Engineer for SIH 2026"
            className="w-full text-xs font-semibold p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
            Description & How to Reach Out
          </label>
          <textarea
            rows={3}
            required
            value={postDescription}
            onChange={(e) => setPostDescription(e.target.value)}
            placeholder="Describe the project goal, expected time commitment, and what you're seeking…"
            className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={handleClose} className="text-xs">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmittingPost || !postTitle.trim() || !postDescription.trim()}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isSubmittingPost ? "Publishing…" : "Publish Opportunity"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
