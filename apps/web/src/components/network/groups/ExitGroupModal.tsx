"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { Button, Modal } from "@stunet/ui";
import type { GroupItem } from "../types";

export interface ExitGroupModalProps {
  group: GroupItem | null;
  isExiting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ExitGroupModal({ group, isExiting, onClose, onConfirm }: ExitGroupModalProps) {
  if (!group) return null;

  return (
    <Modal open={Boolean(group)} onClose={onClose} title="Exit Campus Group" className="max-w-md">
      <div className="space-y-4 pt-2 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
          <LogOut className="h-5 w-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-slate-900 dark:text-slate-100">Leave group membership</p>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Are you sure you want to leave{" "}
              <strong className="text-slate-900 dark:text-slate-100">{group.name}</strong> (#
              {group.code})? You will lose access to the group WhatsApp chat link and member roster.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isExiting}
            onClick={onConfirm}
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
          >
            {isExiting ? "Exiting…" : "Confirm Exit Group"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
