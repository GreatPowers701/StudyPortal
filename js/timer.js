// --- Timer Logic ---

// Global Variables
let timerInterval = null;

function formatTime(totalSeconds) {
    const isNegative = totalSeconds < 0;
    const absSecs = Math.abs(totalSeconds);
    const hrs = Math.floor(absSecs / 3600);
    const mins = Math.floor((absSecs % 3600) / 60);
    const secs = absSecs % 60;
    const timeStr = [hrs, mins, secs].map(v => v < 10 ? "0" + v : v).join(":");
    return isNegative ? "-" + timeStr : timeStr;
}

function toggleTimer() {
    if (timerInterval) {
        stopTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    const playIcon = document.getElementById('timer-play-icon');
    const stopIcon = document.getElementById('timer-stop-icon');
    if (playIcon) playIcon.classList.add('hidden');
    if (stopIcon) stopIcon.classList.remove('hidden');

    if (activeTestId && library[activeTestId]) {
        library[activeTestId].timerRunning = true;
        library[activeTestId].lastUpdate = Date.now();
        saveAndSync();
    }

    timerInterval = setInterval(() => {
        if (activeTestId && library[activeTestId]) {
            const test = library[activeTestId];
            const now = Date.now();
            const delta = Math.round((now - test.lastUpdate) / 1000);
            test.lastUpdate = now;

            if (test.timerMode === 'countdown') {
                test.timerLimit -= delta;
                test.timeSpent += delta;
                const timerEl = document.getElementById('test-timer');
                if (timerEl) timerEl.innerText = formatTime(test.timerLimit);
                if (test.timerLimit <= 0) {
                    showTimerEnd();
                    stopTimer();
                }
            } else {
                test.timeSpent += delta;
                const timerEl = document.getElementById('test-timer');
                if (timerEl) timerEl.innerText = formatTime(test.timeSpent);
            }
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;

    const playIcon = document.getElementById('timer-play-icon');
    const stopIcon = document.getElementById('timer-stop-icon');
    if (playIcon) playIcon.classList.remove('hidden');
    if (stopIcon) stopIcon.classList.add('hidden');

    if (activeTestId && library[activeTestId]) {
        library[activeTestId].timerRunning = false;
    }
    saveAndSync();
}

function openTimerSettings() {
    const test = library[activeTestId];
    if (!test) return;
    document.getElementById('input-timer-mins').value = test.timerMode === 'countdown' ? Math.ceil(test.timerLimit / 60) : "";
    document.getElementById('input-goal-num').value = test.sessionGoal || "";
    document.getElementById('timerSettingsModal').classList.remove('hidden');
    document.getElementById('timerSettingsModal').classList.add('flex');
}

function saveTimerSettings() {
    const mins = parseInt(document.getElementById('input-timer-mins').value) || 0;
    const goal = parseInt(document.getElementById('input-goal-num').value) || 0;
    const test = library[activeTestId];
    if (!test) return;

    const wasRunning = timerInterval !== null;
    stopTimer();

    if (mins > 0) {
        test.timerMode = 'countdown';
        test.timerLimit = mins * 60;
    } else {
        test.timerMode = 'countup';
    }

    test.sessionGoal = goal;
    saveAndSync();
    closeModal('timerSettingsModal');
    updateWorkspaceTimerUI();

    if (wasRunning) startTimer();
}

function updateWorkspaceTimerUI() {
    const test = library[activeTestId];
    if (!test) return;
    const goalArea = document.getElementById('active-goal-stats');
    const goalNum = document.getElementById('display-goal-num');

    if (test.sessionGoal > 0) {
        goalArea.classList.remove('hidden');
        goalArea.classList.add('flex');
        goalNum.innerText = test.sessionGoal;
    } else {
        goalArea.classList.add('hidden');
        goalArea.classList.remove('flex');
    }

    const timerEl = document.getElementById('test-timer');
    if (timerEl) {
        timerEl.innerText = test.timerMode === 'countdown' ? formatTime(test.timerLimit) : formatTime(test.timeSpent);
    }

    const playIcon = document.getElementById('timer-play-icon');
    const stopIcon = document.getElementById('timer-stop-icon');
    if (timerInterval) {
        if (playIcon) playIcon.classList.add('hidden');
        if (stopIcon) stopIcon.classList.remove('hidden');
    } else {
        if (playIcon) playIcon.classList.remove('hidden');
        if (stopIcon) stopIcon.classList.add('hidden');
    }
}

function showTimerEnd() {
    const modal = document.getElementById('timerEndModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}
