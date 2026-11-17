import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { ProfessionalInvitesList } from "@/components/network/ProfessionalInvitesList";
import { NewProfessionalPostForm } from "@/components/network/NewProfessionalPostForm";
import { ConnectionsList } from "@/components/network/ConnectionsList";
import { GroupsList } from "@/components/network/GroupsList";
import { NetworkNotificationsModal } from "@/components/network/NetworkNotificationsModal";
import { GroupActionModals } from "@/components/network/GroupActionModals";
import type {
  InviteItem,
  ConnectionItem,
  ConnectionRequestItem,
  GroupItem,
  NetworkNotification,
} from "@/components/network/types";

describe("Network Extracted Components", () => {
  const mockInvite: InviteItem = {
    id: "inv-1",
    name: "Hackathon Teammate Search",
    description: "Looking for a fullstack developer with Next.js experience.",
    mode: "ONLINE",
    type: "HACKATHON",
    requirements: "Experience with React and Tailwind",
    eventDate: "2026-12-01",
    registrationDeadline: "2026-11-28",
    createdAt: new Date().toISOString(),
    creator: {
      id: "user-1",
      displayName: "Jane Doe",
      username: "janedoe",
      avatarUrl: null,
      role: "STUDENT",
      campus: { name: "Engineering Campus" },
    },
  };

  const mockConnection: ConnectionItem = {
    id: "conn-1",
    userId: "user-2",
    name: "Alex Smith",
    username: "alexsmith",
    headline: "CS Sophomore | Open Source Enthusiast",
    avatarUrl: "/avatars/alex.png",
    campus: "Tech Institute",
    connectedSince: "2 weeks ago",
  };

  const mockSentRequest: ConnectionRequestItem = {
    id: "req-1",
    userId: "user-3",
    name: "Sam Wilson",
    username: "samwilson",
    headline: "AI Researcher",
    direction: "sent",
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  const mockReceivedRequest: ConnectionRequestItem = {
    id: "req-2",
    userId: "user-4",
    name: "Taylor Swift",
    username: "tswift",
    headline: "Data Science Major",
    direction: "received",
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  const mockGroup: GroupItem = {
    id: "grp-1",
    code: "4821",
    name: "Web3 Builders Club",
    purpose: "Collaborating on decentralised applications and smart contracts.",
    adminId: "user-1",
    adminName: "Jane Doe",
    whatsappLink: "https://chat.whatsapp.com/test",
    visibility: "PUBLIC",
    hideMembersFromNonMembers: false,
    memberCount: 12,
    members: [
      { id: "user-1", name: "Jane Doe", role: "ADMIN" },
      { id: "user-2", name: "Alex Smith", role: "MEMBER" },
    ],
    isOwner: true,
    isMember: true,
  };

  const mockNotification: NetworkNotification = {
    id: "notif-1",
    category: "CONNECTION",
    type: "CONNECTION_REQUEST",
    title: "New Connection Request",
    message: "Taylor Swift sent you a connection request.",
    timestamp: "5m ago",
    read: false,
    actor: { name: "Taylor Swift", username: "tswift" },
  };

  describe("ProfessionalInvitesList", () => {
    it("renders professional invites with filters and post details", () => {
      const html = renderToString(
        <ProfessionalInvitesList
          invites={[mockInvite]}
          loadingInvites={false}
          postPublishedSuccess={false}
          onOpenNewPostModal={() => {}}
        />,
      );

      expect(html).toContain("Professional Collaboration Posts");
      expect(html).toContain("Hackathon Teammate Search");
      expect(html).toContain("Jane Doe");
      expect(html).toContain("Looking for a fullstack developer");
    });
  });

  describe("NewProfessionalPostForm", () => {
    it("renders modal form with all creation fields", () => {
      const html = renderToString(
        <NewProfessionalPostForm isOpen={true} onClose={() => {}} onSuccess={() => {}} />,
      );

      expect(html).toContain("New Professional Collaboration Post");
      expect(html).toContain("Audience");
      expect(html).toContain("Opportunity Type");
      expect(html).toContain("Competition");
      expect(html).toContain("Meetup");
    });
  });

  describe("ConnectionsList", () => {
    it("renders connections list with tabs, search, and member cards", () => {
      const html = renderToString(
        <ConnectionsList
          isOpen={true}
          onClose={() => {}}
          connections={[mockConnection]}
          followingList={[]}
          followersList={[]}
          followingIdSet={new Set()}
          receivedRequests={[mockReceivedRequest]}
          sentPendingRequests={[mockSentRequest]}
          sentRejectedRequests={[]}
          onRemoveConnection={async () => {}}
          onAcceptRequest={async () => {}}
          onDeclineRequest={async () => {}}
          onCancelSentRequest={async () => {}}
          onToggleFollow={async () => {}}
        />,
      );

      expect(html).toContain("Connections &amp; Requests");
      expect(html).toContain("Alex Smith");
      expect(html).toContain("CS Sophomore | Open Source Enthusiast");
      expect(html).toContain("alexsmith");
    });
  });

  describe("GroupsList", () => {
    it("renders campus groups categorized by ownership and membership", () => {
      const html = renderToString(
        <GroupsList
          groups={[mockGroup]}
          mobileTab="GROUPS"
          onCreateGroupClick={() => {}}
          onJoinByCodeClick={() => {}}
          onEditSettingsClick={() => {}}
          onViewRequestsClick={() => {}}
          onInviteConnectionsClick={() => {}}
          onDeleteGroupClick={() => {}}
          onExitGroupClick={() => {}}
          onRequestJoinClick={() => {}}
        />,
      );

      expect(html).toContain("Create Group");
      expect(html).toContain("Join Group by Code");
      expect(html).toContain("Web3 Builders Club");
      expect(html).toContain("Owned Groups (Admin Scope)");
    });
  });

  describe("NetworkNotificationsModal", () => {
    it("renders notifications list and filter pills", () => {
      const html = renderToString(
        <NetworkNotificationsModal
          isOpen={true}
          onClose={() => {}}
          notifications={[mockNotification]}
          onIgnoreNotification={async () => {}}
          onAcceptConnectionNotification={async () => {}}
          onDeclineJoinRequest={async () => {}}
          onAcceptJoinRequest={async () => {}}
          onDeclineGroupInvite={async () => {}}
          onAcceptGroupInvite={async () => {}}
          onMarkAllAsRead={async () => {}}
        />,
      );

      expect(html).toContain("Network &amp; Group Notifications");
      expect(html).toContain("New Connection Request");
      expect(html).toContain("Taylor Swift sent you a connection request.");
    });
  });

  describe("GroupActionModals", () => {
    it("renders modals container without runtime errors", () => {
      const html = renderToString(
        <GroupActionModals
          showCreateGroupModal={true}
          onCloseCreateGroup={() => {}}
          createGroupCode="1234"
          onRefreshGroupCode={() => {}}
          createGroupName="AI Research Group"
          onChangeGroupName={() => {}}
          createGroupPurpose="Studying machine learning models"
          onChangeGroupPurpose={() => {}}
          createGroupWhatsapp=""
          onChangeGroupWhatsapp={() => {}}
          createGroupVisibility="PUBLIC"
          onChangeGroupVisibility={() => {}}
          createGroupHideMembers={false}
          onChangeGroupHideMembers={() => {}}
          onSubmitCreateGroup={async () => {}}
          showEditGroupSettingsModal={false}
          editingGroup={null}
          onChangeEditingGroup={() => {}}
          onCloseEditGroupSettings={() => {}}
          onSubmitSaveGroupSettings={async () => {}}
          showGroupRequestsModal={false}
          activeRequestsGroup={null}
          onCloseGroupRequests={() => {}}
          onAcceptJoinRequest={async () => {}}
          onDeclineJoinRequest={async () => {}}
          showInviteConnectionsModal={false}
          activeInviteGroup={null}
          onCloseInviteConnections={() => {}}
          connections={[mockConnection]}
          invitedConnectionIds={{}}
          onSendGroupInvite={async () => {}}
          showJoinGroupModal={false}
          targetJoinGroup={null}
          joinCodeInput=""
          onChangeJoinCodeInput={() => {}}
          joinPurposeInput=""
          onChangeJoinPurposeInput={() => {}}
          onCloseJoinGroup={() => {}}
          onSubmitJoinRequest={async () => {}}
          groupToDelete={null}
          isDeletingGroup={false}
          onCloseDeleteGroup={() => {}}
          onConfirmDeleteGroup={async () => {}}
          groupToExit={null}
          isExitingGroup={false}
          onCloseExitGroup={() => {}}
          onConfirmExitGroup={async () => {}}
        />,
      );

      expect(html).toContain("Create Campus Collaboration Group");
      expect(html).toContain("1234");
      expect(html).toContain("AI Research Group");
    });
  });
});
