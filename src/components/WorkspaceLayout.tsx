import React from "react";

type WorkspaceLayoutProps = {
  summary: React.ReactNode;
  children: React.ReactNode;
};

export function WorkspaceLayout({ summary, children }: WorkspaceLayoutProps) {
  return (
    <section className="min-w-0 lg:grid lg:grid-cols-5">
      <aside
        className="min-w-0 bg-(--white) px-4 pb-4 lg:sticky lg:top-20 lg:order-last lg:col-span-2
          lg:h-[calc(100vh-5rem)] lg:overflow-y-auto lg:border-l lg:border-(--line-soft) lg:bg-(--white-soft)
          lg:pb-8"
      >
        {summary}
      </aside>
      <div className="min-w-0 p-4 pb-8 lg:col-span-3">{children}</div>
    </section>
  );
}
