import React from "react";

type WorkspaceLayoutProps = {
  summary: React.ReactNode;
  children: React.ReactNode;
};

export function WorkspaceLayout({ summary, children }: WorkspaceLayoutProps) {
  return (
    <section className="grid flex-1 grid-cols-5">
      <div className="col-span-3 p-4 pb-8">{children}</div>
      <aside className="col-span-2 sticky top-0 h-screen overflow-y-auto border-l border-(--line) bg-(--white-soft) p-4 pb-8">
        {summary}
      </aside>
    </section>
  );
}
