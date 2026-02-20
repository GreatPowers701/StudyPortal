// --- Firebase Configuration ---

// Global Variables
let auth = null;
let db = null;
let currentUser = null;
let isSyncing = false;
let saveTimeout = null;

async function initializeFirebase() {
    try {
        // Wait briefly for the global `firebase` object to be available
        const start = Date.now();
        while (typeof window.firebase === 'undefined' && Date.now() - start < 5000) {
            await new Promise(r => setTimeout(r, 200));
        }
        if (typeof window.firebase === 'undefined') {
            console.error('Firebase global not found after 5s.');
            alert('Firebase failed to load. Check the browser console and network tab for script loading errors.');
            return;
        }

        const firebaseConfig = {
            apiKey: "AIzaSyDXiGc0rzX6AgFMwKFr4M75V7obm7IlvCo",
            authDomain: "study-portal-638a8.firebaseapp.com",
            projectId: "study-portal-638a8",
            storageBucket: "study-portal-638a8.firebasestorage.app",
            messagingSenderId: "75874243415",
            appId: "1:75874243415:web:7b5af602dafc7cb6de2412",
            measurementId: "G-04Y81SX2K2"
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        db = firebase.firestore();

        // Setup auth state listener
        auth.onAuthStateChanged(async (user) => {
            currentUser = user;
            const userInfo = document.getElementById('user-info');
            const signinBtn = document.getElementById('google-signin-btn');

            if (user) {
                if (userInfo) {
                    userInfo.classList.remove('hidden');
                    userInfo.classList.add('flex');
                }
                if (signinBtn) signinBtn.classList.add('hidden');

                const userNameEl = document.getElementById('user-name');
                const userAvatarEl = document.getElementById('user-avatar');

                if (userNameEl) userNameEl.textContent = user.displayName || user.email;
                if (userAvatarEl) userAvatarEl.src = user.photoURL || 'https://via.placeholder.com/24';

                await loadUserLibraryFromFirestore();
                if (typeof renderLibrary === 'function') renderLibrary();
            } else {
                if (userInfo) {
                    userInfo.classList.add('hidden');
                    userInfo.classList.remove('flex');
                }
                if (signinBtn) signinBtn.classList.remove('hidden');

                // If we want to clear library on logout, uncomment:
                // library = {};
                // But usually we might keep local fallback or just clear it.
                // The original code did: library = {}; renderLibrary();
                library = {};
                if (typeof renderLibrary === 'function') renderLibrary();
            }
        });

        // Setup Google sign-in button
        const signinBtn = document.getElementById('google-signin-btn');
        if (signinBtn) {
            signinBtn.onclick = async () => {
                // OAuth popups won't work from file:// — guide the user
                if (window.location.protocol === 'file:') {
                    alert('Google Sign-In requires the page to be served over HTTP/HTTPS (not file://).\nRun a quick local server (e.g. `python -m http.server 8000`) and open http://localhost:8000/index.html');
                    return;
                }

                if (!auth) {
                    alert('Auth not initialized yet. Please refresh the page.');
                    return;
                }

                try {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    await auth.signInWithPopup(provider);
                } catch (error) {
                    console.error('Sign-in error:', error);
                    alert('Sign-in failed: ' + (error && error.message ? error.message : String(error)));
                }
            };
        }
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

function signOut() {
    if (auth) {
        auth.signOut()
            .catch((error) => alert('Sign-out failed: ' + error.message));
    }
}

// --- Firestore Data Sync ---
async function loadUserLibraryFromFirestore() {
    if (!currentUser) return;

    try {
        const docRef = db.collection('users').doc(currentUser.uid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            library = docSnap.data().library || {};
        } else {
            library = {};
        }
    } catch (error) {
        console.error('Error loading library from Firestore:', error);
        alert('Error loading data. Falling back to local version.');
    }
}

async function saveLibraryToFirestore() {
    if (!currentUser || isSyncing) return;

    isSyncing = true;
    try {
        await db.collection('users').doc(currentUser.uid).set({
            library: library,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            email: currentUser.email
        });

        const indicator = document.getElementById('autosave-indicator');
        if (indicator) {
            indicator.style.opacity = '1';
            setTimeout(() => indicator.style.opacity = '0', 2000);
        }
    } catch (error) {
        console.error('Error saving to Firestore:', error);
    } finally {
        isSyncing = false;
    }
}

// --- Optimized Firestore Syncing ---
function saveAndSync() {
    if (!currentUser) {
        // Fallback to localStorage if not signed in
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            try {
                localStorage.setItem('portal_library', JSON.stringify(library));
                const indicator = document.getElementById('autosave-indicator');
                if (indicator) {
                    indicator.style.opacity = '1';
                    setTimeout(() => indicator.style.opacity = '0', 2000);
                }
            } catch (e) {
                console.error('Save error', e);
            }
        }, 500);
        return;
    }

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveLibraryToFirestore();
    }, 500); // 500ms debounce
}
