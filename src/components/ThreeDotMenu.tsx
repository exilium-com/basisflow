import React from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { MenuDotsIcon } from "./MenuDotsIcon";
import { useDismissibleLayer } from "./useDismissibleLayer";

type ThreeDotMenuButtonProps = {
  ariaLabel: string;
  className?: string;
  open: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
};

type MenuPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

type MenuItemButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  children: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
};

export type ThreeDotMenuItem = {
  action: () => void;
  destructive?: boolean;
};

export type ThreeDotMenuItems = Record<string, ThreeDotMenuItem>;

type ThreeDotMenuProps = {
  ariaLabel: string;
  buttonClassName?: string;
  className?: string;
  items: ThreeDotMenuItems;
};

const menuGap = 4;
const menuViewportPadding = 8;

const menuButtonClassName = "grid size-5 place-items-center text-ink-soft hover:text-teal";

const menuItemClassName = "w-full px-3 py-2 text-left text-sm font-bold";

const ThreeDotMenuButton = React.forwardRef<HTMLButtonElement, ThreeDotMenuButtonProps>(
  ({ ariaLabel, className, open, onClick }, ref) => (
    <button
      ref={ref}
      className={clsx(menuButtonClassName, className)}
      type="button"
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={onClick}
    >
      <MenuDotsIcon />
    </button>
  ),
);

ThreeDotMenuButton.displayName = "ThreeDotMenuButton";

export const MenuPanel = React.forwardRef<HTMLDivElement, MenuPanelProps>(({ children, className, ...props }, ref) => (
  <div ref={ref} className={clsx("z-50 min-w-40 border border-line bg-white py-1", className)} {...props}>
    {children}
  </div>
));

MenuPanel.displayName = "MenuPanel";

export function MenuItemButton({
  children,
  className,
  destructive = false,
  onClick,
  role = "menuitem",
  ...props
}: MenuItemButtonProps) {
  return (
    <button
      className={clsx(
        menuItemClassName,
        destructive ? "text-destructive hover:bg-destructive-soft" : "text-ink-soft hover:bg-surface hover:text-ink",
        className,
      )}
      {...props}
      role={role}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ThreeDotMenu({ ariaLabel, buttonClassName, className, items }: ThreeDotMenuProps) {
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>({});
  const visibleItems = Object.entries(items);

  const closeMenu = React.useCallback(() => setMenuOpen(false), []);

  function getPanelStyle(): React.CSSProperties {
    const triggerRect = buttonRef.current?.getBoundingClientRect();
    if (!triggerRect) {
      return {};
    }

    const panelWidth = panelRef.current?.offsetWidth ?? 0;
    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    const maxLeft = Math.max(menuViewportPadding, window.innerWidth - panelWidth - menuViewportPadding);
    const maxTop = Math.max(menuViewportPadding, window.innerHeight - panelHeight - menuViewportPadding);

    return {
      top: panelHeight
        ? Math.min(Math.max(menuViewportPadding, triggerRect.bottom + menuGap), maxTop)
        : triggerRect.bottom + menuGap,
      left: panelWidth
        ? Math.min(Math.max(menuViewportPadding, triggerRect.right - panelWidth), maxLeft)
        : triggerRect.right,
      maxWidth: `calc(100vw - ${menuViewportPadding * 2}px)`,
    };
  }

  React.useLayoutEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    function updatePanelStyle() {
      setPanelStyle(getPanelStyle());
    }

    updatePanelStyle();
    window.addEventListener("resize", updatePanelStyle);
    window.addEventListener("scroll", updatePanelStyle, true);

    return () => {
      window.removeEventListener("resize", updatePanelStyle);
      window.removeEventListener("scroll", updatePanelStyle, true);
    };
  }, [menuOpen]);

  useDismissibleLayer(menuOpen, closeMenu, buttonRef, panelRef);

  const menuPanel =
    menuOpen && visibleItems.length > 0
      ? createPortal(
          <MenuPanel ref={panelRef} className="fixed w-44" role="menu" style={panelStyle}>
            {visibleItems.map(([label, item]) => (
              <MenuItemButton
                key={label}
                destructive={item.destructive}
                onClick={() => {
                  item.action();
                  setMenuOpen(false);
                }}
              >
                {label}
              </MenuItemButton>
            ))}
          </MenuPanel>,
          document.body,
        )
      : null;

  return (
    <div className={className}>
      <ThreeDotMenuButton
        ref={buttonRef}
        ariaLabel={ariaLabel}
        className={buttonClassName}
        open={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      />
      {menuPanel}
    </div>
  );
}
