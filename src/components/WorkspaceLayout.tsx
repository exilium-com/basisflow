import React from "react";

type WorkspaceLayoutProps = {
  summary: React.ReactNode;
  children: React.ReactNode;
};

export function WorkspaceLayout({ summary, children }: WorkspaceLayoutProps) {
  return (
    <section className="grid min-h-0 flex-1 grid-cols-5 items-start">
      <div className="col-span-3 min-h-0 self-stretch p-4 pb-8">{children}</div>
      <aside className="col-span-2 sticky top-0 h-screen self-start overflow-y-auto border-l border-(--line) bg-(--white-soft) p-4 pb-8">
        {summary}
      </aside>
    </section>
  );
}
