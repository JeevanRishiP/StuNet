"use client";

import React from "react";
import { Avatar, Button, Modal } from "@stunet/ui";
import type { GroupItem, ConnectionItem } from "../types";

export interface InviteConnectionsModalProps {
  open: boolean;
  group: GroupItem | null;
  onClose: () => void;
  connections: ConnectionItem[];
  invitedConnectionIds: Record<string, string[]>;
  onSendInvite: (group: GroupItem, member: ConnectionItem) => Promise<void>;
}

export function InviteConnectionsModal({
  open,
  group,
  onClose,
  connections,
  invitedConnectionIds,
  onSendInvite,
}: InviteConnectionsModalProps) {
  if (!group) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Invite Connected Peers • ${group.name}`}
      className="max-w-md"
    >
      <div className="space-y-3 pt-2 text-xs">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          You can invite peers who are connected with you on StuNet to join this group.
        </p>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {connections.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              You don&apos;t have any connected peers yet. Connect with students to invite them to
              this group.
            </div>
          ) : (
            connections.map((conn) => {
              const alreadyMember = group.members.some(
                (m) => m.name === conn.name || (conn.userId && m.id === conn.userId),
              );
              const invitedList = invitedConnectionIds[group.id] || [];
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
                      onClick={() => onSendInvite(group, conn)}
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
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
