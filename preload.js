const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');
const config = require('./config.js');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded'); // Debugging

  // Przyciski kontrolne okna
  const minimizeBtn = document.querySelector('#minimizeBtn');
  const maximizeBtn = document.querySelector('#maximizeBtn');
  const closeBtn = document.querySelector('#closeBtn');
  const panelToggle = document.querySelector('#panel-toggle');
  const rightPanel = document.querySelector('#right-panel');
  const editorContainer = document.querySelector('#editor-container');
  const editor = document.getElementById('editor');

  console.log('Elements:', { // Debugging
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
    console.log('Minimize clicked'); // Debugging
    ipcRenderer.send('minimize-window');
  };

  maximizeBtn.onclick = () => {
    console.log('Maximize clicked'); // Debugging
    ipcRenderer.send('maximize-window');
  };

  closeBtn.onclick = () => {
    console.log('Close clicked'); // Debugging
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
    console.log('Panel toggle clicked'); // Debugging
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
    console.log('Settings clicked'); // Debugging
    if (!rightPanel.classList.contains('open')) {
      panelToggle.click();
    }
  };

  // Nasłuchiwanie na odpowiedź z głównego procesu
  ipcRenderer.on('file-content', (event, content) => {
    editor.value = content;
  });

  // Obsługa suwaków przezroczystości
  const windowOpacitySlider = document.getElementById('windowOpacitySlider');
  const taskbarOpacitySlider = document.getElementById('taskbarOpacitySlider');
  const windowSliderValue = windowOpacitySlider.nextElementSibling;
  const taskbarSliderValue = taskbarOpacitySlider.nextElementSibling;

  function updateWindowOpacity(value) {
    const opacity = Math.max(0.1, value / 100);
    
    // Aktualizuj przezroczystość całego okna
    document.body.style.backgroundColor = `rgba(31, 35, 53, ${opacity})`;
    
    // Aktualizuj elementy interfejsu
    const elements = [
      document.getElementById('editor'),
      document.getElementById('left-sidebar'),
      document.getElementById('right-panel'),
      document.getElementById('window-bg')
    ];
    
    elements.forEach(element => {
      if (element) {
        // Ustaw przezroczystość tła elementu
        element.style.backgroundColor = `rgba(31, 35, 53, ${opacity})`;
        
        // Dodaj efekt szkła przy większej przezroczystości
        if (value < 70) {
          element.style.backdropFilter = `blur(${Math.max(5, (100 - value) / 3)}px)`;
          element.style.borderColor = `rgba(255, 255, 255, ${0.1 - (value/1000)})`;
        } else {
          element.style.backdropFilter = 'none';
        }
      }
    });

    // Zapisz ustawienie
    config.set('windowOpacity', value);
  }

  function updateTaskbarOpacity(value) {
    const taskbar = document.getElementById('taskbar');
    const opacity = Math.max(0.1, value / 100); // Minimum 0.1 dla widoczności
    
    // Ulepszone efekty dla paska zadań
    taskbar.style.backgroundColor = `rgba(31, 35, 53, ${opacity})`;
    taskbar.style.backdropFilter = `blur(${Math.max(3, (100 - value) / 4)}px)`;
    
    // Dodajemy subtelną krawędź przy wysokiej przezroczystości
    if (value < 50) {
      taskbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
    } else {
      taskbar.style.borderBottom = 'none';
    }
  }

  // Obsługa przezroczystości okna
  windowOpacitySlider.oninput = () => {
    const value = windowOpacitySlider.value;
    windowSliderValue.textContent = `${value}%`;
    updateWindowOpacity(value);
  };

  // Obsługa przezroczystości paska zadań
  taskbarOpacitySlider.oninput = () => {
    const value = taskbarOpacitySlider.value;
    taskbarSliderValue.textContent = `${value}%`;
    updateTaskbarOpacity(value);
  };

  // Załaduj zapisane ustawienia przy starcie
  window.addEventListener('load', () => {
    // Załaduj ustawienia z konfiguracji
    const savedSettings = {
      windowOpacity: config.get('windowOpacity'),
      taskbarOpacity: config.get('taskbarOpacity'),
      blurEffect: config.get('blurEffect'),
      theme: config.get('theme'),
      videoTheme: config.get('videoTheme'),
      themeOverlay: config.get('themeOverlay')
    };

    // Zastosuj zapisane ustawienia
    windowOpacitySlider.value = savedSettings.windowOpacity;
    taskbarOpacitySlider.value = savedSettings.taskbarOpacity;
    blurEffectSlider.value = savedSettings.blurEffect;
    
    updateWindowOpacity(savedSettings.windowOpacity);
    updateTaskbarOpacity(savedSettings.taskbarOpacity);
    updateBlurEffect(savedSettings.blurEffect);

    // Aktualizuj wyświetlane wartości
    windowSliderValue.textContent = `${savedSettings.windowOpacity}%`;
    taskbarSliderValue.textContent = `${savedSettings.taskbarOpacity}%`;
    blurSliderValue.textContent = `${savedSettings.blurEffect}%`;

    // Zastosuj motyw
    if (savedSettings.theme) {
      applyTheme(savedSettings.theme);
    }

    // Zastosuj motyw wideo jeśli był ustawiony
    if (savedSettings.videoTheme) {
      applyVideoTheme(savedSettings.videoTheme);
    }

    // Zastosuj nakładkę jeśli była włączona
    if (savedSettings.themeOverlay?.enabled) {
      themeOverlayToggle.checked = true;
      overlayIntensitySlider.value = savedSettings.themeOverlay.intensity;
      overlaySliderValue.textContent = `${savedSettings.themeOverlay.intensity}%`;
      overlaySliderContainer.style.display = 'block';
      updateThemeOverlay(true, savedSettings.themeOverlay.intensity);
    }
  });

  // Zaktualizowane motywy z lepszymi kolorami
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

  // Funkcja do aplikowania motywu
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
  }

  // Nasłuchiwanie na przyciski motywów
  document.querySelectorAll('.theme-button').forEach(button => {
    button.onclick = () => {
      const themeName = button.dataset.theme;
      applyTheme(themeName);
    };
  });

  // Załaduj zapisany motyw przy starcie
  const savedTheme = localStorage.getItem('selected-theme');
  if (savedTheme) {
    applyTheme(savedTheme);
  }

  loadVideoThemes();
  
  // Przywróć ostatnio wybrany motyw wideo
  const savedVideoTheme = localStorage.getItem('selected-video-theme');
  if (savedVideoTheme) {
    applyVideoTheme(savedVideoTheme);
  }

  // Dodaj nowe funkcje do obsługi nakładki
  function updateThemeOverlay(enabled, intensity = 30) {
    const root = document.documentElement;
    const currentTheme = localStorage.getItem('selected-theme') || 'midnight';
    const theme = themes[currentTheme];
    
    if (!theme) return;

    const video = document.getElementById('background-video');
    const windowBg = document.getElementById('window-bg');
    
    if (enabled) {
      // Konwertuj kolor akcentu na RGB
      const accentColor = theme['--accent-color'];
      const rgb = hexToRgb(accentColor);
      
      // Tworzymy nakładkę z kolorem motywu
      const overlay = `linear-gradient(
        rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity/200}),
        rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity/400})
      )`;
      
      if (video) {
        video.style.filter = `saturate(${1 + intensity/100}) hue-rotate(${intensity/2}deg)`;
      }
      windowBg.style.background = overlay;
      windowBg.style.opacity = '1';
    } else {
      if (video) {
        video.style.filter = 'none';
      }
      windowBg.style.background = 'none';
    }

    config.setNestedValue('themeOverlay', 'enabled', enabled);
    config.setNestedValue('themeOverlay', 'intensity', intensity);
  }

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

  // Modyfikuj funkcję applyTheme
  const originalApplyTheme = applyTheme;
  applyTheme = function(themeName) {
    originalApplyTheme(themeName);
    if (themeOverlayToggle.checked) {
      updateThemeOverlay(true, overlayIntensitySlider.value);
    }
  };

  // Załaduj zapisane ustawienia nakładki
  const savedOverlayEnabled = localStorage.getItem('theme-overlay-enabled') === 'true';
  const savedOverlayIntensity = localStorage.getItem('theme-overlay-intensity') || '30';
  
  themeOverlayToggle.checked = savedOverlayEnabled;
  overlayIntensitySlider.value = savedOverlayIntensity;
  overlaySliderValue.textContent = `${savedOverlayIntensity}%`;
  overlaySliderContainer.style.display = savedOverlayEnabled ? 'block' : 'none';
  
  if (savedOverlayEnabled) {
    updateThemeOverlay(true, savedOverlayIntensity);
  }

  // Dodaj nową funkcję do obsługi globalnej przezroczystości
  function updateGlobalOpacity(value) {
    const opacity = Math.max(0.1, value / 100);
    
    // Lista wszystkich elementów do modyfikacji
    const elements = [
      document.body,
      document.getElementById('editor'),
      document.getElementById('left-sidebar'),
      document.getElementById('right-panel'),
      document.getElementById('window-bg')
    ];
    
    elements.forEach(element => {
      if (element) {
        // Ustawiamy przezroczystość tła
        element.style.backgroundColor = `rgba(31, 35, 53, ${opacity})`;
      }
    });

    // Specjalne traktowanie paska górnego - minimum 30% nieprzezroczystości
    const taskbar = document.getElementById('taskbar');
    if (taskbar) {
      const taskbarOpacity = Math.max(0.3, opacity);
      taskbar.style.backgroundColor = `rgba(31, 35, 53, ${taskbarOpacity})`;
    }

    // Zachowaj efekt szkła
    const glassElements = [
      document.getElementById('editor'),
      document.getElementById('left-sidebar'),
      document.getElementById('right-panel'),
      document.getElementById('taskbar')
    ];

    glassElements.forEach(element => {
      if (element) {
        element.style.backdropFilter = `blur(${Math.max(5, (100 - value) / 3)}px)`;
      }
    });

    config.set('globalOpacity', value);
  }

  // Dodaj nowy suwak do HTML i jego obsługę
  const globalOpacitySlider = document.getElementById('globalOpacitySlider');
  const globalSliderValue = globalOpacitySlider.nextElementSibling;

  globalOpacitySlider.oninput = () => {
    const value = globalOpacitySlider.value;
    globalSliderValue.textContent = `${value}%`;
    updateGlobalOpacity(value);
  };
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
    video.style.width = '100vw';  // Pełna szerokość okna
    video.style.height = '100vh'; // Pełna wysokość okna
    video.style.objectFit = 'cover'; // Zachowaj proporcje i wypełnij
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
  
  // Zastosuj zapisaną globalną przezroczystość
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

  // Specjalne style dla edytora
  const editor = document.getElementById('editor');
  if (editor) {
    editor.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.3)';
  }
}

// Pomocnicza funkcja do konwersji HEX na RGB
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