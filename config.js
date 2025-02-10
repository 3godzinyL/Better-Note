const fs = require('fs');
const path = require('path');

class Config {
  constructor() {
    this.configPath = path.join(__dirname, 'settings.json');
    this.defaults = {
      windowOpacity: 100,
      taskbarOpacity: 100,
      blurEffect: 20,
      globalOpacity: 100,
      theme: 'midnight',
      videoTheme: null,
      themeOverlay: {
        enabled: false,
        intensity: 30,
        blend: 'overlay'
      },
      videoOptimization: {
        enabled: true,
        playbackRate: 0.5,
        blur: true,
        blurAmount: 2
      },
      syntaxHighlighting: {
        html: false,
        css: false,
        javascript: false,
        cpp: false
      }
    };
    this.settings = this.loadSettings();
  }

  loadSettings() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return { ...this.defaults, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('Błąd podczas ładowania ustawień:', error);
    }
    return this.defaults;
  }

  saveSettings(settings) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(settings, null, 2));
      this.settings = settings;
    } catch (error) {
      console.error('Błąd podczas zapisywania ustawień:', error);
    }
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.saveSettings(this.settings);
  }

  setNestedValue(parent, key, value) {
    if (!this.settings[parent]) {
      this.settings[parent] = {};
    }
    this.settings[parent][key] = value;
    console.log(`Zapisuję ustawienie: ${parent}.${key} = ${value}`);
    this.saveSettings(this.settings);
    
    // Sprawdź, czy ustawienia zostały zapisane
    const saved = this.loadSettings();
    console.log('Aktualne ustawienia:', saved);
    
    if (saved[parent]?.[key] !== value) {
      console.error('Błąd zapisu ustawień!');
    }
  }

  getVideoOptimization() {
    return this.settings.videoOptimization || this.defaults.videoOptimization;
  }

  setVideoOptimization(options) {
    this.settings.videoOptimization = {
      ...this.settings.videoOptimization,
      ...options
    };
    this.saveSettings(this.settings);
  }
}

module.exports = new Config();
