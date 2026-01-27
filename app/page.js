const connectToDevice = async (ip) => {
  try {
    // OLD: const response = await fetch(`http://${ip}:8090/info`);
    // NEW:
    const response = await fetch(`/api/bose?endpoint=/info&ip=${ip}`);
    
    if (response.ok) {
      setConnected(true);
      setError(null);
      fetchPresets(ip);
      fetchNowPlaying(ip);
      fetchVolume(ip);
      setupWebSocket(ip);
    }
  } catch (err) {
    setError('Failed to connect. Make sure you\'re on the same network and the IP is correct.');
    setConnected(false);
  }
};

const fetchVolume = async (ip) => {
  try {
    // OLD: const response = await fetch(`http://${ip}:8090/volume`);
    // NEW:
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
    // OLD: const response = await fetch(`http://${ip}:8090/now_playing`);
    // NEW:
    const response = await fetch(`/api/bose?endpoint=/now_playing&ip=${ip}`);
    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    
    const playStatus = xml.querySelector('playStatus')?.textContent;
    const stationName = xml.querySelector('stationName')?.textContent;
    const track = xml.querySelector('track')?.textContent;
    const artist = xml.querySelector('artist')?.textContent;
    const art = xml.querySelector('art')?.textContent;
    
    setIsPlaying(playStatus === 'PLAY_STATE');
    setNowPlaying({
      station: stationName,
      track: track,
      artist: artist,
      art: art
    });
  } catch (err) {
    console.error('Failed to fetch now playing', err);
  }
};

const fetchPresets = async (ip) => {
  try {
    // OLD: const response = await fetch(`http://${ip}:8090/presets`);
    // NEW:
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

const sendKey = async (key) => {
  if (!connected) return;
  
  try {
    // OLD: await fetch(`http://${deviceIP}:8090/key`, {...});
    // NEW:
    await fetch(`/api/bose?endpoint=/key&ip=${deviceIP}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: `<key state="press" sender="BoseApp">${key}</key>`
    });
    
    await fetch(`/api/bose?endpoint=/key&ip=${deviceIP}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: `<key state="release" sender="BoseApp">${key}</key>`
    });
  } catch (err) {
    setError('Failed to send command');
  }
};

const setVolumeLevel = async (newVolume) => {
  if (!connected) return;
  
  try {
    // OLD: await fetch(`http://${deviceIP}:8090/volume`, {...});
    // NEW:
    await fetch(`/api/bose?endpoint=/volume&ip=${deviceIP}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: `<volume>${newVolume}</volume>`
    });
    setVolume(newVolume);
  } catch (err) {
    setError('Failed to set volume');
  }
};

const toggleMute = async () => {
  if (!connected) return;
  
  try {
    // OLD: await fetch(`http://${deviceIP}:8090/volume`, {...});
    // NEW:
    await fetch(`/api/bose?endpoint=/volume&ip=${deviceIP}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: `<volume>${volume}<muteenabled>${!muted}</muteenabled></volume>`
    });
    setMuted(!muted);
  } catch (err) {
    setError('Failed to toggle mute');
  }
};
