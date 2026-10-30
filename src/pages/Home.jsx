import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { CATEGORIES } from '../constants.js';
import ICON from "../assets/complaint.png";

const EMPTY = { citizenName: '', contactNumber: '', category: '', description: '' };

export default function Home() {
  const [wards, setWards] = useState([]);
  const [constituencyId, setConstituencyId] = useState('');
  const [wardId, setWardId] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    api('/wards', { auth: false }).then(setWards).catch((e) => setError(e.message));
  }, []);

  const constituencies = useMemo(() => {
    const map = new Map();
    wards.forEach((w) => w.constituency && map.set(w.constituency.id, w.constituency));
    return [...map.values()];
  }, [wards]);

  const wardOptions = wards.filter((w) => String(w.constituency?.id) === String(constituencyId));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(form.contactNumber)) {
      setError('Enter a 10-digit mobile number, digits only.');
      return;
    }
    setBusy(true);
    try {
      const res = await api('/grievances', {
        method: 'POST',
        auth: false,
        body: { ...form, ward: { id: Number(wardId) } },
      });
      setReceipt({ ...res, contact: form.contactNumber });
      setForm(EMPTY);
      setConstituencyId('');
      setWardId('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (receipt) {
    return (
      <section className="narrow">
        <div className="ticket">
          <div className="ticket-main">
            <p className="muted">Complaint registered in {receipt.ward}</p>
            <h1>Keep this number</h1>
            <p>
              Use it with your mobile number ({receipt.contact}) to check progress any time.
              Your ward counselor has been notified.
            </p>
            <div className="ticket-actions">
              <Link to="/track" className="btn">Track this complaint</Link>
              <button className="btn ghost" onClick={() => setReceipt(null)}>File another</button>
            </div>
          </div>
          <div className="ticket-stub">
            <span>Complaint no.</span>
            <strong>{receipt.id}</strong>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="split">
      <div className="split-form">
      <h1>Report a problem in your ward</h1>
      <p className="lead">
        Tell us what's wrong and where. Your complaint goes straight to your ward counselor,
        and your MLA can see it too.
      </p>
      <form className="form" onSubmit={submit}>
        {error && <div className="alert">{error}</div>}

        <div className="row">
          <label>Your name
            <input value={form.citizenName} onChange={set('citizenName')} required />
          </label>
          <label>Mobile number
            <input value={form.contactNumber} onChange={set('contactNumber')} inputMode="numeric"
                  maxLength={10} placeholder="10 digits" required />
          </label>
        </div>

        <div className="row">
          <label>Constituency
            <select value={constituencyId} onChange={(e) => { setConstituencyId(e.target.value); setWardId(''); }} required>
              <option value="">Select constituency</option>
              {constituencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Ward
            <select value={wardId} onChange={(e) => setWardId(e.target.value)} required disabled={!constituencyId}>
              <option value="">Select ward</option>
              {wardOptions.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
        </div>

        <label>What is the problem about?
          <select value={form.category} onChange={set('category')}>
            <option value="">Not sure, let the system decide</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>

        <label>Describe it
          <textarea rows={5} value={form.description} onChange={set('description')}
                    placeholder="What happened, since when, and the nearest landmark or street" required />
        </label>

        <button className="btn primary" disabled={busy}>{busy ? 'Registering…' : 'Register complaint'}</button>
      </form>
      </div>
      <img src = {ICON} className="split-image" aria-hidden="true" />
    </section>
  );
}
