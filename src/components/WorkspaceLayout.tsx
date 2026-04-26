import React from "react";

type WorkspaceLayoutProps = {
  summary: React.ReactNode;
  children: React.ReactNode;
};

export function WorkspaceLayout({ summary, children }: WorkspaceLayoutProps) {
  return (
    <section className="min-w-0 lg:grid lg:grid-cols-5">
      <aside
        className="min-w-0 bg-(--white) px-4 pb-4 lg:sticky lg:top-16 lg:order-last lg:col-span-2 lg:self-start
          lg:border-l lg:border-(--line-soft) lg:bg-(--white-soft) lg:pb-8"
      >
        {summary}
      </aside>
      <div className="min-w-0 p-4 pb-8 lg:col-span-3">{children}</div>
    </section>
  );
}
