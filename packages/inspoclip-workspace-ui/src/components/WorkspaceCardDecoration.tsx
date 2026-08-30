export type WorkspaceCardDecorationType = "tape" | "pin" | "clip" | "washi" | "stitch" | "staple" | "sticker" | "corner"

type WorkspaceCardDecorationProps = {
  type: WorkspaceCardDecorationType
}

/** Shared scrapbook decoration so both workspace surfaces render the same card treatment. */
export function WorkspaceCardDecoration({ type }: WorkspaceCardDecorationProps) {
  if (type === "tape") return <div className="workspace-card-decoration workspace-card-decoration-tape" data-workspace-decoration={type} aria-hidden="true" />
  if (type === "washi") return <div className="workspace-card-decoration workspace-card-decoration-washi" data-workspace-decoration={type} aria-hidden="true" />
  if (type === "pin") return <div className="workspace-card-decoration workspace-card-decoration-pin" data-workspace-decoration={type} aria-hidden="true"><i /><b /></div>
  if (type === "clip") return <div className="workspace-card-decoration workspace-card-decoration-clip" data-workspace-decoration={type} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 Q12 -2 18 6 Q24 14 18 20 M6 2 V18 Q6 22 12 22 Q18 22 18 18 V6" /></svg></div>
  if (type === "stitch") return <div className="workspace-card-decoration workspace-card-decoration-stitch" data-workspace-decoration={type} aria-hidden="true" />
  if (type === "staple") return <div className="workspace-card-decoration workspace-card-decoration-staple" data-workspace-decoration={type} aria-hidden="true"><svg viewBox="0 0 16 10" fill="none"><rect x="1" y="1" width="14" height="3" rx=".5" /><rect x="3" y="4" width="2" height="5" rx=".5" /><rect x="11" y="4" width="2" height="5" rx=".5" /></svg></div>
  if (type === "sticker") return <div className="workspace-card-decoration workspace-card-decoration-sticker" data-workspace-decoration={type} aria-hidden="true"><i /><b /></div>
  return <div className="workspace-card-decoration workspace-card-decoration-corner" data-workspace-decoration={type} aria-hidden="true"><svg viewBox="0 0 22 22" fill="none"><path d="M0 0 L18 0 L22 4 L22 22 L4 22 L0 18 Z" /><path d="M3 3 L15 3 L19 7 L19 19" /></svg></div>
}
