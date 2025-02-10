const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');
const config = require('./config.js');

const APP_DATA_DIR = path.join(__dirname, 'temp_files');

// Upewnij się, że katalog istnieje
if (!fs.existsSync(APP_DATA_DIR)) {
  fs.mkdirSync(APP_DATA_DIR);
}

let openFiles = [
  { name: 'untitled.txt', content: '', path: null, isModified: false }
];
let currentFileIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded');

  // Przyciski kontrolne okna
  const minimizeBtn = document.querySelector('#minimizeBtn');
  const maximizeBtn = document.querySelector('#maximizeBtn');
  const closeBtn = document.querySelector('#closeBtn');
  const panelToggle = document.querySelector('#panel-toggle');
  const rightPanel = document.querySelector('#right-panel');
  const editorContainer = document.querySelector('#editor-container');
  const editor = document.getElementById('editor');

  // Obsługa przycisków okna
  minimizeBtn.onclick = () => {
    ipcRenderer.send('minimize-window');
  };

  maximizeBtn.onclick = () => {
    ipcRenderer.send('maximize-window');
  };

  closeBtn.onclick = () => {
    ipcRenderer.send('close-window');
  };

  // Obsługa panelu prawego (ustawień)
  panelToggle.onclick = () => {
    const isOpen = rightPanel.classList.contains('open');
    if (!isOpen) {
      rightPanel.classList.add('open');
      panelToggle.classList.add('open');
      editorContainer.style.paddingRight = '300px';
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
    addNewFile();
  });

  openFileBtn?.addEventListener('click', () => {
    ipcRenderer.send('open-file');
  });

  saveFileBtn?.addEventListener('click', () => {
    const currentFile = openFiles[currentFileIndex];
    if (currentFile.path) {
      // Zapisz istniejący plik
      ipcRenderer.send('save-file', { content: editor.value, path: currentFile.path });
      currentFile.isModified = false;
      updateFileTabs();
    } else {
      // Pokaż dialog zapisu dla nowego pliku
      ipcRenderer.send('save-file-as', editor.value);
    }
  });

  settingsBtn.onclick = () => {
    if (!rightPanel.classList.contains('open')) {
      panelToggle.click();
    }
  };

  ipcRenderer.on('file-content', (event, content) => {
    editor.value = content;
  });

  // Funkcja do dodawania zakładki pliku
  function addFileTab(filename, setActive = false) {
    const openFilesBar = document.querySelector('.open-files-bar');
    if (setActive) {
      document.querySelectorAll('.file-tab').forEach(tab => {
        tab.classList.remove('active');
      });
    }
    const newTab = document.createElement('button');
    newTab.className = 'file-tab';
    if (setActive) newTab.classList.add('active');
    newTab.innerHTML = `
      <i class="fas fa-file-alt"></i>
      <span class="file-name">${filename}</span>
      <span class="close-tab-btn">
        <i class="fas fa-times"></i>
      </span>
    `;
    newTab.addEventListener('click', () => {
      document.querySelectorAll('.file-tab').forEach(tab => {
        tab.classList.remove('active');
      });
      newTab.classList.add('active');
    });

    // Dodanie zdarzenia zamykania zakładki
    const closeBtn = newTab.querySelector('.close-tab-btn');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Zapamiętanie, czy to była aktywna zakładka
      const wasActive = newTab.classList.contains('active');
      // Dodanie klasy animującej zamknięcie
      newTab.classList.add('closing');
      newTab.addEventListener('transitionend', () => {
        newTab.remove();
        if (wasActive) {
          // Jeśli usunięta zakładka była aktywna, ustaw pierwszą pozostałą zakładkę jako aktywną
          const remainingTab = document.querySelector('.file-tab:not(.closing)');
          if (remainingTab) {
            remainingTab.classList.add('active');
          }
        }
      }, { once: true });
    });

    const addBtn = document.getElementById('addFileTabBtn');
    openFilesBar.insertBefore(newTab, addBtn);
  }

  ipcRenderer.on('file-opened', (event, { filename, content, path }) => {
    const fileIndex = openFiles.findIndex(f => f.path === path);
    if (fileIndex !== -1) {
      // Plik już jest otwarty
      switchToFile(fileIndex);
    } else {
      // Dodaj nowy plik
      openFiles.push({ name: filename, content, path, isModified: false });
      switchToFile(openFiles.length - 1);
    }
  });

  // Obsługa przycisku "+" do otwierania nowego pliku
  const addFileTabBtn = document.getElementById('addFileTabBtn');
  addFileTabBtn?.addEventListener('click', () => {
    ipcRenderer.send('open-file');
  });

  // Helper – konwersja HEX do RGBA
  function hexToRgba(hex, alpha) {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  // Funkcje aktualizujące ustawienia
  function updateWindowOpacity(value) {
    const opacityAmount = value / 100;
    document.body.setAttribute('data-opacity', 'true');
    document.documentElement.style.setProperty('--opacity-amount', opacityAmount);
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
    const blurAmount = (value / 100) * 20;
    document.body.setAttribute('data-blur', 'true');
    document.documentElement.style.setProperty('--blur-amount', `${blurAmount}px`);
    config.set('blurEffect', value);
  }

  function updateGlobalOpacity(value) {
    const globalOpacity = value / 100;
    document.body.setAttribute('data-global-opacity', 'true');
    document.documentElement.style.setProperty('--global-opacity-amount', globalOpacity);
    config.set('globalOpacity', value);
  }

  // Funkcja nakładki tematycznej – usuwamy top bar z listy elementów
  function updateThemeOverlay(enabled, intensity = 30) {
    const currentTheme = config.get('theme') || 'midnight';
    const theme = themes[currentTheme];
    if (!theme) return;
    const accentColor = theme['--accent-color'];
    const rgb = hexToRgb(accentColor);
    
    // Usuń starą nakładkę, jeśli istnieje
    const existingOverlay = document.querySelector('.theme-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    if (enabled) {
      const overlay = document.createElement('div');
      overlay.className = 'theme-overlay';
      overlay.style.background = `linear-gradient(
        135deg,
        rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity/200}),
        rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity/400})
      )`;
      document.body.appendChild(overlay);
      // Lista elementów – UWAGA: TOP BAR pomijamy!
      const interfaceElements = [
        document.getElementById('editor'),
        document.getElementById('line-numbers'),
        document.querySelector('.open-files-bar'),
        document.getElementById('left-sidebar'),
        document.getElementById('right-panel')
      ];
      interfaceElements.forEach(el => {
        if (el) {
          el.style.boxShadow = `inset 0 0 0 1000px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity/400})`;
          el.style.borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity/200})`;
        }
      });
      document.documentElement.style.setProperty(
        '--text-color',
        intensity > 50 ? '#1a1b26' : '#c0caf5'
      );
    } else {
      const interfaceElements = [
        document.getElementById('editor'),
        document.getElementById('line-numbers'),
        document.querySelector('.open-files-bar'),
        document.getElementById('left-sidebar'),
        document.getElementById('right-panel')
      ];
      interfaceElements.forEach(el => {
        if (el) {
          el.style.boxShadow = '';
          el.style.borderColor = 'var(--border-color)';
        }
      });
      document.documentElement.style.setProperty('--text-color', '#c0caf5');
    }
    config.setNestedValue('themeOverlay', 'enabled', enabled);
    config.setNestedValue('themeOverlay', 'intensity', intensity);
  }

  function updateSliderBackground(slider) {
    const value = slider.value;
    const percentage = (value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.setProperty('--value', `${percentage}%`);
  }

  // Inicjalizacja suwaków
  const windowOpacitySlider = document.getElementById('windowOpacitySlider');
  const taskbarOpacitySlider = document.getElementById('taskbarOpacitySlider');
  const blurEffectSlider = document.getElementById('blurEffectSlider');
  const globalOpacitySlider = document.getElementById('globalOpacitySlider');

  const windowSliderValue = windowOpacitySlider.nextElementSibling;
  const taskbarSliderValue = taskbarOpacitySlider.nextElementSibling;
  const blurSliderValue = blurEffectSlider.nextElementSibling;
  const globalSliderValue = globalOpacitySlider.nextElementSibling;

  document.querySelectorAll('.slider').forEach(slider => {
    updateSliderBackground(slider);
  });

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

  // Nakładka tematyczna
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
    updateSliderBackground(overlayIntensitySlider);
  });

  // Definicje motywów
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
    },
    darkGold: {
      '--primary-color': '#1a1814',
      '--secondary-color': '#242021',
      '--accent-color': '#ffd700',
      '--text-color': '#e2e0d5',
      '--border-color': '#383432'
    },
    oceanNight: {
      '--primary-color': '#0f1b2d',
      '--secondary-color': '#162a45',
      '--accent-color': '#00ffff',
      '--text-color': '#e0f2ff',
      '--border-color': '#234567'
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
      windowOpacity: config.get('windowOpacity') || 100,
      taskbarOpacity: config.get('taskbarOpacity') || 100,
      blurEffect: config.get('blurEffect') || 20,
      globalOpacity: config.get('globalOpacity') || 100,
      theme: config.get('theme'),
      videoTheme: config.get('videoTheme'),
      themeOverlay: config.get('themeOverlay')
    };

    windowOpacitySlider.value = savedSettings.windowOpacity;
    taskbarOpacitySlider.value = savedSettings.taskbarOpacity;
    blurEffectSlider.value = savedSettings.blurEffect;
    globalOpacitySlider.value = savedSettings.globalOpacity;

    windowSliderValue.textContent = `${savedSettings.windowOpacity}%`;
    taskbarSliderValue.textContent = `${savedSettings.taskbarOpacity}%`;
    blurSliderValue.textContent = `${savedSettings.blurEffect}%`;
    globalSliderValue.textContent = `${savedSettings.globalOpacity}%`;

    document.querySelectorAll('.slider').forEach(slider => {
      updateSliderBackground(slider);
    });

    updateWindowOpacity(savedSettings.windowOpacity);
    updateTaskbarOpacity(savedSettings.taskbarOpacity);
    updateBlurEffect(savedSettings.blurEffect);
    updateGlobalOpacity(savedSettings.globalOpacity);

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

  // Aktualizacja funkcji updateLineNumbers
  function updateLineNumbers() {
    const lineNumbers = document.getElementById('line-numbers');
    const lines = editor.value.split('\n');
    
    // Dokładniejsze obliczanie aktualnej linii z uwzględnieniem pozycji kliknięcia
    const getClickedLine = () => {
      const rect = editor.getBoundingClientRect();
      const clickY = window.event ? window.event.clientY - rect.top : 0;
      const lineHeight = 21; // wysokość linii
      const editorPadding = 15; // padding górny edytora
      const scrollOffset = editor.scrollTop;
      
      // Obliczanie rzeczywistej linii z uwzględnieniem przewijania i paddingu
      const clickedLineNumber = Math.floor((clickY + scrollOffset - editorPadding) / lineHeight) + 1;
      return Math.max(1, Math.min(clickedLineNumber, lines.length));
    };

    // Użyj pozycji kliknięcia, jeśli jest to zdarzenie click, w przeciwnym razie użyj pozycji kursora
    const currentLine = window.event && window.event.type === 'click' 
      ? getClickedLine()
      : editor.value.substr(0, editor.selectionStart).split('\n').length;
    
    // Generowanie numerów linii
    lineNumbers.innerHTML = '';
    lines.forEach((_, index) => {
      const lineNumber = document.createElement('div');
      lineNumber.className = `line-number ${index + 1 === currentLine ? 'active' : ''}`;
      lineNumber.textContent = index + 1;
      lineNumbers.appendChild(lineNumber);
    });

    // Zachowanie pozycji przewijania
    const currentScroll = editor.scrollTop;
    lineNumbers.style.top = -currentScroll + 'px';
  }

  // Funkcja dostosowująca wysokość edytora
  function adjustEditorHeight() {
    const editorContentWrapper = document.querySelector('.editor-content-wrapper');
    const windowHeight = window.innerHeight;
    const topOffset = editorContentWrapper.getBoundingClientRect().top;
    const height = windowHeight - topOffset - 40; // Zwiększono margines dla pełnego przewijania

    editorContentWrapper.style.height = `${height}px`;
    editor.style.height = '100%';
  }

  // Dodanie obsługi zmiany rozmiaru okna
  window.addEventListener('resize', adjustEditorHeight);

  // Event listenery
  editor.addEventListener('scroll', () => {
    const lineNumbers = document.getElementById('line-numbers');
    const currentScroll = editor.scrollTop;
    lineNumbers.style.top = -currentScroll + 'px';
  });

  editor.addEventListener('input', updateLineNumbers);

  editor.addEventListener('click', (e) => {
    updateLineNumbers();
  });

  editor.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') {
      updateLineNumbers();
    }
  });

  // Dodanie obsługi klawiszy
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 4;
      updateLineNumbers();
    }
  });

  // Dodaj obsługę Ctrl+S
  editor.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      const currentFile = openFiles[currentFileIndex];
      
      if (currentFile.path && !currentFile.path.includes('untitled')) {
        // Szybkie zapisanie istniejącego pliku
        ipcRenderer.send('save-file', { content: editor.value, path: currentFile.path });
      } else {
        // Pokaż dialog zapisu dla nowego pliku
        ipcRenderer.send('save-file-as', editor.value);
      }
    }
  });

  // Inicjalizacja
  updateLineNumbers();
  adjustEditorHeight();

  function loadVideoThemes() {
    const themesPath = path.join(__dirname, 'motywy');
    try {
      const files = fs.readdirSync(themesPath).filter(file =>
        file.toLowerCase().endsWith('.mp4') || 
        file.toLowerCase().endsWith('.webm') ||
        file.toLowerCase().endsWith('.gif')
      );

      const videoThemesSection = document.createElement('div');
      videoThemesSection.className = 'panel-section video-themes-section';
      videoThemesSection.innerHTML = `
        <div class="panel-title">Motywy wideo</div>
        <div class="video-theme-grid"></div>
      `;

      const videoGrid = videoThemesSection.querySelector('.video-theme-grid');

      files.forEach(file => {
        const themeButton = document.createElement('button');
        themeButton.className = 'video-theme-button';
        const videoPath = path.join(themesPath, file);
        const displayName = file.length > 10 ? file.slice(0, 10) + '...' : file;
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
          document.querySelectorAll('.video-theme-button').forEach(btn => btn.classList.remove('active'));
          themeButton.classList.add('active');
          localStorage.setItem('selected-video-theme', videoPath);
        });
        videoGrid.appendChild(themeButton);
      });

      const rightPanel = document.getElementById('right-panel');
      const firstSeparator = rightPanel.querySelector('.separator');
      rightPanel.insertBefore(videoThemesSection, firstSeparator);
    } catch (error) {
      console.error('Błąd podczas ładowania motywów wideo:', error);
    }
  }

  function applyVideoTheme(mediaPath) {
    const backgroundVideo = document.getElementById('background-video');
    const isGif = mediaPath.toLowerCase().endsWith('.gif');
    const videoOptimization = config.getVideoOptimization();
    
    // Funkcja tworząca zoptymalizowany element wideo
    function createOptimizedVideo() {
      const video = document.createElement('video');
      video.id = 'background-video';
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      // Ustaw atrybut preload na 'metadata' dla mniejszego obciążenia
      video.setAttribute('preload', 'metadata');
      // Ustaw obraz zastępczy – poster umożliwia szybsze wyświetlenie statycznego obrazu
      video.setAttribute('poster', 'path/to/low-res-poster.jpg');

      // Ustawienia stylów dla pełnoekranowego tła
      Object.assign(video.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '-2',
        objectFit: 'cover'
      });

      if (videoOptimization.enabled) {
        // Możesz dostosować playbackRate oraz intensywność blur
        video.playbackRate = videoOptimization.playbackRate;
        if (videoOptimization.blur) {
          // Jeśli obciążenie GPU jest problemem, rozważ zmniejszenie lub wyłączenie efektu blur
          video.style.filter = `blur(${videoOptimization.blurAmount}px)`;
        }
      }

      return video;
    }

    if (!backgroundVideo) {
      if (isGif) {
        // Jeśli plik jest GIFem, używamy tagu <img>
        const img = document.createElement('img');
        img.id = 'background-video';
        Object.assign(img.style, {
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          position: 'fixed',
          top: '0',
          left: '0',
          zIndex: '-2'
        });
        img.src = mediaPath;
        document.getElementById('window-bg').appendChild(img);
      } else {
        // Tworzymy zoptymalizowany element wideo
        const video = createOptimizedVideo();
        video.innerHTML = `<source src="${mediaPath}" type="video/mp4">`;
        document.getElementById('window-bg').appendChild(video);
      }
    } else {
      if (isGif) {
        if (backgroundVideo.tagName === 'VIDEO') {
          const img = document.createElement('img');
          img.id = 'background-video';
          Object.assign(img.style, backgroundVideo.style);
          img.src = mediaPath;
          backgroundVideo.replaceWith(img);
        } else {
          backgroundVideo.src = mediaPath;
        }
      } else {
        backgroundVideo.querySelector('source').src = mediaPath;
        backgroundVideo.load();
      }
    }
    
    document.body.classList.add('video-theme-active');
    updateInterfaceForVideoTheme();
    const savedGlobalOpacity = config.get('globalOpacity') || 100;
    updateGlobalOpacity(savedGlobalOpacity);
    config.set('videoTheme', mediaPath);
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
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
  }

  // Funkcja do aktualizacji zakładek
  function updateFileTabs() {
    const openFilesBar = document.querySelector('.open-files-bar');
    const addBtn = document.getElementById('addFileTabBtn');
    
    // Usuń wszystkie zakładki oprócz przycisku dodawania
    Array.from(openFilesBar.children).forEach(child => {
      if (child.id !== 'addFileTabBtn') {
        child.remove();
      }
    });

    // Dodaj zakładki dla wszystkich otwartych plików
    openFiles.forEach((file, index) => {
      const tab = document.createElement('button');
      tab.className = `file-tab ${index === currentFileIndex ? 'active' : ''}`;
      
      // Skróć nazwę pliku, jeśli jest za długa
      const displayName = file.name.length > 20 
        ? file.name.substring(0, 17) + '...' 
        : file.name;
      
      tab.innerHTML = `
        <i class="fas fa-file-alt"></i>
        <span class="file-name" title="${file.name}">${displayName}${file.isModified ? ' *' : ''}</span>
        <span class="close-tab-btn">
          <i class="fas fa-times"></i>
        </span>
      `;

      tab.addEventListener('click', (e) => {
        if (!e.target.closest('.close-tab-btn')) {
          switchToFile(index);
        }
      });

      const closeBtn = tab.querySelector('.close-tab-btn');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeFile(index);
      });

      openFilesBar.insertBefore(tab, addBtn);
    });
  }

  // Funkcja przełączania między plikami
  function switchToFile(index) {
    // Zapisz zawartość aktualnego pliku
    openFiles[currentFileIndex].content = editor.value;
    
    currentFileIndex = index;
    editor.value = openFiles[index].content;
    updateFileTabs();
    updateLineNumbers();
  }

  // Funkcja zamykania pliku
  function closeFile(index) {
    if (openFiles[index].isModified) {
      if (!confirm('Plik zawiera niezapisane zmiany. Czy na pewno chcesz go zamknąć?')) {
        return;
      }
    }

    const file = openFiles[index];
    // Usuń plik tymczasowy, jeśli to był untitled
    if (file.path && file.path.includes(APP_DATA_DIR)) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error('Błąd podczas usuwania pliku tymczasowego:', error);
      }
    }

    openFiles.splice(index, 1);
    if (openFiles.length === 0) {
      addNewFile();
    } else {
      currentFileIndex = Math.min(currentFileIndex, openFiles.length - 1);
      editor.value = openFiles[currentFileIndex].content;
      updateFileTabs();
      updateLineNumbers();
    }
  }

  // Funkcja dodawania nowego pliku
  function addNewFile() {
    const tempPath = path.join(APP_DATA_DIR, `untitled-${openFiles.length + 1}.txt`);
    // Tworzenie pustego pliku
    fs.writeFileSync(tempPath, '');
    
    const newFile = { 
      name: `untitled-${openFiles.length + 1}.txt`, 
      content: '', 
      path: tempPath, 
      isModified: false 
    };
    openFiles.push(newFile);
    switchToFile(openFiles.length - 1);
  }

  // Obsługa zmian w edytorze
  editor.addEventListener('input', () => {
    openFiles[currentFileIndex].isModified = true;
    openFiles[currentFileIndex].content = editor.value;
    updateFileTabs();
    updateLineNumbers();
  });

  // Obsługa zapisywania pliku
  ipcRenderer.on('file-saved', (event, { path }) => {
    const fileIndex = openFiles.findIndex(f => f.path === path);
    if (fileIndex !== -1) {
      openFiles[fileIndex].isModified = false;
      updateFileTabs();
    }
  });

  ipcRenderer.on('file-saved-as', (event, { filename, path }) => {
    openFiles[currentFileIndex].name = filename;
    openFiles[currentFileIndex].path = path;
    openFiles[currentFileIndex].isModified = false;
    updateFileTabs();
  });

  // Dodaj obsługę nowych kontrolek
  const maxResolutionSelect = document.getElementById('maxResolutionSelect');
  
  maxResolutionSelect?.addEventListener('change', () => {
    const options = {
      maxResolution: maxResolutionSelect.value
    };
    config.setVideoOptimization(options);
    
    // Odśwież wideo jeśli istnieje
    const video = document.getElementById('background-video');
    if (video && video.tagName === 'VIDEO') {
      const currentSrc = video.querySelector('source').src;
      applyVideoTheme(currentSrc);
    }
  });

  // Załaduj zapisane ustawienia
  const savedOptimization = config.getVideoOptimization();
  if (maxResolutionSelect) {
    maxResolutionSelect.value = savedOptimization.maxResolution;
  }

  // Dodaj obsługę przycisku "Kod"
  const codeFormatBtn = document.querySelector('#codeFormatBtn');
  const syntaxOptions = document.querySelector('#syntax-options'); // Nowy kontener na checkboxy

  codeFormatBtn.addEventListener('click', () => {
    syntaxOptions.classList.toggle('visible');
  });

  // Inicjalizacja CodeMirror zamiast natywnego <textarea> dla lepszej obsługi kolorowania składni
  const editorTextArea = document.getElementById('editor');
  const cmEditor = CodeMirror.fromTextArea(editorTextArea, {
    lineNumbers: true,
    mode: "javascript",
    theme: "material-darker"
  });

  // Dodaj obsługę boxów wyboru języka (kolorowania kodu)
  const codeBoxes = document.querySelectorAll('.code-box');
  codeBoxes.forEach(box => {
    box.addEventListener('click', () => {
      const lang = box.getAttribute('data-language').toLowerCase();
      let mode;
      switch (lang) {
        case 'html':
          mode = 'htmlmixed';
          break;
        case 'css':
          mode = 'css';
          break;
        case 'javascript':
          mode = 'javascript';
          break;
        case 'cpp':
          mode = 'text/x-c++src';
          break;
        default:
          mode = 'javascript';
      }
      cmEditor.setOption('mode', mode);
      // Wyróżnij wybrany box, usuwając klasę active z pozostałych
      codeBoxes.forEach(b => b.classList.remove('active'));
      box.classList.add('active');
    });
  });

  // Dodanie obsługi nowych checkboxów dla funkcji kodowania
  const syntaxHighlightingOptions = {
    html: document.getElementById('syntaxHtml'),
    css: document.getElementById('syntaxCss'),
    javascript: document.getElementById('syntaxJavascript'),
    cpp: document.getElementById('syntaxCpp')
  };

  // Inicjalizacja checkboxów na podstawie ustawień
  const savedSyntax = config.get('syntaxHighlighting');
  Object.keys(syntaxHighlightingOptions).forEach(lang => {
    if (savedSyntax[lang]) {
      syntaxHighlightingOptions[lang].checked = true;
    }
  });

  // Obsługa zmian checkboxów
  Object.entries(syntaxHighlightingOptions).forEach(([lang, checkbox]) => {
    checkbox.addEventListener('change', () => {
      config.setNestedValue('syntaxHighlighting', lang, checkbox.checked);
      // Opcjonalnie możesz dodać tutaj logikę aktualizacji edytora
    });
  });
});
