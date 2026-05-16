import { useCallback, useRef, useState } from "react";
import clsx from "clsx";
import { MenuItemButton, MenuPanel } from "./ThreeDotMenu";
import { useDismissibleLayer } from "./useDismissibleLayer";
import { buttonTextClass } from "../lib/text";

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
  const closeMenu = useCallback(() => setOpen(false), []);

  useDismissibleLayer(open, closeMenu, rootRef);

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <button
        type="button"
        className={clsx("action-button w-full lg:w-auto", buttonTextClass)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
      </button>
      {open ? (
        <MenuPanel
          className={clsx("absolute top-full mt-2 w-44", align === "right" ? "right-0" : "left-0")}
          role="menu"
        >
          {options.map((option) => (
            <MenuItemButton
              key={option.id}
              role="menuitem"
              onClick={() => {
                option.onSelect();
                setOpen(false);
              }}
            >
              {option.label}
            </MenuItemButton>
          ))}
        </MenuPanel>
      ) : null}
    </div>
  );
}
