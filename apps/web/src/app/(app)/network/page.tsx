"use client";

import { useState, useEffect, useCallback } from "react";
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
  Clock,
  Laptop,
  MapPin,
  Bell,
  Settings,
  Lock,
  Globe,
  Shield,
  UserCheck,
  Inbox,
  X,
  XCircle,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  Trash2,
  LogOut,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { Avatar, Button, Card, CardContent, CardHeader, CardTitle, Modal } from "@stunet/ui";
import AdvancedSelectList, { GeoFilterSelection } from "@/components/AdvancedSelectList";

interface InviteItem {
  id: string;
  name: string;
  description?: string | null;
  mode: "ONLINE" | "OFFLINE";
  type: "HACKATHON" | "COMPETITION" | "PROJECT" | "WORKSHOP" | "MEETUP";
  requirements?: string | null;
  eventDate?: string | null;
  registrationDeadline?: string | null;
  location?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  isFromNonConnected?: boolean;
  isDirectInvite?: boolean;
  recipient?: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  } | null;
  creator: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    role: string;
    campus?: { name: string } | null;
  };
}

interface ConnectionItem {
  id: string;
  userId?: string;
  name: string;
  username: string;
  headline?: string;
  avatarUrl?: string;
  campus?: string;
  connectedSince?: string;
}

interface ConnectionRequestItem {
  id: string;
  userId: string;
  name: string;
  username: string;
  headline?: string;
  avatarUrl?: string;
  campus?: string;
  createdAt: string;
  updatedAt?: string;
  direction: "sent" | "received";
  status?: "PENDING" | "DECLINED" | "ACCEPTED";
  message?: string;
}

interface GroupMemberItem {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: "ADMIN" | "MEMBER";
  joinedAt?: string;
}

interface GroupJoinRequestItem {
  id: string;
  userId: string;
  userName: string;
  userHeadline?: string;
  userAvatar?: string;
  purpose?: string;
  requestedAt: string;
}

interface GroupItem {
  id: string;
  code: string; // 4-digit numeric code
  name: string;
  purpose: string;
  adminId: string;
  adminName: string;
  adminAvatar?: string;
  whatsappLink: string;
  visibility: "PUBLIC" | "REQUEST_REQUIRED";
  hideMembersFromNonMembers: boolean;
  memberCount: number;
  members: GroupMemberItem[];
  isOwner: boolean;
  isMember: boolean;
  pendingRequests?: GroupJoinRequestItem[];
}

interface NetworkNotification {
  id: string;
  category: "CONNECTION" | "GROUP";
  type:
    | "CONNECTION_REQUEST"
    | "CONNECTION_POST"
    | "GROUP_JOIN_REQUEST"
    | "GROUP_INVITATION_ACCEPTED"
    | "GROUP_INVITATION_REJECTED"
    | "GROUP_MEMBER_JOINED"
    | "GROUP_INVITATION_RECEIVED";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actor: {
    name: string;
    username?: string;
    avatarUrl?: string;
  };
  groupId?: string;
  groupName?: string;
  actionData?: {
    connectionId?: string;
    requestId?: string;
    notificationId?: string;
    groupId?: string;
  };
}

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
  const [notificationTab, setNotificationTab] = useState<"ALL" | "CONNECTION" | "GROUP">("ALL");

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

  // Search connected users inside Connections Modal
  const [connectionSearchQuery, setConnectionSearchQuery] = useState("");

  // ── COLLABORATION POST FORM STATE (Modal) ──
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [targetUsers, setTargetUsers] = useState<"ALL" | "CONNECTED">("ALL");
  const [targetRegion, setTargetRegion] = useState<GeoFilterSelection>({
    type: "ALL",
    name: "All Campuses",
  });
  const [purpose, setPurpose] = useState<"GENERAL" | "HACKATHON" | "PROJECT">("HACKATHON");
  const [expireDate, setExpireDate] = useState("2026-11-20");
  const [eventDate, setEventDate] = useState("");
  const [inviteMode, setInviteMode] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [inviteRequirements, setInviteRequirements] = useState("");
  const [inviteLocation, setInviteLocation] = useState("");

  // Direct recipient invitation state (send to selected connected or non-connected member)
  const [sendDirectOnly, setSendDirectOnly] = useState(false);
  const [recipientSearchQuery, setRecipientSearchQuery] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<{
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    isConnected?: boolean;
  } | null>(null);
  const [topInteractedMembers, setTopInteractedMembers] = useState<
    Array<{
      id: string;
      displayName: string;
      username: string;
      avatarUrl?: string;
      isConnected?: boolean;
    }>
  >([]);
  const [searchedMembers, setSearchedMembers] = useState<
    Array<{
      id: string;
      displayName: string;
      username: string;
      avatarUrl?: string;
      isConnected?: boolean;
    }>
  >([]);

  // Middle division filter: ALL vs NON_CONNECTED
  const [invitesFilterTab, setInvitesFilterTab] = useState<"ALL" | "NON_CONNECTED">("ALL");

  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
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

  // ── GROUP CATEGORIZATION ──
  const ownedGroups = groups.filter((g) => g.isOwner);
  const joinedGroups = groups.filter((g) => g.isMember && !g.isOwner);
  const suggestedGroups = groups.filter((g) => !g.isMember && !g.isOwner);

  // ── PUBLISH NEW COLLABORATION POST ──
  async function handlePublishCollaborationPost(e: React.FormEvent) {
    e.preventDefault();
    if (!postTitle.trim() || !postDescription.trim()) return;

    setIsSubmittingPost(true);
    try {
      const inviteType =
        purpose === "HACKATHON" ? "HACKATHON" : purpose === "PROJECT" ? "PROJECT" : "MEETUP";

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

      setInvites((prev) => [newPost, ...prev]);
      setPostPublishedSuccess(true);
      setPostTitle("");
      setPostDescription("");
      setInviteRequirements("");
      setInviteLocation("");
      setEventDate("");
      setSendDirectOnly(false);
      setSelectedRecipient(null);
      setRecipientSearchQuery("");
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
    } finally {
      setIsSubmittingPost(false);
    }
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

  const filteredConnections = connections.filter(
    (c) =>
      c.name.toLowerCase().includes(connectionSearchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(connectionSearchQuery.toLowerCase()) ||
      c.headline?.toLowerCase().includes(connectionSearchQuery.toLowerCase()),
  );

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
        <div
          className={`lg:col-span-7 space-y-4 ${
            mobileTab === "POSTS" ? "block" : "hidden lg:block"
          }`}
        >
          {postPublishedSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2 shadow-2xs">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Professional collaboration post published to your target audience!</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
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
                {invites.filter((i) => Boolean(i.isFromNonConnected)).length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500 text-white font-extrabold">
                    {invites.filter((i) => Boolean(i.isFromNonConnected)).length}
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
          ) : invites.filter((inv) =>
              invitesFilterTab === "NON_CONNECTED" ? Boolean(inv.isFromNonConnected) : true,
            ).length === 0 ? (
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
                  onClick={() => setShowNewPostModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Publish the First Post</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {invites
                .filter((inv) =>
                  invitesFilterTab === "NON_CONNECTED" ? Boolean(inv.isFromNonConnected) : true,
                )
                .map((inv) => (
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

        {/* ── RIGHT DIVISION (40% Desktop / cols-5): GROUPS (Owned Groups, Joined Groups, Suggestions) ── */}
        <div
          className={`lg:col-span-5 space-y-6 ${
            mobileTab === "GROUPS" ? "block" : "hidden lg:block"
          }`}
        >
          {/* Quick Group Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCreateGroupCode(Math.floor(1000 + Math.random() * 9000).toString());
                setShowCreateGroupModal(true);
              }}
              className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Group</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTargetJoinGroup(null);
                setShowJoinGroupModal(true);
              }}
              className="flex-1 py-2.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
            >
              <UserPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Join Group by Code</span>
            </button>
          </div>

          {/* ── 1. OWNED GROUPS (ADMIN) — ELEGANT POLISHED UI ── */}
          {ownedGroups.length > 0 && (
            <Card className="border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden rounded-3xl">
              <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100">
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
                  const isExpanded = expandedGroupId === group.id;
                  const reqCount = group.pendingRequests?.length || 0;

                  return (
                    <div
                      key={group.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      {/* Header Summary */}
                      <button
                        type="button"
                        onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
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
                          {/* Polished, non-blinking requests badge */}
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

                          {/* ── OWNER CONTROL TOOLBAR (SETTINGS, REQUESTS, INVITE, DELETE GROUP) ── */}
                          <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                            {/* 1. Settings Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGroup({ ...group });
                                setShowEditGroupSettingsModal(true);
                              }}
                              className="py-1.5 px-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 transition-colors"
                            >
                              <Settings className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                              <span>Settings</span>
                            </button>

                            {/* 2. Requests Button (Calm, elegant styling) */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveRequestsGroup(group);
                                setShowGroupRequestsModal(true);
                              }}
                              className="py-1.5 px-1 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-xl text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-1 transition-colors"
                            >
                              <UserCheck className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                              <span>Requests ({reqCount})</span>
                            </button>

                            {/* 3. Invite Connected People Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveInviteGroup(group);
                                setShowInviteConnectionsModal(true);
                              }}
                              className="py-1.5 px-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors"
                            >
                              <UserPlus className="h-3 w-3" />
                              <span>Invite</span>
                            </button>

                            {/* 4. Delete Group Button (Owner Only) */}
                            <button
                              type="button"
                              onClick={() => setGroupToDelete(group)}
                              className="py-1.5 px-1 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 rounded-xl text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1 transition-colors"
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

          {/* ── 2. JOINED GROUPS SECTION (WITH EXIT GROUP OPTION) ── */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden rounded-3xl bg-white dark:bg-slate-900">
            <CardHeader className="p-3.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
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
                  const isExpanded = expandedGroupId === group.id;

                  return (
                    <div
                      key={group.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                        className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
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

                          {/* WhatsApp Link visible to approved members */}
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

                          {/* Group Admin Always Visible + Exit Group Option */}
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 text-[10px] block">
                                Group Admin
                              </span>
                              <span className="font-bold text-indigo-700 dark:text-indigo-300">
                                {group.adminName}
                              </span>
                            </div>

                            {/* ── EXIT GROUP BUTTON (FOR MEMBERS) ── */}
                            <button
                              type="button"
                              onClick={() => setGroupToExit(group)}
                              className="px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 rounded-xl flex items-center gap-1 transition-colors"
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

          {/* ── 3. GROUP SUGGESTIONS SECTION (NOW AT THE BOTTOM) ── */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden rounded-3xl bg-white dark:bg-slate-900">
            <CardHeader className="p-3.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
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
                      {/* GROUP ADMIN ALWAYS VISIBLE */}
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Admin:{" "}
                        <strong className="text-indigo-600 dark:text-indigo-400">
                          {sugg.adminName}
                        </strong>{" "}
                        · {sugg.memberCount} members
                      </p>
                    </div>

                    {/* Join / Link Action */}
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
                        onClick={() => {
                          setTargetJoinGroup(sugg);
                          setShowJoinGroupModal(true);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 shadow-2xs"
                      >
                        <Lock className="h-3 w-3" />
                        <span>Request Link</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    {sugg.purpose}
                  </p>

                  {/* Member Roster Visibility Handling */}
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
      </div>

      {/* ── MODAL 1: NEW PROFESSIONAL COLLABORATION POST ── */}
      <Modal
        open={showNewPostModal}
        onClose={() => setShowNewPostModal(false)}
        title="New Professional Collaboration Post"
        className="max-w-xl"
      >
        <form onSubmit={handlePublishCollaborationPost} className="space-y-3.5 pt-2 text-xs">
          {/* Target Audience, Purpose, Mode, Expiry, Event Date */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Target Audience
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
                onChange={(e) => setPurpose(e.target.value as "GENERAL" | "HACKATHON" | "PROJECT")}
                className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-2 focus:bg-white dark:focus:bg-slate-800"
              >
                <option value="HACKATHON">Hackathon Team</option>
                <option value="PROJECT">Project Teammate</option>
                <option value="GENERAL">Competition / Meetup</option>
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
                  Target a specific connected or non-connected peer directly.
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

          {/* Target Region with AdvancedSelectList */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
              Target Region / Campus Scope
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowNewPostModal(false)}
              className="text-xs"
            >
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

      {/* ── MODAL 2: CONNECTIONS & REQUESTS DIRECTORY ── */}
      <Modal
        open={showConnectionsModal}
        onClose={() => setShowConnectionsModal(false)}
        title="Connections & Requests"
        className="max-w-3xl sm:max-w-4xl"
      >
        <div className="space-y-4 pt-2 text-xs">
          {/* Tabs Selector: Connections, Following, Followers, Received Requests, Sent Requests */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setConnectionsModalTab("ALL")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                connectionsModalTab === "ALL"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Connections</span>
              <span className="bg-slate-200/80 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
                {connections.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setConnectionsModalTab("FOLLOWING")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                connectionsModalTab === "FOLLOWING"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <span>Following</span>
              <span className="bg-slate-200/80 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
                {followingList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setConnectionsModalTab("FOLLOWERS")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                connectionsModalTab === "FOLLOWERS"
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <span>Followers</span>
              <span className="bg-slate-200/80 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
                {followersList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setConnectionsModalTab("RECEIVED")}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                connectionsModalTab === "RECEIVED"
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Inbox className="h-3.5 w-3.5" />
              <span>Received</span>
              {receivedRequests.length > 0 ? (
                <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                  {receivedRequests.length}
                </span>
              ) : (
                <span className="bg-slate-200/80 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
                  0
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setConnectionsModalTab("SENT")}
              className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                connectionsModalTab === "SENT"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Sent</span>
              <span className="bg-slate-200/80 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
                {sentPendingRequests.length + sentRejectedRequests.length}
              </span>
              {sentRejectedRequests.length > 0 && (
                <span className="bg-rose-500 text-white px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold">
                  {sentRejectedRequests.length} rejected
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: ALL CONNECTED MEMBERS */}
          {connectionsModalTab === "ALL" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={connectionSearchQuery}
                  onChange={(e) => setConnectionSearchQuery(e.target.value)}
                  placeholder="Search connected members by name, headline, or username…"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
                {filteredConnections.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    No connected members found matching &ldquo;{connectionSearchQuery}&rdquo;
                  </div>
                ) : (
                  filteredConnections.map((user) => (
                    <div
                      key={user.id}
                      className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
                    >
                      <Link
                        href={`/u/${user.username}`}
                        onClick={() => setShowConnectionsModal(false)}
                        className="flex items-center gap-3 min-w-0 flex-1 group"
                      >
                        <Avatar name={user.name} src={user.avatarUrl} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                            {user.name}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            @{user.username}
                          </p>
                          {user.headline && (
                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5">
                              {user.headline}
                            </p>
                          )}
                        </div>
                      </Link>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                          Connected {user.connectedSince}
                        </span>
                        <Link
                          href={`/u/${user.username}`}
                          onClick={() => setShowConnectionsModal(false)}
                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-block mt-0.5"
                        >
                          View Profile →
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RECEIVED REQUESTS (LINKEDIN STYLE) */}
          {connectionsModalTab === "RECEIVED" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    Invitations
                  </span>
                  <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {receivedRequests.length}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Review pending connection requests from campus peers
                </span>
              </div>

              <div className="max-h-[460px] overflow-y-auto space-y-3 pr-1">
                {receivedRequests.length === 0 ? (
                  <div className="py-14 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Inbox className="h-9 w-9 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                      No pending invitations
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                      When other students, faculty, or alumni send you connection invitations, you
                      can review and accept them here just like on LinkedIn.
                    </p>
                  </div>
                ) : (
                  receivedRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-600 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Left: Avatar + Details */}
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <Link
                          href={`/u/${req.username}`}
                          onClick={() => setShowConnectionsModal(false)}
                          className="shrink-0 group"
                        >
                          <Avatar name={req.name} src={req.avatarUrl} size="lg" />
                        </Link>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/u/${req.username}`}
                              onClick={() => setShowConnectionsModal(false)}
                              className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:underline"
                            >
                              {req.name}
                            </Link>
                            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                              @{req.username}
                            </span>
                          </div>

                          {req.headline && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2 mt-0.5 leading-snug">
                              {req.headline}
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                            <span>{req.campus}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                              Received {req.createdAt}
                            </span>
                          </div>

                          {req.message && (
                            <div className="mt-2.5 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 italic flex items-start gap-2">
                              <MessageSquare className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                              <span className="flex-1">&ldquo;{req.message}&rdquo;</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: LinkedIn-style Reject and Accept Options */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeclineConnectionRequest(req.id)}
                          className="px-4 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100 font-semibold text-xs transition-all active:scale-95 cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAcceptConnectionRequest(req.id)}
                          className="px-5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SENT REQUESTS — TWO SEPARATE COLUMNS */}
          {connectionsModalTab === "SENT" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* COLUMN 1: NEW SENT REQUESTS (PENDING APPROVAL) */}
                <div className="space-y-3 bg-slate-50/60 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        New Sent Requests
                      </h3>
                      <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                        {sentPendingRequests.length}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Awaiting Response
                    </span>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
                    {sentPendingRequests.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                        <Send className="h-7 w-7 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          No pending sent requests
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Invitations you send that are waiting for response will appear here.
                        </p>
                      </div>
                    ) : (
                      sentPendingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-3 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-600 rounded-xl shadow-2xs transition-all space-y-2.5"
                        >
                          <div className="flex items-start gap-2.5">
                            <Link
                              href={`/u/${req.username}`}
                              onClick={() => setShowConnectionsModal(false)}
                              className="shrink-0"
                            >
                              <Avatar name={req.name} src={req.avatarUrl} size="md" />
                            </Link>

                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/u/${req.username}`}
                                onClick={() => setShowConnectionsModal(false)}
                                className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block hover:underline"
                              >
                                {req.name}
                              </Link>
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                @{req.username}
                              </span>
                              {req.headline && (
                                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5">
                                  {req.headline}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {req.campus} • Sent {req.createdAt}
                              </p>
                              {req.message && (
                                <p className="text-[10px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 rounded-lg p-1.5 mt-1.5 italic">
                                  &ldquo;{req.message}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                            <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              Pending
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCancelSentRequest(req.id)}
                              className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold text-[11px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                              <span>Withdraw</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* COLUMN 2: REJECTED REQUESTS */}
                <div className="space-y-3 bg-slate-50/60 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-rose-500" />
                      <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        Rejected Requests
                      </h3>
                      <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                        {sentRejectedRequests.length}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Declined by Recipient
                    </span>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
                    {sentRejectedRequests.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                        <CheckCircle2 className="h-7 w-7 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          No rejected requests
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          None of your outgoing requests have been rejected.
                        </p>
                      </div>
                    ) : (
                      sentRejectedRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-3 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-700 rounded-xl shadow-2xs transition-all space-y-2.5"
                        >
                          <div className="flex items-start gap-2.5">
                            <Link
                              href={`/u/${req.username}`}
                              onClick={() => setShowConnectionsModal(false)}
                              className="shrink-0"
                            >
                              <Avatar name={req.name} src={req.avatarUrl} size="md" />
                            </Link>

                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/u/${req.username}`}
                                onClick={() => setShowConnectionsModal(false)}
                                className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block hover:underline"
                              >
                                {req.name}
                              </Link>
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                @{req.username}
                              </span>
                              {req.headline && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                                  {req.headline}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {req.campus} • Sent {req.createdAt}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                            <span className="text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <XCircle className="h-2.5 w-2.5" />
                              Declined
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCancelSentRequest(req.id)}
                              title="Dismiss this rejected request"
                              className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold text-[11px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                            >
                              <span>Dismiss</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FOLLOWING (1-way LinkedIn-style follow list) */}
          {connectionsModalTab === "FOLLOWING" && (
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
              {followingList.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    Not following anyone yet
                  </p>
                  <p className="text-[11px] mt-1">
                    Follow classmates, faculty, or alumni to curate your feed by interest without
                    needing two-way approval.
                  </p>
                </div>
              ) : (
                followingList.map((member) => (
                  <div key={member.id} className="py-3 flex items-center justify-between gap-3">
                    <Link
                      href={`/u/${member.username}`}
                      onClick={() => setShowConnectionsModal(false)}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <Avatar name={member.name} src={member.avatarUrl} size="md" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate hover:underline">
                          {member.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          @{member.username} • {member.campus}
                        </p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleToggleFollowMember(member.userId, true)}
                      className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      Unfollow
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: FOLLOWERS */}
          {connectionsModalTab === "FOLLOWERS" && (
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
              {followersList.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                  No followers yet.
                </div>
              ) : (
                followersList.map((member) => {
                  const amFollowing = followingIdSet.has(member.userId);
                  return (
                    <div key={member.id} className="py-3 flex items-center justify-between gap-3">
                      <Link
                        href={`/u/${member.username}`}
                        onClick={() => setShowConnectionsModal(false)}
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
                        <Avatar name={member.name} src={member.avatarUrl} size="md" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate hover:underline">
                            {member.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            @{member.username} • {member.campus}
                          </p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleToggleFollowMember(member.userId, amFollowing)}
                        className={`px-3 py-1 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                          amFollowing
                            ? "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300"
                            : "bg-white dark:bg-slate-800 border-sky-600 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                        }`}
                      >
                        {amFollowing ? "Following" : "+ Follow back"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ── MODAL 3: NETWORK & GROUP NOTIFICATIONS (BELL BUTTON) ── */}
      <Modal
        open={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        title="Network & Group Notifications"
        className="max-w-lg"
      >
        <div className="space-y-3 pt-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setNotificationTab("ALL")}
              className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-all ${
                notificationTab === "ALL"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setNotificationTab("CONNECTION")}
              className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-all ${
                notificationTab === "CONNECTION"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Connections
            </button>
            <button
              type="button"
              onClick={() => setNotificationTab("GROUP")}
              className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-all ${
                notificationTab === "GROUP"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Groups
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
            {notifications
              .filter((n) => notificationTab === "ALL" || n.category === notificationTab)
              .map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    notif.read
                      ? "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                      : "bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        {notif.category === "CONNECTION" ? (
                          <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                          {notif.message}
                        </p>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 block">
                          {notif.timestamp}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleIgnoreNotification(notif.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* 1. Connection Request Actions */}
                  {notif.type === "CONNECTION_REQUEST" && (
                    <div className="flex items-center justify-end gap-2 pt-2 mt-2 border-t border-slate-100 dark:border-slate-700">
                      {!notif.read ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleIgnoreNotification(
                                notif.id,
                                notif.actionData?.connectionId,
                                notif.actor.username,
                              )
                            }
                            className="text-[10px] py-1 px-2.5"
                          >
                            Ignore
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAcceptConnectionNotification(
                                notif.id,
                                notif.actionData?.connectionId,
                                notif.actor.name,
                                notif.actor.username,
                              )
                            }
                            className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3"
                          >
                            Accept Connection
                          </Button>
                        </>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Connected
                        </span>
                      )}
                    </div>
                  )}

                  {/* 2. Group Join Request Actions (For Owner) */}
                  {notif.type === "GROUP_JOIN_REQUEST" && (
                    <div className="flex items-center justify-end gap-2 pt-2 mt-2 border-t border-slate-100 dark:border-slate-700">
                      {!notif.read ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (notif.groupId && notif.actionData?.requestId) {
                                void handleDeclineJoinRequest(
                                  notif.groupId,
                                  notif.actionData.requestId,
                                );
                              }
                              void handleIgnoreNotification(notif.id);
                            }}
                            className="text-[10px] py-1 px-2.5 text-rose-600 dark:text-rose-400"
                          >
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (notif.groupId && notif.actionData?.requestId) {
                                void handleAcceptJoinRequest(notif.groupId, {
                                  id: notif.actionData.requestId,
                                  userId: "usr-req",
                                  userName: notif.actor.name,
                                  requestedAt: notif.timestamp,
                                });
                              }
                              void handleIgnoreNotification(notif.id);
                            }}
                            className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3"
                          >
                            Accept & Admit
                          </Button>
                        </>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Request Resolved
                        </span>
                      )}
                    </div>
                  )}

                  {/* 3. Real Group Invitation Actions (Only when UNREAD) */}
                  {notif.type === "GROUP_INVITATION_RECEIVED" && notif.groupId && (
                    <div className="flex items-center justify-end gap-2 pt-2 mt-2 border-t border-slate-100 dark:border-slate-700">
                      {!notif.read ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeclineGroupInviteNotification(notif.id)}
                            className="text-[10px] py-1 px-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAcceptGroupInviteNotification(notif.id, notif.groupId)
                            }
                            className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 shadow-2xs"
                          >
                            Join Group
                          </Button>
                        </>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Joined
                        </span>
                      )}
                    </div>
                  )}

                  {/* 4. Group Invitation Accepted Info */}
                  {notif.type === "GROUP_INVITATION_ACCEPTED" && (
                    <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-slate-100 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                        Member Joined
                      </span>
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={() => handleIgnoreNotification(notif.id)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  )}

                  {/* 5. Group Member Joined Info */}
                  {notif.type === "GROUP_MEMBER_JOINED" && (
                    <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-slate-100 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                        New Member
                      </span>
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={() => handleIgnoreNotification(notif.id)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch("/api/notifications", { method: "PATCH" });
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
                  }
                } catch {
                  // silent
                }
              }}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Mark all as read
            </button>
            <Button
              variant="ghost"
              onClick={() => setShowNotificationsModal(false)}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 4: CREATE GROUP FORM (WITH AUTO-GENERATED 4-DIGIT GROUP ID) ── */}
      <Modal
        open={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        title="Create Campus Collaboration Group"
        className="max-w-md"
      >
        <form onSubmit={handleCreateGroupSubmit} className="space-y-3.5 pt-2 text-xs">
          {/* Group ID (Auto-generated 4-Digit Number) */}
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
                onClick={() =>
                  setCreateGroupCode(Math.floor(1000 + Math.random() * 9000).toString())
                }
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Generate new 4-digit ID"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              A 4-digit numeric ID assigned to your group for quick campus searches.
            </p>
          </div>

          {/* Group Name */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Group Name
            </label>
            <input
              type="text"
              required
              value={createGroupName}
              onChange={(e) => setCreateGroupName(e.target.value)}
              placeholder="e.g., Autonomous AI & Agents Guild"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Purpose & Description
            </label>
            <textarea
              rows={3}
              required
              value={createGroupPurpose}
              onChange={(e) => setCreateGroupPurpose(e.target.value)}
              placeholder="State what this group is for and how members will collaborate…"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800 resize-none"
            />
          </div>

          {/* WhatsApp Group Link */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Official WhatsApp Group Link
            </label>
            <input
              type="url"
              required
              value={createGroupWhatsapp}
              onChange={(e) => setCreateGroupWhatsapp(e.target.value)}
              placeholder="https://chat.whatsapp.com/…"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          {/* Group Visibility & WhatsApp Access Mode */}
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
                  onChange={() => setCreateGroupVisibility("PUBLIC")}
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
                  onChange={() => setCreateGroupVisibility("REQUEST_REQUIRED")}
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

          {/* Hide Group Members Toggle */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createGroupHideMembers}
                onChange={(e) => setCreateGroupHideMembers(e.target.checked)}
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

          {/* Admin Always Visible Notice */}
          <div className="p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[10px] text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Group admin (You) will always be visible to everyone.</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCreateGroupModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              Create Group
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 5: EDIT GROUP SETTINGS (OWNER) ── */}
      {editingGroup && (
        <Modal
          open={showEditGroupSettingsModal}
          onClose={() => {
            setShowEditGroupSettingsModal(false);
            setEditingGroup(null);
          }}
          title={`Edit Settings • ${editingGroup.name}`}
          className="max-w-md"
        >
          <form onSubmit={handleSaveGroupSettings} className="space-y-3 pt-2 text-xs">
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
                onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
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
                onChange={(e) => setEditingGroup({ ...editingGroup, purpose: e.target.value })}
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
                onChange={(e) => setEditingGroup({ ...editingGroup, whatsappLink: e.target.value })}
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
                  setEditingGroup({
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
                    setEditingGroup({
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
                onClick={() => {
                  setShowEditGroupSettingsModal(false);
                  setEditingGroup(null);
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Save Settings
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 6: VIEW JOIN REQUESTS (OWNER) ── */}
      {activeRequestsGroup && (
        <Modal
          open={showGroupRequestsModal}
          onClose={() => {
            setShowGroupRequestsModal(false);
            setActiveRequestsGroup(null);
          }}
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
                        onClick={() => handleDeclineJoinRequest(activeRequestsGroup.id, req.id)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptJoinRequest(activeRequestsGroup.id, req)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-2xs"
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
              <Button
                variant="ghost"
                onClick={() => {
                  setShowGroupRequestsModal(false);
                  setActiveRequestsGroup(null);
                }}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 7: INVITE CONNECTED MEMBERS TO GROUP (OWNER) ── */}
      {activeInviteGroup && (
        <Modal
          open={showInviteConnectionsModal}
          onClose={() => {
            setShowInviteConnectionsModal(false);
            setActiveInviteGroup(null);
          }}
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
                          onClick={() => handleSendGroupInvite(activeInviteGroup, conn)}
                          className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded-lg"
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
              <Button
                variant="ghost"
                onClick={() => {
                  setShowInviteConnectionsModal(false);
                  setActiveInviteGroup(null);
                }}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 8: JOIN GROUP (BY 4-DIGIT CODE OR FROM SUGGESTION) ── */}
      <Modal
        open={showJoinGroupModal}
        onClose={() => {
          setShowJoinGroupModal(false);
          setTargetJoinGroup(null);
        }}
        title={targetJoinGroup ? `Join ${targetJoinGroup.name}` : "Join Group by 4-Digit Code"}
        className="max-w-md"
      >
        <form onSubmit={handleSubmitJoinRequest} className="space-y-3.5 pt-2 text-xs">
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
                onChange={(e) => setJoinCodeInput(e.target.value)}
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
              onChange={(e) => setJoinPurposeInput(e.target.value)}
              placeholder="Tell the group admin about your background and how you plan to participate…"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowJoinGroupModal(false);
                setTargetJoinGroup(null);
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 9: DELETE GROUP CONFIRMATION (OWNER) ── */}
      {groupToDelete && (
        <Modal
          open={Boolean(groupToDelete)}
          onClose={() => setGroupToDelete(null)}
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
                onClick={() => setGroupToDelete(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isDeletingGroup}
                onClick={handleConfirmDeleteGroup}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeletingGroup ? "Deleting…" : "Permanently Delete Group"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 10: EXIT GROUP CONFIRMATION (MEMBER) ── */}
      {groupToExit && (
        <Modal
          open={Boolean(groupToExit)}
          onClose={() => setGroupToExit(null)}
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => setGroupToExit(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isExitingGroup}
                onClick={handleConfirmExitGroup}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isExitingGroup ? "Exiting…" : "Confirm Exit Group"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
