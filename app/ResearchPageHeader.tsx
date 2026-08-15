import type { ReactNode } from "react";

type ResearchPageHeaderProps = {
  title: string;
  context: ReactNode;
  updated: string;
  controls?: ReactNode;
  className?: string;
};

export function ResearchPageHeader({
  title,
  context,
  updated,
  controls,
  className = "",
}: ResearchPageHeaderProps) {
  return (
    <header className={`dw-research-header ${className}`.trim()}>
      <span className="dw-research-header__rule" aria-hidden="true">
        <i />
        <i />
      </span>
      <div className="dw-research-header__body">
        <p className="dw-research-header__kicker">DONGWU NEW ENERGY · RESEARCH DATABASE</p>
        <h1 className="dw-research-header__title">{title}</h1>
        <p className="dw-research-header__context">{context}</p>
      </div>
      <div className="dw-research-header__aside">
        {controls ? <div className="dw-research-header__controls">{controls}</div> : null}
        <p className="dw-research-header__updated">
          <span>更新至</span>
          <strong>{updated}</strong>
        </p>
      </div>
    </header>
  );
}
