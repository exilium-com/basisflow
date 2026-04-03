import React from "react";
import { ActionButton } from "../components/ActionButton";
import { PageShell } from "../components/PageShell";
import { NAV_ITEMS } from "../lib/nav";
import { pageSectionClass, surfaceClass } from "../lib/ui";

const TOOL_ROWS = [
  {
    key: "assets",
    title: "Assets Calculator",
    description:
      "Bucket editor for current balances, tax-free vs taxable treatment, and taxable basis.",
  },
  {
    key: "income",
    title: "Income Calculator",
    description:
      "Annual take-home estimate with California single-filer assumptions, 401(k), employer match, mega backdoor, and HSA inputs.",
  },
  {
    key: "mortgage",
    title: "Mortgage Calculator",
    description:
      "Loan comparison workspace for fixed and ARM options, with monthly payment summary and side-by-side comparison.",
  },
  {
    key: "expenses",
    title: "Expenses Calculator",
    description:
      "Dynamic non-housing expense lines with monthly or annual cadence.",
  },
  {
    key: "projection",
    title: "Projection",
    description:
      "Combined long-run annual view for income, assets, mortgage, and expenses, including free-cash allocation into asset buckets.",
  },
  {
    key: "taxes",
    title: "Tax Config",
    description:
      "Shared 2026 federal, state, and capital-gains bracket settings reused by the other tools.",
  },
];

export function HomePage() {
  return (
    <PageShell>
      <main className={surfaceClass}>
        <section className={pageSectionClass}>
          <div className="border-b border-(--line-soft) pb-4">
            <p className="mt-2 max-w-prose leading-relaxed text-(--ink-soft)">
              Local calculators for assets, income, mortgage, expenses,
              projection, and shared tax assumptions. Use the first four pages
              to define inputs, then move to Projection for the long-run model.
            </p>
          </div>

          <div className="mt-4 grid gap-0">
            {TOOL_ROWS.map((row) => {
              const nav = NAV_ITEMS.find((item) => item.key === row.key);
              return (
                <article key={row.key} className="flex flex-col gap-3 border-t border-(--line-soft) py-4 first:border-t-0 md:flex-row md:items-center">
                  <div className="w-20 text-xs font-extrabold uppercase tracking-wide text-(--ink-soft)">
                    {nav.index}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold">{row.title}</h2>
                    <p className="mt-1.5 leading-relaxed text-(--ink-soft)">
                      {row.description}
                    </p>
                  </div>
                  <ActionButton
                    className="justify-self-start whitespace-nowrap"
                    to={nav.to}
                  >
                    Open
                  </ActionButton>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
