import { db, auth, provider } from './firebase-core.js';
        const listKhodam = [
            { nama: "Macan Putih", desc: "Berwibawa dan berani mengambil risiko!" },
            { nama: "Kucing Oren", desc: "Agak barbar, suka makan, tapi ngangenin." },
            { nama: "Buaya Darat", desc: "Waduh, hati-hati gampang banget nebar pesona!" },
            { nama: "Seblak Ceker", desc: "Pedas, bikin emosi, tapi selalu dicari-cari." },
            { nama: "Kipas Angin", desc: "Pembawa kesejukan di saat teman-teman lagi panas." },
            { nama: "Sendal Jepit", desc: "Sederhana, merakyat, tapi sering ilang kalau di masjid." },
            { nama: "Kosong (Tidak Ada)", desc: "Kamu murni, butuh banyak ibadah biar ada yang jagain." }
        ];

        let currentUser = null, userProfile = {}, compressedProfileImage = "", videoStream = null, currentLat = null, currentLong = null, allData = [], currentTab = 'all';
        let html5QrCode = null, unsubscribeRiwayat = null, unsubscribePengumuman = null, unsubscribeQuest = null, unsubscribeOrders = null, unsubscribeMenfess = null, selectedMood = "🙂"; 
        

        // --- FUNGSI LAMA SEBELUMNYA TETAP AMAN (ABSEN DLL) ---
        window.aturForm = () => { const jenis = document.getElementById('jenis-absen').value; const selectStatus = document.getElementById('status-absen'); const boxStatus = document.getElementById('container-status'); const boxKet = document.getElementById('container-keterangan'); selectStatus.innerHTML = ""; if (jenis === 'Masuk') { boxStatus.classList.remove('hidden'); boxKet.classList.add('hidden'); selectStatus.innerHTML += `<option value="Hadir (WFO)">🏢 Hadir (WFO - Kantor)</option><option value="Hadir (WFH)">🏠 Hadir (WFH - Rumah)</option>`; } else if (jenis === 'Pulang') { boxStatus.classList.add('hidden'); boxKet.classList.add('hidden'); } else if (jenis === 'IzinSakit') { boxStatus.classList.remove('hidden'); boxKet.classList.remove('hidden'); selectStatus.innerHTML += `<option value="Sakit">🤒 Sakit</option><option value="Izin">⚠️ Izin</option>`; } else if (jenis === 'Cuti') { boxStatus.classList.remove('hidden'); boxKet.classList.remove('hidden'); selectStatus.innerHTML += `<option value="Cuti">🏖️ Cuti</option>`; } }
        function hitungJarak(lat1, lon1, lat2, lon2) { const R = 6371e3; const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180; const Δφ = (lat2-lat1) * Math.PI/180, Δλ = (lon2-lon1) * Math.PI/180; const a = Math.sin(Δφ/2)*Math.sin(Δφ/2) + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)*Math.sin(Δλ/2); return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); }
// Deklarasi variabel di luar fungsi biar bisa dibaca semua
window.currentFacingMode = 'user'; 

window.bukaKamera = async () => { 
    try { 
        const videoElement = document.getElementById('video-preview');

        // PENTING: Bersihkan memori kamera lama sampai tuntas
        if (window.videoStream) {
            window.videoStream.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null; // Lepas video dari layar
            
            // Kasih jeda 0.2 detik biar HP punya waktu buat matiin hardware kameranya
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Buka kamera dengan lensa yang baru
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: window.currentFacingMode } 
        }); 
        
        window.videoStream = stream; 
        videoElement.srcObject = stream; 
        
        // Atur tombol & tampilan
        document.getElementById('camera-container').classList.remove('hidden'); 
        document.getElementById('btn-open-camera').classList.add('hidden'); 
        document.getElementById('btn-capture').classList.remove('hidden'); 
        
// --- Bagian GPS (Udah Dibikin Global) ---
        document.getElementById('gps-status').innerText = "Mencari GPS..."; 
        if (navigator.geolocation) { 
            navigator.geolocation.getCurrentPosition((pos) => { 
                // Tambahin window. di depannya biar fix nempel secara global
                window.currentLat = pos.coords.latitude; 
                window.currentLong = pos.coords.longitude; 
                
                // Variabel yang lama juga tetep kita isi buat jaga-jaga kalau dibutuhkan script lain
                currentLat = pos.coords.latitude; 
                currentLong = pos.coords.longitude; 
                
                const jarak = Math.round(hitungJarak(window.currentLat, window.currentLong, KANTOR_LAT, KANTOR_LONG)); 
                document.getElementById('gps-status').innerHTML = `<span class="text-slate-900 font-bold dark:text-slate-200">GPS Terkunci</span>`; 
                
                const info = document.getElementById('jarak-status'); 
                info.innerText = `${jarak}m dari kantor`; 
                info.classList.remove('hidden'); 
                info.className = (jarak > MAX_JARAK_METER) ? "text-[10px] font-bold bg-red-500 text-white rounded px-2 mt-1" : "text-[10px] font-bold bg-green-600 text-white rounded px-2 mt-1"; 
            }, 
            (err) => {
                document.getElementById('gps-status').innerText = "GPS Gagal/Ditolak"; 
            }, 
            { enableHighAccuracy: true }); // Biar GPS-nya lebih akurat
        }
    } catch (err) { 
        alert("Gagal kamera: " + err.message + ". Pastikan HP kamu mendukung fitur ini ya!"); 
    } 
};

window.flipKamera = () => {
    window.currentFacingMode = (window.currentFacingMode === 'user') ? 'environment' : 'user';
    window.bukaKamera();
};
window.flipKamera = () => {
    // Balik mode dari depan ke belakang, atau sebaliknya
    window.currentFacingMode = (window.currentFacingMode === 'user') ? 'environment' : 'user';
    
    // Panggil ulang fungsi kamera biar langsung ganti lensa
    window.bukaKamera();
};
        async function getAlamatLengkap(lat, long) { try { const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}&zoom=18&addressdetails=1`); const data = await response.json(); let alamat = data.display_name; if (alamat.length > 60) { alamat = alamat.substring(0, 60) + "..."; } return alamat; } catch (error) { return "Lokasi Terdeteksi"; } }
window.jepretDanKirim = async () => { 
    // 1. Kita sesuaikan nama variabelnya pakai window.
    if (!window.videoStream || !window.currentLat) return alert("Tunggu GPS terkunci dulu ya!"); 
    
    const jenis = document.getElementById('jenis-absen').value; 
    let status = (jenis === 'Pulang') ? "Pulang" : document.getElementById('status-absen').value; 
    const keterangan = document.getElementById('input-keterangan').value; 
    
    if (jenis === 'Masuk' && status === 'Hadir (WFO)') { 
        // 2. Sesuaikan di perhitungan jarak
        const jarak = hitungJarak(window.currentLat, window.currentLong, KANTOR_LAT, KANTOR_LONG); 
        if (jarak > MAX_JARAK_METER) return alert(`Kejauhan! (${Math.round(jarak)}m). Harap mendekat ke kantor.`); 
    } 
    
    if ((jenis === 'IzinSakit' || jenis === 'Cuti') && !keterangan.trim()) return alert("Wajib isi keterangan!"); 
    
    const now = new Date(); 
    if (jenis === 'Masuk') { 
        if (now.getHours() > JAM_MASUK_KANTOR || (now.getHours() === JAM_MASUK_KANTOR && now.getMinutes() > MENIT_MASUK_KANTOR)) { 
            status += " (TERLAMBAT)"; 
        } 
    } 
    
    const btnCapture = document.getElementById('btn-capture'); 
    const originalText = btnCapture.innerHTML; 
    btnCapture.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> MELACAK ALAMAT...`; 
    btnCapture.disabled = true; 
    
    let alamatUser = "Lokasi Koordinat"; 
    try { 
        // 3. Sesuaikan pas ngambil alamat text
        alamatUser = await getAlamatLengkap(window.currentLat, window.currentLong); 
    } catch (e) { 
        alamatUser = `${window.currentLat}, ${window.currentLong}`; 
    } 
    
    const video = document.getElementById('video-preview'); 
    const canvas = document.createElement('canvas'); 
    canvas.width = 640; 
    canvas.height = 480; 
    const ctx = canvas.getContext('2d'); 
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height); 
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; 
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100); 
    ctx.fillStyle = "white"; 
    ctx.font = "bold 20px sans-serif"; 
    ctx.fillText(`${userProfile.nama} • ${status}`, 20, canvas.height - 70); 
    ctx.font = "14px sans-serif"; 
    ctx.fillText(`📅 ${now.toLocaleString('id-ID')}`, 20, canvas.height - 45); 
    ctx.font = "12px sans-serif"; 
    ctx.fillStyle = "#fbbf24"; 
    ctx.fillText(`📍 ${alamatUser}`, 20, canvas.height - 20); 
    
    const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8); 
    
    // 4. Matikan kamera setelah jepret
    window.videoStream.getTracks().forEach(t => t.stop()); 
    
    document.getElementById('camera-container').classList.add('hidden'); 
    document.getElementById('btn-open-camera').classList.remove('hidden'); 
    document.getElementById('btn-capture').classList.add('hidden'); 
    btnCapture.innerHTML = originalText; 
    btnCapture.disabled = false; 
    document.getElementById('input-keterangan').value = ""; 
    
    try { 
        await addDoc(collection(db, "absensi"), { 
            uid: currentUser.uid, 
            nama: userProfile.nama, 
            divisi: userProfile.divisi, 
            foto_profil: userProfile.photoURL, 
            bukti_foto: fotoBase64, 
            kategori: jenis, 
            status: status, 
            keterangan: keterangan, 
            lokasi: alamatUser, 
            // 5. Sesuaikan pas nyimpen ke database Firebase
            koordinat: `${window.currentLat}, ${window.currentLong}`, 
            waktu: now.toLocaleTimeString('id-ID'), 
            tanggal: now.toLocaleDateString('id-ID'), 
            timestamp: now, 
            mood: selectedMood 
        }); 
        alert("Absen Berhasil! Mood: " + selectedMood); 
    } catch (e) { 
        alert("Error Database: " + e.message); 
    } 
};
        window.loadRiwayatData = (filterTanggal = null) => { if (unsubscribeRiwayat) { unsubscribeRiwayat(); } const today = new Date().toLocaleDateString('id-ID'); let targetDate = today; if (filterTanggal) { const parts = filterTanggal.split('-'); const day = parseInt(parts[2]).toString(); const month = parseInt(parts[1]).toString(); const year = parts[0]; targetDate = `${day}/${month}/${year}`; } const label = document.getElementById('label-riwayat'); label.innerText = (targetDate === today) ? "Riwayat Hari Ini" : `Riwayat: ${targetDate}`; const q = query(collection(db, "absensi"), where("tanggal", "==", targetDate), orderBy("timestamp", "desc")); unsubscribeRiwayat = onSnapshot(q, (snapshot) => { allData = []; snapshot.forEach(doc => allData.push(doc.data())); renderTabel(); }); };
        window.gantiTanggalRiwayat = () => { const val = document.getElementById('input-filter-tanggal').value; if(val) loadRiwayatData(val); }; window.resetTanggalRiwayat = () => { document.getElementById('input-filter-tanggal').value = ""; loadRiwayatData(null); }; window.gantiTab = (tabName) => { currentTab = tabName; document.querySelectorAll('button[id^="tab-"]').forEach(btn => btn.className = "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600 transition"); document.getElementById(`tab-${tabName}`).className = "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap active-tab transition border border-transparent"; renderTabel(); };
        function renderTabel() { const container = document.getElementById('tabel-body'); container.innerHTML = ""; const filteredData = allData.filter(d => { if (currentTab === 'all') return true; if (currentTab === 'wfo') return d.kategori === 'Masuk' && d.status.includes('WFO'); if (currentTab === 'wfh') return d.kategori === 'Masuk' && d.status.includes('WFH'); if (currentTab === 'pulang') return d.kategori === 'Pulang'; if (currentTab === 'sakit') return d.kategori === 'IzinSakit'; if (currentTab === 'cuti') return d.kategori === 'Cuti'; return false; }); if(filteredData.length === 0) { document.getElementById('empty-msg').classList.remove('hidden'); } else { document.getElementById('empty-msg').classList.add('hidden'); filteredData.forEach(data => { let badgeClass = "bg-gray-100 text-gray-600 border-gray-200"; let icon = "fa-check"; if(data.status.includes('WFO')) { badgeClass = "bg-amber-100 text-amber-800 border-amber-200"; icon="fa-building"; } else if(data.status.includes('WFH')) { badgeClass = "bg-orange-100 text-orange-800 border-orange-200"; icon="fa-house-laptop"; } else if(data.status.includes('Sakit') || data.status.includes('Izin')) { badgeClass = "bg-rose-100 text-rose-800 border-rose-200"; icon="fa-bed-pulse"; } else if(data.status.includes('Cuti')) { badgeClass = "bg-purple-100 text-purple-800 border-purple-200"; icon="fa-umbrella-beach"; } else if(data.status.includes('Pulang')) { badgeClass = "bg-slate-200 text-slate-700 border-slate-300"; icon="fa-person-walking-arrow-right"; } let lateUI = data.status.includes("TERLAMBAT") ? `<span class="bg-red-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">TELAT</span>` : ""; let moodUI = data.mood ? `<span class="text-lg absolute top-0 right-0 -mt-2 -mr-2 bg-white dark:bg-slate-800 rounded-full shadow border dark:border-slate-600 p-1">${data.mood}</span>` : ""; container.innerHTML += `<div class="bg-white/90 dark:bg-slate-800/90 p-4 rounded-2xl shadow-sm border border-amber-100/50 dark:border-slate-700 flex gap-4 items-start fade-in hover:shadow-md transition"><div class="flex-shrink-0 relative group"><img src="${data.bukti_foto}" class="w-16 h-16 object-cover rounded-xl shadow-sm cursor-pointer hover:scale-105 transition ring-2 ring-white dark:ring-slate-600" onclick="bukaFoto('${data.bukti_foto}')">${moodUI}<div class="absolute -bottom-2 -right-2 bg-white dark:bg-slate-700 rounded-full p-1 shadow-sm"><div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${badgeClass.split(' ')[0]} ${badgeClass.split(' ')[1]}"><i class="fa-solid ${icon}"></i></div></div></div><div class="flex-1 min-w-0"><div class="flex justify-between items-start"><h4 class="font-bold text-slate-900 dark:text-slate-200 text-sm truncate">${data.nama}</h4><span class="text-[10px] font-mono text-slate-500 bg-amber-50 dark:bg-slate-700 dark:text-slate-300 px-1.5 rounded border border-amber-100 dark:border-slate-600">${data.waktu}</span></div><p class="text-xs text-amber-600 dark:text-amber-400 font-bold mb-1">${data.divisi}</p><div class="flex items-center gap-1 flex-wrap"><span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badgeClass}">${data.status.replace(" (TERLAMBAT)", "")}</span>${lateUI}</div>${data.keterangan ? `<p class="text-xs text-slate-600 dark:text-slate-400 mt-2 italic bg-amber-50/50 dark:bg-slate-900 p-2 rounded-lg border border-amber-100 dark:border-slate-600">"${data.keterangan}"</p>` : ''}</div></div>`; }); } }
        
        window.bukaTim = async () => { document.getElementById('team-modal').classList.remove('hidden'); const container = document.getElementById('team-list-container'); container.innerHTML = `<div class="text-center text-gray-400 py-10"><i class="fa-solid fa-spinner fa-spin"></i> Memuat data...</div>`; const q = query(collection(db, "data_karyawan"), orderBy("nama", "asc")); const snap = await getDocs(q); container.innerHTML = ""; snap.forEach(doc => { const data = doc.data(); let tglUltah = "-"; if(data.tgl_lahir) { const date = new Date(data.tgl_lahir); tglUltah = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }); } container.innerHTML += `<div onclick="lihatProfilOrang('${data.nama}', '${data.divisi}', '${data.email}', '${data.tgl_lahir}')" class="flex items-center gap-3 p-3 mb-2 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 transition active:scale-95"><div class="w-10 h-10 rounded-full bg-amber-100 dark:bg-slate-600 flex items-center justify-center text-amber-600 dark:text-white font-bold text-lg">${data.nama.charAt(0)}</div><div><h4 class="font-bold text-sm text-slate-800 dark:text-white">${data.nama}</h4><p class="text-xs text-amber-600 font-medium">${data.divisi}</p></div><div class="ml-auto text-right"><p class="text-[10px] text-gray-400 uppercase font-bold">Ultah</p><p class="text-xs font-bold text-slate-600 dark:text-slate-300"><i class="fa-solid fa-cake-candles text-pink-400 mr-1"></i>${tglUltah}</p></div></div>`; }); };
        window.lihatProfilOrang = async (nama, divisi, email, tgl_lahir) => { document.getElementById('other-profile-modal').classList.remove('hidden'); document.getElementById('view-other-nama').innerText = nama; document.getElementById('view-other-divisi').innerText = divisi; document.getElementById('view-other-email').innerText = email || "-"; document.getElementById('view-other-foto').src = 'icon.png'; let tgl = "-"; if(tgl_lahir) { const d = new Date(tgl_lahir); tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); } document.getElementById('view-other-tgl').innerText = tgl; try { const q = query(collection(db, "users"), where("email", "==", email)); const snap = await getDocs(q); if(!snap.empty) { snap.forEach(doc => { const d = doc.data(); if(d.photoURL) document.getElementById('view-other-foto').src = d.photoURL; }); } else { document.getElementById('view-other-foto').src = `https://ui-avatars.com/api/?name=${nama}&background=random&color=fff&size=200`; } } catch(e) { console.log("Gagal load foto: " + e); } };
        window.tutupProfilOrang = () => { document.getElementById('other-profile-modal').classList.add('hidden'); };
        window.copyEmailOrang = () => { const email = document.getElementById('view-other-email').innerText; if(email && email !== '-') { navigator.clipboard.writeText(email); alert("Email disalin ke clipboard!"); } };
        
        window.bukaAdminPanel = () => { document.getElementById('admin-modal').classList.remove('hidden'); }
        window.tambahKaryawan = async () => { const email = document.getElementById('adm-email').value.trim(); const nama = document.getElementById('adm-nama').value.trim(); const divisi = document.getElementById('adm-divisi').value; const role = document.getElementById('adm-role').value; const tgl = document.getElementById('adm-tgl').value; if(!email || !nama || !divisi) return alert("Semua data wajib diisi!"); try { const q = query(collection(db, "data_karyawan"), where("email", "==", email)); const snap = await getDocs(q); if(!snap.empty) return alert("Email ini sudah terdaftar!"); await addDoc(collection(db, "data_karyawan"), { email, nama, divisi, role, tgl_lahir: tgl, timestamp: new Date() }); alert("Karyawan Berhasil Ditambahkan!"); document.getElementById('adm-email').value = ""; document.getElementById('adm-nama').value = ""; document.getElementById('adm-tgl').value = ""; } catch(e) { alert("Error: " + e.message); } }
        window.loadDaftarKaryawan = () => { const q = query(collection(db, "data_karyawan"), orderBy("nama", "asc")); onSnapshot(q, (snapshot) => { const list = document.getElementById('list-karyawan'); list.innerHTML = ""; snapshot.forEach(doc => { const data = doc.data(); const badge = data.role === 'admin' ? '<span class="text-[9px] bg-purple-100 text-purple-700 px-1 rounded font-bold ml-1">ADMIN</span>' : ''; list.innerHTML += `<div class="bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700 flex justify-between items-center shadow-sm"><div><p class="text-sm font-bold text-slate-800 dark:text-white">${data.nama} ${badge}</p><p class="text-xs text-amber-600 font-medium">${data.divisi}</p><p class="text-[10px] text-gray-400">${data.email}</p></div><button onclick="hapusKaryawan('${doc.id}', '${data.nama}')" class="text-gray-400 hover:text-red-500 transition"><i class="fa-solid fa-trash"></i></button></div>`; }); }); }
        window.hapusKaryawan = async (id, nama) => { if(confirm(`Yakin hapus ${nama} dari database?`)) { await deleteDoc(doc(db, "data_karyawan", id)); } }
        
        window.switchView = (viewName) => { document.getElementById('view-home').classList.add('hidden'); document.getElementById('view-games').classList.add('hidden'); document.getElementById('nav-home').classList.remove('active'); document.getElementById('nav-games').classList.remove('active'); document.getElementById(`view-${viewName}`).classList.remove('hidden'); document.getElementById(`nav-${viewName}`).classList.add('active'); };
        window.toggleDarkMode = () => { const html = document.documentElement; const icon = document.getElementById('icon-theme'); if (html.classList.contains('dark')) { html.classList.remove('dark'); localStorage.setItem('theme', 'light'); icon.className = 'fa-solid fa-moon'; } else { html.classList.add('dark'); localStorage.setItem('theme', 'dark'); icon.className = 'fa-solid fa-sun'; } };
        if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) { document.documentElement.classList.add('dark'); document.getElementById('icon-theme').className = 'fa-solid fa-sun'; }
        
        window.bukaGacha = () => document.getElementById('gacha-modal').classList.remove('hidden');
        window.putarGacha = () => { const foodList = ["Soto Ayam", "Nasi Padang", "Bakso Malang", "Mie Ayam", "Warteg", "Lalapan", "Gado-gado", "Nasi Goreng", "Penyetan", "Sate Ayam", "Seblak", "Mixue"]; const resultBox = document.getElementById('gacha-result'); const btn = document.getElementById('btn-spin'); btn.disabled = true; let counter = 0; const interval = setInterval(() => { resultBox.innerText = foodList[Math.floor(Math.random() * foodList.length)]; counter++; if (counter > 20) { clearInterval(interval); btn.disabled = false; resultBox.classList.add('scale-110'); setTimeout(() => resultBox.classList.remove('scale-110'), 200); } }, 100); };
        window.pilihMood = (mood) => { selectedMood = mood; document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected')); let btnId = ""; if(mood === '🔥') btnId = "mood-fire"; if(mood === '🙂') btnId = "mood-smile"; if(mood === '😴') btnId = "mood-sleep"; if(mood === '🤯') btnId = "mood-stress"; document.getElementById(btnId).classList.add('selected'); }
        window.loadPengumuman = () => { if (unsubscribePengumuman) unsubscribePengumuman(); const q = query(collection(db, "pengumuman"), orderBy("timestamp", "desc"), limit(5)); unsubscribePengumuman = onSnapshot(q, (snapshot) => { const container = document.getElementById('info-slider'); const section = document.getElementById('info-section'); container.innerHTML = ""; if(snapshot.empty) { section.classList.add('hidden'); } else { section.classList.remove('hidden'); snapshot.forEach(doc => { const data = doc.data(); const id = doc.id; let border = "border-l-4 border-blue-500"; let icon = "fa-circle-info text-blue-500"; if(data.tipe === "Penting") { border = "border-l-4 border-red-500"; icon="fa-triangle-exclamation text-red-500"; } if(data.tipe === "Event") { border = "border-l-4 border-green-500"; icon="fa-calendar-check text-green-500"; } let btnHapus = ""; if(userProfile && userProfile.role === 'admin') { btnHapus = `<button onclick="hapusPengumuman('${id}')" class="absolute top-2 right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-50 shadow-sm border border-red-100 z-10"><i class="fa-solid fa-trash text-[10px]"></i></button>`; } container.innerHTML += `<div class="snap-center shrink-0 w-72 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 ${border} flex flex-col justify-between relative group">${btnHapus}<div><div class="flex justify-between items-start mb-2"><div class="flex items-center gap-2"><i class="fa-solid ${icon}"></i><span class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">${data.tipe}</span></div><span class="text-[10px] text-gray-400 mr-4">${data.tanggal}</span></div><h4 class="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 leading-tight pr-4">${data.judul}</h4><p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${data.isi}</p></div><div class="mt-3 pt-2 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center"><span class="text-[10px] text-gray-400 italic">Oleh: ${data.penulis}</span></div></div>`; }); } }); };
        window.kirimPengumuman = async () => { const judul = document.getElementById('info-judul').value; const tipe = document.getElementById('info-tipe').value; const isi = document.getElementById('info-isi').value; if(!judul || !isi) return alert("Judul dan Isi wajib diisi!"); try { await addDoc(collection(db, "pengumuman"), { judul: judul, tipe: tipe, isi: isi, penulis: userProfile.nama, tanggal: new Date().toLocaleDateString('id-ID'), timestamp: new Date() }); alert("Diposting!"); document.getElementById('info-modal').classList.add('hidden'); } catch(e) { alert("Error: " + e.message); } }
        window.hapusPengumuman = async (id) => { if(!confirm("Yakin mau hapus pengumuman ini?")) return; try { await deleteDoc(doc(db, "pengumuman", id)); alert("Pengumuman dihapus!"); } catch(e) { alert("Gagal hapus: " + e.message); } }
        
        window.bukaProfile = () => { document.getElementById('profile-modal').classList.remove('hidden'); document.getElementById('preview-foto-profil').src = userProfile.photoURL || currentUser.photoURL; document.getElementById('edit-nama').value = userProfile.nama || ""; document.getElementById('edit-divisi').value = userProfile.divisi || ""; }
        window.tutupProfile = () => { document.getElementById('profile-modal').classList.add('hidden'); }
        window.previewImage = (input) => { if (input.files && input.files[0]) { const reader = new FileReader(); reader.onload = function(e) { const img = new Image(); img.src = e.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const maxWidth = 300; const scaleSize = maxWidth / img.width; canvas.width = maxWidth; canvas.height = img.height * scaleSize; ctx.drawImage(img, 0, 0, canvas.width, canvas.height); compressedProfileImage = canvas.toDataURL('image/jpeg', 0.7); document.getElementById('preview-foto-profil').src = compressedProfileImage; } }; reader.readAsDataURL(input.files[0]); } }
        window.updateProfileData = async () => { const finalPhoto = compressedProfileImage || userProfile.photoURL; try { const newData = { photoURL: finalPhoto }; await setDoc(doc(db, "users", currentUser.uid), newData, { merge: true }); userProfile.photoURL = finalPhoto; setupUI(); tutupProfile(); compressedProfileImage = ""; alert("Foto Profil Tersimpan!"); } catch (e) { alert("Gagal: " + e.message); } }
        
        window.bukaFoto = (src) => { document.getElementById('modal-img').src = src; document.getElementById('image-modal').classList.remove('hidden'); }
        window.tutupModal = () => { document.getElementById('image-modal').classList.add('hidden'); }
        
        window.downloadLaporan = async () => { if(userProfile.role !== "admin") { return alert("AKSES DITOLAK! Hanya HR/Admin yang boleh download data."); } let choice = prompt("Ketik '1' untuk Rekap HARI INI\nKetik '2' untuk SEMUA DATA", "1"); if (!choice) return; let q; const today = new Date().toLocaleDateString('id-ID'); if (choice === "1") { q = query(collection(db, "absensi"), where("tanggal", "==", today), orderBy("timestamp", "desc")); } else if (choice === "2") { q = query(collection(db, "absensi"), orderBy("timestamp", "desc")); } else { return; } try { const snap = await getDocs(q); if (snap.empty) { return alert(`Data kosong, Jon! \n(Tanggal dicari: ${today})`); } let csv = "data:text/csv;charset=utf-8,Tanggal,Jam,Nama,Divisi,Kategori,Status,Mood,Keterangan,Lokasi,Koordinat\n"; snap.forEach(d => { const data = d.data(); const safeKet = data.keterangan ? data.keterangan.replace(/,/g, " ") : "-"; const safeLokasi = data.lokasi ? data.lokasi.replace(/,/g, " - ") : "Lokasi tidak terdeteksi"; const mood = data.mood || "-"; csv += `${data.tanggal},${data.waktu},"${data.nama}","${data.divisi}","${data.kategori}","${data.status}","${mood}","${safeKet}","${safeLokasi}","${data.koordinat}"\n`; }); const link = document.createElement("a"); link.href = encodeURI(csv); const namaFile = (choice === "1") ? `Rekap_Harian_${today.replace(/\//g, "-")}.csv` : `Rekap_Full_Database.csv`; link.download = namaFile; document.body.appendChild(link); link.click(); document.body.removeChild(link); } catch (error) { console.error("ERROR FIREBASE:", error); alert("Error: " + error.message); } };
        setInterval(() => { const c = document.getElementById('clock-display'); if(c) c.innerText = new Date().toLocaleTimeString('id-ID'); }, 1000);

        window.toggleMenu = () => { const menu = document.getElementById('main-menu-dropdown'); if (menu.classList.contains('hidden')) { menu.classList.remove('hidden'); menu.classList.add('fade-in'); } else { menu.classList.add('hidden'); } };
        document.addEventListener('click', (e) => { const menu = document.getElementById('main-menu-dropdown'); const toggleBtn = document.querySelector('button[onclick="toggleMenu()"]'); if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && !toggleBtn.contains(e.target)) { menu.classList.add('hidden'); } });

        // LOGIKA GAMES
        window.bukaKhodam = () => { document.getElementById('khodam-modal').classList.remove('hidden'); document.getElementById('input-nama-khodam').value = userProfile.nama || ""; document.getElementById('khodam-result-box').classList.add('hidden'); document.getElementById('btn-check-khodam').classList.remove('hidden'); };
        window.prosesKhodam = () => { const nama = document.getElementById('input-nama-khodam').value; if(!nama) return alert("Isi nama dulu dong!"); const btn = document.getElementById('btn-check-khodam'); btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> MENERAWANG...`; btn.disabled = true; setTimeout(() => { const acak = Math.floor(Math.random() * listKhodam.length); const hasil = listKhodam[acak]; document.getElementById('khodam-result').innerText = hasil.nama; document.getElementById('khodam-desc').innerText = `"${hasil.desc}"`; document.getElementById('khodam-result-box').classList.remove('hidden'); document.getElementById('khodam-result-box').classList.add('element-shake'); btn.classList.add('hidden'); btn.innerHTML = `<i class="fa-solid fa-eye mr-2"></i> TERAWANG SEKARANG`; btn.disabled = false; setTimeout(() => document.getElementById('khodam-result-box').classList.remove('element-shake'), 500); setTimeout(() => { btn.innerHTML = "MAIN LAGI?"; btn.classList.remove('hidden'); }, 3000); }, 2000); };
        
        window.bukaLeaderboard = async () => { document.getElementById('leaderboard-modal').classList.remove('hidden'); const list = document.getElementById('leaderboard-list'); list.innerHTML = `<div class="text-center py-10"><i class="fa-solid fa-spinner fa-spin text-3xl text-amber-500"></i><p class="text-xs text-gray-400 mt-2">Mencari yang paling rajin...</p></div>`; const today = new Date().toLocaleDateString('id-ID'); try { const q = query( collection(db, "absensi"), where("tanggal", "==", today), where("kategori", "==", "Masuk"), orderBy("timestamp", "asc"), limit(10) ); const snap = await getDocs(q); list.innerHTML = ""; if (snap.empty) { list.innerHTML = `<div class="text-center py-10 text-gray-400 italic">Belum ada yang absen hari ini.<br>Jadilah yang pertama! 🚀</div>`; return; } let rank = 1; snap.forEach(doc => { const data = doc.data(); let rankStyle = "bg-white dark:bg-slate-700/50 border-gray-100 dark:border-slate-700"; let trophy = `<span class="font-black text-gray-300 w-8 text-center text-lg italic">#${rank}</span>`; let textName = "text-slate-700 dark:text-slate-200"; if(rank === 1) { rankStyle = "bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40 border-amber-300 shadow-md transform scale-105"; trophy = "<span class='text-2xl w-8 text-center'>🥇</span>"; textName = "text-amber-700 dark:text-amber-400"; } else if(rank === 2) { rankStyle = "bg-gray-100 dark:bg-slate-700 border-gray-300"; trophy = "<span class='text-xl w-8 text-center'>🥈</span>"; } else if(rank === 3) { rankStyle = "bg-orange-50 dark:bg-orange-900/20 border-orange-200"; trophy = "<span class='text-xl w-8 text-center'>🥉</span>"; } list.innerHTML += ` <div class="flex items-center gap-3 p-3 mb-2 rounded-xl border ${rankStyle} transition hover:scale-[1.02]"> ${trophy} <img src="${data.foto_profil || 'icon.png'}" class="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-600 shadow-sm"> <div class="flex-1 min-w-0"> <h4 class="font-bold text-sm ${textName} truncate leading-tight">${data.nama}</h4> <div class="flex items-center gap-2 mt-0.5"> <span class="text-[10px] font-mono bg-slate-900 text-white px-1.5 rounded">${data.waktu}</span> <span class="text-[9px] text-gray-500 dark:text-gray-400 truncate">${data.divisi}</span> </div> </div> </div>`; rank++; }); } catch (e) { list.innerHTML = `<div class="p-4 bg-red-100 text-red-600 text-xs rounded-xl border border-red-200"><p class="font-bold mb-1"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Index Firebase diperlukan</p></div>`; } };
