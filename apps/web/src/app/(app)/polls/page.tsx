"use client";

import { useState } from "react";
import { BarChart3, Plus, Check } from "lucide-react";
import { Button, Card, Modal } from "@stunet/ui";
import AdvancedSelectList, { GeoFilterSelection } from "@/components/AdvancedSelectList";

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface CampusPoll {
  id: string;
  question: string;
  authorName: string;
  isAnonymous: boolean;
  scope: string;
  options: PollOption[];
  userVotedOptionId?: string;
  totalVotes: number;
  createdAt: string;
}

export default function PollsPage() {
  const [geoScope, setGeoScope] = useState<GeoFilterSelection>({
    type: "ALL",
    name: "All Campuses",
  });
  const [filterTab, setFilterTab] = useState<"ALL" | "MY_CAMPUS" | "CITY" | "STATE">("ALL");

  // Create Poll Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [optionsInputs, setOptionsInputs] = useState(["", "", ""]);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Polls List
  const [polls, setPolls] = useState<CampusPoll[]>([
    {
      id: "poll-1",
      question: "Should the campus library remain open 24/7 during IA and End-Sem exams?",
      authorName: "Anonymous Student",
      isAnonymous: true,
      scope: "S-VYASA Bengaluru",
      totalVotes: 324,
      createdAt: "3 hours ago",
      userVotedOptionId: "opt-1a",
      options: [
        { id: "opt-1a", text: "Yes, definitely 24/7 with overnight study lounge", votes: 278 },
        { id: "opt-1b", text: "Open until 2:00 AM is sufficient", votes: 36 },
        { id: "opt-1c", text: "No change needed (regular 10 PM close)", votes: 10 },
      ],
    },
    {
      id: "poll-2",
      question: "Which programming track would you like the Advanced Tech Club to host next month?",
      authorName: "Dave Patel",
      isAnonymous: false,
      scope: "All Campuses",
      totalVotes: 198,
      createdAt: "1 day ago",
      options: [
        { id: "opt-2a", text: "Rust & Systems Programming", votes: 94 },
        { id: "opt-2b", text: "Autonomous LLM Agents & Tool Use", votes: 76 },
        { id: "opt-2c", text: "Distributed Kubernetes & Docker Infra", votes: 28 },
      ],
    },
    {
      id: "poll-3",
      question: "Preferred weekend food menu for the campus dining hall?",
      authorName: "Anonymous Student",
      isAnonymous: true,
      scope: "My State (Karnataka)",
      totalVotes: 145,
      createdAt: "2 days ago",
      options: [
        { id: "opt-3a", text: "South Indian Special Dosa & Vada Counter", votes: 88 },
        { id: "opt-3b", text: "North Indian Paneer Butter Masala & Naan", votes: 42 },
        { id: "opt-3c", text: "Continental Pasta & Healthy Bowls", votes: 15 },
      ],
    },
  ]);

  function handleVote(pollId: string, optionId: string) {
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll;

        const previousVoteId = poll.userVotedOptionId;
        const isRemoving = previousVoteId === optionId;

        const updatedOptions = poll.options.map((opt) => {
          if (opt.id === optionId) {
            return {
              ...opt,
              votes: opt.votes + (isRemoving ? -1 : 1),
            };
          }
          if (previousVoteId && opt.id === previousVoteId) {
            return {
              ...opt,
              votes: Math.max(0, opt.votes - 1),
            };
          }
          return opt;
        });

        const newTotal = updatedOptions.reduce((acc, cur) => acc + cur.votes, 0);

        return {
          ...poll,
          options: updatedOptions,
          userVotedOptionId: isRemoving ? undefined : optionId,
          totalVotes: newTotal,
        };
      }),
    );
  }

  function handleCreatePoll(e: React.FormEvent) {
    e.preventDefault();
    const validOptions = optionsInputs.filter((o) => o.trim().length > 0);
    if (!newQuestion.trim() || validOptions.length < 2) return;

    const newPoll: CampusPoll = {
      id: `poll-${Date.now()}`,
      question: newQuestion.trim(),
      authorName: isAnonymous ? "Anonymous Student" : "You",
      isAnonymous,
      scope: geoScope.name,
      totalVotes: 0,
      createdAt: "Just now",
      options: validOptions.map((text, idx) => ({
        id: `opt-${Date.now()}-${idx}`,
        text: text.trim(),
        votes: 0,
      })),
    };

    setPolls([newPoll, ...polls]);
    setNewQuestion("");
    setOptionsInputs(["", "", ""]);
    setIsAnonymous(false);
    setShowCreateModal(false);
  }

  return (
    <div className="max-w-[630px] mx-auto px-4 py-6 space-y-4">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              General Campus Polls
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Voice student opinions on academic rules, dining menus, and campus facilities.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs shrink-0 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Poll</span>
        </button>
      </div>

      {/* Filter Row: All, MyCampus, MyCity, MyState + AdvancedSelectList */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xs text-xs font-semibold">
        <div className="flex items-center gap-1">
          {[
            { id: "ALL" as const, label: "All" },
            { id: "MY_CAMPUS" as const, label: "MyCampus" },
            { id: "CITY" as const, label: "MyCity" },
            { id: "STATE" as const, label: "MyState" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1 rounded-full transition-all ${
                filterTab === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AdvancedSelectList currentSelection={geoScope} onSelect={(sel) => setGeoScope(sel)} />
      </div>

      {/* Polls Feed */}
      <div className="space-y-4">
        {polls.map((poll) => (
          <Card key={poll.id} className="border-slate-200/90 shadow-2xs p-5 rounded-2xl space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                  {poll.scope}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                  {poll.question}
                </h3>
              </div>
            </div>

            {/* Options Voting Container */}
            <div className="space-y-2 pt-1">
              {poll.options.map((opt) => {
                const isSelected = poll.userVotedOptionId === opt.id;
                const percent =
                  poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleVote(poll.id, opt.id)}
                    className={`w-full text-left p-3 rounded-xl border relative overflow-hidden transition-all text-xs font-medium ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold"
                        : "border-slate-200 bg-white hover:border-slate-300 text-slate-800"
                    }`}
                  >
                    {/* Background Progress Fill */}
                    {poll.totalVotes > 0 && (
                      <div
                        className={`absolute top-0 bottom-0 left-0 opacity-15 transition-all duration-500 ${
                          isSelected ? "bg-indigo-600" : "bg-slate-400"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    )}

                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span>{opt.text}</span>
                      </div>

                      <span className="text-[11px] font-bold text-slate-500 shrink-0">
                        {percent}% ({opt.votes})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Poll Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
              <span>
                By: <strong className="text-slate-600">{poll.authorName}</strong>
              </span>
              <span>
                {poll.totalVotes} total votes • {poll.createdAt}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal: Create General Poll */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Campus General Poll"
        className="max-w-md"
      >
        <form onSubmit={handleCreatePoll} className="space-y-4 pt-2 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Poll Question</label>
            <textarea
              rows={2}
              required
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Ask a question to your campus community…"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-slate-700 block">
              Answer Options (At least 2 required)
            </label>
            {optionsInputs.map((val, idx) => (
              <input
                key={idx}
                type="text"
                value={val}
                onChange={(e) => {
                  const copy = [...optionsInputs];
                  copy[idx] = e.target.value;
                  setOptionsInputs(copy);
                }}
                placeholder={`Option ${idx + 1}`}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
              />
            ))}
          </div>

          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
            <input
              type="checkbox"
              id="poll-anon"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="poll-anon" className="font-medium text-slate-700 cursor-pointer">
              Post poll as Anonymous Student
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCreateModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              Publish Poll
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
