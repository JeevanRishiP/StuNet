"use client";

import React from "react";
import { Button, Modal } from "@stunet/ui";
import type { GroupItem, GroupJoinRequestItem } from "../types";

export interface GroupRequestsModalProps {
  open: boolean;
  group: GroupItem | null;
  onClose: () => void;
  onAccept: (groupId: string, req: GroupJoinRequestItem) => Promise<void>;
  onDecline: (groupId: string, reqId: string) => Promise<void>;
}

export function GroupRequestsModal({
  open,
  group,
  onClose,
  onAccept,
  onDecline,
}: GroupRequestsModalProps) {
  if (!group) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Join Requests • ${group.name}`}
      className="max-w-md"
    >
      <div className="space-y-3 pt-2 text-xs">
        {!group.pendingRequests || group.pendingRequests.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            No pending join requests for this group.
          </div>
        ) : (
          group.pendingRequests.map((req) => (
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
                    onClick={() => onDecline(group.id, req.id)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => onAccept(group.id, req)}
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
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
