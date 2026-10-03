/* REWANG – prototipe front-end (data disimpan di memori; sambungkan ke backend/API untuk produksi) */
const $ = (s) => document.querySelector(s);
const rp = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');
const COMMISSION = 0.12;            // take rate 10–15% (Pilar 1)
const CATS = ['Cetak Tugas', 'Antar-Jemput', 'Titip Antre', 'Beli Makan'];
const ICON = { 'Cetak Tugas': '🖨️', 'Antar-Jemput': '🛵', 'Titip Antre': '🧾', 'Beli Makan': '🍱' };
// Filter anti-perjokian akademik
const JOKI = /joki|kerjakan(in)?\s*(tugas|ujian|skripsi)|bikin(in)?\s*(skripsi|makalah)|ujian\s*online|jawab(in)?\s*kuis/i;

const state = {
  saldo: 150000, utang: 0, pokok: 0, level: 1, done: 0, filter: 'Semua', va: '',
  tasks: [
    { id: 1, cat: 'Cetak Tugas', title: 'Print 15 lembar laporan praktikum', loc: 'Gedung Perpustakaan', fee: 8000 },
    { id: 2, cat: 'Antar-Jemput', title: 'Antar ke Gedung Rektorat', loc: 'Asrama → Rektorat', fee: 10000 },
    { id: 3, cat: 'Titip Antre', title: 'Antre legalisir transkrip', loc: 'Bagian Akademik', fee: 20000 },
    { id: 4, cat: 'Beli Makan', title: 'Beli nasi pecel + es teh', loc: 'Kantin Pusat', fee: 7000 },
    { id: 5, cat: 'Cetak Tugas', title: 'Fotokopi & jilid 3 rangkap', loc: 'Fotokopi Gerbang Timur', fee: 12000 },
  ],
  jobs: [],
};
const cap = () => 1000000 + (state.level - 1) * 1500000; // credit ladder

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- Navigasi ---------- */
function go(tab) {
  document.querySelectorAll('.tab').forEach((s) => s.classList.toggle('active', s.id === tab));
  document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === tab));
  window.scrollTo(0, 0);
}
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));

/* ---------- Rewang Bantu ---------- */
function renderFilters() {
  $('#filters').innerHTML = ['Semua', ...CATS]
    .map((c) => `<button class="${c === state.filter ? 'on' : ''}" data-c="${c}">${ICON[c] || '✨'} ${c}</button>`).join('');
  $('#filters').querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => { state.filter = b.dataset.c; renderFilters(); renderTasks(); }));
}
function renderTasks() {
  const list = state.tasks.filter((t) => state.filter === 'Semua' || t.cat === state.filter);
  $('#taskList').innerHTML = list.length ? list.map((t) => `
    <div class="card task">
      <div class="tl"><i class="ic g">${ICON[t.cat]}</i><div><h4>${t.title}</h4><small>${t.cat} · ${t.loc}</small></div></div>
      <div><div class="fee">${rp(t.fee)}</div><button class="mini" data-take="${t.id}">Ambil</button></div>
    </div>`).join('') : '<p class="muted">Belum ada permintaan di kategori ini.</p>';
  document.querySelectorAll('[data-take]').forEach((b) => b.addEventListener('click', () => takeTask(+b.dataset.take)));
}
function takeTask(id) {
  const i = state.tasks.findIndex((t) => t.id === id);
  state.jobs.push(state.tasks.splice(i, 1)[0]);
  toast('Job diambil! Selesaikan di tab Dompet.');
  renderAll();
}
function finishJob(id) {
  const i = state.jobs.findIndex((t) => t.id === id);
  const job = state.jobs.splice(i, 1)[0];
  const net = job.fee * (1 - COMMISSION);
  state.done++;
  if ($('#autoRepay').checked && state.utang > 0) { repay(net); toast(`${rp(net)} dipakai melunasi talangan 🔁`); }
  else { state.saldo += net; toast(`Pendapatan bersih ${rp(net)} masuk saldo`); }
  renderAll();
}
$('#oCat').innerHTML = CATS.map((c) => `<option>${c}</option>`).join('');
$('#oSubmit').addEventListener('click', () => {
  const title = $('#oTitle').value.trim(), fee = +$('#oFee').value, w = $('#oWarn');
  w.hidden = true;
  if (!title || fee < 2000) { w.textContent = 'Isi deskripsi dan tarif minimal Rp2.000.'; w.hidden = false; return; }
  if (JOKI.test(title)) { w.textContent = '🚫 Ditolak: joki tugas/ujian/skripsi dilarang. Pelanggaran dapat berujung blokir permanen.'; w.hidden = false; return; }
  state.tasks.unshift({ id: Date.now(), cat: $('#oCat').value, title, loc: 'Area kampus', fee });
  $('#oTitle').value = ''; $('#oFee').value = '';
  toast('Permintaan diposting ✔'); renderAll();
});

/* ---------- Rewang Talang ---------- */
function calcLoan() {
  const amt = +$('#tAmt').value, ten = +$('#tTen').value;
  $('#tAmtLbl').textContent = rp(amt); $('#tTenLbl').textContent = ten + ' bulan';
  $('#tCap').textContent = rp(cap());
  $('#tMonthly').textContent = rp(amt / ten); // bunga 0%
  $('#tTotal').textContent = rp(amt);
  const w = $('#tWarn'), btn = $('#tSubmit');
  btn.disabled = false; w.hidden = true;
  if (state.utang > 0) { w.textContent = 'Lunasi talangan aktif terlebih dahulu.'; w.hidden = false; btn.disabled = true; }
  else if (amt > cap()) { w.textContent = `Melebihi plafon level ${state.level}. Lunasi talangan untuk naik level.`; w.hidden = false; btn.disabled = true; }
}
['#tAmt', '#tTen'].forEach((s) => $(s).addEventListener('input', calcLoan));
$('#tSubmit').addEventListener('click', () => {
  const amt = +$('#tAmt').value;
  state.utang = state.pokok = amt;
  state.va = '88' + Math.floor(1e9 + Math.random() * 9e9); // contoh Virtual Account kampus
  toast('Pengajuan disetujui! Dana dicairkan ke Virtual Account kampus.');
  renderAll(); go('dompet');
});

/* ---------- Dompet & pelunasan ---------- */
function repay(n) {
  state.utang = Math.max(0, state.utang - n);
  if (state.utang === 0 && state.pokok > 0) { state.level++; state.pokok = 0; state.va = ''; toast('🎉 Talangan lunas! Level kredit naik.'); }
}
$('#payCash').addEventListener('click', () => {
  if (state.utang <= 0) return toast('Tidak ada talangan aktif.');
  const n = Math.min(500000, state.utang, state.saldo);
  if (n <= 0) return toast('Saldo tidak cukup. Ambil job Rewang Bantu dulu!');
  state.saldo -= n; repay(n); renderAll();
});
function renderWallet() {
  $('#saldoChip').textContent = 'Saldo ' + rp(state.saldo);
  $('#wSaldo').textContent = rp(state.saldo); $('#wUtang').textContent = rp(state.utang);
  const pct = state.pokok ? Math.round(100 - (state.utang / state.pokok) * 100) : (state.level > 1 ? 100 : 0);
  $('#donut').style.setProperty('--p', pct); $('#donutTxt').textContent = pct + '%';
  $('#wVA').textContent = state.va ? `Virtual Account kampus: ${state.va}` : 'Belum ada talangan aktif.';
  $('#myJobs').innerHTML = state.jobs.length ? state.jobs.map((j) => `
    <div class="card task"><div><h4>${ICON[j.cat]} ${j.title}</h4><small>Bersih ${rp(j.fee * (1 - COMMISSION))} (komisi ${COMMISSION * 100}%)</small></div>
    <button class="mini" data-fin="${j.id}">Selesai</button></div>`).join('') : '<p class="muted">Belum ada job aktif.</p>';
  document.querySelectorAll('[data-fin]').forEach((b) => b.addEventListener('click', () => finishJob(+b.dataset.fin)));
  $('#stJobs').textContent = state.done; $('#stUtang').textContent = rp(state.utang); $('#stLevel').textContent = state.level;
}

/* ---------- Journey: langkah & pencapaian ---------- */
const STEPS = [['📝', 'Ajukan Talangan'], ['🏦', 'Cair via VA Kampus'], ['🛵', 'Kerja jadi Rewanger'], ['🔁', 'Cicil Otomatis'], ['🏆', 'Lunas & Naik Level']];
function renderJourney() {
  const n = state.pokok > 0 ? (state.utang < state.pokok ? 3 : 2) : (state.level > 1 ? 5 : 0);
  $('#path').innerHTML = STEPS.map(([ic, t], i) => {
    const st = i < n ? 'done' : i === n ? 'now' : 'lock';
    const lb = { done: '✔ Selesai', now: 'Sedang berjalan', lock: '🔒 Terkunci' }[st];
    return `<div class="pstep ${st}"><i class="ic">${ic}</i><b>${t}</b><span>${lb}</span></div>`;
  }).join('');
  const B = [['🌱', 'Rewanger Pemula', state.done >= 1], ['⚡', '5 Job Selesai', state.done >= 5], ['🎓', 'Lunas Pertama', state.level > 1]];
  $('#badges').innerHTML = B.map(([ic, t, ok]) => `<div class="badge ${ok ? '' : 'off'}"><i>${ic}</i><small>${t}</small></div>`).join('');
}
$('#catOpts').innerHTML = CATS.map((c, i) => `<button class="opt" data-cat="${c}"><i class="ic ${['g', 'y', 'b', 'g'][i]}">${ICON[c]}</i><b>${c}</b></button>`).join('');
document.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
  state.filter = b.dataset.cat; renderFilters(); renderTasks(); go('bantu');
}));

function renderAll() { renderTasks(); renderWallet(); calcLoan(); renderJourney(); }
renderFilters(); renderAll();