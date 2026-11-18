"use client";

import React from "react";
import { Button, Modal } from "@stunet/ui";
import type { GroupItem } from "../types";

export interface EditGroupSettingsModalProps {
  open: boolean;
  group: GroupItem | null;
  onClose: () => void;
  onChangeGroup: (group: GroupItem | null) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function EditGroupSettingsModal({
  open,
  group,
  onClose,
  onChangeGroup,
  onSubmit,
}: EditGroupSettingsModalProps) {
  if (!group) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit Settings • ${group.name}`}
      className="max-w-md"
    >
      <form onSubmit={onSubmit} className="space-y-3 pt-2 text-xs">
        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Group ID
          </label>
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono font-bold text-slate-700 dark:text-slate-300">
            #{group.code}
          </div>
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Group Name
          </label>
          <input
            type="text"
            required
            value={group.name}
            onChange={(e) => onChangeGroup({ ...group, name: e.target.value })}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Purpose</label>
          <textarea
            rows={2}
            required
            value={group.purpose}
            onChange={(e) => onChangeGroup({ ...group, purpose: e.target.value })}
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
            value={group.whatsappLink}
            onChange={(e) => onChangeGroup({ ...group, whatsappLink: e.target.value })}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            WhatsApp Link Privacy
          </label>
          <select
            value={group.visibility}
            onChange={(e) =>
              onChangeGroup({
                ...group,
                visibility: e.target.value as "PUBLIC" | "REQUEST_REQUIRED",
              })
            }
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-bold"
          >
            <option value="PUBLIC">Public Group (Direct WhatsApp Link)</option>
            <option value="REQUEST_REQUIRED">Publicly Listed (Request Required for Link)</option>
          </select>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={group.hideMembersFromNonMembers}
              onChange={(e) =>
                onChangeGroup({
                  ...group,
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
          <Button type="button" variant="ghost" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            type="submit"
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
          >
            Save Settings
          </Button>
        </div>
      </form>
    </Modal>
  );
}
