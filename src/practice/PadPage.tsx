import { useEffect, useState, type ReactNode } from "react";
import { useData } from "../data/context";
import { api, type Pad, type PadFeedback as Feedback, type PadProgress } from "../lib/api";
import { Button } from "../components/Controls";
import { PadEditor } from "./PadEditor";
import { PadFeedback } from "./PadFeedback";

const POLL_MS = 4000;
const POLL_LIMIT_MS = 15 * 60 * 1000;

function Waiting({ title, children, onBack }: { title: string; children: ReactNode; onBack: () => void }) {
  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4 pt-10">
      <button type="button" onClick={onBack} className="min-h-10 self-start text-sm text-muted-foreground hover:text-foreground">
        ← Practice
      </button>
      <h1 className="m-0 font-display text-[40px] font-normal leading-tight">{title}</h1>
      {children}
    </div>
  );
}

export default function PadPage({ id, onOpen, onBack }: { id: string; onOpen: (id: string) => void; onBack: () => void }) {
  const { getToken } = useData();
  const [pad, setPad] = useState<Pad | null>(null);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState<PadProgress | null>(null);
  const [slow, setSlow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    api
      .pad(getToken, id)
      .then((p) => live && setPad(p))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [getToken, id]);

  const status = pad?.status;
  useEffect(() => {
    if (status === "grading") return;
    let live = true;
    api
      .padProgress(getToken)
      .then((p) => live && setProgress(p))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [getToken, status]);

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
        .pad(getToken, id)
        .then((p) => p.status !== "grading" && setPad(p))
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(t);
  }, [getToken, id, status]);

  const resubmit = async () => {
    setBusy(true);
    setSlow(false);
    try {
      setPad(await api.submitPad(getToken, id));
    } catch {
      setSlow(true);
    } finally {
      setBusy(false);
    }
  };

  const redo = async () => {
    if (!pad) return;
    setBusy(true);
    try {
      onOpen((await api.startPad(getToken, pad.slug, pad.language)).id);
    } finally {
      setBusy(false);
    }
  };

  if (failed) {
    return (
      <Waiting title="Pad not found" onBack={onBack}>
        <p className="m-0 text-muted-foreground">It may have been deleted.</p>
      </Waiting>
    );
  }
  if (!pad) return null;

  if (pad.status === "draft") {
    return <PadEditor key={pad.version} pad={pad} focus={progress?.focus ?? ""} onUpdate={setPad} onBack={onBack} />;
  }
  if (pad.status === "grading") {
    return (
      <Waiting title="Grading your pad…" onBack={onBack}>
        <p className="m-0 leading-relaxed text-muted-foreground">
          {slow
            ? "This is taking longer than usual. You can leave and come back, or queue it again."
            : "Usually under a minute. You can leave this page; the feedback will be here when you come back."}
        </p>
        {slow && (
          <Button onClick={resubmit} disabled={busy} className="self-start">
            Queue it again
          </Button>
        )}
      </Waiting>
    );
  }
  if (pad.status === "failed" || !pad.feedback) {
    return (
      <Waiting title="Grading didn't finish" onBack={onBack}>
        <p className="m-0 leading-relaxed text-muted-foreground">Your pad is saved. Try grading it again.</p>
        <Button onClick={resubmit} disabled={busy} className="self-start">
          Grade again
        </Button>
      </Waiting>
    );
  }
  return <PadFeedback pad={pad as Pad & { feedback: Feedback }} progress={progress} onRedo={redo} onBack={onBack} />;
}
