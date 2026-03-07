// --- Daily Checklist Logic ---

let checklistData = {
    testGiven: null,
    testName: '',
    paper1Marks: '',
    paper1Total: '',
    paper2Marks: '',
    paper2Total: '',
    qsSolved: '',
    qsGoal: 200,
    badminton: null,
    mental: null,
    date: new Date().toISOString().split('T')[0]
};

// --- Google Sheets Integration ---
let sheetsClientInitialized = false;
let sheetsSignedIn = false;
let sheetsTokenClient;
let sheetsAccessToken = null;

const SPREADSHEET_ID = '14XkmLcut2i7fHdcBfw9wH8VXPhsm8U48EsppsUqgdBk';
const SHEET_NAME = 'Daily Log';
const SHEETS_DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
const SHEETS_SCOPES = 'https://www.googleapis.com/auth/spreadsheets';


function loadDailyChecklist() {
    try {
        const raw = localStorage.getItem('portal_checklist');
        if (raw) {
            const parsed = JSON.parse(raw);
            // Only load if it's the same day
            const today = new Date().toISOString().split('T')[0];
            if (parsed.date === today) {
                checklistData = parsed;
                restoreChecklistUI();
            } else {
                saveDailyChecklistLocal(); // save fresh data
            }
        }
    } catch (e) {
        console.error('Failed to load checklist', e);
    }
}

function restoreChecklistUI() {
    if (checklistData.testGiven !== null) {
        setDetailedTest(checklistData.testGiven, true);
    }
    if (checklistData.testName) document.getElementById('checklist-test-name').value = checklistData.testName;
    if (checklistData.paper1Marks) document.getElementById('checklist-p1-marks').value = checklistData.paper1Marks;
    if (checklistData.paper1Total) document.getElementById('checklist-p1-total').value = checklistData.paper1Total;
    if (checklistData.paper2Marks) document.getElementById('checklist-p2-marks').value = checklistData.paper2Marks;
    if (checklistData.paper2Total) document.getElementById('checklist-p2-total').value = checklistData.paper2Total;

    if (checklistData.qsSolved) document.getElementById('checklist-qs-solved').value = checklistData.qsSolved;

    if (checklistData.badminton !== null) {
        toggleBooleanState('badminton', checklistData.badminton, true);
    }
    if (checklistData.mental !== null) {
        toggleBooleanState('mental', checklistData.mental, true);
    }
    checkQsGoal();
}

function setDetailedTest(isYes, skipSave = false) {
    checklistData.testGiven = isYes;
    checklistData.qsGoal = isYes ? 75 : 200;

    document.getElementById('checklist-qs-goal').innerText = checklistData.qsGoal;

    const btnYes = document.getElementById('btn-test-yes');
    const btnNo = document.getElementById('btn-test-no');
    const detailsContainer = document.getElementById('test-details-container');

    if (isYes) {
        btnYes.className = "flex-1 px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors bg-indigo-500 border-indigo-500 text-white";
        btnNo.className = "flex-1 px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200";
        detailsContainer.classList.remove('hidden');
        detailsContainer.classList.add('flex');
    } else {
        btnNo.className = "flex-1 px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors bg-indigo-500 border-indigo-500 text-white";
        btnYes.className = "flex-1 px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200";
        detailsContainer.classList.add('hidden');
        detailsContainer.classList.remove('flex');
    }

    checkQsGoal();
    if (!skipSave) saveDailyChecklistLocal();
}

function toggleBooleanState(field, isYes, skipSave = false) {
    checklistData[field] = isYes;

    const btnYes = document.getElementById(`btn-${field}-yes`);
    const btnNo = document.getElementById(`btn-${field}-no`);

    if (isYes) {
        btnYes.className = "px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors bg-emerald-500 border-emerald-500 text-white";
        btnNo.className = "px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200";
    } else {
        btnNo.className = "px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors bg-rose-500 border-rose-500 text-white";
        btnYes.className = "px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200";
    }

    if (!skipSave) saveDailyChecklistLocal();
}

function checkQsGoal() {
    const input = document.getElementById('checklist-qs-solved');
    const container = document.getElementById('qs-solved-container');
    const val = parseInt(input.value) || 0;

    checklistData.qsSolved = val;

    if (val >= checklistData.qsGoal) {
        container.classList.remove('border-slate-200/50', 'dark:border-slate-700/50', 'border-rose-300', 'dark:border-rose-800');
        container.classList.add('border-emerald-400', 'dark:border-emerald-500', 'bg-emerald-50/50', 'dark:bg-emerald-900/10');
        input.classList.add('text-emerald-600', 'dark:text-emerald-400');
        input.classList.remove('text-rose-600', 'dark:text-rose-400');
    } else if (input.value !== '') {
        container.classList.remove('border-slate-200/50', 'dark:border-slate-700/50', 'border-emerald-400', 'dark:border-emerald-500', 'bg-emerald-50/50', 'dark:bg-emerald-900/10');
        container.classList.add('border-rose-300', 'dark:border-rose-800');
        input.classList.add('text-rose-600', 'dark:text-rose-400');
        input.classList.remove('text-emerald-600', 'dark:text-emerald-400');
    } else {
        container.classList.remove('border-emerald-400', 'dark:border-emerald-500', 'bg-emerald-50/50', 'dark:bg-emerald-900/10', 'border-rose-300', 'dark:border-rose-800');
        container.classList.add('border-slate-200/50', 'dark:border-slate-700/50');
        input.classList.remove('text-emerald-600', 'dark:text-emerald-400', 'text-rose-600', 'dark:text-rose-400');
    }
    saveDailyChecklistLocal();
}

function saveDailyChecklistLocal() {
    // Gather all data first
    checklistData.testName = document.getElementById('checklist-test-name').value;
    checklistData.paper1Marks = document.getElementById('checklist-p1-marks').value;
    checklistData.paper1Total = document.getElementById('checklist-p1-total').value;
    checklistData.paper2Marks = document.getElementById('checklist-p2-marks').value;
    checklistData.paper2Total = document.getElementById('checklist-p2-total').value;
    checklistData.qsSolved = document.getElementById('checklist-qs-solved').value;

    localStorage.setItem('portal_checklist', JSON.stringify(checklistData));
}

function saveDailyChecklist() {
    saveDailyChecklistLocal();

    // Call Sheets API if connected
    if (sheetsSignedIn) {
        appendToChecklistSheet(checklistData);
    }

    // Save UI feedback
    const btn = document.getElementById('save-checklist-btn');
    const originalText = btn.innerText;
    btn.innerText = 'Saved ✓';
    btn.classList.add('bg-emerald-500', 'border-emerald-500');
    setTimeout(() => {
        btn.innerText = originalText;
        btn.classList.remove('bg-emerald-500', 'border-emerald-500');
    }, 2000);

    console.log("Checklist Data saved locally:", checklistData);
}

// --- Sheets API Functions ---

function updateSheetsStatus(message, tone = 'neutral') {
    const statusEl = document.getElementById('sheets-status');
    if (!statusEl) return;
    statusEl.innerText = message;
    statusEl.classList.remove('text-amber-500', 'dark:text-amber-300', 'text-emerald-500', 'dark:text-emerald-300', 'text-rose-500', 'dark:text-rose-300');

    if (tone === 'warning') {
        statusEl.classList.add('text-amber-500', 'dark:text-amber-300');
    } else if (tone === 'success') {
        statusEl.classList.add('text-emerald-500', 'dark:text-emerald-300');
    } else if (tone === 'error') {
        statusEl.classList.add('text-rose-500', 'dark:text-rose-300');
    } else {
        statusEl.classList.add('text-amber-500', 'dark:text-amber-300');
    }
}

function updateSheetsAuthUI() {
    const btn = document.getElementById('sheets-connect-btn');
    const viewBtn = document.getElementById('sheets-view-btn');
    if (!btn) return;
    if (sheetsSignedIn) {
        btn.innerText = 'Disconnect Google Sheets';
        btn.classList.remove('bg-white/50', 'dark:bg-slate-800/50', 'text-slate-600', 'dark:text-slate-300');
        btn.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-200');
        if (viewBtn) viewBtn.classList.remove('hidden');
        updateSheetsStatus('Connected to Google Sheets.', 'success');
    } else {
        btn.innerText = 'Connect Google Sheets';
        btn.classList.add('bg-white/50', 'dark:bg-slate-800/50', 'text-slate-600', 'dark:text-slate-300');
        btn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-200');
        if (viewBtn) viewBtn.classList.add('hidden');
        updateSheetsStatus('Not connected. Data saves locally.', 'warning');
    }
}

function handleSheetsAuthClick() {
    if (!sheetsTokenClient) {
        alert('Google Sheets client is still loading. Please try again in a moment.');
        return;
    }

    if (sheetsSignedIn) {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token, () => {
                console.log('Sheets Token revoked.');
            });
            gapi.client.setToken('');
        }
        sheetsSignedIn = false;
        sheetsAccessToken = null;
        localStorage.removeItem('portal_sheets_token');
        localStorage.removeItem('portal_sheets_token_expiry');
        updateSheetsAuthUI();
        updateSheetsStatus('Disconnected from Google Sheets.', 'neutral');
    } else {
        if (gapi.client.getToken() === null) {
            sheetsTokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            sheetsTokenClient.requestAccessToken({ prompt: '' });
        }
    }
}

function restoreSheetsSession() {
    const storedToken = localStorage.getItem('portal_sheets_token');
    const storedExpiry = localStorage.getItem('portal_sheets_token_expiry');

    if (storedToken && storedExpiry) {
        if (Date.now() < parseInt(storedExpiry)) {
            gapi.client.setToken({ access_token: storedToken });
            sheetsSignedIn = true;
            sheetsAccessToken = storedToken;
            updateSheetsAuthUI();
            console.log('Restored Google Sheets session from storage.');
        } else {
            console.log('Stored Sheets token expired.');
            localStorage.removeItem('portal_sheets_token');
            localStorage.removeItem('portal_sheets_token_expiry');
        }
    }
}

async function initializeGoogleSheetsClient() {
    const start = Date.now();
    const maxWait = 8000;

    while (typeof gapi === 'undefined' && Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 200));
    }
    if (typeof gapi === 'undefined') {
        console.warn('gapi not available; Google Sheets integration disabled.');
        return;
    }

    while ((typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) && Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 200));
    }
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
        console.warn('Google Identity Services not available; Google Sheets integration disabled.');
        return;
    }

    await new Promise((resolve, reject) => {
        gapi.load('client', { callback: resolve, onerror: reject });
    });

    try {
        await gapi.client.init({
            apiKey: TASKS_API_KEY, // Re-using API key used for Tasks
            discoveryDocs: SHEETS_DISCOVERY_DOCS,
        });

        sheetsClientInitialized = true;

        sheetsTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: TASKS_CLIENT_ID, // Re-using Client ID used for Tasks
            scope: SHEETS_SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    sheetsSignedIn = true;
                    sheetsAccessToken = tokenResponse.access_token;

                    const expiresIn = tokenResponse.expires_in || 3599;
                    const expiryTime = Date.now() + (expiresIn * 1000);
                    localStorage.setItem('portal_sheets_token', sheetsAccessToken);
                    localStorage.setItem('portal_sheets_token_expiry', expiryTime);

                    updateSheetsAuthUI();
                }
            },
        });

        restoreSheetsSession();
        updateSheetsAuthUI();
    } catch (e) {
        console.error('Failed to initialize Google Sheets client', e);
        updateSheetsStatus('Google Sheets setup failed.', 'error');
    }
}

async function appendToChecklistSheet(data) {
    if (!sheetsClientInitialized || !sheetsSignedIn || !gapi.client || !gapi.client.sheets) return;

    updateSheetsStatus('Saving to Sheets...', 'neutral');

    const values = [
        [
            data.date,
            data.testGiven === true ? 'Yes' : (data.testGiven === false ? 'No' : ''),
            data.testName || '',
            data.paper1Marks || '',
            data.paper1Total || '',
            data.paper2Marks || '',
            data.paper2Total || '',
            data.qsSolved || '',
            data.qsGoal || '',
            data.badminton === true ? 'Yes' : (data.badminton === false ? 'No' : ''),
            data.mental === true ? 'Yes' : (data.mental === false ? 'No' : ''),
        ]
    ];

    try {
        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:K`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: values
            }
        });

        console.log('Appended to Sheets:', response);
        updateSheetsStatus('Saved to Google Sheets.', 'success');

    } catch (e) {
        console.error('Failed to append to Google Sheets:', e);
        updateSheetsStatus('Error saving to Sheets. Saved locally.', 'error');
    }
}
