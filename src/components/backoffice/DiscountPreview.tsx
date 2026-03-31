'use client'

interface Props {
  name: string
  applicationMethod: string
  rewardType: string
  rewardValue: number
  constraintType: string
  constraintValue: number
  recurrenceDays: number[]
  customerTypes: string[]
  isStackable: boolean
  locationCount: number
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DiscountPreview(props: Props) {
  const parts: string[] = []

  // Constraint
  if (props.constraintValue > 0) {
    if (props.constraintType === 'min_quantity') parts.push(`Buy ${props.constraintValue}+ items`)
    else if (props.constraintType === 'min_spend') parts.push(`Spend $${props.constraintValue}+`)
    else if (props.constraintType === 'min_weight') parts.push(`Buy ${props.constraintValue}g+`)
  }

  // Reward
  if (props.rewardType === 'percentage') parts.push(`get ${props.rewardValue}% off`)
  else if (props.rewardType === 'fixed_amount') parts.push(`get $${props.rewardValue} off`)
  else if (props.rewardType === 'price_to_amount') parts.push(`price set to $${props.rewardValue}`)
  else if (props.rewardType === 'free_item') parts.push('get 1 free')
  else if (props.rewardType === 'bogo') parts.push(`get ${props.rewardValue} free`)

  // Schedule
  if (props.recurrenceDays.length > 0) {
    parts.push(`Every ${props.recurrenceDays.map(d => DAYS[d]).join(', ')}`)
  }

  // Targeting
  if (props.customerTypes.length === 1) {
    parts.push(`${props.customerTypes[0]} customers only`)
  }

  parts.push(props.locationCount === 0 ? 'All locations' : `${props.locationCount} location${props.locationCount > 1 ? 's' : ''}`)
  parts.push(props.isStackable ? 'Stacks with other discounts' : 'Does not stack')

  return (
    <div className="bg-gray-900 rounded-lg p-3 text-sm text-gray-300">
      <p className="font-medium text-gray-50 mb-1">{props.name || 'Untitled Discount'}</p>
      <p>{parts.filter(Boolean).join('. ')}.</p>
      <p className="text-xs text-gray-500 mt-1 capitalize">Type: {props.applicationMethod || 'automatic'}</p>
    </div>
  )
}
