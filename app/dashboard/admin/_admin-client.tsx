"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

type Tab = 'coaches' | 'athletes' | 'tests' | 'export' | 'seed'

interface UserDoc {
  _id: string
  email: string
  role: 'ADMIN' | 'TRAINER'
  createdAt?: string
}

interface ArchivedAthlete {
  _id: string
  firstName?: string
  lastName?: string
  email?: string
  archivedAt?: string
  archivedReason?: string
}

interface ArchivedTest {
  _id: string
  athleteId?: string
  sport?: string
  testType?: string
  testDate?: { _seconds?: number }
  archivedAt?: string
  archivedReason?: string
}

export function AdminClient() {
  const [tab, setTab] = useState<Tab>('coaches')

  // Coaches state
  const [users, setUsers] = useState<UserDoc[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [pendingRoles, setPendingRoles] = useState<Record<string, 'ADMIN' | 'TRAINER'>>({})
  const [saving, setSaving] = useState<string | null>(null)

  // Archived athletes state
  const [archivedAthletes, setArchivedAthletes] = useState<ArchivedAthlete[]>([])
  const [athletesLoading, setAthletesLoading] = useState(false)
  const [athletesFetched, setAthletesFetched] = useState(false)

  // Archived tests state
  const [archivedTests, setArchivedTests] = useState<ArchivedTest[]>([])
  const [testsLoading, setTestsLoading] = useState(false)
  const [testsFetched, setTestsFetched] = useState(false)

  const [restoring, setRestoring] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Export state
  const today = new Date().toISOString().slice(0, 10)
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const [exportFrom, setExportFrom] = useState(oneYearAgo)
  const [exportTo, setExportTo] = useState(today)
  const [exportTestType, setExportTestType] = useState('')
  const [exportSport, setExportSport] = useState('')
  const [exportLoading, setExportLoading] = useState(false)

  // Seed state
  const [seedLoading, setSeedLoading] = useState(false)
  const [seedResult, setSeedResult] = useState<string | null>(null)

  // Fetch coaches on mount
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/users', { signal: controller.signal })
      .then(r => r.json())
      .then((data: { users?: UserDoc[] }) => {
        const fetched = data.users ?? []
        setUsers(fetched)
        setPendingRoles(Object.fromEntries(fetched.map(u => [u._id, u.role])))
      })
      .catch(err => { if (err.name !== 'AbortError') setError('Kunde inte hämta coacher') })
      .finally(() => setUsersLoading(false))
    return () => controller.abort()
  }, [])

  const fetchArchivedAthletes = useCallback(() => {
    if (athletesFetched) return
    setAthletesLoading(true)
    fetch('/api/admin/archived?type=athletes')
      .then(r => r.json())
      .then((data: { items?: ArchivedAthlete[] }) => { setArchivedAthletes(data.items ?? []); setAthletesFetched(true) })
      .catch(() => setError('Kunde inte hämta arkiverade atleter'))
      .finally(() => setAthletesLoading(false))
  }, [athletesFetched])

  const fetchArchivedTests = useCallback(() => {
    if (testsFetched) return
    setTestsLoading(true)
    fetch('/api/admin/archived?type=tests')
      .then(r => r.json())
      .then((data: { items?: ArchivedTest[] }) => { setArchivedTests(data.items ?? []); setTestsFetched(true) })
      .catch(() => setError('Kunde inte hämta arkiverade tester'))
      .finally(() => setTestsLoading(false))
  }, [testsFetched])

  useEffect(() => {
    if (tab === 'athletes') fetchArchivedAthletes()
    if (tab === 'tests') fetchArchivedTests()
  }, [tab, fetchArchivedAthletes, fetchArchivedTests])

  async function saveRole(uid: string) {
    setSaving(uid)
    setError(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, role: pendingRoles[uid] }),
      })
      if (!res.ok) throw new Error()
      setUsers(prev => prev.map(u => u._id === uid ? { ...u, role: pendingRoles[uid] } : u))
    } catch {
      setError('Kunde inte spara rollen')
    } finally {
      setSaving(null)
    }
  }

  async function restore(type: 'athletes' | 'tests', id: string) {
    setRestoring(id)
    setError(null)
    try {
      const res = await fetch('/api/admin/restore', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      })
      if (!res.ok) throw new Error()
      if (type === 'athletes') setArchivedAthletes(prev => prev.filter(a => a._id !== id))
      if (type === 'tests') setArchivedTests(prev => prev.filter(t => t._id !== id))
    } catch {
      setError('Kunde inte återställa')
    } finally {
      setRestoring(null)
    }
  }

  function formatDate(iso?: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('sv-SE')
  }

  function formatFirestoreDate(ts?: { _seconds?: number }) {
    if (!ts?._seconds) return '—'
    return new Date(ts._seconds * 1000).toLocaleDateString('sv-SE')
  }

  async function handleExportBulk() {
    setExportLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ from: exportFrom, to: exportTo })
      if (exportTestType) params.set('testType', exportTestType)
      if (exportSport) params.set('sport', exportSport)
      const res = await fetch(`/api/admin/export?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const csv = await res.text()
      const bom = '﻿'
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `export-${exportFrom}-${exportTo}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Export misslyckades')
    } finally {
      setExportLoading(false)
    }
  }

  async function handleSeed() {
    setSeedLoading(true)
    setSeedResult(null)
    setError(null)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const text = await res.text()
      let data: { message?: string; error?: string } = {}
      try { data = JSON.parse(text) } catch { throw new Error(text.slice(0, 200) || `HTTP ${res.status}`) }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setSeedResult(data.message ?? 'Klart!')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seed misslyckades')
    } finally {
      setSeedLoading(false)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'coaches', label: 'Coacher' },
    { key: 'athletes', label: 'Arkiverade atleter' },
    { key: 'tests', label: 'Arkiverade tester' },
    { key: 'export', label: 'Exportera data' },
    { key: 'seed', label: 'Demodata' },
  ]

  return (
    <div className="container mx-auto px-6 max-w-5xl py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-primary">Adminpanel</h1>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-100 px-5 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#F5F5F7] rounded-2xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-primary shadow-apple-sm'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-apple-md overflow-hidden">
        {/* ── Coacher ── */}
        {tab === 'coaches' && (
          usersLoading ? <Loading /> : users.length === 0 ? <Empty text="Inga coacher hittades" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  <Th>E-post</Th><Th>Roll</Th><Th>Skapad</Th><th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u._id} className={i < users.length - 1 ? 'border-b border-black/[0.04]' : ''}>
                    <td className="px-6 py-4 text-primary">{u.email || <span className="text-secondary">—</span>}</td>
                    <td className="px-6 py-4">
                      <select
                        value={pendingRoles[u._id] ?? u.role}
                        onChange={e => setPendingRoles(prev => ({ ...prev, [u._id]: e.target.value as 'ADMIN' | 'TRAINER' }))}
                        className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-interactive/30"
                      >
                        <option value="TRAINER">Trainer</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-secondary">{formatDate(u.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      {pendingRoles[u._id] !== u.role && (
                        <ActionButton onClick={() => saveRole(u._id)} loading={saving === u._id} label="Spara" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* ── Arkiverade atleter ── */}
        {tab === 'athletes' && (
          athletesLoading ? <Loading /> : archivedAthletes.length === 0 && athletesFetched ? <Empty text="Inga arkiverade atleter" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  <Th>Namn</Th><Th>E-post</Th><Th>Arkiverad</Th><Th>Anledning</Th><th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {archivedAthletes.map((a, i) => (
                  <tr key={a._id} className={i < archivedAthletes.length - 1 ? 'border-b border-black/[0.04]' : ''}>
                    <td className="px-6 py-4 text-primary">
                      {[a.firstName, a.lastName].filter(Boolean).join(' ') || <span className="text-secondary">—</span>}
                    </td>
                    <td className="px-6 py-4 text-secondary">{a.email || '—'}</td>
                    <td className="px-6 py-4 text-secondary">{formatDate(a.archivedAt)}</td>
                    <td className="px-6 py-4 text-secondary max-w-[200px] truncate">{a.archivedReason || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <ActionButton onClick={() => restore('athletes', a._id)} loading={restoring === a._id} label="Återställ" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* ── Arkiverade tester ── */}
        {tab === 'tests' && (
          testsLoading ? <Loading /> : archivedTests.length === 0 && testsFetched ? <Empty text="Inga arkiverade tester" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  <Th>Testdatum</Th><Th>Sport</Th><Th>Typ</Th><Th>Arkiverad</Th><Th>Anledning</Th><th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {archivedTests.map((t, i) => (
                  <tr key={t._id} className={i < archivedTests.length - 1 ? 'border-b border-black/[0.04]' : ''}>
                    <td className="px-6 py-4 text-primary">{formatFirestoreDate(t.testDate)}</td>
                    <td className="px-6 py-4 text-secondary capitalize">{t.sport || '—'}</td>
                    <td className="px-6 py-4 text-secondary">{testTypeLabel(t.testType)}</td>
                    <td className="px-6 py-4 text-secondary">{formatDate(t.archivedAt)}</td>
                    <td className="px-6 py-4 text-secondary max-w-[180px] truncate">{t.archivedReason || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <ActionButton onClick={() => restore('tests', t._id)} loading={restoring === t._id} label="Återställ" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* ── Demodata ── */}
        {tab === 'seed' && (
          <div className="px-8 py-8 space-y-5">
            <p className="text-sm text-secondary">
              Skapar två demoatleter (Anna Lindgren och Erik Johansson) med nio tester. Fungerar bara i utvecklingsläge.
            </p>
            {seedResult && (
              <div className="rounded-2xl bg-green-50 border border-green-100 px-5 py-3 text-sm text-green-700">
                {seedResult}
              </div>
            )}
            <Button size="sm" onClick={handleSeed} disabled={seedLoading}>
              {seedLoading ? 'Skapar demodata…' : 'Seed demodata'}
            </Button>
          </div>
        )}

        {/* ── Exportera data ── */}
        {tab === 'export' && (
          <div className="px-8 py-8 space-y-6">
            <p className="text-sm text-secondary">
              Exporterar anonymiserad testdata som CSV. Atletnamn ersätts med ett stabilt ID (ATL-XXXX).
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-lg">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-secondary uppercase tracking-wide">Från</span>
                <input
                  type="date"
                  value={exportFrom}
                  onChange={e => setExportFrom(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-interactive/30"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-secondary uppercase tracking-wide">Till</span>
                <input
                  type="date"
                  value={exportTo}
                  onChange={e => setExportTo(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-interactive/30"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-secondary uppercase tracking-wide">Testtyp</span>
                <select
                  value={exportTestType}
                  onChange={e => setExportTestType(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-interactive/30"
                >
                  <option value="">Alla</option>
                  <option value="troskeltest">Tröskeltest</option>
                  <option value="vo2max">VO₂ max</option>
                  <option value="wingate">Wingate</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-secondary uppercase tracking-wide">Sport</span>
                <select
                  value={exportSport}
                  onChange={e => setExportSport(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-interactive/30"
                >
                  <option value="">Alla</option>
                  <option value="cykel">Cykel</option>
                  <option value="lopning">Löpning</option>
                  <option value="skidor_band">Skidor (band)</option>
                  <option value="skierg">SkiErg</option>
                  <option value="kajak">Kajak</option>
                </select>
              </label>
            </div>
            <button
              onClick={handleExportBulk}
              disabled={exportLoading || !exportFrom || !exportTo}
              className="rounded-xl bg-interactive text-white px-6 py-2.5 text-sm font-medium hover:bg-interactive/90 transition-colors disabled:opacity-50"
            >
              {exportLoading ? 'Exporterar…' : 'Ladda ned CSV'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-6 py-4 text-left font-medium text-secondary">{children}</th>
}

function Loading() {
  return <div className="px-6 py-12 text-center text-base text-secondary">Laddar…</div>
}

function Empty({ text }: { text: string }) {
  return <div className="px-6 py-12 text-center text-base text-secondary">{text}</div>
}

function ActionButton({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-xl bg-interactive text-white px-4 py-1.5 text-sm font-medium hover:bg-interactive/90 transition-colors disabled:opacity-50"
    >
      {loading ? '…' : label}
    </button>
  )
}

function testTypeLabel(type?: string) {
  if (type === 'troskeltest') return 'Tröskeltest'
  if (type === 'vo2max') return 'VO₂ max'
  if (type === 'wingate') return 'Wingate'
  return type || '—'
}
