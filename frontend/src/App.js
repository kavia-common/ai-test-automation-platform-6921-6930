import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

/**
 * Small helper to get the API base from env with a safe default.
 * CRA exposes REACT_APP_* vars at build time.
 */
function useApiBase() {
  const apiBase = useMemo(() => {
    const v =
      process.env.REACT_APP_API_BASE ||
      process.env.REACT_APP_BACKEND_URL ||
      'http://localhost:8000';
    // Trim trailing slash for consistent path joining
    return v.replace(/\/+$/, '');
  }, []);
  return apiBase;
}

/**
 * API client helpers for CRUD and execution.
 */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

// PUBLIC_INTERFACE
function App() {
  const apiBase = useApiBase();

  // Theme handling
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  // Health
  const [health, setHealth] = useState({ status: 'unknown' });
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState('');

  // Tests state
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state for create/update
  const [form, setForm] = useState({ name: '', steps: '' });
  const [editingId, setEditingId] = useState(null);

  // Run results
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [runResults, setRunResults] = useState([]);

  // Fetch health and test list on mount
  useEffect(() => {
    // Health
    (async () => {
      setHealthLoading(true);
      setHealthError('');
      try {
        const h = await apiFetch(`${apiBase}/health`);
        setHealth(h);
      } catch (e) {
        setHealthError(e.message);
      } finally {
        setHealthLoading(false);
      }
    })();

    // Tests
    refreshTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  // PUBLIC_INTERFACE
  async function refreshTests() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`${apiBase}/tests`);
      setTests(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // PUBLIC_INTERFACE
  async function handleCreateOrUpdate(e) {
    e.preventDefault();
    setError('');
    const payload = {
      name: form.name.trim(),
      steps: form.steps
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    };
    if (!payload.name) {
      setError('Name is required.');
      return;
    }
    try {
      if (editingId) {
        await apiFetch(`${apiBase}/tests/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`${apiBase}/tests`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setForm({ name: '', steps: '' });
      setEditingId(null);
      await refreshTests();
    } catch (e) {
      setError(e.message);
    }
  }

  // PUBLIC_INTERFACE
  async function handleEdit(t) {
    setEditingId(t.id);
    setForm({ name: t.name, steps: (t.steps || []).join('\n') });
  }

  // PUBLIC_INTERFACE
  async function handleDelete(id) {
    setError('');
    try {
      await apiFetch(`${apiBase}/tests/${id}`, { method: 'DELETE' });
      await refreshTests();
    } catch (e) {
      setError(e.message);
    }
  }

  // PUBLIC_INTERFACE
  async function handleRunAll() {
    setRunError('');
    setRunning(true);
    setRunResults([]);
    try {
      const ids = tests.map((t) => t.id);
      if (ids.length === 0) {
        setRunError('No tests available to run.');
      } else {
        const result = await apiFetch(`${apiBase}/tests/run`, {
          method: 'POST',
          body: JSON.stringify({ ids }),
        });
        const list = (result && result.results) || [];
        setRunResults(list);
      }
    } catch (e) {
      setRunError(e.message);
    } finally {
      setRunning(false);
    }
  }

  // Styling helpers - Corporate Navy theme
  const styles = {
    app: {
      minHeight: '100vh',
      background: '#F3F4F6',
      color: '#111827',
    },
    topbar: {
      background: '#1E3A8A',
      color: '#fff',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
    },
    brand: {
      fontWeight: 700,
      letterSpacing: '0.3px',
    },
    container: {
      maxWidth: 1100,
      margin: '24px auto',
      padding: '0 16px',
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '16px',
    },
    card: {
      background: '#FFFFFF',
      borderRadius: 10,
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      padding: 16,
      border: '1px solid #e5e7eb',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 12,
      color: '#1F2937',
    },
    button: {
      background: '#1E3A8A',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      padding: '10px 14px',
      cursor: 'pointer',
      fontWeight: 600,
    },
    buttonAlt: {
      background: '#F59E0B',
      color: '#111827',
      border: 'none',
      borderRadius: 8,
      padding: '10px 14px',
      cursor: 'pointer',
      fontWeight: 700,
    },
    danger: {
      background: '#DC2626',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      padding: '8px 12px',
      cursor: 'pointer',
      fontWeight: 600,
    },
    input: {
      width: '100%',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
      padding: '10px 12px',
      marginBottom: 8,
      fontSize: 14,
    },
    textarea: {
      width: '100%',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
      padding: '10px 12px',
      minHeight: 100,
      fontSize: 14,
      resize: 'vertical',
      marginBottom: 8,
    },
    muted: { color: '#6B7280', fontSize: 14 },
    statusPillOk: {
      background: 'rgba(5,150,105,0.1)',
      color: '#059669',
      border: '1px solid rgba(5,150,105,0.3)',
      padding: '4px 8px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
    },
    statusPillBad: {
      background: 'rgba(220,38,38,0.1)',
      color: '#DC2626',
      border: '1px solid rgba(220,38,38,0.3)',
      padding: '4px 8px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
    },
    smallBtn: {
      background: '#1E3A8A',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      padding: '6px 10px',
      cursor: 'pointer',
      fontWeight: 600,
      marginRight: 8,
    },
    toolbar: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      flexWrap: 'wrap',
    },
  };

  return (
    <div className="App" style={styles.app}>
      <header style={styles.topbar}>
        <div>
          <span style={styles.brand}>AI Test Automation</span>
          <span style={{ ...styles.muted, marginLeft: 10 }}>
            API: {apiBase}
          </span>
        </div>
        <div className="toolbar" style={styles.toolbar}>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button style={styles.button} onClick={refreshTests} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      <main style={styles.container}>
        <section style={styles.card} aria-live="polite">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={styles.sectionTitle}>Service Health</h2>
            {healthLoading ? (
              <span style={styles.muted}>Checking…</span>
            ) : healthError ? (
              <span style={styles.statusPillBad}>DOWN</span>
            ) : health.status === 'ok' ? (
              <span style={styles.statusPillOk}>OK</span>
            ) : (
              <span style={styles.statusPillBad}>{health.status || 'UNKNOWN'}</span>
            )}
          </div>
          {healthError && (
            <div role="alert" style={{ ...styles.muted, color: '#DC2626', marginTop: 6 }}>
              {healthError}
            </div>
          )}
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>{editingId ? 'Edit Test' : 'Create Test'}</h2>
          <form onSubmit={handleCreateOrUpdate}>
            <label>
              <div style={styles.muted}>Name</div>
              <input
                aria-label="Test name"
                style={styles.input}
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="E2E: User can sign in"
              />
            </label>
            <label>
              <div style={styles.muted}>Steps (one per line)</div>
              <textarea
                aria-label="Test steps"
                style={styles.textarea}
                value={form.steps}
                onChange={(e) => setForm((f) => ({ ...f, steps: e.target.value }))}
                placeholder={'1) Go to /login\n2) Enter credentials\n3) Click Sign in'}
              />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={styles.buttonAlt}>
                {editingId ? 'Update Test' : 'Create Test'}
              </button>
              {editingId && (
                <button
                  type="button"
                  style={styles.smallBtn}
                  onClick={() => {
                    setEditingId(null);
                    setForm({ name: '', steps: '' });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          {error && (
            <div role="alert" style={{ marginTop: 8, color: '#DC2626', fontWeight: 600 }}>
              {error}
            </div>
          )}
        </section>

        <section style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={styles.sectionTitle}>Tests</h2>
            <button onClick={handleRunAll} style={styles.button} disabled={running || tests.length === 0}>
              {running ? 'Running…' : 'Run All'}
            </button>
          </div>
          {loading ? (
            <div style={styles.muted}>Loading tests…</div>
          ) : tests.length === 0 ? (
            <div style={styles.muted}>No tests yet. Create one above to get started.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {tests.map((t) => (
                <div
                  key={t.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#fff',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                    <div style={{ ...styles.muted, marginTop: 4 }}>
                      {Array.isArray(t.steps) ? t.steps.length : 0} step(s)
                    </div>
                  </div>
                  <div>
                    <button style={styles.smallBtn} onClick={() => handleEdit(t)}>
                      Edit
                    </button>
                    <button style={styles.danger} onClick={() => handleDelete(t.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {runError && (
            <div role="alert" style={{ marginTop: 8, color: '#DC2626', fontWeight: 600 }}>
              {runError}
            </div>
          )}
          {runResults.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Results</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {runResults.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: 10,
                      background: 'linear-gradient(90deg, rgba(30,58,138,0.05), rgba(245,158,11,0.05))',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{r.name}</div>
                      <div style={styles.muted}>Duration: {r.duration_ms} ms</div>
                    </div>
                    <div>
                      {r.status === 'pass' ? (
                        <span style={styles.statusPillOk}>PASS</span>
                      ) : (
                        <span style={styles.statusPillBad}>FAIL</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
