export interface InviteItem {
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

export interface ConnectionItem {
  id: string;
  userId?: string;
  name: string;
  username: string;
  headline?: string;
  avatarUrl?: string;
  campus?: string;
  connectedSince?: string;
}

export interface ConnectionRequestItem {
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

export interface GroupMemberItem {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: "ADMIN" | "MEMBER";
  joinedAt?: string;
}

export interface GroupJoinRequestItem {
  id: string;
  userId: string;
  userName: string;
  userHeadline?: string;
  userAvatar?: string;
  purpose?: string;
  requestedAt: string;
}

export interface GroupItem {
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

export interface NetworkNotification {
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
