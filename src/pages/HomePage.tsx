import React from "react";
import { ActionButton } from "../components/ActionButton";
import { PageShell } from "../components/PageShell";
import { pageSectionClass, surfaceClass } from "../lib/ui";

const TOOL_AREAS = [
  {
    title: "Income",
    description: "Salary, RSUs, taxes, and take-home pay in one place.",
    accent: "var(--teal)",
    border: "rgba(13,106,115,0.18)",
  },
  {
    title: "Assets",
    description: "Balances, basis, and tax treatment without spreadsheet sprawl.",
    accent: "var(--clay)",
    border: "rgba(197,107,61,0.22)",
  },
  {
    title: "Housing",
    description: "Mortgage cost, down payment, and home equity impact.",
    accent: "var(--teal)",
    border: "rgba(13,106,115,0.18)",
  },
  {
    title: "Projection",
    description: "A long-run view of how cash flow compounds into net worth.",
    accent: "var(--clay)",
    border: "rgba(197,107,61,0.22)",
  },
];

const mutedText = { color: "var(--ink-soft)" };
const sectionBorder = { borderColor: "var(--line-soft)" };

export function HomePage() {
  return (
    <PageShell showToolNav={false} title="Basisflow">
      <main className={`${surfaceClass} flex-1 overflow-hidden`}>
        <section className="relative isolate flex flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-90" aria-hidden="true">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 14% 20%, rgba(13,106,115,0.18), transparent 34%), radial-gradient(circle at 86% 24%, rgba(197,107,61,0.16), transparent 24%), linear-gradient(180deg, rgba(255,253,249,0.98), rgba(239,230,216,0.68))",
              }}
            />
            <div
              className="absolute h-64 w-64 rounded-full"
              style={{
                right: "-8%",
                bottom: "-18%",
                background: "rgba(13,106,115,0.08)",
              }}
            />
          </div>

          <div className={`${pageSectionClass} relative flex flex-1`}>
            <div className="home-reveal mx-auto grid max-w-4xl flex-1 content-center gap-8 py-8">
              <div className="grid gap-4">
                <h1 className="max-w-4xl text-4xl leading-none">
                  See how income turns to net worth.
                </h1>
                <p className="home-reveal home-delay-1 max-w-2xl text-base leading-6" style={mutedText}>
                  Basisflow combines income, assets, mortgage, expenses, and projection into one working model so you
                  can understand how today&apos;s cash flow compounds into long-run outcomes.
                </p>
                <div className="home-reveal home-delay-2 pt-2">
                  <ActionButton
                    to="/workspace"
                    className="h-10 px-4 text-base font-extrabold uppercase"
                    style={{
                      backgroundColor: "var(--teal)",
                      borderColor: "var(--teal)",
                      color: "var(--white)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Get started
                  </ActionButton>
                </div>
              </div>

              <div className="grid gap-2 border-t pt-4" style={sectionBorder}>
                {TOOL_AREAS.map((item) => (
                  <article
                    key={item.title}
                    className="home-reveal home-delay-2 border-b py-4 transition duration-200 hover:translate-x-1"
                    style={sectionBorder}
                  >
                    <div className="grid gap-1 border-l pl-4" style={{ borderColor: item.border }}>
                      <h2 className="text-2xl leading-none">
                        {item.title}
                      </h2>
                      <p className="max-w-xl leading-6" style={mutedText}>
                        {item.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
