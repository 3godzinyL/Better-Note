const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');
const config = require('./config.js');

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
    if (confirm('Czy chcesz utworzyć nowy plik? Niezapisane zmiany zostaną utracone.')) {
      editor.value = '';
      addFileTab('untitled.txt', true);
    }
  });

  openFileBtn?.addEventListener('click', () => {
    ipcRenderer.send('open-file');
  });

  saveFileBtn?.addEventListener('click', () => {
    ipcRenderer.send('save-file');
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

  ipcRenderer.on('file-opened', (event, filename) => {
    addFileTab(filename, true);
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

  // Numeracja linii w edytorze
  function updateLineNumbers() {
    const lineNumbers = document.getElementById('line-numbers');
    const lines = editor.value.split('\n');
    const currentLine = editor.value.substr(0, editor.selectionStart).split('\n').length;
    lineNumbers.innerHTML = lines
      .map((_, index) => `<div class="line-number ${index + 1 === currentLine ? 'active' : ''}">${index + 1}</div>`)
      .join('');
    lineNumbers.scrollTop = editor.scrollTop;
  }

  editor.addEventListener('input', updateLineNumbers);
  editor.addEventListener('click', updateLineNumbers);
  editor.addEventListener('keyup', updateLineNumbers);
  editor.addEventListener('scroll', () => {
    document.getElementById('line-numbers').scrollTop = editor.scrollTop;
  });

  updateLineNumbers();

  function loadVideoThemes() {
    const themesPath = path.join(__dirname, 'motywy');
    try {
      const files = fs.readdirSync(themesPath).filter(file =>
        file.toLowerCase().endsWith('.mp4') || file.toLowerCase().endsWith('.webm')
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
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
  }
});
