const app = require('express')();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Welcome to Trial API!');
});

app.get('/trial', (req, res) => {
  res.send('Trial API is working!');
});

app.get('/post', (req, res) => {
  res.send('This is a GET request to /post');
});

app.post('/post', (req, res) => {
  res.send('Post request received!');
});

app.listen(port, () => {
  console.log(`Trial API server is running at http://localhost:${port}`);
});
