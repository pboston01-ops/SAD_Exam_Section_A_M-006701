// ============================================================
// SAD Exam Section A | M-006701 | Phrence Kyle M. Boston
// app.js — Complete SPA with Supabase auth + full features
// ============================================================

const SUPABASE_URL  = 'https://tpfgfbunbwqyuydcchev.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_iIOIz0xtszD_qcRrc8psjA_25MTQ4-T';
const DEADLINE_PHT  = new Date('2026-10-30T17:00:00+08:00');

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── STATE ────────────────────────────────────────────────────
let currentUser    = null;
let currentProfile = null;
let currentScholar = null;
let currentProgram = null;
let allPrograms    = [];

// ── HELPERS ─────────────────────────────────────────────────
function showLoading(msg = 'Loading…') {
  document.getElementById('loading-overlay').classList.remove('hidden');
  document.getElementById('loading-text').textContent = msg;
}
function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 5000);
}

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
}

function chip(text, cls) {
  return `<span class="chip chip-${cls.toLowerCase()}">${text}</span>`;
}

function verifyChip(s) {
  if (s === 'Verified') return chip('Verified','verified');
  if (s === 'Returned') return chip('Returned','returned');
  return chip('Pending','pending');
}

function complianceChip(s) {
  if (!s) return chip('—','pending');
  if (s === 'Compliant') return chip('Compliant','compliant');
  return chip('With Deficiency','deficiency');
}

function renewalChip(s) {
  if (!s) return chip('—','pending');
  if (s === 'Approved') return chip('Approved','approved');
  return chip('Held','held');
}

// ── MODAL ────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
document.querySelectorAll('.modal-close, [data-modal]').forEach(el => {
  el.addEventListener('click', () => closeModal(el.dataset.modal || el.closest('.modal-overlay').id));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
});

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════
async function initAuth() {
  showLoading('Initializing…');
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    await onSignedIn(session.user);
  } else {
    showAuthPage();
  }
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      await onSignedIn(session.user);
    } else if (event === 'SIGNED_OUT') {
      onSignedOut();
    }
  });
}

async function onSignedIn(user) {
  currentUser = user;
  showLoading('Loading profile…');

  let profile = null;
  try {
    const { data, error } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (!error && data) {
      profile = data;
    }
  } catch (err) {
    console.warn('Profile fetch warning:', err);
  }

  if (!profile) {
    const meta = user.user_metadata || {};
    const fallbackRole = meta.role || (user.email && user.email.toLowerCase().includes('staff') ? 'staff' : 'scholar');
    profile = {
      id: user.id,
      full_name:  meta.full_name  || (user.email ? user.email.split('@')[0] : 'User'),
      student_id: meta.student_id || null,
      role:       fallbackRole
    };

    try {
      const { data: np } = await db.from('profiles').upsert(profile).select().maybeSingle();
      if (np) profile = np;
    } catch (e) {
      console.warn('Profile upsert warning:', e);
    }
  }

  currentProfile = profile;

  if (profile.role === 'scholar') {
    try {
      const { data: sc } = await db.from('scholars').select('*, programs(*)').eq('profile_id', user.id).maybeSingle();
      currentScholar = sc || null;
      currentProgram = sc?.programs || null;
    } catch (e) {
      console.warn('Scholar record fetch warning:', e);
    }
  }

  try {
    const { data: progs } = await db.from('programs').select('*');
    allPrograms = progs || [];
  } catch (e) {
    console.warn('Programs fetch warning:', e);
    allPrograms = [];
  }

  showApp();
  hideLoading();
}

function onSignedOut() {
  currentUser = currentProfile = currentScholar = currentProgram = null;
  showAuthPage();
}

function showAuthPage() {
  document.getElementById('auth-page').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  hideLoading();
}

function showApp() {
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  const { role, full_name } = currentProfile;
  document.getElementById('sidebar-user-name').textContent = full_name;
  document.getElementById('sidebar-user-role').textContent = role === 'staff' ? '🏢 Staff' : '🎓 Scholar';
  document.getElementById('user-avatar-text').textContent = full_name[0].toUpperCase();
  document.querySelectorAll('.staff-nav').forEach(el => el.classList.toggle('hidden', role !== 'staff'));
  document.querySelectorAll('.scholar-nav').forEach(el => el.classList.toggle('hidden', role !== 'scholar'));
  if (role === 'staff')  showView('staff-dashboard');
  else                   showView('scholar-dashboard');
}

// ── AUTH FORMS ───────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pw    = document.getElementById('login-password').value;
  const btn   = document.getElementById('login-btn');
  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'Signing in…';

  const { error } = await db.auth.signInWithPassword({ email, password: pw });
  if (error) {
    let msg = error.message;
    if (msg.includes('Invalid login') || msg.includes('invalid_credentials'))
      msg = '❌ Wrong email or password. Check your credentials.';
    else if (msg.includes('Email not confirmed'))
      msg = '❌ Email not confirmed. Run seed.sql in Supabase SQL Editor.';
    toast(msg, 'error');
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Sign In';
  }
});

document.getElementById('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const sid  = document.getElementById('reg-student-id').value.trim();
  const email= document.getElementById('reg-email').value.trim();
  const pw   = document.getElementById('reg-password').value;
  const btn  = document.getElementById('register-btn');
  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'Creating…';

  const { error } = await db.auth.signUp({
    email, password: pw,
    options: { data: { full_name: name, student_id: sid || null, role: 'scholar' } }
  });
  if (error) {
    let msg = error.message;
    if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('email rate'))
      msg = '⚠️ Email rate limit reached. Use the test accounts from seed.sql to log in (e.g. scholar.a01@scholarship.edu.ph / Scholar@2026!)';
    toast(msg, 'error');
  } else {
    toast('✅ Account created! You can now sign in.', 'success');
    switchAuthTab('login');
  }
  btn.disabled = false;
  btn.querySelector('.btn-text').textContent = 'Create Account';
});


document.getElementById('logout-btn').addEventListener('click', async () => {
  await db.auth.signOut();
});

function switchAuthTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
});

// ══════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const v = document.getElementById(`view-${viewId}`);
  if (v) v.classList.remove('hidden');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const lnk = document.querySelector(`.nav-link[data-view="${viewId}"]`);
  if (lnk) lnk.classList.add('active');
  switch (viewId) {
    case 'staff-dashboard':   loadStaffDashboard(); break;
    case 'manage-scholars':   loadManageScholars(); break;
    case 'verification':      loadVerification(); break;
    case 'compliance':        loadCompliance(); break;
    case 'all-submissions':   loadAllSubmissions(); break;
    case 'scholar-dashboard': loadScholarDashboard(); break;
    case 'my-submissions':    loadMySubmissions(); break;
    case 'submit-grades':     setupSubmitGrades(); break;
  }
}
document.querySelectorAll('.nav-link[data-view]').forEach(link => {
  link.addEventListener('click', e => { e.preventDefault(); showView(link.dataset.view); });
});

// ══════════════════════════════════════════════════════════════
// STAFF: DASHBOARD
// ══════════════════════════════════════════════════════════════
async function loadStaffDashboard() {
  const [ay, sem] = (document.getElementById('dash-semester').value || '2026-2027|1').split('|');

  const { data: rows, error } = await db.from('scholars').select(`
    id, profile:profiles!scholars_profile_id_fkey(full_name,student_id),
    program:programs(program_name),
    submissions(gwa,verification_status,compliance_result,renewal_decision,academic_year,semester)
  `);

  if (error) {
    console.error('Error loading dashboard scholars:', error);
  }

  const subs = (rows || []).map(r => {
    const sub = (r.submissions || []).find(s => s.academic_year === ay && s.semester === sem);
    return { ...r, sub };
  });

  const total      = subs.length;
  const pending    = subs.filter(r => !r.sub || r.sub.verification_status === 'Pending').length;
  const compliant  = subs.filter(r => r.sub?.compliance_result === 'Compliant').length;
  const deficient  = subs.filter(r => r.sub?.compliance_result === 'With Deficiency').length;
  const approved   = subs.filter(r => r.sub?.renewal_decision === 'Approved').length;

  document.getElementById('staff-stats').innerHTML = `
    <div class="stat-card accent"><div class="stat-icon">👥</div><div class="stat-value">${total}</div><div class="stat-label">Total Scholars</div></div>
    <div class="stat-card warning"><div class="stat-icon">⏳</div><div class="stat-value">${pending}</div><div class="stat-label">Pending Verification</div></div>
    <div class="stat-card success"><div class="stat-icon">✅</div><div class="stat-value">${compliant}</div><div class="stat-label">Compliant</div></div>
    <div class="stat-card danger"><div class="stat-icon">⚠️</div><div class="stat-value">${deficient}</div><div class="stat-label">With Deficiency</div></div>
    <div class="stat-card info"><div class="stat-icon">🏆</div><div class="stat-value">${approved}</div><div class="stat-label">Approved Renewal</div></div>
  `;

  document.getElementById('pending-badge').textContent = pending || '';
  renderDashTable(subs, ay, sem);

  // Populate program filter
  const pf = document.getElementById('dash-filter-program');
  if (pf.children.length <= 1) {
    allPrograms.forEach(p => { const o = document.createElement('option'); o.value = p.program_name; o.textContent = p.program_name; pf.appendChild(o); });
  }
}

function renderDashTable(subs, ay, sem) {
  const search  = document.getElementById('dash-search').value.toLowerCase();
  const progF   = document.getElementById('dash-filter-program').value;
  const compF   = document.getElementById('dash-filter-compliance').value;

  let rows = subs.filter(r => {
    const name = r.profile?.full_name?.toLowerCase() || '';
    const sid  = r.profile?.student_id?.toLowerCase() || '';
    if (search && !name.includes(search) && !sid.includes(search)) return false;
    if (progF && r.program?.program_name !== progF) return false;
    if (compF) {
      const cr = r.sub?.compliance_result || 'Pending';
      if (compF === 'Pending' && cr !== null && cr !== undefined) return false;
      if (compF !== 'Pending' && cr !== compF) return false;
    }
    return true;
  });

  const tbody = document.getElementById('dash-tbody');
  if (!rows.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No scholars found.</td></tr>`; return; }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${r.profile?.student_id || '—'}</strong></td>
      <td>${r.profile?.full_name || '—'}</td>
      <td>${r.program?.program_name || '—'}</td>
      <td>${r.sub?.gwa ?? '—'}</td>
      <td>${verifyChip(r.sub?.verification_status || 'Pending')}</td>
      <td>${complianceChip(r.sub?.compliance_result)}</td>
      <td>${renewalChip(r.sub?.renewal_decision)}</td>
    </tr>
  `).join('');
}

document.getElementById('dash-semester').addEventListener('change', loadStaffDashboard);
['dash-search','dash-filter-program','dash-filter-compliance'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', loadStaffDashboard);
});

// ══════════════════════════════════════════════════════════════
// STAFF: MANAGE SCHOLARS
// ══════════════════════════════════════════════════════════════
async function loadManageScholars() {
  const { data: rows, error } = await db.from('scholars').select(`
    id, is_active, assigned_at,
    profile:profiles!scholars_profile_id_fkey(full_name,student_id,id),
    program:programs(program_name),
    assigned_by_profile:profiles!scholars_assigned_by_fkey(full_name)
  `).order('assigned_at', { ascending: false });

  // Also get emails
  const tbody = document.getElementById('scholars-tbody');
  if (!rows?.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No scholars registered yet.</td></tr>`; return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${r.profile?.student_id || '—'}</strong></td>
      <td>${r.profile?.full_name || '—'}</td>
      <td><span class="chip chip-scholar">scholar</span></td>
      <td>${r.program?.program_name || '—'}</td>
      <td><span class="chip ${r.is_active ? 'chip-verified' : 'chip-returned'}">${r.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>${fmt(r.assigned_at)}</td>
    </tr>
  `).join('');
}

document.getElementById('btn-add-scholar').addEventListener('click', () => {
  const sel = document.getElementById('as-program');
  sel.innerHTML = allPrograms.map(p => `<option value="${p.id}">${p.program_name}</option>`).join('');
  openModal('modal-add-scholar');
});

document.getElementById('add-scholar-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('as-submit-btn');
  btn.disabled = true; btn.textContent = 'Registering…';

  const name = document.getElementById('as-name').value.trim();
  const sid  = document.getElementById('as-sid').value.trim();
  const email= document.getElementById('as-email').value.trim();
  const pw   = document.getElementById('as-pw').value;
  const prog = document.getElementById('as-program').value;

  // Check for duplicate student ID
  const { data: existing } = await db.from('profiles').select('id').eq('student_id', sid).single();
  if (existing) {
    toast(`❌ Student ID "${sid}" is already registered.`, 'error');
    btn.disabled = false; btn.textContent = 'Register Scholar'; return;
  }

  // Use the create_scholar_account RPC (defined below) — no email sent
  const { data: result, error: rpcErr } = await db.rpc('create_scholar_account', {
    p_email: email, p_password: pw,
    p_full_name: name, p_student_id: sid,
    p_program_id: prog, p_assigned_by: currentProfile.id
  });

  if (rpcErr) {
    // Fallback: create profile directly with generated UUID (no login possible but data visible)
    const genId = crypto.randomUUID();
    const { error: pErr } = await db.from('profiles').insert({
      id: genId, full_name: name, student_id: sid, role: 'scholar'
    });
    if (pErr) {
      toast('❌ ' + pErr.message, 'error');
      btn.disabled = false; btn.textContent = 'Register Scholar'; return;
    }
    const { error: scErr } = await db.from('scholars').insert({
      profile_id: genId, program_id: prog, assigned_by: currentProfile.id
    });
    if (scErr) { toast('Profile created but assignment failed: ' + scErr.message, 'warning'); }
    else { toast(`✅ ${name} added! Note: set their login in Supabase Dashboard (Auth > Users).`, 'warning'); }
  } else {
    toast(`✅ Scholar ${name} registered with login credentials!`, 'success');
  }

  closeModal('modal-add-scholar');
  document.getElementById('add-scholar-form').reset();
  loadManageScholars();
  btn.disabled = false; btn.textContent = 'Register Scholar';
});


// ══════════════════════════════════════════════════════════════
// STAFF: VERIFICATION
// ══════════════════════════════════════════════════════════════
async function loadVerification() {
  const { data: rows, error } = await db.from('submissions').select(`
    id, gwa, enrolled_units, evidence_reference, submitted_at,
    verification_status, verification_notes, verified_at,
    academic_year, semester,
    scholar:scholars(profile:profiles!scholars_profile_id_fkey(full_name,student_id), program:programs(program_name))
  `).order('submitted_at', { ascending: false });

  const tbody = document.getElementById('verification-tbody');
  if (!rows?.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="8">No submissions yet.</td></tr>`; return; }

  tbody.innerHTML = rows.map(r => {
    const sc = r.scholar;
    return `<tr>
      <td><strong>${sc?.profile?.student_id || '—'}</strong></td>
      <td>${sc?.profile?.full_name || '—'}</td>
      <td>${sc?.program?.program_name || '—'}</td>
      <td>${r.gwa}</td>
      <td class="text-clip" title="${r.evidence_reference}">${r.evidence_reference}</td>
      <td>${fmt(r.submitted_at)}</td>
      <td>${verifyChip(r.verification_status)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-primary" onclick="openVerifyModal('${r.id}')">Review</button>
          <button class="btn btn-sm btn-ghost" onclick="openAuditModal('${r.id}')">History</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function openVerifyModal(subId) {
  const { data: sub, error } = await db.from('submissions').select(`
    *,
    scholar:scholars(profile:profiles!scholars_profile_id_fkey(full_name,student_id), program:programs(program_name,max_gwa,min_units,allowed_failed,allowed_incomplete,allowed_dropped,deadline))
  `).eq('id', subId).single();

  document.getElementById('verify-sub-id').value = subId;
  document.getElementById('verify-modal-title').textContent = `Verify — ${sub.scholar?.profile?.full_name}`;
  document.getElementById('verify-notes').value = '';

  const prog = sub.scholar?.program;
  const late = new Date(sub.submitted_at) > DEADLINE_PHT;
  document.getElementById('verify-details').innerHTML = `
    <div class="detail-item"><div class="detail-label">Scholar</div><div class="detail-value">${sub.scholar?.profile?.full_name}</div></div>
    <div class="detail-item"><div class="detail-label">Student ID</div><div class="detail-value">${sub.scholar?.profile?.student_id}</div></div>
    <div class="detail-item"><div class="detail-label">Program</div><div class="detail-value">${prog?.program_name}</div></div>
    <div class="detail-item"><div class="detail-label">GWA</div><div class="detail-value">${sub.gwa} <small>(max ${prog?.max_gwa})</small></div></div>
    <div class="detail-item"><div class="detail-label">Units</div><div class="detail-value">${sub.enrolled_units} <small>(min ${prog?.min_units})</small></div></div>
    <div class="detail-item"><div class="detail-label">Failed/INC/Dropped</div><div class="detail-value">${sub.failed_count} / ${sub.incomplete_count} / ${sub.dropped_count}</div></div>
    <div class="detail-item"><div class="detail-label">Evidence</div><div class="detail-value">${sub.evidence_reference}</div></div>
    <div class="detail-item"><div class="detail-label">Submitted</div><div class="detail-value">${fmt(sub.submitted_at)} ${late ? '<span style="color:var(--danger)">⚠️ LATE</span>' : ''}</div></div>
    <div class="detail-item"><div class="detail-label">Current Status</div><div class="detail-value">${verifyChip(sub.verification_status)}</div></div>
    ${sub.verification_notes ? `<div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Previous Notes</div><div class="detail-value">${sub.verification_notes}</div></div>` : ''}
  `;
  openModal('modal-verify');
}

document.getElementById('btn-verify').addEventListener('click', async () => {
  await doVerify('Verified');
});
document.getElementById('btn-return').addEventListener('click', async () => {
  const notes = document.getElementById('verify-notes').value.trim();
  if (!notes) { toast('Please enter a reason for returning.', 'error'); return; }
  await doVerify('Returned');
});

async function doVerify(status) {
  const subId = document.getElementById('verify-sub-id').value;
  const notes = document.getElementById('verify-notes').value.trim();

  const update = { verification_status: status, verified_by: currentProfile.id, verified_at: new Date().toISOString() };
  if (notes) update.verification_notes = notes;
  if (status === 'Returned') { update.compliance_result = null; update.renewal_decision = null; }

  const { error } = await db.from('submissions').update(update).eq('id', subId);
  if (error) { toast('Error: ' + error.message, 'error'); return; }

  await db.from('audit_log').insert({ submission_id: subId, actor_id: currentProfile.id, action: `Verification: ${status}`, details: notes || null });

  toast(`Submission ${status === 'Verified' ? 'verified ✅' : 'returned ↩'}`, 'success');
  closeModal('modal-verify');
  loadVerification();
  updatePendingBadge();
}

async function updatePendingBadge() {
  const { count } = await db.from('submissions').select('*', { count: 'exact', head: true }).eq('verification_status', 'Pending');
  document.getElementById('pending-badge').textContent = count || '';
}

// ══════════════════════════════════════════════════════════════
// STAFF: COMPLIANCE & RENEWAL
// ══════════════════════════════════════════════════════════════
async function loadCompliance() {
  const { data: rows, error } = await db.from('submissions').select(`
    id, gwa, enrolled_units, failed_count, incomplete_count, dropped_count,
    submitted_at, verification_status, compliance_result, compliance_reasons,
    renewal_decision, renewal_notes, academic_year, semester,
    scholar:scholars(profile:profiles!scholars_profile_id_fkey(full_name,student_id), program:programs(*))
  `).order('submitted_at', { ascending: false });

  const tbody = document.getElementById('compliance-tbody');
  if (!rows?.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="8">No submissions found.</td></tr>`; return; }

  tbody.innerHTML = rows.map(r => {
    const sc = r.scholar;
    const reasons = r.compliance_reasons ? r.compliance_reasons.split('|').filter(Boolean).join(', ') : '—';
    return `<tr>
      <td><strong>${sc?.profile?.student_id || '—'}</strong></td>
      <td>${sc?.profile?.full_name || '—'}</td>
      <td>${sc?.program?.program_name || '—'}</td>
      <td>${verifyChip(r.verification_status)}</td>
      <td>${complianceChip(r.compliance_result)}</td>
      <td style="font-size:12px;color:var(--text2)">${reasons}</td>
      <td>${renewalChip(r.renewal_decision)}</td>
      <td>
        <div class="action-btns">
          ${r.verification_status === 'Verified' ? `<button class="btn btn-sm btn-primary" onclick="openComplianceModal('${r.id}')">Evaluate</button>` : `<span style="color:var(--text3);font-size:12px">Not verified</span>`}
          <button class="btn btn-sm btn-ghost" onclick="openAuditModal('${r.id}')">Log</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function openComplianceModal(subId) {
  const { data: sub, error } = await db.from('submissions').select(`
    *, scholar:scholars(profile:profiles!scholars_profile_id_fkey(full_name,student_id), program:programs(*))
  `).eq('id', subId).single();

  const prog = sub.scholar?.program;
  const late = new Date(sub.submitted_at) > DEADLINE_PHT;

  // Evaluate checks
  const checks = [];
  let isCompliant = true;
  const reasons = [];

  // GWA check
  const gwaOk = parseFloat(sub.gwa) <= parseFloat(prog.max_gwa);
  checks.push({ ok: gwaOk, label: `GWA ${sub.gwa} ≤ ${prog.max_gwa} (max)` });
  if (!gwaOk) { isCompliant = false; reasons.push(`GWA ${sub.gwa} exceeds maximum ${prog.max_gwa}`); }

  // Units check
  const unitsOk = sub.enrolled_units >= prog.min_units;
  checks.push({ ok: unitsOk, label: `Units ${sub.enrolled_units} ≥ ${prog.min_units} (min)` });
  if (!unitsOk) { isCompliant = false; reasons.push(`Enrolled units ${sub.enrolled_units} below minimum ${prog.min_units}`); }

  // Failed check
  const failOk = sub.failed_count <= prog.allowed_failed;
  checks.push({ ok: failOk, label: `Failed ${sub.failed_count} ≤ ${prog.allowed_failed} (allowed)` });
  if (!failOk) { isCompliant = false; reasons.push(`Has ${sub.failed_count} failed subject(s)`); }

  // INC check
  const incOk = sub.incomplete_count <= prog.allowed_incomplete;
  checks.push({ ok: incOk, label: `Incomplete ${sub.incomplete_count} ≤ ${prog.allowed_incomplete} (allowed)` });
  if (!incOk) { isCompliant = false; reasons.push(`Has ${sub.incomplete_count} incomplete grade(s)`); }

  // Dropped check
  const dropOk = sub.dropped_count <= prog.allowed_dropped;
  checks.push({ ok: dropOk, label: `Dropped ${sub.dropped_count} ≤ ${prog.allowed_dropped} (allowed)` });
  if (!dropOk) { isCompliant = false; reasons.push(`Has ${sub.dropped_count} dropped subject(s)`); }

  // Deadline check
  checks.push({ ok: !late, label: `Submitted ${late ? 'LATE' : 'on time'} (deadline: Oct 30 2026 5:00 PM PHT)` });
  if (late) { isCompliant = false; reasons.push('Submitted after deadline'); }

  const result = isCompliant ? 'Compliant' : 'With Deficiency';

  // Save compliance result
  await db.from('submissions').update({
    compliance_result: result,
    compliance_reasons: reasons.join('|')
  }).eq('id', subId);

  await db.from('audit_log').insert({
    submission_id: subId, actor_id: currentProfile.id,
    action: `Compliance Evaluated: ${result}`,
    details: reasons.join('; ') || 'All checks passed'
  });

  document.getElementById('comp-sub-id').value = subId;
  document.getElementById('comp-modal-title').textContent = `Compliance — ${sub.scholar?.profile?.full_name}`;
  document.getElementById('comp-details').innerHTML = `
    <div class="detail-item"><div class="detail-label">Scholar</div><div class="detail-value">${sub.scholar?.profile?.full_name}</div></div>
    <div class="detail-item"><div class="detail-label">Program</div><div class="detail-value">${prog.program_name}</div></div>
    <div class="detail-item"><div class="detail-label">GWA</div><div class="detail-value">${sub.gwa}</div></div>
    <div class="detail-item"><div class="detail-label">Submitted</div><div class="detail-value">${fmt(sub.submitted_at)} ${late ? '⚠️ LATE' : ''}</div></div>
  `;
  document.getElementById('comp-checks').innerHTML = checks.map(c => `
    <div class="check-item ${c.ok ? 'check-pass' : 'check-fail'}">
      <span class="check-icon">${c.ok ? '✅' : '❌'}</span>
      <span class="check-text">${c.label}</span>
    </div>
  `).join('');
  document.getElementById('comp-result-bar').className = `compliance-result-bar ${isCompliant ? 'result-compliant' : 'result-deficiency'}`;
  document.getElementById('comp-result-bar').textContent = `Result: ${result}`;

  // Renewal buttons
  document.getElementById('btn-approve').disabled = !isCompliant;
  document.getElementById('renewal-notes').value = sub.renewal_notes || '';

  openModal('modal-compliance');
  loadCompliance();
}

document.getElementById('btn-approve').addEventListener('click', async () => {
  await doRenewal('Approved');
});
document.getElementById('btn-hold').addEventListener('click', async () => {
  await doRenewal('Held');
});

async function doRenewal(decision) {
  const subId = document.getElementById('comp-sub-id').value;
  const notes = document.getElementById('renewal-notes').value.trim();

  // Get current compliance
  const { data: sub } = await db.from('submissions').select('compliance_result').eq('id', subId).single();
  if (decision === 'Approved' && sub.compliance_result !== 'Compliant') {
    toast('❌ Cannot approve a deficient record.', 'error'); return;
  }

  const { error } = await db.from('submissions').update({
    renewal_decision: decision, renewal_notes: notes,
    decided_by: currentProfile.id, decided_at: new Date().toISOString()
  }).eq('id', subId);

  if (error) { toast('Error: ' + error.message, 'error'); return; }

  await db.from('audit_log').insert({
    submission_id: subId, actor_id: currentProfile.id,
    action: `Renewal: ${decision}`,
    details: notes || null
  });

  toast(`Renewal ${decision === 'Approved' ? 'Approved ✅' : 'Held ⏸'}`, 'success');
  closeModal('modal-compliance');
  loadCompliance();
}

// ══════════════════════════════════════════════════════════════
// STAFF: ALL SUBMISSIONS
// ══════════════════════════════════════════════════════════════
async function loadAllSubmissions() {
  const { data: rows, error } = await db.from('submissions').select(`
    id, gwa, enrolled_units, submitted_at, academic_year, semester,
    verification_status, compliance_result, renewal_decision,
    scholar:scholars(profile:profiles!scholars_profile_id_fkey(full_name,student_id))
  `).order('submitted_at', { ascending: false });

  const tbody = document.getElementById('all-sub-tbody');
  if (!rows?.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="9">No submissions yet.</td></tr>`; return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${r.scholar?.profile?.student_id || '—'}</strong></td>
      <td>${r.scholar?.profile?.full_name || '—'}</td>
      <td>${r.academic_year} Sem ${r.semester}</td>
      <td>${r.gwa}</td>
      <td>${r.enrolled_units}</td>
      <td>${verifyChip(r.verification_status)}</td>
      <td>${complianceChip(r.compliance_result)}</td>
      <td>${renewalChip(r.renewal_decision)}</td>
      <td>${fmt(r.submitted_at)}</td>
    </tr>
  `).join('');
}

// ══════════════════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════════════════
async function openAuditModal(subId) {
  const { data: logs } = await db.from('audit_log').select(`
    id, action, details, created_at,
    actor:profiles(full_name)
  `).eq('submission_id', subId).order('created_at', { ascending: false });

  const tbody = document.getElementById('audit-tbody');
  if (!logs?.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No history yet.</td></tr>`; }
  else {
    tbody.innerHTML = logs.map(l => `
      <tr>
        <td>${fmt(l.created_at)}</td>
        <td>${l.actor?.full_name || '—'}</td>
        <td>${l.action}</td>
        <td>${l.details || '—'}</td>
      </tr>
    `).join('');
  }
  openModal('modal-audit');
}

// ══════════════════════════════════════════════════════════════
// SCHOLAR: DASHBOARD
// ══════════════════════════════════════════════════════════════
async function loadScholarDashboard() {
  if (!currentScholar) {
    document.getElementById('scholar-summary').innerHTML = `<div class="summary-card"><p style="color:var(--text3)">No scholarship assigned yet. Contact staff.</p></div>`;
    document.getElementById('scholar-dash-tbody').innerHTML = `<tr class="empty-row"><td colspan="9">No submissions yet.</td></tr>`;
    return;
  }

  const { data: subs } = await db.from('submissions').select('*').eq('scholar_id', currentScholar.id).order('submitted_at', { ascending: false });

  document.getElementById('scholar-summary').innerHTML = `
    <div class="summary-card"><div class="summary-label">Program</div><div class="summary-value accent">${currentProgram?.program_name || '—'}</div></div>
    <div class="summary-card"><div class="summary-label">Submissions</div><div class="summary-value">${subs?.length || 0}</div></div>
    <div class="summary-card"><div class="summary-label">Latest Status</div><div class="summary-value ${subs?.[0]?.compliance_result === 'Compliant' ? 'success' : subs?.[0]?.compliance_result === 'With Deficiency' ? 'danger' : 'warning'}">${subs?.[0]?.compliance_result || (subs?.[0]?.verification_status || '—')}</div></div>
    <div class="summary-card"><div class="summary-label">Renewal</div><div class="summary-value ${subs?.[0]?.renewal_decision === 'Approved' ? 'success' : 'warning'}">${subs?.[0]?.renewal_decision || 'Pending'}</div></div>
  `;

  renderScholarTable(subs || [], 'scholar-dash-tbody', true);
}

async function loadMySubmissions() {
  if (!currentScholar) { document.getElementById('my-sub-tbody').innerHTML = `<tr class="empty-row"><td colspan="10">No scholarship assigned yet.</td></tr>`; return; }
  const { data: subs } = await db.from('submissions').select('*').eq('scholar_id', currentScholar.id).order('submitted_at', { ascending: false });
  renderScholarTable(subs || [], 'my-sub-tbody', false);
}

function renderScholarTable(subs, tbodyId, compact) {
  const tbody = document.getElementById(tbodyId);
  if (!subs.length) { tbody.innerHTML = `<tr class="empty-row"><td colspan="${compact ? 9 : 10}">No submissions yet.</td></tr>`; return; }

  tbody.innerHTML = subs.map(s => {
    const canCorrect = s.verification_status === 'Returned';
    return `<tr>
      <td>${s.academic_year} Sem ${s.semester}</td>
      <td>${s.gwa}</td>
      <td>${s.enrolled_units}</td>
      ${compact ? '' : `<td class="text-clip">${s.evidence_reference}</td>`}
      <td>${fmt(s.submitted_at)}</td>
      <td>${verifyChip(s.verification_status)}</td>
      ${compact ? '' : `<td style="font-size:12px;color:var(--text2)">${s.verification_notes || '—'}</td>`}
      <td>${complianceChip(s.compliance_result)}</td>
      <td>${renewalChip(s.renewal_decision)}</td>
      <td>
        <div class="action-btns">
          ${canCorrect ? `<button class="btn btn-sm btn-primary" onclick="openCorrectionModal('${s.id}')">Correct</button>` : ''}
          <button class="btn btn-sm btn-ghost" onclick="openAuditModal('${s.id}')">History</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// SCHOLAR: SUBMIT GRADES
// ══════════════════════════════════════════════════════════════
function setupSubmitGrades() {
  const info = document.getElementById('submit-program-info');
  if (currentProgram) {
    info.textContent = `Program: ${currentProgram.program_name} | Max GWA: ${currentProgram.max_gwa} | Min Units: ${currentProgram.min_units} | Deadline: Oct 30, 2026 5:00 PM PHT`;
  } else {
    info.textContent = 'No scholarship program assigned. Contact staff.';
  }
}

document.getElementById('submit-grades-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentScholar) { toast('No scholarship assigned.', 'error'); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true; btn.querySelector('.btn-text').textContent = 'Submitting…';

  const ay      = document.getElementById('sub-ay').value;
  const sem     = document.getElementById('sub-sem').value;
  const gwa     = parseFloat(document.getElementById('sub-gwa').value);
  const units   = parseInt(document.getElementById('sub-units').value);
  const failed  = parseInt(document.getElementById('sub-failed').value) || 0;
  const inc     = parseInt(document.getElementById('sub-inc').value) || 0;
  const dropped = parseInt(document.getElementById('sub-dropped').value) || 0;
  const evidence= document.getElementById('sub-evidence').value.trim();

  // Validate
  if (gwa < 1.00 || gwa > 5.00) { toast('❌ GWA must be between 1.00 and 5.00.', 'error'); btn.disabled = false; btn.querySelector('.btn-text').textContent = 'Submit Grades'; return; }
  if (units < 0 || failed < 0 || inc < 0 || dropped < 0) { toast('❌ Counts cannot be negative.', 'error'); btn.disabled = false; btn.querySelector('.btn-text').textContent = 'Submit Grades'; return; }
  if (!evidence) { toast('❌ Evidence reference is required.', 'error'); btn.disabled = false; btn.querySelector('.btn-text').textContent = 'Submit Grades'; return; }

  const { error } = await db.from('submissions').insert({
    scholar_id: currentScholar.id, academic_year: ay, semester: sem,
    gwa, enrolled_units: units, failed_count: failed, incomplete_count: inc,
    dropped_count: dropped, evidence_reference: evidence,
    submitted_at: new Date().toISOString(), verification_status: 'Pending'
  });

  if (error) {
    if (error.code === '23505') toast('❌ Duplicate: submission for this semester already exists.', 'error');
    else toast('Error: ' + error.message, 'error');
  } else {
    toast('✅ Grades submitted successfully!', 'success');
    document.getElementById('submit-grades-form').reset();
    showView('my-submissions');
  }

  btn.disabled = false; btn.querySelector('.btn-text').textContent = 'Submit Grades';
});

// ══════════════════════════════════════════════════════════════
// SCHOLAR: CORRECTION
// ══════════════════════════════════════════════════════════════
async function openCorrectionModal(subId) {
  const { data: sub } = await db.from('submissions').select('*').eq('id', subId).single();
  if (!sub || sub.verification_status !== 'Returned') { toast('This submission cannot be corrected.', 'error'); return; }

  document.getElementById('cor-sub-id').value = subId;
  document.getElementById('cor-gwa').value     = sub.gwa;
  document.getElementById('cor-units').value   = sub.enrolled_units;
  document.getElementById('cor-failed').value  = sub.failed_count;
  document.getElementById('cor-inc').value     = sub.incomplete_count;
  document.getElementById('cor-dropped').value = sub.dropped_count;
  document.getElementById('cor-evidence').value= sub.evidence_reference;
  document.getElementById('correction-return-note').textContent = `⚠️ Returned reason: ${sub.verification_notes || 'See history for details'}`;
  openModal('modal-correction');
}

document.getElementById('correction-form').addEventListener('submit', async e => {
  e.preventDefault();
  const subId   = document.getElementById('cor-sub-id').value;
  const gwa     = parseFloat(document.getElementById('cor-gwa').value);
  const units   = parseInt(document.getElementById('cor-units').value);
  const failed  = parseInt(document.getElementById('cor-failed').value) || 0;
  const inc     = parseInt(document.getElementById('cor-inc').value) || 0;
  const dropped = parseInt(document.getElementById('cor-dropped').value) || 0;
  const evidence= document.getElementById('cor-evidence').value.trim();

  if (gwa < 1.00 || gwa > 5.00) { toast('❌ GWA must be 1.00–5.00.', 'error'); return; }
  if (units < 0 || failed < 0 || inc < 0 || dropped < 0) { toast('❌ Counts cannot be negative.', 'error'); return; }

  const { error } = await db.from('submissions').update({
    gwa, enrolled_units: units, failed_count: failed,
    incomplete_count: inc, dropped_count: dropped,
    evidence_reference: evidence,
    verification_status: 'Pending',
    verification_notes: null,
    compliance_result: null, renewal_decision: null,
    submitted_at: new Date().toISOString()
  }).eq('id', subId).eq('verification_status', 'Returned');

  if (error) { toast('Error: ' + error.message, 'error'); return; }

  await db.from('audit_log').insert({
    submission_id: subId, actor_id: currentProfile.id,
    action: 'Corrected and Resubmitted', details: `GWA: ${gwa}, Units: ${units}`
  });

  toast('✅ Submission corrected and resubmitted!', 'success');
  closeModal('modal-correction');
  loadMySubmissions();
});

// ══════════════════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════════════════
initAuth();
