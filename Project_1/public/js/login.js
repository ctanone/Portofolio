const API_URL = 'http://localhost:5000/api/auth';
const CONFIG_URL = 'http://localhost:5000/api/config/auth';
const ELECTRON_START_URL = `${API_URL}/google/electron/start`;
const ELECTRON_STATUS_URL = `${API_URL}/google/electron/status`;

let isSignupMode = false;
let googleClientId = '';
let oauthPollTimer = null;

async function parseApiResponse(response) {
  const rawText = await response.text();
  let data = {};

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch (error) {
      data = { rawText };
    }
  }

  return { data, rawText };
}

function setStatus(message, isError = false) {
  const statusEl = document.getElementById('authStatus');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function toggleAuthMode(event) {
  event.preventDefault();
  isSignupMode = !isSignupMode;

  const formTitle = document.getElementById('formTitle');
  const usernameGroup = document.getElementById('usernameGroup');
  const submitBtn = document.getElementById('submitBtn');
  const toggleLink = document.getElementById('toggleLink');

  if (formTitle) formTitle.textContent = isSignupMode ? 'Create Account' : 'Login';
  if (usernameGroup) usernameGroup.style.display = isSignupMode ? 'block' : 'none';
  if (submitBtn) submitBtn.textContent = isSignupMode ? 'Sign Up' : 'Login';
  if (toggleLink) {
    toggleLink.textContent = isSignupMode ? 'Already have an account?' : 'Create Account?';
  }

  setStatus('');
}

async function sendAuthRequest(endpoint, payload) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const { data, rawText } = await parseApiResponse(response);

  if (!response.ok) {
    throw new Error(data.error || rawText || 'Authentication failed');
  }

  return data;
}

function persistAuth(data) {
  if (!data?.token) return;
  localStorage.setItem('auth_token', data.token);
  localStorage.setItem('auth_user', JSON.stringify(data.user || {}));
}

function redirectToMenu() {
  window.location.href = 'PCU_signature_menu.html';
}

function isElectronContext() {
  return !!window.electronAPI?.openExternal;
}

async function handleFormSubmit(event) {
  event.preventDefault();

  try {
    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const username = document.getElementById('username')?.value?.trim();

    if (!email || !password) {
      setStatus('Please enter email and password.', true);
      return;
    }

    const endpoint = isSignupMode ? '/signup/user' : '/login';
    const payload = isSignupMode ? { username, email, password } : { email, password };

    if (isSignupMode && !username) {
      setStatus('Please enter a username.', true);
      return;
    }

    const data = await sendAuthRequest(endpoint, payload);
    persistAuth(data);
    setStatus(isSignupMode ? 'Account created successfully.' : 'Login successful.');

    // Keep signup on the same page; redirect on login.
    if (!isSignupMode) {
      setTimeout(redirectToMenu, 400);
    }
  } catch (error) {
    console.error('Auth error:', error);
    setStatus(error.message || 'Server error', true);
  }
}

async function handleGoogleCredential(response) {
  try {
    if (!response?.credential) {
      setStatus('Google did not return a credential.', true);
      return;
    }

    const data = await sendAuthRequest('/google', { credential: response.credential });
    persistAuth(data);
    setStatus('Signed in with Google.');
    setTimeout(redirectToMenu, 400);
  } catch (error) {
    console.error('Google login error:', error);
    setStatus(error.message || 'Google sign-in failed', true);
  }
}

function initGoogleSignIn() {
  if (isElectronContext()) {
    renderElectronGoogleButton();
    return;
  }

  if (!window.google || !googleClientId) {
    setStatus('Google Sign-In is not configured yet.', true);
    return;
  }

  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleGoogleCredential,
    ux_mode: 'popup',
  });

  window.google.accounts.id.renderButton(
    document.getElementById('googleSignIn'),
    { theme: 'outline', size: 'large', width: 320, text: 'continue_with' }
  );
}

async function openAuthUrl(url) {
  if (isElectronContext()) {
    await window.electronAPI.openExternal(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function pollElectronOAuthStatus(state) {
  if (oauthPollTimer) {
    clearInterval(oauthPollTimer);
  }

  oauthPollTimer = setInterval(async () => {
    try {
      const response = await fetch(`${ELECTRON_STATUS_URL}?state=${encodeURIComponent(state)}`);
      const { data, rawText } = await parseApiResponse(response);

      if (!response.ok) {
        setStatus(data.error || rawText || 'Google sign-in failed.', true);
        clearInterval(oauthPollTimer);
        oauthPollTimer = null;
        return;
      }

      if (data.status === 'pending') {
        return;
      }

      if (data.status === 'error') {
        setStatus(data.error || 'Google sign-in failed.', true);
        clearInterval(oauthPollTimer);
        oauthPollTimer = null;
        return;
      }

      if (data.status === 'completed') {
        persistAuth(data);
        setStatus('Signed in with Google.');
        clearInterval(oauthPollTimer);
        oauthPollTimer = null;
        setTimeout(redirectToMenu, 400);
      }
    } catch (error) {
      console.error('OAuth status poll error:', error);
      setStatus('Failed checking Google login status.', true);
      clearInterval(oauthPollTimer);
      oauthPollTimer = null;
    }
  }, 1500);
}

async function startElectronGoogleOAuth() {
  try {
    setStatus('Opening Google sign-in in your browser...');

    const response = await fetch(ELECTRON_START_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const { data, rawText } = await parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data.error || rawText || 'Unable to start Google sign-in');
    }

    await openAuthUrl(data.authUrl);
    setStatus('Complete sign-in in browser. Waiting for confirmation...');
    await pollElectronOAuthStatus(data.state);
  } catch (error) {
    console.error('Electron OAuth start error:', error);
    setStatus(error.message || 'Unable to start Google sign-in.', true);
  }
}

function renderElectronGoogleButton() {
  const container = document.getElementById('googleSignIn');
  if (!container) return;

  container.innerHTML = '';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'login-button';
  button.id = 'googleOAuthBtn';
  button.textContent = 'Continue with Google';
  button.addEventListener('click', startElectronGoogleOAuth);

  container.appendChild(button);
}

function waitForGoogleIdentity(timeoutMs = 10000) {
  const start = Date.now();

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(timer);
        resolve(true);
        return;
      }

      if (Date.now() - start >= timeoutMs) {
        clearInterval(timer);
        resolve(false);
      }
    }, 100);
  });
}

async function loadAuthConfig() {
  try {
    const response = await fetch(CONFIG_URL);
    const { data } = await parseApiResponse(response);
    if (!response.ok) {
      throw new Error('Unable to load auth configuration');
    }
    googleClientId = data.googleClientId || '';
  } catch (error) {
    console.error('Failed to load auth config:', error);
    googleClientId = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.getElementById('authForm');
  const toggleLink = document.getElementById('toggleLink');

  if (authForm) authForm.addEventListener('submit', handleFormSubmit);
  if (toggleLink) toggleLink.addEventListener('click', toggleAuthMode);

  if (isElectronContext()) {
    loadAuthConfig().then(initGoogleSignIn);
    return;
  }

  Promise.all([loadAuthConfig(), waitForGoogleIdentity()]).then(([, googleLoaded]) => {
    if (!googleLoaded) {
      setStatus('Failed to load Google Sign-In library.', true);
      return;
    }
    initGoogleSignIn();
  });
});

