'use client'
export default function LimitsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-primary mb-6">Purchase Limits</h1>
      <div className="bg-surface rounded-xl border border-edge p-6">
        <p className="text-secondary text-sm mb-4">New Mexico recreational cannabis purchase limits are enforced using flower equivalency.</p>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-secondary">Recreational Limit</span><span className="text-primary font-bold">2.0 oz flower equivalent per transaction</span></div>
          <div className="flex justify-between"><span className="text-secondary">Flower Ratio</span><span className="text-primary">1g flower = 1g equivalent</span></div>
          <div className="flex justify-between"><span className="text-secondary">Concentrate Ratio</span><span className="text-primary">8g concentrate = 1 oz equivalent</span></div>
          <div className="flex justify-between"><span className="text-secondary">Edible Ratio</span><span className="text-primary">800mg THC = 1 oz equivalent</span></div>
        </div>
        <p className="text-xs text-muted mt-4">Medical limits are enforced via BioTrack allotment system.</p>
      </div>
    </div>
  )
}
