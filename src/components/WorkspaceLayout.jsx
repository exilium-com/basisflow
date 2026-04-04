import React, { useEffect, useRef, useState } from "react";

export function WorkspaceLayout({ summary, children }) {
  const contentRef = useRef(null);
  const [summaryHeight, setSummaryHeight] = useState(null);

  useEffect(() => {
    const content = contentRef.current;

    if (!content) {
      return undefined;
    }

    const mobileQuery = window.matchMedia("(max-width: 1024px)");

    const measure = () => {
      if (mobileQuery.matches) {
        setSummaryHeight(null);
        return;
      }

      const viewportHeight = document.documentElement.clientHeight;
      const topOffset = Math.max(content.getBoundingClientRect().top, 0);
      const availableHeight = Math.max(viewportHeight - Math.ceil(topOffset), 0);
      const contentHeight = Math.ceil(content.scrollHeight);
      setSummaryHeight(Math.min(availableHeight, contentHeight));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(content);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    mobileQuery.addEventListener("change", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      mobileQuery.removeEventListener("change", measure);
    };
  }, []);

  return (
    <section className="grid min-h-0 flex-1 items-start lg:grid-cols-5">
      <div ref={contentRef} className="min-h-0 self-stretch p-6 max-lg:p-4 lg:col-span-3">
        <div className="pb-6 max-lg:pb-5">{children}</div>
      </div>
      <aside
        className="sticky top-0 self-start overflow-y-auto border-l border-(--line) bg-(--white-soft) p-6 max-lg:static
          max-lg:h-auto max-lg:self-stretch max-lg:overflow-visible max-lg:border-t max-lg:border-l-0
          max-lg:border-t-(--line) max-lg:p-4 lg:col-span-2"
        style={summaryHeight ? { height: `${summaryHeight}px` } : undefined}
      >
        <div className="pb-6 max-lg:pb-5">{summary}</div>
      </aside>
    </section>
  );
}
