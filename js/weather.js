// js/weather.js — Weather Carousel for HolaX Index
// Uses Open-Meteo API (free, no API key required)

(function () {
    'use strict';

    // ─── Venezuelan States with coordinates ───────────────────────
    const STATES = [
        { name: 'Distrito Capital', lat: 10.4806, lng: -66.9036 },
        { name: 'Miranda', lat: 10.2500, lng: -66.5000 },
        { name: 'Zulia', lat: 10.6427, lng: -71.6125 },
        { name: 'Carabobo', lat: 10.1626, lng: -67.5874 },
        { name: 'Aragua', lat: 10.2466, lng: -67.5958 },
        { name: 'Lara', lat: 10.0676, lng: -69.3256 },
        { name: 'Mérida', lat: 8.5980, lng: -71.1400 },
        { name: 'Táchira', lat: 7.7648, lng: -72.2292 },
        { name: 'Bolívar', lat: 8.1292, lng: -63.5503 },
        { name: 'Anzoátegui', lat: 10.2214, lng: -64.6325 },
        { name: 'Vargas', lat: 10.5994, lng: -66.9333 },
        { name: 'Falcón', lat: 11.4044, lng: -69.6731 },
        { name: 'Portuguesa', lat: 9.0422, lng: -69.7350 },
        { name: 'Barinas', lat: 8.6234, lng: -70.2086 },
        { name: 'Sucre', lat: 10.4598, lng: -64.1750 },
        { name: 'Nueva Esparta', lat: 10.9584, lng: -63.8439 },
        { name: 'Monagas', lat: 9.7458, lng: -63.1833 },
        { name: 'Trujillo', lat: 9.3700, lng: -70.4340 },
        { name: 'Yaracuy', lat: 10.3389, lng: -68.7417 },
        { name: 'Guárico', lat: 9.9156, lng: -67.3533 },
        { name: 'Cojedes', lat: 9.6614, lng: -68.5733 },
        { name: 'Apure', lat: 7.8909, lng: -67.4736 },
        { name: 'Amazonas', lat: 5.6642, lng: -67.6228 },
        { name: 'Delta Amacuro', lat: 8.8125, lng: -61.9736 },
    ];

    // ─── WMO Weather Code mapping ─────────────────────────────────
    function getWeatherInfo(code, isDay) {
        // Returns { icon (FA class), colorClass, description }
        if (code === 0) {
            return isDay
                ? { icon: 'fas fa-sun', cls: 'w-sunny', desc: 'Despejado', accent: '#fbbf24' }
                : { icon: 'fas fa-moon', cls: 'w-clear-night', desc: 'Despejado', accent: '#94a3b8' };
        }
        if (code === 1) {
            return isDay
                ? { icon: 'fas fa-cloud-sun', cls: 'w-partly-cloudy', desc: 'Principalmente despejado', accent: '#fbbf24' }
                : { icon: 'fas fa-cloud-moon', cls: 'w-partly-cloudy', desc: 'Principalmente despejado', accent: '#94a3b8' };
        }
        if (code === 2) {
            return isDay
                ? { icon: 'fas fa-cloud-sun', cls: 'w-partly-cloudy', desc: 'Parcialmente nublado', accent: '#cbd5e1' }
                : { icon: 'fas fa-cloud-moon', cls: 'w-partly-cloudy', desc: 'Parcialmente nublado', accent: '#cbd5e1' };
        }
        if (code === 3) {
            return { icon: 'fas fa-cloud', cls: 'w-cloudy', desc: 'Nublado', accent: '#94a3b8' };
        }
        if (code === 45 || code === 48) {
            return { icon: 'fas fa-smog', cls: 'w-fog', desc: 'Niebla', accent: '#64748b' };
        }
        if (code >= 51 && code <= 55) {
            return { icon: 'fas fa-cloud-rain', cls: 'w-drizzle', desc: 'Llovizna', accent: '#7dd3fc' };
        }
        if (code >= 56 && code <= 57) {
            return { icon: 'fas fa-cloud-rain', cls: 'w-drizzle', desc: 'Llovizna congelante', accent: '#7dd3fc' };
        }
        if (code >= 61 && code <= 63) {
            return { icon: 'fas fa-cloud-showers-heavy', cls: 'w-rain', desc: 'Lluvia', accent: '#38bdf8' };
        }
        if (code === 65) {
            return { icon: 'fas fa-cloud-showers-heavy', cls: 'w-heavy-rain', desc: 'Lluvia fuerte', accent: '#0284c7' };
        }
        if (code >= 66 && code <= 67) {
            return { icon: 'fas fa-cloud-showers-heavy', cls: 'w-rain', desc: 'Lluvia congelante', accent: '#38bdf8' };
        }
        if (code >= 71 && code <= 75) {
            return { icon: 'fas fa-snowflake', cls: 'w-snow', desc: 'Nieve', accent: '#e0f2fe' };
        }
        if (code === 77) {
            return { icon: 'fas fa-snowflake', cls: 'w-snow', desc: 'Granizo', accent: '#e0f2fe' };
        }
        if (code >= 80 && code <= 81) {
            return { icon: 'fas fa-cloud-showers-heavy', cls: 'w-rain', desc: 'Chubascos', accent: '#38bdf8' };
        }
        if (code === 82) {
            return { icon: 'fas fa-cloud-showers-heavy', cls: 'w-heavy-rain', desc: 'Chubascos fuertes', accent: '#0284c7' };
        }
        if (code === 85 || code === 86) {
            return { icon: 'fas fa-snowflake', cls: 'w-snow', desc: 'Copos de nieve', accent: '#e0f2fe' };
        }
        if (code === 95) {
            return { icon: 'fas fa-bolt', cls: 'w-thunder', desc: 'Tormenta', accent: '#fde047' };
        }
        if (code === 96 || code === 99) {
            return { icon: 'fas fa-bolt', cls: 'w-thunder', desc: 'Tormenta con granizo', accent: '#fde047' };
        }
        // Fallback
        return { icon: 'fas fa-cloud', cls: 'w-cloudy', desc: 'Nublado', accent: '#94a3b8' };
    }

    // ─── Format temperature ───────────────────────────────────────
    function formatTemp(celsius) {
        return Math.round(celsius) + '°';
    }

    // ─── Build a single weather card HTML ─────────────────────────
    function buildCard(state, data) {
        const cw = data.current_weather;
        const isDay = cw.is_day === 1;
        const info = getWeatherInfo(cw.weathercode, isDay);

        // Wind speed in km/h (API returns m/s)
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

    // ─── Fetch weather for all states (batched) ───────────────────
    async function fetchAllWeather() {
        const results = [];

        // Open-Meteo allows multiple lat/lon in one request
        const BASE = 'https://api.open-meteo.com/v1/forecast';
        const params = {
            latitude: STATES.map(s => s.lat).join(','),
            longitude: STATES.map(s => s.lng).join(','),
            current_weather: 'true',
            timezone: 'America/Caracas',
        };

        const url = BASE + '?' + new URLSearchParams(params).toString();

        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('API error ' + resp.status);
            const json = await resp.json();

            // The API returns arrays in the same order as the input coordinates
            for (let i = 0; i < STATES.length; i++) {
                results.push({
                    state: STATES[i],
                    temperature: json.current_weather.temperature[i],
                    windspeed: json.current_weather.windspeed[i],
                    weathercode: json.current_weather.weathercode[i],
                    is_day: json.current_weather.is_day[i],
                });
            }
        } catch (err) {
            console.warn('[Weather] Batch fetch failed, falling back to individual:', err.message);
            // Fallback: individual requests in small batches
            for (const state of STATES) {
                try {
                    const resp = await fetch(
                        BASE + '?' + new URLSearchParams({
                            latitude: state.lat,
                            longitude: state.lng,
                            current_weather: 'true',
                            timezone: 'America/Caracas',
                        }).toString()
                    );
                    const json = await resp.json();
                    results.push({
                        state: state,
                        temperature: json.current_weather.temperature,
                        windspeed: json.current_weather.windspeed,
                        weathercode: json.current_weather.weathercode,
                        is_day: json.current_weather.is_day,
                    });
                } catch (e) {
                    console.warn('[Weather] Failed for', state.name, e.message);
                    // Skip this state on failure
                }
            }
        }

        return results;
    }

    // ─── Render the carousel ──────────────────────────────────────
    async function renderWeatherCarousel() {
        const track = document.getElementById('weatherTrack');
        const loading = document.getElementById('weatherLoading');
        if (!track || !loading) return;

        try {
            const results = await fetchAllWeather();

            if (results.length === 0) {
                loading.innerHTML = '<i class="fas fa-exclamation-circle"></i> No se pudo obtener el clima';
                return;
            }

            // Clear loading
            track.innerHTML = '';

            // Sort alphabetically by state name
            results.sort((a, b) => a.state.name.localeCompare(b.state.name, 'es'));

            // Render cards (original set)
            const fragment = document.createDocumentFragment();
            for (const r of results) {
                fragment.appendChild(buildCard(r.state, { current_weather: r }));
            }
            track.appendChild(fragment);

            // Duplicate the set for seamless infinite loop
            const clone = track.innerHTML;
            track.insertAdjacentHTML('beforeend', clone);

            // Setup marquee behavior
            setupMarquee(track);

        } catch (err) {
            console.error('[Weather] Error:', err);
            loading.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error al cargar el clima';
        }
    }

    // ─── Infinite marquee scroll ───────────────────────────────────
    function setupMarquee(track) {
        // Pause on hover/touch
        track.addEventListener('mouseenter', () => track.classList.add('weather-paused'));
        track.addEventListener('mouseleave', () => track.classList.remove('weather-paused'));
        track.addEventListener('touchstart', () => track.classList.add('weather-paused'), { passive: true });
        track.addEventListener('touchend', () => {
            // Resume after a short delay on mobile
            setTimeout(() => track.classList.remove('weather-paused'), 2000);
        });
    }

    // ─── Initialize when DOM is ready ─────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderWeatherCarousel);
    } else {
        renderWeatherCarousel();
    }
})();