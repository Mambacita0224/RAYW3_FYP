// src/app/MusicGenerator.tsx
"use client";  // 标记为客户端组件
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Rewind, FastForward, Download } from 'lucide-react';

const MusicGenerator: React.FC = () => {
  const [description, setDescription] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<{ value: string; label: string } | null>(null);
  const [generatedLyrics, setGeneratedLyrics] = useState('');
  const [generatedChordProgression, setGeneratedChordProgression] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [isLoadingMelody, setIsLoadingMelody] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioLastChecked, setAudioLastChecked] = useState<number>(0);
  const [audioCheckInterval, setAudioCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [isLoadingAlbumCover, setIsLoadingAlbumCover] = useState(false);
  const [albumCoverUrl, setAlbumCoverUrl] = useState('');
  const [volume, setVolume] = useState(100);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [songInfo, setSongInfo] = useState({
    title: '',
    duration: '0:00',
    currentTime: '0:00',
    progress: 0
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const volumeRef = useRef<HTMLInputElement | null>(null);

  // Improved SVG for Rewind 15s button with circular arrow and text
  const Back15Icon = () => (
    <div style={{ textAlign: 'center' }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 3 12 A 9 9 0 0 0 12 21 A 9 9 0 0 0 21 12 A 9 9 0 0 0 12 3" fill="none" />
        <polyline points="12 1 10 3 12 5" />
        <text x="12" y="16" fontSize="8" textAnchor="middle" fill="currentColor" strokeWidth="1">15</text>
      </svg>
    </div>
  );

  const Forward15Icon = () => (
    <div style={{ textAlign: 'center' }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 21 12 A 9 9 0 0 1 12 21 A 9 9 0 0 1 3 12 A 9 9 0 0 1 12 3" fill="none" />
        <polyline points="12 1 14 3 12 5" />
        <text x="12" y="16" fontSize="8" textAnchor="middle" fill="currentColor" strokeWidth="1">15</text>
      </svg>
    </div>
  );

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'mandarin', label: 'Mandarin' },
    { value: 'cantonese', label: 'Cantonese' },
    { value: 'japanese', label: 'Japanese' }
  ];

  const voices = {
    english: [
      { value: 'yousaV1.5.zip', label: 'yousa' },
      { value: 'Liliko_v1.0.0_DiffSinger_OpenUtau.zip', label: 'Liliko' }
    ],
    mandarin: [
      { value: 'yousaV1.5.zip', label: 'yousa' },
      { value: 'Liliko_v1.0.0_DiffSinger_OpenUtau.zip', label: 'Liliko' },
      { value: 'Aikie_ML_v101.zip', label: 'Aikie' }
    ],
    cantonese: [
      { value: 'ChingChongHoi_OpenBeta.zip', label: 'Cong' },
      { value: 'Ria-v0.4-lynxnet.zip', label: 'Ria' }
    ],
    japanese: [
      { value: 'default1', label: 'default1' },
      { value: 'default2', label: 'default1' }
    ]
  };

  const handleGenerateLyrics = async () => {
    if (!selectedLanguage) {
      alert("Please select a language.");
      return;
    }
    if (!selectedVoice) {
      alert("Please select a voice.");
      return;
    }
    if (!description) {
      alert("Please fill in the description of the music.");
      return;
    }
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

      if (data.validity) {
        alert(data.validity);
        return;
      }

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

  const handleLanguageChange = (newLanguage) => {
    if (generatedLyrics) {
      const confirmChange = window.confirm("If you change the language, all existing lyrics will be cleared. Are you sure you want to proceed?");
      if (confirmChange) {
        setGeneratedLyrics('');
        setSelectedLanguage(newLanguage);
      }
    } else {
      setSelectedLanguage(newLanguage);
    }
  };

  useEffect(() => {
    // Function to check for audio updates
    const checkForAudio = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/check-audio-status');
        const data = await response.json();

        if (data.exists) {
          // Audio found, stop polling
          console.log("Audio file found:", data);
          if (audioCheckInterval) {
            clearInterval(audioCheckInterval);
            setAudioCheckInterval(null);
          }
          // Check if the file has been updated since last check
          if (data.last_modified !== audioLastChecked) {
            setAudioLastChecked(data.last_modified);
            // Update audio URL with cache-busting query parameter
            setAudioUrl(`http://127.0.0.1:5000/get-audio?t=${Date.now()}`);

            // If we were already playing, restart playback with new audio
            if (audioRef.current) {
              audioRef.current.load();
              // Wait a moment to ensure audio is loaded
              setTimeout(() => {
                if (audioRef.current) {
                  audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(err => console.error("Error playing audio:", err));
                }
              }, 500);
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

    // Start polling when the melody generation is requested
    if (isLoadingMelody && !audioCheckInterval) {
      const interval = setInterval(checkForAudio, 10000); // Check every 10 seconds
      setAudioCheckInterval(interval);
      // Do an immediate check
      checkForAudio();
    }

    // Clean up on component unmount or when loading state changes
    return () => {
      if (audioCheckInterval) {
        clearInterval(audioCheckInterval);
      }
    };
  }, [isLoadingMelody, audioRef, audioCheckInterval]);

  // Update the useEffect for handling audio element changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.load();

      // Check if we should auto-play
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Playback error:", error);
            setIsPlaying(false);
          });
        }
      }
    }
  }, [audioUrl]);

  // Add this function to handle album cover generation
  const generateAlbumCover = async () => {
    if (!songInfo.title || !description || !generatedLyrics) {
      console.error("Missing required information for album cover generation");
      return;
    }

    setIsLoadingAlbumCover(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/generate-album-cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: songInfo.title,
          description: description,
          lyrics: generatedLyrics,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate album cover');
      }

      const data = await response.json();

      if (data.success) {
        // Set the album cover URL with a cache buster
        setAlbumCoverUrl(`http://127.0.0.1:5000/get-album-cover?t=${Date.now()}`);
      } else {
        console.error("Album cover generation failed:", data.error);
      }
    } catch (error) {
      console.error("Error generating album cover:", error);
    } finally {
      setIsLoadingAlbumCover(false);
    }
  };

  const handleCreateMusic = async () => {
    setIsLoadingMelody(true);
    if (!generatedLyrics) {
      alert("Please generate lyrics first!");
      setIsLoadingMelody(false);
      return;
    }
    if (!selectedVoice) {
      alert("Please select a voice!");
      setIsLoadingMelody(false);
      return;
    }
    console.log("Selected voice value:", selectedVoice.value, "label:", selectedVoice.label);
    try {
      // 第一步：生成和弦
      const chord_response = await fetch('http://127.0.0.1:5000/generate-chords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: selectedLanguage,
          lyrics: generatedLyrics,
          voice: { value: selectedVoice.value, label: selectedVoice.label }, // 发送完整对象
        }),
      });

      if (!chord_response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await chord_response.json();
      if (data.validity) {
        alert(data.validity);
        return;
      }
      const ChordsPart = data.chord_progression;
      setGeneratedChordProgression(ChordsPart);

      // 检查文件是否存在
      const checkResponse = await fetch("http://127.0.0.1:5000/check-files");
      const checkData = await checkResponse.json();

      if (!checkData.files_exist) {
        alert("Lyrics and chord files are missing. Please generate them first.");
        return;
      }
      // Start album cover generation in parallel with melody generation
      generateAlbumCover();
      // 第二步：生成旋律
      const response = await fetch("http://127.0.0.1:5000/generate-melody", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice: { value: selectedVoice.value, label: selectedVoice.label }, // 发送完整对象
          language: selectedLanguage,
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

  // Toggle play/pause
  const togglePlayPause = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Use a promise to handle the play request properly
        const playPromise = audioRef.current.play();

        // If the play() method returns a promise (modern browsers)
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Playback started successfully
            })
            .catch(error => {
              // Auto-play was prevented or other error
              console.error("Playback error:", error);
              setIsPlaying(false);
            });
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skipForward = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.currentTime + 15,
        audioRef.current.duration || 0
      );
    }
  };

  const skipBackward = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = Math.max(
        audioRef.current.currentTime - 15,
        0
      );
    }
  };

  // Enhanced volume change handler with drag state
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  // Enhanced progress bar click/drag with improved interaction
  const handleProgressChange = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current && progressRef.current && audioUrl) {
      const progressBar = progressRef.current;
      const rect = progressBar.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      const newTime = clickPosition * (audioRef.current.duration || 0);

      // Set new time
      audioRef.current.currentTime = newTime;

      // Update UI
      setSongInfo(prev => ({
        ...prev,
        currentTime: formatTime(newTime),
        progress: clickPosition * 100
      }));
    }
  };

  // Mouse down handler for progress bar
  const handleProgressMouseDown = () => {
    setIsDraggingProgress(true);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Mouse down handler for volume control
  const handleVolumeMouseDown = () => {
    setIsDraggingVolume(true);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Mouse up handler for both controls
  const handleMouseUp = () => {
    setIsDraggingProgress(false);
    setIsDraggingVolume(false);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Improved download handler that opens in a new tab
  const handleDownload = () => {
    if (audioUrl) {
      // Open the download URL in a new tab
      window.open(`http://127.0.0.1:5000/get-audio?download=true&t=${Date.now()}`, '_blank');
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
                onChange={(e) => handleLanguageChange(e.target.value)}
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
                const iconPath = `file_path/${selectedLanguage}Icon${index + 1}.png`;
                const audioPath = `file_path/${selectedLanguage}Voice${index + 1}.mp3`;
                const isSelected = selectedVoice?.value === voice.value;
                return (
                  <button
                    key={voice.value}
                    onClick={() => {
                      setSelectedVoice({ value: voice.value, label: voice.label });
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
                    <Play className="ml-2" />
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
                placeholder="Enter the description of the song and click GENERATE THE LYRICS. Including the emotion of the song (e.g., happy, sad) will create a better effect!"
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
                {isLoadingAlbumCover ? (
                  // Loading spinner while generating album cover
                  <div className="text-center p-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-gray-300">Generating album cover...</p>
                  </div>
                ) : albumCoverUrl ? (
                  // Display the generated album cover
                  <img
                    src={albumCoverUrl}
                    alt="Album Cover"
                    className="w-full h-full object-cover"
                  />
                ) : generatedLyrics ? (
                  // Placeholder before album cover is generated
                  <div className="text-center p-4">
                    <p className="text-gray-400">Generate the music to generate album cover</p>
                  </div>
                ) : (
                  // Default state when no lyrics are generated yet
                  <div className="text-gray-400 text-center p-4">
                    Generate lyrics to create music and album cover
                  </div>
                )}
              </div>

              {/* Song Info */}
              <div className="text-center">
                <h3 className="text-xl font-bold">{songInfo.title || "No song generated"}</h3>
                <p className="text-gray-400">{selectedLanguage || "Select a language"}</p>
              </div>

              {/* Download Button - Moved to top corner */}
              <div className="flex justify-end mb-2">
                <button
                  className="flex items-center bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm"
                  onClick={handleDownload}
                  disabled={!audioUrl}
                  title="Download song"
                >
                  <Download className={`w-4 h-4 mr-1 ${!audioUrl ? 'opacity-50' : ''}`} />
                  Download
                </button>
              </div>

              {/* Interactive Progress Bar */}
              <div
                ref={progressRef}
                className={`w-full bg-gray-700 rounded-full h-2 ${audioUrl ? 'cursor-pointer' : 'cursor-not-allowed'} relative group`}
                onClick={audioUrl ? handleProgressChange : undefined}
              >
                <div
                  className="bg-purple-600 h-2 rounded-full relative"
                  style={{ width: `${songInfo.progress || 0}%` }}
                >
                  {/* Draggable handle that appears larger when active */}
                  <div
                    className={`absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full transition-all ${
                      isDraggingProgress || audioUrl && 'group-hover:scale-150'
                    } ${isDraggingProgress ? 'scale-200 shadow-lg' : ''}`}
                  ></div>
                </div>
              </div>

              {/* Time */}
              <div className="flex justify-between text-sm text-gray-400">
                <span>{songInfo.currentTime}</span>
                <span>{songInfo.duration}</span>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center space-x-4">
                <button
                  className="p-2 hover:text-purple-500 transition-colors"
                  onClick={skipBackward}
                  title="Rewind 15 seconds"
                >
                  <Back15Icon />
                </button>
                <button
                  onClick={togglePlayPause}
                  className={`p-4 rounded-full transition-all duration-200 ${
                    audioUrl ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 cursor-not-allowed'
                  }`}
                  disabled={!audioUrl}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8" />
                  )}
                </button>
                <button
                  className="p-2 hover:text-purple-500 transition-colors"
                  onClick={skipForward}
                  title="Forward 15 seconds"
                >
                  <Forward15Icon />
                </button>
              </div>

              {/* Enhanced Volume Control */}
              <div className="flex items-center space-x-2 group">
                <Volume2 className="w-5 h-5" />
                <div className="relative w-full h-4 flex items-center">
                  <div className="absolute w-full h-2 bg-gray-700 rounded-lg"></div>
                  <div
                    className="absolute h-2 bg-purple-600 rounded-lg"
                    style={{ width: `${volume}%` }}
                  ></div>
                  <input
                    ref={volumeRef}
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={handleVolumeChange}
                    onMouseDown={handleVolumeMouseDown}
                    className="absolute w-full h-2 opacity-0 cursor-pointer z-10"
                  />
                  {/* Draggable handle for volume control */}
                  <div
                    className={`absolute h-4 w-4 rounded-full bg-white pointer-events-none transition-all z-20 ${
                      isDraggingVolume ? 'scale-125 shadow-lg' : 'group-hover:scale-110'
                    }`}
                    style={{ left: `calc(${volume}% - 8px)` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Music Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleCreateMusic}
            className={`bg-purple-600 hover:bg-purple-700 px-8 py-4 rounded transition-all duration-200 ${isLoadingMelody ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            disabled={isLoadingMelody}
          >
            {isLoadingMelody ? 'Melody Loading...' : '🎵 CREATE THE MUSIC! 🎵'}
          </button>
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={audioUrl || undefined} // Use undefined instead of empty string
          onLoadedData={() => console.log("Audio loaded successfully", audioUrl)}
          onError={(e) => console.error("Audio error:", e)}
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