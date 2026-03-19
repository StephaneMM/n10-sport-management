import { app } from './server';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 N10 Server running on http://localhost:${PORT}`);
});