//Library
const app = express()
const bcrypt = require('bcrypt')
//Middleware
app.use(bodyparser.json())
app.use(express.urlencoded({ extended: true }))
app. use(bcrypt)

//Login

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;  // ← User sends password from UI
    const user = await getUserByEmail(email);
    // Logic for authenticating user
    if (!user) {
      return res.status(401).send('Invalid email');
      // Compare hashed password using bcrypt
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (isPasswordValid) {
      res.status(200).send('Login successful');
    } else {
      res.status(401).send('wrong password');
    }
  } catch (error) {  // ← ...catch the error here
    res.status(500).send('Server error');  // ← Send error response instead of crashing
  }
});

//Logout
app.post('/logout', async (req, res) => {
  try {
    const {email} = req.body;
    const logoutPost = await getLogoutByEmail(email);
    res.status(200).send('Logout successful');
  } catch (error) {
    res.status(500).send('Server error');
  }
});

//signup
app.post('/signup/user', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);
    // Logic to store user with hashed password
    res.status(201).send('User registered successfully');
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).send('Server error');
  }
});

