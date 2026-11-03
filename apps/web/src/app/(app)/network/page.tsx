"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Check,
  Search,
  Plus,
  Send,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Layers,
  Sparkles,
} from "lucide-react";
import { Avatar, Button, Card, CardContent, CardHeader, CardTitle, Modal } from "@stunet/ui";
import AdvancedSelectList, { GeoFilterSelection } from "@/components/AdvancedSelectList";

interface ConnectionItem {
  id: string;
  name: string;
  username: string;
  headline?: string;
  avatarUrl?: string;
  campus?: string;
  connectedSince?: string;
}

interface GroupItem {
  id: string;
  code: string;
  name: string;
  purpose: string;
  adminName: string;
  whatsappLink: string;
  memberCount: number;
  members: Array<{ name: string; avatarUrl?: string }>;
  isMember: boolean;
}

export default function NetworkPage() {
  // Mobile / Tablet Tab Toggle: "CONNECTIONS" | "GROUPS"
  const [mobileTab, setMobileTab] = useState<"CONNECTIONS" | "GROUPS">("CONNECTIONS");

  // Search connected users
  const [searchQuery, setSearchQuery] = useState("");

  // New Professional Post Form State (Left Column)
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [targetUsers, setTargetUsers] = useState<"ALL" | "CONNECTED">("ALL");
  const [targetRegion, setTargetRegion] = useState<GeoFilterSelection>({
    type: "ALL",
    name: "All Campuses",
  });
  const [purpose, setPurpose] = useState<"GENERAL" | "HACKATHON" | "PROJECT">("HACKATHON");
  const [expireDate, setExpireDate] = useState("2026-11-20");
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postPublishedSuccess, setPostPublishedSuccess] = useState(false);

  // Group Creation State (Right Column)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupPurpose, setGroupPurpose] = useState("");
  const [groupWhatsappLink, setGroupWhatsappLink] = useState("");

  // Join Group State
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [joinGroupId, setJoinGroupId] = useState("");
  const [joinPurpose, setJoinPurpose] = useState("");
  const [_joinRequestedGroups, setJoinRequestedGroups] = useState<string[]>([]);

  // Expanded Groups
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>("grp-1");

  // Seeded Connections List
  const [connections] = useState<ConnectionItem[]>([
    {
      id: "alice-1",
      name: "Alice Nair",
      username: "alice_dev",
      headline: "President • NSC | Full-Stack Builder",
      campus: "S-VYASA Bengaluru",
      connectedSince: "Sep 2026",
    },
    {
      id: "bob-1",
      name: "Bob Krishnan",
      username: "bob_designs",
      headline: "Design Lead · Gen AI Club",
      campus: "S-VYASA Bengaluru",
      connectedSince: "Oct 2026",
    },
    {
      id: "dave-1",
      name: "Dave Patel",
      username: "dave_ml",
      headline: "AI Researcher · Kaggle Master",
      campus: "Whitefield Tech Hub",
      connectedSince: "Oct 2026",
    },
    {
      id: "eve-1",
      name: "Eve Menon",
      username: "eve_pending",
      headline: "Competitive Programmer · Codeforces Specialist",
      campus: "Central Campus Hyderabad",
      connectedSince: "Nov 2026",
    },
  ]);

  // Seeded Groups List
  const [groups, setGroups] = useState<GroupItem[]>([
    {
      id: "grp-1",
      code: "AI-HACK-BLR",
      name: "Smart India Hackathon AI Squad",
      purpose: "Preparing full-stack and ML architectures for national hackathon finalists.",
      adminName: "Alice Nair",
      whatsappLink: "https://chat.whatsapp.com/sample-hackathon-group",
      memberCount: 8,
      members: [{ name: "Alice Nair" }, { name: "Bob Krishnan" }, { name: "Dave Patel" }],
      isMember: true,
    },
    {
      id: "grp-2",
      code: "STARTUP-FOUNDERS",
      name: "NIAT Venture Founders Circle",
      purpose:
        "Peer discussions on early-stage seed fundraising, customer discovery, and pitch decks.",
      adminName: "Jeevan Rishi P",
      whatsappLink: "https://chat.whatsapp.com/sample-startup-group",
      memberCount: 12,
      members: [{ name: "Jeevan Rishi P" }, { name: "Alice Nair" }],
      isMember: true,
    },
  ]);

  const groupSuggestions = [
    {
      id: "grp-sugg-1",
      name: "Open Source Rust Guild",
      description: "Building systems tooling, web servers, and high performance network daemons.",
      connectedMembers: ["Dave Patel", "Alice Nair"],
    },
    {
      id: "grp-sugg-2",
      name: "Bengaluru Competitive Coders",
      description: "Weekly problem discussion for LeetCode contests and Codeforces rounds.",
      connectedMembers: ["Bob Krishnan"],
    },
  ];

  async function handlePublishCollaborationPost(e: React.FormEvent) {
    e.preventDefault();
    if (!postTitle.trim() || !postDescription.trim()) return;

    setIsSubmittingPost(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: `[COLLABORATION - ${purpose}]\nTitle: ${postTitle}\nExpires: ${expireDate}\n\n${postDescription}`,
          visibility: targetUsers === "ALL" ? "PUBLIC" : "CONNECTIONS",
          category: purpose,
        }),
      });

      if (res.ok) {
        setPostPublishedSuccess(true);
        setPostTitle("");
        setPostDescription("");
        setTimeout(() => setPostPublishedSuccess(false), 2500);
      }
    } finally {
      setIsSubmittingPost(false);
    }
  }

  function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim() || !groupPurpose.trim()) return;

    const newGroup: GroupItem = {
      id: `grp-${Date.now()}`,
      code: groupName.substring(0, 6).toUpperCase().replace(/\s+/g, "-"),
      name: groupName,
      purpose: groupPurpose,
      adminName: "You",
      whatsappLink: groupWhatsappLink || "https://chat.whatsapp.com/sample",
      memberCount: 1,
      members: [{ name: "You" }],
      isMember: true,
    };

    setGroups((prev) => [newGroup, ...prev]);
    setGroupName("");
    setGroupPurpose("");
    setGroupWhatsappLink("");
    setShowCreateGroupModal(false);
  }

  function handleJoinRequest(groupId: string) {
    setJoinRequestedGroups((prev) => [...prev, groupId]);
    setShowJoinGroupModal(false);
    setJoinGroupId("");
    setJoinPurpose("");
    alert("Join request submitted to the group administrator.");
  }

  const filteredConnections = connections.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.headline?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              My Network & Groups
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Build professional connections, publish collaboration calls, and collaborate in peer
            groups.
          </p>
        </div>

        {/* Mobile / Tablet Segmented Toggle (< 1024px) */}
        <div className="lg:hidden w-full sm:w-auto flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMobileTab("CONNECTIONS")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mobileTab === "CONNECTIONS"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Connections ({connections.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("GROUPS")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mobileTab === "GROUPS"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Groups ({groups.length})
          </button>
        </div>
      </div>

      {/* ── DESKTOP 60/40 SPLIT (OR MOBILE ACCORDION) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── LEFT COLUMN (60% on Desktop / cols-7): CONNECTIONS & PROFESSIONAL POST FORM ── */}
        <div
          className={`lg:col-span-7 space-y-6 ${
            mobileTab === "CONNECTIONS" ? "block" : "hidden lg:block"
          }`}
        >
          {/* Form: New Professional / Collaboration Post */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/70 p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                  <span>New Professional Collaboration Post</span>
                </CardTitle>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  Locked to Professional
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {postPublishedSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>Professional post published to your target audience!</span>
                </div>
              )}

              <form onSubmit={handlePublishCollaborationPost} className="space-y-3">
                {/* Target Users & Purpose */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Target Users
                    </label>
                    <select
                      value={targetUsers}
                      onChange={(e) => setTargetUsers(e.target.value as "ALL" | "CONNECTED")}
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white"
                    >
                      <option value="ALL">All Users</option>
                      <option value="CONNECTED">Connected Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Purpose
                    </label>
                    <select
                      value={purpose}
                      onChange={(e) =>
                        setPurpose(e.target.value as "GENERAL" | "HACKATHON" | "PROJECT")
                      }
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white"
                    >
                      <option value="HACKATHON">Hackathon / Competition</option>
                      <option value="PROJECT">Project Teammate</option>
                      <option value="GENERAL">General Professional</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Expire Date
                    </label>
                    <input
                      type="date"
                      value={expireDate}
                      onChange={(e) => setExpireDate(e.target.value)}
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Target Region with AdvancedSelectList */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Target Region
                  </label>
                  <AdvancedSelectList
                    currentSelection={targetRegion}
                    onSelect={(sel) => setTargetRegion(sel)}
                  />
                </div>

                {/* Title */}
                <div>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="Opportunity Title (e.g., Looking for Frontend Dev for SIH 2026)"
                    className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <textarea
                    rows={3}
                    value={postDescription}
                    onChange={(e) => setPostDescription(e.target.value)}
                    placeholder="Describe the opportunity, required tech stack, commitment, and how to reach out…"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmittingPost || !postTitle.trim() || !postDescription.trim()}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                  >
                    <Send className="h-3 w-3" />
                    <span>{isSubmittingPost ? "Publishing…" : "Publish Opportunity"}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Connections Directory */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  Connections Directory ({connections.length} Connected)
                </h3>
              </div>

              {/* Search connected users */}
              <div className="relative w-full sm:w-56">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search connected users…"
                  className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none"
                />
              </div>
            </CardHeader>

            <CardContent className="p-2 divide-y divide-slate-100">
              {filteredConnections.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No connected students found matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                filteredConnections.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl transition-colors"
                  >
                    <Link
                      href={`/u/${user.username}`}
                      className="flex items-center gap-3 min-w-0 flex-1 group"
                    >
                      <Avatar name={user.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate">
                          {user.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">@{user.username}</p>
                        {user.headline && (
                          <p className="text-[10px] text-indigo-600 font-medium truncate mt-0.5">
                            {user.headline}
                          </p>
                        )}
                      </div>
                    </Link>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block">
                        Connected {user.connectedSince}
                      </span>
                      <Link
                        href={`/u/${user.username}`}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline inline-block mt-0.5"
                      >
                        Profile →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN (40% on Desktop / cols-5): GROUPS (Create, Join, Suggestions, List) ── */}
        <div
          className={`lg:col-span-5 space-y-6 ${
            mobileTab === "GROUPS" ? "block" : "hidden lg:block"
          }`}
        >
          {/* Quick Group Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateGroupModal(true)}
              className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Group</span>
            </button>

            <button
              type="button"
              onClick={() => setShowJoinGroupModal(true)}
              className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
            >
              <UserPlus className="h-4 w-4 text-indigo-600" />
              <span>Join Group</span>
            </button>
          </div>

          {/* Group Suggestions */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Group Suggestions</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-3 space-y-3">
              {groupSuggestions.map((sugg) => (
                <div
                  key={sugg.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900">{sugg.name}</p>
                    <button
                      type="button"
                      onClick={() => handleJoinRequest(sugg.id)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Request Join
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600">{sugg.description}</p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span>Connected members:</span>
                    <span className="font-semibold text-slate-700">
                      {sugg.connectedMembers.join(", ")}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Joined Groups List */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                <span>Joined Groups ({groups.length})</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-3 space-y-2">
              {groups.map((group) => {
                const isExpanded = expandedGroupId === group.id;

                return (
                  <div
                    key={group.id}
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all shadow-2xs"
                  >
                    {/* Collapsible Header */}
                    <button
                      type="button"
                      onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                      className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{group.name}</p>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            {group.code}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {group.memberCount} approved members · Admin: {group.adminName}
                        </p>
                      </div>

                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-100 text-xs space-y-3 bg-slate-50/50">
                        <p className="text-slate-700 leading-relaxed text-[11px]">
                          {group.purpose}
                        </p>

                        {/* WhatsApp Link visible to approved members */}
                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                          <div className="flex items-center gap-2 text-emerald-800 font-bold text-[11px]">
                            <MessageCircle className="h-4 w-4 text-emerald-600" />
                            <span>Official WhatsApp Group</span>
                          </div>
                          <a
                            href={group.whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            <span>Open Chat</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>

                        {/* Members list preview */}
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Members Roster
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {group.members.map((m, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700"
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
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: Create Group */}
      <Modal
        open={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        title="Create Campus Collaboration Group"
        className="max-w-md"
      >
        <form onSubmit={handleCreateGroup} className="space-y-3 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Group Name</label>
            <input
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Bengaluru AI Study Circle"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Details and Purpose
            </label>
            <textarea
              rows={3}
              required
              value={groupPurpose}
              onChange={(e) => setGroupPurpose(e.target.value)}
              placeholder="State what this group is for and what members will collaborate on…"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Official WhatsApp Group Link
            </label>
            <input
              type="url"
              value={groupWhatsappLink}
              onChange={(e) => setGroupWhatsappLink(e.target.value)}
              placeholder="https://chat.whatsapp.com/…"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Only approved members will be able to view and click this WhatsApp link.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCreateGroupModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              Create Group
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Join Group */}
      <Modal
        open={showJoinGroupModal}
        onClose={() => setShowJoinGroupModal(false)}
        title="Join a Group"
        className="max-w-md"
      >
        <div className="space-y-4 pt-2 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Enter Group ID / Code</label>
            <input
              type="text"
              value={joinGroupId}
              onChange={(e) => setJoinGroupId(e.target.value)}
              placeholder="e.g., AI-HACK-BLR"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Purpose & Intro (Why do you want to join?)
            </label>
            <textarea
              rows={3}
              value={joinPurpose}
              onChange={(e) => setJoinPurpose(e.target.value)}
              placeholder="Tell the group admin how you plan to contribute…"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="ghost"
              onClick={() => setShowJoinGroupModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleJoinRequest(joinGroupId || "NEW-REQUEST")}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
