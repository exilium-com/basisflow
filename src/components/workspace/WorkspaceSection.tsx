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
      <header className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className={smallCapsTextClass}>{`${index} ${summary}`}</div>
          <h2 className="font-serif text-3xl leading-none tracking-tight text-(--ink) sm:text-4xl">{title}</h2>
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
