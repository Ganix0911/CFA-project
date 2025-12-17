import React, { useState, useEffect } from 'react';
import { GameState, PlayerColor, Cell, Move, BoardPiece, PieceType } from '@/types';

interface GameBoardProps {
  gameState: GameState;
  myColor: PlayerColor;
  onMove: (move: Move) => void;
}

const ChessPieceIcons: Record<PieceType, string> = {
  KING: '♔',
  QUEEN: '♕',
  ROOK: '♖',
  BISHOP: '♗',
  KNIGHT: '♘',
  PAWN: '♙',
  MAN: '', // Checkers piece
};

// Helper function to calculate valid moves based on game rules
const getValidMoves = (gameState: GameState, piece: BoardPiece): Cell[] => {
  const { board, gameType } = gameState;
  const moves: Cell[] = [];
  const { color, type, position } = piece;
  const { row, col } = position;

  const isWithinBoard = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const isEmpty = (r: number, c: number) => board[r][c] === null;
  const isEnemy = (r: number, c: number) => board[r][c] !== null && board[r][c]?.color !== color;

  if (gameType === 'CHESS') {
    // Blue (Top) moves down (+1), Red (Bottom) moves up (-1)
    const direction = color === PlayerColor.BLUE ? 1 : -1;

    switch (type) {
      case 'PAWN':
        // 1. Move forward 1
        if (isWithinBoard(row + direction, col) && isEmpty(row + direction, col)) {
          moves.push({ row: row + direction, col });
          // 2. Move forward 2 (if at starting rank and path clear)
          const startRow = color === PlayerColor.BLUE ? 1 : 6;
          if (row === startRow && isEmpty(row + (direction * 2), col)) {
            moves.push({ row: row + (direction * 2), col });
          }
        }
        // 3. Captures
        [col - 1, col + 1].forEach(c => {
           if (isWithinBoard(row + direction, c) && isEnemy(row + direction, c)) {
             moves.push({ row: row + direction, col: c });
           }
        });
        break;

      case 'ROOK':
      case 'BISHOP':
      case 'QUEEN':
        const dirs: [number, number][] = [];
        if (type !== 'BISHOP') dirs.push([0, 1], [0, -1], [1, 0], [-1, 0]); // Orthogonal
        if (type !== 'ROOK') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]); // Diagonal
        
        dirs.forEach(([dr, dc]) => {
          let r = row + dr;
          let c = col + dc;
          while (isWithinBoard(r, c)) {
            if (isEmpty(r, c)) {
              moves.push({ row: r, col: c });
            } else {
              if (isEnemy(r, c)) moves.push({ row: r, col: c });
              break; // Blocked
            }
            r += dr;
            c += dc;
          }
        });
        break;

      case 'KNIGHT':
        const jumps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        jumps.forEach(([dr, dc]) => {
          const r = row + dr;
          const c = col + dc;
          if (isWithinBoard(r, c) && (isEmpty(r, c) || isEnemy(r, c))) {
            moves.push({ row: r, col: c });
          }
        });
        break;

      case 'KING':
        const steps = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        steps.forEach(([dr, dc]) => {
          const r = row + dr;
          const c = col + dc;
          if (isWithinBoard(r, c) && (isEmpty(r, c) || isEnemy(r, c))) {
            moves.push({ row: r, col: c });
          }
        });
        break;
    }
  } else {
    // CHECKERS Logic
    const direction = color === PlayerColor.RED ? -1 : 1; 
    const isKing = type === 'KING';
    
    const checkDir = (dRow: number, dCol: number) => {
        const r = row + dRow;
        const c = col + dCol;
        if (isWithinBoard(r, c)) {
            if (isEmpty(r, c)) {
                moves.push({ row: r, col: c });
            } else if (isEnemy(r, c)) {
                // Jump
                const r2 = r + dRow;
                const c2 = c + dCol;
                if (isWithinBoard(r2, c2) && isEmpty(r2, c2)) {
                    moves.push({ row: r2, col: c2 });
                }
            }
        }
    };

    // Forward moves
    checkDir(direction, -1);
    checkDir(direction, 1);
    
    // Backward moves for King
    if (isKing) {
        checkDir(-direction, -1);
        checkDir(-direction, 1);
    }
  }

  return moves;
};

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, myColor, onMove }) => {
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [validMoves, setValidMoves] = useState<Cell[]>([]);
  const { board, turn, lastMove, gameType } = gameState;

  useEffect(() => {
    if (!selectedCell) {
      setValidMoves([]);
      return;
    }

    const piece = board[selectedCell.row][selectedCell.col];
    if (!piece) return;

    // Use the comprehensive logic
    setValidMoves(getValidMoves(gameState, piece));
  }, [selectedCell, board, gameState]);

  const handleCellClick = (row: number, col: number) => {
    if (turn !== myColor) return;

    const clickedPiece = board[row][col];

    if (clickedPiece && clickedPiece.color === myColor) {
      setSelectedCell({ row, col });
      return;
    }

    const isValidMove = validMoves.some(m => m.row === row && m.col === col);
    if (selectedCell && isValidMove) {
      const pieceToMove = board[selectedCell.row][selectedCell.col];
      if (pieceToMove) {
        onMove({
          from: selectedCell,
          to: { row, col },
          pieceId: pieceToMove.id
        });
        setSelectedCell(null);
      }
    } else {
      setSelectedCell(null);
    }
  };

  const isDarkSquare = (r: number, c: number) => (r + c) % 2 === 1;

  const renderPiece = (piece: BoardPiece) => {
    if (gameType === 'CHECKERS') {
      return (
        <div
          className={`
            w-[80%] h-[80%] rounded-full shadow-[0_4px_6px_rgba(0,0,0,0.4)]
            transform transition-all duration-300
            flex items-center justify-center
            ${piece.color === PlayerColor.RED 
              ? 'bg-gradient-to-br from-red-500 to-red-700 ring-2 ring-red-900' 
              : 'bg-gradient-to-br from-blue-400 to-blue-600 ring-2 ring-blue-900'
            }
          `}
        >
          {piece.type === 'KING' && <span className="text-2xl text-white/80">♔</span>}
          {piece.type !== 'KING' && <div className="w-[70%] h-[70%] rounded-full border border-white/20" />}
        </div>
      );
    } else {
      // Chess
      return (
        <div className={`
          text-5xl select-none transform transition-transform duration-300 hover:scale-110
          ${piece.color === PlayerColor.RED 
            ? 'text-red-500 drop-shadow-[0_2px_2px_rgba(255,0,0,0.5)]' 
            : 'text-blue-500 drop-shadow-[0_2px_2px_rgba(0,0,255,0.5)]'
          }
        `}>
          {ChessPieceIcons[piece.type]}
        </div>
      );
    }
  };

  return (
    <div className="aspect-square w-full max-w-[600px] bg-zinc-800 p-3 rounded-lg shadow-2xl border border-zinc-700 mx-auto">
      <div className="grid grid-cols-8 grid-rows-8 h-full w-full border-2 border-zinc-900 rounded bg-zinc-900">
        {board.map((row, rIdx) => 
          row.map((piece, cIdx) => {
            const isDark = isDarkSquare(rIdx, cIdx);
            const isSelected = selectedCell?.row === rIdx && selectedCell?.col === cIdx;
            const isValid = validMoves.some(m => m.row === rIdx && m.col === cIdx);
            const isLastMoveSrc = lastMove?.from.row === rIdx && lastMove?.from.col === cIdx;
            const isLastMoveDst = lastMove?.to.row === rIdx && lastMove?.to.col === cIdx;

            return (
              <div
                key={`${rIdx}-${cIdx}`}
                onClick={() => handleCellClick(rIdx, cIdx)}
                className={`
                  relative w-full h-full flex items-center justify-center
                  transition-colors duration-200
                  ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}
                  ${isSelected ? 'ring-inset ring-4 ring-emerald-500 z-10' : ''}
                  ${isValid ? 'cursor-pointer hover:bg-emerald-900/30' : ''}
                  ${(isLastMoveSrc || isLastMoveDst) && isDark ? 'bg-yellow-900/40' : ''}
                  ${(isLastMoveSrc || isLastMoveDst) && !isDark ? 'bg-yellow-200' : ''}
                `}
              >
                {/* Valid Move Indicator */}
                {isValid && !piece && (
                  <div className="w-4 h-4 rounded-full bg-emerald-500/50 animate-pulse" />
                )}

                {/* Valid Attack Indicator */}
                {isValid && piece && (
                  <div className="absolute inset-0 ring-4 ring-red-500/50 rounded-full animate-pulse z-20 pointer-events-none" />
                )}

                {/* Piece */}
                {piece && (
                  <div className={`
                    w-full h-full flex items-center justify-center
                    ${isSelected ? 'scale-110 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : ''}
                    ${turn === myColor && piece.color === myColor ? 'cursor-pointer' : 'cursor-default'}
                  `}>
                    {renderPiece(piece)}
                  </div>
                )}
                
                {/* Coordinate Labels */}
                {cIdx === 0 && isDark && (
                  <span className="absolute left-0.5 top-0.5 text-[8px] text-zinc-500 font-mono">{8 - rIdx}</span>
                )}
                {rIdx === 7 && isDark && (
                  <span className="absolute right-0.5 bottom-0 text-[8px] text-zinc-500 font-mono">{String.fromCharCode(65 + cIdx)}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};