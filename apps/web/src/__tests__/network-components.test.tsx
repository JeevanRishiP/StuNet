import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { ProfessionalInvitesList } from "@/components/network/ProfessionalInvitesList";
import { NewProfessionalPostForm } from "@/components/network/NewProfessionalPostForm";
import { ConnectionsList } from "@/components/network/ConnectionsList";
import { GroupsList } from "@/components/network/GroupsList";
import { NetworkNotificationsModal } from "@/components/network/NetworkNotificationsModal";
import { GroupActionModals } from "@/components/network/GroupActionModals";
import {
  CreateGroupModal,
  EditGroupSettingsModal,
  GroupRequestsModal,
  InviteConnectionsModal,
  JoinGroupModal,
  DeleteGroupModal,
  ExitGroupModal,
} from "@/components/network/groups";
import {
  ConnectionsSearchTab,
  ReceivedRequestsTab,
  SentRequestsTab,
  FollowListsTab,
} from "@/components/network/connections";
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

  describe("Sub-component modular rendering: Connections Tabs", () => {
    it("ConnectionsSearchTab renders search input and filtered connections", () => {
      const html = renderToString(
        <ConnectionsSearchTab
          connections={[mockConnection]}
          searchQuery=""
          onChangeSearchQuery={() => {}}
          removingConnId={null}
          onRemoveConnection={async () => {}}
          onClose={() => {}}
        />,
      );
      expect(html).toContain("Alex Smith");
      expect(html).toContain("alexsmith");
      expect(html).toContain("2 weeks ago");
      expect(html).toContain("Remove");
    });

    it("ReceivedRequestsTab renders invitations and action buttons", () => {
      const html = renderToString(
        <ReceivedRequestsTab
          receivedRequests={[mockReceivedRequest]}
          onAcceptRequest={async () => {}}
          onDeclineRequest={async () => {}}
          onClose={() => {}}
        />,
      );
      expect(html).toContain("Invitations");
      expect(html).toContain("Taylor Swift");
      expect(html).toContain("Reject");
      expect(html).toContain("Accept");
    });

    it("SentRequestsTab renders pending and rejected columns", () => {
      const html = renderToString(
        <SentRequestsTab
          sentPendingRequests={[mockSentRequest]}
          sentRejectedRequests={[
            {
              ...mockSentRequest,
              id: "req-rej-1",
              status: "DECLINED",
            },
          ]}
          onCancelSentRequest={async () => {}}
          onClose={() => {}}
        />,
      );
      expect(html).toContain("New Sent Requests");
      expect(html).toContain("Rejected Requests");
      expect(html).toContain("Withdraw");
      expect(html).toContain("Dismiss");
    });

    it("FollowListsTab renders following and followers views", () => {
      const mockFollowPerson = {
        id: "fp-1",
        userId: "user-2",
        name: "Alex Smith",
        username: "alexsmith",
        campus: "Tech Institute",
      };

      const followingHtml = renderToString(
        <FollowListsTab
          type="FOLLOWING"
          list={[mockFollowPerson]}
          onToggleFollow={async () => {}}
          onClose={() => {}}
        />,
      );
      expect(followingHtml).toContain("Alex Smith");
      expect(followingHtml).toContain("Unfollow");

      const followersHtml = renderToString(
        <FollowListsTab
          type="FOLLOWERS"
          list={[mockFollowPerson]}
          followingIdSet={new Set(["user-2"])}
          onToggleFollow={async () => {}}
          onClose={() => {}}
        />,
      );
      expect(followersHtml).toContain("Alex Smith");
      expect(followersHtml).toContain("Following");
    });
  });

  describe("Sub-component modular rendering: Group Modals", () => {
    it("CreateGroupModal renders form with 4-digit code and visibility choices", () => {
      const html = renderToString(
        <CreateGroupModal
          open={true}
          onClose={() => {}}
          code="5555"
          onRefreshCode={() => {}}
          name="Web3 Guild"
          onChangeName={() => {}}
          purpose="Decentralized smart contracts"
          onChangePurpose={() => {}}
          whatsapp="https://chat.whatsapp.com/test"
          onChangeWhatsapp={() => {}}
          visibility="PUBLIC"
          onChangeVisibility={() => {}}
          hideMembers={false}
          onChangeHideMembers={() => {}}
          onSubmit={async () => {}}
        />,
      );
      expect(html).toContain("Create Campus Collaboration Group");
      expect(html).toContain("5555");
      expect(html).toContain("Web3 Guild");
      expect(html).toContain("Public Group (Direct Link)");
    });

    it("EditGroupSettingsModal renders group settings form", () => {
      const html = renderToString(
        <EditGroupSettingsModal
          open={true}
          group={mockGroup}
          onClose={() => {}}
          onChangeGroup={() => {}}
          onSubmit={async () => {}}
        />,
      );
      expect(html).toContain("Edit Settings • Web3 Builders Club");
      expect(html).toContain("4821");
      expect(html).toContain("Save Settings");
    });

    it("GroupRequestsModal renders requests and accept/decline buttons", () => {
      const groupWithReq: GroupItem = {
        ...mockGroup,
        pendingRequests: [
          {
            id: "gjr-1",
            userId: "user-5",
            userName: "Jordan Lee",
            userHeadline: "Frontend Dev",
            purpose: "I want to contribute to Web3 projects.",
            requestedAt: "Yesterday",
          },
        ],
      };

      const html = renderToString(
        <GroupRequestsModal
          open={true}
          group={groupWithReq}
          onClose={() => {}}
          onAccept={async () => {}}
          onDecline={async () => {}}
        />,
      );
      expect(html).toContain("Join Requests • Web3 Builders Club");
      expect(html).toContain("Jordan Lee");
      expect(html).toContain("Decline");
      expect(html).toContain("Accept");
    });

    it("InviteConnectionsModal renders connections list with invite buttons", () => {
      const html = renderToString(
        <InviteConnectionsModal
          open={true}
          group={mockGroup}
          onClose={() => {}}
          connections={[mockConnection]}
          invitedConnectionIds={{}}
          onSendInvite={async () => {}}
        />,
      );
      expect(html).toContain("Invite Connected Peers • Web3 Builders Club");
      expect(html).toContain("Alex Smith");
      expect(html).toContain("Joined");
    });

    it("JoinGroupModal renders join by code or target group details", () => {
      const html = renderToString(
        <JoinGroupModal
          open={true}
          targetGroup={mockGroup}
          joinCode=""
          onChangeJoinCode={() => {}}
          joinPurpose=""
          onChangeJoinPurpose={() => {}}
          onClose={() => {}}
          onSubmit={async () => {}}
        />,
      );
      expect(html).toContain("Join Web3 Builders Club");
      expect(html).toContain("Jane Doe");
      expect(html).toContain("Admin:");
      expect(html).toContain("Submit Request");
    });

    it("DeleteGroupModal renders permanent deletion warning", () => {
      const html = renderToString(
        <DeleteGroupModal
          group={mockGroup}
          isDeleting={false}
          onClose={() => {}}
          onConfirm={async () => {}}
        />,
      );
      expect(html).toContain("Delete Group Permanently");
      expect(html).toContain("This action is permanent and irreversible.");
      expect(html).toContain("Permanently Delete Group");
    });

    it("ExitGroupModal renders exit group confirmation", () => {
      const html = renderToString(
        <ExitGroupModal
          group={mockGroup}
          isExiting={false}
          onClose={() => {}}
          onConfirm={async () => {}}
        />,
      );
      expect(html).toContain("Exit Campus Group");
      expect(html).toContain("Leave group membership");
      expect(html).toContain("Confirm Exit Group");
    });
  });
});
