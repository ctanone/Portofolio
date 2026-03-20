    const express = require('express');
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    const { createUser, getUserByEmail } = require('../config/database');

    const router = express.Router();

    // Login endpoint
    router.post('/login', async (req, res) => {
    try {
        console.log('\n=== LOGIN REQUEST RECEIVED ===');
        console.log('Full Request Body:', req.body);
        console.log('Body Type:', typeof req.body);
        console.log('Body Keys:', Object.keys(req.body));
        
        const { email, password } = req.body;
        console.log('Extracted Email:', email, '(Type:', typeof email + ')');
        console.log('Extracted Password:', password, '(Type:', typeof password + ')');
        
        // Check if email and password are provided
        if (!email || !password) {
        console.log('Missing email or password!');
        return res.status(400).json({ error: 'Email and password required' });
        }
        
        // Get user from database
        const user = await getUserByEmail(email);
        
        // Check if user exists
        if (!user) {
        return res.status(401).json({ error: 'Invalid email' });
        }
        
        // Compare passwords using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (isPasswordValid) {
        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(200).json({ 
            message: 'Login successful', 
            token,
            user: { id: user._id, email: user.email, username: user.username } 
        });
        } else {
        res.status(401).json({ error: 'Wrong password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
    });

    // Signup endpoint
    router.post('/signup/user', async (req, res) => {
    try {
        console.log('\n=== SIGNUP REQUEST RECEIVED ===');
        console.log('Full Request Body:', req.body);
        console.log('Body Type:', typeof req.body);
        console.log('Body Keys:', Object.keys(req.body));
        
        const { username, email, password } = req.body;
        console.log('Extracted Username:', username, '(Type:', typeof username + ')');
        console.log('Extracted Email:', email, '(Type:', typeof email + ')');
        console.log('Extracted Password:', password, '(Type:', typeof password + ')');
        
        // Check if all fields are provided
        if (!username || !email || !password) {
        console.log('Missing required fields!');
        return res.status(400).json({ error: 'Username, email, and password required' });
        }
        
        console.log('Checking if user exists:', email);
        
        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
        }
        
        console.log('User does not exist, hashing password');
        
        // Step 2: Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log('Creating user in database');
        
        // Step 3: Create user in database
        const user = await createUser(username, email, hashedPassword);
        
        console.log('User created successfully:', user);
        
        // Generate JWT token
        const token = jwt.sign(
        { id: user._id, email: user.email, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
        );
        
        // Step 4: Send success response with token
        res.status(201).json({ 
        message: 'User registered successfully', 
        token,
        user: { id: user._id, email: user.email, username: user.username } 
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
    });

    // Logout endpoint
    router.post('/logout', async (req, res) => {
    try {
        // Logout is simple - just return success
        // In a real app, you might invalidate tokens in a blacklist
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
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
        
        res.status(200).json({ 
            user: { 
                id: decoded.id, 
                email: decoded.email, 
                username: decoded.username 
            } 
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
    });

    module.exports = router;
