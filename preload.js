const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');
const config = require('./config.js');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded'); // Debug

  // Przyciski kontrolne okna
  const minimizeBtn = document.querySelector('#minimizeBtn');
  const maximizeBtn = document.querySelector('#maximizeBtn');
  const closeBtn = document.querySelector('#closeBtn');
  const panelToggle = document.querySelector('#panel-toggle');
  const rightPanel = document.querySelector('#right-panel');
  const editorContainer = document.querySelector('#editor-container');
  const editor = document.getElementById('editor');

  console.log('Elements:', {
    minimizeBtn,
    maximizeBtn,
    closeBtn,
    panelToggle,
    rightPanel,
    editorContainer,
    editor
  });

  // Obsługa przycisków okna
  minimizeBtn.onclick = () => {
    console.log('Minimize clicked');
    ipcRenderer.send('minimize-window');
  };

  maximizeBtn.onclick = () => {
    console.log('Maximize clicked');
    ipcRenderer.send('maximize-window');
  };

  closeBtn.onclick = () => {
    console.log('Close clicked');
    ipcRenderer.send('close-window');
  };

  // Animacja przy starcie
  document.querySelectorAll('.animated').forEach(element => {
    element.style.opacity = '0';
    setTimeout(() => {
      element.style.opacity = '1';
    }, 100);
  });

  // Panel boczny
  panelToggle.onclick = () => {
    console.log('Panel toggle clicked');
    const isOpen = rightPanel.classList.contains('open');
    
    if (!isOpen) {
      rightPanel.classList.add('open');
      panelToggle.classList.add('open');
      editorContainer.style.paddingRight = '300px';
      
      // Animacja sekcji
      document.querySelectorAll('.panel-section').forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateX(30px)';
        
        setTimeout(() => {
          section.style.opacity = '1';
          section.style.transform = 'translateX(0)';
        }, 100 + (index * 100));
      });
    } else {
      rightPanel.classList.remove('open');
      panelToggle.classList.remove('open');
      editorContainer.style.paddingRight = '20px';
      
      document.querySelectorAll('.panel-section').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateX(30px)';
      });
    }
  };

  // Obsługa przycisków z lewego paska
  const newFileBtn = document.getElementById('newFileBtn');
  const openFileBtn = document.getElementById('openFileBtn');
  const saveFileBtn = document.getElementById('saveFileBtn');
  const settingsBtn = document.querySelector('#settingsBtn');

  newFileBtn?.addEventListener('click', () => {
    if (confirm('Czy chcesz utworzyć nowy plik? Niezapisane zmiany zostaną utracone.')) {
      editor.value = '';
    }
  });

  openFileBtn?.addEventListener('click', () => {
    ipcRenderer.send('open-file');
  });

  saveFileBtn?.addEventListener('click', () => {
    ipcRenderer.send('save-file');
  });

  // Obsługa przycisku ustawień
  settingsBtn.onclick = () => {
    console.log('Settings clicked');
    if (!rightPanel.classList.contains('open')) {
      panelToggle.click();
    }
  };

  // Nasłuchiwanie na odpowiedź z głównego procesu
  ipcRenderer.on('file-content', (event, content) => {
    editor.value = content;
  });

  // Helper – konwersja HEX do RGBA
  function hexToRgba(hex, alpha) {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  // Funkcje aktualizujące ustawienia
  function updateWindowOpacity(value) {
    const opacity = Math.max(0.1, value / 100);
    const primaryColor = getComputedStyle(document.documentElement)
                           .getPropertyValue('--primary-color').trim() || '#1a1b26';
    const newBg = hexToRgba(primaryColor, opacity);
    const elements = [
      document.getElementById('editor'),
      document.getElementById('left-sidebar'),
      document.getElementById('right-panel')
    ];
    elements.forEach(element => {
      if (element) {
        element.style.backgroundColor = newBg;
      }
    });
    config.set('windowOpacity', value);
  }

  function updateTaskbarOpacity(value) {
    const opacity = Math.max(0.1, value / 100);
    const secondaryColor = getComputedStyle(document.documentElement)
                             .getPropertyValue('--secondary-color').trim() || '#1f2335';
    const newBg = hexToRgba(secondaryColor, opacity);
    const taskbar = document.getElementById('taskbar');
    if (taskbar) {
      taskbar.style.backgroundColor = newBg;
    }
    config.set('taskbarOpacity', value);
  }

  function updateBlurEffect(value) {
    const maxBlur = 20; // maksymalnie 20px
    const blurAmount = (value / 100) * maxBlur;
    const elements = [
      document.getElementById('editor'),
      document.getElementById('left-sidebar'),
      document.getElementById('right-panel'),
      document.getElementById('taskbar')
    ];
    elements.forEach(element => {
      if (element) {
        element.style.backdropFilter = `blur(${blurAmount}px)`;
      }
    });
    config.set('blurEffect', value);
  }

  function updateGlobalOpacity(value) {
    const globalOpacity = Math.max(0.1, value / 100);
    document.body.style.opacity = globalOpacity;
    config.set('globalOpacity', value);
  }

  function updateThemeOverlay(enabled, intensity = 30) {
    const currentTheme = config.get('theme') || 'midnight';
    const theme = themes[currentTheme];
    if (!theme) return;

    const accentColor = theme['--accent-color'];
    const rgb = hexToRgb(accentColor);
    
    // Usuń starą nakładkę jeśli istnieje
    const existingOverlay = document.querySelector('.theme-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    if (enabled) {
      // Tworzenie nowej nakładki
      const overlay = document.createElement('div');
      overlay.className = 'theme-overlay';
      overlay.style.background = `linear-gradient(
        135deg,
        rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity/200}),
        rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity/400})
      )`;
      document.body.appendChild(overlay);

      // Aplikowanie efektów na interfejsie
      const interfaceElements = [
        document.getElementById('editor'),
        document.getElementById('left-sidebar'),
        document.getElementById('right-panel'),
        document.getElementById('taskbar')
      ];

      interfaceElements.forEach(el => {
        if (el) {
          el.style.boxShadow = `inset 0 0 0 1000px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity/400})`;
          el.style.borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity/200})`;
        }
      });

      // Aktualizacja kolorów tekstu i ikon
      document.documentElement.style.setProperty('--text-color', 
        intensity > 50 ? '#1a1b26' : '#c0caf5'
      );
    } else {
      // Przywracanie domyślnych kolorów
      const interfaceElements = [
        document.getElementById('editor'),
        document.getElementById('left-sidebar'),
        document.getElementById('right-panel'),
        document.getElementById('taskbar')
      ];

      interfaceElements.forEach(el => {
        if (el) {
          el.style.boxShadow = '';
          el.style.borderColor = 'var(--border-color)';
        }
      });

      document.documentElement.style.setProperty('--text-color', '#c0caf5');
    }

    // Aktualizacja ustawień
    config.setNestedValue('themeOverlay', 'enabled', enabled);
    config.setNestedValue('themeOverlay', 'intensity', intensity);
  }

  // Dodaj aktualizację suwaka przy zmianie wartości
  function updateSliderBackground(slider) {
    const value = slider.value;
    const percentage = (value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.setProperty('--value', `${percentage}%`);
  }

  // Obsługa wszystkich suwaków
  const windowOpacitySlider = document.getElementById('windowOpacitySlider');
  const taskbarOpacitySlider = document.getElementById('taskbarOpacitySlider');
  const blurEffectSlider = document.getElementById('blurEffectSlider');
  const globalOpacitySlider = document.getElementById('globalOpacitySlider');

  const windowSliderValue = windowOpacitySlider.nextElementSibling;
  const taskbarSliderValue = taskbarOpacitySlider.nextElementSibling;
  const blurSliderValue = blurEffectSlider.nextElementSibling;
  const globalSliderValue = globalOpacitySlider.nextElementSibling;

  // Inicjalizacja tła dla wszystkich suwaków
  document.querySelectorAll('.slider').forEach(slider => {
    updateSliderBackground(slider);
  });

  // Obsługa zdarzeń dla suwaków
  windowOpacitySlider.addEventListener('input', () => {
    const value = windowOpacitySlider.value;
    windowSliderValue.textContent = `${value}%`;
    updateWindowOpacity(value);
    updateSliderBackground(windowOpacitySlider);
  });

  taskbarOpacitySlider.addEventListener('input', () => {
    const value = taskbarOpacitySlider.value;
    taskbarSliderValue.textContent = `${value}%`;
    updateTaskbarOpacity(value);
    updateSliderBackground(taskbarOpacitySlider);
  });

  blurEffectSlider.addEventListener('input', () => {
    const value = blurEffectSlider.value;
    blurSliderValue.textContent = `${value}%`;
    updateBlurEffect(value);
    updateSliderBackground(blurEffectSlider);
  });

  globalOpacitySlider.addEventListener('input', () => {
    const value = globalOpacitySlider.value;
    globalSliderValue.textContent = `${value}%`;
    updateGlobalOpacity(value);
    updateSliderBackground(globalOpacitySlider);
  });

  // Obsługa nakładki tematycznej
  const themeOverlayToggle = document.getElementById('themeOverlayToggle');
  const overlayIntensitySlider = document.getElementById('overlayIntensitySlider');
  const overlaySliderValue = overlayIntensitySlider.nextElementSibling;
  const overlaySliderContainer = document.querySelector('.overlay-slider');

  themeOverlayToggle.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    overlaySliderContainer.style.display = isChecked ? 'block' : 'none';
    const intensity = overlayIntensitySlider.value;
    updateThemeOverlay(isChecked, intensity);
  });

  overlayIntensitySlider.addEventListener('input', (e) => {
    const value = e.target.value;
    overlaySliderValue.textContent = `${value}%`;
    updateThemeOverlay(themeOverlayToggle.checked, value);
  });

  // Zestaw motywów – kolory i motywy wideo
  const themes = {
    midnight: {
      '--primary-color': '#1a1b26',
      '--secondary-color': '#1f2335',
      '--accent-color': '#7aa2f7',
      '--text-color': '#c0caf5',
      '--border-color': '#292e42'
    },
    emerald: {
      '--primary-color': '#0f1c1a',
      '--secondary-color': '#1a2b29',
      '--accent-color': '#10b981',
      '--text-color': '#e2e8f0',
      '--border-color': '#234237'
    },
    purple: {
      '--primary-color': '#1a1625',
      '--secondary-color': '#251b38',
      '--accent-color': '#a855f7',
      '--text-color': '#e2e0e7',
      '--border-color': '#382a52'
    },
    coral: {
      '--primary-color': '#1c1917',
      '--secondary-color': '#292524',
      '--accent-color': '#f43f5e',
      '--text-color': '#e7e5e4',
      '--border-color': '#3f3f3f'
    }
  };

  function applyTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;
    const root = document.documentElement;
    Object.entries(theme).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    config.set('theme', themeName);
    document.querySelectorAll('.theme-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === themeName);
    });
    if (themeOverlayToggle.checked) {
      updateThemeOverlay(true, overlayIntensitySlider.value);
    }
  }

  document.querySelectorAll('.theme-button').forEach(button => {
    button.onclick = () => {
      const themeName = button.dataset.theme;
      applyTheme(themeName);
      localStorage.setItem('selected-theme', themeName);
    };
  });

  loadVideoThemes();
  
  const savedVideoTheme = localStorage.getItem('selected-video-theme');
  if (savedVideoTheme) {
    applyVideoTheme(savedVideoTheme);
  }

  window.addEventListener('load', () => {
    const savedSettings = {
      windowOpacity: config.get('windowOpacity'),
      taskbarOpacity: config.get('taskbarOpacity'),
      blurEffect: config.get('blurEffect'),
      globalOpacity: config.get('globalOpacity'),
      theme: config.get('theme'),
      videoTheme: config.get('videoTheme'),
      themeOverlay: config.get('themeOverlay')
    };

    // Ustawianie wartości suwaków
    windowOpacitySlider.value = savedSettings.windowOpacity;
    taskbarOpacitySlider.value = savedSettings.taskbarOpacity;
    blurEffectSlider.value = savedSettings.blurEffect;
    globalOpacitySlider.value = savedSettings.globalOpacity;

    // Aktualizacja wyświetlanych wartości
    windowSliderValue.textContent = `${savedSettings.windowOpacity}%`;
    taskbarSliderValue.textContent = `${savedSettings.taskbarOpacity}%`;
    blurSliderValue.textContent = `${savedSettings.blurEffect}%`;
    globalSliderValue.textContent = `${savedSettings.globalOpacity}%`;

    // Aktualizacja tła suwaków
    document.querySelectorAll('.slider').forEach(slider => {
      updateSliderBackground(slider);
    });

    // Aplikowanie ustawień
    updateWindowOpacity(savedSettings.windowOpacity);
    updateTaskbarOpacity(savedSettings.taskbarOpacity);
    updateBlurEffect(savedSettings.blurEffect);
    updateGlobalOpacity(savedSettings.globalOpacity);

    // Ustawienia nakładki tematycznej
    if (savedSettings.themeOverlay?.enabled) {
      themeOverlayToggle.checked = true;
      overlayIntensitySlider.value = savedSettings.themeOverlay.intensity;
      overlaySliderValue.textContent = `${savedSettings.themeOverlay.intensity}%`;
      overlaySliderContainer.style.display = 'block';
      updateThemeOverlay(true, savedSettings.themeOverlay.intensity);
      updateSliderBackground(overlayIntensitySlider);
    }

    if (savedSettings.theme) {
      applyTheme(savedSettings.theme);
    }

    if (savedSettings.videoTheme) {
      applyVideoTheme(savedSettings.videoTheme);
    }
  });

  // Dodaj funkcję do aktualizacji numerów linii
  function updateLineNumbers() {
    const editor = document.getElementById('editor');
    const lineNumbers = document.getElementById('line-numbers');
    const lines = editor.value.split('\n');
    
    lineNumbers.innerHTML = lines
      .map((_, index) => `<div class="line-number">${index + 1}</div>`)
      .join('');

    // Synchronizacja przewijania
    lineNumbers.scrollTop = editor.scrollTop;
  }

  // Dodaj nasłuchiwanie na zmiany w edytorze
  editor.addEventListener('input', updateLineNumbers);
  editor.addEventListener('scroll', () => {
    const lineNumbers = document.getElementById('line-numbers');
    lineNumbers.scrollTop = editor.scrollTop;
  });

  // Inicjalizacja numerów linii
  updateLineNumbers();
});

function insertAtCursor(element, text) {
  const start = element.selectionStart;
  const end = element.selectionEnd;
  const value = element.value;
  
  element.value = value.substring(0, start) + text + value.substring(end);
  element.selectionStart = element.selectionEnd = start + text.length;
  element.focus();
}

function loadVideoThemes() {
  const themesPath = path.join(__dirname, 'motywy');
  
  try {
    const files = fs.readdirSync(themesPath).filter(file => 
      file.toLowerCase().endsWith('.mp4') || file.toLowerCase().endsWith('.webm')
    );

    const themeGrid = document.querySelector('.theme-grid');
    const videoThemesSection = document.createElement('div');
    videoThemesSection.className = 'panel-section video-themes-section';
    videoThemesSection.innerHTML = `
      <div class="panel-title">Motywy wideo</div>
      <div class="video-theme-grid"></div>
    `;

    files.forEach(file => {
      const themeButton = document.createElement('button');
      themeButton.className = 'video-theme-button';
      const videoPath = path.join(themesPath, file);
      const displayName = file.slice(0, 10) + (file.length > 10 ? '...' : '');
      
      themeButton.innerHTML = `
        <video class="theme-preview-video" muted loop>
          <source src="${videoPath}" type="video/mp4">
        </video>
        <span>${displayName}</span>
      `;

      themeButton.addEventListener('mouseover', () => {
        const video = themeButton.querySelector('video');
        video.play();
      });

      themeButton.addEventListener('mouseout', () => {
        const video = themeButton.querySelector('video');
        video.pause();
        video.currentTime = 0;
      });

      themeButton.addEventListener('click', () => {
        applyVideoTheme(videoPath);
        document.querySelectorAll('.video-theme-button').forEach(btn => 
          btn.classList.remove('active')
        );
        themeButton.classList.add('active');
        localStorage.setItem('selected-video-theme', videoPath);
      });

      videoThemesSection.querySelector('.video-theme-grid').appendChild(themeButton);
    });

    const rightPanel = document.getElementById('right-panel');
    rightPanel.insertBefore(videoThemesSection, rightPanel.querySelector('.separator'));
  } catch (error) {
    console.error('Błąd podczas ładowania motywów wideo:', error);
  }
}

function applyVideoTheme(videoPath) {
  const backgroundVideo = document.getElementById('background-video');
  if (!backgroundVideo) {
    const video = document.createElement('video');
    video.id = 'background-video';
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.style.width = '100vw';
    video.style.height = '100vh';
    video.style.objectFit = 'cover';
    video.style.position = 'fixed';
    video.style.top = '0';
    video.style.left = '0';
    video.style.right = '0';
    video.style.bottom = '0';
    video.style.zIndex = '-2';
    video.innerHTML = `<source src="${videoPath}" type="video/mp4">`;
    document.getElementById('window-bg').appendChild(video);
  } else {
    backgroundVideo.querySelector('source').src = videoPath;
    backgroundVideo.load();
  }

  document.body.classList.add('video-theme-active');
  updateInterfaceForVideoTheme();
  
  const savedGlobalOpacity = config.get('globalOpacity') || 100;
  updateGlobalOpacity(savedGlobalOpacity);

  config.set('videoTheme', videoPath);
}

function updateInterfaceForVideoTheme() {
  const elements = [
    document.getElementById('editor'),
    document.getElementById('left-sidebar'),
    document.getElementById('right-panel')
  ];

  elements.forEach(element => {
    if (element) {
      element.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      element.style.backdropFilter = 'blur(10px)';
      element.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    }
  });

  const editor = document.getElementById('editor');
  if (editor) {
    editor.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.3)';
  }
}

function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
