const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

function fromFirestoreValue(value: Record<string, unknown>): unknown {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('nullValue' in value) return null
  if ('timestampValue' in value) return value.timestampValue
  if ('mapValue' in value) {
    const fields = (value.mapValue as { fields?: Record<string, Record<string, unknown>> }).fields ?? {}
    return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromFirestoreValue(v)]))
  }
  if ('arrayValue' in value) {
    const vals = (value.arrayValue as { values?: Array<Record<string, unknown>> }).values ?? []
    return vals.map(fromFirestoreValue)
  }
  return undefined
}

function toFirestoreValue(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (typeof value === 'string') return { stringValue: value }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toFirestoreValue(v)])
        ),
      },
    }
  }
  return { stringValue: String(value) }
}

function parseDoc(doc: { name: string; fields?: Record<string, Record<string, unknown>> }): Record<string, unknown> {
  const fields = doc.fields ?? {}
  const result: Record<string, unknown> = Object.fromEntries(
    Object.entries(fields).map(([key, val]) => [key, fromFirestoreValue(val)])
  )
  const parts = doc.name.split('/')
  result._id = parts[parts.length - 1]
  return result
}

export async function exchangeRefreshToken(refreshToken: string): Promise<string> {
  const res = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    }
  )
  if (!res.ok) throw new Error('Failed to exchange refresh token')
  const data = await res.json()
  return data.id_token as string
}

export async function firestoreGet(
  collection: string,
  docId: string,
  idToken: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${BASE}/${collection}/${docId}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Firestore GET failed: ${res.status}`)
  const doc = await res.json()
  return parseDoc(doc)
}

export async function firestoreSet(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
  idToken: string
): Promise<void> {
  const fields = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, toFirestoreValue(v)])
  )
  const fieldPaths = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&')
  const res = await fetch(`${BASE}/${collection}/${docId}?${fieldPaths}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(`Firestore SET failed: ${res.status} ${await res.text()}`)
}

type FieldFilterOp = 'EQUAL' | 'NOT_EQUAL' | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL'

interface FieldFilter {
  field: string
  op: FieldFilterOp
  value: unknown
}

export async function firestoreQuery(
  collection: string,
  filters: FieldFilter[],
  idToken: string,
  orderByField?: string,
  direction: 'ASCENDING' | 'DESCENDING' = 'DESCENDING'
): Promise<Array<Record<string, unknown>>> {
  const where = filters.length === 1
    ? { fieldFilter: { field: { fieldPath: filters[0].field }, op: filters[0].op, value: toFirestoreValue(filters[0].value) } }
    : { compositeFilter: { op: 'AND', filters: filters.map(f => ({ fieldFilter: { field: { fieldPath: f.field }, op: f.op, value: toFirestoreValue(f.value) } })) } }

  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId: collection }],
    where,
  }
  if (orderByField) {
    structuredQuery.orderBy = [{ field: { fieldPath: orderByField }, direction }]
  }

  // runQuery paginates via offset — fetch in pages of 300 until no more results
  const results: Array<Record<string, unknown>> = []
  let offset = 0
  const pageSize = 300

  while (true) {
    const query = { ...structuredQuery, limit: pageSize, offset }
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery: query }),
      }
    )
    if (!res.ok) throw new Error(`Firestore QUERY failed: ${res.status}`)
    const rows = await res.json() as Array<{ document?: { name: string; fields?: Record<string, Record<string, unknown>> } }>
    const docs = rows.filter(r => r.document).map(r => parseDoc(r.document!))
    results.push(...docs)
    if (docs.length < pageSize) break
    offset += pageSize
  }

  return results
}

export async function firestoreList(
  collection: string,
  idToken: string
): Promise<Array<Record<string, unknown>>> {
  const results: Array<Record<string, unknown>> = []
  let pageToken: string | undefined

  do {
    const url = pageToken
      ? `${BASE}/${collection}?pageToken=${encodeURIComponent(pageToken)}`
      : `${BASE}/${collection}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } })
    if (!res.ok) throw new Error(`Firestore LIST failed: ${res.status}`)
    const body = await res.json()
    const documents = (body.documents ?? []) as Array<{ name: string; fields?: Record<string, Record<string, unknown>> }>
    results.push(...documents.map(parseDoc))
    pageToken = body.nextPageToken
  } while (pageToken)

  return results
}
