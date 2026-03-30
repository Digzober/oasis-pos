'use client'
export default function LimitsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-50 mb-6">Purchase Limits</h1>
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <p className="text-gray-400 text-sm mb-4">New Mexico recreational cannabis purchase limits are enforced using flower equivalency.</p>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-300">Recreational Limit</span><span className="text-gray-50 font-bold">2.0 oz flower equivalent per transaction</span></div>
          <div className="flex justify-between"><span className="text-gray-300">Flower Ratio</span><span className="text-gray-50">1g flower = 1g equivalent</span></div>
          <div className="flex justify-between"><span className="text-gray-300">Concentrate Ratio</span><span className="text-gray-50">8g concentrate = 1 oz equivalent</span></div>
          <div className="flex justify-between"><span className="text-gray-300">Edible Ratio</span><span className="text-gray-50">800mg THC = 1 oz equivalent</span></div>
        </div>
        <p className="text-xs text-gray-500 mt-4">Medical limits are enforced via BioTrack allotment system.</p>
      </div>
    </div>
  )
}
