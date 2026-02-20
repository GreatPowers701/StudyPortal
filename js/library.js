// --- Core State Management ---
let library = {};
let activeTestId = null;
let activeSection = null;
let editingTestId = null;

// --- JSON Validation & File Upload ---
function validateJSONSchema(data) {
    if (typeof data !== 'object' || data === null) return false;
    const sections = Object.keys(data);
    if (sections.length === 0) return false;
    for (let section of sections) {
        if (!Array.isArray(data[section].answers)) return false;
        if (!data[section].type) return false;
    }
    return true;
}

function setupFileUpload() {
    const fileIn = document.getElementById('newTestFile');
    const titleIn = document.getElementById('newTestTitle');
    const subjectIn = document.getElementById('newTestSubject');

    if (!fileIn) return;

    fileIn.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const title = titleIn.value.trim() || file.name.replace('.json', '');
        const subject = subjectIn ? subjectIn.value.trim() : '';
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const keyData = JSON.parse(ev.target.result);
                if (!validateJSONSchema(keyData)) {
                    throw new Error("Invalid schema structure.");
                }
                const id = 'test_' + Date.now();

                library[id] = {
                    id: id,
                    title: title,
                    subject: subject || '',
                    key: keyData,
                    progress: {},
                    timeSpent: 0,
                    timerMode: 'countup', // 'countup' or 'countdown'
                    timerLimit: 0, // in seconds
                    sessionGoal: 0,
                    timerRunning: false,
                    lastUpdate: Date.now()
                };

                saveAndSync();
                titleIn.value = '';
                if (subjectIn) subjectIn.value = '';
                renderLibrary();
            } catch (err) {
                alert("Error: " + (err.message || "Invalid JSON format."));
            }
        };
        reader.readAsText(file);
    };
}

// --- Answer Comparison ---
function compareAnswers(user, key) {
    const cleanUser = Array.isArray(user) ? user.slice().sort().join('').toUpperCase() : String(user).trim().toUpperCase();
    const cleanKey = String(key).toUpperCase().trim();
    if (cleanUser === cleanKey) return { correct: true, partial: false };
    const numUser = parseFloat(cleanUser);
    const numKey = parseFloat(cleanKey);
    if (!isNaN(numUser) && !isNaN(numKey)) {
        if (Math.abs(numUser - numKey) < 0.0001) {
            return { correct: true, partial: false };
        }
    }

    // Check partial for multiple-choice (letters)
    if (/^[A-Z]+$/.test(cleanKey) && /^[A-Z]+$/.test(cleanUser)) {
        const userChars = new Set(cleanUser.split(''));
        const keyChars = new Set(cleanKey.split(''));
        let intersection = 0;
        for (let char of userChars) {
            if (keyChars.has(char)) intersection++;
        }
        if (intersection > 0) {
            return { correct: false, partial: true };
        }
    }
    return { correct: false, partial: false };
}

// --- Rendering Home ---
function renderLibrary() {
    try {
        const container = document.getElementById('test-library');
        const countEl = document.getElementById('test-count');
        if (!container || !countEl) return;

        container.innerHTML = '';

        let ids = Object.keys(library);

        // Filter by search term
        if (typeof searchTerm !== 'undefined' && searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            ids = ids.filter(id => {
                const test = library[id];
                return (test.title && test.title.toLowerCase().includes(lowerTerm)) ||
                    (test.subject && test.subject.toLowerCase().includes(lowerTerm));
            });
        }

        countEl.innerText = ids.length;

        if (ids.length === 0) {
            if (typeof searchTerm !== 'undefined' && searchTerm) {
                container.innerHTML = `<div class="col-span-full text-center py-20">
                    <div class="text-slate-300 dark:text-slate-600 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <p class="text-slate-500 dark:text-slate-400 text-lg font-medium">No tests found matching "${searchTerm}"</p>
                    <button onclick="document.getElementById('search-input').value = ''; handleSearch('')" class="mt-4 text-blue-500 hover:underline">Clear Search</button>
                </div>`;
            } else {
                container.innerHTML = `<div class="col-span-full text-center py-20">
                    <div class="text-slate-300 dark:text-slate-600 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <p class="text-slate-500 dark:text-slate-400 text-lg font-medium">No tests found</p>
                    <p class="text-slate-400 dark:text-slate-500 text-sm">Upload a JSON file to get started.</p>
                </div>`;
            }
            return;
        }

        // Group tests by subject, with "Uncategorised" last
        const groups = {};
        ids.forEach(id => {
            const test = library[id];
            if (!test || !test.key) return;
            const subjectLabel = (test.subject && String(test.subject).trim()) ? String(test.subject).trim() : 'Uncategorised';
            if (!groups[subjectLabel]) groups[subjectLabel] = [];
            groups[subjectLabel].push(id);
        });

        const allSubjects = Object.keys(groups).sort((a, b) => {
            if (a === 'Uncategorised') return 1;
            if (b === 'Uncategorised') return -1;
            return a.localeCompare(b);
        });

        allSubjects.forEach(subjectName => {
            const subjectTests = groups[subjectName];

            // Subject header
            const header = document.createElement('div');
            header.className = 'col-span-full flex items-center gap-4 mb-4 mt-8 first:mt-0';
            header.innerHTML = `
                <h3 class="text-lg font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    ${subjectName}
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest border border-slate-200 dark:border-slate-700">${subjectTests.length}</span>
                </h3>
                <div class="h-px bg-slate-200/50 dark:bg-slate-700/50 flex-1"></div>
            `;
            container.appendChild(header);

            // Sort tests alphabetically by title
            subjectTests.sort((a, b) => {
                const titleA = (library[a].title || "").toLowerCase();
                const titleB = (library[b].title || "").toLowerCase();
                return titleA.localeCompare(titleB);
            });

            subjectTests.forEach(id => {
                const test = library[id];
                if (!test || !test.key) return;

                let totalQ = 0, attemptedQ = 0, completedQ = 0;

                Object.keys(test.key).forEach(s => {
                    const sAns = test.key[s].answers;
                    const sProg = test.progress ? (test.progress[s] || {}) : {};
                    totalQ += sAns.length;

                    sAns.forEach((_, idx) => {
                        const q = sProg[idx];
                        if (q) {
                            if (q.submitted) completedQ++;
                            const hasAns = Array.isArray(q.userAns) ? q.userAns.length > 0 : (q.userAns && q.userAns.toString().trim() !== "");
                            if (hasAns) attemptedQ++;
                        }
                    });
                });

                const completedPct = totalQ > 0 ? Math.round((completedQ / totalQ) * 100) : 0;
                const attemptedPct = totalQ > 0 ? Math.round((attemptedQ / totalQ) * 100) : 0;
                const subjectLabel = (test.subject && String(test.subject).trim()) ? String(test.subject).trim() : 'Uncategorised';

                const card = document.createElement('div');
                card.className = 'glass p-6 rounded-3xl cursor-pointer relative group transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-900/10 border border-slate-100 dark:border-slate-800';
                card.onclick = () => openTest(id);

                // Card Header Background Gradient (Optional subtle touch)
                const bgGradient = subjectName === 'Uncategorised'
                    ? 'from-slate-500/10 to-slate-500/5'
                    : 'from-blue-500/10 to-violet-500/5';

                card.innerHTML = `
                <div class="absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-0 group-hover:opacity-100 transition duration-500 rounded-3xl"></div>
                
                <div class="relative z-10">
                    <div class="flex justify-between items-start mb-4">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 shadow-sm">
                            ${subjectLabel}
                        </span>
                        
                        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 transform translate-x-2 group-hover:translate-x-0">
                            <button onclick="event.stopPropagation(); openKeyViewer('${id}')" title="View answer key" class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            <button onclick="event.stopPropagation(); exportSingleTest('${id}')" title="Export Test" class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                            <button onclick="event.stopPropagation(); openEditTest('${id}')" title="Edit Test" class="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                            </button>
                            <button onclick="event.stopPropagation(); deleteTest('${id}')" title="Delete Test" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>

                    <h3 class="font-bold text-lg mb-4 text-slate-800 dark:text-gray-100 pr-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">${test.title}</h3>

                    <div class="space-y-3">
                        <div class="flex justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            <span>Progress</span>
                            <span>${completedPct}%</span>
                        </div>
                        <div class="w-full h-2.5 bg-slate-100 dark:bg-black/40 rounded-full overflow-hidden relative shadow-inner">
                            <!-- Attempted Layer -->
                            <div class="absolute h-full bg-blue-400/30 dark:bg-blue-400/20 transition-all duration-700 ease-out" style="width: ${attemptedPct}%"></div>
                            <!-- Submitted Layer -->
                            <div class="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)] transition-all duration-700 ease-out" style="width: ${completedPct}%"></div>
                        </div>
                        <div class="flex justify-between items-center mt-2">
                            <div class="flex items-center gap-1.5">
                                <div class="w-2 h-2 rounded-full ${completedPct === 100 ? 'bg-emerald-500' : (completedPct > 0 ? 'bg-amber-400' : 'bg-slate-300')}"></div>
                                <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">${completedQ}/${totalQ} Done</span>
                            </div>
                            <span class="font-mono text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">${typeof formatTime === 'function' ? formatTime(test.timeSpent || 0) : '00:00'}</span>
                        </div>
                    </div>
                </div>
            `;
                container.appendChild(card);
            });
        });
    } catch (err) {
        console.error("Render Library Error", err);
    }
}

function openTest(id) {
    try {
        activeTestId = id;
        const test = library[id];
        document.getElementById('view-home').classList.add('hidden');
        document.getElementById('view-test').classList.remove('hidden');
        document.getElementById('active-test-title').innerText = test.title;

        // Handle PDF Button
        const pdfBtn = document.getElementById('btn-toggle-pdf');
        const solutionsBtn = document.getElementById('btn-view-solutions');
        const pdfFrame = document.getElementById('pdf-frame');
        const pdfContainer = document.getElementById('pdf-container');
        const gridContainer = document.getElementById('question-grid-container');
        const grid = document.getElementById('question-grid');

        // Reset View

        // Hide PDF
        if (pdfContainer) pdfContainer.classList.add('hidden');

        // Expand Grid
        if (gridContainer) {
            gridContainer.classList.add('w-full');
            gridContainer.classList.remove('lg:w-1/4', 'lg:w-1/2');
        }

        // Restore Grid Columns
        if (grid) grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 pb-20';


        if (test.pdfLink) {
            if (pdfBtn) {
                pdfBtn.classList.remove('hidden');
                pdfBtn.classList.add('flex');
            }
            // Pre-convert link to embeddable preview format
            const embedUrl = getEmbedLink(test.pdfLink);

            // Only reload if the source is different to preserve scroll state
            const currentSrc = pdfFrame ? pdfFrame.getAttribute('src') : null;
            if (pdfFrame && currentSrc !== embedUrl) {
                pdfFrame.src = embedUrl;
            }

            // Handle Solution PDF Button visibility
            if (test.solutionPdfLink) {
                if (solutionsBtn) {
                    solutionsBtn.classList.remove('hidden');
                    solutionsBtn.classList.add('flex');
                }
            } else {
                if (solutionsBtn) {
                    solutionsBtn.classList.add('hidden');
                    solutionsBtn.classList.remove('flex');
                }
            }
        } else {
            if (pdfBtn) {
                pdfBtn.classList.add('hidden');
                pdfBtn.classList.remove('flex');
            }
            if (pdfFrame) pdfFrame.src = '';
        }

        if (test.timerRunning) {
            const now = Date.now();
            const delta = Math.round((now - test.lastUpdate) / 1000);
            test.lastUpdate = now;
            if (test.timerMode === 'countdown') {
                test.timerLimit -= delta;
                test.timeSpent += delta;
            } else {
                test.timeSpent += delta;
            }
            if (typeof updateWorkspaceTimerUI === 'function') updateWorkspaceTimerUI();
            if (typeof startTimer === 'function') startTimer();
        } else {
            if (typeof updateWorkspaceTimerUI === 'function') updateWorkspaceTimerUI();
        }

        const sections = Object.keys(test.key).sort((a, b) => a.localeCompare(b));
        renderSectionTabs(sections);
        loadSection(sections[0]);
    } catch (err) {
        console.error("Failed to open test", err);
        if (typeof goHome === 'function') goHome();
    }
}

// --- Editing Tests ---
function openEditTest(id) {
    const test = library[id];
    if (!test) return;
    editingTestId = id;
    const titleInput = document.getElementById('edit-test-title');
    const subjectInput = document.getElementById('edit-test-subject');
    const pdfInput = document.getElementById('edit-test-pdf');
    const solutionPdfInput = document.getElementById('edit-test-solution-pdf');

    if (titleInput) titleInput.value = test.title || '';
    if (subjectInput) subjectInput.value = test.subject || '';
    if (pdfInput) pdfInput.value = test.pdfLink || '';
    if (solutionPdfInput) solutionPdfInput.value = test.solutionPdfLink || '';

    const modal = document.getElementById('editTestModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function saveTestEdits() {
    if (!editingTestId || !library[editingTestId]) {
        closeModal('editTestModal');
        editingTestId = null;
        return;
    }
    const test = library[editingTestId];
    const titleInput = document.getElementById('edit-test-title');
    const subjectInput = document.getElementById('edit-test-subject');
    const pdfInput = document.getElementById('edit-test-pdf');
    const solutionPdfInput = document.getElementById('edit-test-solution-pdf');

    const newTitle = titleInput ? titleInput.value.trim() : '';
    const newSubject = subjectInput ? subjectInput.value.trim() : '';
    const newPdf = pdfInput ? pdfInput.value.trim() : '';
    const newSolutionPdf = solutionPdfInput ? solutionPdfInput.value.trim() : '';

    if (newTitle) test.title = newTitle;
    test.subject = newSubject || '';
    const oldPdf = test.pdfLink;
    test.pdfLink = newPdf || '';

    const oldSolutionPdf = test.solutionPdfLink;
    test.solutionPdfLink = newSolutionPdf || '';

    saveAndSync();
    renderLibrary();

    // If currently viewing this test, update the UI immediately
    if (activeTestId === editingTestId) {
        document.getElementById('active-test-title').innerText = test.title;

        const pdfBtn = document.getElementById('btn-toggle-pdf');
        const pdfFrame = document.getElementById('pdf-frame');

        if (test.pdfLink) {
            if (pdfBtn) {
                pdfBtn.classList.remove('hidden');
                pdfBtn.classList.add('flex');
            }
            // Reload frame only if link actually changed
            if (oldPdf !== test.pdfLink) {
                const embedUrl = getEmbedLink(test.pdfLink);
                if (pdfFrame) pdfFrame.src = embedUrl;
            }

            // Update Solution Button Visibility
            const solutionsBtn = document.getElementById('btn-view-solutions');
            if (solutionsBtn) {
                if (test.solutionPdfLink) {
                    solutionsBtn.classList.remove('hidden');
                    solutionsBtn.classList.add('flex');
                } else {
                    solutionsBtn.classList.add('hidden');
                    solutionsBtn.classList.remove('flex');
                }
            }
        } else {
            if (pdfBtn) {
                pdfBtn.classList.add('hidden');
                pdfBtn.classList.remove('flex');
            }
            // Hide container if it was open
            const pdfContainer = document.getElementById('pdf-container');
            if (pdfContainer && !pdfContainer.classList.contains('hidden')) {
                togglePdfView(); // Close it
            }
            if (pdfFrame) pdfFrame.src = '';
        }
    }

    closeModal('editTestModal');
    editingTestId = null;
}

function deleteTest(id) {
    if (confirm("Delete this test and all progress?")) {
        delete library[id];
        saveAndSync();
        renderLibrary();
    }
}

// --- Render Workspace ---
function renderSectionTabs(sections) {
    const container = document.getElementById('section-tabs');
    const dropdown = document.getElementById('section-dropdown');

    if (container) {
        container.innerHTML = '';
        sections.forEach(s => {
            const btn = document.createElement('button');
            btn.className = `px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border border-transparent transition-all duration-300 uppercase tracking-wide`;
            btn.id = `tab-${s.replace(/\s/g, '-')}`;
            btn.innerText = s;
            btn.onclick = () => loadSection(s);
            container.appendChild(btn);
        });
    }

    if (dropdown) {
        dropdown.innerHTML = '';
        sections.forEach(s => {
            const option = document.createElement('option');
            option.value = s;
            option.innerText = s;
            dropdown.appendChild(option);
        });
    }
}

function loadSection(sName) {
    activeSection = sName;
    document.querySelectorAll('#section-tabs button').forEach(b => {
        b.classList.remove('bg-white', 'dark:bg-slate-800', 'text-indigo-600', 'dark:text-indigo-400', 'border-slate-200', 'dark:border-slate-700', 'shadow-md', 'scale-105');
        b.classList.add('text-slate-500', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800/50');
    });
    const activeTab = document.getElementById(`tab-${sName.replace(/\s/g, '-')}`);
    if (activeTab) {
        activeTab.classList.add('bg-white', 'dark:bg-slate-800', 'text-indigo-600', 'dark:text-indigo-400', 'border-slate-200', 'dark:border-slate-700', 'shadow-md', 'scale-105');
        activeTab.classList.remove('text-slate-500', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800/50');
    }

    const dropdown = document.getElementById('section-dropdown');
    if (dropdown) {
        dropdown.value = sName;
    }

    renderQuestions();
}

function renderQuestions() {
    try {
        const container = document.getElementById('question-grid');
        if (!container) return;
        container.innerHTML = '';
        const test = library[activeTestId];
        const section = test.key[activeSection];
        const progress = test.progress[activeSection] || {};

        const isAnyFilterActive = filters.wrong || filters.unattempted || filters.marked || filters.starred;

        section.answers.forEach((ans, idx) => {
            const prog = progress[idx] || { userAns: section.type === 'multi' ? [] : "", submitted: false, marked: false, starred: false };

            if (isAnyFilterActive) {
                let match = false;
                if (filters.wrong && prog.submitted && !prog.correct) match = true;
                if (filters.unattempted && !prog.submitted) match = true;
                if (filters.marked && prog.marked) match = true;
                if (filters.starred && prog.starred) match = true;
                if (!match) return;
            }

            const card = document.createElement('div');
            // Cleaner card style
            card.className = `glass p-6 rounded-3xl border transition-all duration-300 relative ${prog.marked ? 'marked-tint' : ''} ${prog.starred ? 'starred-glow' : ''} ${prog.submitted ? 'border-slate-200/50 dark:border-slate-700/50' : 'border-slate-100 dark:border-slate-800'}`;

            if (prog.submitted) {
                if (prog.correct) {
                    card.classList.add('bg-emerald-50/30', 'dark:bg-emerald-900/10', 'border-emerald-200/50', 'dark:border-emerald-900/30');
                } else {
                    card.classList.add('bg-rose-50/30', 'dark:bg-rose-900/10', 'border-rose-200/50', 'dark:border-rose-900/30');
                }
            }

            const qHeader = `
                <div class="flex justify-between items-start mb-6">
                    <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 shadow-inner">
                        ${idx + 1}
                    </span>
                    <div class="flex gap-2">
                        <button onclick="editNote(${idx})" title="Add/Edit Note" class="p-1.5 rounded-full transition ${prog.note ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 shadow-sm' : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
                            </svg>
                        </button>
                        <button onclick="toggleStar(${idx})" class="p-1.5 rounded-full transition ${prog.starred ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30 shadow-sm' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        </button>
                        <button onclick="toggleMark(${idx})" class="p-1.5 rounded-full transition ${prog.marked ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 shadow-sm' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                            </svg>
                        </button>
                    </div>
                </div>
            `;

            let inputHtml = '';
            if (section.type === 'single' || (activeSection === "Section G (Match)" && idx >= 6)) {
                inputHtml = `<div class="grid grid-cols-4 gap-3 mb-6">` + ['A', 'B', 'C', 'D'].map(o => `
                    <button onclick="selectSingle(${idx}, '${o}')" ${prog.submitted ? 'disabled' : ''} 
                        class="aspect-square rounded-2xl font-bold transition-all duration-200 flex items-center justify-center text-lg ${prog.userAns === o ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105 border-transparent' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'}">
                        ${o}
                    </button>
                `).join('') + `</div>`;
            } else if (section.type === 'multi') {
                inputHtml = `<div class="grid grid-cols-4 gap-3 mb-6">` + ['A', 'B', 'C', 'D'].map(o => `
                    <button onclick="selectMulti(${idx}, '${o}')" ${prog.submitted ? 'disabled' : ''} 
                        class="aspect-square rounded-2xl font-bold transition-all duration-200 flex items-center justify-center text-lg ${prog.userAns.includes(o) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105 border-transparent' : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'}">
                        ${o}
                    </button>
                `).join('') + `</div>`;
            } else {
                inputHtml = `<div class="relative mb-6">
                    <input type="text" placeholder="Type answer..." value="${prog.userAns || ''}" oninput="updateText(${idx}, this.value)" ${prog.submitted ? 'disabled' : ''} 
                    class="glass-input w-full px-5 py-4 rounded-xl text-lg text-center font-mono text-slate-900 dark:text-white outline-none disabled:opacity-60 placeholder:text-slate-300 dark:placeholder:text-slate-600">
                    ${!prog.submitted && prog.userAns ? `<button onclick="updateText(${idx}, ''); renderQuestions();" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition p-1 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button>` : ''}
                    </div>`;
            }

            const submitBtn = `<button onclick="submitQuestion(${idx})" ${prog.submitted ? 'disabled' : ''} 
                class="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 ${prog.submitted ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:shadow-lg hover:-translate-y-0.5'}">
                ${prog.submitted ? 'Submitted' : 'Submit Answer'}
            </button>`;

            const feedback = `<div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 ${prog.submitted || prog.justAttemptedWrong ? 'block' : 'hidden'} animate-fade-in">
                ${prog.submitted ? (
                    prog.correct ?
                        '<div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg> Correct Answer</div>' :
                        `<div class="flex items-start gap-2 text-rose-500 dark:text-rose-400 font-bold text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
                        <div>
                            <span>${prog.partial ? 'Partially correct' : 'Incorrect'}</span>
                            <div class="text-slate-500 dark:text-slate-400 font-normal text-xs mt-1">Correct Answer: <span class="font-mono font-bold">${ans}</span></div>
                        </div>
                    </div>`
                ) : (
                    prog.justAttemptedWrong ?
                        `<div class="flex items-center gap-2 text-amber-500 dark:text-amber-400 font-bold text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg> 
                        ${prog.partialTryAgain ? 'Partially correct. Try again!' : 'Incorrect. Try again!'}
                    </div>` : ''
                )}
            </div>`;

            let noteHtml = '';
            if (prog.isEditingNote) {
                noteHtml = `
                <div class="mt-4 relative animate-fade-in">
                    <textarea id="note-input-${idx}" rows="2" placeholder="Type your note here..." class="glass-input w-full px-4 py-3 rounded-xl text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 resize-none">${prog.note || ''}</textarea>
                    <div class="flex justify-end gap-2 mt-2">
                        <button onclick="cancelNote(${idx})" class="text-xs px-3 py-1.5 rounded-lg font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancel</button>
                        <button onclick="saveNote(${idx})" class="text-xs px-3 py-1.5 rounded-lg font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition">Save Note</button>
                    </div>
                </div>`;
            } else if (prog.note) {
                noteHtml = `
                <div class="mt-4 p-3 bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl relative group">
                    <div class="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1.5 flex justify-between items-center opacity-80 uppercase tracking-widest">
                        <span class="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
                            </svg>
                            Note
                        </span>
                        <div class="flex gap-2">
                            <button onclick="editNote(${idx})" title="Edit Note" class="text-slate-400 hover:text-amber-600 transition opacity-0 group-hover:opacity-100">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                            </button>
                            <button onclick="deleteNote(${idx})" title="Delete Note" class="text-slate-400 hover:text-rose-600 transition opacity-0 group-hover:opacity-100">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="text-sm text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap leading-relaxed">${prog.note}</div>
                </div>`;
            }

            card.innerHTML = qHeader + inputHtml + submitBtn + noteHtml + feedback;
            container.appendChild(card);
        });

        if (container.innerHTML === '') {
            container.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400 dark:text-slate-500 italic">No questions match the current filters.</div>`;
        }

    } catch (err) {
        console.error("Render Questions Error", err);
    }
}

// --- Interaction Logic ---
function toggleMark(qIdx) {
    initSectionProgress();
    const prog = library[activeTestId].progress[activeSection][qIdx];
    prog.marked = !prog.marked;
    saveAndSync();
    renderQuestions();
}

function toggleStar(qIdx) {
    initSectionProgress();
    const prog = library[activeTestId].progress[activeSection][qIdx];
    prog.starred = !prog.starred;
    saveAndSync();
    renderQuestions();
}

function editNote(qIdx) {
    initSectionProgress();
    const prog = library[activeTestId].progress[activeSection][qIdx];
    prog.isEditingNote = true;
    renderQuestions();
    setTimeout(() => {
        const input = document.getElementById(`note-input-${qIdx}`);
        if (input) { input.focus(); input.selectionStart = input.value.length; }
    }, 50);
}

function saveNote(qIdx) {
    const input = document.getElementById(`note-input-${qIdx}`);
    if (!input) return;
    initSectionProgress();
    const prog = library[activeTestId].progress[activeSection][qIdx];
    prog.note = input.value.trim();
    prog.isEditingNote = false;
    saveAndSync();
    renderQuestions();
}

function cancelNote(qIdx) {
    initSectionProgress();
    const prog = library[activeTestId].progress[activeSection][qIdx];
    prog.isEditingNote = false;
    renderQuestions();
}

function deleteNote(qIdx) {
    if (!confirm("Delete this note?")) return;
    initSectionProgress();
    const prog = library[activeTestId].progress[activeSection][qIdx];
    prog.note = "";
    prog.isEditingNote = false;
    saveAndSync();
    renderQuestions();
}

function selectSingle(qIdx, val) {
    initSectionProgress();
    const q = library[activeTestId].progress[activeSection][qIdx];
    if (q.submitted) return;
    q.userAns = (q.userAns === val) ? "" : val;
    q.justAttemptedWrong = false;
    renderQuestions();
}

function selectMulti(qIdx, val) {
    initSectionProgress();
    const q = library[activeTestId].progress[activeSection][qIdx];
    if (q.submitted) return;
    let current = q.userAns;
    if (!Array.isArray(current)) current = [];
    if (current.includes(val)) current = current.filter(x => x !== val);
    else current.push(val);
    q.userAns = current;
    q.justAttemptedWrong = false;
    renderQuestions();
}

function updateText(qIdx, val) {
    initSectionProgress();
    const q = library[activeTestId].progress[activeSection][qIdx];
    if (q.submitted) return;
    q.userAns = val;
    q.justAttemptedWrong = false;
}

function initSectionProgress() {
    if (!library[activeTestId].progress) {
        library[activeTestId].progress = {};
    }
    if (!library[activeTestId].progress[activeSection]) {
        library[activeTestId].progress[activeSection] = {};
    }
    const sectionAnswers = library[activeTestId].key[activeSection].answers;
    sectionAnswers.forEach((_, i) => {
        if (!library[activeTestId].progress[activeSection][i]) {
            const type = library[activeTestId].key[activeSection].type;
            library[activeTestId].progress[activeSection][i] = { userAns: type === 'multi' ? [] : "", submitted: false, marked: false, starred: false, note: "" };
        }
    });
}

function submitQuestion(qIdx) {
    initSectionProgress();
    const q = library[activeTestId].progress[activeSection][qIdx];
    const actualAns = library[activeTestId].key[activeSection].answers[qIdx];

    const hasAns = Array.isArray(q.userAns) ? q.userAns.length > 0 : (q.userAns && q.userAns.toString().trim() !== "");
    if (!hasAns) {
        alert("Please select/enter an answer first.");
        return;
    }

    const { correct, partial } = compareAnswers(q.userAns, actualAns);

    if (!correct && !q.attempts) {
        q.attempts = 1;
        q.justAttemptedWrong = true;
        q.partialTryAgain = partial;
    } else {
        q.submitted = true;
        q.correct = correct;
        q.partial = partial;
        q.justAttemptedWrong = false;
        q.partialTryAgain = false;
        q.attempts = (q.attempts || 0) + 1;
    }

    saveAndSync();
    renderQuestions();
}

function submitAllAttempted() {
    if (!activeTestId || !activeSection) return;
    initSectionProgress();

    const test = library[activeTestId];
    const sectionKey = test.key[activeSection];
    const progress = test.progress[activeSection];
    let count = 0;

    sectionKey.answers.forEach((ans, idx) => {
        const q = progress[idx];
        if (q && !q.submitted) {
            const hasAns = Array.isArray(q.userAns) ? q.userAns.length > 0 : (q.userAns && q.userAns.toString().trim() !== "");
            if (hasAns) {
                const { correct, partial } = compareAnswers(q.userAns, ans);
                if (!correct && !q.attempts) {
                    q.attempts = 1;
                    q.justAttemptedWrong = true;
                    q.partialTryAgain = partial;
                } else {
                    q.submitted = true;
                    q.correct = correct;
                    q.partial = partial;
                    q.justAttemptedWrong = false;
                    q.partialTryAgain = false;
                    q.attempts = (q.attempts || 0) + 1;
                }
                count++;
            }
        }
    });

    if (count > 0) {
        saveAndSync();
        renderQuestions();
    } else {
        alert("No new attempted questions to submit in this section.");
    }
}

// --- Library Export/Import ---
function exportLibrary() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(library));
    const dlNode = document.createElement('a');
    dlNode.setAttribute("href", dataStr);
    dlNode.setAttribute("download", `study_portal_full_backup_${Date.now()}.json`);
    dlNode.click();
}

function exportSingleTest(id) {
    const test = library[id];
    if (!test) return;
    const singleTestData = { [id]: test };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(singleTestData));
    const dlNode = document.createElement('a');
    dlNode.setAttribute("href", dataStr);
    dlNode.setAttribute("download", `${test.title.replace(/\s+/g, '_')}_backup.json`);
    dlNode.click();
}

function downloadOriginalKey(id) {
    const test = library[id];
    if (!test) return;
    const originalKey = test.key;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(originalKey, null, 2));
    const dlNode = document.createElement('a');
    dlNode.setAttribute("href", dataStr);
    dlNode.setAttribute("download", `${test.title.replace(/\s+/g, '_')}_original_key.json`);
    dlNode.click();
}

function openKeyViewer(id) {
    const test = library[id];
    if (!test) return;
    const titleEl = document.getElementById('keyViewerTitle');
    const contentEl = document.getElementById('keyViewerContent');
    const downloadBtn = document.getElementById('downloadKeyBtn');

    if (!titleEl || !contentEl) return;

    titleEl.innerText = `Answer Key: ${test.title}`;
    contentEl.innerHTML = '';

    Object.keys(test.key).forEach(sectionName => {
        const section = test.key[sectionName];
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800';

        const sectionHeader = document.createElement('h4');
        sectionHeader.className = 'font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider text-xs';
        sectionHeader.innerText = sectionName;
        sectionDiv.appendChild(sectionHeader);

        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3';

        section.answers.forEach((ans, idx) => {
            const item = document.createElement('div');
            item.className = 'text-[11px] flex flex-col items-center bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700';
            item.innerHTML = `<span class="text-slate-400 dark:text-slate-500 font-bold mb-1">Q${idx + 1}</span> <span class="text-slate-800 dark:text-slate-200 font-black">${ans}</span>`;
            grid.appendChild(item);
        });

        sectionDiv.appendChild(grid);
        contentEl.appendChild(sectionDiv);
    });

    if (downloadBtn) downloadBtn.onclick = () => downloadOriginalKey(id);

    const modal = document.getElementById('keyViewerModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function importLibrary(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (typeof imported !== 'object') throw new Error("Format error");
            library = { ...library, ...imported };
            saveAndSync();
            renderLibrary();
            alert("Library merged successfully.");
        } catch (err) { alert("Invalid backup file."); }
    };
    reader.readAsText(file);
}
