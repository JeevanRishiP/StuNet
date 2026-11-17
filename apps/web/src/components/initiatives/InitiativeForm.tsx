"use client";

import React, { useState } from "react";
import { Button, Modal } from "@stunet/ui";

export interface InitiativeFormProps {
  type: "company" | "project";
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InitiativeForm({ type, isOpen, onClose, onSuccess }: InitiativeFormProps) {
  const isComp = type === "company";

  // Shared / Company Fields
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");

  // Company Specific
  const [stage, setStage] = useState("IDEA");
  const [revenue, setRevenue] = useState(0);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [hiring, setHiring] = useState(false);

  // Project Specific
  const [githubUrl, setGithubUrl] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [isOpenContributors, setIsOpenContributors] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setTagline("");
    setDescription("");
    setStage("IDEA");
    setRevenue(0);
    setWebsiteUrl("");
    setLinkedinUrl("");
    setHiring(false);
    setGithubUrl("");
    setPrimaryLanguage("");
    setIsOpenContributors(true);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(`${isComp ? "Company" : "Project"} name is required.`);
      return;
    }

    if (!isComp && !githubUrl.trim()) {
      setError("GitHub repository URL is required for open source projects.");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = isComp ? "/api/initiatives/companies" : "/api/initiatives/projects";

      const payload = isComp
        ? {
            name: name.trim(),
            tagline: tagline.trim() || undefined,
            description: description.trim() || undefined,
            stage,
            verifiedRevenue: Number(revenue) || 0,
            websiteUrl: websiteUrl.trim() || undefined,
            linkedinUrl: linkedinUrl.trim() || undefined,
            hiringStatus: hiring,
          }
        : {
            name: name.trim(),
            githubUrl: githubUrl.trim(),
            primaryLanguage: primaryLanguage.trim() || undefined,
            tagline: tagline.trim() || undefined,
            description: description.trim() || undefined,
            isOpenForContributors: isOpenContributors,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to register ${type}`);
      }

      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isComp ? "Register New Company or Startup" : "Register Open Source Project"}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            {isComp ? "Company Name *" : "Project Name *"}
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isComp ? "e.g. NeuralWave Technologies" : "e.g. StuNet Engine"}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
          />
        </div>

        {!isComp && (
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              GitHub Repository URL *
            </label>
            <input
              type="url"
              required
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/organization/repo"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>
        )}

        {!isComp && (
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Primary Language
            </label>
            <input
              type="text"
              value={primaryLanguage}
              onChange={(e) => setPrimaryLanguage(e.target.value)}
              placeholder="e.g. TypeScript, Rust, Python"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Tagline
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder={
              isComp
                ? "e.g. Next-gen AI agent orchestration for healthcare"
                : "e.g. Fast, light, type-safe API framework"
            }
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
          />
        </div>

        {isComp && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              >
                <option value="IDEA">Idea Stage</option>
                <option value="PROTOTYPE">Prototype / MVP</option>
                <option value="EARLY_TRACTION">Early Traction</option>
                <option value="GROWTH">Growth / Revenue Generating</option>
                <option value="SCALING">Scaling / Funded</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Annual Revenue (INR)
              </label>
              <input
                type="number"
                min={0}
                value={revenue}
                onChange={(e) => setRevenue(Number(e.target.value))}
                placeholder="0"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isComp
                ? "Briefly describe what your startup does, your mission, and the problem you solve…"
                : "Explain what the project does and how student contributors can participate…"
            }
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
          />
        </div>

        {isComp ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Website URL
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://mycompany.com"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                LinkedIn Page
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/company/…"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="initiativeFormStatus"
            checked={isComp ? hiring : isOpenContributors}
            onChange={(e) =>
              isComp ? setHiring(e.target.checked) : setIsOpenContributors(e.target.checked)
            }
            className={`rounded ${isComp ? "text-indigo-600 focus:ring-indigo-500" : "text-emerald-600 focus:ring-emerald-500"}`}
          />
          <label
            htmlFor="initiativeFormStatus"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {isComp
              ? "Actively hiring team members or interns"
              : "Open for student contributors & PRs"}
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || !name.trim() || (!isComp && !githubUrl.trim())}
            className={isComp ? "bg-indigo-600 text-white" : "bg-emerald-600 text-white"}
          >
            {submitting ? "Registering…" : isComp ? "Register Company" : "Register Project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
