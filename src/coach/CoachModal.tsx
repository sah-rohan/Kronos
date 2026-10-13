import { useCallback, useEffect, useState } from "react";
import { Modal } from "../components/Modal";
import { api, type ApiJob, type ApiResume, type TokenFn } from "../lib/api";
import { ChatTab } from "./ChatTab";
import { ResumesTab } from "./ResumesTab";
import { JobsTab } from "./JobsTab";

type Tab = "coach" | "resumes" | "jobs";

const TABS: { id: Tab; label: string }[] = [
  { id: "coach", label: "Coach" },
  { id: "resumes", label: "Resumes" },
  { id: "jobs", label: "Roles" },
];

export function CoachModal({ token, onClose }: { token: TokenFn; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("coach");
  const [resumes, setResumes] = useState<ApiResume[]>([]);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [available, setAvailable] = useState(true);

  // One load for the whole modal: the chat needs the roles to target, and both
  // document tabs edit the lists this holds.
  const reload = useCallback(() => {
    api.resumes(token).then(setResumes).catch(() => {});
    api.jobs(token).then(setJobs).catch(() => {});
  }, [token]);

  useEffect(() => {
    reload();
    api.coachAvailable(token).then((r) => setAvailable(r.available)).catch(() => setAvailable(false));
  }, [token, reload]);

  return (
    <Modal title="Interview coach" onClose={onClose}>
      <div className="flex gap-1 rounded-full border border-border p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? "bg-coral text-coral-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "coach" && <ChatTab token={token} jobs={jobs} available={available} />}
        {tab === "resumes" && <ResumesTab token={token} resumes={resumes} onChanged={reload} />}
        {tab === "jobs" && <JobsTab token={token} jobs={jobs} onChanged={reload} />}
      </div>
    </Modal>
  );
}
