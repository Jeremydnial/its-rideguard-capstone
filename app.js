// Tempel URL dan Anon Public Key dari project Supabase kamu di sini
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

const supabaseClient = isSupabaseConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let currentUser = {
  nrp: "5026231218",
  name: "Jeremy Siregar",
  role: "mahasiswa"
};

let motorsList = [];
let selectedMotorId = null;
let selectedOwnership = "Motor Pribadi";
let proofAttached = false;

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

// Fetch Data dari Supabase (dengan fallback lokal jika key belum diisi)
async function fetchMotorcycles() {
  if (!supabaseClient) {
    if (motorsList.length === 0) {
      motorsList = [
        {
          id: "demo-1",
          nrp: currentUser.nrp,
          owner_name: currentUser.name,
          plate: "L 4521 AB",
          brand: "Honda Vario 160",
          color: "Hitam",
          stnk_image: "STNK_Vario160.jpg",
          status: "verified",
          is_locked: false,
          skk_note: "Motor Pribadi"
        }
      ];
    }
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

// Render Beranda Mahasiswa
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
    const stateClass = isLocked ? "locked" : "unlocked";
    const badgeText = isLocked ? "AKSES DIKUNCI" : "AKSES TERBUKA";
    const categoryText = motor.skk_note || "Motor Pribadi";
    const verifyLabel = motor.status === "verified" ? "Terverifikasi SKK" : "Menunggu Verifikasi";

    const descText = isLocked
      ? `${categoryText} • Palang terkunci selama parkir di kampus`
      : `${categoryText} (${verifyLabel}) • Siap melintas tanpa berhenti`;

    const card = document.createElement("div");
    card.className = `motor-card ${stateClass}`;
    card.innerHTML = `
      <div class="card-top">
        <span class="status-pill ${stateClass}">${badgeText}</span>
        <span class="card-action-hint">Atur Kunci ></span>
      </div>
      <div class="motor-name">${motor.brand} ${motor.color ? `(${motor.color})` : ""}</div>
      <div class="motor-plate">${motor.plate}</div>
      <div class="card-divider"></div>
      <div class="motor-desc">${descText}</div>
    `;

    card.addEventListener("click", () => {
      selectedMotorId = motor.id;
      renderDetailScreen();
      showScreen("screen-detail");
    });

    listEl.appendChild(card);
  });
}

// Render Dashboard SKK ITS
async function renderSkkDashboard() {
  const listEl = document.getElementById("skk-motor-list");
  listEl.innerHTML = `<div class="empty-state">Memuat data kendaraan...</div>`;

  const motors = await fetchMotorcycles();
  listEl.innerHTML = "";

  if (motors.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Belum ada data kendaraan mahasiswa.</div>`;
    return;
  }

  motors.forEach((motor) => {
    const lockStatus = motor.is_locked ? "DIKUNCI PEMILIK (DILARANG BUKA)" : "TERBUKA (SIAP MELINTAS)";
    const lockColor = motor.is_locked ? "#DC2626" : "#059669";

    const card = document.createElement("div");
    card.className = "skk-card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong style="font-size:16px;">${motor.plate}</strong>
        <span style="font-size:11px; font-weight:700; color:${lockColor};">${lockStatus}</span>
      </div>
      <div style="font-size:13px; margin-top:4px;">${motor.brand} (${motor.color || "-"})</div>
      <div style="font-size:12px; color:#64748B; margin-top:2px;">Pemilik: ${motor.owner_name} (${motor.nrp})</div>
      <div style="font-size:11px; color:#475569; margin-top:4px;">Status STNK: <strong>${motor.status.toUpperCase()}</strong></div>
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
      showToast("Gagal memperbarui status");
      return;
    }
  } else {
    const idx = motorsList.findIndex((m) => m.id === id);
    if (idx !== -1) motorsList[idx].status = newStatus;
  }

  showToast(`Status diubah menjadi ${newStatus}`);
  renderSkkDashboard();
}

// Render Detail & Kontrol Kunci Akses Keluar
function renderDetailScreen() {
  const motor = motorsList.find((m) => String(m.id) === String(selectedMotorId));
  if (!motor) {
    showScreen("screen-home");
    return;
  }

  const verifyBadge = document.getElementById("detail-verify-badge");
  if (motor.status === "verified") {
    verifyBadge.className = "verify-badge verified";
    verifyBadge.textContent = "Terverifikasi SKK";
  } else {
    verifyBadge.className = "verify-badge pending";
    verifyBadge.textContent = motor.status === "rejected" ? "Ditolak SKK" : "Menunggu Verifikasi";
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

// Event Listeners
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  currentUser = {
    role: document.getElementById("login-role").value,
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


document.getElementById("btn-go-add").addEventListener("click", () => {
  document.getElementById("motor-brand-input").value = "";
  document.getElementById("motor-color-input").value = "";
  document.getElementById("motor-plate-input").value = "";
  proofAttached = false;
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

  uploadBox.classList.remove("uploaded");
  proofAttached = false;

  if (type === "Pinjaman (24 Jam)") {
    proofLabel.textContent = "Foto Pelat Depan / NRP Pemilik *";
    uploadTitle.style.color = "#1D4ED8";
    uploadTitle.textContent = "[ + Ambil Foto Pelat Depan Motor ]";
    uploadSub.style.color = "#2563EB";
    uploadSub.textContent = "Tidak wajib STNK fisik untuk akses pinjaman 24 jam";
  } else {
    proofLabel.textContent = "Bukti STNK / Foto Pelat *";
    uploadTitle.style.color = "#1D4ED8";
    uploadTitle.textContent = "[ + Ketuk untuk Lampirkan Bukti STNK / Pelat ]";
    uploadSub.style.color = "#2563EB";
    uploadSub.textContent = "Simulasi unggah berkas verifikasi motor pribadi";
  }
}

document.querySelectorAll(".segment-btn").forEach((btn) => {
  btn.addEventListener("click", () => updateOwnershipSegment(btn.dataset.type));
});

document.getElementById("upload-box").addEventListener("click", () => {
  proofAttached = true;
  const uploadBox = document.getElementById("upload-box");
  const uploadTitle = document.getElementById("upload-title");
  const uploadSub = document.getElementById("upload-sub");

  uploadBox.classList.add("uploaded");
  uploadTitle.style.color = "#065F46";
  uploadTitle.textContent =
    selectedOwnership === "Pinjaman (24 Jam)"
      ? "Foto_Pelat_Pinjaman_24Jam.jpg"
      : "STNK_Kendaraan_Terverifikasi.jpg";
  uploadSub.style.color = "#047857";
  uploadSub.textContent = "Berkas siap disimpan (Ketuk untuk mengganti)";
});

// Simpan Kendaraan Baru ke Supabase
document.getElementById("add-motor-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const brand = document.getElementById("motor-brand-input").value.trim();
  const color = document.getElementById("motor-color-input").value.trim();
  const plate = document.getElementById("motor-plate-input").value.trim().toUpperCase();

  if (!brand || !plate) return;
  if (!proofAttached) {
    showToast("Ketuk kotak unggah bukti terlebih dahulu");
    return;
  }

  const submitBtn = document.getElementById("btn-submit-motor");
  submitBtn.disabled = true;
  submitBtn.textContent = "Menyimpan...";

  const newRecord = {
    nrp: currentUser.nrp,
    owner_name: currentUser.name,
    plate,
    brand,
    color,
    stnk_image: selectedOwnership === "Pinjaman (24 Jam)" ? "Foto_Pelat_24Jam.jpg" : "STNK_Verified.jpg",
    status: "verified",
    is_locked: false,
    skk_note: selectedOwnership
  };

  if (supabaseClient) {
    const { error } = await supabaseClient.from("motorcycles").insert([newRecord]);
    if (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Simpan Kendaraan";
      showToast("Gagal menyimpan: " + error.message);
      return;
    }
  } else {
    motorsList.unshift({ id: "demo-" + Date.now(), ...newRecord });
  }

  submitBtn.disabled = false;
  submitBtn.textContent = "Simpan Kendaraan";
  await renderStudentHome();
  showScreen("screen-home");
  showToast(`${brand} (${plate}) berhasil ditambahkan`);
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
  } else if (motor.status !== "verified") {
    simResult.className = "sim-result alert";
    simResult.innerHTML = `
      <strong>MENUNGGU VERIFIKASI PETUGAS!</strong><br/>
      Pelat <strong>${motor.plate}</strong> belum disetujui SKK ITS. Petugas gerbang diminta mengecek manual.
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

// Isi otomatis kredensial Akun Demo
document.getElementById("btn-fill-demo").addEventListener("click", () => {
  document.getElementById("login-role").value = "mahasiswa";
  document.getElementById("input-nrp").value = "5026231000";
  document.getElementById("input-nama").value = "USERDEMO";
  document.getElementById("input-pass").value = "password123";
  showToast("Akun demo terisi — klik Masuk ke GateFlow");
});

// Kosongkan kembali form login saat Keluar
function handleLogout() {
  document.getElementById("login-form").reset();
  motorsList = [];
  selectedMotorId = null;
  showScreen("screen-login");
}

document.getElementById("btn-logout").addEventListener("click", handleLogout);
document.getElementById("btn-logout-skk").addEventListener("click", handleLogout);