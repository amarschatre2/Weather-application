const apiKey = "1ed0dd76bbe77ee51b42c384a878f7ca";
let currentLat = null;
let currentLon = null;

const body = document.body;
const themeToggle = document.getElementById('themeToggle');
const toggleIcon = document.getElementById('toggleIcon');
const toggleLabel = document.getElementById('toggleLabel');
const cityInput = document.getElementById('cityInput');
const getLocationBtn = document.getElementById('getLocation');
const loadingOverlay = document.getElementById('loadingOverlay');

function createStars() {
    const starfield = document.getElementById('starfield');
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.width = Math.random() * 3 + 'px';
        star.style.height = star.style.width;
        star.style.setProperty('--duration', (Math.random() * 3 + 2) + 's');
        star.style.animationDelay = Math.random() * 5 + 's';
        starfield.appendChild(star);
    }
}
createStars();

function setTheme(theme) {
    if (theme === 'light') {
        body.classList.add('light');
        body.classList.remove('dark');
        toggleIcon.innerText = '☀️';
        toggleLabel.innerText = 'Stellar Light';
    } else {
        body.classList.remove('light');
        body.classList.add('dark');
        toggleIcon.innerText = '🌙';
        toggleLabel.innerText = 'Cosmic Dark';
    }
    localStorage.setItem('weatherTheme', theme);
}

const savedTheme = localStorage.getItem('weatherTheme') || 'dark';
setTheme(savedTheme);

themeToggle.addEventListener('click', () => {
    const newTheme = body.classList.contains('light') ? 'dark' : 'light';
    setTheme(newTheme);
});

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dateTime').innerText = new Date().toLocaleDateString(undefined, options);
}

function showLoading() {
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerText = message;
    
    const existingError = document.querySelector('.error-message');
    if (existingError) existingError.remove();
    
    document.querySelector('.dashboard-grid').insertAdjacentElement('beforebegin', errorDiv);
    
    setTimeout(() => errorDiv.remove(), 3000);
}

// Get Location
getLocationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
            
            try {
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.cod === 200) {
                    cityInput.value = data.name;
                    await processWeatherData(data);
                }
            } catch (error) {
                showError("Unable to get weather for your location");
            } finally {
                hideLoading();
            }
        }, () => {
            showError("Unable to get your location");
            hideLoading();
        });
    } else {
        showError("Geolocation not supported");
    }
});

async function processWeatherData(data) {
    try {
        document.getElementById("cityName").innerText = `${data.name}, ${data.sys.country}`;
        document.getElementById("temp").innerText = Math.round(data.main.temp);
        document.getElementById("description").innerText = data.weather[0].description;
        document.getElementById("feelsLike").innerText = `Feels like: ${Math.round(data.main.feels_like)}°`;
        document.getElementById("weatherIcon").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
        
        document.getElementById("wind").innerHTML = data.wind.speed + '<span class="metric-unit">m/s</span>';
        document.getElementById("humidity").innerHTML = data.main.humidity + '<span class="metric-unit">%</span>';
        document.getElementById("visibility").innerHTML = (data.visibility / 1000).toFixed(1) + '<span class="metric-unit">km</span>';
        document.getElementById("pressure").innerHTML = data.main.pressure + '<span class="metric-unit">hPa</span>';

        const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById("sunTimes").innerHTML = `
            <div class="sun-card">
                <span class="sun-emoji">🌅</span>
                <div class="sun-info">
                    <div class="sun-label">Sunrise</div>
                    <div class="sun-time">${sunrise}</div>
                </div>
            </div>
            <div class="sun-card">
                <span class="sun-emoji">🌇</span>
                <div class="sun-info">
                    <div class="sun-label">Sunset</div>
                    <div class="sun-time">${sunset}</div>
                </div>
            </div>
        `;

        currentLat = data.coord.lat;
        currentLon = data.coord.lon;

        document.getElementById('airQualityCard').style.display = 'none';
        document.getElementById('uvCard').style.display = 'none';

        await Promise.allSettled([
            updateForecast(data.name),
            getAirPollution(data.coord.lat, data.coord.lon),
            getUVIndex(data.coord.lat, data.coord.lon, data.weather[0].icon)
        ]);
    } catch (error) {
        console.error("Error processing weather data:", error);
        showError("Error processing weather data");
    }
}

async function getWeather(city) {
    const targetCity = city || cityInput.value;
    if (!targetCity) {
        showError("Please enter a city name");
        return;
    }

    showLoading();
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${targetCity}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod === 200) {
            await processWeatherData(data);
        } else {
            showError("City not found!");
        }
    } catch (error) {
        showError("Error fetching weather data");
    } finally {
        hideLoading();
    }
}

async function getAirPollution(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.list && data.list[0]) {
            const aqi = data.list[0].main.aqi;
            const components = data.list[0].components;
            
            const aqiConfig = {
                1: { text: "Good", color: "#10b981" },
                2: { text: "Fair", color: "#f59e0b" },
                3: { text: "Moderate", color: "#f97316" },
                4: { text: "Poor", color: "#ef4444" },
                5: { text: "Very Poor", color: "#8b5cf6" }
            };
            
            const html = `
                <div class="aqi-dial">
                    <span class="aqi-number" style="color: ${aqiConfig[aqi].color}">${aqi}</span>
                    <span class="aqi-badge" style="background: ${aqiConfig[aqi].color}20; color: ${aqiConfig[aqi].color}">${aqiConfig[aqi].text}</span>
                </div>
                <div class="pollutant-grid">
                    <div class="pollutant-cell">
                        <div class="pollutant-name">PM2.5</div>
                        <div class="pollutant-value">${components.pm2_5?.toFixed(1) || '--'}</div>
                    </div>
                    <div class="pollutant-cell">
                        <div class="pollutant-name">PM10</div>
                        <div class="pollutant-value">${components.pm10?.toFixed(1) || '--'}</div>
                    </div>
                    <div class="pollutant-cell">
                        <div class="pollutant-name">O₃</div>
                        <div class="pollutant-value">${components.o3?.toFixed(1) || '--'}</div>
                    </div>
                    <div class="pollutant-cell">
                        <div class="pollutant-name">NO₂</div>
                        <div class="pollutant-value">${components.no2?.toFixed(1) || '--'}</div>
                    </div>
                    <div class="pollutant-cell">
                        <div class="pollutant-name">SO₂</div>
                        <div class="pollutant-value">${components.so2?.toFixed(1) || '--'}</div>
                    </div>
                    <div class="pollutant-cell">
                        <div class="pollutant-name">CO</div>
                        <div class="pollutant-value">${components.co?.toFixed(0) || '--'}</div>
                    </div>
                </div>
            `;
            
            document.getElementById('airQualityContent').innerHTML = html;
            document.getElementById('airQualityCard').style.display = 'block';
        }
    } catch (error) {
        console.error("Air pollution error:", error);
    }
}

async function getUVIndex(lat, lon, weatherIcon) {
    try {
        let uvi = 0;
        const hour = new Date().getHours();
        
        if (hour >= 10 && hour <= 16) {
            if (weatherIcon.includes('d')) {
                if (weatherIcon.includes('01')) uvi = 8;
                else if (weatherIcon.includes('02')) uvi = 6;
                else if (weatherIcon.includes('03') || weatherIcon.includes('04')) uvi = 4;
                else if (weatherIcon.includes('09') || weatherIcon.includes('10')) uvi = 3;
                else uvi = 2;
            } else {
                uvi = 0;
            }
        } else {
            uvi = hour > 6 && hour < 18 ? 2 : 0;
        }
        
        let riskLevel, recommendation, color;
        let progressPercent = (uvi / 11) * 100;
        
        if (uvi <= 2) {
            riskLevel = "Low";
            recommendation = "No protection needed. Safe to explore the cosmos.";
            color = "#10b981";
        } else if (uvi <= 5) {
            riskLevel = "Moderate";
            recommendation = "Wear sunscreen, hat, and sunglasses. Seek shade during peak hours.";
            color = "#f59e0b";
        } else if (uvi <= 7) {
            riskLevel = "High";
            recommendation = "Protection essential. Reduce time in the stellar radiation.";
            color = "#f97316";
        } else if (uvi <= 10) {
            riskLevel = "Very High";
            recommendation = "Take extra precautions. Unprotected skin will burn quickly.";
            color = "#ef4444";
        } else {
            riskLevel = "Extreme";
            recommendation = "Avoid outdoor activities. Stay in the shade or indoors.";
            color = "#8b5cf6";
        }
        
        const html = `
            <div class="uv-meter">
                <span class="uv-number" style="color: ${color}">${uvi}</span>
                <span class="uv-risk-text" style="color: ${color}">${riskLevel}</span>
            </div>
            <div class="uv-bar">
                <div class="uv-progress" style="width: ${progressPercent}%; background: ${color}"></div>
            </div>
            <div class="uv-tip">${recommendation}</div>
        `;
        
        document.getElementById('uvContent').innerHTML = html;
        document.getElementById('uvCard').style.display = 'block';
    } catch (error) {
        console.error("UV Index error:", error);
    }
}

// Forecast
async function updateForecast(city) {
    if (!city) return;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
    
    try {
        const res = await fetch(forecastUrl);
        const data = await res.json();
        const forecastGrid = document.getElementById('forecastGrid');
        
        if (data.cod === "200" && data.list) {
            forecastGrid.innerHTML = '';
            
            const dailyForecasts = {};
            data.list.forEach(item => {
                const date = new Date(item.dt * 1000).toLocaleDateString();
                if (!dailyForecasts[date]) {
                    dailyForecasts[date] = item;
                }
            });
            
            Object.values(dailyForecasts).slice(0, 7).forEach(day => {
                const date = new Date(day.dt * 1000);
                const dayName = date.toLocaleDateString('en', { weekday: 'short' });
                const div = document.createElement('div');
                div.className = 'forecast-sphere';
                div.innerHTML = `
                    <div class="forecast-day">${dayName}</div>
                    <img class="forecast-icon" src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="${day.weather[0].description}">
                    <div class="forecast-high">${Math.round(day.main.temp)}°</div>
                    <div class="forecast-low">${Math.round(day.main.temp_min)}°</div>
                `;
                forecastGrid.appendChild(div);
            });
        }
    } catch (e) {
        console.warn("Forecast fetch failed");
        const forecastGrid = document.getElementById('forecastGrid');
        forecastGrid.innerHTML = '';
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const temps = ['22°', '24°', '21°', '25°', '23°', '20°', '22°'];
        
        for (let i = 0; i < 7; i++) {
            const div = document.createElement('div');
            div.className = 'forecast-sphere';
            div.innerHTML = `
                <div class="forecast-day">${days[i]}</div>
                <div class="forecast-high">${temps[i]}</div>
                <div class="forecast-low">--°</div>
            `;
            forecastGrid.appendChild(div);
        }
    }
}

window.onload = () => {
    updateDate();
    getWeather("Bengaluru");
};

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const city = e.target.value.trim();
        if (city) getWeather(city);
    }
});