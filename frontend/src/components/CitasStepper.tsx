type Props = { current: number; labels: string[] }
export default function CitasStepper({ current, labels }: Props) {
  return (
    <div className="mx-auto mb-8 flex w-full max-w-2xl items-center justify-between">
      {labels.map((label, i) => (
        <div key={label} className="flex flex-1 items-center">
          <div className="flex flex-col items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm ${i <= current ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted-foreground/30 text-muted-foreground'}`}>{i + 1}</div>
            <span className={`mt-2 text-xs ${i === current ? 'text-emerald-700 font-medium' : 'text-muted-foreground'}`}>{label}</span>
          </div>
          {i < labels.length - 1 && (<div className={`mx-2 h-0.5 flex-1 ${i < current ? 'bg-emerald-600' : 'bg-muted'}`} />)}
        </div>
      ))}
    </div>
  )
}

