"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  UserPlus,
  UserCheck,
  Flag,
  UserX,
  AlertCircle,
  Shield,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Modal,
  Textarea,
} from "@stunet/ui";

interface ProfileData {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  campusName: string | null;
  email?: string | null;
  phone?: string | null;
}

interface Props {
  profile: ProfileData;
  isOwn: boolean;
  connectionStatus: "NONE" | "PENDING" | "ACCEPTED" | "SENT";
  connectionId: string | null;
  viewerId: string | null;
}

export default function ProfileClient({
  profile,
  isOwn,
  connectionStatus,
  connectionId,
  viewerId,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(connectionStatus);
  const [connId, setConnId] = useState(connectionId);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  async function handleConnect() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: profile.id }),
      });
      if (res.ok) {
        const data: { id: string } = await res.json();
        setConnId(data.id);
        setStatus("SENT");
      } else if (res.status === 409) {
        setStatus("SENT");
      } else {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to send connection request.");
      }
    } finally {
      setWorking(false);
    }
  }

  async function handleAccept() {
    if (!connId) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/connections/${connId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT" }),
      });
      if (res.ok) setStatus("ACCEPTED");
    } finally {
      setWorking(false);
    }
  }

  async function handleBlock() {
    if (
      !window.confirm(
        `Are you sure you want to block @${profile.username ?? profile.displayName}? This will also delete any mutual connection.`,
      )
    )
      return;
    setWorking(true);
    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: profile.id }),
      });
      if (res.ok) {
        router.push("/");
      } else {
        setError("Failed to block student.");
      }
    } finally {
      setWorking(false);
    }
  }

  async function handleSubmitReport() {
    setSubmittingReport(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "USER_PROFILE",
          reportedUserId: profile.id,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      });
      if (res.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportModalOpen(false);
          setReportSuccess(false);
          setReportDetails("");
        }, 1500);
      } else {
        alert("Failed to submit report. Please try again.");
      }
    } finally {
      setSubmittingReport(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cover and Profile Header */}
      <Card className="overflow-hidden border-slate-200/90 shadow-sm">
        {/* Banner */}
        <div className="h-32 sm:h-40 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:10px_10px]" />
        </div>

        <CardContent className="p-6 pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 mb-4">
            <div className="flex items-end gap-4">
              <div className="ring-4 ring-white rounded-full shadow-xl bg-white">
                <Avatar
                  src={profile.avatarUrl}
                  name={profile.displayName ?? profile.username}
                  size="xl"
                  online={true}
                />
              </div>

              <div className="mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    {profile.displayName ?? profile.username}
                  </h1>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <Badge variant="verified" className="text-[10px]">
                    Verified Student
                  </Badge>
                </div>

                <p className="text-xs text-slate-500">@{profile.username ?? "user"}</p>

                {profile.headline && (
                  <p className="text-xs text-slate-700 font-medium mt-1">{profile.headline}</p>
                )}

                {profile.campusName && (
                  <div className="flex items-center gap-1 text-[11px] text-indigo-700 font-medium mt-1">
                    <Building2 className="h-3 w-3" />
                    <span>{profile.campusName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isOwn && viewerId && (
              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                {status === "NONE" && (
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={handleConnect}
                    disabled={working}
                    className="gap-1.5 shadow-sm"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>{working ? "Connecting…" : "Connect"}</span>
                  </Button>
                )}

                {status === "SENT" && (
                  <Badge variant="pending" className="py-1 px-3 text-xs">
                    Invitation Sent
                  </Badge>
                )}

                {status === "PENDING" && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleAccept}
                    disabled={working}
                    className="gap-1.5"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Accept Request</span>
                  </Button>
                )}

                {status === "ACCEPTED" && (
                  <Badge variant="verified" className="py-1 px-3 text-xs">
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    <span>Connected</span>
                  </Badge>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReportModalOpen(true)}
                  className="text-slate-400 hover:text-rose-600 p-2"
                  title="Report Profile"
                >
                  <Flag className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBlock}
                  disabled={working}
                  className="text-slate-400 hover:text-rose-600 p-2"
                  title="Block User"
                >
                  <UserX className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 p-2.5 text-xs text-rose-600 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* About Section */}
      {profile.bio && (
        <Card className="border-slate-200/90 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              About
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contact Details (Privacy-Gated) */}
      {profile.email || profile.phone ? (
        <Card className="border-slate-200/90 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Verified Contact Information
            </CardTitle>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
              <Shield className="h-3 w-3" />
              <span>Visible by Privacy Setting</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            {profile.email && (
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <Mail className="h-4 w-4 text-indigo-500" />
                <span className="text-slate-500">Email:</span>
                <a
                  href={`mailto:${profile.email}`}
                  className="font-medium text-indigo-600 hover:underline"
                >
                  {profile.email}
                </a>
              </div>
            )}

            {profile.phone && (
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <Phone className="h-4 w-4 text-emerald-500" />
                <span className="text-slate-500">WhatsApp / Phone:</span>
                <span className="font-medium text-slate-800">{profile.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 text-xs text-slate-500 flex items-center gap-2">
          <Shield className="h-4 w-4 text-slate-400 shrink-0" />
          <span>
            Contact details are kept private and visible only to accepted connections or per student
            preferences.
          </span>
        </div>
      )}

      {/* Report Profile Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setReportSuccess(false);
          setReportDetails("");
        }}
        title="Report Student Profile"
        description="Flag inappropriate content, impersonation, or harassment."
        maxWidth="md"
      >
        {reportSuccess ? (
          <div className="py-6 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Report Submitted</h4>
            <p className="text-xs text-slate-500">
              Campus administration will investigate this profile promptly.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                Reason for reporting
              </label>
              <div className="space-y-1.5">
                {[
                  { value: "SPAM", label: "Spam or automated account" },
                  { value: "HARASSMENT", label: "Harassment or threatening conduct" },
                  { value: "IMPERSONATION", label: "Impersonating someone else" },
                  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate bio or imagery" },
                  { value: "OTHER", label: "Other violation of code of conduct" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2.5 rounded-xl border p-2 text-xs cursor-pointer ${
                      reportReason === option.value
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={option.value}
                      checked={reportReason === option.value}
                      onChange={() => setReportReason(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Additional context (optional)
              </label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Help us understand the issue…"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReportModalOpen(false)}
                disabled={submittingReport}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSubmitReport}
                disabled={submittingReport}
              >
                {submittingReport ? "Submitting…" : "Submit Report"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
