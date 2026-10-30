import { useState } from 'react';
import { api, fmtDate } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Track() {
  const [id, setId] = useState('');
  const [contact, setContact] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setBusy(true);
    try {
      setResult(await api(`/grievances/track?id=${encodeURIComponent(id)}&contact=${encodeURIComponent(contact)}`, { auth: false }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="narrow">
      <h1>Check your complaint</h1>
      <p className="lead">Enter the complaint number you were given and the mobile number you used.</p>

      <form className="form" onSubmit={search}>
        {error && <div className="alert">{error}</div>}
        <div className="row">
          <label>Complaint number
            <input value={id} onChange={(e) => setId(e.target.value)} inputMode="numeric" required />
          </label>
          <label>Mobile number
            <input value={contact} onChange={(e) => setContact(e.target.value)} inputMode="numeric" maxLength={10} required />
          </label>
        </div>
        <button className="btn primary" disabled={busy}>{busy ? 'Looking…' : 'Check status'}</button>
      </form>

      {result && (
        <div className="panel">
          <div className="panel-head">
            <h2>Complaint {result.id}</h2>
            <StatusBadge status={result.status} />
          </div>
          <dl className="facts">
            <dt>Category</dt><dd>{result.category}</dd>
            <dt>Ward</dt><dd>{result.ward}</dd>
            <dt>Handled by</dt><dd>{result.assignedTo || 'Not assigned yet'}</dd>
            <dt>Filed on</dt><dd>{fmtDate(result.submittedAt)}</dd>
            <dt>Last update</dt><dd>{fmtDate(result.updatedAt)}</dd>
            <dt>Your complaint</dt><dd>{result.description}</dd>
            <dt>Officer's note</dt><dd>{result.remarks || 'No note yet'}</dd>
          </dl>
        </div>
      )}
    </section>
  );
}
