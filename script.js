// Local Storage Management
let userData = {};
try {
    userData = JSON.parse(localStorage.getItem('mindspace_user')) || {};
} catch (error) {
    console.warn('Failed to parse localStorage, resetting user data');
    localStorage.setItem('mindspace_user', JSON.stringify({}));
}
let currentUser = localStorage.getItem('mindspace_currentUser') || null;
let selectedMood = null;

// Initialize App
function initApp() {
    const loginModal = document.getElementById('loginModal');
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (!loginModal) {
        console.warn('Login modal not found');
        return;
    }
    if (!currentUser) {
        loginModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        if (welcomeMessage) welcomeMessage.classList.add('hidden');
    } else {
        loginModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome, ${currentUser}!`;
            welcomeMessage.classList.remove('hidden');
        }
    }

    drawMoodWheel();
    loadUserData();

    const header = document.querySelector('header');
    if (header) {
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'Logout';
        logoutBtn.className = 'logout-btn';
        logoutBtn.addEventListener('click', () => {
            currentUser = null;
            localStorage.removeItem('mindspace_currentUser');
            loginModal.classList.remove('hidden');
            document.body.classList.add('modal-open');
            if (welcomeMessage) welcomeMessage.classList.add('hidden');
            loadUserData();
        });
        header.appendChild(logoutBtn);
    }

    const goalList = document.getElementById('goalList');
    if (goalList) {
        goalList.addEventListener('click', handleGoalToggle);
    } else {
        console.warn('Goal list element not found');
    }
}

// Login
document.getElementById('loginBtn')?.addEventListener('click', () => {
    const usernameInput = document.getElementById('usernameInput');
    if (!usernameInput) {
        console.warn('Username input not found');
        return;
    }
    const username = usernameInput.value.trim();
    if (!username) {
        alert('Please enter a username.');
        return;
    }
    if (username.length > 20) {
        alert('Username must be 20 characters or less.');
        return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        alert('Username can only contain letters, numbers, underscores, or hyphens.');
        return;
    }
    currentUser = username;
    localStorage.setItem('mindspace_currentUser', currentUser);
    if (!userData[username]) {
        userData[username] = {
            moods: [],
            journal: [],
            gratitude: [],
            goals: [],
            challenges: {},
            achievements: [],
            streak: 0,
            lastLogin: null
        };
    }
    localStorage.setItem('mindspace_user', JSON.stringify(userData));
    document.getElementById('loginModal')?.classList.add('hidden');
    document.body.classList.remove('modal-open');
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${username}!`;
        welcomeMessage.classList.remove('hidden');
    }
    loadUserData();
    scheduleMoodReminder();
    drawMoodWheel();
});

// Dark Mode Toggle
document.getElementById('darkModeToggle')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-theme'));
});

if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-theme');
}

// Mood Wheel
const moodWheel = document.getElementById('moodWheel');
const moodCtx = moodWheel?.getContext('2d');
const moods = [
    { name: 'Angry', color: '#ef4444', emoji: '😣' },
    { name: 'Sad', color: '#ca8a04', emoji: '😢' },
    { name: 'Happy', color: '#22c55e', emoji: '😊' },
    { name: 'Calm', color: '#3b82f6', emoji: '😌' },
    { name: 'Excited', color: '#a855f7', emoji: '🎉' }
];

function drawMoodWheel() {
    if (!moodWheel || !moodCtx) {
        console.warn('Mood wheel canvas or context not found');
        return;
    }
    moodWheel.width = moodWheel.offsetWidth;
    moodWheel.height = moodWheel.offsetHeight || 200;
    const centerX = moodWheel.width / 2;
    const centerY = moodWheel.height / 2;
    const radius = Math.min(moodWheel.width, moodWheel.height) / 2 - 10;
    const angleStep = (2 * Math.PI) / moods.length;

    moodCtx.clearRect(0, 0, moodWheel.width, moodWheel.height);
    moods.forEach((mood, i) => {
        moodCtx.beginPath();
        moodCtx.moveTo(centerX, centerY);
        moodCtx.arc(centerX, centerY, radius, i * angleStep, (i + 1) * angleStep);
        moodCtx.fillStyle = mood.name === selectedMood ? '#000' : mood.color;
        moodCtx.fill();
        moodCtx.stroke();
        const labelAngle = i * angleStep + angleStep / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius / 1.5);
        const labelY = centerY + Math.sin(labelAngle) * (radius / 1.5);
        moodCtx.fillStyle = '#fff';
        moodCtx.font = '12px Arial';
        moodCtx.textAlign = 'center';
        moodCtx.textBaseline = 'middle';
        moodCtx.fillText(mood.name, labelX, labelY);
    });
}

if (moodWheel) {
    moodWheel.addEventListener('click', (e) => {
        const rect = moodWheel.getBoundingClientRect();
        const scaleX = moodWheel.width / rect.width;
        const scaleY = moodWheel.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX - moodWheel.width / 2;
        const y = (e.clientY - rect.top) * scaleY - moodWheel.height / 2;
        const angle = Math.atan2(y, x) < 0 ? Math.atan2(y, x) + 2 * Math.PI : Math.atan2(y, x);
        const index = Math.floor(angle / (2 * Math.PI / moods.length));
        selectedMood = moods[index].name;
        drawMoodWheel();
    });
}

document.getElementById('logMoodBtn')?.addEventListener('click', () => {
    if (!currentUser) {
        alert('Please log in to record your mood.');
        return;
    }
    if (!selectedMood) {
        alert('Please select a mood from the wheel.');
        return;
    }
    const note = document.getElementById('moodNote')?.value.trim() || '';
    if (note.length > 500) {
        alert('Mood note must be 500 characters or less.');
        return;
    }
    const moodEntry = {
        mood: selectedMood,
        note,
        date: new Date().toISOString()
    };
    userData[currentUser].moods.push(moodEntry);
    localStorage.setItem('mindspace_user', JSON.stringify(userData));
    const mood = moods.find(m => m.name === selectedMood);
    const reaction = document.createElement('div');
    reaction.className = 'mood-reaction';
    reaction.textContent = mood.emoji;
    reaction.style.left = '50%';
    reaction.style.top = '50%';
    reaction.style.transform = 'translate(-50%, -50%)';
    const moodCard = moodWheel.closest('.card');
    if (moodCard) {
        moodCard.appendChild(reaction);
        setTimeout(() => reaction.remove(), 1000);
    }
    updateStreak();
    updateMoodChart();
    updateCalendar();
    updateMoodInsights();
    updateProgressChart();
    updateAchievements();
    updateMoodPlaylist();
    document.getElementById('moodNote').value = '';
    selectedMood = null;
    drawMoodWheel();
});

// Journal
document.getElementById('saveJournalBtn')?.addEventListener('click', () => {
    if (!currentUser) {
        alert('Please log in to save journal entries.');
        return;
    }
    const entry = document.getElementById('journalEntry')?.value.trim();
    if (!entry) return;
    if (entry.length > 1000) {
        alert('Journal entry must be 1000 characters or less.');
        return;
    }
    userData[currentUser].journal.push({
        text: entry,
        date: new Date().toISOString()
    });
    localStorage.setItem('mindspace_user', JSON.stringify(userData));
    updateJournalHistory();
    updateProgressChart();
    updateAchievements();
    document.getElementById('journalEntry').value = '';
});

// Gratitude
document.getElementById('saveGratitudeBtn')?.addEventListener('click', () => {
    if (!currentUser) {
        alert('Please log in to save gratitude entries.');
        return;
    }
    const entry = document.getElementById('gratitudeEntry')?.value.trim();
    if (!entry) return;
    if (entry.length > 1000) {
        alert('Gratitude entry must be 1000 characters or less.');
        return;
    }
    userData[currentUser].gratitude.push({
        text: entry,
        date: new Date().toISOString()
    });
    localStorage.setItem('mindspace_user', JSON.stringify(userData));
    updateGratitudeHistory();
    updateProgressChart();
    updateAchievements();
    document.getElementById('gratitudeEntry').value = '';
});

// Goal Setting
document.getElementById('addGoalBtn')?.addEventListener('click', () => {
    if (!currentUser) {
        alert('Please log in to add goals.');
        return;
    }
    const goalText = document.getElementById('goalInput')?.value.trim();
    if (!goalText) return;
    if (goalText.length > 100) {
        alert('Goal must be 100 characters or less.');
        return;
    }
    userData[currentUser].goals.push({
        text: goalText,
        completed: false,
        date: new Date().toISOString()
    });
    localStorage.setItem('mindspace_user', JSON.stringify(userData));
    updateGoalList();
    updateProgressChart();
    document.getElementById('goalInput').value = '';
});

function updateGoalList() {
    const goalList = document.getElementById('goalList');
    if (!goalList || !currentUser) {
        console.warn('Goal list or current user not found');
        return;
    }
    const goals = userData[currentUser].goals || [];
    goalList.innerHTML = goals.length ? goals.map((goal, index) => `
        <div class="goal-item ${goal.completed ? 'completed' : ''}">
            <span>${goal.text} (${new Date(goal.date).toLocaleDateString()})</span>
            <button class="toggle-goal" data-index="${index}">
                ${goal.completed ? 'Undo' : 'Complete'}
            </button>
        </div>
    `).join('') : '<p>No goals set yet. Add one above!</p>';
}

function handleGoalToggle(e) {
    if (!e.target.classList.contains('toggle-goal') || !currentUser) {
        console.warn('Invalid goal toggle event or no current user');
        return;
    }
    const index = parseInt(e.target.dataset.index, 10);
    if (isNaN(index) || index < 0 || index >= userData[currentUser].goals.length) {
        console.warn('Invalid goal index:', index);
        return;
    }
    userData[currentUser].goals[index].completed = !userData[currentUser].goals[index].completed;
    localStorage.setItem('mindspace_user', JSON.stringify(userData));
    updateGoalList();
    updateProgressChart();
    updateAchievements();
}

// Daily Challenge
function updateDailyChallenge() {
    const dailyChallengeText = document.getElementById('dailyChallengeText');
    const challengeStatus = document.getElementById('challengeStatus');
    if (!dailyChallengeText || !challengeStatus) {
        console.warn('Daily challenge elements not found');
        return;
    }
    if (!currentUser) {
        dailyChallengeText.textContent = 'Log in to see your daily challenge!';
        challengeStatus.textContent = '';
        challengeStatus.classList.add('hidden');
        return;
    }
    const challenges = [
        'Take a 5-minute walk outside',
        'Compliment someone today',
        'Try a new hobby for 10 minutes',
        'Drink a glass of water mindfully',
        'Write down 3 things you love about yourself'
    ];
    const today = new Date().toDateString();
    if (!userData[currentUser].challenges) {
        userData[currentUser].challenges = {};
    }
    if (!userData[currentUser].challenges[today]) {
        userData[currentUser].challenges[today] = {
            text: challenges[Math.floor(Math.random() * challenges.length)],
            completed: false
        };
        localStorage.setItem('mindspace_user', JSON.stringify(userData));
    }
    const challenge = userData[currentUser].challenges[today];
    dailyChallengeText.textContent = challenge.text;
    dailyChallengeText.classList.remove('loading');
    challengeStatus.textContent = challenge.completed ? 'Completed!' : '';
    challengeStatus.classList.toggle('hidden', !challenge.completed);
}

document.getElementById('completeChallengeBtn')?.addEventListener('click', () => {
    if (!currentUser) {
        alert('Please log in to complete challenges.');
        return;
    }
    const today = new Date().toDateString();
    if (userData[currentUser].challenges[today]) {
        userData[currentUser].challenges[today].completed = true;
        localStorage.setItem('mindspace_user', JSON.stringify(userData));
        updateDailyChallenge();
        updateAchievements();
        updateProgressChart();
    }
});

// Mood Playlist
function updateMoodPlaylist() {
    const moodPlaylist = document.getElementById('moodPlaylist');
    if (!moodPlaylist) {
        console.warn('Mood playlist element not found');
        return;
    }
    if (!currentUser) {
        moodPlaylist.innerHTML = '<p>Log in to see a personalized playlist!</p>';
        return;
    }
    const latestMood = userData[currentUser].moods.slice(-1)[0]?.mood;
    const playlists = {
        Angry: ['https://www.youtube.com/embed/z5rRZdiu1UE', 'Relaxing Heavy Metal'],
        Sad: ['https://www.youtube.com/embed/HAfFfqiYLp0', 'Soothing Piano Music'],
        Happy: ['https://www.youtube.com/embed/0yBnIUX0QAE', 'Upbeat Pop Hits'],
        Calm: ['https://www.youtube.com/embed/lFcSrYw-ARY', 'Nature Sounds for Relaxation'],
        Excited: ['https://www.youtube.com/embed/3tmd-ClpJxA', 'Energetic Dance Mix']
    };
    const playlist = latestMood ? playlists[latestMood] : ['https://www.youtube.com/embed/inpok4MKVLM', 'Relaxing Mix'];
    moodPlaylist.innerHTML = latestMood ? 
        `<p>Based on your mood: <a href="${playlist[0]}" target="_blank">${playlist[1]}</a></p>` : 
        '<p>Log a mood to get a personalized playlist!</p>';
}

// Achievements
function updateAchievements() {
    const achievementsDiv = document.getElementById('achievements');
    if (!achievementsDiv) {
        console.warn('Achievements element not found');
        return;
    }
    if (!currentUser) {
        achievementsDiv.innerHTML = '<p>Log in to earn badges!</p>';
        return;
    }
    const achievements = [];
    if (userData[currentUser].streak >= 7) achievements.push('7-Day Streak');
    if (userData[currentUser].moods.length >= 5) achievements.push('Mood Logger');
    if (userData[currentUser].journal.length >= 5) achievements.push('Journal Keeper');
    if (userData[currentUser].gratitude.length >= 5) achievements.push('Gratitude Guru');
    if (userData[currentUser].goals.filter(g => g.completed).length >= 3) achievements.push('Goal Achiever');
    if (Object.values(userData[currentUser].challenges || {}).filter(c => c.completed).length >= 3) achievements.push('Challenge Master');
    userData[currentUser].achievements = achievements;
    localStorage.setItem('mindspace_user', JSON.stringify(userData));
    achievementsDiv.innerHTML = achievements.length ? 
        achievements.map(a => `<span class="badge">${a}</span>`).join('') : 
        '<p>No badges yet. Keep engaging!</p>';
}

// Streak Update
function updateStreak() {
    if (!currentUser) return;
    const today = new Date().toDateString();
    const lastLogin = userData[currentUser].lastLogin;
    if (lastLogin !== today) {
        const lastDate = lastLogin ? new Date(lastLogin) : null;
        const yesterday = new Date();
        yesterday.setDate(new Date().getDate() - 1);
        if (lastDate && lastDate.toDateString() === yesterday.toDateString()) {
            userData[currentUser].streak++;
        } else {
            userData[currentUser].streak = 1;
        }
        userData[currentUser].lastLogin = today;
        localStorage.setItem('mindspace_user', JSON.stringify(userData));
        const streakCount = document.getElementById('streakCount');
        if (streakCount) streakCount.textContent = `${userData[currentUser].streak} days`;
    }
}

// Mood Chart (Canvas-based)
function updateMoodChart() {
    const moodChartCanvas = document.getElementById('moodChart');
    if (!moodChartCanvas) {
        console.warn('Mood chart canvas not found');
        return;
    }
    const ctx = moodChartCanvas.getContext('2d');
    if (!ctx) {
        console.warn('Mood chart canvas context not found');
        return;
    }
    const existingMessage = moodChartCanvas.nextElementSibling;
    if (existingMessage && existingMessage.tagName === 'P') existingMessage.remove();
    if (!currentUser) {
        moodChartCanvas.style.display = 'none';
        moodChartCanvas.insertAdjacentHTML('afterend', '<p>Log in to see your mood chart!</p>');
        return;
    }
    const moods = userData[currentUser].moods.slice(-7);
    if (!moods.length) {
        moodChartCanvas.style.display = 'none';
        moodChartCanvas.insertAdjacentHTML('afterend', '<p>No mood data yet. Log a mood to see your chart!</p>');
        return;
    }
    moodChartCanvas.style.display = 'block';
    moodChartCanvas.width = moodChartCanvas.offsetWidth;
    moodChartCanvas.height = moodChartCanvas.offsetHeight || 100;
    const scores = { Angry: 1, Sad: 2, Calm: 3, Happy: 4, Excited: 5 };
    const data = moods.map(m => scores[m.mood] || 0);
    const labels = moods.map(m => new Date(m.date).toLocaleDateString());

    ctx.clearRect(0, 0, moodChartCanvas.width, moodChartCanvas.height);
    ctx.beginPath();
    ctx.moveTo(30, 10);
    ctx.lineTo(30, 90);
    ctx.lineTo(moodChartCanvas.width - 10, 90);
    ctx.strokeStyle = '#000';
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 6; i++) {
        const y = 90 - (i * 80 / 6);
        ctx.fillText(i, 25, y + 3);
    }

    ctx.textAlign = 'center';
    for (let i = 0; i < labels.length; i++) {
        const x = 30 + (i * (moodChartCanvas.width - 40) / (labels.length - 1));
        ctx.fillText(labels[i].slice(0, 5), x, 100);
    }

    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    for (let i = 0; i < data.length; i++) {
        const x = 30 + (i * (moodChartCanvas.width - 40) / (data.length - 1));
        const y = 90 - (data[i] * 80 / 6);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
    }
    ctx.stroke();
}

// Progress Chart (Canvas-based)
function updateProgressChart() {
    const progressChartCanvas = document.getElementById('progressChart');
    if (!progressChartCanvas) {
        console.warn('Progress chart canvas not found');
        return;
    }
    const ctx = progressChartCanvas.getContext('2d');
    if (!ctx) {
        console.warn('Progress chart canvas context not found');
        return;
    }
    const motivationalMessage = document.getElementById('motivationalMessage');
    if (!motivationalMessage) {
        console.warn('Motivational message element not found');
    }
    const existingMessage = progressChartCanvas.nextElementSibling;
    if (existingMessage && existingMessage.tagName === 'P') existingMessage.remove();
    if (!currentUser) {
        progressChartCanvas.style.display = 'none';
        progressChartCanvas.insertAdjacentHTML('afterend', '<p>Log in to track your progress!</p>');
        if (motivationalMessage) {
            motivationalMessage.textContent = 'Log in to see your progress!';
        }
        return;
    }
    const goals = userData[currentUser].goals || [];
    if (!goals.length) {
        progressChartCanvas.style.display = 'none';
        progressChartCanvas.insertAdjacentHTML('afterend', '<p>No goals set yet. Add a goal to track progress!</p>');
        if (motivationalMessage) {
            motivationalMessage.textContent = 'Start by setting a goal!';
        }
        return;
    }
    progressChartCanvas.style.display = 'block';
    progressChartCanvas.width = progressChartCanvas.offsetWidth;
    progressChartCanvas.height = progressChartCanvas.offsetHeight || 200;
    const completed = goals.filter(g => g.completed).length;
    const total = goals.length;
    const progress = total > 0 ? completed / total : 0;

    const centerX = progressChartCanvas.width / 2;
    const centerY = progressChartCanvas.height / 2;
    const radius = Math.min(progressChartCanvas.width, progressChartCanvas.height) / 2 - 20;
    const cutout = radius * 0.6;
    ctx.clearRect(0, 0, progressChartCanvas.width, progressChartCanvas.height);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * progress);
    ctx.lineWidth = radius - cutout;
    ctx.strokeStyle = '#3b82f6';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2 + 2 * Math.PI * progress, -Math.PI / 2 + 2 * Math.PI);
    ctx.lineWidth = radius - cutout;
    ctx.strokeStyle = '#e5e7eb';
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(progress * 100)}%`, centerX, centerY);

    if (motivationalMessage) {
        motivationalMessage.textContent = total === 1 ? 
            (completed ? 'Great job completing your goal! Add more to track progress.' : 'Complete your goal to see progress!') :
            (progress >= 0.8 ? "You're doing amazing! Keep it up!" :
            progress >= 0.5 ? "Great progress! You're halfway there!" : 
            "Every step counts. Keep pushing forward!");
    }
}

// Calendar
function updateCalendar() {
    const calendar = document.getElementById('calendar');
    if (!calendar) {
        console.warn('Calendar element not found');
        return;
    }
    if (!currentUser) {
        calendar.innerHTML = '<p>Log in to see your mood calendar!</p>';
        return;
    }
    const moods = userData[currentUser].moods || [];
    calendar.innerHTML = '';
    if (!moods.length) {
        calendar.innerHTML = '<p>No mood data yet. Log a mood to see your calendar!</p>';
        return;
    }
    let html = '<div class="calendar-header">';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        html += `<div>${day}</div>`;
    });
    html += '</div><div class="calendar-body">';
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    for (let i = 0; i < monthStart.getDay(); i++) {
        html += '<div></div>';
    }
    for (let day = 1; day <= monthEnd.getDate(); day++) {
        const date = new Date(today.getFullYear(), today.getMonth(), day).toDateString();
        const mood = moods.find(m => new Date(m.date).toDateString() === date);
        const bgColor = mood ? { Angry: 'angry', Sad: 'sad', Happy: 'happy', Calm: 'calm', Excited: 'excited' }[mood.mood] : '';
        html += `<div class="calendar-day ${bgColor}">${day}</div>`;
    }
    calendar.innerHTML = html + '</div>';
}

// Mood Insights
function updateMoodInsights() {
    const moodInsights = document.getElementById('moodInsights');
    if (!moodInsights) {
        console.warn('Mood insights element not found');
        return;
    }
    if (!currentUser) {
        moodInsights.innerHTML = '<p>Log in to see mood insights!</p>';
        return;
    }
    const moods = userData[currentUser].moods.slice(-7);
    moodInsights.innerHTML = '';
    if (!moods.length) {
        moodInsights.innerHTML = '<p>No mood data yet. Log a mood to get insights!</p>';
        return;
    }
    const moodCounts = {};
    moods.forEach(m => {
        moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
    });
    const mostFrequent = Object.keys(moodCounts).length > 0 
        ? Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b) : '';
    const suggestions = {
        Angry: 'Try the breathing exercise or write in your journal to process your emotions.',
        Sad: 'Reflect on something you\'re grateful for to lift your spirits.',
        Happy: 'Great job! Keep up your positive habits.',
        Calm: 'Maintain this balance with regular meditation.',
        Excited: 'Channel this energy into your goals!'
    };
    moodInsights.innerHTML = `
        <p><strong>Recent Trend:</strong> Your most frequent mood this week is ${mostFrequent || 'none'}.</p>
        <p><strong>Suggestion:</strong> ${mostFrequent ? suggestions[mostFrequent] : 'Log your mood to get personalized insights.'}</p>
    `;
}

// Journal History
function updateJournalHistory() {
    const history = document.getElementById('journalHistory');
    if (!history) {
        console.warn('Journal history element not found');
        return;
    }
    if (!currentUser) {
        history.innerHTML = '<p>Log in to view journal entries!</p>';
        return;
    }
    const journal = userData[currentUser].journal || [];
    history.innerHTML = journal.length ? journal.map(entry => `
        <div class="history-item">
            <p class="timestamp">${new Date(entry.date).toLocaleString()}</p>
            <p>${entry.text}</p>
        </div>
    `).join('') : '<p>No journal entries yet. Write your thoughts above!</p>';
}

// Gratitude History
function updateGratitudeHistory() {
    const history = document.getElementById('gratitudeHistory');
    if (!history) {
        console.warn('Gratitude history element not found');
        return;
    }
    if (!currentUser) {
        history.innerHTML = '<p>Log in to view gratitude entries!</p>';
        return;
    }
    const gratitude = userData[currentUser].gratitude || [];
    history.innerHTML = gratitude.length ? gratitude.map(entry => `
        <div class="history-item">
            <p class="timestamp">${new Date(entry.date).toLocaleString()}</p>
            <p>${entry.text}</p>
        </div>
    `).join('') : '<p>No gratitude entries yet. Share what you\'re grateful for!</p>';
}

// Mood Reminder
function scheduleMoodReminder() {
    if (Notification.permission === 'denied') return;
    if (Notification.permission !== 'granted') {
        Notification.requestPermission().then(permission => {
            if (permission !== 'granted') {
                console.warn('Notifications denied');
                return;
            }
            scheduleReminder();
        });
    } else {
        scheduleReminder();
    }
}

function scheduleReminder() {
    const now = new Date();
    const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0);
    if (now > targetTime) targetTime.setDate(targetTime.getDate() + 1);
    const timeUntilReminder = targetTime - now;
    setTimeout(() => {
        new Notification('MindSpace Reminder', {
            body: 'Time to log your mood for today!',
            icon: 'https://via.placeholder.com/16'
        });
        setInterval(() => {
            new Notification('MindSpace Reminder', {
                body: 'Time to log your mood for today!',
                icon: 'https://via.placeholder.com/16'
            });
        }, 24 * 60 * 60 * 1000);
    }, timeUntilReminder);
}

// Data Export
document.getElementById('exportDataBtn')?.addEventListener('click', () => {
    if (!currentUser) {
        alert('Please log in to export data.');
        return;
    }
    const data = JSON.stringify(userData[currentUser], null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindspace_${currentUser}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// Meditation Timer
let meditationInterval;
document.getElementById('startMeditation')?.addEventListener('click', () => {
    let time = 5 * 60;
    const timerDisplay = document.getElementById('meditationTimer');
    if (!timerDisplay) {
        console.warn('Meditation timer element not found');
        return;
    }
    timerDisplay.classList.remove('hidden');
    clearInterval(meditationInterval);
    meditationInterval = setInterval(() => {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        timerDisplay.textContent = `Time remaining: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        time--;
        if (time < 0) {
            clearInterval(meditationInterval);
            timerDisplay.textContent = 'Meditation complete!';
            if (currentUser) {
                userData[currentUser].goals.forEach(goal => {
                    if (goal.text.toLowerCase().includes('meditat') && !goal.completed) {
                        goal.completed = true;
                    }
                });
                localStorage.setItem('mindspace_user', JSON.stringify(userData));
                updateGoalList();
                updateProgressChart();
                updateAchievements();
            }
        }
    }, 1000);
});

// Load User Data
function loadUserData() {
    const sections = [
        updateMoodChart,
        updateCalendar,
        updateMoodInsights,
        updateJournalHistory,
        updateGratitudeHistory,
        updateGoalList,
        updateProgressChart,
        updateDailyChallenge,
        updateMoodPlaylist,
        updateAchievements
    ];
    if (!currentUser) {
        sections.forEach(fn => fn());
        const streakCount = document.getElementById('streakCount');
        if (streakCount) streakCount.textContent = '0 days';
        return;
    }
    if (!userData[currentUser]) {
        userData[currentUser] = {
            moods: [],
            journal: [],
            gratitude: [],
            goals: [],
            challenges: {},
            achievements: [],
            streak: 0,
            lastLogin: null
        };
        localStorage.setItem('mindspace_user', JSON.stringify(userData));
    }
    const streakCount = document.getElementById('streakCount');
    if (streakCount) streakCount.textContent = `${userData[currentUser].streak || 0} days`;
    sections.forEach(fn => fn());
}

// Initialize
document.addEventListener('DOMContentLoaded', initApp);