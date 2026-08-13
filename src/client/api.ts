// Data access: the same-origin endpoint registered by the Host half.

import type { QuotaView } from '../types'

export function fetchQuota(target?: string | null, force?: boolean): Promise<QuotaView> {
  let url = '/provider-quota/quota.json'
  const qs: string[] = []
  if (target) qs.push('provider=' + encodeURIComponent(target))
  if (force) qs.push('force=1')
  if (qs.length > 0) url += '?' + qs.join('&')
  return fetch(url, { headers: { accept: 'application/json' } }).then((res) => {
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return res.json() as Promise<QuotaView>
  })
}
