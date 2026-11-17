"use client";

import React, { useState } from "react";
import { Users, Layers, X } from "lucide-react";
import { Button, Modal } from "@stunet/ui";
import type { NetworkNotification, GroupJoinRequestItem } from "./types";

export interface NetworkNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NetworkNotification[];
  onIgnoreNotification: (notifId: string, connId?: string, actorUsername?: string) => Promise<void>;
  onAcceptConnectionNotification: (
    notifId: string,
    connId?: string,
    actorName?: string,
    actorUsername?: string,
  ) => Promise<void>;
  onDeclineJoinRequest: (groupId: string, reqId: string) => Promise<void>;
  onAcceptJoinRequest: (groupId: string, req: GroupJoinRequestItem) => Promise<void>;
  onDeclineGroupInvite: (notifId: string) => Promise<void>;
  onAcceptGroupInvite: (notifId: string, groupId?: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
}

export function NetworkNotificationsModal({
  isOpen,
  onClose,
  notifications,
  onIgnoreNotification,
  onAcceptConnectionNotification,
  onDeclineJoinRequest,
  onAcceptJoinRequest,
  onDeclineGroupInvite,
  onAcceptGroupInvite,
  onMarkAllAsRead,
}: NetworkNotificationsModalProps) {
  const [notificationTab, setNotificationTab] = useState<"ALL" | "CONNECTION" | "GROUP">("ALL");

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Network & Group Notifications"
      className="max-w-lg"
    >
      <div className="space-y-3 pt-2 text-xs">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setNotificationTab("ALL")}
            className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
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
            className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
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
            className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
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
                    onClick={() => onIgnoreNotification(notif.id)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
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
                            onIgnoreNotification(
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
                            onAcceptConnectionNotification(
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
                              void onDeclineJoinRequest(notif.groupId, notif.actionData.requestId);
                            }
                            void onIgnoreNotification(notif.id);
                          }}
                          className="text-[10px] py-1 px-2.5 text-rose-600 dark:text-rose-400"
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (notif.groupId && notif.actionData?.requestId) {
                              void onAcceptJoinRequest(notif.groupId, {
                                id: notif.actionData.requestId,
                                userId: "usr-req",
                                userName: notif.actor.name,
                                requestedAt: notif.timestamp,
                              });
                            }
                            void onIgnoreNotification(notif.id);
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
                          onClick={() => onDeclineGroupInvite(notif.id)}
                          className="text-[10px] py-1 px-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onAcceptGroupInvite(notif.id, notif.groupId)}
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
                        onClick={() => onIgnoreNotification(notif.id)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
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
                        onClick={() => onIgnoreNotification(notif.id)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
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
            onClick={onMarkAllAsRead}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Mark all as read
          </button>
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
