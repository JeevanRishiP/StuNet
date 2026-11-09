"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  Users,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Search,
  GraduationCap,
  Building2,
  AlertCircle,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@stunet/ui";

interface RosterEntry {
  id: string;
  email: string;
  role: "STUDENT" | "FACULTY";
  identifier: string;
  campusId: string;
  currentCourseYear?: number | null;
  joinedYear?: number | null;
  graduationYear?: number | null;
  isClaimed: boolean;
  createdAt: string;
  campus: { id: string; name: string; slug: string };
}

interface CampusOption {
  id: string;
  name: string;
  slug: string;
}

export default function RosterPage(): React.JSX.Element {
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [stats, setStats] = useState({ total: 0, unclaimed: 0, claimed: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [claimedFilter, setClaimedFilter] = useState<string>("ALL");

  // Import Drawer / Form state
  const [showImport, setShowImport] = useState(false);
  const [selectedCampusId, setSelectedCampusId] = useState<string>("");
  const [csvContent, setCsvContent] = useState<string>("");
  const [importStatus, setImportStatus] = useState<{
    success?: boolean;
    insertedCount?: number;
    skippedCount?: number;
    errors?: string[];
  } | null>(null);
  const [isImporting, startImportTransition] = useTransition();

  // Load campuses
  useEffect(() => {
    async function loadCampuses() {
      try {
        const res = await fetch("/api/campuses");
        if (res.ok) {
          const data = (await res.json()) as CampusOption[] | { items: CampusOption[] };
          const list = Array.isArray(data) ? data : data.items || [];
          setCampuses(list);
          if (list.length > 0 && !selectedCampusId && list[0]?.id) {
            setSelectedCampusId(list[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load campuses", err);
      }
    }
    loadCampuses();
  }, [selectedCampusId]);

  // Load roster entries
  const fetchRoster = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (claimedFilter !== "ALL") params.set("claimed", claimedFilter);

      const res = await fetch(`/api/roster?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setEntries(json.items || []);
        setStats(json.stats || { total: 0, unclaimed: 0, claimed: 0 });
      }
    } catch (err) {
      console.error("Failed to load roster", err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, claimedFilter]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Handle CSV Import Submit
  function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!csvContent.trim()) return;

    startImportTransition(async () => {
      setImportStatus(null);
      try {
        const res = await fetch("/api/roster", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csvText: csvContent,
            defaultCampusId: selectedCampusId,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setImportStatus({
            success: true,
            insertedCount: data.insertedCount,
            skippedCount: data.skippedCount,
            errors: data.errors,
          });
          setCsvContent("");
          fetchRoster();
        } else {
          setImportStatus({
            success: false,
            errors: [data.error || "Failed to process roster CSV"],
          });
        }
      } catch {
        setImportStatus({
          success: false,
          errors: ["Network error while importing roster"],
        });
      }
    });
  }

  // Pre-fill sample CSV template
  function fillSampleStudentCsv() {
    const campusId = selectedCampusId || campuses[0]?.id || "CAMPUS_ID";
    setCsvContent(
      `email,role,identifier,campus_id,current_course_year,joined_year,graduation_year\n` +
        `rohan.student@svyasa-sas.edu.in,STUDENT,2102508579,${campusId},3,2021,2025\n` +
        `dr.sharma.faculty@svyasa-sas.edu.in,FACULTY,FAC-0492,${campusId},,2018,\n` +
        `priya.patel@svyasa-sas.edu.in,STUDENT,2202508112,${campusId},2,2022,2026`,
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Module 11
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-indigo-400" />
              <span>Institutional Roster & Import</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pre-load verified Student USNs and Faculty Employee IDs before they log in via Google
            OAuth.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRoster}
            className="text-xs border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowImport(!showImport)}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
          >
            {showImport ? (
              <span>Close Import Box</span>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                <span>Bulk Import Roster</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Total Roster Entries</p>
              <p className="text-2xl font-extrabold text-white mt-1">{stats.total}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-400">Unclaimed Accounts</p>
              <p className="text-2xl font-extrabold text-amber-300 mt-1">{stats.unclaimed}</p>
              <p className="text-[10px] text-slate-500">Awaiting first Google login</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-400">Claimed & Active</p>
              <p className="text-2xl font-extrabold text-emerald-300 mt-1">{stats.claimed}</p>
              <p className="text-[10px] text-slate-500">Verified institutional users</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collapsible CSV Import Form */}
      {showImport && (
        <Card className="bg-slate-900/95 border-indigo-500/30 shadow-lg">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-indigo-400" />
              <span>Bulk Roster Import (CSV Format)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Campus
                </label>
                <select
                  value={selectedCampusId}
                  onChange={(e) => setSelectedCampusId(e.target.value)}
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Default campus applied if campus_id column is omitted in CSV rows.
                </p>
              </div>

              <div className="flex items-end justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fillSampleStudentCsv}
                  className="text-xs border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                  <span>Insert Sample CSV Template</span>
                </Button>
              </div>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Paste CSV Data (Header: email, role, identifier, campus_id, current_course_year,
                  joined_year, graduation_year)
                </label>
                <textarea
                  rows={6}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder={`email,role,identifier,campus_id,current_course_year,joined_year,graduation_year\nstudent@campus.edu.in,STUDENT,USN12345,${selectedCampusId},3,2021,2025\nprof@campus.edu.in,FACULTY,FAC991,${selectedCampusId},,2017,`}
                  className="w-full text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {importStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    importStatus.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}
                >
                  {importStatus.success ? (
                    <div className="space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>Roster import completed successfully!</span>
                      </p>
                      <p>
                        Imported: <strong>{importStatus.insertedCount}</strong> entries | Skipped:{" "}
                        {importStatus.skippedCount}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-rose-400" />
                        <span>Roster import encountered errors</span>
                      </p>
                      {importStatus.errors?.map((err, i) => (
                        <p key={i} className="text-[11px] text-rose-400">
                          • {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isImporting || !csvContent.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5"
                >
                  {isImporting ? "Processing Roster..." : "Execute Bulk Import"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="bg-slate-900/90 border-slate-800">
        <CardContent className="p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email, USN, or Employee ID…"
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Student Only</option>
                <option value="FACULTY">Faculty Only</option>
              </select>

              <select
                value={claimedFilter}
                onChange={(e) => setClaimedFilter(e.target.value)}
                className="text-xs bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Claim Statuses</option>
                <option value="false">Unclaimed (Pending Login)</option>
                <option value="true">Claimed (Active)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roster Entries Table */}
      <Card className="bg-slate-900/90 border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold">
                <th className="py-3 px-4">Institutional Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Identifier (USN / EmpID)</th>
                <th className="py-3 px-4">Campus</th>
                <th className="py-3 px-4">Academic Details</th>
                <th className="py-3 px-4">Claim Status</th>
                <th className="py-3 px-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading institutional roster…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No roster entries found. Click &quot;Bulk Import Roster&quot; to upload student
                    USNs and faculty employee IDs.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-white">{entry.email}</td>
                    <td className="py-3 px-4">
                      {entry.role === "FACULTY" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Building2 className="h-3 w-3" />
                          <span>FACULTY</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <GraduationCap className="h-3 w-3" />
                          <span>STUDENT</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200">{entry.identifier}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <span>{entry.campus?.name}</span>
                      <span className="text-[10px] text-slate-500 block">
                        @{entry.campus?.slug}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {entry.role === "STUDENT" ? (
                        <span>
                          {entry.currentCourseYear ? `Year ${entry.currentCourseYear}` : "Year —"}
                          {entry.joinedYear && ` · Class of ${entry.joinedYear}`}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {entry.isClaimed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span>Claimed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Clock className="h-3 w-3 text-amber-400" />
                          <span>Unclaimed</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
