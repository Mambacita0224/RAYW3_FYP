// src/app/MusicGenerator.tsx
"use client";  // 标记为客户端组件
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, RotateCcw, FastForward } from 'lucide-react';

const MusicGenerator: React.FC = () => {
  const [description, setDescription] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [generatedLyrics, setGeneratedLyrics] = useState('');
  const [generatedChordProgression, setGeneratedChordProgression] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [isLoadingMelody, setIsLoadingMelody] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioLastChecked, setAudioLastChecked] = useState<number>(0);
  const [audioCheckInterval, setAudioCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [songInfo, setSongInfo] = useState({
    title: '',
    duration: '0:00',
    currentTime: '0:00',
    progress: 0
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'mandarin', label: 'Mandarin' },
    { value: 'cantonese', label: 'Cantonese' }
  ];

  const voices = {
    english: [
      { value: 'english-voice-1', label: 'English Voice 1' },
      { value: 'english-voice-2', label: 'English Voice 2' }
    ],
    mandarin: [
      { value: 'mandarin-voice-1', label: 'Mandarin Voice 1' },
      { value: 'mandarin-voice-2', label: 'Mandarin Voice 2' }
    ],
    cantonese: [
      { value: 'cantonese-voice-1', label: 'Cantonese Voice 1' },
      { value: 'cantonese-voice-2', label: 'Cantonese Voice 2' }
    ]
  };

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
                  voice: selectedVoice,
              }),
          });

          if (!response.ok) {
              throw new Error('Network response was not ok');
          }

          const data = await response.json();
          const lyricsPart = data.lyrics;
          const songTitle = data.title;

          setGeneratedLyrics(lyricsPart); // 设置歌词
          
          setSongInfo(prev => ({
              ...prev,
              title: songTitle
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

  useEffect(() => {
    // Function to check for audio updates
    const checkForAudio = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/check-audio-status');
        const data = await response.json();
        
        if (data.exists) {
          // Check if the file has been updated since last check
          if (data.last_modified !== audioLastChecked) {
            setAudioLastChecked(data.last_modified);
            // Update audio URL with cache-busting query parameter
            setAudioUrl(`http://127.0.0.1:5000/get-audio?t=${Date.now()}`);
            
            // If we were already playing, restart playback with new audio
            if (isPlaying && audioRef.current) {
              audioRef.current.load();
              audioRef.current.play();
            }
            
            // Update song info
            setSongInfo(prev => ({
              ...prev,
              title: songInfo.title,
              duration: "0:00" // Will be updated when audio loads
            }));
          }
        }
      } catch (error) {
        console.error("Error checking for audio:", error);
      }
    };
  
    // Start polling when the component mounts
    if (isLoadingMelody) {
      const interval = setInterval(checkForAudio, 10000); // Check every 10 seconds
      setAudioCheckInterval(interval);
    }
  
    // Clean up on component unmount or when loading state changes
    return () => {
      if (audioCheckInterval) {
        clearInterval(audioCheckInterval);
      }
    };
  }, [isLoadingMelody, audioLastChecked]);

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
                  voice: selectedVoice,
              }),
          });

          if (!chord_response.ok) {
              throw new Error('Network response was not ok');
          }

          const data = await chord_response.json();
          const ChordsPart = data.chord_progression;
          setGeneratedChordProgression(ChordsPart);

      // Check if files exist
      const checkResponse = await fetch("http://127.0.0.1:5000/check-files");
      const checkData = await checkResponse.json();
  
      if (!checkData.files_exist) {
        alert("Lyrics and chord files are missing. Please generate them first.");
        return;
      }

      // If files exist, trigger melody generation
      const response = await fetch("http://127.0.0.1:5000/generate-melody", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice: selectedVoice,
        }),
      });

      if (response.ok) {
        console.log("Melody generation started");
        // Start checking for audio file (polling will begin due to useEffect)
        setAudioLastChecked(0); // Reset last checked timestamp
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
          <div className="space-y-6">
            {/* Language Selection */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Choose Language</h2>
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  setSelectedVoice(''); // Reset voice when language changes
                }}
                className="w-full p-2 bg-gray-700 rounded text-white"
              >
                <option value="" disabled>Select a language...</option>
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Voice Selection */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Choose Voice</h2>
              {voices[selectedLanguage]?.map((voice, index) => {
                //给每个voice一个png icon，可以按照下面的文件命名逻辑
                //选择voice按钮的时候会试播对应声音的audio mp3
                const iconPath = `file_path/${selectedLanguage}Icon${index + 1}.png`; // Placeholder for icon
                const audioPath = `file_path/${selectedLanguage}Voice${index + 1}.mp3`; // Placeholder for audio
                const isSelected = selectedVoice === voice.value; // Check if this voice is selected
                return (
                  <button
                    key={voice.value}
                    onClick={() => {
                      setSelectedVoice(voice.value);
                      const audio = new Audio(audioPath);
                      audio.play();
                    }}
                    className={`flex items-center justify-between w-full p-2 mb-2 rounded ${
                      isSelected ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <span className="flex items-center">
                      <img src={iconPath} className="mr-2 w-10 h-10" /> {/* Placeholder for voice icon */}
                      {voice.label}
                    </span>
                    <Play className="ml-2" /> {/* Play icon on the right */}
                  </button>
                );
              })}
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
          </div>

          {/* Right Panel - New Music Player */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Music Player</h2>
            <div className="space-y-6">
              {/* Visualization/Album Art */}
              <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                {generatedLyrics ? (
                  <img
                    src={`/api/placeholder/400/400`}
                    alt="Music Visualization"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 text-center p-4">
                    Generate music to see visualization
                  </div>
                )}
              </div>

              {/* Song Info */}
              <div className="text-center">
                <h3 className="text-xl font-bold">{songInfo.title || "No song generated"}</h3>
                <p className="text-gray-400">{selectedLanguage || "Select a language"}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${songInfo.progress || 0}%` }}
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
          src={audioUrl || undefined} // Use undefined instead of empty string
          onTimeUpdate={() => {
            if (audioRef.current) {
              const currentTime = audioRef.current.currentTime;
              const duration = audioRef.current.duration || 0;
              const progressPercent = (currentTime / duration) * 100 || 0;
              
              setSongInfo(prev => ({
                ...prev,
                currentTime: formatTime(currentTime),
                duration: formatTime(duration),
                progress: progressPercent // Add this to your songInfo state
              }));
            }
          }}
          onEnded={() => setIsPlaying(false)}
          onCanPlay={() => {
            console.log("Audio can play now");
            // Optional: Auto-play when ready
            // if (isPlaying) audioRef.current?.play();
          }}
        />
      </div>
    </div>
  );
};

export default MusicGenerator;