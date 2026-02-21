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
function goHome() {
    if (typeof stopTimer === 'function') stopTimer();
    if (typeof saveAndSync === 'function') saveAndSync();

    document.getElementById('view-home').classList.remove('hidden');
    document.getElementById('view-test').classList.add('hidden');
    activeTestId = null;
    clearFilters();
    if (typeof renderLibrary === 'function') renderLibrary();
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
