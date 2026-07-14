import { ThemePicker } from '@/components/theme/ThemePicker'

export default function AppearanceSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">Personalization</p>
        <h1 className="text-xl font-bold text-primary">Appearance</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Choose how Oasis looks on this device. Your selection is restored before the interface paints.
        </p>
      </div>
      <section className="rounded-xl border border-edge bg-surface p-5 shadow-sm" aria-labelledby="theme-heading">
        <div className="mb-5">
          <h2 id="theme-heading" className="font-semibold text-primary">Theme</h2>
          <p className="mt-1 text-sm text-muted">Preview and select a system-wide color theme.</p>
        </div>
        <ThemePicker />
      </section>
    </div>
  )
}
