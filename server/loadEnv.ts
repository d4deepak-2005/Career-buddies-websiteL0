import dotenv from 'dotenv';

// Must run before any other local import that reads process.env (payments, Mongo, admin).
// override: true so a stale Key ID/Secret in the parent shell cannot beat .env.
dotenv.config({ override: true });
