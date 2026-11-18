"use client";

import React from "react";
import { Button, Modal } from "@stunet/ui";
import type { GroupItem } from "../types";

export interface JoinGroupModalProps {
  open: boolean;
  targetGroup: GroupItem | null;
  joinCode: string;
  onChangeJoinCode: (val: string) => void;
  joinPurpose: string;
  onChangeJoinPurpose: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function JoinGroupModal({
  open,
  targetGroup,
  joinCode,
  onChangeJoinCode,
  joinPurpose,
  onChangeJoinPurpose,
  onClose,
  onSubmit,
}: JoinGroupModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={targetGroup ? `Join ${targetGroup.name}` : "Join Group by 4-Digit Code"}
      className="max-w-md"
    >
      <form onSubmit={onSubmit} className="space-y-3.5 pt-2 text-xs">
        {!targetGroup && (
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Enter 4-Digit Group ID
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={joinCode}
              onChange={(e) => onChangeJoinCode(e.target.value)}
              placeholder="e.g., 4218 or 1042"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800 font-mono font-bold text-sm tracking-wider"
            />
          </div>
        )}

        {targetGroup && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-900 dark:text-slate-100">
                {targetGroup.name}
              </span>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                Admin: {targetGroup.adminName}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">{targetGroup.purpose}</p>
          </div>
        )}

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Introduction & Purpose of Joining
          </label>
          <textarea
            rows={3}
            required
            value={joinPurpose}
            onChange={(e) => onChangeJoinPurpose(e.target.value)}
            placeholder="Tell the group admin about your background and how you plan to participate…"
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} className="text-xs">
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
  );
}
