import type { ReactNode } from "react";

type PageIntroProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: PageIntroProps) {
  return (
    <div className={`mx-auto max-w-3xl text-center ${className}`.trim()}>
      {eyebrow ? (
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-3 text-balance break-words text-4xl font-bold tracking-tight text-forest sm:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-stone-700">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
