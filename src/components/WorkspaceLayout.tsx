import React from "react";

type WorkspaceLayoutProps = {
  summary: React.ReactNode;
  children: React.ReactNode;
};

export function WorkspaceLayout({ summary, children }: WorkspaceLayoutProps) {
  return (
    <section className="workspace-shell">
      <div className="min-h-0 self-stretch p-4">
        <div className="pb-4">{children}</div>
      </div>
      <aside className="sticky top-0 h-screen self-start overflow-y-auto border-l border-(--line) bg-(--white-soft) p-4">
        <div className="pb-4">{summary}</div>
      </aside>
    </section>
  );
}
