# TableTopLive Frontend

A React-based frontend for the TableTopLive gaming platform supporting Chess and Checkers.

## Features

- Real-time multiplayer gaming
- Chess and Checkers support
- Live chat functionality
- Player statistics
- Responsive design with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/     # React components
├── services/       # API and socket services
├── types/          # TypeScript type definitions
├── styles/         # CSS and styling files
├── App.tsx         # Main app component
└── main.tsx        # Entry point
```

## Backend Integration

The frontend connects to the backend server running on port 5000. Make sure the backend is running before starting the frontend.

## Technologies Used

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Socket.IO Client
- Lucide React (icons)
- Recharts (statistics)