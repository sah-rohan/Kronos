import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useData } from "../data/context";
import { api, type CodingProgress, type Debrief as DebriefData, type Interview } from "../lib/api";
import { Button } from "../components/Controls";
import { Debrief } from "./Debrief";
import { Room } from "./Room";

const POLL_MS = 4000;
const POLL_LIMIT_MS = 15 * 60 * 1000;

function Notice({ title, children, onBack }: { title: string; children: ReactNode; onBack: () => void }) {
  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4 pt-10">
      <button type="button" onClick={onBack} className="min-h-10 self-start text-sm text-muted-foreground hover:text-foreground">
        ← Interviews
      </button>
      <h1 className="m-0 font-display text-[40px] font-normal leading-tight">{title}</h1>
      {children}
    </div>
  );
}

export default function InterviewView({ id, onBack }: { id: string; onBack: () => void }) {
  const { getToken } = useData();
  const [iv, setIv] = useState<Interview | null>(null);
  const [missing, setMissing] = useState(false);
  const [progress, setProgress] = useState<CodingProgress | null>(null);
  const [slow, setSlow] = useState(false);
  const [busy, setBusy] = useState(false);
  const update = useCallback((next: Interview) => setIv(next), []);

  useEffect(() => {
    let live = true;
    api
      .interview(getToken, id)
      .then((v) => live && setIv(v))
      .catch(() => live && setMissing(true));
    return () => {
      live = false;
    };
  }, [getToken, id]);

  const status = iv?.status;
  const coding = iv?.kind === "coding";
  useEffect(() => {
    if (status !== "graded" || !coding) return;
    let live = true;
    api
      .interviewProgress(getToken)
      .then((p) => live && setProgress(p))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [getToken, status, coding]);

  useEffect(() => {
    if (status !== "grading") return;
    const started = Date.now();
    const t = setInterval(() => {
      if (Date.now() - started > POLL_LIMIT_MS) {
        setSlow(true);
        clearInterval(t);
        return;
      }
      api
        .interview(getToken, id)
        .then((v) => v.status !== "grading" && setIv(v))
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(t);
  }, [getToken, id, status]);

  const regrade = async () => {
    setBusy(true);
    setSlow(false);
    try {
      setIv(await api.endInterview(getToken, id));
    } catch {
      setSlow(true);
    } finally {
      setBusy(false);
    }
  };

  if (missing) {
    return (
      <Notice title="Interview not found" onBack={onBack}>
        <p className="m-0 text-muted-foreground">It may have been deleted.</p>
      </Notice>
    );
  }
  if (!iv) return null;
  if (iv.status === "active") return <Room iv={iv} onUpdate={update} onLeave={onBack} />;
  if (iv.status === "grading") {
    return (
      <Notice title="Writing your debrief…" onBack={onBack}>
        <p className="m-0 leading-relaxed text-muted-foreground">
          {slow
            ? "This is taking longer than usual. Try grading it again."
            : "Usually about a minute. You can leave this page; the debrief will be here when you come back."}
        </p>
        {slow && (
          <Button onClick={regrade} disabled={busy} className="self-start">
            Grade again
          </Button>
        )}
      </Notice>
    );
  }
  if (iv.status === "failed" || !iv.debrief) {
    return (
      <Notice title="Grading didn't finish" onBack={onBack}>
        <p className="m-0 leading-relaxed text-muted-foreground">Your interview is saved. Try grading it again.</p>
        <Button onClick={regrade} disabled={busy} className="self-start">
          Grade again
        </Button>
      </Notice>
    );
  }
  return <Debrief iv={iv as Interview & { debrief: DebriefData }} progress={progress} onUpdate={update} onBack={onBack} />;
}
