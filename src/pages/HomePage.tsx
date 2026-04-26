import { ActionButton } from "../components/ActionButton";
import { pageSectionClass, surfaceClass } from "../lib/ui";

const TOOL_AREAS = [
  {
    title: "Income",
    description: "Salary, RSUs, taxes, and take-home pay in one place.",
    border: "rgba(13,106,115,0.18)",
  },
  {
    title: "Assets",
    description: "Balances, basis, and tax treatment without spreadsheet sprawl.",
    border: "rgba(197,107,61,0.22)",
  },
  {
    title: "Housing",
    description: "Mortgage cost, down payment, and home equity impact.",
    border: "rgba(13,106,115,0.18)",
  },
  {
    title: "Projection",
    description: "A long-run view of how cash flow compounds into net worth.",
    border: "rgba(197,107,61,0.22)",
  },
];

export function HomePage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col px-4">
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
                <h1 className="max-w-4xl text-4xl">See how income turns to net worth.</h1>
                <p className="home-reveal home-delay-1 max-w-2xl text-base leading-6 text-(--ink-soft)">
                  Basisflow combines income, assets, mortgage, expenses, and projection into one working model so you
                  can understand how today&apos;s cash flow compounds into long-run outcomes.
                </p>
                <ActionButton
                  to="/workspace"
                  className="home-reveal home-delay-2 border-(--teal) bg-(--teal) text-base font-extrabold tracking-wide
                    text-(--white) uppercase"
                >
                  Get started
                </ActionButton>
              </div>

              <div className="grid gap-2 border-t border-(--line-soft) pt-4">
                {TOOL_AREAS.map((item) => (
                  <article
                    key={item.title}
                    className="home-reveal home-delay-2 border-b border-(--line-soft) py-4 transition
                      hover:translate-x-1"
                  >
                    <div className="grid gap-1 border-l pl-4" style={{ borderColor: item.border }}>
                      <h2 className="text-2xl">{item.title}</h2>
                      <p className="max-w-xl text-base leading-6 text-(--ink-soft)">{item.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
