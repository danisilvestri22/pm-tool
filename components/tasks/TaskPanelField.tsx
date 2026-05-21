interface Props {
  label: string
  children: React.ReactNode
}

export default function TaskPanelField({ label, children }: Props) {
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  )
}
