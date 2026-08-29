import { env } from './config/env';
import { app } from './server';

app.listen(env.PORT, () => {
  console.log(`🚀 N10 Server running on http://localhost:${env.PORT}`);
});
