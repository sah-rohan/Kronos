import { useEffect, useState } from "react";
import { Bot, FileText, Briefcase } from "lucide-react";
import { Card } from "../components/Card";
import { api, type TokenFn } from "../lib/api";

// The dashboard entry point. It shows what the coach already has to work with,
// because an empty resume shelf is the one thing that makes its answers worse.
export function CoachCard({ token, onOpen }: { token: TokenFn; onOpen: () => void }) {
  const [resumes, setResumes] = useState(0);
  const [jobs, setJobs] = useState(0);

  useEffect(() => {
    api.resumes(token).then((r) => setResumes(r.length)).catch(() => {});
    api.jobs(token).then((j) => setJobs(j.length)).catch(() => {});
  }, [token]);

  return (
    <Card className="lg:col-span-1 h-full" onClick={onOpen}>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-medium">Interview Coach</div>
        <Bot className="h-4 w-4 text-coral" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Advice grounded in the problems you solved and the code you wrote.
      </p>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-sm">Resumes on file</span>
          <span className="text-sm font-medium">{resumes}</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
          <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-sm">Roles tracked</span>
          <span className="text-sm font-medium">{jobs}</span>
        </div>
      </div>

      <div className="mt-4 text-[11px] font-medium uppercase tracking-wide text-coral">
        Ask the coach →
      </div>
    </Card>
  );
}
