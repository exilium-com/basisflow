import React from "react";

export function useDismissibleLayer(
  open: boolean,
  onDismiss: () => void,
  ...refs: React.RefObject<HTMLElement | null>[]
) {
  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    function containsTarget(target: EventTarget | null) {
      return target instanceof Node && refs.some((ref) => ref.current?.contains(target));
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containsTarget(event.target)) {
        onDismiss();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onDismiss();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDismiss, open]);
}
