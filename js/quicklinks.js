// --- Quick Links Logic ---

let quickLinks = [];

function loadQuickLinks() {
    const storedLinks = localStorage.getItem('portal_quickLinks');
    if (storedLinks) {
        try {
            quickLinks = JSON.parse(storedLinks);
        } catch (e) {
            console.error("Failed to parse quick links:", e);
            quickLinks = [];
        }
    }
}

function saveQuickLinks() {
    localStorage.setItem('portal_quickLinks', JSON.stringify(quickLinks));
}

function renderQuickLinks() {
    const container = document.getElementById('quick-links-list');
    const countEl = document.getElementById('quick-links-count');

    if (!container) return;

    container.innerHTML = '';

    if (countEl) {
        countEl.innerText = `${quickLinks.length} ${quickLinks.length === 1 ? 'link' : 'links'}`;
    }

    if (quickLinks.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-400 dark:text-slate-500 italic text-sm">
                No links added yet.
            </div>
        `;
        return;
    }

    quickLinks.forEach((link, index) => {
        const item = document.createElement('div');
        item.className = 'group flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer';

        // Favicon fetcher (using Google's service)
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${link.url}&sz=32`;

        item.onclick = (e) => {
            // Prevent triggering if delete button was clicked
            if (e.target.closest('.delete-btn')) return;
            window.open(link.url, '_blank');
        };

        item.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden">
                <img src="${faviconUrl}" alt="" class="w-5 h-5 rounded-sm opacity-80" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxsaW5lIHgxPSIyIiB5MT0iMTIiIHgyPSIyMiIgeTI9IjEyIi8+PHBhdGggZD0iTTEyIDJhMTUuMyAxNS4zIDAgMCAxIDQgMTAgMTUuMyAxNS4zIDAgMCAxLTQgMTAgMTUuMyAxNS4zIDAgMCAxLTQtMTAgMTUuMyAxNS4zIDAgMCAxIDQtMTB6Ii8+PC9zdmc+'">
                <div class="flex flex-col truncate">
                    <span class="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">${link.name}</span>
                    <span class="text-[10px] text-slate-400 dark:text-slate-500 truncate">${link.url}</span>
                </div>
            </div>
            <button onclick="deleteQuickLink(${index})" class="delete-btn opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-200" title="Delete Link">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;
        container.appendChild(item);
    });
}

function openAddLinkModal() {
    const modal = document.getElementById('addLinkModal');
    if (modal) {
        // Find inputs and focus first one
        const nameInput = document.getElementById('modal-link-name');
        const urlInput = document.getElementById('modal-link-url');

        if (nameInput) nameInput.value = '';
        if (urlInput) urlInput.value = '';

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        if (nameInput) setTimeout(() => nameInput.focus(), 100);
    }
}

function saveQuickLinkFromModal() {
    const nameInput = document.getElementById('modal-link-name');
    const urlInput = document.getElementById('modal-link-url');

    if (!nameInput || !urlInput) return;

    const name = nameInput.value.trim();
    let url = urlInput.value.trim();

    if (!name || !url) {
        alert("Please enter both a name and a URL.");
        return;
    }

    // Basic URL validation/fix
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    quickLinks.push({ name, url });
    saveQuickLinks();
    renderQuickLinks();

    // Close Modal
    if (typeof closeModal === 'function') {
        closeModal('addLinkModal');
    } else {
        // Fallback if closeModal is not globally available (though it should be from ui.js)
        const modal = document.getElementById('addLinkModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }
}

function deleteQuickLink(index) {
    if (confirm("Remove this link?")) {
        quickLinks.splice(index, 1);
        saveQuickLinks();
        renderQuickLinks();
    }
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    // Only run if the elements exist
    if (document.getElementById('quick-links-list')) {
        loadQuickLinks();
        renderQuickLinks();
    }
});
