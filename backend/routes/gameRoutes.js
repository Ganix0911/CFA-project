import express from 'express';
import {
  createGame,
  joinGame,
  getGame,
  getActiveGames,
  makeMove,
  abandonGame
} from '../controllers/gameController.js';

const router = express.Router();

// Game management routes
router.post('/create', createGame);
router.post('/join/:roomId', joinGame);
router.get('/:roomId', getGame);
router.get('/', getActiveGames);

// Game action routes
router.post('/:roomId/move', makeMove);
router.post('/:roomId/abandon', abandonGame);

export default router;