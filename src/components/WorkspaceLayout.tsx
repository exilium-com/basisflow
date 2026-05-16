import React from "react";
import clsx from "clsx";

type WorkspaceLayoutProps = {
  summary: React.ReactNode;
  children: React.ReactNode;
};

const sidePanelClassName = clsx(
  "min-w-0 bg-white p-4",
  "lg:sticky lg:top-20 lg:order-last lg:col-span-2",
  "lg:workspace-side-panel lg:overflow-y-auto lg:border-l",
  "lg:border-line-soft lg:bg-white-soft",
);

export function WorkspaceLayout({ summary, children }: WorkspaceLayoutProps) {
  return (
    <section className="min-w-0 lg:grid lg:grid-cols-5">
      <aside className={sidePanelClassName}>{summary}</aside>
      <div className="min-w-0 p-4 pb-8 lg:col-span-3">{children}</div>
    </section>
  );
}
