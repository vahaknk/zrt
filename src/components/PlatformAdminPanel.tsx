import { useState } from 'react';

interface Registration {
  id: number;
  full_name: string;
  email: string;
}

interface Member {
  id: number;
  full_name: string;
  email: string;
  registration_request: number;
  workshop: { id: number; name: string } | null;
  clouds: Array<{ clouds_id: { id: number; name: string } }>;
}

interface Workshop {
  id: number;
  name: string;
}

interface Cloud {
  id: number;
  name: string;
  bundle: { name: string } | null;
}

interface Props {
  pw: string;
  enrolledRegistrations: Registration[];
  members: Member[];
  workshops: Workshop[];
  clouds: Cloud[];
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
  padding: '1.2rem 1.5rem',
  marginBottom: '1.5rem',
};

const inputStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem',
  border: '1px solid #ccc',
  borderRadius: 6,
  fontSize: '0.9rem',
  fontFamily: 'inherit',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.4rem 1.1rem',
  background: '#000',
  color: '#fff',
  border: 'none',
  borderRadius: 999,
  fontWeight: 700,
  fontSize: '0.85rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export default function PlatformAdminPanel({ pw, enrolledRegistrations, members: initialMembers, workshops, clouds }: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [regId, setRegId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ email: string; password: string } | null>(null);
  const [createError, setCreateError] = useState('');

  const [assignState, setAssignState] = useState<Record<number, { workshop: string; clouds: Set<number> }>>(
    Object.fromEntries(
      initialMembers.map((m) => [m.id, { workshop: m.workshop?.id ? String(m.workshop.id) : '', clouds: new Set(m.clouds.map((c) => c.clouds_id.id)) }])
    )
  );
  const [savingId, setSavingId] = useState<number | null>(null);
  const [saveMsg, setSaveMsg] = useState<Record<number, string>>({});

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regId || !newPassword) return;
    setCreating(true);
    setCreateError('');
    setCreateResult(null);
    try {
      const res = await fetch('/api/platform/create-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pw, registration_id: Number(regId), password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateResult({ email: data.email, password: data.password });
        const reg = enrolledRegistrations.find((r) => r.id === Number(regId));
        if (reg) {
          const newMember: Member = { id: data.id, full_name: reg.full_name, email: reg.email, registration_request: reg.id, workshop: null, clouds: [] };
          setMembers((m) => [...m, newMember]);
          setAssignState((s) => ({ ...s, [data.id]: { workshop: '', clouds: new Set() } }));
        }
        setRegId('');
        setNewPassword('');
      } else {
        setCreateError(data.error ?? 'Failed to create member');
      }
    } catch {
      setCreateError('Failed to create member');
    }
    setCreating(false);
  };

  const toggleCloud = (memberId: number, cloudId: number) => {
    setAssignState((s) => {
      const cur = s[memberId] ?? { workshop: '', clouds: new Set<number>() };
      const nextClouds = new Set(cur.clouds);
      if (nextClouds.has(cloudId)) nextClouds.delete(cloudId);
      else nextClouds.add(cloudId);
      return { ...s, [memberId]: { ...cur, clouds: nextClouds } };
    });
  };

  const setWorkshop = (memberId: number, workshopId: string) => {
    setAssignState((s) => ({ ...s, [memberId]: { ...(s[memberId] ?? { clouds: new Set<number>() }), workshop: workshopId } }));
  };

  const saveAssignment = async (memberId: number) => {
    const state = assignState[memberId];
    setSavingId(memberId);
    try {
      const res = await fetch('/api/platform/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pw,
          member_id: memberId,
          workshop_id: state.workshop ? Number(state.workshop) : null,
          cloud_ids: [...state.clouds],
        }),
      });
      setSaveMsg((m) => ({ ...m, [memberId]: res.ok ? '✓ Saved' : '✗ Error' }));
    } catch {
      setSaveMsg((m) => ({ ...m, [memberId]: '✗ Error' }));
    }
    setSavingId(null);
    setTimeout(() => setSaveMsg((m) => { const n = { ...m }; delete n[memberId]; return n; }), 2500);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem' }}>Platform Members Admin</h1>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Create Member Account</h2>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={regId} onChange={(e) => setRegId(e.target.value)} style={inputStyle} required>
            <option value="" disabled>Select an enrolled registration…</option>
            {enrolledRegistrations.map((r) => (
              <option key={r.id} value={r.id}>{r.full_name} ({r.email})</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Initial password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={inputStyle}
            required
          />
          <button type="submit" disabled={creating} style={buttonStyle}>
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
        {enrolledRegistrations.length === 0 && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#888' }}>
            No enrolled registrations without an existing account.
          </p>
        )}
        {createResult && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#00691e' }}>
            ✓ Created — {createResult.email} / <strong>{createResult.password}</strong> (relay this to the family, it won't be shown again)
          </p>
        )}
        {createError && <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#c00' }}>{createError}</p>}
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Members</h2>
        {members.length === 0 ? (
          <p style={{ fontSize: '0.9rem', color: '#888' }}>No members yet.</p>
        ) : (
          members.map((m) => {
            const state = assignState[m.id] ?? { workshop: '', clouds: new Set<number>() };
            return (
              <div key={m.id} style={{ borderTop: '1px solid #eee', padding: '1rem 0' }}>
                <div style={{ fontWeight: 600 }}>{m.full_name} <span style={{ fontWeight: 400, color: '#888' }}>({m.email})</span></div>
                <div style={{ marginTop: '0.6rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>Workshop</label>
                    <select value={state.workshop} onChange={(e) => setWorkshop(m.id, e.target.value)} style={inputStyle}>
                      <option value="">— none —</option>
                      {workshops.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>Clouds</label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {clouds.map((c) => (
                        <label key={c.id} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <input
                            type="checkbox"
                            checked={state.clouds.has(c.id)}
                            onChange={() => toggleCloud(m.id, c.id)}
                          />
                          {c.name} {c.bundle && <span style={{ color: '#aaa' }}>({c.bundle.name})</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => saveAssignment(m.id)}
                    disabled={savingId === m.id}
                    style={{ ...buttonStyle, alignSelf: 'flex-end' }}
                  >
                    {savingId === m.id ? 'Saving…' : 'Save'}
                  </button>
                  {saveMsg[m.id] && (
                    <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: saveMsg[m.id].startsWith('✓') ? '#00691e' : '#c00' }}>
                      {saveMsg[m.id]}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
