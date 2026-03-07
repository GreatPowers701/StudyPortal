// --- UI & Interaction Logic ---

// Global Variables
let searchTerm = '';
let currentTheme = localStorage.getItem('portal_theme') || 'light';
let filters = {
    wrong: false,
    unattempted: false,
    marked: false,
    starred: false
};
let currentZoom = 1;

// --- Theme Logic ---
function applyTheme() {
    if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('portal_theme', currentTheme);
    applyTheme();
}

// --- Navigation ---
let sidebarOpen = false;

function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (sidebarOpen) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        // small timeout for transition
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

let desktopSidebarCollapsed = false;

function toggleDesktopSidebar() {
    desktopSidebarCollapsed = !desktopSidebarCollapsed;
    const sidebar = document.getElementById('sidebar');
    const texts = document.querySelectorAll('.sidebar-text');
    const logoArea = document.getElementById('sidebar-logo-text');
    const icon = document.getElementById('collapse-icon');

    if (desktopSidebarCollapsed) {
        sidebar.classList.remove('w-64');
        sidebar.classList.add('w-20');
        texts.forEach(t => t.classList.add('opacity-0', 'pointer-events-none'));
        if (logoArea) logoArea.classList.add('opacity-0', 'pointer-events-none');
        if (icon) icon.classList.add('rotate-180');
    } else {
        sidebar.classList.remove('w-20');
        sidebar.classList.add('w-64');
        texts.forEach(t => t.classList.remove('opacity-0', 'pointer-events-none'));
        if (logoArea) logoArea.classList.remove('opacity-0', 'pointer-events-none');
        if (icon) icon.classList.remove('rotate-180');
    }
}

function switchView(viewName) {
    // Hide all views
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-tests').classList.add('hidden');
    document.getElementById('view-analysis').classList.add('hidden');
    document.getElementById('view-test').classList.add('hidden');

    // Show selected view
    document.getElementById(`view-${viewName}`).classList.remove('hidden');

    // Update nav active states
    const navItems = ['home', 'tests', 'analysis'];
    navItems.forEach(item => {
        const btn = document.getElementById(`nav-${item}`);
        if (!btn) return;
        if (item === viewName) {
            btn.className = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400';
        } else {
            btn.className = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300';
        }
    });

    if (viewName === 'home') {
        // Home setup
    } else if (viewName === 'tests') {
        if (typeof renderLibrary === 'function') renderLibrary();
    } else if (viewName === 'analysis') {
        updateAnalysisView();
    }

    // Close sidebar on mobile after navigating
    if (window.innerWidth < 1024 && !!sidebarOpen === true) {
        toggleSidebar();
    }
}

function updateAnalysisView() {
    let totalTests = 0;
    let totalTime = 0;
    let totalQ = 0;
    let globalAttempted = 0;
    let globalCorrect = 0;

    const subjectStats = {};

    if (typeof library === 'undefined') return;

    Object.values(library).forEach(test => {
        totalTests++;
        totalTime += test.timeSpent || 0;

        let testQuestions = 0;
        let testCorrect = 0;
        let testAttempted = 0;

        if (test.key) {
            Object.keys(test.key).forEach(s => {
                const sAns = test.key[s].answers;
                const sProg = test.progress ? (test.progress[s] || {}) : {};

                testQuestions += sAns.length;
                sAns.forEach((_, idx) => {
                    const q = sProg[idx];
                    if (q && q.submitted) {
                        testAttempted++;
                        if (q.correct) testCorrect++;
                    }
                });
            });
        }

        totalQ += testQuestions;
        globalAttempted += testAttempted;
        globalCorrect += testCorrect;

        const subj = (test.subject && test.subject.trim()) ? test.subject.trim() : 'Uncategorised';
        if (!subjectStats[subj]) {
            subjectStats[subj] = { total: 0, correct: 0, attempted: 0 };
        }
        subjectStats[subj].total += testQuestions;
        subjectStats[subj].attempted += testAttempted;
        subjectStats[subj].correct += testCorrect;
    });

    const accuracy = globalAttempted > 0 ? Math.round((globalCorrect / globalAttempted) * 100) : 0;

    const elTotalTests = document.getElementById('analysis-total-tests');
    const elAccuracy = document.getElementById('analysis-accuracy');
    const elQsSolved = document.getElementById('analysis-qs-solved');
    const elTimeSpent = document.getElementById('analysis-time-spent');

    if (elTotalTests) elTotalTests.innerText = totalTests;
    if (elAccuracy) elAccuracy.innerText = `${accuracy}%`;
    if (elQsSolved) elQsSolved.innerText = globalAttempted;

    if (elTimeSpent) {
        const h = Math.floor(totalTime / 3600);
        const m = Math.floor((totalTime % 3600) / 60);
        elTimeSpent.innerText = `${h}h ${m}m`;
    }

    const breakdownContainer = document.getElementById('analysis-subject-breakdown');
    if (!breakdownContainer) return;
    breakdownContainer.innerHTML = '';

    const subjects = Object.keys(subjectStats).sort((a, b) => {
        if (a === 'Uncategorised') return 1;
        if (b === 'Uncategorised') return -1;
        return a.localeCompare(b);
    });

    if (subjects.length === 0) {
        breakdownContainer.innerHTML = '<p class="text-slate-500 dark:text-slate-400 text-sm">No data available yet.</p>';
        return;
    }

    subjects.forEach(subj => {
        const stats = subjectStats[subj];
        const pct = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0;
        const width = stats.total > 0 ? Math.round((stats.attempted / stats.total) * 100) : 0;

        const row = document.createElement('div');
        row.className = 'space-y-2';
        row.innerHTML = `
            <div class="flex justify-between text-sm font-bold">
                <span class="text-slate-700 dark:text-slate-300">\${subj}</span>
                <span class="text-slate-500 dark:text-slate-400">\${stats.correct} / \${stats.attempted} Correct (\${pct}%)</span>
            </div>
            <div class="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r \${subj === 'Uncategorised' ? 'from-slate-400 to-slate-500' : 'from-indigo-500 to-purple-500'} rounded-full transition-all duration-700" style="width: \${width}%"></div>
            </div>
        `;
        breakdownContainer.appendChild(row);
    });
}

function goHome() {
    if (typeof stopTimer === 'function') stopTimer();
    if (typeof saveAndSync === 'function') saveAndSync();

    activeTestId = null;
    clearFilters();
    switchView('home');
}

function goTests() {
    if (typeof stopTimer === 'function') stopTimer();
    if (typeof saveAndSync === 'function') saveAndSync();

    activeTestId = null;
    clearFilters();
    switchView('tests');
}

function handleSearch(val) {
    searchTerm = val.trim();
    if (typeof renderLibrary === 'function') renderLibrary();
}

// --- PDF Logic ---
function getEmbedLink(link) {
    if (!link) return '';
    try {
        let id = '';
        // Extract ID from standard Google Drive URLs
        // Pattern 1: .../file/d/FILE_ID/...
        if (link.includes('/file/d/')) {
            id = link.split('/file/d/')[1].split('/')[0];
        }
        // Pattern 2: ...?id=FILE_ID...
        else if (link.includes('id=')) {
            id = link.split('id=')[1].split('&')[0];
        }

        if (id) {
            return `https://drive.google.com/file/d/${id}/preview`;
        }
        return link; // Fallback to original if ID extraction fails
    } catch (e) {
        console.warn("Error parsing PDF link:", e);
        return link;
    }
}

function openSolutionPdf() {
    if (!activeTestId || !library[activeTestId] || !library[activeTestId].solutionPdfLink) return;

    const url = getEmbedLink(library[activeTestId].solutionPdfLink);
    const frame = document.getElementById('solution-pdf-frame');

    // Only reload if the source is different to preserve scroll state
    const currentSrc = frame.getAttribute('src');
    if (currentSrc !== url) {
        if (frame) frame.src = url;
    }

    const modal = document.getElementById('solutionPdfModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function zoomPdf(change) {
    const frame = document.getElementById('pdf-frame');
    if (!frame) return;
    currentZoom += change;
    if (currentZoom < 0.5) currentZoom = 0.5;
    if (currentZoom > 3) currentZoom = 3;

    // Use transform scale for zooming
    frame.style.transform = `scale(${currentZoom})`;
    frame.style.transformOrigin = 'top left';

    // Adjust container size to allow scrolling of zoomed content
    frame.style.width = `${100 / currentZoom}%`;
    frame.style.height = `${100 / currentZoom}%`;
}

function togglePdfView() {
    const pdfContainer = document.getElementById('pdf-container');
    const gridContainer = document.getElementById('question-grid-container');
    const grid = document.getElementById('question-grid');
    const btn = document.getElementById('btn-toggle-pdf');

    const isHidden = pdfContainer.classList.contains('hidden');

    if (isHidden) {
        // Show PDF
        pdfContainer.classList.remove('hidden');

        // Shrink Grid
        gridContainer.classList.remove('w-full');
        gridContainer.classList.add('lg:w-1/4'); // Make it even smaller to give PDF more room

        // Adjust grid columns for narrower space - FORCE SINGLE COLUMN
        grid.className = 'grid grid-cols-1 gap-6 pb-20'; // Removed all responsive cols

        btn.classList.add('bg-indigo-100', 'text-indigo-700', 'dark:bg-indigo-900', 'dark:text-indigo-200');
        btn.classList.remove('bg-rose-50', 'text-rose-600');

        // Reset zoom on open
        currentZoom = 1;
        const frame = document.getElementById('pdf-frame');
        if (frame) {
            frame.style.transform = 'scale(1)';
            frame.style.width = '100%';
            frame.style.height = '100%';
        }
    } else {
        // Hide PDF
        pdfContainer.classList.add('hidden');

        // Expand Grid
        gridContainer.classList.add('w-full');
        gridContainer.classList.remove('lg:w-1/4', 'lg:w-1/2');

        // Restore Grid Columns
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 pb-20';

        btn.classList.remove('bg-indigo-100', 'text-indigo-700', 'dark:bg-indigo-900', 'dark:text-indigo-200');
        btn.classList.add('bg-rose-50', 'text-rose-600');
    }
}

// --- Utils ---
function copyExtractionPrompt() {
    const promptText = `You are extracting an answer key from screenshots of a test.
Carefully read the uploaded image(s) and convert the answers into a JSON object that matches EXACTLY the following schema:
{
"Section Name": {
"type": "single | multi | numerical",
"answers": [...]
}
}
Rules:

Detect section headers (e.g., "SECTION (B): MULTIPLE CHOICE QUESTIONS (MULTIPLE OPTIONS CORRECT)", "SECTION (C): ASSERTION-REASONING", etc.).
Use the section title as the JSON key
Determine question type:
If multiple options like "A, B, D" → type = "multi"
If single letter like "A" → type = "single"
If numbers or decimals → type = "numerical"
Preserve answer order strictly by question number.
For multi answers:
Remove spaces
Combine letters into a string (e.g., "ABD", "ACD").
For single answers:
Use a single letter string (e.g., "A").
For numerical answers:
Use numbers or decimal values exactly as shown.
Ignore formatting artifacts like dots, alignment marks, or page decorations.
Do NOT add explanations.
Output ONLY valid JSON — no markdown, no commentary.
Example format:
{
"Multi Correct": {
"type": "multi",
"answers": ["AD", "BD", "ACD"]
},
"Comprehension": {
"type": "single",
"answers": ["C", "A", "B"]
},
"Integer": {
"type": "numerical",
"answers": [4, 6, 3]
}
}
Now extract the answers from the uploaded screenshot(s).

Double-check for OCR mistakes before finalizing.

If uncertain about any answer, mark it as null instead of guessing.`;

    const textArea = document.createElement("textarea");
    textArea.value = promptText;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        const indicator = document.getElementById('autosave-indicator');
        if (indicator) {
            const originalText = indicator.innerText;
            indicator.innerText = 'Prompt Copied! ✓';
            indicator.style.opacity = '1';
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => indicator.innerText = originalText, 300);
            }, 2000);
        }
    } catch (err) {
        console.error('Copy failed', err);
    }

    document.body.removeChild(textArea);
}

// --- Reporting ---
function showReport() {
    const test = library[activeTestId];
    if (!test) return;
    const content = document.getElementById('reportContent');
    content.innerHTML = '';

    let total = 0, totalCorrect = 0, totalAttempted = 0, totalIncorrect = 0, totalPartial = 0;
    const sectionRows = [];

    Object.keys(test.key).forEach(s => {
        const sAns = test.key[s].answers;
        const sProg = test.progress ? (test.progress[s] || {}) : {};
        let sCorrect = 0, sAttempted = 0, sIncorrect = 0, sPartial = 0;

        sAns.forEach((_, idx) => {
            const q = sProg[idx];
            if (q && q.submitted) {
                sAttempted++;
                if (q.correct) sCorrect++;
                else if (q.partial) sPartial++;
                else sIncorrect++;
            }
        });

        total += sAns.length;
        totalCorrect += sCorrect;
        totalAttempted += sAttempted;
        totalIncorrect += sIncorrect;
        totalPartial += sPartial;

        const colClass = sPartial > 0 ? 'grid-cols-4' : 'grid-cols-3';
        const row = document.createElement('div');
        row.className = 'bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800';
        row.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <span class="font-bold text-slate-700 dark:text-slate-300">${s}</span>
                <span class="text-xs font-black px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded uppercase tracking-tighter dark:text-slate-400">Section</span>
            </div>
            <div class="grid ${colClass} gap-2 text-center text-xs">
                <div class="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    <div class="text-slate-400 dark:text-slate-500 font-medium mb-1">Attempted</div>
                    <div class="text-blue-600 dark:text-blue-400 font-bold">${sAttempted} / ${sAns.length}</div>
                </div>
                <div class="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded">
                    <div class="text-slate-400 dark:text-slate-500 font-medium mb-1">Correct</div>
                    <div class="text-emerald-600 dark:text-emerald-400 font-bold">${sCorrect}</div>
                </div>
                ${sPartial > 0 ? `
                <div class="bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                    <div class="text-slate-400 dark:text-slate-500 font-medium mb-1">Partial</div>
                    <div class="text-amber-600 dark:text-amber-400 font-bold">${sPartial}</div>
                </div>` : ''}
                <div class="bg-rose-50 dark:bg-rose-900/20 p-2 rounded">
                    <div class="text-slate-400 dark:text-slate-500 font-medium mb-1">Incorrect</div>
                    <div class="text-rose-600 dark:text-rose-400 font-bold">${sIncorrect}</div>
                </div>
            </div>
        `;
        sectionRows.push(row);
    });

    const pct = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;
    const gridCols = totalPartial > 0 ? 'md:grid-cols-5' : 'md:grid-cols-4';
    const summary = document.createElement('div');
    summary.className = 'bg-slate-900 dark:bg-black text-white rounded-2xl p-6 mb-6';
    summary.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center gap-6">
            <div class="text-center md:text-left">
                <h4 class="text-5xl font-black mb-1">${pct}%</h4>
                <p class="text-slate-400 text-sm font-medium uppercase tracking-widest">Final Score</p>
            </div>
            <div class="h-px w-full md:h-12 md:w-px bg-slate-700 dark:bg-slate-800"></div>
            <div class="grid grid-cols-2 ${gridCols} gap-8 flex-1 w-full text-center">
                <div>
                    <div class="text-2xl font-bold">${totalAttempted}</div>
                    <div class="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Attempted</div>
                </div>
                <div>
                    <div class="text-2xl font-bold text-emerald-400">${totalCorrect}</div>
                    <div class="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Correct</div>
                </div>
                ${totalPartial > 0 ? `
                <div>
                    <div class="text-2xl font-bold text-amber-500">${totalPartial}</div>
                    <div class="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Partial</div>
                </div>` : ''}
                <div>
                    <div class="text-2xl font-bold text-rose-400">${totalIncorrect}</div>
                    <div class="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Incorrect</div>
                </div>
                <div>
                    <div class="text-2xl font-bold text-blue-400 font-mono">${formatTime(test.timeSpent || 0)}</div>
                    <div class="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Time Spent</div>
                </div>
            </div>
        </div>
        ${test.sessionGoal > 0 ? `
        <div class="mt-4 pt-4 border-t border-slate-700 dark:border-slate-800 flex justify-between items-center text-xs">
            <span class="text-slate-400 font-bold uppercase tracking-widest">Session Goal Performance</span>
            <span class="${totalAttempted >= test.sessionGoal ? 'text-emerald-400' : 'text-rose-400'} font-black">
                ${totalAttempted} / ${test.sessionGoal} Questions Attempted
            </span>
        </div>` : ''}
    `;

    content.appendChild(summary);
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    sectionRows.forEach(row => gridContainer.appendChild(row));
    content.appendChild(gridContainer);

    const modal = document.getElementById('reportModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// --- Modal & Filter Logic ---
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function toggleFilter(type) {
    filters[type] = !filters[type];
    updateFilterUI();
    if (typeof renderQuestions === 'function') renderQuestions();
}

function clearFilters() {
    filters = { wrong: false, unattempted: false, marked: false, starred: false };
    updateFilterUI();
    if (typeof renderQuestions === 'function') renderQuestions();
}

function updateFilterUI() {
    const anyActive = filters.wrong || filters.unattempted || filters.marked || filters.starred;
    const clearBtn = document.getElementById('filter-clear');
    if (clearBtn) clearBtn.classList.toggle('hidden', !anyActive);

    Object.keys(filters).forEach(key => {
        const btn = document.getElementById(`filter-${key}`);
        if (btn) {
            if (filters[key]) {
                btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
                btn.classList.remove('bg-white', 'dark:bg-slate-800', 'text-slate-800', 'dark:text-slate-300', 'border-slate-200', 'dark:border-slate-700');
            } else {
                btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
                btn.classList.add('bg-white', 'dark:bg-slate-800', 'text-slate-800', 'dark:text-slate-300', 'border-slate-200', 'dark:border-slate-700');
            }
        }
    });
}
