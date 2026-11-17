"use client";

import React, { useState } from "react";
import {
  Plus,
  UserPlus,
  Shield,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  ExternalLink,
  Globe,
  Lock,
  Settings,
  UserCheck,
  Trash2,
  Layers,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@stunet/ui";
import type { GroupItem } from "./types";

export interface GroupsListProps {
  groups: GroupItem[];
  mobileTab?: "POSTS" | "GROUPS";
  expandedGroupId?: string | null;
  onToggleExpandGroup?: (groupId: string | null) => void;
  onCreateGroupClick: () => void;
  onJoinByCodeClick: () => void;
  onEditSettingsClick: (group: GroupItem) => void;
  onViewRequestsClick: (group: GroupItem) => void;
  onInviteConnectionsClick: (group: GroupItem) => void;
  onDeleteGroupClick: (group: GroupItem) => void;
  onExitGroupClick: (group: GroupItem) => void;
  onRequestJoinClick: (group: GroupItem) => void;
}

export function GroupsList({
  groups,
  mobileTab = "POSTS",
  expandedGroupId: controlledExpandedId,
  onToggleExpandGroup,
  onCreateGroupClick,
  onJoinByCodeClick,
  onEditSettingsClick,
  onViewRequestsClick,
  onInviteConnectionsClick,
  onDeleteGroupClick,
  onExitGroupClick,
  onRequestJoinClick,
}: GroupsListProps) {
  const [internalExpandedId, setInternalExpandedId] = useState<string | null>(null);

  const isControlled = controlledExpandedId !== undefined;
  const currentExpandedId = isControlled ? controlledExpandedId : internalExpandedId;

  const handleToggle = (groupId: string | null) => {
    if (onToggleExpandGroup) {
      onToggleExpandGroup(groupId);
    }
    if (!isControlled) {
      setInternalExpandedId(groupId);
    }
  };

  const ownedGroups = groups.filter((g) => g.isOwner);
  const joinedGroups = groups.filter((g) => g.isMember && !g.isOwner);
  const suggestedGroups = groups.filter((g) => !g.isMember && !g.isOwner);

  return (
    <div
      className={`lg:col-span-5 space-y-6 ${mobileTab === "GROUPS" ? "block" : "hidden lg:block"}`}
    >
      {/* Quick Group Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCreateGroupClick}
          className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Create Group</span>
        </button>

        <button
          type="button"
          onClick={onJoinByCodeClick}
          className="flex-1 py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
        >
          <UserPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span>Join Group by Code</span>
        </button>
      </div>

      {/* ── 1. OWNED GROUPS (ADMIN) ── */}
      {ownedGroups.length > 0 && (
        <Card className="border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden rounded-3xl">
          <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  Owned Groups (Admin Scope)
                </CardTitle>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Groups founded and managed by you
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800 px-2.5 py-0.5 rounded-full">
              {ownedGroups.length} Owned
            </span>
          </CardHeader>

          <CardContent className="p-3 space-y-3">
            {ownedGroups.map((group) => {
              const isExpanded = currentExpandedId === group.id;
              const reqCount = group.pendingRequests?.length || 0;

              return (
                <div
                  key={group.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* Header Summary */}
                  <button
                    type="button"
                    onClick={() => handleToggle(isExpanded ? null : group.id)}
                    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                          {group.name}
                        </p>
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                          #{group.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{group.memberCount} members</span>
                        <span>•</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          Admin: You
                        </span>
                        <span>•</span>
                        <span
                          className={`font-semibold ${
                            group.visibility === "PUBLIC"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-indigo-600 dark:text-indigo-400"
                          }`}
                        >
                          {group.visibility === "PUBLIC" ? "Public Link" : "Request Required"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {reqCount > 0 && (
                        <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full">
                          {reqCount} Requests
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Owner Operations Panel */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs space-y-3.5 bg-slate-50/40 dark:bg-slate-800/40">
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                        {group.purpose}
                      </p>

                      {/* WhatsApp Link Box */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                          <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Official WhatsApp Link</span>
                        </div>
                        <a
                          href={group.whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
                        >
                          <span>Open Chat</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>

                      {/* Privacy Status */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1">
                        <span className="flex items-center gap-1">
                          {group.visibility === "PUBLIC" ? (
                            <>
                              <Globe className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              <span>WhatsApp link is visible without request</span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                              <span>WhatsApp link requires your approval</span>
                            </>
                          )}
                        </span>
                        <span>
                          {group.hideMembersFromNonMembers
                            ? "🔒 Members hidden for non-members"
                            : "👥 Members visible to all"}
                        </span>
                      </div>

                      {/* OWNER CONTROL TOOLBAR */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                        <button
                          type="button"
                          onClick={() => onEditSettingsClick(group)}
                          className="py-1.5 px-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Settings className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                          <span>Settings</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onViewRequestsClick(group)}
                          className="py-1.5 px-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-xl text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <UserCheck className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                          <span>Requests ({reqCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onInviteConnectionsClick(group)}
                          className="py-1.5 px-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                          <UserPlus className="h-3 w-3" />
                          <span>Invite</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteGroupClick(group)}
                          className="py-1.5 px-1 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 rounded-xl text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3 text-rose-500 dark:text-rose-400" />
                          <span>Delete</span>
                        </button>
                      </div>

                      {/* Current Members List Preview */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                          Members ({group.memberCount})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {group.members.map((m) => (
                            <span
                              key={m.id}
                              className="text-[10px] font-semibold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1"
                            >
                              <span>{m.name}</span>
                              {m.role === "ADMIN" && (
                                <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase">
                                  Admin
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── 2. JOINED GROUPS SECTION ── */}
      <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden rounded-3xl bg-white dark:bg-slate-900">
        <CardHeader className="p-3.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Joined Groups ({joinedGroups.length})</span>
          </CardTitle>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
            Active Member
          </span>
        </CardHeader>

        <CardContent className="p-3 space-y-2">
          {joinedGroups.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
              You have not joined any peer groups yet. Explore suggestions below!
            </div>
          ) : (
            joinedGroups.map((group) => {
              const isExpanded = currentExpandedId === group.id;

              return (
                <div
                  key={group.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => handleToggle(isExpanded ? null : group.id)}
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {group.name}
                        </p>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                          #{group.code}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {group.memberCount} members ·{" "}
                        <strong className="text-indigo-600 dark:text-indigo-400">
                          Admin: {group.adminName}
                        </strong>
                      </p>
                    </div>

                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs space-y-3 bg-slate-50/50 dark:bg-slate-800/40">
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                        {group.purpose}
                      </p>

                      {/* WhatsApp Link Box */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                          <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Official WhatsApp Group</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={group.whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
                          >
                            <span>Open Chat</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>

                      {/* Group Admin Visible + Exit Group Option */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] block">
                            Group Admin
                          </span>
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">
                            {group.adminName}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onExitGroupClick(group)}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <LogOut className="h-3 w-3" />
                          <span>Exit Group</span>
                        </button>
                      </div>

                      {/* Members List */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                          Members Roster
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {group.members.map((m) => (
                            <span
                              key={m.id}
                              className="text-[10px] font-semibold bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ── 3. GROUP SUGGESTIONS SECTION ── */}
      <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden rounded-3xl bg-white dark:bg-slate-900">
        <CardHeader className="p-3.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Group Suggestions & Campus Communities</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-3 space-y-3">
          {suggestedGroups.map((sugg) => (
            <div
              key={sugg.id}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-black text-slate-900 dark:text-slate-100">{sugg.name}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                      #{sugg.code}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Admin:{" "}
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {sugg.adminName}
                    </strong>{" "}
                    · {sugg.memberCount} members
                  </p>
                </div>

                {sugg.visibility === "PUBLIC" ? (
                  <a
                    href={sugg.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 shadow-2xs"
                  >
                    <MessageCircle className="h-3 w-3" />
                    <span>Open WhatsApp</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRequestJoinClick(sugg)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer"
                  >
                    <Lock className="h-3 w-3" />
                    <span>Request Link</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                {sugg.purpose}
              </p>

              {sugg.hideMembersFromNonMembers ? (
                <div className="p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>Member roster is hidden from non-members by group admin.</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <span>Members preview:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {sugg.members.map((m) => m.name).join(", ")}
                  </span>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
