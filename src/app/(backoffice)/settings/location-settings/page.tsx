import { SettingsHub } from './SettingsHub'

export default async function LocationSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ location_id?: string }>
}) {
  const { location_id: locationId } = await searchParams
  return <SettingsHub initialLocationId={locationId} />
}
