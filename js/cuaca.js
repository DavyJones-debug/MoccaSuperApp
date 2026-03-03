// --- FITUR WIDGET CUACA BERDASARKAN GPS DEVICE ---

async function fetchWeatherByLocation(lat, lon) {
    try {
        // 1. Dapatkan nama kota/daerah dari koordinat GPS (Reverse Geocoding gratis pakai BigDataCloud)
        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`);
        const geoData = await geoRes.json();
        
        // Ambil nama kota atau kecamatan
        const city = geoData.locality || geoData.city || "Lokasi Anda";
        document.getElementById('weather-city').innerText = city;

        // 2. Ambil data cuaca akurat dari Open-Meteo pakai koordinat device
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const weatherData = await weatherRes.json();
        
        const temp = Math.round(weatherData.current_weather.temperature);
        const code = weatherData.current_weather.weathercode;
        
        document.getElementById('weather-temp').innerText = `${temp}°`;
        
        // 3. Ubah Icon WMO Code ke FontAwesome
        let icon = "fa-cloud-sun";
        let desc = "Cerah Berawan";
        
        if (code === 0) { icon = "fa-sun text-yellow-500"; desc = "Cerah"; }
        else if (code >= 1 && code <= 3) { icon = "fa-cloud-sun"; desc = "Berawan"; }
        else if (code >= 45 && code <= 48) { icon = "fa-smog"; desc = "Berkabut"; }
        else if (code >= 51 && code <= 67) { icon = "fa-cloud-rain text-blue-500"; desc = "Hujan Ringan"; }
        else if (code >= 71 && code <= 77) { icon = "fa-snowflake text-sky-300"; desc = "Salju"; }
        else if (code >= 80 && code <= 82) { icon = "fa-cloud-showers-heavy text-slate-700"; desc = "Hujan Deras"; }
        else if (code >= 95 && code <= 99) { icon = "fa-cloud-bolt text-purple-600"; desc = "Badai Petir"; }
        
        document.getElementById('weather-icon').className = `fa-solid ${icon} text-xl`;
        document.getElementById('weather-desc').innerText = desc;
        
    } catch (error) {
        console.error("Gagal memuat cuaca:", error);
        document.getElementById('weather-desc').innerText = "Gagal memuat data";
    }
}

function getLocationAndWeather() {
    document.getElementById('weather-desc').innerText = "Mendeteksi lokasi...";
    
    // Cek apakah browser support GPS
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Jika user mengizinkan akses lokasi
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                fetchWeatherByLocation(lat, lon);
            },
            (error) => {
                // Jika user menolak akses lokasi / GPS mati
                console.warn("Akses GPS ditolak atau gagal.");
                document.getElementById('weather-city').innerText = "GPS Ditolak";
                document.getElementById('weather-desc').innerText = "Izinkan GPS u/ cuaca";
                document.getElementById('weather-temp').innerText = "--°";
            },
            { enableHighAccuracy: true } // Meminta akurasi GPS paling tinggi
        );
    } else {
        document.getElementById('weather-desc').innerText = "Browser tidak support GPS";
    }
}

// Jalankan otomatis saat web dibuka
document.addEventListener('DOMContentLoaded', () => {
    getLocationAndWeather();
    // Update otomatis tiap 30 menit
    setInterval(getLocationAndWeather, 30 * 60 * 1000); 
});