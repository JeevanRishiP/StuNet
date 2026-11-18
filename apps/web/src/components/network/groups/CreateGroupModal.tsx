"use client";

import React from "react";
import { Shield, RefreshCw } from "lucide-react";
import { Button, Modal } from "@stunet/ui";

export interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  code: string;
  onRefreshCode: () => void;
  name: string;
  onChangeName: (val: string) => void;
  purpose: string;
  onChangePurpose: (val: string) => void;
  whatsapp: string;
  onChangeWhatsapp: (val: string) => void;
  visibility: "PUBLIC" | "REQUEST_REQUIRED";
  onChangeVisibility: (val: "PUBLIC" | "REQUEST_REQUIRED") => void;
  hideMembers: boolean;
  onChangeHideMembers: (val: boolean) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function CreateGroupModal({
  open,
  onClose,
  code,
  onRefreshCode,
  name,
  onChangeName,
  purpose,
  onChangePurpose,
  whatsapp,
  onChangeWhatsapp,
  visibility,
  onChangeVisibility,
  hideMembers,
  onChangeHideMembers,
  onSubmit,
}: CreateGroupModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Campus Collaboration Group"
      className="max-w-md"
    >
      <form onSubmit={onSubmit} className="space-y-3.5 pt-2 text-xs">
        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Group ID (Auto-Generated 4-Digit ID)
          </label>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono font-black text-sm text-indigo-700 dark:text-indigo-400 tracking-wider flex-1 border border-slate-200 dark:border-slate-700">
              #{code}
            </div>
            <button
              type="button"
              onClick={onRefreshCode}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Generate new 4-digit ID"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            A 4-digit numeric ID assigned to your group for quick campus searches.
          </p>
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Group Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="e.g., Autonomous AI & Agents Guild"
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Purpose & Description
          </label>
          <textarea
            rows={3}
            required
            value={purpose}
            onChange={(e) => onChangePurpose(e.target.value)}
            placeholder="State what this group is for and how members will collaborate…"
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800 resize-none"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Official WhatsApp Group Link
          </label>
          <input
            type="url"
            required
            value={whatsapp}
            onChange={(e) => onChangeWhatsapp(e.target.value)}
            placeholder="https://chat.whatsapp.com/…"
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-800"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
            Group Type & WhatsApp Link Access
          </label>
          <div className="space-y-2">
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors">
              <input
                type="radio"
                name="group-visibility"
                checked={visibility === "PUBLIC"}
                onChange={() => onChangeVisibility("PUBLIC")}
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
                checked={visibility === "REQUEST_REQUIRED"}
                onChange={() => onChangeVisibility("REQUEST_REQUIRED")}
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

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideMembers}
              onChange={(e) => onChangeHideMembers(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Hide group members from showing for non-members
            </span>
          </label>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 pl-6">
            Non-members who are just viewing group details will only see the group admin, name, and
            purpose.
          </p>
        </div>

        <div className="p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[10px] text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Group admin (You) will always be visible to everyone.</span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            type="submit"
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
          >
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
}
