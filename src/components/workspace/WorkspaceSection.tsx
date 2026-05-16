import React from "react";
import { smallCapsTextClass } from "../../lib/text";

type WorkspaceSectionProps = {
  id: string;
  index: string;
  title: string;
  summary: string;
  children: React.ReactNode;
};

type WorkspaceSectionFooterProps = {
  children: React.ReactNode;
};

export const workspaceSectionActionClassName = "w-full lg:w-auto";

export function WorkspaceSection({ id, index, title, summary, children }: WorkspaceSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line py-6 first:border-t-0 first:pt-0 lg:py-8">
      <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
        <div>
          <div className={smallCapsTextClass}>{`${index} ${summary}`}</div>
          <h2 className="font-serif text-3xl text-ink lg:text-4xl">{title}</h2>
        </div>
      </header>
      {children}
    </section>
  );
}

export function WorkspaceSectionFooter({ children }: WorkspaceSectionFooterProps) {
  return <div className="mt-3 flex justify-end">{children}</div>;
}
