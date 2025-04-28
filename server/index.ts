import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { notesRouter } from './api/notes';
import { categoriesRouter } from './api/categories';
import { hashtagsRouter } from './api/hashtags';
import path from 'path';

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..')));

// Routes API
app.use('/api/notes', notesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/hashtags', hashtagsRouter);

// Route pour servir les fichiers HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, '../search.html'));
});

app.get('/categories', (req, res) => {
  res.sendFile(path.join(__dirname, '../categories.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

export default app;