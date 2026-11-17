"use client";

import React from "react";
import { Shield, RefreshCw, AlertTriangle, LogOut } from "lucide-react";
import { Avatar, Button, Modal } from "@stunet/ui";
import type { GroupItem, GroupJoinRequestItem, ConnectionItem } from "./types";

export interface GroupActionModalsProps {
  // Modal 4: Create Group
  showCreateGroupModal: boolean;
  onCloseCreateGroup: () => void;
  createGroupCode: string;
  onRefreshGroupCode: () => void;
  createGroupName: string;
  onChangeGroupName: (val: string) => void;
  createGroupPurpose: string;
  onChangeGroupPurpose: (val: string) => void;
  createGroupWhatsapp: string;
  onChangeGroupWhatsapp: (val: string) => void;
  createGroupVisibility: "PUBLIC" | "REQUEST_REQUIRED";
  onChangeGroupVisibility: (val: "PUBLIC" | "REQUEST_REQUIRED") => void;
  createGroupHideMembers: boolean;
  onChangeGroupHideMembers: (val: boolean) => void;
  onSubmitCreateGroup: (e: React.FormEvent) => Promise<void>;

  // Modal 5: Edit Settings
  showEditGroupSettingsModal: boolean;
  editingGroup: GroupItem | null;
  onChangeEditingGroup: (group: GroupItem | null) => void;
  onCloseEditGroupSettings: () => void;
  onSubmitSaveGroupSettings: (e: React.FormEvent) => Promise<void>;

  // Modal 6: View Requests
  showGroupRequestsModal: boolean;
  activeRequestsGroup: GroupItem | null;
  onCloseGroupRequests: () => void;
  onAcceptJoinRequest: (groupId: string, req: GroupJoinRequestItem) => Promise<void>;
  onDeclineJoinRequest: (groupId: string, reqId: string) => Promise<void>;

  // Modal 7: Invite Connections
  showInviteConnectionsModal: boolean;
  activeInviteGroup: GroupItem | null;
  onCloseInviteConnections: () => void;
  connections: ConnectionItem[];
  invitedConnectionIds: Record<string, string[]>;
  onSendGroupInvite: (group: GroupItem, member: ConnectionItem) => Promise<void>;

  // Modal 8: Join Group
  showJoinGroupModal: boolean;
  targetJoinGroup: GroupItem | null;
  joinCodeInput: string;
  onChangeJoinCodeInput: (val: string) => void;
  joinPurposeInput: string;
  onChangeJoinPurposeInput: (val: string) => void;
  onCloseJoinGroup: () => void;
  onSubmitJoinRequest: (e: React.FormEvent) => Promise<void>;

  // Modal 9: Delete Group
  groupToDelete: GroupItem | null;
  isDeletingGroup: boolean;
  onCloseDeleteGroup: () => void;
  onConfirmDeleteGroup: () => Promise<void>;

  // Modal 10: Exit Group
  groupToExit: GroupItem | null;
  isExitingGroup: boolean;
  onCloseExitGroup: () => void;
  onConfirmExitGroup: () => Promise<void>;
}

export function GroupActionModals({
  showCreateGroupModal,
  onCloseCreateGroup,
  createGroupCode,
  onRefreshGroupCode,
  createGroupName,
  onChangeGroupName,
  createGroupPurpose,
  onChangeGroupPurpose,
  createGroupWhatsapp,
  onChangeGroupWhatsapp,
  createGroupVisibility,
  onChangeGroupVisibility,
  createGroupHideMembers,
  onChangeGroupHideMembers,
  onSubmitCreateGroup,
  showEditGroupSettingsModal,
  editingGroup,
  onChangeEditingGroup,
  onCloseEditGroupSettings,
  onSubmitSaveGroupSettings,
  showGroupRequestsModal,
  activeRequestsGroup,
  onCloseGroupRequests,
  onAcceptJoinRequest,
  onDeclineJoinRequest,
  showInviteConnectionsModal,
  activeInviteGroup,
  onCloseInviteConnections,
  connections,
  invitedConnectionIds,
  onSendGroupInvite,
  showJoinGroupModal,
  targetJoinGroup,
  joinCodeInput,
  onChangeJoinCodeInput,
  joinPurposeInput,
  onChangeJoinPurposeInput,
  onCloseJoinGroup,
  onSubmitJoinRequest,
  groupToDelete,
  isDeletingGroup,
  onCloseDeleteGroup,
  onConfirmDeleteGroup,
  groupToExit,
  isExitingGroup,
  onCloseExitGroup,
  onConfirmExitGroup,
}: GroupActionModalsProps) {
  return (
    <>
      {/* ── MODAL 4: CREATE GROUP FORM ── */}
      <Modal
        open={showCreateGroupModal}
        onClose={onCloseCreateGroup}
        title="Create Campus Collaboration Group"
        className="max-w-md"
      >
        <form onSubmit={onSubmitCreateGroup} className="space-y-3.5 pt-2 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Group ID (Auto-Generated 4-Digit ID)
            </label>
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono font-black text-sm text-indigo-700 dark:text-indigo-400 tracking-wider flex-1 border border-slate-200 dark:border-slate-700">
                #{createGroupCode}
              </div>
              <button
                type="button"
                onClick={onRefreshGroupCode}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Generate new 4-digit ID"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              A 4-digit numeric ID assigned to your group for quick campus searches.
            </p>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Group Name
            </label>
            <input
              type="text"
              required
              value={createGroupName}
              onChange={(e) => onChangeGroupName(e.target.value)}
              placeholder="e.g., Autonomous AI & Agents Guild"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Purpose & Description
            </label>
            <textarea
              rows={3}
              required
              value={createGroupPurpose}
              onChange={(e) => onChangeGroupPurpose(e.target.value)}
              placeholder="State what this group is for and how members will collaborate…"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800 resize-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Official WhatsApp Group Link
            </label>
            <input
              type="url"
              required
              value={createGroupWhatsapp}
              onChange={(e) => onChangeGroupWhatsapp(e.target.value)}
              placeholder="https://chat.whatsapp.com/…"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Group Type & WhatsApp Link Access
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="radio"
                  name="group-visibility"
                  checked={createGroupVisibility === "PUBLIC"}
                  onChange={() => onChangeGroupVisibility("PUBLIC")}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    Public Group (Direct Link)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    The WhatsApp group link will be visible directly to everyone without any request
                    required.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="radio"
                  name="group-visibility"
                  checked={createGroupVisibility === "REQUEST_REQUIRED"}
                  onChange={() => onChangeGroupVisibility("REQUEST_REQUIRED")}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    Publicly Listed (Request Required)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Publicly listed in group directory, but WhatsApp link is hidden until the group
                    admin approves a join request.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createGroupHideMembers}
                onChange={(e) => onChangeGroupHideMembers(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Hide group members from showing for non-members
              </span>
            </label>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 pl-6">
              Non-members who are just viewing group details will only see the group admin, name,
              and purpose.
            </p>
          </div>

          <div className="p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[10px] text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Group admin (You) will always be visible to everyone.</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={onCloseCreateGroup} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
            >
              Create Group
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 5: EDIT GROUP SETTINGS ── */}
      {editingGroup && (
        <Modal
          open={showEditGroupSettingsModal}
          onClose={onCloseEditGroupSettings}
          title={`Edit Settings • ${editingGroup.name}`}
          className="max-w-md"
        >
          <form onSubmit={onSubmitSaveGroupSettings} className="space-y-3 pt-2 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Group ID
              </label>
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono font-bold text-slate-700 dark:text-slate-300">
                #{editingGroup.code}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Group Name
              </label>
              <input
                type="text"
                required
                value={editingGroup.name}
                onChange={(e) => onChangeEditingGroup({ ...editingGroup, name: e.target.value })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Purpose
              </label>
              <textarea
                rows={2}
                required
                value={editingGroup.purpose}
                onChange={(e) => onChangeEditingGroup({ ...editingGroup, purpose: e.target.value })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 resize-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Official WhatsApp Group Link
              </label>
              <input
                type="url"
                required
                value={editingGroup.whatsappLink}
                onChange={(e) =>
                  onChangeEditingGroup({ ...editingGroup, whatsappLink: e.target.value })
                }
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                WhatsApp Link Privacy
              </label>
              <select
                value={editingGroup.visibility}
                onChange={(e) =>
                  onChangeEditingGroup({
                    ...editingGroup,
                    visibility: e.target.value as "PUBLIC" | "REQUEST_REQUIRED",
                  })
                }
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-bold"
              >
                <option value="PUBLIC">Public Group (Direct WhatsApp Link)</option>
                <option value="REQUEST_REQUIRED">
                  Publicly Listed (Request Required for Link)
                </option>
              </select>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingGroup.hideMembersFromNonMembers}
                  onChange={(e) =>
                    onChangeEditingGroup({
                      ...editingGroup,
                      hideMembersFromNonMembers: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Hide members list from non-members
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={onCloseEditGroupSettings}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
              >
                Save Settings
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 6: VIEW JOIN REQUESTS ── */}
      {activeRequestsGroup && (
        <Modal
          open={showGroupRequestsModal}
          onClose={onCloseGroupRequests}
          title={`Join Requests • ${activeRequestsGroup.name}`}
          className="max-w-md"
        >
          <div className="space-y-3 pt-2 text-xs">
            {!activeRequestsGroup.pendingRequests ||
            activeRequestsGroup.pendingRequests.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No pending join requests for this group.
              </div>
            ) : (
              activeRequestsGroup.pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 space-y-2 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{req.userName}</p>
                      {req.userHeadline && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {req.userHeadline}
                        </p>
                      )}
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                        Requested: {req.requestedAt}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onDeclineJoinRequest(activeRequestsGroup.id, req.id)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => onAcceptJoinRequest(activeRequestsGroup.id, req)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-2xs cursor-pointer"
                      >
                        Accept
                      </button>
                    </div>
                  </div>

                  {req.purpose && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                      &ldquo;{req.purpose}&rdquo;
                    </p>
                  )}
                </div>
              ))
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" onClick={onCloseGroupRequests} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 7: INVITE CONNECTED MEMBERS TO GROUP ── */}
      {activeInviteGroup && (
        <Modal
          open={showInviteConnectionsModal}
          onClose={onCloseInviteConnections}
          title={`Invite Connected Peers • ${activeInviteGroup.name}`}
          className="max-w-md"
        >
          <div className="space-y-3 pt-2 text-xs">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              You can invite peers who are connected with you on StuNet to join this group.
            </p>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {connections.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  You don&apos;t have any connected peers yet. Connect with students to invite them
                  to this group.
                </div>
              ) : (
                connections.map((conn) => {
                  const alreadyMember = activeInviteGroup.members.some(
                    (m) => m.name === conn.name || (conn.userId && m.id === conn.userId),
                  );
                  const invitedList = invitedConnectionIds[activeInviteGroup.id] || [];
                  const isInvited =
                    invitedList.includes(conn.id) ||
                    (conn.userId ? invitedList.includes(conn.userId) : false);

                  return (
                    <div
                      key={conn.id}
                      className="py-2.5 px-2 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={conn.name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {conn.name}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                            @{conn.username}
                          </p>
                        </div>
                      </div>

                      {alreadyMember ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Joined
                        </span>
                      ) : isInvited ? (
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                          Invited
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => onSendGroupInvite(activeInviteGroup, conn)}
                          className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded-lg cursor-pointer"
                        >
                          Send Invite
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" onClick={onCloseInviteConnections} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 8: JOIN GROUP (BY CODE OR FROM SUGGESTION) ── */}
      <Modal
        open={showJoinGroupModal}
        onClose={onCloseJoinGroup}
        title={targetJoinGroup ? `Join ${targetJoinGroup.name}` : "Join Group by 4-Digit Code"}
        className="max-w-md"
      >
        <form onSubmit={onSubmitJoinRequest} className="space-y-3.5 pt-2 text-xs">
          {!targetJoinGroup && (
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Enter 4-Digit Group ID
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={joinCodeInput}
                onChange={(e) => onChangeJoinCodeInput(e.target.value)}
                placeholder="e.g., 4218 or 1042"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800 font-mono font-bold text-sm tracking-wider"
              />
            </div>
          )}

          {targetJoinGroup && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 dark:text-slate-100">
                  {targetJoinGroup.name}
                </span>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                  Admin: {targetJoinGroup.adminName}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {targetJoinGroup.purpose}
              </p>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Introduction & Purpose of Joining
            </label>
            <textarea
              rows={3}
              required
              value={joinPurposeInput}
              onChange={(e) => onChangeJoinPurposeInput(e.target.value)}
              placeholder="Tell the group admin about your background and how you plan to participate…"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={onCloseJoinGroup} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
            >
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 9: DELETE GROUP CONFIRMATION ── */}
      {groupToDelete && (
        <Modal
          open={Boolean(groupToDelete)}
          onClose={onCloseDeleteGroup}
          title="Delete Group Permanently"
          className="max-w-md"
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-900 dark:text-rose-200">
                  This action is permanent and irreversible.
                </p>
                <p className="text-rose-700 dark:text-rose-300 text-[11px] leading-relaxed">
                  Are you sure you want to delete{" "}
                  <strong className="text-rose-900 dark:text-rose-100">{groupToDelete.name}</strong>{" "}
                  (#
                  {groupToDelete.code})? All group memberships, records, and join requests will be
                  erased from the database.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={onCloseDeleteGroup}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isDeletingGroup}
                onClick={onConfirmDeleteGroup}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                {isDeletingGroup ? "Deleting…" : "Permanently Delete Group"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 10: EXIT GROUP CONFIRMATION ── */}
      {groupToExit && (
        <Modal
          open={Boolean(groupToExit)}
          onClose={onCloseExitGroup}
          title="Exit Campus Group"
          className="max-w-md"
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
              <LogOut className="h-5 w-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  Leave group membership
                </p>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Are you sure you want to leave{" "}
                  <strong className="text-slate-900 dark:text-slate-100">{groupToExit.name}</strong>{" "}
                  (#
                  {groupToExit.code})? You will lose access to the group WhatsApp chat link and
                  member roster.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={onCloseExitGroup} className="text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isExitingGroup}
                onClick={onConfirmExitGroup}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                {isExitingGroup ? "Exiting…" : "Confirm Exit Group"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
