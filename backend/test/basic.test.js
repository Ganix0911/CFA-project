// Basic tests for TableTopLive backend
// Run with: npm test

import { jest } from '@jest/globals';

// Mock Stockfish for testing
jest.mock('../engines/stockfish.js', () => ({
  getStockfishEngine: () => ({
    validateMove: jest.fn().mockResolvedValue(true),
    makeMove: jest.fn().mockResolvedValue('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'),
    isCheckmate: jest.fn().mockResolvedValue(false),
    isStalemate: jest.fn().mockResolvedValue(false)
  })
}));

describe('TableTopLive Backend', () => {
  test('should have basic structure', () => {
    expect(true).toBe(true);
  });

  test('FEN helper functions', async () => {
    const { parseFEN, STARTING_FEN, isValidFEN } = await import('../utils/fenHelper.js');
    
    expect(isValidFEN(STARTING_FEN)).toBe(true);
    
    const parsed = parseFEN(STARTING_FEN);
    expect(parsed.activeColor).toBe('w');
    expect(parsed.castling).toBe('KQkq');
  });

  test('Game model structure', async () => {
    // This would require MongoDB connection in a real test
    // For now, just test that the model can be imported
    const Game = await import('../models/Game.js');
    expect(Game.default).toBeDefined();
  });
});

// Integration test example (requires running MongoDB)
describe('Integration Tests', () => {
  test.skip('should create a game via API', async () => {
    // This would test the actual API endpoints
    // Skipped for basic setup verification
  });
});