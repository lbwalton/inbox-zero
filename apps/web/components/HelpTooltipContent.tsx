export function HelpTooltipContent({
  title,
  description,
  example,
}: {
  title: string;
  description: string;
  example?: string;
}) {
  return (
    <div className="max-w-xs space-y-1.5 p-1">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs opacity-80">{description}</p>
      {example && (
        <div className="mt-1.5 rounded bg-white/15 px-2 py-1.5 text-xs dark:bg-black/10">
          <span className="font-semibold">Example: </span>
          {example}
        </div>
      )}
    </div>
  );
}
