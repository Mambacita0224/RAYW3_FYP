// src/app/MusicGenerator.tsx
"use client";  // 标记为客户端组件
import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, RotateCcw, FastForward } from 'lucide-react';

const MusicGenerator: React.FC = () => {
  const [description, setDescription] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [generatedLyrics, setGeneratedLyrics] = useState('');
  const [generatedChordProgression, setGeneratedChordProgression] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [isLoadingMelody, setIsLoadingMelody] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [songInfo, setSongInfo] = useState({
    title: '',
    duration: '0:00',
    currentTime: '0:00'
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const musicStyles = [
    { value: 'medieval-rock', label: 'Medieval rock' },
    { value: 'metal', label: 'Metal' },
    { value: 'hardcore-hip-hop', label: 'Hardcore Hip-Hop' },
    { value: 'baroque', label: 'Baroque' },
    { value: 'edm', label: 'EDM' }
  ];

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'mandarin', label: 'Mandarin' },
    { value: 'cantonese', label: 'Cantonese' }
  ];

  const handleGenerateLyrics = async () => {
      setIsLoadingLyrics(true);
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
          const lyricsPart = data.lyrics;

          setGeneratedLyrics(lyricsPart); // 设置歌词
          
          setSongInfo(prev => ({
              ...prev,
              title: `${selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1)} Song`
          }));
      } catch (error) {
          console.error('Error generating lyrics:', error);
      } finally {
          setIsLoadingLyrics(false);
      }
  };

  const handleEditLyrics = () => {
    setIsEditing(!isEditing);
  };

  const handleCreateMusic = async () => {
    setIsLoadingMelody(true);
    if (!generatedLyrics) return;
  
    try {
      const chord_response = await fetch('http://127.0.0.1:5000/generate-chords', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  language: selectedLanguage, 
                  lyrics: generatedLyrics,
              }),
          });

          if (!chord_response.ok) {
              throw new Error('Network response was not ok');
          }

          const data = await chord_response.json();
          const ChordsPart = data.chord_progression;
          setGeneratedChordProgression(ChordsPart);
          console.log("GeneratedChordProgression: "+generatedChordProgression);


      // Check if files exist
      const checkResponse = await fetch("http://127.0.0.1:5000/check-files");
      const checkData = await checkResponse.json();
  
      if (!checkData.files_exist) {
        alert("Lyrics and chord files are missing. Please generate them first.");
        return;
      }

      // If files exist, trigger melody generation
      const response = await fetch("http://127.0.0.1:5000/generate-melody", {
        mode: 'no-cors',
        method: "POST",
      });

      if (response.ok) {
        console.log("Melody generation started");
      } else {
        console.error("Failed to start melody generation");
      }

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoadingMelody(false);
    }
  };
  

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Panel - Keep existing code for style, language, description, and lyrics */}
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
                  className={`bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded ${isLoadingLyrics ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isLoadingLyrics}
                >
                  {isLoadingLyrics ? 'Loading...' : 'GENERATE THE LYRICS'}
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
                    onChange={(e) => setGeneratedLyrics(e.target.value)}
                    readOnly={!isEditing}
                    className="w-full h-48 p-2 bg-gray-700 rounded text-white"
                    placeholder="Click GENERATE LYRICS to see the lyrics..."
                />
                <div className="mt-4 flex justify-between items-center">
                    <button
                        onClick={handleEditLyrics}
                        className="border border-white px-4 py-2 rounded"
                    >
                        {isEditing ? 'SAVE' : 'EDIT'}
                    </button>
                    <span className="text-gray-400">
                        {generatedLyrics.length}/1000
                    </span>
                </div>
            </div>

            {/* Chord Progression Display */}
            {/* <div className="bg-gray-800 p-4 rounded-lg mt-6">
                <h2 className="text-xl font-bold mb-4">Chord Progression</h2>
                <textarea
                    value={generatedChordProgression}
                    readOnly
                    className="w-full h-16 p-2 bg-gray-700 rounded text-white"
                    placeholder="Chord Progression will appear here..."
                />
            </div> */}
          </div>

          {/* Right Panel - New Music Player */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Music Player</h2>
            <div className="space-y-6">
              {/* Visualization/Album Art */}
              <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                {selectedStyle ? (
                  <img
                    src={`/api/placeholder/400/400`}
                    alt="Music Visualization"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 text-center p-4">
                    Select a style and generate music to see visualization
                  </div>
                )}
              </div>

              {/* Song Info */}
              <div className="text-center">
                <h3 className="text-xl font-bold">{songInfo.title || "No song generated"}</h3>
                <p className="text-gray-400">{selectedStyle || "Select a style"}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: '0%' }}
                />
              </div>

              {/* Time */}
              <div className="flex justify-between text-sm text-gray-400">
                <span>{songInfo.currentTime}</span>
                <span>{songInfo.duration}</span>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center space-x-6">
                <button className="p-2 hover:text-purple-500">
                  <RotateCcw className="w-6 h-6" />
                </button>
                <button
                  onClick={togglePlayPause}
                  className="p-4 bg-purple-600 rounded-full hover:bg-purple-700"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8" />
                  )}
                </button>
                <button className="p-2 hover:text-purple-500">
                  <FastForward className="w-6 h-6" />
                </button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center space-x-2">
                <Volume2 className="w-5 h-5" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="100"
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Create Music Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleCreateMusic}
            className={`bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded ${isLoadingMelody ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoadingMelody}
          >
            {isLoadingMelody ? 'Melody Loading...' :'🎵 CREATE THE MUSIC! 🎵'}
          </button>
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setSongInfo(prev => ({
                ...prev,
                currentTime: formatTime(audioRef.current?.currentTime || 0),
                duration: formatTime(audioRef.current?.duration || 0)
              }));
            }
          }}
        />
      </div>
    </div>
  );
};

export default MusicGenerator;