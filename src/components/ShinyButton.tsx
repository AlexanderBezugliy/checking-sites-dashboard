import type { ReactNode } from "react";

type ShinyButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
};

/** Компактная CTA с бегущей обводкой. Стили — `.shiny-cta` в index.css. */
export function ShinyButton({
  children,
  onClick,
  className = "",
  disabled = false,
}: ShinyButtonProps) {
  return (
    <button
      type="button"
      className={["shiny-cta", className].filter(Boolean).join(" ")}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{children}</span>
    </button>
  );
}
