"use client";

import { useState, useEffect } from "react";
import { Calendar, MapPin, Clock, Plus, Laptop } from "lucide-react";
import { Button, Card, Modal } from "@stunet/ui";

interface EventItem {
  id: string;
  name: string;
  description?: string | null;
  mode: "ONLINE" | "OFFLINE";
  type: "HACKATHON" | "COMPETITION" | "WORKSHOP" | "MEETUP";
  eventDate: string;
  registrationDeadline?: string | null;
  location?: string | null;
  organizer: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    role: string;
    campus?: { name: string } | null;
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [modeFilter, setModeFilter] = useState<"ALL" | "ONLINE" | "OFFLINE">("ALL");
  const [typeFilter, setTypeFilter] = useState<
    "ALL" | "HACKATHON" | "COMPETITION" | "WORKSHOP" | "MEETUP"
  >("ALL");

  // Create Event Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [type, setType] = useState<"HACKATHON" | "COMPETITION" | "WORKSHOP" | "MEETUP">(
    "HACKATHON",
  );
  const [eventDate, setEventDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchEvents();
  }, [modeFilter, typeFilter]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (modeFilter !== "ALL") params.append("mode", modeFilter);
      if (typeFilter !== "ALL") params.append("type", typeFilter);
      const res = await fetch(`/api/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.items ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch events", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !eventDate) return;
    if (mode === "OFFLINE" && !location.trim()) {
      setFormError("Location is required for offline events.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          mode,
          type,
          eventDate: new Date(eventDate).toISOString(),
          registrationDeadline: registrationDeadline
            ? new Date(registrationDeadline).toISOString()
            : undefined,
          location: mode === "OFFLINE" ? location.trim() : undefined,
        }),
      });

      if (res.ok) {
        setCreateModalOpen(false);
        setName("");
        setDescription("");
        setEventDate("");
        setRegistrationDeadline("");
        setLocation("");
        fetchEvents();
      } else {
        const d = await res.json();
        setFormError(d.error ?? "Failed to publish event.");
      }
    } catch {
      setFormError("Network error publishing event.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6 space-y-5">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Platform-Wide Events
              </h1>
              <p className="text-xs text-slate-500">
                Hackathons, competitions, workshops, and student developer meetups across campuses.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-2xs shrink-0 self-start sm:self-auto font-bold py-2.5 px-4"
        >
          <Plus className="h-4 w-4" />
          <span>+ Host Event</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs text-xs">
        {/* Type Filters */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {(["ALL", "HACKATHON", "COMPETITION", "WORKSHOP", "MEETUP"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full font-bold transition-all whitespace-nowrap ${
                typeFilter === t
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t === "ALL" ? "All Types" : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Mode Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl font-bold">
          {(["ALL", "ONLINE", "OFFLINE"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModeFilter(m)}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                modeFilter === m ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
              }`}
            >
              {m === "ALL" ? "All Modes" : m === "ONLINE" ? "🌐 Online" : "📍 In-Person"}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading events…</div>
      ) : events.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-2">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-800">No upcoming events matching filters</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Host a hackathon, peer workshop, or developer competition for the university community.
          </p>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white mt-3"
          >
            Host the First Event
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((evt) => {
            const dateObj = new Date(evt.eventDate);
            const dateFormatted = dateObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const timeFormatted = dateObj.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Card
                key={evt.id}
                className="border-slate-200/90 shadow-2xs p-5 space-y-3.5 hover:border-slate-300 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                        evt.type === "HACKATHON"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : evt.type === "COMPETITION"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : evt.type === "WORKSHOP"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {evt.type}
                    </span>

                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      {evt.mode === "ONLINE" ? (
                        <>
                          <Laptop className="h-3 w-3 text-emerald-600" />
                          <span>Online Stream</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3 w-3 text-rose-500" />
                          <span>{evt.location || "Campus Venue"}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">{evt.name}</h3>

                  {evt.description && (
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {evt.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-indigo-600" />
                      <span>
                        {dateFormatted} · {timeFormatted}
                      </span>
                    </div>

                    {evt.registrationDeadline && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Deadline:{" "}
                        {new Date(evt.registrationDeadline).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[10px] font-bold">
                        {evt.organizer.avatarUrl ? (
                          <img
                            src={evt.organizer.avatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          evt.organizer.displayName[0]
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-600">
                        {evt.organizer.displayName}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      className="text-xs bg-slate-900 hover:bg-black text-white font-bold py-1 px-3"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Event Information Form Modal (Spec Form 8) */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Host New Event"
        className="max-w-lg"
      >
        <form onSubmit={handleCreateEvent} className="space-y-3.5 pt-2 text-xs">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">Event Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AI Innovation Sprint 2026, Systems Architecture Workshop"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Event Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "ONLINE" | "OFFLINE")}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="ONLINE">Online (Web Stream / Meeting)</option>
                <option value="OFFLINE">Offline (In-Person Venue)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Event Type</label>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "HACKATHON" | "COMPETITION" | "WORKSHOP" | "MEETUP")
                }
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="HACKATHON">Hackathon</option>
                <option value="COMPETITION">Competition</option>
                <option value="WORKSHOP">Workshop</option>
                <option value="MEETUP">Meetup</option>
              </select>
            </div>
          </div>

          {mode === "OFFLINE" && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Location (Required for Offline)
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Tech Block Auditorium, Lab 4, Bengaluru Campus"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Event Date & Time</label>
              <input
                type="datetime-local"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Registration Deadline (optional)
              </label>
              <input
                type="datetime-local"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline event agenda, tracks, prize pools, submission guidelines…"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {submitting ? "Publishing…" : "Publish Event"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
