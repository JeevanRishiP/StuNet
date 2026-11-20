"use client";

import { useEffect, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Plus,
  MapPin,
  Clock,
  ExternalLink,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Tag,
  Sparkles,
} from "lucide-react";

interface CampusEventItem {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  endDate: string | null;
  eventType: string;
  isPublic: boolean;
  campusId: string;
  campus?: {
    id: string;
    name: string;
    city: string;
  };
}

interface CampusOption {
  id: string;
  name: string;
  city: string;
}

const EVENT_CATEGORIES = [
  "Technical Fest",
  "Workshop",
  "Hackathon",
  "Guest Lecture / Seminar",
  "Sports Tournament",
  "Placement & Career Drive",
  "Cultural & Arts Fest",
  "Orientation & Induction",
  "General Management Event",
];

export default function EventsManagementPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<CampusEventItem[]>([]);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(EVENT_CATEGORIES[0]);
  const [eventDate, setEventDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // Edit Modal State
  const [editingEvent, setEditingEvent] = useState<CampusEventItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState(EVENT_CATEGORIES[0]);
  const [editEventDate, setEditEventDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRegistrationUrl, setEditRegistrationUrl] = useState("");

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const managedCampusId = (session?.user as any)?.managedCampusId;

  // Initial Load: Fetch Campuses & Events
  useEffect(() => {
    async function init() {
      try {
        const campRes = await fetch("/api/campuses");
        if (campRes.ok) {
          const campData = await campRes.json();
          const list: CampusOption[] = campData.campuses || [];
          setCampuses(list);

          const defaultId = managedCampusId || list[0]?.id || "";
          setSelectedCampusId(defaultId);
          loadEvents(defaultId);
        }
      } catch (err) {
        console.error("Failed to load campuses:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [managedCampusId]);

  async function loadEvents(campusId?: string) {
    const cid = campusId || selectedCampusId;
    if (!cid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events?campusId=${encodeURIComponent(cid)}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleCampusChange(cid: string) {
    setSelectedCampusId(cid);
    loadEvents(cid);
  }

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  // Parse structured metadata from description string
  function parseEventMeta(desc: string | null) {
    if (!desc) return { category: "General", venue: "Campus Grounds", link: null, details: "" };
    const parts = desc.split(" | ");
    let cat = "Management Event";
    let ven = "Main Campus";
    let link: string | null = null;
    let det = desc;

    for (const p of parts) {
      if (p.startsWith("Category: ")) cat = p.replace("Category: ", "");
      else if (p.startsWith("Venue: ")) ven = p.replace("Venue: ", "");
      else if (p.startsWith("Link: ")) link = p.replace("Link: ", "");
      else if (p.startsWith("Details: ")) det = p.replace("Details: ", "");
    }
    return { category: cat, venue: ven, link, details: det };
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCampusId || !title.trim() || !eventDate) {
      notify("Please fill in all required fields.", "error");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campusId: selectedCampusId,
            title: title.trim(),
            category,
            eventDate,
            endDate: endDate || null,
            venue: venue.trim() || null,
            description: description.trim() || null,
            registrationUrl: registrationUrl.trim() || null,
            isPublic,
          }),
        });

        if (res.ok) {
          notify("✓ Campus Management Event published successfully!");
          setTitle("");
          setVenue("");
          setDescription("");
          setRegistrationUrl("");
          setEventDate("");
          setEndDate("");
          loadEvents(selectedCampusId);
        } else {
          const err = await res.json();
          notify(err.error || "Failed to create event", "error");
        }
      } catch (err) {
        notify("Network error creating event", "error");
      }
    });
  }

  function openEditModal(event: CampusEventItem) {
    setEditingEvent(event);
    setEditTitle(event.title);
    const meta = parseEventMeta(event.description);
    setEditCategory(meta.category);
    setEditVenue(meta.venue === "Main Campus" ? "" : meta.venue);
    setEditRegistrationUrl(meta.link || "");
    setEditDescription(meta.details === event.description ? event.description || "" : meta.details);
    try {
      const d = new Date(event.eventDate);
      setEditEventDate(d.toISOString().slice(0, 16));
    } catch {
      setEditEventDate("");
    }
    if (event.endDate) {
      try {
        const ed = new Date(event.endDate);
        setEditEndDate(ed.toISOString().slice(0, 16));
      } catch {
        setEditEndDate("");
      }
    } else {
      setEditEndDate("");
    }
  }

  async function handleUpdateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent || !editTitle.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/events", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingEvent.id,
            title: editTitle.trim(),
            category: editCategory,
            eventDate: editEventDate,
            endDate: editEndDate || null,
            venue: editVenue.trim() || null,
            description: editDescription.trim() || null,
            registrationUrl: editRegistrationUrl.trim() || null,
          }),
        });

        if (res.ok) {
          notify("✓ Event updated successfully!");
          setEditingEvent(null);
          loadEvents(selectedCampusId);
        } else {
          const err = await res.json();
          notify(err.error || "Failed to update event", "error");
        }
      } catch {
        notify("Network error updating event", "error");
      }
    });
  }

  async function handleDeleteEvent(id: string, eventTitle: string) {
    if (!confirm(`Are you sure you want to delete "${eventTitle}"?`)) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/events?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });

        if (res.ok) {
          notify("✓ Event deleted successfully.");
          loadEvents(selectedCampusId);
        } else {
          const err = await res.json();
          notify(err.error || "Failed to delete event", "error");
        }
      } catch {
        notify("Network error deleting event", "error");
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── HEADER & CAMPUS CONTEXT ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Calendar className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              Campus Management Console
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Events Management</h1>
          <p className="text-xs text-slate-400">
            Publish, schedule, and curate institutional events arranged by campus administration &
            management.
          </p>
        </div>

        {/* Campus Scope Selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 self-start md:self-auto">
          <Building2 className="h-4 w-4 text-slate-400" />
          {isSuperAdmin ? (
            <select
              value={selectedCampusId}
              onChange={(e) => handleCampusChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-semibold text-white">
              {campuses.find((c) => c.id === selectedCampusId)?.name || "Active Campus"}
            </span>
          )}
        </div>
      </div>

      {/* ── NOTIFICATION TOAST ── */}
      {message && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold animate-in fade-in ${
            message.type === "success"
              ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-300"
              : "bg-rose-950/60 border-rose-800/80 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── PUBLISH EVENT FORM ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>Publish New Management Event</span>
          </h2>
          <span className="text-[10px] text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full font-mono">
            Direct Database Sync
          </span>
        </div>

        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Event Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                placeholder="e.g. Annual Tech Summit 2026 / Campus Hackathon"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Event Category <span className="text-rose-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Start Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Start Date & Time <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Event End Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                End Date & Time <span className="text-slate-500 text-[10px]">(Optional)</span>
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Venue / Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Venue / Room Location <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                placeholder="e.g. Main Auditorium / Lab 3 / Sports Complex"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Registration URL */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Registration / Information URL{" "}
                <span className="text-slate-500 text-[10px]">(Optional)</span>
              </label>
              <input
                type="url"
                maxLength={500}
                placeholder="https://learning.ccbp.in/... or registration form link"
                value={registrationUrl}
                onChange={(e) => setRegistrationUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Description / Agenda */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Event Description & Agenda
              </label>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Detailed itinerary, rules, eligibility, and chief guest announcements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Arranged by: <strong className="text-slate-200">Campus Management</strong>
            </span>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{isPending ? "Publishing…" : "Publish Event to Student Portal"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── EXISTING MANAGEMENT EVENTS LIST ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-400" />
            <span>Active Management Events ({events.length})</span>
          </h2>
          <span className="text-xs text-slate-400">
            Displayed in Student App &quot;Upcoming Events&quot;
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">
            Loading events from database…
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-2">
            <Calendar className="h-8 w-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Management Events Scheduled</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Use the form above to publish campus-wide fests, hackathons, seminars, or placement
              events arranged by the management.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((ev) => {
              const meta = parseEventMeta(ev.description);
              const d = new Date(ev.eventDate);
              const isPast = d < new Date();

              return (
                <div
                  key={ev.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md group"
                >
                  <div className="space-y-3">
                    {/* Header tags */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400">
                        <Tag className="h-2.5 w-2.5" />
                        <span>{meta.category}</span>
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isPast
                            ? "bg-slate-800 text-slate-400"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {isPast ? "Past" : "Upcoming"}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {ev.title}
                    </h3>

                    {/* Metadata */}
                    <div className="space-y-1.5 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span>
                          {d.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        <span className="line-clamp-1">{meta.venue}</span>
                      </div>

                      {meta.details && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 pt-1 border-t border-slate-800/80">
                          {meta.details}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-800 text-xs">
                    <div>
                      {meta.link ? (
                        <a
                          href={meta.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 underline"
                        >
                          <span>Register</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-500">Management Official</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(ev)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Edit Event"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id, ev.title)}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 border border-rose-800/40 transition-colors"
                        title="Delete Event"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── EDIT EVENT MODAL ── */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-indigo-400" />
                <span>Edit Management Event</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateEvent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Event Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  >
                    {EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Venue</label>
                  <input
                    type="text"
                    value={editVenue}
                    onChange={(e) => setEditVenue(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Registration URL
                </label>
                <input
                  type="url"
                  value={editRegistrationUrl}
                  onChange={(e) => setEditRegistrationUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow"
                >
                  {isPending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
