import { Panel } from './Panel';

export function ActionLog({ lines, onClear }: { lines: string[]; onClear: () => void }) {
  return (
    <Panel
      title="Action Log"
      action={
        <button onClick={onClear} className="text-xs text-slate-500 hover:text-slate-300">
          clear
        </button>
      }
    >
      <div className="max-h-64 overflow-y-auto rounded-md bg-black/30 p-3 font-mono text-xs text-slate-400">
        {lines.length === 0 && <p className="text-slate-600">No actions yet — try injecting a payment.</p>}
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all border-b border-mesh-border/40 py-1 last:border-0">
            {line}
          </div>
        ))}
      </div>
    </Panel>
  );
}
