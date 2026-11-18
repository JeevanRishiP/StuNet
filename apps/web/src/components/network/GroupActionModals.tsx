"use client";

import React from "react";
import type { GroupItem, GroupJoinRequestItem, ConnectionItem } from "./types";
import {
  CreateGroupModal,
  EditGroupSettingsModal,
  GroupRequestsModal,
  InviteConnectionsModal,
  JoinGroupModal,
  DeleteGroupModal,
  ExitGroupModal,
} from "./groups";

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
      <CreateGroupModal
        open={showCreateGroupModal}
        onClose={onCloseCreateGroup}
        code={createGroupCode}
        onRefreshCode={onRefreshGroupCode}
        name={createGroupName}
        onChangeName={onChangeGroupName}
        purpose={createGroupPurpose}
        onChangePurpose={onChangeGroupPurpose}
        whatsapp={createGroupWhatsapp}
        onChangeWhatsapp={onChangeGroupWhatsapp}
        visibility={createGroupVisibility}
        onChangeVisibility={onChangeGroupVisibility}
        hideMembers={createGroupHideMembers}
        onChangeHideMembers={onChangeGroupHideMembers}
        onSubmit={onSubmitCreateGroup}
      />

      {/* ── MODAL 5: EDIT GROUP SETTINGS ── */}
      <EditGroupSettingsModal
        open={showEditGroupSettingsModal}
        group={editingGroup}
        onClose={onCloseEditGroupSettings}
        onChangeGroup={onChangeEditingGroup}
        onSubmit={onSubmitSaveGroupSettings}
      />

      {/* ── MODAL 6: VIEW JOIN REQUESTS ── */}
      <GroupRequestsModal
        open={showGroupRequestsModal}
        group={activeRequestsGroup}
        onClose={onCloseGroupRequests}
        onAccept={onAcceptJoinRequest}
        onDecline={onDeclineJoinRequest}
      />

      {/* ── MODAL 7: INVITE CONNECTED MEMBERS TO GROUP ── */}
      <InviteConnectionsModal
        open={showInviteConnectionsModal}
        group={activeInviteGroup}
        onClose={onCloseInviteConnections}
        connections={connections}
        invitedConnectionIds={invitedConnectionIds}
        onSendInvite={onSendGroupInvite}
      />

      {/* ── MODAL 8: JOIN GROUP (BY CODE OR FROM SUGGESTION) ── */}
      <JoinGroupModal
        open={showJoinGroupModal}
        targetGroup={targetJoinGroup}
        joinCode={joinCodeInput}
        onChangeJoinCode={onChangeJoinCodeInput}
        joinPurpose={joinPurposeInput}
        onChangeJoinPurpose={onChangeJoinPurposeInput}
        onClose={onCloseJoinGroup}
        onSubmit={onSubmitJoinRequest}
      />

      {/* ── MODAL 9: DELETE GROUP CONFIRMATION ── */}
      <DeleteGroupModal
        group={groupToDelete}
        isDeleting={isDeletingGroup}
        onClose={onCloseDeleteGroup}
        onConfirm={onConfirmDeleteGroup}
      />

      {/* ── MODAL 10: EXIT GROUP CONFIRMATION ── */}
      <ExitGroupModal
        group={groupToExit}
        isExiting={isExitingGroup}
        onClose={onCloseExitGroup}
        onConfirm={onConfirmExitGroup}
      />
    </>
  );
}

export * from "./groups";
