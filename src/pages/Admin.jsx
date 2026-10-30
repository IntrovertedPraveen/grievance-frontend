import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { ROLE_LABEL } from '../constants.js';

export default function Admin() {
  const [constituencies, setConstituencies] = useState([]);
  const [wards, setWards] = useState([]);
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [cName, setCName] = useState('');
  const [wName, setWName] = useState('');
  const [wConstituency, setWConstituency] = useState('');
  const emptyUser = { name: '', email: '', password: '', role: 'COUNSELOR', wardId: '', constituencyId: '' };
  const [u, setU] = useState(emptyUser);

  const load = useCallback(async () => {
    try {
      const [c, w, us] = await Promise.all([api('/constituencies'), api('/wards'), api('/users')]);
      setConstituencies(c); setWards(w); setUsers(us);
    } catch (e) {
      setMsg({ type: 'alert', text: e.message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (fn, okText) => {
    setMsg({ type: '', text: '' });
    try {
      await fn();
      setMsg({ type: 'ok', text: okText });
      load();
    } catch (e) {
      setMsg({ type: 'alert', text: e.message });
    }
  };

  const addConstituency = (e) => {
    e.preventDefault();
    run(async () => { await api('/constituencies', { method: 'POST', body: { name: cName } }); setCName(''); }, 'Constituency added');
  };

  const addWard = (e) => {
    e.preventDefault();
    run(async () => {
      await api('/wards', { method: 'POST', body: { name: wName, constituency: { id: Number(wConstituency) } } });
      setWName('');
    }, 'Ward added');
  };

  const addUser = (e) => {
    e.preventDefault();
    run(async () => {
      await api('/users/register', {
        method: 'POST',
        body: {
          name: u.name, email: u.email, password: u.password, role: u.role,
          ward: u.role === 'COUNSELOR' ? { id: Number(u.wardId) } : null,
          constituency: u.role === 'MLA' ? { id: Number(u.constituencyId) } : null,
        },
      });
      setU(emptyUser);
    }, 'User created');
  };

  const removeUser = (user) => {
    if (!window.confirm(`Delete ${user.name}? Their complaints will become unassigned.`)) return;
    run(() => api(`/users/${user.id}`, { method: 'DELETE' }), 'User deleted');
  };

  const setUF = (k) => (e) => setU({ ...u, [k]: e.target.value });

  return (
    <section>
      <h1>Manage locations and officials</h1>
      <p className="lead">Set up constituencies and wards first, then create the counselors and MLAs who look after them.</p>
      {msg.text && <div className={msg.type === 'ok' ? 'notice' : 'alert'}>{msg.text}</div>}

      <div className="grid2">
        <form className="panel form" onSubmit={addConstituency}>
          <h3>Add a constituency</h3>
          <label>Name <input value={cName} onChange={(e) => setCName(e.target.value)} required /></label>
          <button className="btn primary">Add constituency</button>
        </form>

        <form className="panel form" onSubmit={addWard}>
          <h3>Add a ward</h3>
          <label>Ward name <input value={wName} onChange={(e) => setWName(e.target.value)} required /></label>
          <label>Constituency
            <select value={wConstituency} onChange={(e) => setWConstituency(e.target.value)} required>
              <option value="">Select</option>
              {constituencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <button className="btn primary">Add ward</button>
        </form>
      </div>

      <form className="panel form" onSubmit={addUser}>
        <h3>Create an official account</h3>
        <div className="row">
          <label>Full name <input value={u.name} onChange={setUF('name')} required /></label>
          <label>Email <input type="email" value={u.email} onChange={setUF('email')} required /></label>
        </div>
        <div className="row">
          <label>Password (6+ characters) <input type="password" value={u.password} onChange={setUF('password')} minLength={6} required /></label>
          <label>Role
            <select value={u.role} onChange={setUF('role')}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        {u.role === 'COUNSELOR' && (
          <label>Ward
            <select value={u.wardId} onChange={setUF('wardId')} required>
              <option value="">Select ward</option>
              {wards.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.constituency?.name})</option>)}
            </select>
          </label>
        )}
        {u.role === 'MLA' && (
          <label>Constituency
            <select value={u.constituencyId} onChange={setUF('constituencyId')} required>
              <option value="">Select constituency</option>
              {constituencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <button className="btn primary">Create account</button>
      </form>

      <div className="grid2">
        <div className="panel">
          <h3>Constituencies and wards</h3>
          {constituencies.length === 0 && <p className="muted">None yet. Add a constituency to begin.</p>}
          {constituencies.map((c) => (
            <div key={c.id} className="group">
              <strong>{c.name}</strong>
              <ul>
                {wards.filter((w) => w.constituency?.id === c.id).map((w) => <li key={w.id}>{w.name}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="panel">
          <h3>Accounts</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Role</th><th>Area</th><th></th></tr></thead>
              <tbody>
                {users.map((x) => (
                  <tr key={x.id}>
                    <td>{x.name}<br /><span className="muted">{x.email}</span></td>
                    <td>{ROLE_LABEL[x.role]}</td>
                    <td>{x.ward?.name || x.constituency?.name || '-'}</td>
                    <td><button className="btn small danger" onClick={() => removeUser(x)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
