import React from "react";

export function ToastMessage({ message }) {
  return (
    <>
      <span
        className="pointer-events-none px-2 text-xs font-bold text-(--ink-soft)"
        style={{ animation: "basisflowToastFade 4s ease forwards" }}
      >
        {message}
      </span>
      <style>{`
        @keyframes basisflowToastFade {
          0% {
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          78% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
