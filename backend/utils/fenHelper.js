/**
 * FEN (Forsyth-Edwards Notation) utility functions
 * FEN format: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
 * Parts: [board] [active_color] [castling] [en_passant] [halfmove] [fullmove]
 */

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Parse FEN string into components
 */
export const parseFEN = (fen) => {
  const parts = fen.split(' ');
  
  if (parts.length !== 6) {
    throw new Error('Invalid FEN format');
  }

  return {
    board: parts[0],
    activeColor: parts[1], // 'w' or 'b'
    castling: parts[2],    // KQkq or combinations
    enPassant: parts[3],   // target square or '-'
    halfmove: parseInt(parts[4]), // moves since last capture/pawn move
    fullmove: parseInt(parts[5])  // move number
  };
};

/**
 * Build FEN string from components
 */
export const buildFEN = (components) => {
  return [
    components.board,
    components.activeColor,
    components.castling,
    components.enPassant,
    components.halfmove,
    components.fullmove
  ].join(' ');
};

/**
 * Get the active player from FEN
 */
export const getActivePlayer = (fen) => {
  const { activeColor } = parseFEN(fen);
  return activeColor === 'w' ? 'white' : 'black';
};

/**
 * Switch active player in FEN
 */
export const switchActivePlayer = (fen) => {
  const components = parseFEN(fen);
  components.activeColor = components.activeColor === 'w' ? 'b' : 'w';
  
  // Increment fullmove counter when black completes a move
  if (components.activeColor === 'w') {
    components.fullmove += 1;
  }
  
  return buildFEN(components);
};

/**
 * Validate FEN format
 */
export const isValidFEN = (fen) => {
  try {
    const components = parseFEN(fen);
    
    // Validate board part
    const ranks = components.board.split('/');
    if (ranks.length !== 8) return false;
    
    for (const rank of ranks) {
      let squares = 0;
      for (const char of rank) {
        if (char >= '1' && char <= '8') {
          squares += parseInt(char);
        } else if ('prnbqkPRNBQK'.includes(char)) {
          squares += 1;
        } else {
          return false;
        }
      }
      if (squares !== 8) return false;
    }
    
    // Validate active color
    if (!['w', 'b'].includes(components.activeColor)) return false;
    
    // Validate castling rights
    if (!/^[KQkq]*$/.test(components.castling) && components.castling !== '-') return false;
    
    // Validate en passant
    if (components.enPassant !== '-' && !/^[a-h][36]$/.test(components.enPassant)) return false;
    
    // Validate move counters
    if (isNaN(components.halfmove) || components.halfmove < 0) return false;
    if (isNaN(components.fullmove) || components.fullmove < 1) return false;
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get piece at specific square from FEN
 */
export const getPieceAt = (fen, square) => {
  const { board } = parseFEN(fen);
  const ranks = board.split('/');
  
  // Convert square notation (e.g., 'e4') to array indices
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0); // 0-7
  const rank = 8 - parseInt(square[1]); // 0-7 (rank 8 = index 0)
  
  if (rank < 0 || rank > 7 || file < 0 || file > 7) {
    return null;
  }
  
  const rankString = ranks[rank];
  let currentFile = 0;
  
  for (const char of rankString) {
    if (char >= '1' && char <= '8') {
      currentFile += parseInt(char);
    } else {
      if (currentFile === file) {
        return char;
      }
      currentFile += 1;
    }
  }
  
  return null;
};

/**
 * Convert move from algebraic notation to UCI format
 * e.g., 'e2e4' or 'e7e8q' for promotion
 */
export const parseMove = (move) => {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) {
    throw new Error('Invalid move format');
  }
  
  return {
    from: move.substring(0, 2),
    to: move.substring(2, 4),
    promotion: move.length === 5 ? move[4] : null
  };
};

/**
 * Check if it's a specific player's turn
 */
export const isPlayerTurn = (fen, color) => {
  const activePlayer = getActivePlayer(fen);
  return activePlayer === color;
};

/**
 * Get move number from FEN
 */
export const getMoveNumber = (fen) => {
  const { fullmove } = parseFEN(fen);
  return fullmove;
};

/**
 * Check if position allows castling
 */
export const getCastlingRights = (fen) => {
  const { castling } = parseFEN(fen);
  return {
    whiteKingside: castling.includes('K'),
    whiteQueenside: castling.includes('Q'),
    blackKingside: castling.includes('k'),
    blackQueenside: castling.includes('q')
  };
};

/**
 * Get en passant target square
 */
export const getEnPassantSquare = (fen) => {
  const { enPassant } = parseFEN(fen);
  return enPassant === '-' ? null : enPassant;
};

/**
 * Create a simple board representation for debugging
 */
export const fenToBoard = (fen) => {
  const { board } = parseFEN(fen);
  const ranks = board.split('/');
  const boardArray = [];
  
  for (const rank of ranks) {
    const rankArray = [];
    for (const char of rank) {
      if (char >= '1' && char <= '8') {
        for (let i = 0; i < parseInt(char); i++) {
          rankArray.push('.');
        }
      } else {
        rankArray.push(char);
      }
    }
    boardArray.push(rankArray);
  }
  
  return boardArray;
};