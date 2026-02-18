// --- To-Do List (Local + Google Tasks) ---

// Global Variables
let todos = [];
let editingTodoIndex = null;
let tasksClientInitialized = false;
let tasksSignedIn = false;
let tokenClient;
let accessToken = null;
const TASKS_CLIENT_ID = '1068803170496-74g9qkb8851fbvamiduik6ik64opqu6e.apps.googleusercontent.com';
const TASKS_API_KEY = 'AIzaSyAEw5jkjWOWj5yiBn-UB2GW-xSGZ6VBiKY';
const TASKS_DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest'];
const TASKS_SCOPES = 'https://www.googleapis.com/auth/tasks';

function loadLocalTodos() {
    try {
        const raw = localStorage.getItem('portal_todos');
        if (!raw) {
            todos = [];
            return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            todos = parsed;
        } else {
            todos = [];
        }
    } catch (e) {
        console.error('Failed to load todos from localStorage', e);
        todos = [];
    }
}

function saveLocalTodos() {
    try {
        localStorage.setItem('portal_todos', JSON.stringify(todos));
    } catch (e) {
        console.error('Failed to save todos', e);
    }
}

function renderTodos() {
    const listEl = document.getElementById('todo-list');
    const countEl = document.getElementById('todo-count');
    if (!listEl || !countEl) return;

    listEl.innerHTML = '';
    if (!todos.length) {
        listEl.innerHTML = `<div class="text-xs text-slate-400 dark:text-slate-500 italic">No tasks yet. Add your first to‑do above.</div>`;
        countEl.innerText = '0 tasks';
        return;
    }

    todos.forEach((t, idx) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2';

        if (editingTodoIndex === idx) {
            // Edit Mode UI
            row.innerHTML = `
                <input type="text" id="edit-todo-text-${idx}" value="${t.text}" class="flex-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500">
                <input type="date" id="edit-todo-date-${idx}" value="${t.due || ''}" class="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500">
                <button onclick="saveEdit(${idx})" class="text-emerald-500 hover:text-emerald-600 font-bold px-1" title="Save">✔</button>
                <button onclick="cancelEdit()" class="text-slate-400 hover:text-slate-500 font-bold px-1" title="Cancel">✕</button>
            `;
        } else {
            // View Mode UI
            let dueDateHtml = '';
            if (t.due) {
                const dateObj = new Date(t.due);
                const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                dueDateHtml = `<span class="text-[10px] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 whitespace-nowrap flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                    </svg>
                    ${dateStr}
                </span>`;
            }

            row.innerHTML = `
                <button onclick="toggleTodoCompleted(${idx})" class="w-4 h-4 rounded border flex items-center justify-center text-[10px] ${t.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent'}">
                    ✓
                </button>
                <div class="flex-1 text-xs sm:text-sm ${t.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''} flex items-center flex-wrap gap-2">
                    <span>${t.text}</span>
                    ${dueDateHtml}
                </div>
                <button onclick="startEdit(${idx})" class="text-slate-300 hover:text-blue-500 transition text-xs mr-1" title="Edit">✎</button>
                <button onclick="deleteTodo(${idx})" class="text-slate-300 hover:text-rose-500 transition text-xs" title="Delete">✕</button>
            `;
        }
        listEl.appendChild(row);
    });

    const remaining = todos.filter(t => !t.completed).length;
    const plural = todos.length === 1 ? 'task' : 'tasks';
    countEl.innerText = `${todos.length} ${plural} (${remaining} left)`;
}

function addTodo() {
    const input = document.getElementById('todo-input');
    const dateInput = document.getElementById('todo-due-date');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    let due = null;
    if (dateInput && dateInput.value) {
        // Store as YYYY-MM-DD string locally or just invoke date string
        due = dateInput.value;
    }

    const todo = { text, completed: false, googleTaskId: null, due: due };
    todos.unshift(todo);
    input.value = '';
    if (dateInput) dateInput.value = ''; // Reset date picker
    saveLocalTodos();
    renderTodos();

    // If Google Tasks is ready and signed in, also create remotely
    if (tasksClientInitialized && tasksSignedIn && typeof gapi !== 'undefined' && gapi.client && gapi.client.tasks) {
        createGoogleTaskForTodo(todo);
    }
}

function toggleTodoCompleted(idx) {
    if (idx < 0 || idx >= todos.length) return;
    const todo = todos[idx];
    todo.completed = !todo.completed;
    saveLocalTodos();
    renderTodos();

    if (tasksClientInitialized && tasksSignedIn && todo.googleTaskId && typeof gapi !== 'undefined' && gapi.client && gapi.client.tasks) {
        updateGoogleTaskCompletion(todo.googleTaskId, todo.completed);
    }
}

function deleteTodo(idx) {
    if (idx < 0 || idx >= todos.length) return;
    const todo = todos[idx];
    todos.splice(idx, 1);
    saveLocalTodos();
    renderTodos();

    if (tasksClientInitialized && tasksSignedIn && todo.googleTaskId && typeof gapi !== 'undefined' && gapi.client && gapi.client.tasks) {
        deleteGoogleTask(todo.googleTaskId);
    }
}

function startEdit(idx) {
    editingTodoIndex = idx;
    renderTodos();

    // Focus the text input
    setTimeout(() => {
        const input = document.getElementById(`edit-todo-text-${idx}`);
        if (input) input.focus();
    }, 50);
}

function cancelEdit() {
    editingTodoIndex = null;
    renderTodos();
}

function saveEdit(idx) {
    const textInput = document.getElementById(`edit-todo-text-${idx}`);
    const dateInput = document.getElementById(`edit-todo-date-${idx}`);
    if (!textInput) return;

    const newText = textInput.value.trim();
    if (!newText) {
        alert("Task cannot be empty.");
        return;
    }

    const newDue = dateInput && dateInput.value ? dateInput.value : null;
    const todo = todos[idx];

    todo.text = newText;
    todo.due = newDue;

    editingTodoIndex = null;
    saveLocalTodos();
    renderTodos();

    if (tasksClientInitialized && tasksSignedIn && todo.googleTaskId && typeof gapi !== 'undefined' && gapi.client && gapi.client.tasks) {
        updateGoogleTask(todo);
    }
}

function clearCompletedTodos() {
    const remaining = todos.filter(t => !t.completed);
    const removed = todos.length - remaining.length;
    if (!removed) return;
    todos = remaining;
    saveLocalTodos();
    renderTodos();
}

function updateTasksStatus(message, tone = 'neutral') {
    const statusEl = document.getElementById('tasks-status');
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

function updateTasksAuthUI() {
    const btn = document.getElementById('tasks-connect-btn');
    if (!btn) return;
    if (tasksSignedIn) {
        btn.innerText = 'Disconnect Tasks';
        btn.classList.remove('bg-blue-50', 'dark:bg-blue-900/30', 'text-blue-700', 'dark:text-blue-300');
        btn.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-200');
        updateTasksStatus('Synced with your default Google Tasks list.', 'success');
    } else {
        btn.innerText = 'Connect Google Tasks';
        btn.classList.add('bg-blue-50', 'dark:bg-blue-900/30', 'text-blue-700', 'dark:text-blue-300');
        btn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-200');
        updateTasksStatus('Google Tasks not connected. You can still add local to‑dos (not synced).', 'warning');
    }
}

function handleTasksAuthClick() {
    if (!tokenClient) {
        alert('Google Tasks client is still loading. Please try again in a moment.');
        return;
    }

    if (tasksSignedIn) {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token, () => {
                console.log('Token revoked.');
            });
            gapi.client.setToken('');
        }
        tasksSignedIn = false;
        accessToken = null;
        localStorage.removeItem('portal_tasks_token');
        localStorage.removeItem('portal_tasks_token_expiry');
        updateTasksAuthUI();
        updateTasksStatus('Disconnected from Google Tasks.', 'neutral');
    } else {
        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    }
}

function restoreTasksSession() {
    const storedToken = localStorage.getItem('portal_tasks_token');
    const storedExpiry = localStorage.getItem('portal_tasks_token_expiry');

    if (storedToken && storedExpiry) {
        if (Date.now() < parseInt(storedExpiry)) {
            gapi.client.setToken({ access_token: storedToken });
            tasksSignedIn = true;
            accessToken = storedToken;
            updateTasksAuthUI();
            fetchGoogleTasksIntoTodos();
            console.log('Restored Google Tasks session from storage.');
        } else {
            console.log('Stored token expired.');
            localStorage.removeItem('portal_tasks_token');
            localStorage.removeItem('portal_tasks_token_expiry');
        }
    }
}

async function initializeGoogleTasksClient() {
    // If the developer hasn't configured the keys yet, keep everything local-only.
    if (TASKS_CLIENT_ID.startsWith('REPLACE_') || TASKS_API_KEY.startsWith('REPLACE_')) {
        console.info('Google Tasks keys not configured; to‑dos will remain local-only.');
        return;
    }

    const start = Date.now();
    const maxWait = 8000;

    // Wait for gapi to load
    while (typeof gapi === 'undefined' && Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 200));
    }
    if (typeof gapi === 'undefined') {
        console.warn('gapi not available; Google Tasks integration disabled.');
        return;
    }

    // Wait for Google Identity Services (GIS) library
    while ((typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) && Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 200));
    }
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
        console.warn('Google Identity Services not available; Google Tasks integration disabled.');
        return;
    }

    // Load gapi client module
    await new Promise((resolve, reject) => {
        gapi.load('client', { callback: resolve, onerror: reject });
    });

    try {
        // Initialize gapi client with API key only (no discoveryDocs here)
        await gapi.client.init({
            apiKey: TASKS_API_KEY,
        });

        // Load the Tasks API discovery doc separately
        await gapi.client.load('tasks', 'v1');

        tasksClientInitialized = true;

        // Initialize the Token Client via GIS
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: TASKS_CLIENT_ID,
            scope: TASKS_SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    tasksSignedIn = true;
                    accessToken = tokenResponse.access_token;

                    // Save token (expires_in is usually 3599 seconds)
                    const expiresIn = tokenResponse.expires_in || 3599;
                    const expiryTime = Date.now() + (expiresIn * 1000);
                    localStorage.setItem('portal_tasks_token', accessToken);
                    localStorage.setItem('portal_tasks_token_expiry', expiryTime);

                    updateTasksAuthUI();
                    fetchGoogleTasksIntoTodos();
                }
            },
        });

        restoreTasksSession();
        updateTasksAuthUI();
    } catch (e) {
        console.error('Failed to initialize Google Tasks client', e);
        updateTasksStatus('Google Tasks setup failed; using local to‑dos only.', 'error');
    }
}

async function fetchGoogleTasksIntoTodos() {
    if (!tasksClientInitialized || !tasksSignedIn || !gapi.client || !gapi.client.tasks) return;
    try {
        const response = await gapi.client.tasks.tasks.list({
            tasklist: '@default',
            showCompleted: true,
            maxResults: 50
        });
        const items = response.result.items || [];

        // Merge remote tasks into local list by text label
        const byText = new Map();
        todos.forEach(t => {
            byText.set(t.text, t);
        });

        items.forEach(item => {
            const text = item.title || '';
            if (!text) return;
            const completed = typeof item.status === 'string' && item.status === 'completed'; // status is 'needsAction' or 'completed'

            let due = null;
            if (item.due) {
                due = item.due.split('T')[0];
            }

            const existing = byText.get(text);
            if (existing) {
                existing.completed = completed;
                existing.googleTaskId = item.id;
                if (due) existing.due = due;
            } else {
                todos.push({
                    text,
                    completed,
                    googleTaskId: item.id,
                    due: due
                });
            }
        });

        saveLocalTodos();
        renderTodos();
        updateTasksStatus('Synced with Google Tasks (@default list).', 'success');
    } catch (e) {
        console.error('Failed to fetch Google Tasks', e);
        updateTasksStatus('Could not load Google Tasks; working from local list only.', 'error');
    }
}

async function createGoogleTaskForTodo(todo) {
    try {
        const res = await gapi.client.tasks.tasks.insert({
            tasklist: '@default',
            resource: {
                title: todo.text,
                status: todo.completed ? 'completed' : 'needsAction',
                due: todo.due ? new Date(todo.due).toISOString() : undefined
            }
        });
        if (res && res.result && res.result.id) {
            todo.googleTaskId = res.result.id;
            saveLocalTodos();
        }
    } catch (e) {
        console.error('Failed to create Google Task', e);
    }
}

async function updateGoogleTaskCompletion(taskId, completed) {
    try {
        const res = await gapi.client.tasks.tasks.get({
            tasklist: '@default',
            task: taskId
        });
        const task = res.result;
        task.status = completed ? 'completed' : 'needsAction';
        if (completed) {
            task.completed = new Date().toISOString();
        } else {
            task.completed = null;
        }
        await gapi.client.tasks.tasks.update({
            tasklist: '@default',
            task: taskId,
            resource: task
        });
    } catch (e) {
        console.error('Failed to update Google Task completion', e);
    }
}

async function deleteGoogleTask(taskId) {
    try {
        await gapi.client.tasks.tasks.delete({
            tasklist: '@default',
            task: taskId
        });
    } catch (e) {
        console.error('Failed to delete Google Task', e);
    }
}

async function updateGoogleTask(todo) {
    try {
        // First get existing task to preserve other fields if needed, 
        // but mainly we just overwrite title and due date.
        const res = await gapi.client.tasks.tasks.get({
            tasklist: '@default',
            task: todo.googleTaskId
        });
        const task = res.result;

        task.title = todo.text;
        task.due = todo.due ? new Date(todo.due).toISOString() : null; // Parsing 'YYYY-MM-DD' creates a UTC midnight date, which is what we want for full-day tasks usually

        await gapi.client.tasks.tasks.update({
            tasklist: '@default',
            task: todo.googleTaskId,
            resource: task
        });
    } catch (e) {
        console.error('Failed to update Google Task', e);
    }
}
