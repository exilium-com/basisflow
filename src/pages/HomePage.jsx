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
    <PageShell>
      <main className={`${surfaceClass} flex-1 overflow-hidden`}>
        <section className="relative isolate flex flex-1 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            aria-hidden="true"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 14% 20%, rgba(13,106,115,0.18), transparent 34%), radial-gradient(circle at 86% 24%, rgba(197,107,61,0.16), transparent 24%), linear-gradient(180deg, rgba(255,253,249,0.98), rgba(239,230,216,0.68))",
              }}
            />
            <div
              className="absolute h-72 w-72 rounded-full"
              style={{
                right: "-8%",
                bottom: "-18%",
                background: "rgba(13,106,115,0.08)",
              }}
            />
          </div>

          <div className={`${pageSectionClass} relative flex flex-1`}>
            <div className="home-reveal mx-auto grid flex-1 max-w-5xl content-center gap-8 py-6 md:py-8">
              <div className="grid gap-4">
                <p
                  className="text-xs font-extrabold uppercase"
                  style={{ ...mutedText, letterSpacing: "0.22em" }}
                >
                  Basisflow
                </p>
                <h1
                  className="max-w-4xl leading-none"
                  style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}
                >
                  See how income turns to net worth.
                </h1>
                <p
                  className="home-reveal home-delay-1 max-w-2xl text-base leading-7 md:text-lg"
                  style={mutedText}
                >
                  Basisflow combines income, assets, mortgage, expenses, and
                  projection into one working model so you can understand how
                  today&apos;s cash flow compounds into long-run outcomes.
                </p>
                <div className="home-reveal home-delay-2 pt-2">
                  <ActionButton
                    to="/income"
                    className="h-14 px-6 text-base font-extrabold uppercase"
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

              <div className="grid gap-2 border-t pt-5" style={sectionBorder}>
                {TOOL_AREAS.map((item) => (
                  <article
                    key={item.title}
                    className="home-reveal home-delay-2 border-b py-3 transition duration-200 hover:translate-x-1"
                    style={sectionBorder}
                  >
                    <div className="grid gap-1 border-l pl-4" style={{ borderColor: item.border }}>
                      <h2
                        className="leading-none"
                        style={{ fontSize: "clamp(1.5rem, 2.4vw, 2.4rem)" }}
                      >
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
