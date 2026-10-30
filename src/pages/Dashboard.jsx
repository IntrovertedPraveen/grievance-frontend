import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { CATEGORIES, STATUS_LABEL, PRIORITY } from '../constants.js';

function scopeTitle(user) {
  switch (user.role) {
    case 'COUNSELOR': return { h: user.ward?.name || 'Your ward', sub: 'Complaints from your ward' };
    case 'MLA': return { h: user.constituency?.name || 'Your constituency', sub: 'Complaints across every ward in your constituency' };
    case 'CM': return { h: 'Tamil Nadu', sub: 'Statewide view of all complaints (view only)' };
    default: return { h: 'All complaints', sub: 'System-wide view' };
  }
}

function Bars({ title, data }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(1, ...entries.map((e) => e[1]));
  return (
    <div className="panel">
      <h3>{title}</h3>
      {entries.length === 0 && <p className="muted">Nothing to show yet.</p>}
      {entries.map(([k, v]) => (
        <div key={k} className="bar-row">
          <span className="bar-label" title={k}>{k}</span>
          <div className="bar"><div style={{ width: `${(v / max) * 100}%` }} /></div>
          <span className="bar-val">{v}</span>
        </div>
      ))}
    </div>
  );
}

function EditModal({ grievance, counselors, canAssign, onClose, onSaved }) {
  const [status, setStatus] = useState(grievance.status);
  const [remarks, setRemarks] = useState(grievance.remarks || '');
  const [assignee, setAssignee] = useState(grievance.assignedTo?.id || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/grievances/${grievance.id}/status`, { method: 'PUT', body: { status, remarks } });
      if (canAssign && assignee && Number(assignee) !== grievance.assignedTo?.id) {
        await api(`/grievances/${grievance.id}/assign/${assignee}`, { method: 'PUT' });
      }
      onSaved();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Complaint {grievance.id}</h2>
        <p className="muted">{grievance.category} · {grievance.ward?.name}</p>
        <p>{grievance.description}</p>
        <p className="muted">Filed by {grievance.citizenName}, {grievance.contactNumber}</p>

        {error && <div className="alert">{error}</div>}

        <label>Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>Note for the citizen
          <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)}
                    placeholder="What was done, or what happens next" />
        </label>
        {canAssign && (
          <label>Assigned counselor
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Unassigned</option>
              {counselors.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.ward?.name})</option>)}
            </select>
          </label>
        )}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [wards, setWards] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', wardId: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const canEdit = ['ADMIN', 'COUNSELOR', 'MLA'].includes(user.role);
  const canAssign = ['ADMIN', 'MLA'].includes(user.role);
  const showWardFilter = user.role !== 'COUNSELOR';
  const title = scopeTitle(user);

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
      const [list, st] = await Promise.all([api(`/grievances/my?${params}`), api('/grievances/stats')]);
      setItems(list);
      setStats(st);
    } catch (e) {
      setError(e.message);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (showWardFilter) {
      api('/wards', { auth: false }).then((all) =>
        setWards(user.role === 'MLA' ? all.filter((w) => w.constituency?.id === user.constituency?.id) : all)
      ).catch(() => {});
    }
    if (canAssign) api('/users/counselors').then(setCounselors).catch(() => {});
  }, [user, showWardFilter, canAssign]);

  const setFilter = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  const resolutionRate = stats && stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <section>
      <h1>{title.h}</h1>
      <p className="lead">{title.sub}</p>
      {error && <div className="alert">{error}</div>}

      {stats && (
        <>
          <div className="strip">
            <div><strong>{stats.total}</strong><span>Total</span></div>
            <div><strong className="c-pending">{stats.pending}</strong><span>Pending</span></div>
            <div><strong className="c-progress">{stats.inProgress}</strong><span>In progress</span></div>
            <div><strong className="c-resolved">{stats.resolved}</strong><span>Resolved ({resolutionRate}%)</span></div>
          </div>

          <div className="grid2">
            <Bars title="By category" data={stats.byCategory} />
            {user.role === 'COUNSELOR'
              ? null
              : <Bars title={user.role === 'MLA' ? 'By ward' : 'By constituency'}
                      data={user.role === 'MLA' ? stats.byWard : stats.byConstituency} />}
          </div>
        </>
      )}

      <div className="filters">
        <select value={filters.status} onChange={setFilter('status')}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.category} onChange={setFilter('category')}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filters.priority} onChange={setFilter('priority')}>
          <option value="">All priority</option>
          {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={v}>{v}</option>)}
        </select>
        {showWardFilter && (
          <select value={filters.wardId} onChange={setFilter('wardId')}>
            <option value="">All wards</option>
            {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
        <button className="btn ghost" onClick={() => setFilters({ status: '', category: '', priority: '', wardId: '' })}>Clear filters</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>No.</th><th>Citizen</th><th>Category</th><th>Ward</th><th>Complaint</th>
              <th>Priority</th><th>Status</th><th>Handled by</th><th>Filed</th>{canEdit && <th></th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={10} className="muted center">No complaints match these filters.</td></tr>
            )}
            {items.map((g) => (
              <tr key={g.id}>
                <td>{g.id}</td>
                <td>{g.citizenName}<br /><span className="muted">{g.contactNumber}</span></td>
                <td>{g.category}</td>
                <td>{g.ward?.name}</td>
                <td className="desc">
                  {g.description}
                  {g.aiSummary && <div className="muted">Summary: {g.aiSummary}</div>}
                </td>
                <td>{g.priority && <span className={`badge p-${g.priority}`}>{g.priority.toLowerCase()}</span>}</td>
                <td><StatusBadge status={g.status} /></td>
                <td>{g.assignedTo?.name || <span className="muted">Unassigned</span>}</td>
                <td>{fmtDate(g.submittedAt)}</td>
                {canEdit && <td><button className="btn small" onClick={() => setEditing(g)}>Update</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal
          grievance={editing}
          counselors={counselors}
          canAssign={canAssign}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </section>
  );
}
