(function(){
  // Config: Read REACT_APP_API_BASE (CRA injects at build), fallback to localhost:8000
  const API_BASE = (window._env_ && window._env_.REACT_APP_API_BASE) || process.env?.REACT_APP_API_BASE || (typeof REACT_APP_API_BASE !== 'undefined' ? REACT_APP_API_BASE : '') || 'http://localhost:8000';

  // Simple toast
  function toast(message, type='info', timeout=2800){
    const cont = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type === 'error' ? 'error' : type === 'success' ? 'success' : ''}`;
    el.textContent = message;
    cont.appendChild(el);
    setTimeout(()=>cont.removeChild(el), timeout);
  }

  // API client
  async function api(path, options){
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, options || {}));
    if(!res.ok){
      const txt = await res.text().catch(()=> '');
      throw new Error(`API ${res.status}: ${txt || res.statusText}`);
    }
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : res.text();
  }

  const API = {
    health: () => api('/health'),
    listTests: () => api('/tests'),
    createTest: (data) => api('/tests', { method:'POST', body: JSON.stringify(data)}),
    updateTest: (id, data) => api(`/tests/${id}`, { method:'PUT', body: JSON.stringify(data)}),
    deleteTest: (id) => api(`/tests/${id}`, { method:'DELETE'}),
    run: (ids) => api('/tests/run', { method:'POST', body: JSON.stringify({ ids })})
  };

  // State
  const state = {
    tests: [],
    runs: [],
    results: []
  };

  // Elements
  const els = {
    tabs: document.querySelectorAll('.nav-item'),
    panels: {
      tests: document.getElementById('panel-tests'),
      runs: document.getElementById('panel-runs'),
      results: document.getElementById('panel-results')
    },
    testsTbody: document.getElementById('tests-tbody'),
    newTestBtn: document.getElementById('new-test'),
    formWrap: document.getElementById('test-form'),
    form: document.getElementById('form-test'),
    formId: document.getElementById('test-id'),
    formName: document.getElementById('test-name'),
    formSteps: document.getElementById('test-steps'),
    formCancel: document.getElementById('cancel-edit'),
    runAll: document.getElementById('run-all'),
    healthDot: document.getElementById('health-dot'),
    healthText: document.getElementById('health-text'),
    runsList: document.getElementById('runs-list'),
    results: document.getElementById('results')
  };

  // Tabs
  els.tabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      els.tabs.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const key = btn.getAttribute('data-tab');
      Object.values(els.panels).forEach(p=>p.classList.remove('active'));
      els.panels[key].classList.add('active');
    })
  });

  // Healthcheck
  async function checkHealth(){
    try{
      const data = await API.health();
      if(data && data.status === 'ok'){
        els.healthDot.style.background = 'var(--success)';
        els.healthText.textContent = 'Backend: healthy';
      } else {
        throw new Error('Unhealthy');
      }
    }catch(e){
      els.healthDot.style.background = 'var(--error)';
      els.healthText.textContent = 'Backend: unreachable';
    }
  }

  // Renderers
  function renderTests(){
    els.testsTbody.innerHTML = '';
    if(state.tests.length === 0){
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.className = 'muted';
      td.textContent = 'No test cases yet. Click "New Test" to add one.';
      tr.appendChild(td);
      els.testsTbody.appendChild(tr);
      return;
    }
    state.tests.forEach(t=>{
      const tr = document.createElement('tr');
      const stepsText = (t.steps || []).join(' | ');
      tr.innerHTML = `
        <td>${escapeHtml(t.name || '')}</td>
        <td>${escapeHtml(stepsText)}</td>
        <td>${new Date(t.created_at || Date.now()).toLocaleString()}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${t.id}">Edit</button>
            <button class="btn btn-ghost btn-sm" data-action="run" data-id="${t.id}">Run</button>
            <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${t.id}">Delete</button>
          </div>
        </td>
      `;
      els.testsTbody.appendChild(tr);
    });
  }

  function renderRuns(){
    els.runsList.innerHTML = '';
    state.runs.forEach(r=>{
      const li = document.createElement('li');
      li.textContent = `${new Date(r.at).toLocaleTimeString()} — Run ${r.ids.length} test(s)`;
      els.runsList.appendChild(li);
    })
  }

  function renderResults(){
    els.results.innerHTML = '';
    state.results.forEach(res=>{
      const div = document.createElement('div');
      div.className = `result-item ${res.status}`;
      div.textContent = `[${res.status.toUpperCase()}] ${res.name} — ${res.duration_ms}ms`;
      els.results.appendChild(div);
    });
  }

  // Helpers
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function resetForm(){
    els.formId.value = '';
    els.formName.value = '';
    els.formSteps.value = '';
  }

  function showForm(show){
    els.formWrap.classList.toggle('hidden', !show);
  }

  // Events
  els.newTestBtn.addEventListener('click', ()=>{
    resetForm();
    showForm(true);
    els.formName.focus();
  });

  els.formCancel.addEventListener('click', ()=>{
    resetForm(); showForm(false);
  });

  els.form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const id = els.formId.value || null;
    const payload = {
      name: els.formName.value.trim(),
      steps: els.formSteps.value.split('\n').map(s=>s.trim()).filter(Boolean)
    };
    if(!payload.name){ toast('Name is required','error'); return; }

    try{
      if(id){
        // optimistic update
        const idx = state.tests.findIndex(t=> String(t.id) === String(id));
        const original = idx >= 0 ? {...state.tests[idx]} : null;
        if(idx >= 0){
          state.tests[idx] = {...state.tests[idx], ...payload};
          renderTests();
        }
        const saved = await API.updateTest(id, payload);
        if(idx >= 0){ state.tests[idx] = saved; renderTests(); }
        toast('Test updated','success');
      } else {
        // optimistic create
        const temp = { id: `tmp-${Date.now()}`, name: payload.name, steps: payload.steps, created_at: Date.now() };
        state.tests.unshift(temp);
        renderTests();
        const created = await API.createTest(payload);
        // replace temp with created
        const idx = state.tests.findIndex(t => t.id === temp.id);
        if(idx >= 0){ state.tests[idx] = created; }
        renderTests();
        toast('Test created','success');
      }
      resetForm(); showForm(false);
    }catch(err){
      toast(err.message || 'Failed saving test','error');
    }
  });

  els.testsTbody.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');

    if(action === 'edit'){
      const t = state.tests.find(x=> String(x.id) === String(id));
      if(!t) return;
      els.formId.value = t.id;
      els.formName.value = t.name || '';
      els.formSteps.value = (t.steps || []).join('\n');
      showForm(true);
      els.formName.focus();
    }

    if(action === 'delete'){
      const idx = state.tests.findIndex(x=> String(x.id) === String(id));
      if(idx === -1) return;
      const removed = state.tests[idx];
      // optimistic removal
      state.tests.splice(idx,1); renderTests();
      try{
        await API.deleteTest(id);
        toast('Test deleted','success');
      }catch(err){
        // revert
        state.tests.splice(idx,0, removed); renderTests();
        toast(err.message || 'Delete failed','error');
      }
    }

    if(action === 'run'){
      try{
        const res = await API.run([id]);
        state.runs.unshift({ ids:[id], at: Date.now() }); renderRuns();
        (res.results || []).forEach(r=>{
          state.results.unshift(r);
        });
        renderResults();
        toast('Run completed','success');
      }catch(err){
        toast(err.message || 'Run failed','error');
      }
    }
  });

  els.runAll.addEventListener('click', async ()=>{
    const ids = state.tests.map(t=>t.id);
    if(ids.length === 0){ toast('No tests to run','error'); return; }
    try{
      const res = await API.run(ids);
      state.runs.unshift({ ids, at: Date.now() }); renderRuns();
      (res.results || []).forEach(r=> state.results.unshift(r));
      renderResults();
      toast('All tests executed','success');
    }catch(err){
      toast(err.message || 'Run failed','error');
    }
  });

  // Bootstrap
  async function init(){
    checkHealth();
    try{
      const tests = await API.listTests();
      state.tests = tests || [];
      renderTests();
    }catch(err){
      toast('Could not load tests','error');
      renderTests();
    }
    renderRuns();
    renderResults();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
