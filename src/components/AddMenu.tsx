import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { buttonTextClass, labelTextClass } from "../lib/text";

type AddMenuOption = {
  id: string;
  label: string;
  onSelect: () => void;
};

type AddMenuProps = {
  label: string;
  options: AddMenuOption[];
  align?: "left" | "right";
  className?: string;
};

export function AddMenu({ label, options, align = "right", className }: AddMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <button
        type="button"
        className={clsx("action-button w-full sm:w-auto", buttonTextClass)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
      </button>
      {open ? (
        <div
          className={clsx(
            "absolute top-full z-20 mt-2 min-w-40 border border-(--line) bg-(--white) p-2 shadow-sm",
            align === "right" ? "right-0" : "left-0",
          )}
          role="menu"
        >
          <div className="grid gap-1">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitem"
                className={clsx("flex h-10 items-center px-3 text-left hover:bg-(--teal-soft)", labelTextClass)}
                onClick={() => {
                  option.onSelect();
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
