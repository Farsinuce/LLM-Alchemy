'use client';

import React, { useState } from 'react';
import { resolveEmoji } from '@/lib/openmoji-service';
import { OpenMojiDisplay } from '@/components/game/OpenMojiDisplay';

interface TestResult {
  original: {
    unicodeEmoji: string;
    name: string;
    tags: string[];
  };
  resolved: {
    hexcode: string;
    svgPath: string;
    isExtra: boolean;
  };
  debugInfo?: {
    cacheKey: string;
    searchQuery: string;
    timestamp: string;
  };
}

export default function TestOpenMojiPage() {
  const [unicodeEmoji, setUnicodeEmoji] = useState('☕');
  const [name, setName] = useState('Coffee Grinder');
  const [tagsText, setTagsText] = useState('coffee, grinder, mill, bean, machine');
  const [result, setResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Parse tags from comma-separated text
    const tags = tagsText
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    try {
      // Enable debug logging in browser console
      const originalEnv = process.env.NODE_ENV;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (process.env as any).NODE_ENV = 'development';
      
      console.log('[OpenMoji Debug] Testing with inputs:', { unicodeEmoji, name, tags });
      
      const resolved = resolveEmoji({
        unicodeEmoji,
        name,
        tags
      });
      
      // Restore environment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (process.env as any).NODE_ENV = originalEnv;
      
      setResult({
        original: { unicodeEmoji, name, tags },
        resolved,
        debugInfo: {
          cacheKey: `${name}|${tags.join(',')}`,
          searchQuery: `${name} ${tags.join(' ')}`.trim(),
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error resolving emoji:', error);
      alert('Error resolving emoji - check console for details');
    } finally {
      setIsLoading(false);
    }
  };

  const presetTests = [
    {
      emoji: '☕',
      name: 'Coffee Grinder',
      tags: 'coffee, grinder, mill, bean, machine'
    },
    {
      emoji: '🦠',
      name: 'Microbe',
      tags: 'bacteria, microbe, germ, cell, microscopic, organism'
    },
    {
      emoji: '🗿',
      name: 'Golem',
      tags: 'stone, rock, statue, ancient, magical, creature'
    },
    {
      emoji: '🍕',
      name: 'Pizza',
      tags: 'pizza, food, cheese, tomato, slice, italian'
    },
    {
      emoji: '🐉',
      name: 'Dragon',
      tags: 'dragon, fire, wings, scales, beast, fantasy'
    }
  ];

  const loadPreset = (preset: typeof presetTests[0]) => {
    setUnicodeEmoji(preset.emoji);
    setName(preset.name);
    setTagsText(preset.tags);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          OpenMoji Resolver Debug Tool
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test Inputs</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Unicode Emoji:
                </label>
                <input
                  type="text"
                  value={unicodeEmoji}
                  onChange={(e) => setUnicodeEmoji(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="☕"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Element Name:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                  placeholder="Coffee Grinder"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Emoji Tags (comma-separated):
                </label>
                <textarea
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white h-20 resize-none"
                  placeholder="coffee, grinder, mill, bean, machine"
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium transition-colors"
              >
                {isLoading ? 'Resolving...' : 'Test OpenMoji Resolution'}
              </button>
            </form>
            
            {/* Preset Tests */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">Quick Tests:</h3>
              <div className="space-y-2">
                {presetTests.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => loadPreset(preset)}
                    className="w-full text-left bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded transition-colors"
                  >
                    <span className="text-2xl mr-3">{preset.emoji}</span>
                    <span className="font-medium">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            
            {!result ? (
              <div className="text-gray-400 text-center py-8">
                Submit a test to see results
              </div>
            ) : (
              <div className="space-y-6">
                {/* Comparison */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4 text-center">
                    <h3 className="font-medium mb-3">Original Unicode</h3>
                    <div className="text-6xl mb-2">{result.original.unicodeEmoji}</div>
                    <div className="text-sm text-gray-300">
                      Unicode: {result.original.unicodeEmoji}
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4 text-center">
                    <h3 className="font-medium mb-3">Resolved OpenMoji</h3>
                    <div className="flex justify-center mb-2">
                      <OpenMojiDisplay 
                        emoji={result.original.unicodeEmoji}
                        hexcode={result.resolved.isExtra ? result.resolved.hexcode : undefined}
                        name={result.original.name}
                        size="lg"
                        className="w-16 h-16"
                      />
                    </div>
                    <div className="text-sm text-gray-300">
                      Hexcode: {result.resolved.hexcode}
                    </div>
                  </div>
                </div>
                
                {/* Debug Information */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-medium mb-3">Debug Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-400">Element Name:</span> 
                      <span className="ml-2">{result.original.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Emoji Tags:</span> 
                      <span className="ml-2">[{result.original.tags.join(', ')}]</span>
                    </div>
                    <div>
                      <span className="text-gray-400">SVG Path:</span> 
                      <span className="ml-2 font-mono">{result.resolved.svgPath}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Is PUA (Extra):</span> 
                      <span className={`ml-2 font-medium ${result.resolved.isExtra ? 'text-purple-400' : 'text-green-400'}`}>
                        {result.resolved.isExtra ? 'Yes (Private Use Area)' : 'No (Standard Unicode)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Search Query:</span> 
                      <span className="ml-2 font-mono">&quot;{result.debugInfo?.searchQuery}&quot;</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Cache Key:</span> 
                      <span className="ml-2 font-mono text-xs">{result.debugInfo?.cacheKey}</span>
                    </div>
                  </div>
                </div>
                
                {/* Console Note */}
                <div className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-3">
                  <div className="text-sm text-blue-200">
                    💡 Check the browser console for detailed debug logs showing the resolution decision process.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Back to Game */}
        <div className="text-center mt-8">
          <a
            href="/game"
            className="inline-block bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg transition-colors"
          >
            ← Back to Game
          </a>
        </div>
      </div>
    </div>
  );
}
