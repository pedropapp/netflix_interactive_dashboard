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

  document.querySelectorAll('.profile-container').forEach(container => {
      const profileName = container.querySelector('.profile-name').textContent;
      container.classList.remove('active');
      
      if (profileName === profile) {
          container.classList.add('active');
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
    renderContentPopularity(filteredData, 'title-chart');
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
    <table style="width: 100%; table-layout: fixed;">
        <colgroup>
            <col style="width: 40%;">
            <col style="width: 60%;">
        </colgroup>
        <tr><th>Total Hours Watched</th><td>${userAnalysis.totalHours} hours</td></tr>
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
  
  function renderContentPopularity(data, containerId) {
    // Process the data
    const topTitles = d3.rollups(data, v => d3.sum(v, d => d.DurationHours), d => d.Title)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
    
    // Netflix image URLs
    const netflixImages = [
      "https://occ-0-1567-1123.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABRvngexxF8H1-OzRWFSj6ddD-aB93tTBP9kMNz3cIVfuIfLEP1E_0saiNAwOtrM6xSOXvoiSCMsihWSkW0dq808-R7_lBnr6WHbjkKBX6I3sD0uCcS8kSPbRjEDdG8CeeVXEAEV6spQ.webp",
      "https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABZEK-7pZ1H5FD4cTyUb9qB_KeyJGz5p-kfPhCFv4GU_3mbdm8Xfsy4IBchlG9PFNdGff8cBNPaeMra72VFnot41nt0y3e8RLgaVwwh3UvyM2H2_MkmadWbQUeGuf811K7-cxJJh7gA.jpg",
      "https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABQCoK53qihwVPLRxPEDX98nyYpGbxgi5cc0ZOM4iHQu7KQvtgNyaNM5PsgI0vy5g3rLPZdjGCFr1EggrCPXpL77p2H08jV0tNEmIfs_e8KUfvBJ6Ay5nM4UM1dl-58xA6t1swmautOM.webp",
      "https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABdYtAqj8CyaJTWq5taD8Ro_UgwH3nne9QpFGVps-2J3IG-leqrfqXFii4jzZn48nPYTkrlwKQEV0R7_cEKlYBPRzdKqNODc-Oz26IL3LlLgFboXibIWXwxzeYxzuqn0I9TpARjeByw.jpg",
      "https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABbcCX42tsqGbBvO2y9CQv5-7QvYbCfoHtXsuc6NPCtZaKa4l4fBX3XWvUwG9F2A3CTsNpHVmulxBbdXKwK8Q6xGjejd9FoadGkZ7CnGrSl601TOQjzSHJ23NuIPC8j0QMGORL4uRIA.jpg",
      "https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABVopDZ5Fy9_fk_HO5WxHTXKKjKhtWFupbSjuvPwfLK_vytzon4EwRUdGgYJ34JwPxOTK_NkV3aXfkULMB0Dcct-FyfqzH-X44VXuRMp4QeBHlvKwWeZFpZlGdItPzmmg4scmwhG7SQ.jpg",
      "https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABTOj1-116yVcgKWMU2dI3GFR4x0fSkiGsqtLLeLUxRR7STaksjAqBTrYlTfrB8nIGnGvXksi0ewXAhVGg6-pLxpFOIfcpjK-pf8D5xehFZo5a6vJbo4L0AGbrzglbyUoq255QBJgRQ.jpg",
      "https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/a76057bcfd003711a76fb3985b1f2cf74beee3b8/AAAABd3IBDpxbRcHXvRMFCZeKa2aHLU1P4SJtrACMS9om3yhLjqPlvNlmR_fypPxjtbsbnKaC4JZhPSpDG4r_kdxSHHAltWguMcCB-1Y1OShr2zWfUv7Whf_39fNH5ZJ3_0gxQrs0akmQjQz44_LT7jXH5LMZ7iMBAzac5IEj4m7Fn_5OWEGYnVsDsKG-QTommDooULMDF9bEw.jpg",
      "https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/a76057bcfd003711a76fb3985b1f2cf74beee3b8/AAAABXSd7bhDddcwkq9XpksoQFCHVx29Sxl_h4hb2n3F2GIt32a4XWcOnctQfgnT5qdolv8UML6_xNB5CJ89h56wueb13mYmEBr0sx5e9iLPdtVcOQAOmKXKWHHXwFvJuCUwuNnL3s8eAQwqLXPVMHMEsujM684rUGrZNF2btN2GRy5-RyEslsxZO93V2Q_H2bWs8A8oayt1h5M.webp",
      "https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/a76057bcfd003711a76fb3985b1f2cf74beee3b8/AAAABbXWODpAWqVXcmmjMA7K-2mPkQpvwCLfSdeyhVXzR8A3MSpdSEnnjf4HEJJTYC-TnktU6njTUGAxmzWEYCaJbk4v_ZeL-7QGzmkvYBjg_N-evr2XmcX-Fanoyvu_nimFP4iigPe4O3Vr_WcgplhwkDrJwPUJa84wRLrNAx3TufN5V7cWRP4indqu5HQahvgFEqfL9zjp4g.jpg"
    ];
    
    // Get the container element
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with id '${containerId}' not found`);
      return;
    }
    container.innerHTML = ''; // Clear existing content
  
    // Create the wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';
    container.appendChild(wrapper);
  
    // Create the section
    const section = document.createElement('section');
    wrapper.appendChild(section);
  
    // Create scrollable container
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'scroll-container';
    section.appendChild(scrollContainer);
  
    // Create items container inside the scrollable container
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'items';
    scrollContainer.appendChild(itemsContainer);
  
    // Create items
    topTitles.forEach(([title, hours], index) => {
      const item = document.createElement('div');
      item.className = 'item';
      
      const img = document.createElement('img');
      img.src = netflixImages[index % netflixImages.length];
      img.alt = title;
      item.appendChild(img);
  
      const titleElement = document.createElement('div');
      titleElement.textContent = title;
      titleElement.className = 'title';
      item.appendChild(titleElement);
  
      const hoursElement = document.createElement('div');
      hoursElement.textContent = `${Math.round(hours)} hours watched`;
      hoursElement.className = 'hours';
      item.appendChild(hoursElement);
  
      itemsContainer.appendChild(item);
    });
  
    const leftArrow = document.createElement('button');
    leftArrow.className = 'arrow__btn left-arrow';
    leftArrow.innerHTML = '&#10094;'; // Left arrow character
    section.appendChild(leftArrow);
    
    const rightArrow = document.createElement('button');
    rightArrow.className = 'arrow__btn right-arrow';
    rightArrow.innerHTML = '&#10095;'; // Right arrow character
    section.appendChild(rightArrow);
  
    // Add CSS
    const style = document.createElement('style');
    style.textContent = `
      .wrapper {
        position: relative;
        overflow: hidden;
        width: 100%;
        padding: 20px 0; /* Add padding to prevent item clipping */
      }
      
      .wrapper section {
        width: 100%;
        position: relative;
        display: flex;
        align-items: center;
      }
      
     .scroll-container {
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  width: calc(100% - 50px);
  padding: 60px 20px;
  margin: 0 20px;
  scrollbar-width: none; /* For Firefox */
}

.scroll-container::-webkit-scrollbar {
  display: none; /* For Chrome, Safari, and Opera */
}
      
      .items {
        display: flex;
        gap: 10px;
      }
      
      .item {
        flex: 0 0 1%;
        transition: transform 250ms ease-in-out;
      }
      
      .item:hover {
        transform: scale(1.1);
        z-index: 2;
      }
      
      .arrow__btn {
        position: absolute;
        top: 45%;
        transform: translateY(-50%);
        width: 50px;
        height: 70%;
        background: rgba(0, 0, 0, 0.35);
        border: none;
        outline: none;
        transition: background 0.3s;
        cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 24px;
        color: white;
        text-decoration: none;
      }
      
      .arrow__btn:hover {
        background: rgba(0, 0, 0, 0.8);
      }
      
      .left-arrow {
        left: 10px;
      }
      
      .right-arrow {
        right: 10px;
      }
    `;
    document.head.appendChild(style);
  
    // Add title
    const title = document.createElement('h1');
    title.textContent = 'Top 10 Titles';
    container.insertBefore(title, wrapper);
  
    // Add arrow functionality
    const scrollAmount = scrollContainer.clientWidth * 0.85;

leftArrow.addEventListener('click', (e) => {
  e.preventDefault();
  scrollContainer.scrollBy({
    left: -scrollAmount,
    behavior: 'smooth'
  });
});

rightArrow.addEventListener('click', (e) => {
  e.preventDefault();
  scrollContainer.scrollBy({
    left: scrollAmount,
    behavior: 'smooth'
  });
});
  }
  