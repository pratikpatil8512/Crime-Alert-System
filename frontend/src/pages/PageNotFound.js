// src/pages/NotFound.js
import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Simple Custom Component for a subtle interactive tilt effect (Preserved)
const InteractiveCard = ({ children }) => {
    const cardRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const moveX = (e.clientX - centerX) / 20;
        const moveY = (e.clientY - centerY) / 20;

        cardRef.current.style.transform = `perspective(1000px) rotateX(${moveY}deg) rotateY(${-moveX}deg) scale(1.02)`;
    };

    const handleMouseLeave = () => {
        if (cardRef.current) {
            cardRef.current.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        }
    };

    return (
        <div 
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full max-w-xl mx-auto p-10 rounded-[30px] border border-gray-100 shadow-2xl 
                       bg-white/70 backdrop-blur-lg 
                       transition-transform duration-500 ease-out will-change-transform"
        >
            {children}
        </div>
    );
};

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
      
      {/* Background Layer 1: Animated Diagonal Stripes (Continuous, Non-Basic Shape) */}
      <div className="absolute inset-0 z-0 opacity-70 animate-data-scan">
        <div className="w-full h-full bg-repeating-diagonal"></div>
      </div>
      
      {/* Background Layer 2: Slow, Shifting Radial Gradient (for depth) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50 animate-gradient-shift">
        <div className="w-full h-full bg-gradient-radial"></div>
      </div>

      <div className="relative z-10 text-center">
        
        {/* 404 Header - Highly Animated */}
        <hgroup className="mb-8">
          <p className="text-2xl font-semibold text-gray-500 uppercase tracking-[0.5em] mb-4 animate-fade-in">
            ACCESS DENIED
          </p>
          <div className="relative inline-block">
            <h1 
              className="text-9xl sm:text-[12rem] font-black text-transparent bg-clip-text 
                         bg-gradient-to-br from-indigo-700 to-red-600 
                         drop-shadow-lg animate-scale-up"
            >
              404
            </h1>
            {/* Pulsing Light Overlay */}
            <span className="absolute inset-0 text-9xl sm:text-[12rem] font-black text-indigo-100/50 mix-blend-overlay animate-pulse-light">
              404
            </span>
          </div>
        </hgroup>

        {/* Main Content Card - 3D Interactive Tilt */}
        <InteractiveCard>
          <h2 className="text-4xl font-extrabold text-indigo-700 mb-4 animate-slide-up">
            Incident Log Not Found
          </h2>
          <p className="text-xl text-gray-600 mb-8 animate-slide-up animation-delay-300">
            The path you followed is under development.
          </p>

          {/* Interactive Button with a subtle ripple effect */}
          <button
            onClick={() => navigate('/dashboard')}
            className="relative overflow-hidden w-full px-8 py-4 font-bold rounded-xl shadow-2xl 
                       bg-indigo-600 text-white 
                       hover:bg-indigo-700 transition duration-300 
                       focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:ring-opacity-70 
                       transform hover:scale-[1.01]"
          >
            <span className="relative z-10">Return to Secure Dashboard</span>
            {/* Ripple Effect Element (Removed ripple animation to avoid conflict, keeping button static hover) */}
          </button>
        </InteractiveCard>
      </div>
      
      {/* Custom Keyframe and CSS Styles for Complex Animations */}
      <style jsx="true">{`
        /* 1. Diagonal Stripes Pattern */
        .bg-repeating-diagonal {
          background-color: #fff;
          background-image: repeating-linear-gradient(
            45deg,
            #f5f5ff 0, /* Very Light Indigo/Blue */
            #f5f5ff 10px,
            #ffffff 10px,
            #ffffff 20px /* White */
          );
        }
        
        /* 2. Radial Gradient for Depth */
        .bg-gradient-radial {
            background: radial-gradient(circle at top left, #e0e7ff, transparent 50%), 
                        radial-gradient(circle at bottom right, #fecaca, transparent 50%);
        }

        /* 3. Keyframe Animations for Background */
        
        /* Continuous diagonal movement */
        @keyframes data-scan {
          from { background-position: 0 0; }
          to { background-position: 200px 200px; } /* Must match the size in the pattern */
        }
        .animate-data-scan {
          animation: data-scan 15s linear infinite;
        }

        /* Slow, shifting gradient movement */
        @keyframes gradient-shift {
            0% { transform: scale(1.1) translate(0%, 0%); opacity: 0.5; }
            50% { transform: scale(1) translate(10%, 10%); opacity: 0.7; }
            100% { transform: scale(1.1) translate(0%, 0%); opacity: 0.5; }
        }
        .animate-gradient-shift {
            animation: gradient-shift 30s ease-in-out infinite;
        }

        /* 4. Entrance Animations (Preserved) */
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        @keyframes scale-up {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }
        .animate-scale-up {
          animation: scale-up 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }

        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out forwards;
          opacity: 0;
        }
        .animation-delay-300 {
            animation-delay: 0.3s;
        }
        
        /* 5. Pulsing Light Effect (Glow - Preserved) */
        @keyframes pulse-light {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-light {
          animation: pulse-light 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}