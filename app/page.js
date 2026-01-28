const sendKey = async (key) => {
  if (!connected) return;
  
  try {
    // Send press
    await fetch(`/api/bose?endpoint=/key&ip=${deviceIP}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'text/plain', // Changed from text/xml
      },
      body: `<key state="press" sender="BoseApp">${key}</key>`
    });
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Send release
    await fetch(`/api/bose?endpoint=/key&ip=${deviceIP}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'text/plain', // Changed from text/xml
      },
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
      headers: { 
        'Content-Type': 'text/plain', // Changed from text/xml
      },
      body: `<volume>${newVolume}</volume>`
    });
    
    if (response.ok) {
      setVolume(newVolume);
    } else {
      const text = await response.text();
      console.error('Volume error:', text);
    }
  } catch (err) {
    console.error('Failed to set volume:', err);
    setError('Failed to set volume');
  }
};

const toggleMute = async () => {
  if (!connected) return;
  
  try {
    const response = await fetch(`/api/bose?endpoint=/volume&ip=${deviceIP}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'text/plain', // Changed from text/xml
      },
      body: `<volume>${volume}<muteenabled>${!muted}</muteenabled></volume>`
    });
    
    if (response.ok) {
      setMuted(!muted);
    } else {
      const text = await response.text();
      console.error('Mute error:', text);
    }
  } catch (err) {
    console.error('Failed to toggle mute:', err);
    setError('Failed to toggle mute');
  }
};
```

---

## Test Again

1. **Save both files**
2. **Restart the server** (Ctrl+C then `npm run dev`)
3. **Refresh the browser**
4. **Try connecting and controlling**

Now check the **Terminal/Command Prompt** where your server is running. You should see debug logs like:
```
Sending to Bose: /volume <volume>50</volume>
Bose response: <status>OK</status>
