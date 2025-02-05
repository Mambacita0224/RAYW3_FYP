// src/app/MusicGenerator.tsx
"use client";  // 标记为客户端组件
import React, { useState } from 'react';
import { Music, Settings, Volume2 } from 'lucide-react';

const MusicGenerator: React.FC = () => {
  const [description, setDescription] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [generatedLyrics, setGeneratedLyrics] = useState('');
  const [midiData, setMidiData] = useState<any>(null); // 用 any 或者更具体的类型替代
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const musicStyles = [
    { value: 'medieval-rock', label: 'Medieval rock' },
    { value: 'metal', label: 'Metal' },
    { value: 'hardcore-hip-hop', label: 'Hardcore Hip-Hop' },
    { value: 'baroque', label: 'Baroque' },
    { value: 'edm', label: 'EDM' }
  ];

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'mandarin', label: 'Mandarin Chinese' },
    { value: 'cantonese', label: 'Cantonese' }
  ];

  const handleGenerateLyrics = async () => {
      setIsLoading(true);
      try {
          const response = await fetch('http://127.0.0.1:5000/generate-lyrics', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  description,
                  language: selectedLanguage,
                  style: selectedStyle,
              }),
          });

          if (!response.ok) {
              throw new Error('Network response was not ok');
          }

          const data = await response.json();
          setGeneratedLyrics(data.lyrics);
          console.log('Generated lyrics:', data.lyrics);
      } catch (error) {
          console.error('Error generating lyrics:', error);
      } finally {
        setIsLoading(false);
      }
  };

  const handleEditLyrics = () => {
    setIsEditing(!isEditing);
  };

  const handleCreateMusic = async () => {
    console.log('Creating music...');
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Panel */}
          <div className="space-y-6">
            {/* Style Selection */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Style of Music</h2>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded text-white"
              >
                <option value="">Select style...</option>
                {musicStyles.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Selection */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Choose Language</h2>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full p-2 bg-gray-700 rounded text-white"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description Input */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Description of Music</h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter the description of the song and click GENERATE THE LYRICS!"
                className="w-full h-32 p-2 bg-gray-700 rounded text-white"
              />
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={handleGenerateLyrics}
                  className={`bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isLoading} // 按钮禁用
                >
                  {isLoading ? 'Loading...' : 'GENERATE THE LYRICS'}
                </button>
                <span className="text-gray-400">
                  {description.length}/300
                </span>
              </div>
            </div>

            {/* Lyrics Display */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Lyrics</h2>
              <textarea
                value={generatedLyrics}
                onChange={(e) => setGeneratedLyrics(e.target.value)} // 允许编辑
                readOnly={!isEditing}
                className="w-full h-48 p-2 bg-gray-700 rounded text-white"
                placeholder="Click GENERATE LYRICS to see the lyrics..."
              />
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={handleEditLyrics}
                  className="border border-white px-4 py-2 rounded"
                >
                  {isEditing ? 'SAVE' : 'EDIT'} {/* 根据状态切换按钮文本 */}
                </button>
                <span className="text-gray-400">
                  {generatedLyrics.length}/1000
                </span>
              </div>
            </div>
          </div>

          {/* Right Panel - Music Editor */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Music Editor</h2>
            <div className="border border-gray-700 rounded-lg p-4">
              <div className="flex space-x-4 mb-4">
                <button className="flex items-center px-4 py-2 text-white">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </button>
                <button className="flex items-center px-4 py-2 text-white">
                  <Volume2 className="w-4 h-4 mr-2" />
                  Volume
                </button>
                <button className="flex items-center px-4 py-2 text-white">
                  <Music className="w-4 h-4 mr-2" />
                  Tracks
                </button>
              </div>
              <div className="h-96 bg-gray-900 rounded-lg relative">
                {midiData ? (
                  <div className="p-4">
                    <span className="text-gray-400">MIDI Editor View</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-gray-400">
                      Generate music to view MIDI editor
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Music Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleCreateMusic}
            className="bg-purple-600 hover:bg-purple-700 px-8 py-4 text-lg rounded"
            disabled={!generatedLyrics}
          >
            🎵 CREATE THE MUSIC! 🎵
          </button>
        </div>
      </div>
    </div>
  );
};

export default MusicGenerator;