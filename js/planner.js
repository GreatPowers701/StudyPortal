// --- Weekly Planner (Local + Google Tasks) ---

let plannerTasks = [];
let plannerTasksClientInitialized = false;
let plannerTasksSignedIn = false;
let plannerTokenClient;
let plannerAccessToken = null;
const TASKS_CLIENT_ID = '1068803170496-74g9qkb8851fbvamiduik6ik64opqu6e.apps.googleusercontent.com';
const TASKS_API_KEY = 'AIzaSyAEw5jkjWOWj5yiBn-UB2GW-xSGZ6VBiKY';
const TASKS_DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest'];
const TASKS_SCOPES = 'https://www.googleapis.com/auth/tasks';

function loadLocalPlannerTasks() {
    try {
        const raw = localStorage.getItem('portal_planner_tasks');
        if (!raw) {
            plannerTasks = [];
            return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            plannerTasks = parsed;
        } else {
            plannerTasks = [];
        }
    } catch (e) {
        console.error('Failed to load planner tasks from localStorage', e);
        plannerTasks = [];
    }
}

function saveLocalPlannerTasks() {
    try {
        localStorage.setItem('portal_planner_tasks', JSON.stringify(plannerTasks));
    } catch (e) {
        console.error('Failed to save planner tasks', e);
    }
}

function getNext7Days() {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        days.push(d);
    }
    return days;
}

function renderWeeklyPlanner() {
    const container = document.getElementById('weekly-planner-container');
    if (!container) return;

    container.innerHTML = '';
    const days = getNext7Days();

    days.forEach((dayObj, index) => {
        // Format strings
        const dateStr = dayObj.toISOString().split('T')[0]; // YYYY-MM-DD
        const dayName = index === 0 ? 'Today' : (index === 1 ? 'Tomorrow' : dayObj.toLocaleDateString(undefined, { weekday: 'short' }));
        const dateDisplay = dayObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        // Filter tasks for this day
        // Any task without a due date or past due date goes to Today (index 0) if not completed.
        const tasksForDay = plannerTasks.filter(t => {
            if (!t.due) return index === 0;
            if (index === 0 && t.due < dateStr && !t.completed) return true; // overdue tasks show on "Today"
            return t.due === dateStr;
        });

        const numTasks = tasksForDay.length;
        const numCompleted = tasksForDay.filter(t => t.completed).length;

        // Build HTML for the Day Column
        const col = document.createElement('div');
        col.className = `flex-shrink-0 w-64 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 flex flex-col h-[300px] transition group/col`;

        // Highlight "Today"
        if (index === 0) {
            col.classList.add('ring-2', 'ring-emerald-500/30', 'bg-emerald-50/10', 'dark:bg-emerald-900/10');
        }

        col.innerHTML = `
            <div class="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                <div>
                    <h4 class="font-bold text-slate-800 dark:text-slate-100">${dayName}</h4>
                    <span class="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">${dateDisplay}</span>
                </div>
                <div class="text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
                    ${numCompleted}/${numTasks}
                </div>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1" id="planner-list-${dateStr}">
                <!-- Tasks here -->
            </div>

            <div class="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                <input type="text" id="add-task-input-${dateStr}" placeholder="Add task..." class="glass-input flex-1 px-3 py-1.5 rounded-lg text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-400">
                <button onclick="addPlannerTask('${dateStr}')" class="bg-indigo-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold hover:bg-indigo-600 transition shadow-sm">
                    +
                </button>
            </div>
        `;

        container.appendChild(col);

        // Render tasks inside the column
        const listEl = document.getElementById(`planner-list-${dateStr}`);
        if (!tasksForDay.length) {
            listEl.innerHTML = `<div class="text-[10px] text-slate-400 dark:text-slate-500 italic text-center mt-4">Empty</div>`;
        } else {
            tasksForDay.forEach(t => {
                const item = document.createElement('div');
                item.className = 'group flex items-start gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg relative hover:border-slate-300 dark:hover:border-slate-600 transition shadow-sm';

                let textClass = 'flex-1 text-xs text-slate-700 dark:text-slate-200 break-words pt-0.5 leading-relaxed';
                if (t.completed) {
                    textClass = 'flex-1 text-xs text-slate-400 dark:text-slate-500 break-words pt-0.5 leading-relaxed line-through';
                }

                item.innerHTML = `
                    <button onclick="togglePlannerTaskCompleted('${t.id}')" class="mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px] transition ${t.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-400'}">
                        ✓
                    </button>
                    <span class="${textClass}">${t.text}</span>
                    <button onclick="deletePlannerTask('${t.id}')" class="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition text-xs absolute top-2 right-2 bg-white dark:bg-slate-800 rounded">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                `;
                listEl.appendChild(item);
            });
        }
    });

}

function addPlannerTask(dateStr) {
    const input = document.getElementById(`add-task-input-${dateStr}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const task = { id, text, completed: false, googleTaskId: null, due: dateStr };
    plannerTasks.push(task);

    input.value = '';
    saveLocalPlannerTasks();
    renderWeeklyPlanner();

    if (plannerTasksClientInitialized && plannerTasksSignedIn && typeof gapi !== 'undefined' && gapi.client && gapi.client.tasks) {
        createGooglePlannerTask(task);
    }
}

function togglePlannerTaskCompleted(id) {
    const task = plannerTasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveLocalPlannerTasks();
    renderWeeklyPlanner();

    if (plannerTasksClientInitialized && plannerTasksSignedIn && task.googleTaskId && typeof gapi !== 'undefined' && gapi.client && gapi.client.tasks) {
        updateGooglePlannerTaskCompletion(task.googleTaskId, task.completed);
    }
}

function deletePlannerTask(id) {
    const idx = plannerTasks.findIndex(t => t.id === id);
    if (idx < 0) return;

    const task = plannerTasks[idx];
    plannerTasks.splice(idx, 1);
    saveLocalPlannerTasks();
    renderWeeklyPlanner();

    if (plannerTasksClientInitialized && plannerTasksSignedIn && task.googleTaskId && typeof gapi !== 'undefined' && gapi.client && gapi.client.tasks) {
        deleteGooglePlannerTask(task.googleTaskId);
    }
}

// --- Google Tasks Integration for Planner ---

function updatePlannerStatus(message, tone = 'neutral') {
    const statusEl = document.getElementById('planner-status');
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

function updatePlannerAuthUI() {
    const btn = document.getElementById('tasks-connect-btn');
    if (!btn) return;
    if (plannerTasksSignedIn) {
        btn.innerText = 'Disconnect Google Tasks';
        btn.classList.remove('bg-blue-50', 'dark:bg-blue-900/30', 'text-blue-700', 'dark:text-blue-300');
        btn.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-200');
        updatePlannerStatus('Synced with Google Tasks.', 'success');
    } else {
        btn.innerText = 'Connect Google Tasks';
        btn.classList.add('bg-blue-50', 'dark:bg-blue-900/30', 'text-blue-700', 'dark:text-blue-300');
        btn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-200');
        updatePlannerStatus('Google Tasks not connected. Local auto-save is active.', 'warning');
    }
}

function handlePlannerAuthClick() {
    if (!plannerTokenClient) {
        alert('Google Tasks client is still loading. Please try again in a moment.');
        return;
    }

    if (plannerTasksSignedIn) {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token, () => {
                console.log('Token revoked.');
            });
            gapi.client.setToken('');
        }
        plannerTasksSignedIn = false;
        plannerAccessToken = null;
        localStorage.removeItem('portal_tasks_token');
        localStorage.removeItem('portal_tasks_token_expiry');
        updatePlannerAuthUI();
        updatePlannerStatus('Disconnected from Google Tasks.', 'neutral');
    } else {
        if (gapi.client.getToken() === null) {
            plannerTokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            plannerTokenClient.requestAccessToken({ prompt: '' });
        }
    }
}

function restorePlannerSession() {
    const storedToken = localStorage.getItem('portal_tasks_token');
    const storedExpiry = localStorage.getItem('portal_tasks_token_expiry');

    if (storedToken && storedExpiry) {
        if (Date.now() < parseInt(storedExpiry)) {
            gapi.client.setToken({ access_token: storedToken });
            plannerTasksSignedIn = true;
            plannerAccessToken = storedToken;
            updatePlannerAuthUI();
            fetchGooglePlannerTasksIntoLocal();
            console.log('Restored Google Tasks session from storage.');
        } else {
            console.log('Stored token expired.');
            localStorage.removeItem('portal_tasks_token');
            localStorage.removeItem('portal_tasks_token_expiry');
        }
    }
}

async function initializeGooglePlannerClient() {
    if (TASKS_CLIENT_ID.startsWith('REPLACE_') || TASKS_API_KEY.startsWith('REPLACE_')) {
        console.info('Google Tasks keys not configured; to‑dos will remain local-only.');
        return;
    }

    const start = Date.now();
    const maxWait = 8000;

    while (typeof gapi === 'undefined' && Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 200));
    }
    if (typeof gapi === 'undefined') {
        console.warn('gapi not available; Google Tasks integration disabled.');
        return;
    }

    while ((typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) && Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 200));
    }
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
        console.warn('Google Identity Services not available; Google Tasks integration disabled.');
        return;
    }

    await new Promise((resolve, reject) => {
        gapi.load('client', { callback: resolve, onerror: reject });
    });

    try {
        await gapi.client.init({
            apiKey: TASKS_API_KEY,
        });
        await gapi.client.load('tasks', 'v1');

        plannerTasksClientInitialized = true;

        plannerTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: TASKS_CLIENT_ID,
            scope: TASKS_SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    plannerTasksSignedIn = true;
                    plannerAccessToken = tokenResponse.access_token;

                    const expiresIn = tokenResponse.expires_in || 3599;
                    const expiryTime = Date.now() + (expiresIn * 1000);
                    localStorage.setItem('portal_tasks_token', plannerAccessToken);
                    localStorage.setItem('portal_tasks_token_expiry', expiryTime);

                    updatePlannerAuthUI();
                    fetchGooglePlannerTasksIntoLocal();
                }
            },
        });

        restorePlannerSession();
        updatePlannerAuthUI();
    } catch (e) {
        console.error('Failed to initialize Google Tasks client', e);
        updatePlannerStatus('Google Tasks setup failed; using local to‑dos only.', 'error');
    }
}

async function fetchGooglePlannerTasksIntoLocal() {
    if (!plannerTasksClientInitialized || !plannerTasksSignedIn || !gapi.client || !gapi.client.tasks) return;
    try {
        const response = await gapi.client.tasks.tasks.list({
            tasklist: '@default',
            showCompleted: true,
            maxResults: 100
        });
        const items = response.result.items || [];

        const byProviderId = new Map();
        plannerTasks.forEach(t => { if (t.googleTaskId) byProviderId.set(t.googleTaskId, t); });

        // Cleanup tasks that were deleted remotely
        plannerTasks = plannerTasks.filter(t => !t.googleTaskId || items.find(i => i.id === t.googleTaskId));

        items.forEach(item => {
            const text = item.title || '';
            if (!text) return;
            const completed = typeof item.status === 'string' && item.status === 'completed';

            let due = null;
            if (item.due) {
                // Parse the UTC date safely
                due = item.due.substring(0, 10);
            }

            const existing = byProviderId.get(item.id);
            if (existing) {
                existing.text = text;
                existing.completed = completed;
                if (due) existing.due = due;
            } else {
                plannerTasks.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    text,
                    completed,
                    googleTaskId: item.id,
                    due: due
                });
            }
        });

        saveLocalPlannerTasks();
        renderWeeklyPlanner();
        updatePlannerStatus('Synced with Google Tasks (@default list).', 'success');
    } catch (e) {
        console.error('Failed to fetch Google Tasks', e);
        updatePlannerStatus('Could not load Google Tasks; using local list.', 'error');
    }
}

async function createGooglePlannerTask(task) {
    try {
        const res = await gapi.client.tasks.tasks.insert({
            tasklist: '@default',
            resource: {
                title: task.text,
                status: task.completed ? 'completed' : 'needsAction',
                due: task.due ? new Date(task.due + "T00:00:00Z").toISOString() : undefined
            }
        });
        if (res && res.result && res.result.id) {
            task.googleTaskId = res.result.id;
            saveLocalPlannerTasks();
        }
    } catch (e) {
        console.error('Failed to create Google Task', e);
    }
}

async function updateGooglePlannerTaskCompletion(taskId, completed) {
    try {
        const res = await gapi.client.tasks.tasks.get({
            tasklist: '@default',
            task: taskId
        });
        const taskObj = res.result;
        taskObj.status = completed ? 'completed' : 'needsAction';
        if (completed) {
            taskObj.completed = new Date().toISOString();
        } else {
            taskObj.completed = null;
        }
        await gapi.client.tasks.tasks.update({
            tasklist: '@default',
            task: taskId,
            resource: taskObj
        });
    } catch (e) {
        console.error('Failed to update Google Task completion', e);
    }
}

async function deleteGooglePlannerTask(taskId) {
    try {
        await gapi.client.tasks.tasks.delete({
            tasklist: '@default',
            task: taskId
        });
    } catch (e) {
        console.error('Failed to delete Google Task', e);
    }
}
