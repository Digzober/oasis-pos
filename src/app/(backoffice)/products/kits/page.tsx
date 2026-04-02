import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/products/configure?tab=packing-lists')
}
