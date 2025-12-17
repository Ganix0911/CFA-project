export type PlayerId = string;

export enum PlayerColor {
  RED = 'RED',
  BLUE = 'BLUE'
}

export type GameType = 'CHESS' | 'CHECKERS';
export type PieceType = 'PAWN' | 'ROOK' | 'KNIGHT' | 'BISHOP' | 'QUEEN' | 'KING' | 'MAN';

export interface Player {
  id: PlayerId;
  name: string;
  avatar: string;
  isReady: boolean;
  color?: PlayerColor;
  stats: {
    wins: number;
    losses: number;
    gamesPlayed: number;
  };
}

export interface Cell {
  row: number;
  col: number;
}

export interface BoardPiece {
  id: string;
  color: PlayerColor;
  position: Cell;
  type: PieceType;
}

export interface Move {
  from: Cell;
  to: Cell;
  pieceId: string;
}

export interface GameState {
  roomId: string;
  gameType: GameType;
  board: (BoardPiece | null)[][];
  turn: PlayerColor;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  winner?: PlayerColor;
  lastMove?: Move;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'CHAT' | 'SYSTEM';
}

export enum AppView {
  LANDING = 'LANDING',
  LOBBY = 'LOBBY',
  GAME = 'GAME',
  STATS = 'STATS'
}