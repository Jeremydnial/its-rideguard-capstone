// Tempel URL dan Anon Public Key dari project Supabase kamu di sini
const SUPABASE_URL = "https://gbbnwrkodequymxafkgr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fBDoySh6gExhUr3IODA9Jw_2aNznmgx";

const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

const supabaseClient = isSupabaseConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let currentUser = {
  nrp: "",
  name: "",
  role: "mahasiswa"
};

let motorsList = [];
let selectedMotorId = null;
let selectedOwnership = "Motor Pribadi";
let generatedProofDataUrl = "";

// Helper UI
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
  window.scrollTo(0, 0);
}

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

// Generator Gambar Dummy STNK / Foto Pelat (SVG Data URL)
function generateDummyStnkDataUrl({ plate, brand, color, ownerName, nrp, ownershipType }) {
  const safePlate = escapeXml((plate || "L 9988 XY").toUpperCase());
  const safeBrand = escapeXml(brand || "Honda Vario 160");
  const safeColor = escapeXml(color || "Hitam");
  const safeOwner = escapeXml((ownerName || "USERDEMO").toUpperCase());
  const safeNrp = escapeXml(nrp || "5026231000");
  const isLoan = ownershipType === "Pinjaman (24 Jam)";

  const svg = isLoan
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
        <rect width="600" height="340" rx="18" fill="#1E293B"/>
        <rect x="24" y="24" width="552" height="292" rx="14" fill="#0F172A" stroke="#334155" stroke-width="2"/>
        <text x="44" y="58" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#38BDF8">FOTO PELAT KENDARAAN PINJAMAN (24 JAM)</text>
        <text x="44" y="78" font-family="Arial, sans-serif" font-size="12" fill="#94A3B8">Penanggung Jawab: ${safeOwner} (NRP ${safeNrp})</text>
        
        <rect x="110" y="108" width="380" height="146" rx="14" fill="#FFFFFF" stroke="#0F172A" stroke-width="6"/>
        <rect x="118" y="116" width="364" height="130" rx="9" fill="none" stroke="#0F172A" stroke-width="2.5"/>
        <text x="300" y="182" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#0F172A" text-anchor="middle">${safePlate}</text>
        <line x1="140" y1="202" x2="460" y2="202" stroke="#CBD5E1" stroke-width="2"/>
        <text x="300" y="230" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#334155" text-anchor="middle">11 • 29</text>
        
        <text x="300" y="292" font-family="Arial, sans-serif" font-size="13" fill="#CBD5E1" text-anchor="middle">${safeBrand} — Warna ${safeColor}</text>
      </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
        <defs>
          <linearGradient id="stnkBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#EFF6FF"/>
            <stop offset="50%" stop-color="#F8FAFC"/>
            <stop offset="100%" stop-color="#ECFDF5"/>
          </linearGradient>
        </defs>
        <rect width="600" height="340" rx="18" fill="url(#stnkBg)" stroke="#94A3B8" stroke-width="2"/>
        <rect x="0" y="0" width="600" height="58" rx="18" fill="#013880"/>
        <rect x="0" y="36" width="600" height="22" fill="#013880"/>
        <text x="26" y="27" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#93C5FD">KEPOLISIAN NEGARA REPUBLIK INDONESIA</text>
        <text x="26" y="47" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#FFFFFF">SURAT TANDA NOMOR KENDARAAN BERMOTOR (DUMMY)</text>

        <text x="28" y="92" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748B">NOMOR REGISTRASI / PELAT</text>
        <text x="28" y="126" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#013880">${safePlate}</text>

        <text x="28" y="160" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748B">NAMA PEMILIK / PENGENDARA ITS</text>
        <text x="28" y="182" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#0F172A">${safeOwner}</text>
        <text x="28" y="201" font-family="Arial, sans-serif" font-size="12" fill="#475569">NRP Terdaftar: ${safeNrp}</text>

        <line x1="28" y1="218" x2="572" y2="218" stroke="#CBD5E1" stroke-width="1.5"/>

        <text x="28" y="244" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748B">MERK / TYPE</text>
        <text x="28" y="266" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0F172A">${safeBrand}</text>

        <text x="320" y="244" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748B">WARNA TNKB / KENDARAAN</text>
        <text x="320" y="266" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0F172A">${safeColor}</text>

        <rect x="424" y="78" width="148" height="44" rx="8" fill="#DCFCE7" stroke="#16A34A" stroke-width="1.5"/>
        <text x="498" y="98" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#15803D" text-anchor="middle">BERLAKU S/D</text>
        <text x="498" y="114" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#166534" text-anchor="middle">14 NOV 2029</text>

        <text x="28" y="314" font-family="Arial, sans-serif" font-size="11" fill="#64748B">Dokumen Simulasi Uji Verifikasi GateFlow SKK ITS</text>
      </svg>`;

  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

// Fetch Data dari Supabase
async function fetchMotorcycles() {
  if (!supabaseClient) {
    return motorsList;
  }

  let query = supabaseClient
    .from("motorcycles")
    .select("*")
    .order("created_at", { ascending: false });

  if (currentUser.role === "mahasiswa") {
    query = query.eq("nrp", currentUser.nrp);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetch motorcycles:", error);
    showToast("Gagal memuat data dari Supabase");
    return [];
  }

  motorsList = (data || []).map((item) => ({
    ...item,
    is_locked: Boolean(item.is_locked)
  }));
  return motorsList;
}

// Render Beranda Mahasiswa (Motor belum ACC tidak bisa dipencet)
async function renderStudentHome() {
  const firstName = currentUser.name.split(" ")[0] || "Mahasiswa";
  document.getElementById("user-greeting").textContent = `Halo, ${firstName}`;
  document.getElementById("user-sub").textContent = `NRP ${currentUser.nrp} • Mahasiswa ITS`;

  const listEl = document.getElementById("motor-list");
  listEl.innerHTML = `<div class="empty-state">Memuat daftar motor...</div>`;

  const motors = await fetchMotorcycles();
  listEl.innerHTML = "";

  if (motors.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Belum ada kendaraan terdaftar. Klik tombol di bawah untuk menambahkan motor.</div>`;
    return;
  }

  motors.forEach((motor) => {
    const isLocked = Boolean(motor.is_locked);
    const isVerified = motor.status === "verified";
    const categoryText = motor.skk_note || "Motor Pribadi";

    let stateClass = "";
    let badgeText = "";
    let descText = "";
    let rightHint = "";

    if (motor.status === "pending") {
      stateClass = "pending disabled-card";
      badgeText = "MENUNGGU ACC SKK";
      rightHint = "Belum Di-ACC";
      descText = `${categoryText} • Menunggu verifikasi petugas SKK sebelum kontrol akses aktif`;
    } else if (motor.status === "rejected") {
      stateClass = "rejected disabled-card";
      badgeText = "DITOLAK SKK";
      rightHint = "Ditolak";
      descText = `${categoryText} • Pengajuan ditolak petugas, silakan hubungi pos SKK`;
    } else if (isLocked) {
      stateClass = "locked";
      badgeText = "AKSES DIKUNCI";
      rightHint = "Atur Kunci >";
      descText = `${categoryText} • Palang terkunci selama parkir di kampus`;
    } else {
      stateClass = "unlocked";
      badgeText = "AKSES TERBUKA";
      rightHint = "Atur Kunci >";
      descText = `${categoryText} (Terverifikasi SKK) • Siap melintas tanpa berhenti`;
    }

    const card = document.createElement("div");
    card.className = `motor-card ${stateClass}`;
    card.innerHTML = `
      <div class="card-top">
        <span class="status-pill ${motor.status === "pending" ? "pending" : motor.status === "rejected" ? "rejected" : isLocked ? "locked" : "unlocked"}">${badgeText}</span>
        <span class="card-action-hint">${rightHint}</span>
      </div>
      <div class="motor-name">${motor.brand} ${motor.color ? `(${motor.color})` : ""}</div>
      <div class="motor-plate">${motor.plate}</div>
      <div class="card-divider"></div>
      <div class="motor-desc">${descText}</div>
    `;

    // Hanya motor yang sudah verified (di-ACC SKK) yang bisa diklik
    if (isVerified) {
      card.addEventListener("click", () => {
        selectedMotorId = motor.id;
        renderDetailScreen();
        showScreen("screen-detail");
      });
    }

    listEl.appendChild(card);
  });
}

// Render Dashboard Petugas SKK ITS (Hanya menampilkan status pending & hilang setelah diproses)
async function renderSkkDashboard() {
  document.getElementById("skk-greeting").textContent = `Pos Verifikasi SKK (${currentUser.name})`;
  document.getElementById("skk-sub").textContent = `NIP ${currentUser.nrp} • Petugas Keamanan ITS`;

  const listEl = document.getElementById("skk-motor-list");
  listEl.innerHTML = `<div class="empty-state">Memuat antrean verifikasi...</div>`;

  const allMotors = await fetchMotorcycles();
  const pendingMotors = allMotors.filter((m) => m.status === "pending");
  listEl.innerHTML = "";

  if (pendingMotors.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Semua pengajuan STNK sudah diverifikasi. Tidak ada antrean baru.</div>`;
    return;
  }

  pendingMotors.forEach((motor) => {
    const imgSrc =
      motor.stnk_image && motor.stnk_image.startsWith("data:image/")
        ? motor.stnk_image
        : generateDummyStnkDataUrl({
            plate: motor.plate,
            brand: motor.brand,
            color: motor.color,
            ownerName: motor.owner_name,
            nrp: motor.nrp,
            ownershipType: motor.skk_note
          });

    const card = document.createElement("div");
    card.className = "skk-card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong style="font-size:17px; color:#013880;">${motor.plate}</strong>
        <span style="font-size:11px; font-weight:700; color:#B45309; background:#FEF3C7; padding:3px 10px; border-radius:999px;">MENUNGGU VERIFIKASI</span>
      </div>
      <div style="font-size:13.5px; font-weight:700; margin-top:6px;">${motor.brand} (${motor.color || "-"})</div>
      <div style="font-size:12px; color:#475569; margin-top:2px;">Pengaju: <strong>${motor.owner_name}</strong> (NRP ${motor.nrp})</div>
      <div style="font-size:11.5px; color:#64748B; margin-top:2px;">Kategori: ${motor.skk_note || "Motor Pribadi"}</div>
      <img src="${imgSrc}" class="skk-stnk-thumb" alt="Dokumen STNK ${motor.plate}" title="Klik untuk memperbesar dokumen" onclick="openStnkModal(this.src)" />
      <div class="skk-actions">
        <button class="btn-sm btn-green" onclick="updateVerificationStatus('${motor.id}', 'verified')">Setujui STNK</button>
        <button class="btn-sm btn-red" onclick="updateVerificationStatus('${motor.id}', 'rejected')">Tolak</button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

async function updateVerificationStatus(id, newStatus) {
  if (supabaseClient) {
    const { error } = await supabaseClient
      .from("motorcycles")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      showToast("Gagal memperbarui status: " + error.message);
      return;
    }
  } else {
    const idx = motorsList.findIndex((m) => String(m.id) === String(id));
    if (idx !== -1) motorsList[idx].status = newStatus;
  }

  showToast(
    newStatus === "verified"
      ? "STNK disetujui — kendaraan aktif di akun mahasiswa"
      : "Pengajuan STNK ditolak"
  );
  await renderSkkDashboard();
}
window.updateVerificationStatus = updateVerificationStatus;

function openStnkModal(src) {
  document.getElementById("modal-stnk-img").src = src;
  document.getElementById("stnk-modal").style.display = "flex";
}
window.openStnkModal = openStnkModal;

document.getElementById("btn-close-modal").addEventListener("click", () => {
  document.getElementById("stnk-modal").style.display = "none";
});

// Render Detail & Kontrol Kunci Akses Keluar
function renderDetailScreen() {
  const motor = motorsList.find((m) => String(m.id) === String(selectedMotorId));
  if (!motor) {
    showScreen("screen-home");
    return;
  }

  document.getElementById("detail-motor-name").textContent = `${motor.brand} ${motor.color ? `(${motor.color})` : ""}`;
  document.getElementById("detail-motor-plate").textContent = motor.plate;
  document.getElementById("detail-owner-text").textContent = `Pemilik: ${motor.owner_name} (${motor.nrp})`;

  const lockCard = document.getElementById("lock-card");
  const statusPill = document.getElementById("detail-status-pill");
  const toggleInput = document.getElementById("lock-toggle-input");
  const lockHeading = document.getElementById("lock-heading");
  const lockDesc = document.getElementById("lock-desc");
  const lockDivider = document.getElementById("lock-divider");
  const lockSubTitle = document.getElementById("lock-sub-title");
  const lockSubDesc = document.getElementById("lock-sub-desc");
  const mainBtn = document.getElementById("btn-toggle-lock-main");
  const simResult = document.getElementById("sim-result");

  simResult.className = "sim-result";
  simResult.innerHTML = "";

  if (motor.is_locked) {
    lockCard.className = "lock-control-card locked";
    statusPill.className = "status-pill locked";
    statusPill.textContent = "AKSES KELUAR DIKUNCI";
    toggleInput.checked = true;

    lockHeading.style.color = "var(--red-dark)";
    lockHeading.textContent = "Kunci Akses Keluar Gerbang";
    lockDesc.style.color = "#991B1B";
    lockDesc.textContent =
      "Status parkir aman sedang aktif. Palang otomatis gerbang ITS menolak terbuka jika motor ini dibawa ke pintu keluar.";
    lockDivider.style.background = "var(--red-border)";
    lockSubTitle.style.color = "var(--red-dark)";
    lockSubTitle.textContent = "Peringatan Darurat Aktif:";
    lockSubDesc.style.color = "#991B1B";
    lockSubDesc.textContent = "Notifikasi langsung ke HP & pos satpam SKK jika melintas.";

    mainBtn.className = "btn btn-green";
    mainBtn.textContent = "Buka Kunci Akses untuk Keluar";
  } else {
    lockCard.className = "lock-control-card unlocked";
    statusPill.className = "status-pill unlocked";
    statusPill.textContent = "AKSES KELUAR TERBUKA";
    toggleInput.checked = false;

    lockHeading.style.color = "var(--green-dark)";
    lockHeading.textContent = "Siap Melintas Gerbang Keluar";
    lockDesc.style.color = "#047857";
    lockDesc.textContent =
      "Akses otomatis aktif. Kamera LPR di gerbang keluar ITS akan membuka palang secara otomatis tanpa Anda harus berhenti.";
    lockDivider.style.background = "var(--green-border)";
    lockSubTitle.style.color = "#065F46";
    lockSubTitle.textContent = "Panduan Berkendara:";
    lockSubDesc.style.color = "#047857";
    lockSubDesc.textContent = "Simpan HP di saku, tetap pegang setir dua tangan saat melintas.";

    mainBtn.className = "btn btn-red";
    mainBtn.textContent = "Kunci Akses Keluar Gerbang";
  }
}

// Toggle Status Kunci Motor ke Supabase
async function toggleMotorLock() {
  const motor = motorsList.find((m) => String(m.id) === String(selectedMotorId));
  if (!motor) return;

  const nextLockState = !motor.is_locked;
  motor.is_locked = nextLockState;
  renderDetailScreen();

  if (supabaseClient) {
    const { error } = await supabaseClient
      .from("motorcycles")
      .update({ is_locked: nextLockState })
      .eq("id", motor.id);

    if (error) {
      console.warn("Pastikan kolom is_locked sudah dibuat di Supabase:", error.message);
    }
  }

  showToast(nextLockState ? "Akses keluar gerbang dikunci" : "Akses keluar gerbang dibuka");
}

// Login & Tombol Akun Demo Terpisah (Mahasiswa vs SKK)
const roleSelect = document.getElementById("login-role");
const demoBtn = document.getElementById("btn-fill-demo");

roleSelect.addEventListener("change", () => {
  demoBtn.textContent =
    roleSelect.value === "skk"
      ? "Coba Akun Demo (Petugas SKK)"
      : "Coba Akun Demo (Mahasiswa)";
});

demoBtn.addEventListener("click", () => {
  if (roleSelect.value === "skk") {
    document.getElementById("input-nrp").value = "198804152015041002";
    document.getElementById("input-nama").value = "USERDEMOSKK";
    document.getElementById("input-pass").value = "password123";
    showToast("Akun demo SKK terisi — klik Masuk ke GateFlow");
  } else {
    document.getElementById("input-nrp").value = "5026231000";
    document.getElementById("input-nama").value = "USERDEMO";
    document.getElementById("input-pass").value = "password123";
    showToast("Akun demo Mahasiswa terisi — klik Masuk ke GateFlow");
  }
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  currentUser = {
    role: roleSelect.value,
    nrp: document.getElementById("input-nrp").value.trim(),
    name: document.getElementById("input-nama").value.trim()
  };

  if (currentUser.role === "skk") {
    await renderSkkDashboard();
    showScreen("screen-skk");
  } else {
    await renderStudentHome();
    showScreen("screen-home");
  }
  showToast(`Selamat datang, ${currentUser.name}`);
});

function handleLogout() {
  document.getElementById("login-form").reset();
  roleSelect.value = "mahasiswa";
  demoBtn.textContent = "Coba Akun Demo (Mahasiswa)";
  motorsList = [];
  selectedMotorId = null;
  showScreen("screen-login");
}

document.getElementById("btn-logout").addEventListener("click", handleLogout);
document.getElementById("btn-logout-skk").addEventListener("click", handleLogout);

// Navigasi Tambah & Detail Motor
document.getElementById("btn-go-add").addEventListener("click", () => {
  document.getElementById("motor-brand-input").value = "";
  document.getElementById("motor-color-input").value = "";
  document.getElementById("motor-plate-input").value = "";
  generatedProofDataUrl = "";
  updateOwnershipSegment("Motor Pribadi");
  showScreen("screen-add");
});

document.getElementById("btn-back-add").addEventListener("click", async () => {
  await renderStudentHome();
  showScreen("screen-home");
});

document.getElementById("btn-back-detail").addEventListener("click", async () => {
  await renderStudentHome();
  showScreen("screen-home");
});

// Pilihan Kepemilikan (Motor Pribadi vs Pinjaman 24 Jam)
function updateOwnershipSegment(type) {
  selectedOwnership = type;
  document.querySelectorAll(".segment-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });

  const proofLabel = document.getElementById("proof-label");
  const uploadBox = document.getElementById("upload-box");
  const uploadTitle = document.getElementById("upload-title");
  const uploadSub = document.getElementById("upload-sub");
  const previewImg = document.getElementById("upload-preview-img");

  uploadBox.classList.remove("uploaded");
  previewImg.style.display = "none";
  previewImg.src = "";
  generatedProofDataUrl = "";

  if (type === "Pinjaman (24 Jam)") {
    proofLabel.textContent = "Foto Pelat Depan Motor *";
    uploadTitle.style.color = "#1D4ED8";
    uploadTitle.textContent = "[ + Ketuk untuk Generate Dummy Foto Pelat ]";
    uploadSub.style.color = "#2563EB";
    uploadSub.textContent = "Otomatis membuat pratinjau pelat nomor pinjaman 24 jam";
  } else {
    proofLabel.textContent = "Bukti STNK Kendaraan *";
    uploadTitle.style.color = "#1D4ED8";
    uploadTitle.textContent = "[ + Ketuk untuk Generate Dummy STNK ]";
    uploadSub.style.color = "#2563EB";
    uploadSub.textContent = "Otomatis membuat pratinjau STNK sesuai data di atas";
  }
}

document.querySelectorAll(".segment-btn").forEach((btn) => {
  btn.addEventListener("click", () => updateOwnershipSegment(btn.dataset.type));
});

// Generate Dummy STNK / Foto Pelat saat kotak unggah diklik
document.getElementById("upload-box").addEventListener("click", () => {
  const brand = document.getElementById("motor-brand-input").value.trim() || "Honda Vario 160";
  const color = document.getElementById("motor-color-input").value.trim() || "Hitam";
  const plate = document.getElementById("motor-plate-input").value.trim().toUpperCase() || "L 9988 XY";

  generatedProofDataUrl = generateDummyStnkDataUrl({
    plate,
    brand,
    color,
    ownerName: currentUser.name,
    nrp: currentUser.nrp,
    ownershipType: selectedOwnership
  });

  const uploadBox = document.getElementById("upload-box");
  const uploadTitle = document.getElementById("upload-title");
  const uploadSub = document.getElementById("upload-sub");
  const previewImg = document.getElementById("upload-preview-img");

  uploadBox.classList.add("uploaded");
  uploadTitle.style.color = "#065F46";
  uploadTitle.textContent =
    selectedOwnership === "Pinjaman (24 Jam)"
      ? "Dummy Foto Pelat Terlampir"
      : "Dummy STNK Terlampir";
  uploadSub.style.color = "#047857";
  uploadSub.textContent = "Ketuk lagi jika ingin memperbarui pratinjau dokumen";

  previewImg.src = generatedProofDataUrl;
  previewImg.style.display = "block";
});

// Simpan Kendaraan Baru (Status awal: pending menunggu ACC SKK)
document.getElementById("add-motor-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const brand = document.getElementById("motor-brand-input").value.trim();
  const color = document.getElementById("motor-color-input").value.trim();
  const plate = document.getElementById("motor-plate-input").value.trim().toUpperCase();

  if (!brand || !plate) return;
  if (!generatedProofDataUrl) {
    showToast("Ketuk kotak bukti untuk membuat dummy STNK dulu");
    return;
  }

  // Perbarui gambar dummy sekali lagi agar 100% cocok dengan isian teks terakhir
  const finalProofUrl = generateDummyStnkDataUrl({
    plate,
    brand,
    color,
    ownerName: currentUser.name,
    nrp: currentUser.nrp,
    ownershipType: selectedOwnership
  });

  const submitBtn = document.getElementById("btn-submit-motor");
  submitBtn.disabled = true;
  submitBtn.textContent = "Mengirim ke SKK...";

  const newRecord = {
    nrp: currentUser.nrp,
    owner_name: currentUser.name,
    plate,
    brand,
    color,
    stnk_image: finalProofUrl,
    status: "pending",
    is_locked: false,
    skk_note: selectedOwnership
  };

  if (supabaseClient) {
    const { error } = await supabaseClient.from("motorcycles").insert([newRecord]);
    if (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Ajukan ke SKK ITS";
      showToast("Gagal menyimpan: " + error.message);
      return;
    }
  } else {
    motorsList.unshift({ id: "demo-" + Date.now(), ...newRecord });
  }

  submitBtn.disabled = false;
  submitBtn.textContent = "Ajukan ke SKK ITS";
  await renderStudentHome();
  showScreen("screen-home");
  showToast(`${brand} (${plate}) diajukan — menunggu ACC SKK`);
});

// Toggle Lock dari Saklar maupun Tombol Utama
document.getElementById("lock-toggle-input").addEventListener("change", toggleMotorLock);
document.getElementById("btn-toggle-lock-main").addEventListener("click", toggleMotorLock);

// Simulasi Reaksi Kamera LPR Gerbang
document.getElementById("btn-test-gate").addEventListener("click", () => {
  const motor = motorsList.find((m) => String(m.id) === String(selectedMotorId));
  if (!motor) return;

  const simResult = document.getElementById("sim-result");
  if (motor.is_locked) {
    simResult.className = "sim-result alert";
    simResult.innerHTML = `
      <strong>PALANG GERBANG MENOLAK TERBUKA!</strong><br/>
      Kamera LPR mendeteksi pelat <strong>${motor.plate}</strong> dalam status <strong>DIKUNCI</strong>. Peringatan dikirim ke Pos SKK ITS & HP pemilik (${motor.nrp}).
    `;
  } else {
    simResult.className = "sim-result pass";
    simResult.innerHTML = `
      <strong>PALANG GERBANG TERBUKA OTOMATIS!</strong><br/>
      Pelat <strong>${motor.plate}</strong> (${motor.brand}) terverifikasi atas nama <strong>${motor.owner_name}</strong>. Silakan melintas tanpa berhenti.
    `;
  }
});

// Hapus Kendaraan
document.getElementById("btn-delete-motor").addEventListener("click", async () => {
  if (!selectedMotorId) return;

  if (supabaseClient) {
    const { error } = await supabaseClient
      .from("motorcycles")
      .delete()
      .eq("id", selectedMotorId);

    if (error) {
      showToast("Gagal menghapus kendaraan");
      return;
    }
  } else {
    motorsList = motorsList.filter((m) => String(m.id) !== String(selectedMotorId));
  }

  await renderStudentHome();
  showScreen("screen-home");
  showToast("Kendaraan berhasil dihapus");
});