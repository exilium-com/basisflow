import React from "react";

type WorkspaceLayoutProps = {
  summary: React.ReactNode;
  children: React.ReactNode;
};

export function WorkspaceLayout({ summary, children }: WorkspaceLayoutProps) {
  return (
    <section className="flex min-w-0 flex-1 flex-col lg:grid lg:grid-cols-5">
      <aside
        className="sticky top-0 z-20 order-first w-full min-w-0 max-h-screen overflow-y-auto bg-(--white) px-4 pb-4
          lg:order-last lg:col-span-2 lg:h-screen lg:border-l lg:border-(--line-soft) lg:bg-(--white-soft) lg:pb-8"
      >
        {summary}
      </aside>
      <div className="min-w-0 p-4 pb-8 lg:col-span-3">{children}</div>
    </section>
  );
}
