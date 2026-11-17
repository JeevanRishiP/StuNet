"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, UserCheck, Inbox, Send, Plus, Bell } from "lucide-react";
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
  GroupJoinRequestItem,
  GroupItem,
  NetworkNotification,
} from "@/components/network/types";

export default function NetworkPage() {
  // Mobile / Tablet Tab Toggle: "POSTS" | "GROUPS"
  const [mobileTab, setMobileTab] = useState<"POSTS" | "GROUPS">("POSTS");

  // ── MODALS STATE ──
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [connectionsModalTab, setConnectionsModalTab] = useState<
    "ALL" | "FOLLOWING" | "FOLLOWERS" | "RECEIVED" | "SENT"
  >("ALL");
  const [followingList, setFollowingList] = useState<
    Array<{
      id: string;
      userId: string;
      name: string;
      username: string;
      headline?: string;
      avatarUrl?: string;
      campus?: string;
    }>
  >([]);
  const [followersList, setFollowersList] = useState<
    Array<{
      id: string;
      userId: string;
      name: string;
      username: string;
      headline?: string;
      avatarUrl?: string;
      campus?: string;
    }>
  >([]);
  const [followingIdSet, setFollowingIdSet] = useState<Set<string>>(new Set());
  const [receivedRequests, setReceivedRequests] = useState<ConnectionRequestItem[]>([]);
  const [sentPendingRequests, setSentPendingRequests] = useState<ConnectionRequestItem[]>([]);
  const [sentRejectedRequests, setSentRejectedRequests] = useState<ConnectionRequestItem[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Groups Modals
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showEditGroupSettingsModal, setShowEditGroupSettingsModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);
  const [showGroupRequestsModal, setShowGroupRequestsModal] = useState(false);
  const [activeRequestsGroup, setActiveRequestsGroup] = useState<GroupItem | null>(null);
  const [showInviteConnectionsModal, setShowInviteConnectionsModal] = useState(false);
  const [activeInviteGroup, setActiveInviteGroup] = useState<GroupItem | null>(null);
  const [invitedConnectionIds, setInvitedConnectionIds] = useState<Record<string, string[]>>({});
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [targetJoinGroup, setTargetJoinGroup] = useState<GroupItem | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinPurposeInput, setJoinPurposeInput] = useState("");

  // Confirmation Modals for Delete & Exit Group
  const [groupToDelete, setGroupToDelete] = useState<GroupItem | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [groupToExit, setGroupToExit] = useState<GroupItem | null>(null);
  const [isExitingGroup, setIsExitingGroup] = useState(false);

  const [topInteractedMembers, setTopInteractedMembers] = useState<
    Array<{
      id: string;
      displayName: string;
      username: string;
      avatarUrl?: string;
      isConnected?: boolean;
    }>
  >([]);
  const [postPublishedSuccess, setPostPublishedSuccess] = useState(false);

  // ── ACTIVE COLLABORATION POSTS / INVITATIONS FEED (REAL DATA FROM DB) ──
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // ── CONNECTED MEMBERS LIST (REAL DATA FROM DB) ──
  const [connections, setConnections] = useState<ConnectionItem[]>([]);

  // ── GROUPS LIST (SYNCED TO POSTGRES VIA API) ──
  const [groups, setGroups] = useState<GroupItem[]>([]);

  // Expanded Groups in UI
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // ── NETWORK & GROUP NOTIFICATIONS (REAL DATA FROM DB) ──
  const [notifications, setNotifications] = useState<NetworkNotification[]>([]);

  const loadRealConnections = useCallback(async () => {
    try {
      const [acceptedRes, pendingOrDeclinedRes] = await Promise.all([
        fetch("/api/connections?status=ACCEPTED"),
        fetch("/api/connections?status=PENDING,DECLINED"),
      ]);

      if (acceptedRes.ok) {
        const data = await acceptedRes.json();
        const mapped: ConnectionItem[] = data.map(
          (c: {
            id: string;
            createdAt: string;
            person?: {
              id?: string;
              displayName?: string;
              username?: string;
              headline?: string;
              avatarUrl?: string;
              campus?: { name?: string };
            };
          }) => ({
            id: c.id,
            userId: c.person?.id || c.id,
            name: c.person?.displayName || "Member",
            username: c.person?.username || "user",
            headline: c.person?.headline || "Verified Campus Member",
            campus: c.person?.campus?.name || "S-VYASA University",
            avatarUrl: c.person?.avatarUrl,
            connectedSince: new Date(c.createdAt).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            }),
          }),
        );
        setConnections(mapped);
      }

      if (pendingOrDeclinedRes.ok) {
        const listData = await pendingOrDeclinedRes.json();
        const rec: ConnectionRequestItem[] = [];
        const sentPending: ConnectionRequestItem[] = [];
        const sentRejected: ConnectionRequestItem[] = [];

        listData.forEach(
          (c: {
            id: string;
            status: "PENDING" | "DECLINED" | "ACCEPTED";
            createdAt: string;
            updatedAt?: string;
            message?: string;
            direction?: "sent" | "received";
            person?: {
              id?: string;
              displayName?: string;
              username?: string;
              headline?: string;
              avatarUrl?: string;
              campus?: { name?: string };
            };
          }) => {
            const item: ConnectionRequestItem = {
              id: c.id,
              userId: c.person?.id || c.id,
              name: c.person?.displayName || "Member",
              username: c.person?.username || "user",
              headline: c.person?.headline || "Verified Campus Member",
              campus: c.person?.campus?.name || "S-VYASA University",
              avatarUrl: c.person?.avatarUrl,
              createdAt: new Date(c.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              updatedAt: c.updatedAt
                ? new Date(c.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : undefined,
              direction: c.direction === "sent" ? "sent" : "received",
              status: c.status,
              message: c.message,
            };

            if (c.direction === "sent") {
              if (c.status === "PENDING") {
                sentPending.push(item);
              } else if (c.status === "DECLINED") {
                sentRejected.push(item);
              }
            } else if (c.direction === "received") {
              if (c.status === "PENDING") {
                rec.push(item);
              }
            }
          },
        );

        setReceivedRequests(rec);
        setSentPendingRequests(sentPending);
        setSentRejectedRequests(sentRejected);
      }
    } catch {
      // silent
    }
  }, []);

  const loadRealNotifications = useCallback(async () => {
    try {
      const [notifRes, pendingRes] = await Promise.all([
        fetch("/api/notifications?unread=false"),
        fetch("/api/connections?status=PENDING"),
      ]);

      const list: NetworkNotification[] = [];
      const pendingMap = new Map<string, string>(); // username/id -> connectionId

      if (pendingRes.ok) {
        const pending = await pendingRes.json();
        const incoming = pending.filter((c: { direction?: string }) => c.direction === "received");
        incoming.forEach(
          (c: {
            id: string;
            person?: {
              id?: string;
              displayName?: string;
              username?: string;
              avatarUrl?: string;
            };
          }) => {
            if (c.person?.username) pendingMap.set(c.person.username, c.id);
            if (c.person?.id) pendingMap.set(c.person.id, c.id);
          },
        );
      }

      if (notifRes.ok) {
        const notifData = await notifRes.json();
        if (Array.isArray(notifData.notifications)) {
          notifData.notifications.forEach(
            (n: {
              id: string;
              type: string;
              title: string;
              body?: string | null;
              actionUrl?: string | null;
              createdAt: string;
              isRead: boolean;
              triggeredBy?: {
                displayName?: string;
                username?: string;
                avatarUrl?: string | null;
              } | null;
            }) => {
              let notifGroupId: string | undefined = undefined;
              let notifRequestId: string | undefined = undefined;
              if (n.actionUrl) {
                const gMatch =
                  n.actionUrl.match(/joinGroup=([a-zA-Z0-9]+)/) ||
                  n.actionUrl.match(/groupId=([a-zA-Z0-9]+)/);
                if (gMatch) notifGroupId = gMatch[1];
                const rMatch = n.actionUrl.match(/requestId=([a-zA-Z0-9]+)/);
                if (rMatch) notifRequestId = rMatch[1];
              }

              const isGroup = n.type.includes("GROUP") || n.type.includes("CLUB");
              const titleLower = n.title.toLowerCase();
              let mappedType: NetworkNotification["type"] = n.type as NetworkNotification["type"];

              if (n.type === "GROUP_INVITE" || n.type === "CLUB_INVITE") {
                if (titleLower.includes("accepted")) {
                  mappedType = "GROUP_INVITATION_ACCEPTED";
                } else if (titleLower.includes("joined") || titleLower.includes("approved")) {
                  mappedType = "GROUP_MEMBER_JOINED";
                } else if (titleLower.includes("declined") || titleLower.includes("rejected")) {
                  mappedType = "GROUP_INVITATION_REJECTED";
                } else {
                  mappedType = "GROUP_INVITATION_RECEIVED";
                }
              }

              // For connection requests, check if still pending
              const connId = n.triggeredBy?.username
                ? pendingMap.get(n.triggeredBy.username)
                : undefined;
              const isConnPending = Boolean(connId);
              const isRead =
                n.type === "CONNECTION_REQUEST" ? n.isRead || !isConnPending : n.isRead;

              list.push({
                id: n.id,
                category: isGroup ? "GROUP" : "CONNECTION",
                type: mappedType,
                title: n.title,
                message: n.body || n.title,
                timestamp: new Date(n.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
                read: isRead,
                actor: {
                  name: n.triggeredBy?.displayName || "Member",
                  username: n.triggeredBy?.username,
                  avatarUrl: n.triggeredBy?.avatarUrl || undefined,
                },
                groupId: notifGroupId,
                actionData: {
                  notificationId: n.id,
                  groupId: notifGroupId,
                  requestId: notifRequestId,
                  connectionId: connId,
                },
              });
            },
          );
        }
      }

      setNotifications(list);
    } catch {
      // silent
    }
  }, []);

  const loadRealGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.groups)) {
          setGroups(data.groups);
          const firstOwned = data.groups.find((g: GroupItem) => g.isOwner);
          if (firstOwned) setExpandedGroupId(firstOwned.id);
        }
      }
    } catch {
      // silent
    }
  }, []);

  const loadFollows = useCallback(async () => {
    try {
      const res = await fetch("/api/follows");
      if (!res.ok) return;
      const data = await res.json();
      const mapEntry = (row: {
        id: string;
        person?: {
          id?: string;
          displayName?: string;
          username?: string;
          headline?: string;
          avatarUrl?: string;
          campus?: { name?: string };
        };
      }) => ({
        id: row.id,
        userId: row.person?.id ?? row.id,
        name: row.person?.displayName ?? "Member",
        username: row.person?.username ?? "user",
        headline: row.person?.headline ?? undefined,
        avatarUrl: row.person?.avatarUrl ?? undefined,
        campus: row.person?.campus?.name ?? "S-VYASA University",
      });
      if (Array.isArray(data.following)) {
        setFollowingList(data.following.map(mapEntry));
      }
      if (Array.isArray(data.followers)) {
        setFollowersList(data.followers.map(mapEntry));
      }
      if (Array.isArray(data.followingIds)) {
        setFollowingIdSet(new Set<string>(data.followingIds));
      }
    } catch {
      // silent
    }
  }, []);

  async function handleToggleFollowMember(targetUserId: string, currentlyFollowing: boolean) {
    try {
      const res = await fetch(
        currentlyFollowing
          ? `/api/follows?userId=${encodeURIComponent(targetUserId)}`
          : "/api/follows",
        {
          method: currentlyFollowing ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: currentlyFollowing
            ? undefined
            : JSON.stringify({ followingId: targetUserId, source: "NETWORK" }),
        },
      );
      if (res.ok) {
        await loadFollows();
      }
    } catch {
      // silent
    }
  }

  const loadTopInteracted = useCallback(async () => {
    try {
      const res = await fetch("/api/users?topInteracted=true");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) {
          setTopInteractedMembers(data.users);
        }
      }
    } catch {
      // silent
    }
  }, []);

  // Fetch real data from PostgreSQL API on load
  useEffect(() => {
    async function loadInitialData() {
      setLoadingInvites(true);
      try {
        const invRes = await fetch("/api/invites");
        if (invRes.ok) {
          const invData = await invRes.json();
          if (Array.isArray(invData.items)) {
            setInvites(invData.items);
          }
        }
      } catch {
        // silent
      } finally {
        setLoadingInvites(false);
      }
    }

    void loadRealGroups();
    void loadInitialData();
    void loadRealConnections();
    void loadFollows();
    void loadRealNotifications();
    void loadTopInteracted();
  }, [loadRealGroups, loadRealConnections, loadFollows, loadRealNotifications, loadTopInteracted]);

  // Keep in sync with app-wide notification events
  useEffect(() => {
    function onUpdated() {
      void loadRealNotifications();
      void loadRealConnections();
      void loadRealGroups();
    }
    window.addEventListener("stunet:notifications-updated", onUpdated);
    return () => window.removeEventListener("stunet:notifications-updated", onUpdated);
  }, [loadRealNotifications, loadRealConnections, loadRealGroups]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── PUBLISH NEW COLLABORATION POST SUCCESS ──
  function handlePostSuccess(newPost: InviteItem) {
    setInvites((prev) => [newPost, ...prev]);
    setPostPublishedSuccess(true);
    setShowNewPostModal(false);

    const postNotif: NetworkNotification = {
      id: `notif-${Date.now()}`,
      category: "CONNECTION",
      type: "CONNECTION_POST",
      title: "Collaboration Post Published",
      message: `Your collaboration post "${newPost.name}" is now live for your network!`,
      timestamp: "Just now",
      read: false,
      actor: { name: "You" },
    };
    setNotifications((prev) => [postNotif, ...prev]);

    setTimeout(() => setPostPublishedSuccess(false), 3000);
  }

  // ── CREATE GROUP STATE (AUTO-GENERATED 4-DIGIT NUMERIC CODE) ──
  const [createGroupName, setCreateGroupName] = useState("");
  const [createGroupPurpose, setCreateGroupPurpose] = useState("");
  const [createGroupWhatsapp, setCreateGroupWhatsapp] = useState("");
  const [createGroupVisibility, setCreateGroupVisibility] = useState<"PUBLIC" | "REQUEST_REQUIRED">(
    "PUBLIC",
  );
  const [createGroupHideMembers, setCreateGroupHideMembers] = useState(false);
  const [createGroupCode, setCreateGroupCode] = useState(() =>
    Math.floor(1000 + Math.random() * 9000).toString(),
  );

  async function handleCreateGroupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!createGroupName.trim() || !createGroupPurpose.trim()) return;

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createGroupName.trim(),
          purpose: createGroupPurpose.trim(),
          whatsappLink: createGroupWhatsapp.trim() || "https://chat.whatsapp.com/sample-group",
          visibility: createGroupVisibility,
          hideMembers: createGroupHideMembers,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.group) {
          setGroups((prev) => [data.group, ...prev]);
          setExpandedGroupId(data.group.id);
        }
      } else {
        // Fallback local creation with 4-digit code
        const fallbackGroup: GroupItem = {
          id: `grp-${Date.now()}`,
          code: createGroupCode,
          name: createGroupName.trim(),
          purpose: createGroupPurpose.trim(),
          adminId: "usr-you",
          adminName: "You",
          whatsappLink: createGroupWhatsapp.trim() || "https://chat.whatsapp.com/sample-group",
          visibility: createGroupVisibility,
          hideMembersFromNonMembers: createGroupHideMembers,
          memberCount: 1,
          members: [{ id: "m-you", name: "You", role: "ADMIN" }],
          isOwner: true,
          isMember: true,
          pendingRequests: [],
        };
        setGroups((prev) => [fallbackGroup, ...prev]);
        setExpandedGroupId(fallbackGroup.id);
      }
    } catch {
      // Fallback
    }

    setCreateGroupName("");
    setCreateGroupPurpose("");
    setCreateGroupWhatsapp("");
    setCreateGroupVisibility("PUBLIC");
    setCreateGroupHideMembers(false);
    setCreateGroupCode(Math.floor(1000 + Math.random() * 9000).toString());
    setShowCreateGroupModal(false);
  }

  // ── EDIT GROUP SETTINGS HANDLER ──
  async function handleSaveGroupSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!editingGroup) return;

    try {
      await fetch(`/api/groups/${editingGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingGroup.name,
          purpose: editingGroup.purpose,
          whatsappLink: editingGroup.whatsappLink,
          visibility: editingGroup.visibility,
          hideMembers: editingGroup.hideMembersFromNonMembers,
        }),
      });
    } catch {
      // Fallback
    }

    setGroups((prev) => prev.map((g) => (g.id === editingGroup.id ? { ...editingGroup } : g)));
    setShowEditGroupSettingsModal(false);
    setEditingGroup(null);
  }

  // ── DELETE GROUP HANDLER (OWNER) ──
  async function handleConfirmDeleteGroup() {
    if (!groupToDelete) return;
    setIsDeletingGroup(true);

    try {
      const res = await fetch(`/api/groups/${groupToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Removed from DB successfully
        setGroups((prev) => prev.filter((g) => g.id !== groupToDelete.id));

        const deleteNotif: NetworkNotification = {
          id: `notif-${Date.now()}`,
          category: "GROUP",
          type: "GROUP_INVITATION_RECEIVED",
          title: "Group Deleted",
          message: `Group '${groupToDelete.name}' (#${groupToDelete.code}) was permanently deleted from the database.`,
          timestamp: "Just now",
          read: false,
          actor: { name: "You" },
        };
        setNotifications((prev) => [deleteNotif, ...prev]);
      } else {
        // Fallback local delete
        setGroups((prev) => prev.filter((g) => g.id !== groupToDelete.id));
      }
    } catch {
      setGroups((prev) => prev.filter((g) => g.id !== groupToDelete.id));
    } finally {
      setIsDeletingGroup(false);
      setGroupToDelete(null);
    }
  }

  // ── EXIT / LEAVE GROUP HANDLER (MEMBER) ──
  async function handleConfirmExitGroup() {
    if (!groupToExit) return;
    setIsExitingGroup(true);

    try {
      const res = await fetch(`/api/groups/${groupToExit.id}/leave`, {
        method: "POST",
      });

      if (res.ok) {
        // Database updated
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupToExit.id
              ? {
                  ...g,
                  isMember: false,
                  memberCount: Math.max(1, g.memberCount - 1),
                  members: g.members.filter((m) => m.name !== "You"),
                }
              : g,
          ),
        );

        const exitNotif: NetworkNotification = {
          id: `notif-${Date.now()}`,
          category: "GROUP",
          type: "GROUP_INVITATION_RECEIVED",
          title: "Exited Group",
          message: `You have successfully exited '${groupToExit.name}' (#${groupToExit.code}).`,
          timestamp: "Just now",
          read: false,
          actor: { name: "You" },
        };
        setNotifications((prev) => [exitNotif, ...prev]);
      } else {
        // Fallback local update
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupToExit.id
              ? {
                  ...g,
                  isMember: false,
                  memberCount: Math.max(1, g.memberCount - 1),
                  members: g.members.filter((m) => m.name !== "You"),
                }
              : g,
          ),
        );
      }
    } catch {
      // Fallback
    } finally {
      setIsExitingGroup(false);
      setGroupToExit(null);
    }
  }

  // ── ACCEPT / DECLINE JOIN REQUESTS (OWNER) ──
  async function handleAcceptJoinRequest(groupId: string, reqItem: GroupJoinRequestItem) {
    try {
      await fetch(`/api/groups/${groupId}/requests/${reqItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
      }
    } catch {
      // Fallback
    }

    void loadRealGroups();
    void loadRealNotifications();
  }

  async function handleDeclineJoinRequest(groupId: string, reqId: string) {
    try {
      await fetch(`/api/groups/${groupId}/requests/${reqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
      }
    } catch {
      // Fallback
    }

    void loadRealGroups();
    void loadRealNotifications();
  }

  // ── INVITE CONNECTED MEMBERS TO GROUP (PERSISTED IN POSTGRESQL) ──
  async function handleSendGroupInvite(group: GroupItem, connection: ConnectionItem) {
    const targetUserId = connection.userId || connection.id;
    const currentInvited = invitedConnectionIds[group.id] || [];
    if (currentInvited.includes(connection.id) || currentInvited.includes(targetUserId)) return;

    setInvitedConnectionIds((prev) => ({
      ...prev,
      [group.id]: [...currentInvited, connection.id, targetUserId],
    }));

    try {
      const res = await fetch(`/api/groups/${group.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });

      if (res.ok) {
        const inviteSentNotif: NetworkNotification = {
          id: `notif-sent-${Date.now()}`,
          category: "GROUP",
          type: "GROUP_INVITATION_RECEIVED",
          title: "Group Invitation Sent",
          message: `You invited ${connection.name} to join "${group.name}" (#${group.code}).`,
          timestamp: "Just now",
          read: false,
          actor: { name: connection.name, username: connection.username },
          groupId: group.id,
          groupName: group.name,
        };
        setNotifications((prev) => [inviteSentNotif, ...prev]);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to send invitation.");
        setInvitedConnectionIds((prev) => ({
          ...prev,
          [group.id]: (prev[group.id] || []).filter(
            (id) => id !== connection.id && id !== targetUserId,
          ),
        }));
      }
    } catch {
      alert("Error sending invitation.");
      setInvitedConnectionIds((prev) => ({
        ...prev,
        [group.id]: (prev[group.id] || []).filter(
          (id) => id !== connection.id && id !== targetUserId,
        ),
      }));
    }
  }

  async function handleAcceptGroupInviteNotification(notifId: string, groupId?: string) {
    if (!groupId) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromInvite: true }),
      });
      if (res.ok) {
        await fetch(`/api/notifications/${notifId}`, { method: "PATCH" });
        setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
        void loadRealGroups();
        void loadRealNotifications();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to join group.");
      }
    } catch {
      alert("Error joining group.");
    }
  }

  async function handleDeclineGroupInviteNotification(notifId: string) {
    try {
      await fetch(`/api/notifications/${notifId}`, { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
      }
    } catch {
      // silent
    }
  }

  // ── JOIN GROUP REQUEST (NON-MEMBER) ──
  async function handleSubmitJoinRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!targetJoinGroup && !joinCodeInput.trim()) return;

    const matchedGroup =
      targetJoinGroup ||
      groups.find(
        (g) =>
          g.code.toLowerCase() === joinCodeInput.trim().toLowerCase() ||
          g.name.toLowerCase().includes(joinCodeInput.trim().toLowerCase()),
      );

    if (!matchedGroup) {
      alert("No matching group found with that 4-digit code.");
      return;
    }

    try {
      const res = await fetch(`/api/groups/${matchedGroup.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: joinPurposeInput.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === "JOINED") {
          setGroups((prev) =>
            prev.map((g) =>
              g.id === matchedGroup.id
                ? {
                    ...g,
                    isMember: true,
                    memberCount: g.memberCount + 1,
                    members: [...g.members, { id: "m-you", name: "You", role: "MEMBER" }],
                  }
                : g,
            ),
          );
          alert(`Successfully joined ${matchedGroup.name}! WhatsApp group chat link unlocked.`);
        } else {
          alert(`Join request submitted to group administrator ${matchedGroup.adminName}.`);
        }
      } else {
        alert("Request processed.");
      }
    } catch {
      alert(`Join request processed for ${matchedGroup.name}.`);
    }

    setShowJoinGroupModal(false);
    setTargetJoinGroup(null);
    setJoinCodeInput("");
    setJoinPurposeInput("");
  }

  // ── ACCEPT CONNECTION REQUEST (NOTIFICATION) ──
  async function handleAcceptConnectionNotification(
    notifId: string,
    connId?: string,
    actorName?: string,
    actorUsername?: string,
  ) {
    let targetConnId = connId;
    if (!targetConnId && actorUsername) {
      try {
        const res = await fetch("/api/connections?status=PENDING");
        if (res.ok) {
          const conns = await res.json();
          const target = conns.find(
            (c: { direction?: string; person?: { username?: string } }) =>
              c.direction === "received" && c.person?.username === actorUsername,
          );
          if (target) targetConnId = target.id;
        }
      } catch {
        // silent
      }
    }

    if (targetConnId) {
      try {
        await fetch(`/api/connections/${targetConnId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ACCEPTED" }),
        });
      } catch {
        // silent
      }
    }

    try {
      await fetch(`/api/notifications/${notifId}`, { method: "PATCH" });
    } catch {
      // silent
    }

    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
    void loadRealConnections();
    void loadRealNotifications();

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
    }
  }

  async function handleAcceptConnectionRequest(connId: string) {
    try {
      await fetch(`/api/connections/${connId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACCEPTED" }),
      });
    } catch {
      // silent
    }
    void loadRealConnections();
    void loadRealNotifications();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
    }
  }

  async function handleDeclineConnectionRequest(connId: string) {
    try {
      await fetch(`/api/connections/${connId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DECLINED" }),
      });
    } catch {
      // silent
    }
    void loadRealConnections();
    void loadRealNotifications();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
    }
  }

  async function handleCancelSentRequest(connId: string) {
    try {
      await fetch(`/api/connections/${connId}`, {
        method: "DELETE",
      });
    } catch {
      // silent
    }
    void loadRealConnections();
    void loadRealNotifications();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
    }
  }

  async function handleRemoveConnection(connId: string, memberName?: string) {
    if (
      memberName &&
      !window.confirm(
        `Are you sure you want to remove your connection with ${memberName}? They will be notified that the connection has been removed.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/connections/${connId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConnections((prev) => prev.filter((c) => c.id !== connId));
        void loadRealConnections();
        void loadRealNotifications();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
        }
      }
    } catch {
      // silent
    }
  }

  async function handleMarkAllNotificationsRead() {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
      }
    } catch {
      // silent
    }
  }

  async function handleIgnoreNotification(
    notifId: string,
    connId?: string,
    actorUsername?: string,
  ) {
    let targetConnId = connId;
    if (!targetConnId && actorUsername) {
      try {
        const res = await fetch("/api/connections?status=PENDING");
        if (res.ok) {
          const conns = await res.json();
          const target = conns.find(
            (c: { direction?: string; person?: { username?: string } }) =>
              c.direction === "received" && c.person?.username === actorUsername,
          );
          if (target) targetConnId = target.id;
        }
      } catch {
        // silent
      }
    }

    if (targetConnId) {
      try {
        await fetch(`/api/connections/${targetConnId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DECLINED" }),
        });
      } catch {
        // silent
      }
    }
    try {
      await fetch(`/api/notifications/${notifId}`, { method: "PATCH" });
    } catch {
      // silent
    }
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
    void loadRealConnections();
    void loadRealNotifications();

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── HEADER BANNER WITH NEW POST, NOTIFICATION & CONNECTED MEMBERS BUTTONS ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              My Network & Groups
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build professional connections, publish collaboration calls, and collaborate in peer
            groups.
          </p>
        </div>

        {/* ── HEADING SECTION ACTION BUTTONS: CONNECTIONS PILL, RECEIVED & SENT REQUESTS, PLUS BUTTON, NOTIFICATIONS ── */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
          {/* 1. Pill Button: Connections | Number */}
          <button
            type="button"
            onClick={() => {
              setConnectionsModalTab("ALL");
              setShowConnectionsModal(true);
            }}
            title="Connected Members Directory"
            className="h-10 px-4 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-xs flex items-center gap-2 transition-all shadow-2xs group cursor-pointer"
          >
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
            <span>Connections</span>
            <span className="text-slate-300 dark:text-slate-600 font-normal">|</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-black">
              {connections.length}
            </span>
          </button>

          {/* 1b. Pill Button: Following | Followers */}
          <button
            type="button"
            onClick={() => {
              setConnectionsModalTab("FOLLOWING");
              setShowConnectionsModal(true);
            }}
            title="One-way Following & Followers Interest Graph"
            className="h-10 px-4 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600 text-slate-800 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 font-bold text-xs flex items-center gap-2 transition-all shadow-2xs group cursor-pointer"
          >
            <UserCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
            <span>Following</span>
            <span className="text-slate-300 dark:text-slate-600 font-normal">|</span>
            <span className="text-sky-600 dark:text-sky-400 font-black">
              {followingList.length}
            </span>
          </button>

          {/* 2. Pill Button: Received Requests */}
          <button
            type="button"
            onClick={() => {
              setConnectionsModalTab("RECEIVED");
              setShowConnectionsModal(true);
            }}
            title="Received Connection Requests"
            className={`h-10 px-3.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all shadow-2xs group cursor-pointer ${
              receivedRequests.length > 0
                ? "bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200"
            }`}
          >
            <Inbox
              className={`h-4 w-4 ${
                receivedRequests.length > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400 dark:text-slate-500"
              } group-hover:scale-110 transition-transform shrink-0`}
            />
            <span>Received</span>
            <span className="text-slate-300 dark:text-slate-600 font-normal">|</span>
            <span
              className={`font-black ${
                receivedRequests.length > 0
                  ? "text-white bg-emerald-600 px-1.5 py-0.5 rounded-full text-[10px]"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {receivedRequests.length}
            </span>
          </button>

          {/* 3. Pill Button: Sent Requests */}
          <button
            type="button"
            onClick={() => {
              setConnectionsModalTab("SENT");
              setShowConnectionsModal(true);
            }}
            title="Sent Connection Requests (Pending & Rejected)"
            className="h-10 px-3.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold flex items-center gap-2 transition-all shadow-2xs group cursor-pointer"
          >
            <Send className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
            <span>Sent</span>
            <span className="text-slate-300 dark:text-slate-600 font-normal">|</span>
            <span className="text-slate-600 dark:text-slate-400 font-black">
              {sentPendingRequests.length + sentRejectedRequests.length}
            </span>
            {sentRejectedRequests.length > 0 && (
              <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {sentRejectedRequests.length} rejected
              </span>
            )}
          </button>

          {/* 4. Plus Button: New Professional Collaboration Post */}
          <button
            type="button"
            onClick={() => setShowNewPostModal(true)}
            title="Create Professional Collaboration Post"
            className="h-10 px-3.5 sm:px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span className="hidden sm:inline">New Post</span>
          </button>

          {/* 5. Notification Button: Beside New Post Button */}
          <button
            type="button"
            onClick={() => {
              setShowNotificationsModal(true);
              void loadRealNotifications();
              void loadRealConnections();
              void loadRealGroups();
            }}
            title="Connection & Group Notifications"
            className="relative h-10 w-10 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center transition-all shadow-2xs"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-black h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Mobile Tab Switcher */}
          <div className="lg:hidden flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl ml-2">
            <button
              type="button"
              onClick={() => setMobileTab("POSTS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mobileTab === "POSTS"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Feed
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("GROUPS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mobileTab === "GROUPS"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Groups ({groups.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP 60/40 SPLIT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── MIDDLE / MAIN DIVISION (60% Desktop / cols-7): ONLY POSTS & INVITATIONS FEED ── */}
        <ProfessionalInvitesList
          invites={invites}
          loadingInvites={loadingInvites}
          postPublishedSuccess={postPublishedSuccess}
          onOpenNewPostModal={() => setShowNewPostModal(true)}
          mobileTab={mobileTab}
        />

        <GroupsList
          groups={groups}
          mobileTab={mobileTab}
          expandedGroupId={expandedGroupId}
          onToggleExpandGroup={setExpandedGroupId}
          onCreateGroupClick={() => {
            setCreateGroupCode(Math.floor(1000 + Math.random() * 9000).toString());
            setShowCreateGroupModal(true);
          }}
          onJoinByCodeClick={() => {
            setTargetJoinGroup(null);
            setShowJoinGroupModal(true);
          }}
          onEditSettingsClick={(group) => {
            setEditingGroup({ ...group });
            setShowEditGroupSettingsModal(true);
          }}
          onViewRequestsClick={(group) => {
            setActiveRequestsGroup(group);
            setShowGroupRequestsModal(true);
          }}
          onInviteConnectionsClick={(group) => {
            setActiveInviteGroup(group);
            setShowInviteConnectionsModal(true);
          }}
          onDeleteGroupClick={(group) => setGroupToDelete(group)}
          onExitGroupClick={(group) => setGroupToExit(group)}
          onRequestJoinClick={(group) => {
            setTargetJoinGroup(group);
            setShowJoinGroupModal(true);
          }}
        />
      </div>

      {/* ── MODAL 1: NEW PROFESSIONAL COLLABORATION POST ── */}
      <NewProfessionalPostForm
        isOpen={showNewPostModal}
        onClose={() => setShowNewPostModal(false)}
        onSuccess={handlePostSuccess}
        topInteractedMembers={topInteractedMembers}
      />

      {/* ── MODAL 2: CONNECTIONS & REQUESTS DIRECTORY ── */}
      <ConnectionsList
        isOpen={showConnectionsModal}
        onClose={() => setShowConnectionsModal(false)}
        connections={connections}
        followingList={followingList}
        followersList={followersList}
        followingIdSet={followingIdSet}
        receivedRequests={receivedRequests}
        sentPendingRequests={sentPendingRequests}
        sentRejectedRequests={sentRejectedRequests}
        activeTab={connectionsModalTab}
        onRemoveConnection={handleRemoveConnection}
        onAcceptRequest={handleAcceptConnectionRequest}
        onDeclineRequest={handleDeclineConnectionRequest}
        onCancelSentRequest={handleCancelSentRequest}
        onToggleFollow={handleToggleFollowMember}
      />

      {/* ── MODAL 3: NETWORK & GROUP NOTIFICATIONS (BELL BUTTON) ── */}
      <NetworkNotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={notifications}
        onIgnoreNotification={handleIgnoreNotification}
        onAcceptConnectionNotification={handleAcceptConnectionNotification}
        onDeclineJoinRequest={handleDeclineJoinRequest}
        onAcceptJoinRequest={handleAcceptJoinRequest}
        onDeclineGroupInvite={handleDeclineGroupInviteNotification}
        onAcceptGroupInvite={handleAcceptGroupInviteNotification}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
      />

      {/* ── MODALS 4-10: GROUP ACTION MODALS (CREATE, EDIT, REQUESTS, INVITES, JOIN, DELETE, EXIT) ── */}
      <GroupActionModals
        showCreateGroupModal={showCreateGroupModal}
        onCloseCreateGroup={() => setShowCreateGroupModal(false)}
        createGroupCode={createGroupCode}
        onRefreshGroupCode={() =>
          setCreateGroupCode(Math.floor(1000 + Math.random() * 9000).toString())
        }
        createGroupName={createGroupName}
        onChangeGroupName={setCreateGroupName}
        createGroupPurpose={createGroupPurpose}
        onChangeGroupPurpose={setCreateGroupPurpose}
        createGroupWhatsapp={createGroupWhatsapp}
        onChangeGroupWhatsapp={setCreateGroupWhatsapp}
        createGroupVisibility={createGroupVisibility}
        onChangeGroupVisibility={setCreateGroupVisibility}
        createGroupHideMembers={createGroupHideMembers}
        onChangeGroupHideMembers={setCreateGroupHideMembers}
        onSubmitCreateGroup={handleCreateGroupSubmit}
        showEditGroupSettingsModal={showEditGroupSettingsModal}
        editingGroup={editingGroup}
        onChangeEditingGroup={setEditingGroup}
        onCloseEditGroupSettings={() => setShowEditGroupSettingsModal(false)}
        onSubmitSaveGroupSettings={handleSaveGroupSettings}
        showGroupRequestsModal={showGroupRequestsModal}
        activeRequestsGroup={activeRequestsGroup}
        onCloseGroupRequests={() => setShowGroupRequestsModal(false)}
        onAcceptJoinRequest={handleAcceptJoinRequest}
        onDeclineJoinRequest={handleDeclineJoinRequest}
        showInviteConnectionsModal={showInviteConnectionsModal}
        activeInviteGroup={activeInviteGroup}
        onCloseInviteConnections={() => setShowInviteConnectionsModal(false)}
        connections={connections}
        invitedConnectionIds={invitedConnectionIds}
        onSendGroupInvite={handleSendGroupInvite}
        showJoinGroupModal={showJoinGroupModal}
        targetJoinGroup={targetJoinGroup}
        joinCodeInput={joinCodeInput}
        onChangeJoinCodeInput={setJoinCodeInput}
        joinPurposeInput={joinPurposeInput}
        onChangeJoinPurposeInput={setJoinPurposeInput}
        onCloseJoinGroup={() => {
          setShowJoinGroupModal(false);
          setTargetJoinGroup(null);
        }}
        onSubmitJoinRequest={handleSubmitJoinRequest}
        groupToDelete={groupToDelete}
        isDeletingGroup={isDeletingGroup}
        onCloseDeleteGroup={() => setGroupToDelete(null)}
        onConfirmDeleteGroup={handleConfirmDeleteGroup}
        groupToExit={groupToExit}
        isExitingGroup={isExitingGroup}
        onCloseExitGroup={() => setGroupToExit(null)}
        onConfirmExitGroup={handleConfirmExitGroup}
      />
    </div>
  );
}
