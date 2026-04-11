import React from "react";

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
    <section id={id} className="scroll-mt-24 border-t border-(--line) pt-8 first:border-t-0 first:pt-0">
      <div className="mb-5 flex items-end justify-between gap-6">
        <div className="grid gap-2">
          <div className="text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">{`${index} ${summary}`}</div>
          <h2 className="font-serif text-4xl leading-none tracking-tight text-(--ink)">{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
