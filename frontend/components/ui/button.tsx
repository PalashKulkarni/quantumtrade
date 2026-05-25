import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-white/5 px-3 text-sm font-medium text-slate-100 transition hover:border-cyan/60 hover:bg-cyan/10",
        className
      )}
      {...props}
    />
  );
}

