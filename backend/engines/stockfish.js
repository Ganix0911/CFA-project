import { spawn } from 'child_process';
import { EventEmitter } from 'events';

class StockfishEngine extends EventEmitter {
  constructor() {
    super();
    this.engine = null;
    this.isReady = false;
    this.pendingCommands = new Map();
    this.commandId = 0;
    this.initEngine();
  }

  initEngine() {
    try {
      // Try to spawn Stockfish engine
      this.engine = spawn('stockfish');
      
      this.engine.stdout.on('data', (data) => {
        this.handleEngineOutput(data.toString());
      });

      this.engine.stderr.on('data', (data) => {
        console.error('Stockfish stderr:', data.toString());
      });

      this.engine.on('close', (code) => {
        console.log(`Stockfish process exited with code ${code}`);
        this.isReady = false;
        // Attempt to restart engine
        setTimeout(() => this.initEngine(), 1000);
      });

      this.engine.on('error', (error) => {
        console.error('Stockfish engine error:', error);
        this.isReady = false;
      });

      // Initialize engine
      this.sendCommand('uci');
      
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
      throw new Error('Stockfish engine not available');
    }
  }

  handleEngineOutput(output) {
    const lines = output.trim().split('\n');
    
    for (const line of lines) {
      if (line === 'uciok') {
        this.isReady = true;
        this.emit('ready');
      } else if (line.startsWith('bestmove')) {
        this.handleBestMove(line);
      } else if (line.includes('Legal moves:')) {
        this.handleLegalMoves(line);
      }
    }
  }

  sendCommand(command, expectResponse = false) {
    if (!this.engine) {
      throw new Error('Stockfish engine not initialized');
    }

    const commandId = expectResponse ? ++this.commandId : null;
    
    if (expectResponse) {
      return new Promise((resolve, reject) => {
        this.pendingCommands.set(commandId, { resolve, reject });
        this.engine.stdin.write(`${command}\n`);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          if (this.pendingCommands.has(commandId)) {
            this.pendingCommands.delete(commandId);
            reject(new Error('Command timeout'));
          }
        }, 5000);
      });
    } else {
      this.engine.stdin.write(`${command}\n`);
    }
  }

  // Validate if a move is legal in the current position
  async validateMove(fen, move) {
    try {
      await this.waitForReady();
      
      // Set position
      this.sendCommand(`position fen ${fen}`);
      
      // Try to make the move
      this.sendCommand(`position fen ${fen} moves ${move}`);
      
      // Get legal moves to verify
      const legalMoves = await this.getLegalMoves(fen);
      
      return legalMoves.includes(move);
    } catch (error) {
      console.error('Error validating move:', error);
      return false;
    }
  }

  // Get all legal moves for current position
  async getLegalMoves(fen) {
    try {
      await this.waitForReady();
      
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand('go perft 1');
      
      // This is a simplified approach - in production you'd want a more robust method
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve([]);
        }, 1000);

        const handler = (data) => {
          const output = data.toString();
          if (output.includes('Nodes searched:')) {
            clearTimeout(timeout);
            this.engine.stdout.removeListener('data', handler);
            // Parse legal moves from perft output
            const moves = this.parseLegalMovesFromPerft(output);
            resolve(moves);
          }
        };

        this.engine.stdout.on('data', handler);
      });
    } catch (error) {
      console.error('Error getting legal moves:', error);
      return [];
    }
  }

  // Make a move and get the resulting FEN
  async makeMove(fen, move) {
    try {
      await this.waitForReady();
      
      // Validate move first
      const isValid = await this.validateMove(fen, move);
      if (!isValid) {
        throw new Error('Invalid move');
      }

      // Set position and make move
      this.sendCommand(`position fen ${fen} moves ${move}`);
      
      // Get the new FEN position
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Failed to get position'));
        }, 2000);

        this.sendCommand('d'); // Display board command
        
        const handler = (data) => {
          const output = data.toString();
          const fenMatch = output.match(/Fen: (.+)/);
          if (fenMatch) {
            clearTimeout(timeout);
            this.engine.stdout.removeListener('data', handler);
            resolve(fenMatch[1].trim());
          }
        };

        this.engine.stdout.on('data', handler);
      });
    } catch (error) {
      console.error('Error making move:', error);
      throw error;
    }
  }

  // Check if position is checkmate
  async isCheckmate(fen) {
    try {
      const legalMoves = await this.getLegalMoves(fen);
      if (legalMoves.length === 0) {
        return this.isInCheck(fen);
      }
      return false;
    } catch (error) {
      console.error('Error checking for checkmate:', error);
      return false;
    }
  }

  // Check if position is stalemate
  async isStalemate(fen) {
    try {
      const legalMoves = await this.getLegalMoves(fen);
      if (legalMoves.length === 0) {
        return !this.isInCheck(fen);
      }
      return false;
    } catch (error) {
      console.error('Error checking for stalemate:', error);
      return false;
    }
  }

  // Check if current player is in check
  isInCheck(fen) {
    // Simple check detection based on FEN
    // In production, you'd want a more robust implementation
    return fen.includes('+') || fen.includes('#');
  }

  // Wait for engine to be ready
  waitForReady() {
    return new Promise((resolve) => {
      if (this.isReady) {
        resolve();
      } else {
        this.once('ready', resolve);
      }
    });
  }

  // Parse legal moves from perft output (simplified)
  parseLegalMovesFromPerft(output) {
    const moves = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const moveMatch = line.match(/^([a-h][1-8][a-h][1-8][qrbn]?): \d+$/);
      if (moveMatch) {
        moves.push(moveMatch[1]);
      }
    }
    
    return moves;
  }

  // Clean up engine process
  destroy() {
    if (this.engine) {
      this.engine.kill();
      this.engine = null;
      this.isReady = false;
    }
  }
}

// Singleton instance
let stockfishInstance = null;

export const getStockfishEngine = () => {
  if (!stockfishInstance) {
    stockfishInstance = new StockfishEngine();
  }
  return stockfishInstance;
};

export default StockfishEngine;