export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex items-center">
      <span className="ml-1 h-4 w-4 rounded-full border border-black/20 text-[10px] font-bold text-secondary flex items-center justify-center cursor-default select-none">
        ?
      </span>
      <span className="absolute left-5 top-0 z-50 hidden group-hover:block w-56 rounded-lg bg-white border border-black/[0.08] p-2.5 text-xs text-primary shadow-md leading-relaxed">
        {text}
      </span>
    </span>
  )
}
