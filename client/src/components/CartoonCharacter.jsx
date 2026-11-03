import { useState } from 'react';

const MESSAGES = [
  'Saving money is fun! 💰',
  'Track every rupee! 📊',
  'Cancel what you don\'t use! ✂️',
  'Annual plans save more! 🗓️',
  'You\'re doing great! 🌟',
];

export default function CartoonCharacter() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [bubbleMessage, setBubbleMessage] = useState('ready to scan');

  const handleClick = () => {
    setBubbleMessage(MESSAGES[messageIndex % MESSAGES.length]);
    setMessageIndex((index) => index + 1);
  };

  return (
    <div className="cartoon-wrapper">
      <div
        className="cartoon-character"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="SubSentry mascot, click for a saving tip"
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClick();
          }
        }}
      >
        <svg viewBox="0 0 140 170" xmlns="http://www.w3.org/2000/svg" className="cartoon-svg">
          {/* Laptop base */}
          <rect x="14" y="70" width="112" height="56" rx="12" fill="#1e293b" stroke="#6366f1" strokeWidth="3" />
          <rect x="22" y="78" width="96" height="42" rx="8" fill="#0f172a" />
          <path d="M26,132 h88 l-8,10 h-72 z" fill="#0f172a" />
          <ellipse cx="70" cy="148" rx="44" ry="6" fill="rgba(0,0,0,0.35)" />
          {/* Chart on screen */}
          <line x1="30" y1="106" x2="108" y2="106" stroke="#94a3b8" strokeWidth="2" />
          <line x1="30" y1="86" x2="30" y2="106" stroke="#94a3b8" strokeWidth="2" />
          <rect x="40" y="88" width="12" height="16" rx="3" fill="#38bdf8" />
          <rect x="58" y="80" width="12" height="24" rx="3" fill="#a78bfa" />
          <rect x="76" y="92" width="12" height="12" rx="3" fill="#f472b6" />
          <rect x="94" y="84" width="12" height="20" rx="3" fill="#34d399" />
          {/* Analyzer head */}
          <circle cx="70" cy="34" r="24" fill="#fcd34d" />
          <circle cx="60" cy="30" r="5" fill="#1e1b4b" />
          <circle cx="80" cy="30" r="5" fill="#1e1b4b" />
          <path d="M60,40 Q70,48 80,40" stroke="#92400e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M50,22 Q70,8 90,22" fill="none" stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
          {/* Speech bubble */}
          <g className="speech-bubble">
            <rect x="8" y="10" width="116" height="36" rx="12" fill="white" opacity="0.95" />
            <polygon points="28,46 36,46 32,56" fill="white" opacity="0.95" />
            <text x="66" y="24" textAnchor="middle" fontSize="8.5" fill="#6366f1" fontFamily="DM Sans" fontWeight="700">
              Analyzer
            </text>
            <text x="66" y="36" textAnchor="middle" fontSize="8.5" fill="#6366f1" fontFamily="DM Sans" fontWeight="700">
              {bubbleMessage}
            </text>
          </g>
        </svg>
      </div>
      <div className="cartoon-shadow" />
    </div>
  );
}
