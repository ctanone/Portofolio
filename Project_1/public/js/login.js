// Frontend code for Electron UI
const API_URL = 'http://localhost:5000';

// Login Handler
async function handleLogin() {
  try {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }
    
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      alert('Login successful');
      // Redirect to next page or close window
    } else {
      const error = await response.text();
      alert(error);
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Server error');
  }
}

// Signup Handler
async function handleSignup() {
  try {
    const username = document.getElementById('username')?.value;
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    
    if (!username || !email || !password) {
      alert('Please fill all fields');
      return;
    }
    
    const response = await fetch(`${API_URL}/signup/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    
    if (response.ok) {
      alert('User registered successfully');
    } else {
      const error = await response.text();
      alert(error);
    }
  } catch (error) {
    console.error('Signup error:', error);
    alert('Server error');
  }
}

// Logout Handler
async function handleLogout() {
  try {
    const email = document.getElementById('email')?.value;
    
    const response = await fetch(`${API_URL}/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    if (response.ok) {
      alert('Logout successful');
    } else {
      const error = await response.text();
      alert(error);
    }
  } catch (error) {
    console.error('Logout error:', error);
    alert('Server error');
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  if (signupBtn) signupBtn.addEventListener('click', handleSignup);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
});

