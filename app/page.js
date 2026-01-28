'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, SkipBack, SkipForward, Heart, Radio, Settings, Wifi, Search, Plus } from 'lucide-react';

export default function BoseSoundTouchController() {
  const [deviceIP, setDeviceIP] = useState('');
  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(50);
  const [muted, setMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [presets, setPresets] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const savedIP = localStorage.getItem('boseDeviceIP');
    const savedFavorites = localStorage.getItem('boseFavorites');
    
    if (savedIP) {
      setDeviceIP(savedIP);
    }
    
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  useEffect(() => {
    if (deviceIP && connected) {
      localStorage.setItem('boseDeviceIP', deviceIP);
    }
  }, [deviceIP, connected]);

  useEffect(() => {
    localStorage.setItem('boseFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const connectToDevice = async (ip) => {
    try {
      const response = await fetch(`/api/bose?endpoint=/info&ip=${ip}`);
      if (response.ok) {
        setConnected(true);
        setError(null);
        fetchPresets(ip);
        fetchNowPlaying(ip);
        fetchVolume(ip);
      }
    } catch (err) {
      setError('Failed to connect. Make sure you\'re on the same network and the IP is correct.');
      setConnected(false);
    }
  };

  const fetchVolume = async (ip) => {
    try {
      const response = await fetch(`/api/bose?endpoint=/volume&ip=${ip}`);
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      
      const actualVol = xml.querySelector('actualvolume')?.textContent;
      const muteEnabled = xml.querySelector('muteenabled')?.textContent === 'true';
      
      if (actualVol) setVolume(parseInt(actualVol));
      setMuted(muteEnabled);
    } catch (err) {
      console.error('Failed to fetch volume', err);
    }
  };

  const fetchNowPlaying = async (ip) => {
    try {
      const response = await fetch(`/api/bose?endpoint=/now_playing&ip=${ip}`);
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      
      const playStatus = xml.querySelector('playStatus')?.textContent;
      const stationName = xml.querySelector('stationName')?.textContent;
      const track = xml.querySelector('track')?.textContent;
      const artist = xml.querySelector('artist')?.textContent;
      const art = xml.querySelector('art')?.textContent;
      const contentItem = xml.querySelector('ContentItem');
      const source = contentItem?.getAttribute('source');
      const location = contentItem?.getAttribute('location');
      
      const isCurrentlyPlaying = playStatus === 'PLAY_STATE';
      
      setIsPlaying(isCurrentlyPlaying);
      setNowPlaying({
        station: stationName || track || 'Unknown Station',
        track: track !== stationName ? track : null,
        artist: artist,
        art: art,
        source: source,
        location: location
      });
      
      console.log('Now playing updated:', {
        station: stationName,
        playing: isCurrentlyPlaying,
        source: source
      });
    } catch (err) {
      console.error('Failed to fetch now playing', err);
    }
  };

  const fetchPresets = async (ip) => {
    try {
      const response = await fetch(`/api/bose?endpoint=/presets&ip=${ip}`);
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      
      const presetElements = xml.querySelectorAll('preset');
      const presetList = Array.from(presetElements).map(preset => ({
        id: preset.getAttribute('id'),
        name: preset.querySelector('itemName')?.textContent,
        source: preset.querySelector('ContentItem')?.getAttribute('source'),
        location: preset.querySelector('ContentItem')?.getAttribute('location')
      }));
      
      setPresets(presetList);
    } catch (err) {
      console.error('Failed to fetch presets', err);
    }
  };

  const searchTuneIn = async (query) => {
    if (!query.trim()) return;
    
    setSearching(true);
    setSearchResults([]);
    
    try {
      // Use our API proxy to search TuneIn
      const response = await fetch(`/api/tunein?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.body && data.body.length > 0) {
        const results = data.body
          .filter(item => item.type === 'audio')
          .slice(0, 20)
          .map(item => ({
            name: item.text,
            location: item.URL || item.guide_id,
            source: 'TUNEIN',
            type: item.subtext || 'Radio Station',
            preset_id: item.preset_id || item.guide_id
          }));
        
        setSearchResults(results);
        if (results.length === 0) {
          setError('No stations found. Try a different search.');
        }
      } else {
        setError('No results found. Try a different search.');
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Check your internet connection.');
    } finally {
      setSearching(false);
    }
  };

  const playStation = async (station) => {
    try {
      // For TuneIn stations, use the guide_id format
      let location = station.location;
      
      // Extract station ID from URL if needed
      if (location && location.includes('Tune.ashx?id=')) {
        const match = location.match(/id=([^&]+)/);
        if (match) {
          location = match[1];
        }
      }
      
      // Simple XML format that Bose accepts
      const selectXml = `<ContentItem source="TUNEIN" location="${location}"><itemName>${station.name}</itemName></ContentItem>`;
      
      console.log('Sending:', selectXml);
      
      const response = await fetch(`/api/bose?endpoint=/select&ip=${deviceIP}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: selectXml
      });
      
      const responseText = await response.text();
      console.log('Response:', responseText);
      
      if (response.ok && !responseText.includes('error')) {
        // Wait a moment for the station to be selected
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Send PLAY command to start playback
        await fetch(`/api/bose?endpoint=/key&ip=${deviceIP}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: `<key state="press" sender="BoseApp">PLAY</key>`
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await fetch(`/api/bose?endpoint=/key&ip=${deviceIP}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: `<key state="release" sender="BoseApp">PLAY</key>`
        });
        
        // Multiple attempts to get updated status
        setTimeout(() => fetchNowPlaying(deviceIP), 500);
        setTimeout(() => fetchNowPlaying(deviceIP), 1500);
        setTimeout(() => fetchNowPlaying(deviceIP), 3000);
        setShowSearch(false);
        setError(null);
      } else {
        console.error('Play failed:', responseText);
        setError('Failed to play station. Try another one.');
      }
    } catch (err) {
      console.error('Failed to play station:', err);
      setError('Failed to play station');
    }
  };

  const saveToPreset = async (presetNumber) => {
    if (!nowPlaying || !nowPlaying.source || !nowPlaying.location) {
      setError('No station currently playing to save');
      return;
    }
    
    try {
      const presetXml = `<preset id="${presetNumber}"><ContentItem source="${nowPlaying.source}" location="${nowPlaying.location}" sourceAccount=""><itemName>${nowPlaying.station}</itemName></ContentItem></preset>`;
      
      await fetch(`/api/bose?endpoint=/preset&ip=${deviceIP}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: presetXml
      });
      
      // Refresh presets
      fetchPresets(deviceIP);
      setError(null);
    } catch (err) {
      console.error('Failed to save preset:', err);
      setError('Failed to save preset');
    }
  };

  const sendKey = async (key) => {
    if (!connected) return;
    
    try {
      await fetch(`/api/bose?endpoint=/key&ip=${deviceIP}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: `<key state="press" sender="BoseApp">${key}</key>`
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await fetch(`/api/bose?endpoint=/key&ip=${deviceIP}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: `<key state="release" sender="BoseApp">${key}</key>`
      });
    } catch (err) {
      console.error('Failed to send key:', err);
      setError('Failed to send command');
    }
  };

  const setVolumeLevel = async (newVolume) => {
    if (!connected) return;
    
    try {
      const response = await fetch(`/api/bose?endpoint=/volume&ip=${deviceIP}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: `<volume>${newVolume}</volume>`
      });
      
      if (response.ok) {
        setVolume(newVolume);
      }
    } catch (err) {
      console.error('Failed to set volume:', err);
    }
  };

  const toggleMute = async () => {
    if (!connected) return;
    
    try {
      const response = await fetch(`/api/bose?endpoint=/volume&ip=${deviceIP}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: `<volume>${volume}<muteenabled>${!muted}</muteenabled></volume>`
      });
      
      if (response.ok) {
        setMuted(!muted);
      }
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    }
  };

  const selectPreset = async (presetId) => {
    if (!connected) return;
    
    try {
      await sendKey(`PRESET_${presetId}`);
      setTimeout(() => fetchNowPlaying(deviceIP), 500);
    } catch (err) {
      setError('Failed to select preset');
    }
  };

  const addToFavorites = () => {
    if (!nowPlaying || !nowPlaying.station) return;
    
    const newFavorite = {
      id: Date.now(),
      name: nowPlaying.station,
      track: nowPlaying.track,
      artist: nowPlaying.artist,
      source: nowPlaying.source,
      location: nowPlaying.location
    };
    
    setFavorites([...favorites, newFavorite]);
  };

  const playFavorite = async (favorite) => {
    if (!favorite.source || !favorite.location) return;
    
    try {
      // Extract station ID if it's a URL
      let location = favorite.location;
      if (location && location.includes('Tune.ashx?id=')) {
        const match = location.match(/id=([^&]+)/);
        if (match) {
          location = match[1];
        }
      }
      
      const selectXml = `<ContentItem source="${favorite.source}" location="${location}"><itemName>${favorite.name}</itemName></ContentItem>`;
      
      await fetch(`/api/bose?endpoint=/select&ip=${deviceIP}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: selectXml
      });
      
      // Wait a moment then send PLAY command
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await fetch(`/api/bose?endpoint=/key&ip=${deviceIP}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: `<key state="press" sender="BoseApp">PLAY</key>`
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await fetch(`/api/bose?endpoint=/key&ip=${deviceIP}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: `<key state="release" sender="BoseApp">PLAY</key>`
      });
      
      setTimeout(() => fetchNowPlaying(deviceIP), 500);
      setTimeout(() => fetchNowPlaying(deviceIP), 1500);
    } catch (err) {
      console.error('Failed to play favorite:', err);
      setError('Failed to play favorite');
    }
  };

  const removeFavorite = (id) => {
    setFavorites(favorites.filter(fav => fav.id !== id));
  };

  const handleConnect = () => {
    if (deviceIP) {
      connectToDevice(deviceIP);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-700">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <Radio className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">SoundTouch</h1>
            <p className="text-slate-400">Connect to your Bose device</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Device IP Address
              </label>
              <input
                type="text"
                placeholder="192.168.0.23"
                value={deviceIP}
                onChange={(e) => setDeviceIP(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
              />
              <p className="text-xs text-slate-500 mt-2">
                Find this in your router settings
              </p>
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <button
              onClick={handleConnect}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg"
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">SoundTouch</h1>
              <p className="text-sm text-slate-400 flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                {deviceIP}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              title="Search TuneIn Radio"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm mb-4">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {nowPlaying && (
          <div className="bg-slate-800 rounded-2xl p-6 mb-6 border border-slate-700 shadow-xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Radio className="w-12 h-12 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold mb-1 truncate">{nowPlaying.station || 'No Station'}</h2>
                {nowPlaying.track && <p className="text-slate-300 truncate">{nowPlaying.track}</p>}
                {nowPlaying.artist && <p className="text-slate-400 text-sm truncate">{nowPlaying.artist}</p>}
              </div>
              <button
                onClick={addToFavorites}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                title="Add to favorites"
              >
                <Heart className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => sendKey('PREV_TRACK')}
                className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={() => sendKey('PLAY_PAUSE')}
                className="p-5 rounded-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 transition-all shadow-lg"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              <button
                onClick={() => sendKey('NEXT_TRACK')}
                className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleMute}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolumeLevel(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <span className="text-sm font-medium w-12 text-right">{volume}%</span>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Presets</h3>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(num => {
              const preset = presets.find(p => p.id === num.toString());
              return (
                <div key={num} className="relative">
                  <button
                    onClick={() => selectPreset(num)}
                    className="w-full bg-slate-800 hover:bg-slate-700 rounded-xl p-4 border border-slate-700 transition-colors text-left"
                  >
                    <div className="text-orange-500 font-bold mb-1">{num}</div>
                    <div className="text-sm truncate">{preset?.name || 'Empty'}</div>
                  </button>
                  {nowPlaying && (
                    <button
                      onClick={() => saveToPreset(num)}
                      className="absolute top-2 right-2 p-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
                      title="Save current station here"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">My Favorites</h3>
          {favorites.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700">
              <Heart className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-slate-400 text-sm">No favorites yet. Play a station and tap the heart to save it!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {favorites.map(fav => (
                <div
                  key={fav.id}
                  className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center justify-between hover:bg-slate-750 transition-colors"
                >
                  <button
                    onClick={() => playFavorite(fav)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="font-medium truncate">{fav.name}</p>
                    {fav.artist && <p className="text-sm text-slate-400 truncate">{fav.artist}</p>}
                  </button>
                  <button
                    onClick={() => removeFavorite(fav.id)}
                    className="ml-3 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {showSearch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowSearch(false)}>
            <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full border border-slate-700 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Search TuneIn Radio</h3>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Search for stations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchTuneIn(searchQuery)}
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  autoFocus
                />
                <button
                  onClick={() => searchTuneIn(searchQuery)}
                  disabled={searching}
                  className="px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => playStation(result)}
                      className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg p-3 text-left transition-colors"
                    >
                      <p className="font-medium">{result.name}</p>
                      <p className="text-xs text-slate-400">{result.type}</p>
                    </button>
                  ))}
                </div>
              )}

              {!searching && searchResults.length === 0 && searchQuery && (
                <p className="text-slate-400 text-center py-8">No results found. Try a different search.</p>
              )}

              <button
                onClick={() => setShowSearch(false)}
                className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowSettings(false)}>
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Device IP</label>
                  <input
                    type="text"
                    value={deviceIP}
                    onChange={(e) => setDeviceIP(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <button
                  onClick={() => {
                    setConnected(false);
                    setShowSettings(false);
                    if (wsRef.current) wsRef.current.close();
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
