// js/weather.js — Weather Carousel for En Santiago Index
// Uses Open-Meteo API (free, no API key required)
// OPTIMIZADO: 1 solo request batch + cache localStorage 30min + deferred load

(function () {
    'use strict';

    const CACHE_KEY = 'enSantiago_weather_cache';
    const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

    // ─── Comunas de Santiago (TOP 10 para reducir requests) ──────
    const STATES = [
        { name: 'Santiago Centro', lat: -33.4489, lng: -70.6693 },
        { name: 'Las Condes', lat: -33.4182, lng: -70.5764 },
        { name: 'Providencia', lat: -33.4285, lng: -70.6107 },
        { name: 'Maipú', lat: -33.5115, lng: -70.7624 },
        { name: 'Ñuñoa', lat: -33.4635, lng: -70.6001 },
        { name: 'La Florida', lat: -33.5319, lng: -70.5918 },
        { name: 'Pudahuel', lat: -33.4439, lng: -70.7394 },
        { name: 'Recoleta', lat: -33.4118, lng: -70.6461 },
        { name: 'Puente Alto', lat: -33.6112, lng: -70.5847 },
        { name: 'San Bernardo', lat: -33.5922, lng: -70.6997 },
    ];

    function getWeatherInfo(code, isDay) {
        if (code === 0) return isDay
            ? { icon: 'fas fa-sun', cls: 'w-sunny', desc: 'Despejado', accent: '#fbbf24' }
            : { icon: 'fas fa-moon', cls: 'w-clear-night', desc: 'Despejado', accent: '#94a3b8' };
        if (code === 1) return isDay
            ? { icon: 'fas fa-cloud-sun', cls: 'w-partly-cloudy', desc: 'Mayormente despejado', accent: '#fbbf24' }
            : { icon: 'fas fa-cloud-moon', cls: 'w-partly-cloudy', desc: 'Mayormente despejado', accent: '#94a3b8' };
        if (code === 2) return isDay
            ? { icon: 'fas fa-cloud-sun', cls: 'w-partly-cloudy', desc: 'Parcialmente nublado', accent: '#cbd5e1' }
            : { icon: 'fas fa-cloud-moon', cls: 'w-partly-cloudy', desc: 'Parcialmente nublado', accent: '#cbd5e1' };
        if (code === 3) return { icon: 'fas fa-cloud', cls: 'w-cloudy', desc: 'Nublado', accent: '#94a3b8' };
        if (code === 45 || code === 48) return { icon: 'fas fa-smog', cls: 'w-fog', desc: 'Niebla', accent: '#64748b' };
        if (code >= 51 && code <= 57) return { icon: 'fas fa-cloud-rain', cls: 'w-drizzle', desc: 'Llovizna', accent: '#7dd3fc' };
        if (code >= 61 && code <= 65) return { icon: 'fas fa-cloud-showers-heavy', cls: 'w-rain', desc: 'Lluvia', accent: '#38bdf8' };
        if (code >= 66 && code <= 67) return { icon: 'fas fa-cloud-showers-heavy', cls: 'w-rain', desc: 'Lluvia helada', accent: '#38bdf8' };
        if (code >= 71 && code <= 77) return { icon: 'fas fa-snowflake', cls: 'w-snow', desc: 'Nieve', accent: '#e0f2fe' };
        if (code >= 80 && code <= 82) return { icon: 'fas fa-cloud-showers-heavy', cls: 'w-rain', desc: 'Chubascos', accent: '#38bdf8' };
        if (code >= 85 && code <= 86) return { icon: 'fas fa-snowflake', cls: 'w-snow', desc: 'Copos de nieve', accent: '#e0f2fe' };
        if (code >= 95 && code <= 99) return { icon: 'fas fa-bolt', cls: 'w-thunder', desc: 'Tormenta', accent: '#fde047' };
        return { icon: 'fas fa-cloud', cls: 'w-cloudy', desc: 'Nublado', accent: '#94a3b8' };
    }

    function formatTemp(celsius) {
        return Math.round(celsius) + '°';
    }

    function buildCard(state, data) {
        const cw = data.current_weather;
        const isDay = cw.is_day === 1;
        const info = getWeatherInfo(cw.weathercode, isDay);
        const windKmh = Math.round(cw.windspeed * 3.6);

        const card = document.createElement('div');
        card.className = 'weather-card';
        card.style.setProperty('--weather-accent', info.accent);

        card.innerHTML = `
            <div class="weather-card-state">${state.name}</div>
            <div class="weather-card-icon ${info.cls}">
                <i class="${info.icon}"></i>
            </div>
            <div class="weather-card-temp">${formatTemp(cw.temperature)}</div>
            <div class="weather-card-desc">${info.desc}</div>
            <div class="weather-card-details">
                <span class="weather-card-detail">
                    <i class="fas fa-wind"></i> ${windKmh} km/h
                </span>
                <span class="weather-card-detail">
                    <i class="fas fa-temperature-half"></i> ${Math.round(cw.temperature)}°C
                </span>
            </div>
        `;
        return card;
    }

    // ─── Cache en localStorage ───────────────────────────────────
    function getCachedWeather() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp > CACHE_TTL) return null;
            return data.results;
        } catch (e) { return null; }
    }

    function setCachedWeather(results) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                results: results,
            }));
        } catch (e) { /* localStorage might be full */ }
    }

    // ─── Fetch weather: 1 solo request batch ──────────────────────
    async function fetchAllWeather() {
        // 1. Intentar cache primero
        const cached = getCachedWeather();
        if (cached && cached.length > 0) {
            console.log('[Weather] Cache hit — sin request a la API');
            return cached;
        }

        // 2. Batch request (1 sola llamada con todas las comunas)
        const BASE = 'https://api.open-meteo.com/v1/forecast';
        const params = new URLSearchParams({
            latitude: STATES.map(s => s.lat).join(','),
            longitude: STATES.map(s => s.lng).join(','),
            current_weather: 'true',
            timezone: 'America/Santiago',
        });

        try {
            const resp = await fetch(BASE + '?' + params.toString());
            if (!resp.ok) throw new Error('API error ' + resp.status);
            const json = await resp.json();

            // Si la API devuelve error (rate limit, etc.)
            if (json.error) {
                console.warn('[Weather] API error:', json.reason || 'unknown');
                return getCachedWeather() || [];
            }

            const results = [];
            for (let i = 0; i < STATES.length; i++) {
                results.push({
                    state: STATES[i],
                    temperature: json.current_weather.temperature[i],
                    windspeed: json.current_weather.windspeed[i],
                    weathercode: json.current_weather.weathercode[i],
                    is_day: json.current_weather.is_day[i],
                });
            }

            // Guardar en cache
            setCachedWeather(results);
            return results;
        } catch (err) {
            console.warn('[Weather] Fetch failed:', err.message);
            // Intentar cache expirado como fallback
            return getCachedWeather() || [];
        }
    }

    // ─── Render the carousel ──────────────────────────────────────
    async function renderWeatherCarousel() {
        const track = document.getElementById('weatherTrack');
        const loading = document.getElementById('weatherLoading');
        if (!track || !loading) return;

        try {
            const results = await fetchAllWeather();

            if (results.length === 0) {
                // En lugar de mostrar error, ocultar la sección gracefully
                const section = track.closest('.weather-section') || track.closest('section');
                if (section) {
                    section.style.display = 'none';
                } else {
                    loading.innerHTML = '<i class="fas fa-cloud-slash"></i> Clima no disponible';
                }
                return;
            }

            track.innerHTML = '';
            results.sort((a, b) => a.state.name.localeCompare(b.state.name, 'es'));

            const fragment = document.createDocumentFragment();
            for (const r of results) {
                fragment.appendChild(buildCard(r.state, { current_weather: r }));
            }
            track.appendChild(fragment);

            const clone = track.innerHTML;
            track.insertAdjacentHTML('beforeend', clone);
            setupMarquee(track);
        } catch (err) {
            console.error('[Weather] Error:', err);
            // Ocultar sección en vez de mostrar error
            const section = track.closest('.weather-section') || track.closest('section');
            if (section) section.style.display = 'none';
        }
    }

    function setupMarquee(track) {
        track.addEventListener('mouseenter', () => track.classList.add('weather-paused'));
        track.addEventListener('mouseleave', () => track.classList.remove('weather-paused'));
        track.addEventListener('touchstart', () => track.classList.add('weather-paused'), { passive: true });
        track.addEventListener('touchend', () => {
            setTimeout(() => track.classList.remove('weather-paused'), 2000);
        });
    }

    // ─── DEFERRED LOAD ────────────────────────────────────────────
    function init() {
        if (document.readyState === 'complete') {
            setTimeout(renderWeatherCarousel, 100);
        } else {
            window.addEventListener('load', function () {
                setTimeout(renderWeatherCarousel, 200);
            });
        }
    }

    init();
})();
