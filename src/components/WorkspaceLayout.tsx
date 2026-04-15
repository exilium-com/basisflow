import React from "react";

type WorkspaceLayoutProps = {
  summary: React.ReactNode;
  children: React.ReactNode;
};

export function WorkspaceLayout({ summary, children }: WorkspaceLayoutProps) {
  return (
    <section className="flex min-w-0 flex-1 flex-col lg:grid lg:grid-cols-5">
      <aside
        className="order-first bg-(--white) px-4 pb-4 lg:order-last lg:col-span-2 lg:h-screen lg:overflow-y-auto
          lg:border-l lg:pb-8 lg:bg-(--white-soft) min-w-0 sticky top-0 z-20 max-h-screen overflow-y-auto w-full"
      >
        {summary}
      </aside>
      <div className="min-w-0 p-4 pb-8 lg:col-span-3">{children}</div>
    </section>
  );
}
