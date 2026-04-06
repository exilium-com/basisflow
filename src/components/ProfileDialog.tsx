import React from "react";

type ProfileDialogProps = {
  title: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
};

export function ProfileDialog({ title, children, onClose }: ProfileDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button aria-label="Close dialog" className="absolute inset-0 bg-black/30" onClick={onClose} type="button" />
      <div className="relative z-10 grid w-full max-w-md gap-4 border border-(--line) bg-(--paper-soft) p-5 shadow-xl">
        <h2 className="text-2xl">{title}</h2>
        {children}
      </div>
    </div>
  );
}
