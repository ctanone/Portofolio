const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { createUser, createGoogleUser, getUserByEmail } = require('../config/database');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const electronSessions = new Map();
const ELECTRON_SESSION_TTL_MS = 10 * 60 * 1000;

function createAuthToken(user) {
    return jwt.sign(
        { id: user._id, email: user.email, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function cleanupExpiredSessions() {
    const now = Date.now();
    for (const [state, session] of electronSessions.entries()) {
        if (now - session.createdAt > ELECTRON_SESSION_TTL_MS) {
            electronSessions.delete(state);
        }
    }
}

function buildOAuthClient() {
    return new OAuth2Client({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });
}

async function findOrCreateGoogleUser(payload) {
    let user = await getUserByEmail(payload.email);

    if (!user) {
        const defaultUsername = payload.name ? payload.name : payload.email.split('@')[0];
        const fallbackUsername = `${defaultUsername}-${crypto.randomBytes(3).toString('hex')}`;
        user = await createGoogleUser(fallbackUsername, payload.email, payload.sub);
    }

    return user;
}

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = await getUserByEmail(email);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email' });
        }

        if (user.authProvider === 'google' || !user.password) {
            return res.status(400).json({ error: 'Use Google Sign-In for this account' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Wrong password' });
        }

        const token = createAuthToken(user);
        return res.status(200).json({
            message: 'Login successful',
            token,
            user: { id: user._id, email: user.email, username: user.username },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Signup endpoint
router.post('/signup/user', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password required' });
        }

        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            if (existingUser.authProvider === 'google' || !existingUser.password) {
                return res.status(409).json({ error: 'Email already registered via Google Sign-In' });
            }
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await createUser(username, email, hashedPassword);
        const token = createAuthToken(user);

        return res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: user._id, email: user.email, username: user.username },
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Google One Tap / GIS ID token endpoint (web browser flow)
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;

        if (!process.env.GOOGLE_CLIENT_ID) {
            return res.status(500).json({ error: 'GOOGLE_CLIENT_ID is not configured' });
        }

        if (!credential) {
            return res.status(400).json({ error: 'Google credential is required' });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email || !payload.sub || !payload.email_verified) {
            return res.status(401).json({ error: 'Invalid Google token payload' });
        }

        const user = await findOrCreateGoogleUser(payload);
        const token = createAuthToken(user);

        return res.status(200).json({
            message: 'Google login successful',
            token,
            user: { id: user._id, email: user.email, username: user.username },
        });
    } catch (error) {
        console.error('Google login error:', error);
        return res.status(401).json({ error: 'Google authentication failed', details: error.message });
    }
});

// Electron OAuth start endpoint: returns auth URL + state.
router.post('/google/electron/start', async (req, res) => {
    try {
        cleanupExpiredSessions();

        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
            return res.status(500).json({ error: 'Google OAuth env vars are incomplete' });
        }

        const state = crypto.randomBytes(24).toString('hex');
        const oauthClient = buildOAuthClient();
        const authUrl = oauthClient.generateAuthUrl({
            access_type: 'offline',
            scope: ['openid', 'email', 'profile'],
            state,
            prompt: 'select_account',
        });

        electronSessions.set(state, {
            status: 'pending',
            createdAt: Date.now(),
        });

        return res.status(200).json({ state, authUrl, expiresIn: Math.floor(ELECTRON_SESSION_TTL_MS / 1000) });
    } catch (error) {
        console.error('Electron Google start error:', error);
        return res.status(500).json({ error: 'Unable to initialize Google OAuth', details: error.message });
    }
});

// Electron OAuth callback target for system browser.
router.get('/google/electron/callback', async (req, res) => {
    const { state, code, error } = req.query;

    if (!state || !electronSessions.has(state)) {
        return res.status(400).send('Invalid or expired login session. You may close this tab.');
    }

    const session = electronSessions.get(state);

    if (error) {
        session.status = 'error';
        session.error = String(error);
        electronSessions.set(state, session);
        return res.status(400).send('Google sign-in was canceled or failed. You may close this tab.');
    }

    if (!code) {
        session.status = 'error';
        session.error = 'Missing authorization code';
        electronSessions.set(state, session);
        return res.status(400).send('Missing authorization code. You may close this tab.');
    }

    try {
        const oauthClient = buildOAuthClient();
        const tokenResponse = await oauthClient.getToken(String(code));
        const idToken = tokenResponse.tokens?.id_token;

        if (!idToken) {
            throw new Error('No id_token returned by Google');
        }

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email || !payload.sub || !payload.email_verified) {
            throw new Error('Invalid Google token payload');
        }

        const user = await findOrCreateGoogleUser(payload);
        const token = createAuthToken(user);

        electronSessions.set(state, {
            status: 'completed',
            createdAt: session.createdAt,
            token,
            user: { id: user._id, email: user.email, username: user.username },
        });

        return res.status(200).send('Google sign-in successful. Return to the app.');
    } catch (callbackError) {
        console.error('Electron Google callback error:', callbackError);
        electronSessions.set(state, {
            status: 'error',
            createdAt: session.createdAt,
            error: callbackError.message,
        });
        return res.status(401).send('Google sign-in failed. Return to the app and retry.');
    }
});

// Electron polls this endpoint to complete auth after system-browser callback.
router.get('/google/electron/status', (req, res) => {
    cleanupExpiredSessions();
    const { state } = req.query;

    if (!state) {
        return res.status(400).json({ error: 'state is required' });
    }

    const session = electronSessions.get(String(state));
    if (!session) {
        return res.status(404).json({ error: 'Session not found or expired' });
    }

    if (session.status === 'pending') {
        return res.status(200).json({ status: 'pending' });
    }

    if (session.status === 'error') {
        electronSessions.delete(String(state));
        return res.status(200).json({ status: 'error', error: session.error || 'Google OAuth failed' });
    }

    electronSessions.delete(String(state));
    return res.status(200).json({
        status: 'completed',
        token: session.token,
        user: session.user,
    });
});

// Logout endpoint
router.post('/logout', async (req, res) => {
    try {
        return res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Get current user endpoint (protected)
router.get('/user', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        return res.status(200).json({
            user: {
                id: decoded.id,
                email: decoded.email,
                username: decoded.username,
            },
        });
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
