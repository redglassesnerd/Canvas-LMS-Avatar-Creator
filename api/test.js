import express from 'express';

const app = express();

app.get('/hello', (req, res) => {
  res.status(200).send('Hello from Vercel!');
});

export default app;