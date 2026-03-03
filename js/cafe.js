import { db } from './firebase-core.js';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, deleteDoc, updateDoc, getDocs, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

        let cartCafe = []; 
        let itemDitahan = null; 
        window.scannerMode = 'employee';
        
        // --- VARIABLE BARU BUAT MENFESS PRIVATE ---
        let currentMenfessTab = 'public';
        let listKaryawanMenfess = [];

        // --- FITUR NOTIFIKASI VISUAL (TOAST) ---
        window.tampilkanToastNotif = (pesan) => {
            const toast = document.createElement('div');
            // Styling pakai Tailwind: Melayang di kanan atas, warna orange, ada shadow
            toast.className = "fixed top-6 right-6 z-[9999] bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-orange-500/30 font-bold transform transition-all duration-300 translate-x-[150%] border-2 border-white/20 flex items-center gap-3";
            toast.innerHTML = `<div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-bounce"><i class="fa-solid fa-bell-concierge"></i></div> <span>${pesan}</span>`;
            
            document.body.appendChild(toast);

            // Animasi masuk layar
            setTimeout(() => toast.classList.remove('translate-x-[150%]'), 100);

            // Otomatis hilang setelah 5 detik
            setTimeout(() => {
                toast.classList.add('translate-x-[150%]');
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        };
        // --- BATAS NOTIFIKASI ---
// --- FITUR NOTIFIKASI VISUAL MENFESS (TOAST PINK) ---
        window.tampilkanToastMenfess = (pesan) => {
            const toast = document.createElement('div');
            // Warna pink, ikon hati, dan agak diturunin dikit posisinya (top-24) biar ga numpuk kalau barengan sama notif cafe
            toast.className = "fixed top-24 right-6 z-[9999] bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-pink-500/30 font-bold transform transition-all duration-300 translate-x-[150%] border-2 border-white/20 flex items-center gap-3";
            toast.innerHTML = `<div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-bounce"><i class="fa-solid fa-heart"></i></div> <span>${pesan}</span>`;
            
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.remove('translate-x-[150%]'), 100);
            setTimeout(() => {
                toast.classList.add('translate-x-[150%]');
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        };

        // Suara notif pop ringan buat pesan
        const notifSoundMenfess = new Audio('Menfess - notification.mp3');
        let unsubscribeNotifMenfess = null;

        // Fungsi buat mantau Kotak Masuk (Private Menfess) secara Real-Time
        window.initNotifMenfessPrivate = () => {
            if(!currentUser || !currentUser.email) return;
            
            const q = query(collection(db, "menfess_private"), where("targetEmail", "==", currentUser.email));
            let isInitialLoadMenfess = true; 
            
            if(unsubscribeNotifMenfess) unsubscribeNotifMenfess();
            
            unsubscribeNotifMenfess = onSnapshot(q, (snap) => {
                if (!isInitialLoadMenfess) {
                    snap.docChanges().forEach((change) => {
                        if (change.type === "added") {
                            const msg = change.doc.data();
                            notifSoundMenfess.play().catch(e => console.log("Auto-play diblokir"));
                            
                            // Cek apakah pengirim anonim atau pakai nama asli
                            const pengirim = msg.isAnon ? "Seseorang Misterius 👻" : msg.pengirim;
                            tampilkanToastMenfess(`Ada pesan rahasia dari ${pengirim}!`);
                        }
                    });
                }
                isInitialLoadMenfess = false;
            });
        };
        // --- BATAS NOTIFIKASI MENFESS ---

        window.loginGoogle = () => {
            const btnText = document.getElementById('btn-login-text');
            if(btnText) btnText.innerText = "Memeriksa Google...";
            signInWithPopup(auth, provider).catch(e => {
                alert("Gagal Login: " + e.message);
                if(btnText) btnText.innerText = "Masuk dengan Google";
            });
        };

        window.logoutGoogle = () => { if(confirm("Yakin ingin keluar?")) signOut(auth); };

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const btnText = document.getElementById('btn-login-text');
                if(btnText) btnText.innerText = "Memeriksa Karyawan...";
                try {
                    const q = query(collection(db, "data_karyawan"), where("email", "==", user.email)); 
                    const querySnapshot = await getDocs(q);
                    
                    if (!querySnapshot.empty) {
                        if(btnText) btnText.innerText = "Memuat Profil...";
                        let employeeData = {}; 
                        querySnapshot.forEach((doc) => { employeeData = doc.data(); });
                        let customPhoto = user.photoURL; 
                        try {
                            const userDoc = await getDoc(doc(db, "users", user.uid));
                            if(userDoc.exists() && userDoc.data().photoURL) { customPhoto = userDoc.data().photoURL; }
                        } catch(e) {}
                        
                        currentUser = user; 
                        userProfile = { ...employeeData, photoURL: customPhoto, uid: user.uid };
                        try { await setDoc(doc(db, "users", user.uid), userProfile, { merge: true }); } catch(e) {}
                        
                        setupUI();
                    } else { 
                        await signOut(auth); 
                        if(btnText) btnText.innerText = "Masuk dengan Google";
                        const errMsg = document.getElementById('login-error');
                        if(errMsg) {
                            errMsg.innerText = `Email ${user.email} tidak terdaftar di database kantor!`; 
                            errMsg.classList.remove('hidden'); 
                        }
                    }
                } catch(e) { 
                    if(btnText) btnText.innerText = "Masuk dengan Google"; 
                    alert("Gagal koneksi database. Error: " + e.message); 
                }
            } else { 
                currentUser = null; 
                try {
                    document.getElementById('login-screen').classList.remove('hidden'); 
                    document.getElementById('app-screen').classList.add('hidden');
                    document.getElementById('app-screen').style.display = 'none';
                } catch(e){} 
            }
        });

        function setupUI() { 
            try { 
                document.getElementById('login-screen').classList.add('hidden'); 
                const appScreen = document.getElementById('app-screen');
                appScreen.classList.remove('hidden'); 
                appScreen.style.display = 'flex';
            } catch(e){ console.error("Error ganti layar:", e); }

            try { renderHeader(); } catch(e){}
            try { if(userProfile.role === 'admin') { document.getElementById('btn-add-info').classList.remove('hidden'); document.getElementById('btn-scan-qr').classList.remove('hidden'); document.getElementById('btn-admin-panel').classList.remove('hidden'); document.getElementById('badge-admin').classList.remove('hidden'); loadDaftarKaryawan(); } } catch(e){}
            try { if(userProfile.role === 'admin' || userProfile.divisi === 'IT/Minebi' || userProfile.divisi === 'HR/Admin') { document.getElementById('btn-aset').classList.remove('hidden'); } } catch(e){}
            try { aturForm(); } catch(e){} 
            try { loadRiwayatData(); } catch(e){} 
            try { loadPengumuman(); } catch(e){} 
            
            // ↓↓ TAMBAHIN BARIS INI ↓↓
            try { initNotifMenfessPrivate(); } catch(e){} 
        }

        function renderHeader() { 
            document.getElementById('user-photo').src = userProfile.photoURL || 'icon.png'; 
            document.getElementById('user-name-display').innerText = userProfile.nama || "Loading..."; 
            document.getElementById('user-divisi-display').innerText = userProfile.divisi || "Karyawan"; 

            try {
                if(userProfile) {
                    document.getElementById('idcard-foto').src = userProfile.photoURL || 'icon.png';
                    document.getElementById('idcard-nama').innerText = userProfile.nama || "Tidak Dikenal";
                    document.getElementById('idcard-divisi').innerText = userProfile.divisi || "Karyawan";
                    document.getElementById('idcard-uid').innerText = userProfile.uid || "UID-UNKNOWN";
                    document.getElementById('idcard-qr').src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + (userProfile.uid || 'MoccaStudio');
                }
            } catch(e) { console.log("Gagal memuat data ID Card:", e); }
        }

        // --- LOGIKA MENFESS BARU (PRIVATE & PUBLIK) ---
        window.bukaMenfess = async () => { 
            document.getElementById('menfess-modal').classList.remove('hidden'); 
            
            // Tarik data karyawan untuk dropdown kalo belum ditarik
            if(listKaryawanMenfess.length === 0) {
                try {
                    const qUsers = query(collection(db, "data_karyawan"), orderBy("nama", "asc"));
                    const snapUsers = await getDocs(qUsers);
                    const selectTarget = document.getElementById('menfess-target-user');
                    let options = `<option value="public">🌍 Ke Publik</option>`;
                    snapUsers.forEach(doc => {
                        const d = doc.data();
                        if(d.email && d.email !== currentUser.email) { // Ga bisa ngirim rahasia ke diri sendiri
                            options += `<option value="${d.email}">🔒 ${d.nama}</option>`;
                        }
                    });
                    selectTarget.innerHTML = options;
                    listKaryawanMenfess = snapUsers.docs;
                } catch(e) { console.log("Gagal narik data teman:", e); }
            }
            switchMenfessTab('public');
        };

        window.switchMenfessTab = (tab) => {
            currentMenfessTab = tab;
            const btnPub = document.getElementById('tab-menfess-public');
            const btnPriv = document.getElementById('tab-menfess-private');
            
            if(tab === 'public') {
                btnPub.className = "flex-1 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 rounded-md shadow-sm text-pink-600 transition";
                btnPriv.className = "flex-1 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-pink-500 transition";
            } else {
                btnPriv.className = "flex-1 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 rounded-md shadow-sm text-pink-600 transition";
                btnPub.className = "flex-1 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-pink-500 transition";
            }
            loadPesanMenfess();
        };

        window.loadPesanMenfess = () => {
            if(unsubscribeMenfess) unsubscribeMenfess(); 
            const container = document.getElementById('menfess-container'); 
            container.innerHTML = `<div class="text-center py-10 text-gray-400 text-xs italic"><i class="fa-solid fa-spinner fa-spin"></i> Memuat pesan...</div>`;
            
            if(currentMenfessTab === 'public') {
                // LOAD PESAN PUBLIK KAYA BIASA
                const q = query(collection(db, "menfess"), orderBy("timestamp", "asc"), limit(100)); 
                unsubscribeMenfess = onSnapshot(q, (snap) => { 
                    container.innerHTML = ""; 
                    if(snap.empty) { container.innerHTML = `<div class="text-center text-gray-400 text-xs italic py-10">Belum ada pesan publik. Mulai duluan yuk!</div>`; return; } 
                    
                    snap.forEach(doc => { 
                        const data = doc.data(); 
                        const isMe = data.uid === currentUser.uid; 
                        const bubbleClass = isMe ? "me" : "other"; 
                        const senderName = data.isAnon ? "Seseorang Misterius 👻" : data.pengirim; 
                        container.innerHTML += `<div class="menfess-bubble ${bubbleClass} fade-in"><p class="text-[10px] font-bold opacity-70 mb-1">${senderName}</p><p class="text-sm leading-snug">${data.pesan}</p><p class="text-[9px] opacity-50 text-right mt-1">${data.waktu}</p></div>`; 
                    }); 
                    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 150);
                }); 
            } else {
                // LOAD PESAN PRIVATE (DIKIRIM KE EMAIL USER SAAT INI)
                const q = query(collection(db, "menfess_private"), where("targetEmail", "==", currentUser.email));
                unsubscribeMenfess = onSnapshot(q, (snap) => {
                    container.innerHTML = "";
                    if(snap.empty) { container.innerHTML = `<div class="text-center text-gray-400 text-xs italic py-10">Kotak masuk kosong.<br>Belum ada pesan rahasia untukmu. 🙈</div>`; return; }
                    
                    let msgs = [];
                    snap.forEach(doc => msgs.push(doc.data()));
                    // Urutkan manual biar nggak pusing setting Index Firebase
                    msgs.sort((a,b) => {
                        let tA = a.timestamp?.seconds ? a.timestamp.seconds : 0;
                        let tB = b.timestamp?.seconds ? b.timestamp.seconds : 0;
                        return tA - tB; 
                    });

                    msgs.forEach(data => {
                        const bubbleClass = "other"; // Anggap aja selalu nerima dari 'orang lain'
                        const senderName = data.isAnon ? "Seseorang Misterius 👻" : data.pengirim; 
                        container.innerHTML += `<div class="menfess-bubble ${bubbleClass} fade-in border-l-4 border-pink-500 shadow-md"><p class="text-[10px] font-bold opacity-70 mb-1">${senderName} <span class="bg-pink-100 text-pink-600 px-1 rounded ml-1">Private</span></p><p class="text-sm leading-snug">${data.pesan}</p><p class="text-[9px] opacity-50 text-right mt-1">${data.waktu}</p></div>`; 
                    });
                    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 150);
                });
            }
        };

        window.kirimMenfess = async () => { 
            const input = document.getElementById('menfess-input'); 
            const pesan = input.value.trim(); 
            const isAnon = document.getElementById('menfess-anon').checked; 
            const target = document.getElementById('menfess-target-user').value;

            if(!pesan) return; 
            const btn = document.getElementById('btn-kirim-menfess'); btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`; btn.disabled = true;
            
            try { 
                if(target === 'public') {
                    // Masukin ke database publik
                    await addDoc(collection(db, "menfess"), { pengirim: userProfile.nama, uid: currentUser.uid, pesan: pesan, isAnon: isAnon, waktu: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}), timestamp: new Date() }); 
                } else {
                    // Masukin ke database private
                    await addDoc(collection(db, "menfess_private"), { pengirim: userProfile.nama, uid: currentUser.uid, targetEmail: target, pesan: pesan, isAnon: isAnon, waktu: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}), timestamp: new Date() }); 
                    alert("Pesan Private berhasil meluncur secara " + (isAnon ? "Anonim!" : "Terbuka!"));
                    if(currentMenfessTab === 'private') switchMenfessTab('public'); // Balikin ke publik biar layar ngerender ulang
                }
                input.value = ""; 
            } catch(e) { alert("Gagal kirim: " + e.message); } finally { btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i>`; btn.disabled = false; }
        };

        // --- FITUR SEARCH MENFESS ---
        window.filterUserMenfess = () => {
            const keyword = document.getElementById('search-menfess-user').value.toLowerCase();
            const selectTarget = document.getElementById('menfess-target-user');
            const currentSelected = selectTarget.value; 
            let options = `<option value="public">🌍 Ke Publik</option>`;
            listKaryawanMenfess.forEach(doc => {
                const d = doc.data();
                if(d.email && currentUser && d.email !== currentUser.email) {
                    if(d.nama.toLowerCase().includes(keyword)) {
                        options += `<option value="${d.email}">🔒 ${d.nama}</option>`;
                    }
                }
            });
            selectTarget.innerHTML = options;
            if (selectTarget.querySelector(`option[value="${currentSelected}"]`)) {
                selectTarget.value = currentSelected;
            }
        };

        // --- FUNGSI GUDANG ASET ---
        window.bukaInventaris = () => { document.getElementById('inventaris-modal').classList.remove('hidden'); switchAsetTab('dipinjam'); loadPeminjaman(); };
        window.switchAsetTab = (tab) => { document.getElementById('tab-aset-dipinjam').className = "flex-1 py-1.5 text-xs font-bold text-gray-500 hover:text-blue-500 dark:text-gray-400 transition"; document.getElementById('tab-aset-riwayat').className = "flex-1 py-1.5 text-xs font-bold text-gray-500 hover:text-blue-500 dark:text-gray-400 transition"; document.getElementById('list-peminjaman').classList.add('hidden'); document.getElementById('list-riwayat-aset').classList.add('hidden'); if(tab === 'dipinjam') { document.getElementById('tab-aset-dipinjam').className = "flex-1 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 rounded-md shadow-sm text-blue-600 transition"; document.getElementById('list-peminjaman').classList.remove('hidden'); } else { document.getElementById('tab-aset-riwayat').className = "flex-1 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 rounded-md shadow-sm text-blue-600 transition"; document.getElementById('list-riwayat-aset').classList.remove('hidden'); } };
        window.pinjamBarang = async () => { const peminjam = document.getElementById('inv-peminjam').value.trim(); const barang = document.getElementById('inv-nama-barang').value.trim(); const perlu = document.getElementById('inv-keperluan').value.trim(); if(!peminjam || !barang || !perlu) return alert("Isi nama peminjam, nama barang & keperluan!"); const btn = document.getElementById('btn-catat-pinjam'); const oldText = btn.innerText; btn.innerText = "Mencatat..."; btn.disabled = true; try { await addDoc(collection(db, "inventory_logs"), { peminjam: peminjam, barang: barang, keperluan: perlu, status: "Dipinjam", dicatat_oleh: userProfile.nama, tanggal_pinjam: new Date().toLocaleString('id-ID'), timestamp: new Date() }); alert("Peminjaman berhasil dicatat!"); document.getElementById('inv-peminjam').value = ""; document.getElementById('inv-nama-barang').value = ""; document.getElementById('inv-keperluan').value = ""; switchAsetTab('dipinjam'); } catch(e) { alert("Error Database: " + e.message); } finally { btn.innerText = oldText; btn.disabled = false; } };
        function loadPeminjaman() { const q = query(collection(db, "inventory_logs"), orderBy("timestamp", "desc"), limit(50)); onSnapshot(q, (snap) => { const listDipinjam = document.getElementById('list-peminjaman'); const listRiwayat = document.getElementById('list-riwayat-aset'); listDipinjam.innerHTML = ""; listRiwayat.innerHTML = ""; let adaPinjaman = false; let adaRiwayat = false; snap.forEach(doc => { const data = doc.data(); if(data.status === "Dipinjam") { adaPinjaman = true; listDipinjam.innerHTML += `<div class="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-700 flex justify-between items-center mb-2 shadow-sm fade-in"><div class="flex-1 pr-2"><p class="font-bold text-sm text-slate-800 dark:text-white leading-tight">${data.barang}</p><p class="text-[10px] text-gray-500 mt-1">Peminjam: <span class="font-bold text-blue-500">${data.peminjam}</span></p><p class="text-[9px] text-gray-400">Keperluan: ${data.keperluan}</p></div><button onclick="kembalikanBarang('${doc.id}')" class="bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 px-3 py-2 rounded-lg text-[10px] font-black transition active:scale-95 text-center flex flex-col items-center"><i class="fa-solid fa-arrow-rotate-left mb-1"></i>KEMBALI</button></div>`; } else if (data.status === "Dikembalikan") { adaRiwayat = true; listRiwayat.innerHTML += `<div class="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-700 flex justify-between items-center mb-2 shadow-sm opacity-70"><div class="flex-1 pr-2"><p class="font-bold text-sm text-slate-800 dark:text-white leading-tight line-through">${data.barang}</p><p class="text-[10px] text-gray-500 mt-1">Peminjam: ${data.peminjam}</p><p class="text-[9px] text-green-600 font-bold mt-0.5"><i class="fa-solid fa-check-circle"></i> Dikembalikan: ${data.tanggal_kembali}</p></div></div>`; } }); if(!adaPinjaman) listDipinjam.innerHTML = `<div class="text-center italic text-gray-400 py-4">Semua aset aman di gudang.</div>`; if(!adaRiwayat) listRiwayat.innerHTML = `<div class="text-center italic text-gray-400 py-4">Belum ada riwayat pengembalian.</div>`; }); }
        window.kembalikanBarang = async (id) => { if(!confirm("Yakin barang sudah dikembalikan dan dicek kondisinya?")) return; try { await updateDoc(doc(db, "inventory_logs", id), { status: "Dikembalikan", tanggal_kembali: new Date().toLocaleString('id-ID') }); alert("Barang berhasil dikembalikan ke Gudang!"); } catch(e) { alert("Error: " + e.message); } };



        // --- FUNGSI SCANNER (MULTI-FUNGSI) ---
        window.bukaScanner = async () => { document.getElementById('scanner-modal').classList.remove('hidden'); if (!html5QrCode) { html5QrCode = new Html5Qrcode("reader"); } const config = { fps: 10, qrbox: { width: 250, height: 250 } }; try { await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure); } catch (err) { alert("Gagal membuka kamera: " + err); tutupScanner(); } }
        window.tutupScanner = async () => { document.getElementById('scanner-modal').classList.add('hidden'); if (html5QrCode) { try { await html5QrCode.stop(); html5QrCode.clear(); html5QrCode = null; } catch (e) { console.log("Kamera mati"); } } }
        async function onScanSuccess(decodedText, decodedResult) { await tutupScanner(); if (scannerMode === 'asset') { document.getElementById('inv-nama-barang').value = decodedText; alert("QR Terbaca: " + decodedText); } else { const targetUID = decodedText; try { const docRef = doc(db, "users", targetUID); const docSnap = await getDoc(docRef); if (docSnap.exists()) { const userData = docSnap.data(); document.getElementById('scan-nama').innerText = userData.nama; document.getElementById('scan-divisi').innerText = userData.divisi; document.getElementById('scan-foto').src = userData.photoURL || 'icon.png'; document.getElementById('scan-tgl').innerText = userData.tgl_lahir || '-'; document.getElementById('scan-email').innerText = userData.email || '-'; document.getElementById('scan-header').className = "bg-green-500 p-6 text-center text-white"; document.getElementById('scan-header').innerHTML = `<div class="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center text-3xl mb-2 text-green-500 shadow-lg animate-bounce"><i class="fa-solid fa-check"></i></div><h2 class="text-2xl font-black">VERIFIED!</h2><p class="text-green-100 text-xs font-bold tracking-widest uppercase">Karyawan Terdaftar</p>`; document.getElementById('scan-result-modal').classList.remove('hidden'); } else { document.getElementById('scan-nama').innerText = "Tidak Dikenal"; document.getElementById('scan-header').className = "bg-red-500 p-6 text-center text-white"; document.getElementById('scan-header').innerHTML = `<div class="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center text-3xl mb-2 text-red-500 shadow-lg"><i class="fa-solid fa-xmark"></i></div><h2 class="text-2xl font-black">INVALID!</h2>`; document.getElementById('scan-result-modal').classList.remove('hidden'); } } catch (e) { alert("Error Database: " + e.message); } } }
        function onScanFailure(error) {}

        // --- FUNGSI QUEST ---
        window.bukaQuest = () => { document.getElementById('quest-modal').classList.remove('hidden'); const today = new Date().toLocaleDateString('id-ID').replace(/\//g, '-'); const q = query(collection(db, `daily_quests/${today}/${currentUser.uid}`), orderBy("timestamp", "asc")); if(unsubscribeQuest) unsubscribeQuest(); unsubscribeQuest = onSnapshot(q, (snap) => { const list = document.getElementById('list-quest'); list.innerHTML = ""; if(snap.empty) list.innerHTML = `<p class="text-center text-xs text-gray-400 italic mt-4">Belum ada target hari ini.</p>`; snap.forEach(doc => { const data = doc.data(); const statusClass = data.completed ? "completed bg-green-50 border-green-200 dark:bg-green-900/20" : "bg-white border-gray-200 dark:bg-slate-700 dark:border-slate-600"; const checked = data.completed ? "checked" : ""; list.innerHTML += `<div class="quest-item flex items-center gap-3 p-3 rounded-xl border ${statusClass} shadow-sm transition"><input type="checkbox" onchange="toggleQuest('${doc.id}', this.checked)" class="quest-checkbox w-5 h-5 rounded border-gray-300 text-green-500 focus:ring-green-500 cursor-pointer" ${checked}><span class="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">${data.task}</span><button onclick="hapusQuest('${doc.id}')" class="text-gray-300 hover:text-red-500 transition"><i class="fa-solid fa-trash"></i></button></div>`; }); }); };
        window.tambahQuest = async () => { const task = document.getElementById('input-quest').value.trim(); if(!task) return; const today = new Date().toLocaleDateString('id-ID').replace(/\//g, '-'); try { await addDoc(collection(db, `daily_quests/${today}/${currentUser.uid}`), { task: task, completed: false, timestamp: new Date() }); document.getElementById('input-quest').value = ""; } catch(e) { alert("Error: " + e.message); } };
        window.toggleQuest = async (id, status) => { const today = new Date().toLocaleDateString('id-ID').replace(/\//g, '-'); await updateDoc(doc(db, `daily_quests/${today}/${currentUser.uid}`, id), { completed: status }); };
        window.hapusQuest = async (id) => { if(!confirm("Hapus target ini?")) return; const today = new Date().toLocaleDateString('id-ID').replace(/\//g, '-'); await deleteDoc(doc(db, `daily_quests/${today}/${currentUser.uid}`, id)); };

        // --- FUNGSI CAFE ---
        window.bukaCafe = () => { document.getElementById('cafe-modal').classList.remove('hidden'); switchCafeView('menu'); if(userProfile.role === 'admin' || userProfile.divisi === 'Cafe/Kitchen' || userProfile.divisi === 'HR/Admin') { document.getElementById('btn-manage-cafe').classList.remove('hidden'); document.getElementById('btn-live-orders').classList.remove('hidden'); loadLiveOrders(true); } loadMenuCafeDariDatabase(); updateKeranjangUI(); };
        window.tutupCafe = () => { document.getElementById('cafe-modal').classList.add('hidden'); };
        window.switchCafeView = (view) => { document.getElementById('cafe-view-menu').classList.add('hidden'); document.getElementById('cafe-view-cart').classList.add('hidden'); document.getElementById('cafe-view-manage').classList.add('hidden'); document.getElementById('cafe-view-orders').classList.add('hidden'); document.getElementById('cart-floating-bar').classList.add('hidden'); if(view === 'menu') { document.getElementById('cafe-view-menu').classList.remove('hidden'); if(cartCafe.length > 0) document.getElementById('cart-floating-bar').classList.remove('hidden'); } else if(view === 'cart') { document.getElementById('cafe-view-cart').classList.remove('hidden'); renderIsiKeranjang(); } else if(view === 'manage') { document.getElementById('cafe-view-manage').classList.remove('hidden'); } else if(view === 'orders') { document.getElementById('cafe-view-orders').classList.remove('hidden'); loadLiveOrders(false); } };
        window.loadMenuCafeDariDatabase = () => { const q = query(collection(db, "cafe_menus"), orderBy("nama", "asc")); onSnapshot(q, (snap) => { const list = document.getElementById('menu-cafe-list'); const listManage = document.getElementById('manage-cafe-list'); list.innerHTML = ""; listManage.innerHTML = ""; if(snap.empty) { list.innerHTML = `<div class="col-span-2 text-center text-xs text-gray-400 py-4">Menu belum ditambahkan.</div>`; return; } snap.forEach(doc => { const d = doc.data(); const id = doc.id; const isHabis = d.isHabis || false; const cardStyle = isHabis ? "opacity-50 grayscale" : "cursor-pointer hover:bg-orange-50 dark:hover:bg-slate-800 transition active:scale-95"; const clickEvent = isHabis ? "" : `onclick="bukaPopupItem('${id}', '${d.nama}', ${d.harga}, '${d.emoji}')"`; const labelHarga = isHabis ? `<span class="text-red-500 font-black tracking-widest uppercase">HABIS</span>` : `Rp ${d.harga.toLocaleString('id-ID')}`; list.innerHTML += `<div ${clickEvent} class="bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-700 text-center flex flex-col justify-between h-full ${cardStyle}"><div><div class="text-4xl mb-2">${d.emoji}</div><h4 class="font-bold text-xs text-slate-700 dark:text-white leading-tight mb-1">${d.nama}</h4></div><p class="text-[10px] text-orange-500 font-bold bg-orange-100 dark:bg-orange-900/30 rounded py-1 mt-2">${labelHarga}</p></div>`; const btnHabisTxt = isHabis ? "Tersedia" : "Habis"; const btnHabisClass = isHabis ? "text-green-500 bg-green-50 hover:bg-green-100" : "text-orange-500 bg-orange-50 hover:bg-orange-100"; listManage.innerHTML += `<div class="flex justify-between items-center bg-gray-50 dark:bg-slate-900 p-2 rounded-lg border border-gray-200 dark:border-slate-700 mb-2"><div class="flex items-center gap-3"><span class="text-2xl ${isHabis ? 'grayscale opacity-50' : ''}">${d.emoji}</span><div><p class="text-xs font-bold text-slate-700 dark:text-white ${isHabis ? 'line-through opacity-50' : ''}">${d.nama}</p><p class="text-[10px] text-orange-500 font-bold">Rp ${d.harga.toLocaleString('id-ID')}</p></div></div><div class="flex gap-1"><button onclick="toggleMenuHabis('${id}', ${isHabis})" class="${btnHabisClass} px-2 py-1.5 rounded-lg text-[9px] font-bold transition">${btnHabisTxt}</button><button onclick="hapusMenuCafe('${id}', '${d.nama}')" class="text-red-500 hover:text-red-600 px-2 py-1.5 bg-red-50 rounded-lg transition"><i class="fa-solid fa-trash"></i></button></div></div>`; }); }); };
        window.tambahMenuCafe = async () => { const nama = document.getElementById('add-menu-nama').value.trim(); const harga = document.getElementById('add-menu-harga').value; const emoji = document.getElementById('add-menu-emoji').value.trim() || "☕"; if(!nama || !harga) return alert("Nama dan Harga wajib diisi!"); try { await addDoc(collection(db, "cafe_menus"), { nama: nama, harga: parseInt(harga), emoji: emoji, isHabis: false, timestamp: new Date() }); document.getElementById('add-menu-nama').value = ""; document.getElementById('add-menu-harga').value = ""; document.getElementById('add-menu-emoji').value = ""; } catch(e) { alert("Error: " + e.message); } };
        window.hapusMenuCafe = async (id, nama) => { if(!confirm(`Yakin hapus menu: ${nama}?`)) return; try { await deleteDoc(doc(db, "cafe_menus", id)); } catch(e) { alert("Error: " + e.message); } };
        window.toggleMenuHabis = async (id, currentStatus) => { try { await updateDoc(doc(db, "cafe_menus", id), { isHabis: !currentStatus }); } catch(e) { alert("Error update status: " + e.message); } };
        window.bukaPopupItem = (id, nama, harga, emoji) => { itemDitahan = { id, nama, harga, emoji, qty: 1 }; document.getElementById('popup-item-emoji').innerText = emoji; document.getElementById('popup-item-nama').innerText = nama; document.getElementById('popup-item-harga').innerText = harga.toLocaleString('id-ID'); document.getElementById('popup-item-qty').innerText = "1"; document.getElementById('popup-item-note').value = ""; document.getElementById('cafe-item-popup').classList.remove('hidden'); };
        window.tutupPopupItem = () => { document.getElementById('cafe-item-popup').classList.add('hidden'); };
        window.ubahQty = (nilai) => { if(!itemDitahan) return; let qty = itemDitahan.qty + nilai; if(qty < 1) qty = 1; itemDitahan.qty = qty; document.getElementById('popup-item-qty').innerText = qty; document.getElementById('popup-item-harga').innerText = (itemDitahan.harga * qty).toLocaleString('id-ID'); };
        window.masukkanKeKeranjang = () => { if(!itemDitahan) return; const note = document.getElementById('popup-item-note').value.trim(); const existingIndex = cartCafe.findIndex(i => i.id === itemDitahan.id && i.note === note); if(existingIndex > -1) { cartCafe[existingIndex].qty += itemDitahan.qty; } else { cartCafe.push({ ...itemDitahan, note }); } tutupPopupItem(); updateKeranjangUI(); };
        window.updateKeranjangUI = () => { const bar = document.getElementById('cart-floating-bar'); if(cartCafe.length === 0) { bar.classList.add('hidden'); if(!document.getElementById('cafe-view-cart').classList.contains('hidden')) { switchCafeView('menu'); } return; } let totalQty = 0; let totalPrice = 0; cartCafe.forEach(i => { totalQty += i.qty; totalPrice += (i.harga * i.qty); }); if(!document.getElementById('cafe-view-menu').classList.contains('hidden')) { bar.classList.remove('hidden'); } document.getElementById('cart-item-count').innerText = `${totalQty} Item`; document.getElementById('cart-total-price').innerText = totalPrice.toLocaleString('id-ID'); document.getElementById('checkout-total').innerText = totalPrice.toLocaleString('id-ID'); };
        window.renderIsiKeranjang = () => { const list = document.getElementById('cart-items-list'); list.innerHTML = ""; cartCafe.forEach((item, index) => { const noteUI = item.note ? `<p class="text-[9px] text-gray-500 italic mt-0.5 border-l-2 border-orange-300 pl-1">"${item.note}"</p>` : ""; list.innerHTML += `<div class="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 relative"><div class="w-10 h-10 bg-orange-50 dark:bg-slate-700 rounded-lg flex items-center justify-center text-xl">${item.emoji}</div><div class="flex-1 min-w-0"><h4 class="font-bold text-sm text-slate-800 dark:text-white leading-tight">${item.nama}</h4><p class="text-[10px] font-bold text-orange-500">Rp ${item.harga.toLocaleString('id-ID')} x ${item.qty}</p>${noteUI}</div><div class="font-black text-slate-800 dark:text-white text-sm">Rp ${(item.harga * item.qty).toLocaleString('id-ID')}</div><button onclick="hapusDariKeranjang(${index})" class="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-[10px] hover:bg-red-500 hover:text-white transition shadow-sm"><i class="fa-solid fa-xmark"></i></button></div>`; }); };
        window.hapusDariKeranjang = (index) => { cartCafe.splice(index, 1); updateKeranjangUI(); renderIsiKeranjang(); };
        window.kirimPesananCafe = async () => { if(cartCafe.length === 0) return alert("Keranjang kosong!"); let totalPesanan = 0; const itemsToSave = cartCafe.map(item => { totalPesanan += (item.harga * item.qty); return { nama: item.nama, qty: item.qty, note: item.note, harga_satuan: item.harga }; }); try { await addDoc(collection(db, "cafe_orders"), { pemesan: userProfile.nama, divisi: userProfile.divisi, uid: currentUser.uid, items: itemsToSave, total_harga: totalPesanan, status: "Menunggu Dibuat", waktu: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}), tanggal: new Date().toLocaleDateString('id-ID'), timestamp: new Date() }); alert("Yey! Pesanan berhasil dikirim ke Pantry! ☕ Tunggu ya."); cartCafe = []; tutupCafe(); } catch(e) { alert("Gagal pesan: " + e.message); } };
// Siapin audionya (saya pakai URL suara beep pendek bawaan Google biar langsung jalan)
// Nanti URL ini bisa kamu ganti misal jadi: new Audio('suara-dapur.mp3')
const notifSoundCafe = new Audio('KitchenNCafe - notification.mp3');

window.loadLiveOrders = (onlyBadge = false) => { 
    const q = query(collection(db, "cafe_orders"), orderBy("timestamp", "desc"), limit(100)); 
    if(unsubscribeOrders) unsubscribeOrders(); 

    // Penanda biar pas web pertama dibuka, suaranya nggak bunyi beruntun
    let isInitialLoadCafe = true; 

    unsubscribeOrders = onSnapshot(q, (snap) => { 
        const list = document.getElementById('live-orders-list'); 
        if(!onlyBadge) list.innerHTML = ""; 
        let activeCount = 0; let omsetHariIni = 0; let pesananSelesai = 0; 
        const today = new Date().toLocaleDateString('id-ID'); 

        // --- INI LOGIKA NOTIFIKASI BARUNYA ---
        if (!isInitialLoadCafe) {
            snap.docChanges().forEach((change) => {
                // Kalau ada data baru (added) dan statusnya bukan selesai
                if (change.type === "added") {
                    const newOrder = change.doc.data();
                    if (newOrder.tanggal === today && newOrder.status !== "Selesai") {
                        // 1. Play suara notif (catch buat jaga-jaga kalau diblokir browser)
                        notifSoundCafe.play().catch(e => console.log("Auto-play diblokir browser"));
                        // 2. Munculin Pop-up
                        tampilkanToastNotif(`Orderan baru dari ${newOrder.pemesan}!`);
                    }
                }
            });
        }
        isInitialLoadCafe = false; // Matikan penanda setelah load pertama selesai
        // --- BATAS LOGIKA NOTIFIKASI ---

        // (Ini kode asli bawaan script kamu buat ngerender list HTML-nya)
        snap.forEach(docSnap => { 
            const data = docSnap.data(); 
            const id = docSnap.id; 
            if(data.tanggal === today) { 
                if(data.status === "Selesai") { 
                    pesananSelesai++; omsetHariIni += (data.total_harga || 0); 
                } else { 
                    activeCount++; 
                    if(!onlyBadge) { 
                        let itemsHTML = ""; 
                        if(data.items) { 
                            data.items.forEach(item => { itemsHTML += `<p class="text-xs text-slate-700 dark:text-slate-300 border-b border-gray-50 dark:border-slate-700 py-1">- <span class="font-black text-orange-500">${item.qty}x</span> ${item.nama} ${item.note ? `<br><i class="text-[10px] text-orange-600 bg-orange-50 dark:bg-slate-900 px-1 rounded ml-3">Note: ${item.note}</i>` : ''}</p>`; }); 
                        } 
                        list.innerHTML += `<div class="bg-white dark:bg-slate-800 p-4 rounded-xl border-l-4 border-orange-500 shadow-sm relative mb-3 fade-in"><div class="flex justify-between items-start mb-2 border-b border-gray-100 dark:border-slate-700 pb-2"><div><h4 class="font-bold text-sm text-slate-800 dark:text-white">${data.pemesan}</h4><p class="text-[9px] text-gray-400 uppercase font-bold">${data.divisi || 'Karyawan'} • <i class="fa-regular fa-clock"></i> ${data.waktu}</p></div><div class="text-right"><span class="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[9px] font-black animate-pulse">Menunggu</span><p class="text-[10px] font-black text-orange-600 mt-1">Rp ${(data.total_harga || 0).toLocaleString('id-ID')}</p></div></div><div class="mb-4">${itemsHTML}</div><button onclick="selesaikanPesananCafe('${id}')" class="w-full bg-green-500 hover:bg-green-600 text-white font-black py-2.5 rounded-lg text-xs transition active:scale-95 shadow-md shadow-green-500/30"><i class="fa-solid fa-check mr-2"></i> TANDAI SELESAI</button></div>`; 
                    } 
                } 
            } 
        }); 
        if(!onlyBadge) { 
            const elOmset = document.getElementById('cafe-omset'); 
            const elSelesai = document.getElementById('cafe-count-selesai'); 
            if(elOmset) elOmset.innerText = 'Rp ' + omsetHariIni.toLocaleString('id-ID'); 
            if(elSelesai) elSelesai.innerText = pesananSelesai; 
            if(activeCount === 0) { list.innerHTML = `<div class="text-center text-gray-400 italic text-xs py-10"><i class="fa-solid fa-mug-hot text-3xl mb-2 text-gray-300"></i><br>Dapur bersih! Belum ada antrean pesanan. 👍</div>`; } 
        } 
        const badge = document.getElementById('order-badge'); 
        if(badge) { 
            if(activeCount > 0) { badge.innerText = activeCount; badge.classList.remove('hidden'); } 
            else { badge.classList.add('hidden'); } 
        } 
    }); 
};
        window.selesaikanPesananCafe = async (id) => { if(!confirm("Pesanan ini sudah selesai dibuat?")) return; try { await updateDoc(doc(db, "cafe_orders", id), { status: "Selesai" }); } catch(e) { alert("Error: " + e.message); } };
        window.downloadRekapCafe = async () => { const today = new Date().toLocaleDateString('id-ID'); const q = query(collection(db, "cafe_orders"), where("tanggal", "==", today)); try { const snap = await getDocs(q); if(snap.empty) return alert("Belum ada pesanan hari ini."); let csv = "data:text/csv;charset=utf-8,Waktu,Pemesan,Divisi,Status,Total Harga (Rp),Detail Pesanan\n"; snap.forEach(d => { const data = d.data(); let detail = "Tidak ada detail"; if(data.items) { detail = data.items.map(i => `${i.qty}x ${i.nama} ${i.note ? '('+i.note+')' : ''}`).join(" | "); } csv += `${data.waktu},"${data.pemesan}","${data.divisi}","${data.status}",${data.total_harga},"${detail}"\n`; }); const link = document.createElement("a"); link.href = encodeURI(csv); link.download = `Rekap_Cafe_Mocca_${today.replace(/\//g, "-")}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link); } catch(e) { alert("Gagal Export: " + e.message); } };
