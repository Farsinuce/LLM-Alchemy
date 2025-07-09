import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Sparkles className="text-yellow-400" size={48} />
          <h1 className="text-5xl font-bold">LLM Alchemy</h1>
        </div>
        
        <p className="text-lg text-gray-300 mb-8">
          Combine elements to discover new ones using the power of AI.
          Choose between Science mode for realistic combinations or Creative mode for imaginative results!
        </p>
        
        <div className="space-y-4">
          <Link 
            href="/game"
            className="block w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-105"
          >
            Play Now
          </Link>
          
          <div className="text-sm text-gray-400">
            Free to play • 50 combinations per day
          </div>
        </div>
      </div>
    </main>
  );
}
