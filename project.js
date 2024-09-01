let globalData = [];
let currentProfile = 'All Users';

// Load and parse the CSV data
Papa.parse("ViewingActivity.csv", {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: function (results) {
        if (results.errors.length > 0) {
            console.error("Errors during parsing:", results.errors);
        }
        globalData = results.data;
        initializeProfileSelector();
        analyzeData();
    },
    error: function (error) {
        console.error("Error loading or parsing CSV:", error);
    }
});

const NETFLIX_AVATARS = [
    './icons/kids.png',
    './icons/luli.png',
    './icons/nuno.png',
    './icons/pati.png',
    './icons/pedro.png',
];

function initializeProfileSelector() {
    const profileSelector = document.getElementById('profile-selector');
    const profiles = ['All Users', ...new Set(globalData.map(d => d['Profile Name']))];

    profiles.forEach((profile, index) => {
        const profileContainer = document.createElement('div');
        profileContainer.className = 'profile-container';
        profileContainer.onclick = () => selectProfile(profile);

        const avatar = document.createElement('div');
        avatar.className = 'profile-avatar';

        if (profile === 'All Users') {
            avatar.textContent = 'A';
            avatar.style.backgroundColor = '#E50914';
            avatar.style.color = 'white';
            avatar.style.fontWeight = 'bold';
        } else {
            const img = document.createElement('img');
            img.src = NETFLIX_AVATARS[index % NETFLIX_AVATARS.length];
            img.alt = profile;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '4px';
            avatar.appendChild(img);
        }

        const nameLabel = document.createElement('div');
        nameLabel.className = 'profile-name';
        nameLabel.textContent = profile;

        profileContainer.appendChild(avatar);
        profileContainer.appendChild(nameLabel);
        profileSelector.appendChild(profileContainer);
    });

    selectProfile('All Users');
}

function selectProfile(profile) {
    currentProfile = profile;
    document.querySelectorAll('.profile-avatar').forEach(avatar => {
        avatar.classList.remove('active');
        if (avatar.textContent === profile.charAt(0).toUpperCase()) {
            avatar.classList.add('active');
        }
    });
    analyzeData();
}

function analyzeData() {
    const filteredData = currentProfile === 'All Users'
        ? globalData
        : globalData.filter(d => d['Profile Name'] === currentProfile);

    // Process data
    filteredData.forEach(d => {
        if (d.Duration && typeof d.Duration === 'string') {
            const [hours, minutes, seconds] = d.Duration.split(':').map(Number);
            d.DurationHours = hours + minutes / 60 + seconds / 3600;
        } else {
            d.DurationHours = 0;
        }
        d.StartTime = new Date(d['Start Time']);
    });

    const totalHours = d3.sum(filteredData, d => d.DurationHours);
    const userAnalysis = {
        profile: currentProfile,
        totalViews: filteredData.length,
        totalHours: totalHours.toFixed(2),
        averageDuration: (totalHours / filteredData.length * 60).toFixed(2),
        favoriteGenre: "Action", // Placeholder
        mostWatchedShow: getMostWatchedShow(filteredData),
        preferredDevice: getPreferredDevice(filteredData),
        viewingHabits: getViewingHabits(filteredData)
    };

    renderUserAnalysis(userAnalysis);
    renderOverallAnalysis(filteredData);
    renderViewingPatterns(filteredData);
    renderContentPopularity(filteredData);
    renderMapData(filteredData);
}
function renderMapData(data) {
    const totalViews = data.length;
    const totalHours = d3.sum(data, d => d.DurationHours);
    const averageDuration = totalHours / totalViews * 60; // in minutes
    const topDevices = d3.rollups(data,
        v => d3.sum(v, d => d.DurationHours),
        d => categorizeDevice(d['Device Type']))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return {
        totalViews,
        totalHours,
        averageDuration,
        topDevices
    };
}
function renderUserAnalysis(userAnalysis) {
    const userAnalysisHtml = `
    <h2>${userAnalysis.profile}'s Viewing Habits</h2>
    <table>
    <tr><th>Total Hours Watched</th><td>${userAnalysis.totalHours} hours</td></tr>
    <tr><th>Average Duration</th><td>${userAnalysis.averageDuration} minutes</td></tr>
    <tr><th>Favorite Genre</th><td>${userAnalysis.favoriteGenre}</td></tr>
    <tr><th>Most Watched Show</th><td>${userAnalysis.mostWatchedShow}</td></tr>
    <tr><th>Preferred Device</th><td>${userAnalysis.preferredDevice}</td></tr>
    <tr><th>Viewing Habits</th><td>${userAnalysis.viewingHabits}</td></tr>
    </table>
    `;

    document.getElementById('user-analysis').innerHTML = userAnalysisHtml;
}

function renderOverallAnalysis(data) {
    const totalViews = data.length;
    const totalHours = d3.sum(data, d => d.DurationHours);
    const averageDuration = totalHours / totalViews * 60; // in minutes
    const topDevices = d3.rollups(data,
        v => d3.sum(v, d => d.DurationHours),
        d => categorizeDevice(d['Device Type']))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    const topCountries = d3.rollups(data, v => d3.sum(v, d => d.DurationHours), d => d.Country)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7);

    createPieChart(topDevices, '#device-chart', 'Device Type', 'Total Hours Watched');
    createWorldMap(topCountries, '#country-chart', 'Country', 'Total Hours Watched');
}

function renderViewingPatterns(data) {
    // Map day of week numbers to names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Calculate views by hour of the day
    const viewsByHour = d3.rollups(
        data,
        v => d3.sum(v, d => d.DurationHours),
        d => d.StartTime.getHours()
    ).sort((a, b) => a[0] - b[0]);

    // Calculate views by day of the week and convert day numbers to names
    const viewsByDayOfWeek = d3.rollups(
        data,
        v => d3.sum(v, d => d.DurationHours),
        d => d.StartTime.getDay()
    )
        .map(d => [dayNames[d[0]], d[1]]) // Replace day numbers with day names
        .sort((a, b) => dayNames.indexOf(a[0]) - dayNames.indexOf(b[0])); // Sort by day order

    // Render the charts
    createLineChart(viewsByHour, '#hourly-chart', 'Hour of Day', 'Total Hours Watched');
    createBarChart(viewsByDayOfWeek, '#daily-chart', 'Day of Week', 'Total Hours Watched');
}

function renderContentPopularity(data) {
    const topTitles = d3.rollups(data, v => d3.sum(v, d => d.DurationHours), d => d.Title)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    createBarChart(topTitles, '#title-chart', 'Title', 'Total Hours Watched');
}

function getMostWatchedShow(data) {
    const shows = d3.rollups(data, v => d3.sum(v, d => d.DurationHours), d => d.Title)
        .sort((a, b) => b[1] - a[1]);
    return shows[0][0];
}

function getPreferredDevice(data) {
    const devices = d3.rollups(data,
        v => d3.sum(v, d => d.DurationHours),
        d => categorizeDevice(d['Device Type']))
        .sort((a, b) => b[1] - a[1]);
    return devices[0][0];
}

function categorizeDevice(deviceType) {
    const deviceCategories = {
        TV: ['TV', 'Smart TV', 'Roku', 'Fire TV', 'Apple TV', 'Chromecast'],
        Phone: ['iPhone', 'Mobile', 'Android', 'iOS', 'Samsung'],
        Tablet: ['iPad'],
        Laptop: ['MAC', 'Mac', 'Macbook', 'Firefox'],
        PC: ['PC', 'iMac'],
        Videogame: ['PS4', 'Wii', 'Xbox'],
    };

    for (let category in deviceCategories) {
        if (deviceCategories[category].some(device => deviceType.toLowerCase().includes(device.toLowerCase()))) {
            return category;
        }
    }
    return 'Other';
}

function getViewingHabits(data) {
    const morningHours = d3.sum(data.filter(d => d.StartTime.getHours() >= 5 && d.StartTime.getHours() < 12), d => d.DurationHours);
    const afternoonHours = d3.sum(data.filter(d => d.StartTime.getHours() >= 12 && d.StartTime.getHours() < 18), d => d.DurationHours);
    const eveningHours = d3.sum(data.filter(d => d.StartTime.getHours() >= 18 && d.StartTime.getHours() < 21), d => d.DurationHours);
    const earlyNightHours = d3.sum(data.filter(d => d.StartTime.getHours() >= 21 && d.StartTime.getHours() < 0), d => d.DurationHours);
    const lateNightHours = d3.sum(data.filter(d => d.StartTime.getHours() >= 0 && d.StartTime.getHours() < 5), d => d.DurationHours);

    // Fix the typo and ensure each condition checks correctly
    const max = Math.max(morningHours, afternoonHours, eveningHours, earlyNightHours, lateNightHours);
    let habit = "";
    if (max === morningHours) habit = "Morning Viewer";
    else if (max === afternoonHours) habit = "Afternoon Viewer";
    else if (max === eveningHours) habit = "After Work Viewer";
    else if (max === earlyNightHours) habit = "Before Bed Viewer";
    else habit = "Night Owl";

    return `${habit}`;
}
