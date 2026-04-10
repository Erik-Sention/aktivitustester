import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { adminStorage } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const athleteId = formData.get('athleteId') as string | null

  if (!file || !athleteId) {
    return NextResponse.json({ error: 'Missing file or athleteId' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (!storageBucket) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }

  const bucket = adminStorage.bucket(storageBucket)
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `athletes/${athleteId}/${timestamp}-${safeName}`
  const fileRef = bucket.file(filePath)

  await fileRef.save(buffer, {
    metadata: { contentType: 'application/pdf' },
  })

  const [url] = await fileRef.getSignedUrl({
    action: 'read',
    expires: '2099-01-01',
  })

  return NextResponse.json({ url, fileName: file.name })
}
