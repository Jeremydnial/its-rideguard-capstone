// =========================================================
// 1. KONFIGURASI SUPABASE
// =========================================================
const SUPABASE_URL = 'https://gbbnwrkodequymxafkgr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fBDoySh6gExhUr3IODA9Jw_2aNznmgx';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================
// 2. DATABASE SERVICE LAYER (CRUD KE SUPABASE POSTGRESQL)
// =========================================================
async function fetchMotorcycles() {
  const { data, error } = await db
    .from('motorcycles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Gagal memuat database: ' + error.message);
    return [];
  }
  return data || [];
}

async function createMotorcycle(payload) {
  const { data, error } = await db
    .from('motorcycles')
    .insert([{
      nrp: payload.nrp,
      owner_name: payload.ownerName,
      plate: payload.plate.toUpperCase().trim(),
      brand: payload.brand.trim(),
      color: payload.color.trim(),
      stnk_image: payload.stnkImage,
      status: 'pending',
      skk_note: ''
    }])
    .select();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Plat nomor ${payload.plate.toUpperCase()} sudah terdaftar di sistem!`);
    }
    throw new Error(error.message);
  }
  return data[0];
}

async function updateVerificationStatus(id, status, skkNote) {
  const { error } = await db
    .from('motorcycles')
    .update({ status, skk_note: skkNote })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

async function deleteMotorcycle(id) {
  const { error } = await db
    .from('motorcycles')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// =========================================================
// 3. STATE & AUTHENTICATION DUAL-ROLE
// =========================================================
let currentUser = null;
let currentStnkBase64 = '';
let activeInspectId = null;
let skkFilter = 'all';
let cachedMotorcycles = [];

function getSampleStnkSvg(plate = 'L 1234 XY', owner = 'MAHASISWA ITS') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="280" viewBox="0 0 500 280">
    <rect width="500" height="280" rx="14" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3"/>
    <rect x="0" y="0" width="500" height="48" rx="14" fill="#1e3a8a"/>
    <text x="20" y="30" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">SURAT TANDA NOMOR KENDARAAN BERMOTOR (SIMULASI)</text>
    <text x="25" y="80" fill="#334155" font-family="monospace" font-size="13">NOMOR REGISTRASI : ${plate}</text>
    <text x="25" y="108" fill="#334155" font-family="monospace" font-size="13">NAMA PEMILIK     : ${owner}</text>
    <text x="25" y="136" fill="#334155" font-family="monospace" font-size="13">ALAMAT           : KAMPUS ITS SUKOLILO SURABAYA</text>
    <text x="25" y="164" fill="#334155" font-family="monospace" font-size="13">BERLAKU SAMPAI   : 11 - 2029</text>
    <rect x="340" y="185" width="130" height="65" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-dasharray="4"/>
    <text x="355" y="222" fill="#1d4ed8" font-family="sans-serif" font-size="12" font-weight="bold">DOKUMEN VALID</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function switchLoginRole(role) {
  const loginView = document.getElementById('loginView');
  const loginBanner = document.getElementById('loginBanner');
  const loginSubtitle = document.getElementById('loginSubtitle');
  const tabMhs = document.getElementById('tabMahasiswa');
  const tabSkk = document.getElementById('tabSkk');
  const formMhs = document.getElementById('formLoginMahasiswa');
  const formSkk = document.getElementById('formLoginSkk');

  if (role === 'mahasiswa') {
    loginView.className = 'min-h-screen flex items-center justify-center p-4 transition-colors duration-300 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900';
    loginBanner.className = 'p-7 text-center transition-colors duration-300 bg-blue-900 text-white';
    loginSubtitle.textContent = 'Portal Registrasi Kendaraan Mahasiswa ITS';
    tabMhs.className = 'py-2.5 text-xs font-bold rounded-lg transition bg-white text-blue-900 shadow-sm';
    tabSkk.className = 'py-2.5 text-xs font-bold rounded-lg transition text-slate-500 hover:text-slate-800';
    formMhs.classList.remove('hidden');
    formSkk.classList.add('hidden');
  } else {
    loginView.className = 'min-h-screen flex items-center justify-center p-4 transition-colors duration-300 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950';
    loginBanner.className = 'p-7 text-center transition-colors duration-300 bg-slate-900 text-amber-400 border-b border-slate-800';
    loginSubtitle.textContent = 'Sistem Keamanan Kampus (SKK) — Pos Verifikasi';
    tabSkk.className = 'py-2.5 text-xs font-bold rounded-lg transition bg-slate-900 text-amber-400 shadow-sm';
    tabMhs.className = 'py-2.5 text-xs font-bold rounded-lg transition text-slate-500 hover:text-slate-800';
    formSkk.classList.remove('hidden');
    formMhs.classList.add('hidden');
  }
}

function fillDemoMahasiswa() {
  document.getElementById('loginNrp').value = '5026231000';
  document.getElementById('loginNama').value = 'USER1';
}

function fillDemoSkk() {
  document.getElementById('loginSkkId').value = 'SKK-01';
  document.getElementById('loginSkkGate').value = 'Gerbang Utama Bundaran ITS';
}

document.getElementById('formLoginMahasiswa').addEventListener('submit', (e) => {
  e.preventDefault();
  const nrp = document.getElementById('loginNrp').value.trim();
  const nama = document.getElementById('loginNama').value.trim();
  if (!/^\d{10}$/.test(nrp)) {
    alert('NRP Mahasiswa ITS harus terdiri dari 10 digit angka.');
    return;
  }
  currentUser = { role: 'mahasiswa', nrp, nama };
  document.getElementById('mhsUserInfo').textContent = `${nrp} • ${nama}`;
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('mahasiswaView').classList.remove('hidden');
  renderMahasiswaList();
});

document.getElementById('formLoginSkk').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('loginSkkId').value.trim();
  const gate = document.getElementById('loginSkkGate').value.trim();
  currentUser = { role: 'skk', id, gate };
  document.getElementById('skkUserInfo').textContent = `${id} • ${gate}`;
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('skkView').classList.remove('hidden');
  renderSkkList();
});

function logout() {
  currentUser = null;
  document.getElementById('mahasiswaView').classList.add('hidden');
  document.getElementById('skkView').classList.add('hidden');
  document.getElementById('loginView').classList.remove('hidden');
}

// =========================================================
// 4. LOGIKA UPLOAD & KOMPRESI FOTO STNK
// =========================================================
function useSampleStnk() {
  const plate = document.getElementById('inputPlate').value.trim().toUpperCase() || 'L 9988 ZZ';
  const owner = currentUser ? currentUser.nama.toUpperCase() : 'MAHASISWA ITS';
  currentStnkBase64 = getSampleStnkSvg(plate, owner);
  document.getElementById('stnkPreviewImg').src = currentStnkBase64;
  document.getElementById('stnkPreviewBox').classList.remove('hidden');
  showToast('Contoh STNK berhasil dimuat.');
}

function handleStnkUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const maxWidth = 600;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      currentStnkBase64 = canvas.toDataURL('image/jpeg', 0.7);
      document.getElementById('stnkPreviewImg').src = currentStnkBase64;
      document.getElementById('stnkPreviewBox').classList.remove('hidden');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// =========================================================
// 5. AKSI MAHASISWA: SUBMIT & TAMPILKAN DATA MOTOR
// =========================================================
document.getElementById('motorForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorBox = document.getElementById('formErrorAlert');
  const btnSubmit = document.getElementById('btnSubmitMotor');
  errorBox.classList.add('hidden');

  const plate = document.getElementById('inputPlate').value.trim().toUpperCase();
  const brand = document.getElementById('inputBrand').value.trim();
  const color = document.getElementById('inputColor').value.trim();

  if (!/^[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{1,3}$/.test(plate)) {
    errorBox.textContent = 'Format plat nomor tidak valid (Contoh yang benar: L 4582 BAX).';
    errorBox.classList.remove('hidden');
    return;
  }

  if (!currentStnkBase64) {
    errorBox.textContent = 'Harap unggah foto STNK atau klik "Gunakan Contoh STNK".';
    errorBox.classList.remove('hidden');
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Menyimpan ke Database...';

  try {
    await createMotorcycle({
      nrp: currentUser.nrp,
      ownerName: currentUser.nama,
      plate,
      brand,
      color,
      stnkImage: currentStnkBase64
    });

    document.getElementById('motorForm').reset();
    currentStnkBase64 = '';
    document.getElementById('stnkPreviewBox').classList.add('hidden');
    showToast(`Motor ${plate} berhasil didaftarkan ke database!`);
    await renderMahasiswaList();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Ajukan Registrasi Motor';
  }
});

async function renderMahasiswaList() {
  const container = document.getElementById('mhsMotorList');
  const allData = await fetchMotorcycles();
  const myMotors = allData.filter(m => m.nrp === currentUser.nrp);

  if (myMotors.length === 0) {
    container.innerHTML = `<div class="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-xs text-slate-500">
      Belum ada motor yang terdaftar atas NRP ${currentUser.nrp}. Silakan isi formulir di samping.
    </div>`;
    return;
  }

  container.innerHTML = myMotors.map(m => {
    let badge = '';
    if (m.status === 'verified') {
      badge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">✓ Terverifikasi SKK</span>`;
    } else if (m.status === 'rejected') {
      badge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800">✕ Ditolak SKK</span>`;
    } else {
      badge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">⏳ Menunggu Cek SKK</span>`;
    }

    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2.5">
            <span class="px-2.5 py-0.5 bg-slate-900 text-white font-mono font-bold text-sm rounded-lg">${m.plate}</span>
            ${badge}
          </div>
          <p class="font-bold text-sm text-slate-800">${m.brand} <span class="font-normal text-slate-500">• ${m.color}</span></p>
          ${m.skk_note ? `<p class="text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/70">💬 Catatan SKK: <strong>${m.skk_note}</strong></p>` : ''}
        </div>
        <button onclick="handleDeleteMotor(${m.id}, '${m.plate}')" class="self-start sm:self-center text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg font-semibold transition">
          Hapus
        </button>
      </div>
    `;
  }).join('');
}

async function handleDeleteMotor(id, plate) {
  if (!confirm(`Hapus data kendaraan ${plate} dari database?`)) return;
  try {
    await deleteMotorcycle(id);
    showToast(`Data ${plate} dihapus.`);
    renderMahasiswaList();
  } catch (err) {
    showToast(err.message);
  }
}

// =========================================================
// 6. AKSI PETUGAS SKK: INSPEKSI & VERIFIKASI STNK
// =========================================================
function setSkkFilter(filter) {
  skkFilter = filter;
  ['all', 'pending', 'verified'].forEach(f => {
    const btn = document.getElementById('filter' + f.charAt(0).toUpperCase() + f.slice(1));
    if (f === filter) {
      btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950';
    } else {
      btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-slate-300 border border-slate-800';
    }
  });
  renderSkkList();
}

async function renderSkkList() {
  const container = document.getElementById('skkMotorList');
  cachedMotorcycles = await fetchMotorcycles();

  document.getElementById('statTotal').textContent = cachedMotorcycles.length;
  document.getElementById('statPending').textContent = cachedMotorcycles.filter(m => m.status === 'pending').length;
  document.getElementById('statVerified').textContent = cachedMotorcycles.filter(m => m.status === 'verified').length;

  const filtered = skkFilter === 'all' ? cachedMotorcycles : cachedMotorcycles.filter(m => m.status === skkFilter);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
      Tidak ada data pengajuan pada kategori ini.
    </div>`;
    return;
  }

  container.innerHTML = filtered.map(m => {
    let statusPill = '';
    if (m.status === 'verified') {
      statusPill = `<span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Terverifikasi</span>`;
    } else if (m.status === 'rejected') {
      statusPill = `<span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Ditolak</span>`;
    } else {
      statusPill = `<span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Perlu Cek STNK</span>`;
    }

    return `
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-4">
        <div class="space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-1 bg-slate-950 border border-slate-700 text-amber-400 font-mono font-extrabold text-sm rounded-lg">${m.plate}</span>
            ${statusPill}
          </div>
          <div>
            <p class="font-bold text-sm text-white">${m.owner_name} <span class="text-xs font-normal text-slate-400">(${m.nrp})</span></p>
            <p class="text-xs text-slate-400">${m.brand} • Warna ${m.color}</p>
          </div>
          ${m.skk_note ? `<p class="text-[11px] text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">Catatan: ${m.skk_note}</p>` : ''}
        </div>

        <button onclick="openStnkModalById(${m.id})"
          class="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition">
          🔍 Periksa STNK & Verifikasi
        </button>
      </div>
    `;
  }).join('');
}

function openStnkModalById(id) {
  const m = cachedMotorcycles.find(item => item.id === id);
  if (!m) return;

  activeInspectId = m.id;
  const imgSrc = m.stnk_image || getSampleStnkSvg(m.plate, m.owner_name);

  document.getElementById('modalPlateInfo').textContent = `Plat Nomor: ${m.plate}`;
  document.getElementById('modalOwnerInfo').textContent = `${m.owner_name} (NRP ${m.nrp})`;
  document.getElementById('modalBikeInfo').textContent = `${m.brand} (${m.color})`;
  document.getElementById('modalStnkImg').src = imgSrc;
  document.getElementById('modalSkkNote').value = m.skk_note || '';
  document.getElementById('stnkModal').classList.remove('hidden');
}

function closeStnkModal() {
  activeInspectId = null;
  document.getElementById('stnkModal').classList.add('hidden');
}

async function submitVerification(newStatus) {
  const note = document.getElementById('modalSkkNote').value.trim();
  if (newStatus === 'rejected' && !note) {
    alert('Harap isi alasan penolakan pada kolom catatan SKK.');
    return;
  }
  const finalNote = note || (newStatus === 'verified' ? 'STNK valid dan sesuai data mahasiswa.' : '');

  try {
    await updateVerificationStatus(activeInspectId, newStatus, finalNote);
    closeStnkModal();
    showToast(newStatus === 'verified' ? 'STNK berhasil disetujui!' : 'Pengajuan motor ditolak.');
    await renderSkkList();
  } catch (err) {
    showToast('Error: ' + err.message);
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3200);
}