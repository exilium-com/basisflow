import React from "react";
import { smallCapsTextClass } from "../../lib/text";

type WorkspaceSectionProps = {
  id: string;
  index: string;
  title: string;
  summary: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function WorkspaceSection({ id, index, title, summary, actions = null, children }: WorkspaceSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-(--line) py-8 first:border-t-0 first:pt-0">
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className={smallCapsTextClass}>{`${index} ${summary}`}</div>
          <h2 className="font-serif text-4xl leading-none tracking-tight text-(--ink)">{title}</h2>
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
