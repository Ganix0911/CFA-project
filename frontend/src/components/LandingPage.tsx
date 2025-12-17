import React from 'react';
import { Gamepad2, Trophy, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              TableTopLive
            </span>
          </div>
          <div className="flex gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/lobby" className="px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors">Lobby</Link>
                <Link to="/stats" className="px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors">Stats</Link>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors">Login</Link>
                <Link to="/register" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">Register</Link>
              </>
            )}
          </div>
        </nav>

        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-8">
            <h1 className="text-6xl font-bold leading-tight">
              Master the Board <br />
              <span className="text-blue-500">Real-Time</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-lg">
              Experience board games like never before. Real-time multiplayer,
              live chat, and instant matchmaking. Play Chess or Checkers with friends or strangers.
            </p>
            <div className="flex gap-4">
              {isAuthenticated ? (
                <Link
                  to="/lobby"
                  className="group bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl flex items-center gap-2 font-bold transition-all transform hover:scale-105"
                >
                  Play Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="group bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl flex items-center gap-2 font-bold transition-all transform hover:scale-105"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>
          </div>

          <div className="flex-1 relative">
            <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
            <img
              src="https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=1000"
              alt="Chess Board"
              className="relative rounded-2xl shadow-2xl border border-slate-700 transform rotate-2 hover:rotate-0 transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-slate-800/50 py-20">
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Users className="w-8 h-8 text-purple-400" />}
            title="Real-Time Multiplayer"
            description="Play with friends or match with players worldwide instantly."
          />
          <FeatureCard
            icon={<Trophy className="w-8 h-8 text-yellow-400" />}
            title="Competitive Ranks"
            description="Climb the leaderboard and track your simplified ELO rating."
          />
          <FeatureCard
            icon={<Gamepad2 className="w-8 h-8 text-green-400" />}
            title="Multiple Games"
            description="Switch between Chess and Checkers seamlessly."
          />
        </div>
      </div>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
  <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-slate-400">{description}</p>
  </div>
);