"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Modal } from "@stunet/ui";
import type { GroupItem } from "../types";

export interface DeleteGroupModalProps {
  group: GroupItem | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteGroupModal({ group, isDeleting, onClose, onConfirm }: DeleteGroupModalProps) {
  if (!group) return null;

  return (
    <Modal
      open={Boolean(group)}
      onClose={onClose}
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
              <strong className="text-rose-900 dark:text-rose-100">{group.name}</strong> (#
              {group.code})? All group memberships, records, and join requests will be erased from
              the database.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
          >
            {isDeleting ? "Deleting…" : "Permanently Delete Group"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
