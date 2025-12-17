# TableTopLive - Real-Time Multiplayer Board Game Platform ♟️

TableTopLive is a MERN-stack web application that allows users to play board games (Chess and Checkers) in real-time with friends or other online players.

## 🚀 Key Features

*   **Real-Time Gameplay**: Powered by `Socket.IO` for instant move synchronization (< 100ms latency).
*   **Multiplayer Lobbies**: Create or join rooms dynamically.
*   **Authentication**: Secure User Login/Register using JWT (JSON Web Tokens).
*   **Game Engines**:
    *   **Chess**: Validated by server-side logic and Stockfish engine integration.
    *   **Checkers**: Custom server-side move validation logic.
*   **Responsive UI**: Built with React and TailwindCSS for a seamless experience on desktop and mobile.
*   **Player Stats**: Track wins, losses, and ELO ratings.

## 🛠️ Technology Stack

*   **Frontend**: React.js (Vite), TypeScript, TailwindCSS, React Router, Socket.IO Client.
*   **Backend**: Node.js, Express.js, Socket.IO, MongoDB (Mongoose).
*   **Tools**: Git, Stockfish (Chess Engine).

## ⚙️ Architecture Overview

The application follows a **bifurcated client-server architecture**:

1.  **Client (Frontend)**: Handles UI rendering and captures user input. It allows users to "optimistically" make moves but relies on the server for validation.
2.  **Server (Backend)**: Acts as the **Authoritative Game State**. It maintains the "Single Source of Truth" (FEN strings) for all active games.
    *   **REST API**: Handles Auth (Login/Register) and non-real-time data (Lobby list, Stats).
    *   **Socket.IO**: Handles high-frequency events (Moves, Joins, Chat).
3.  **Database**: MongoDB stores persistent user data and game history.

### Real-Time Synchronization Flow
1.  Player A makes a move -> `socket.emit('makeMove', moveData)`
2.  Server receives event -> Validates Token & Move Legality
3.  Server updates Game State (FEN) in memory/DB
4.  Server broadcasts update -> `io.to(roomId).emit('boardUpdate', newFen)`
5.  All Clients in room receive update -> Re-render Board

## 📦 Installation & Setup

### Prerequisites
*   Node.js (v16+)
*   MongoDB (Local or AtlasURI)

### 1. Clone & Install
```bash
git clone https://github.com/your-repo/tabletoplive.git
cd tabletoplive
```

### 2. Backend Setup
```bash
cd backend
npm install
# Create .env file
echo "MONGO_URI=mongodb://localhost:27017/tabletoplive" > .env
echo "JWT_SECRET=your_jwt_secret" >> .env
echo "PORT=3001" >> .env
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to play!

## 🧪 Testing

*   **Manual**: Open two browser windows (Incognito for second user). Login as two different users and join the same room.
*   **Automated**: run `npm test` in backend (if configured).

## 📝 License
MIT
