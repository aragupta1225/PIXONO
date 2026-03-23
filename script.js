/* ═══════════════════════════════════════════
   PIXONO – Sticker Placement & Animations
   ═══════════════════════════════════════════ */

(function () {
    'use strict';

    // ── Sticker Definitions ─────────────────
    const stickerImages = [
        { src: 'assets/sticker-bow.png', alt: 'bow' },
        { src: 'assets/sticker-flower.png', alt: 'flower' },
        { src: 'assets/sticker-butterfly.png', alt: 'butterfly' },
        { src: 'assets/sticker-rainbow.png', alt: 'rainbow' },
        { src: 'assets/sticker-heart.png', alt: 'heart' },
        { src: 'assets/sticker-star.png', alt: 'star' },
        { src: 'assets/sticker-smiley.png', alt: 'smiley' },
    ];

    // Emoji stickers as a fallback / extra decoration
    const emojiStickers = ['🌸', '🎀', '⭐', '🦋', '🌈', '💖', '😊', '🌷', '✿', '♡', '☁️', '🍒'];

    // ── Sound Engine (Web Audio API) ────────
    let audioCtx;
    let masterGain;
    let bgmGain;
    
    // Load config
    let savedVol = localStorage.getItem('pixono_volume');
    // Default 50% max loudness (0.5), mapped linearly
    let masterVol = savedVol !== null ? parseFloat(savedVol) : 0.5; 
    let isSoundOn = masterVol > 0;
    
    let bgmInterval;
    let bgmStarted = false;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioCtx.createGain();
            // Up to 0.4 actual peak gain so 100% slider isn't destructive
            masterGain.gain.value = masterVol * 0.4;
            masterGain.connect(audioCtx.destination);
            
            bgmGain = audioCtx.createGain();
            bgmGain.gain.value = 0.5; // BGM is naturally mixed lower than SFX
            bgmGain.connect(masterGain);
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function updateVolume(newVol) {
        masterVol = newVol;
        isSoundOn = masterVol > 0;
        localStorage.setItem('pixono_volume', masterVol.toString());
        
        if (masterGain) {
            // Smoothly ramp volume
            masterGain.gain.setTargetAtTime(masterVol * 0.4, audioCtx.currentTime, 0.1);
        }
        
        const icon = document.getElementById('soundIcon');
        if (icon) {
            if (masterVol === 0) icon.textContent = '🔇';
            else if (masterVol < 0.5) icon.textContent = '🔉';
            else icon.textContent = '🔊';
        }
        
        if (isSoundOn && !bgmStarted) {
            startBGM(); 
        }
    }

    function toggleSound() {
        initAudio();
        const slider = document.getElementById('volumeSlider');
        if (isSoundOn) {
            updateVolume(0);
            if(slider) slider.value = 0;
        } else {
            // Restore to 50% or maximum
            updateVolume(0.5);
            if(slider) slider.value = 50;
        }
    }

    function playNote(freq, type='sine') {
        if (!audioCtx || (!isSoundOn && masterGain.gain.value === 0)) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(bgmGain);
        
        // music box envelope (louder attack with 0.8 to make it more audible natively)
        const time = audioCtx.currentTime;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.8, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 2.0);
        
        osc.start(time);
        osc.stop(time + 2.5);
    }

    function startBGM() {
        if (!audioCtx) initAudio();
        if (bgmStarted) return;
        bgmStarted = true;
        
        // Ethereal, dreamy pentatonic sequence (softer and more relaxing vibe)
        const lead = [554.37, 466.16, 415.30, 349.23, 415.30, 466.16, 622.25, 554.37];
        const bass = [277.18, 233.08, 174.61, 207.65];
        let step = 0;
        
        function scheduleNext() {
            if(!isSoundOn && masterGain.gain.value === 0) return; // skip processing if fully muted
            
            // Play lead note
            playNote(lead[step % lead.length], 'sine');
            
            // Play bass note every other beat
            if (step % 2 === 0) {
                playNote(bass[(step / 2) % bass.length], 'triangle');
            }
            
            step++;
        }
        
        scheduleNext();
        bgmInterval = setInterval(scheduleNext, 900); // Gentle flowing tempo
    }

    function playTone(freq, type, duration, vol, slideTo = null) {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        // Random pitch between 0.95 and 1.05 for playful feel
        const pitchShift = 0.95 + Math.random() * 0.1;
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq * pitchShift, audioCtx.currentTime);
        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(slideTo * pitchShift, audioCtx.currentTime + duration);
        }
        
        osc.connect(gain);
        gain.connect(masterGain);
        
        // Envelope: quick attack to 'vol', exponential decay to silence
        gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(vol, audioCtx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + duration);
    }

    // specific cute sounds
    function playPop() { playTone(800, 'sine', 0.08, 0.4, 400); } // Drop pitch = soft pop
    function playBubble() { playTone(300, 'sine', 0.12, 0.5, 900); } // Rise pitch = soft bubble
    
    function playSparkle() {
        playTone(1200, 'sine', 0.1, 0.3);
        setTimeout(() => playTone(1600, 'sine', 0.15, 0.2), 40);
        setTimeout(() => playTone(2400, 'sine', 0.3, 0.1), 80);
    }

    function playChime() {
        const notes = [880, 1108.7, 1318.5, 1760]; // A major magical chord
        notes.forEach((freq, i) => {
            setTimeout(() => playTone(freq, 'sine', 1.0, 0.15), i * 90);
        });
    }

    function playSecretSound() {
        // Magical, long sweeping ethereal arpeggio
        const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760];
        notes.forEach((freq, i) => {
            setTimeout(() => playTone(freq, 'sine', 3.5, 0.25), i * 110);
            setTimeout(() => playTone(freq * 1.5, 'triangle', 2.0, 0.1), i * 110 + 150);
        });
        setTimeout(() => playTone(2217.46, 'sine', 4.0, 0.2), 1000); // Super magical final ring
    }

    // ── Configuration ───────────────────────
    const TOTAL_IMAGE_STICKERS = 14;   // number of image stickers to place
    const TOTAL_EMOJI_STICKERS = 10;   // number of emoji stickers to place
    const CENTER_CLEAR_ZONE = {         // area to keep clear for logo
        xMin: 0.25,
        xMax: 0.75,
        yMin: 0.30,
        yMax: 0.72,
    };

    // ── Animation types ─────────────────────
    const animations = ['floatUp', 'floatDown', 'floatGentle', 'floatDrift'];

    // ── Utility Functions ───────────────────
    function randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function createConfetti() {
        const colors = ['#ff9cbd', '#ffde9e', '#b5fffc', '#ffb6c1', '#fff'];
        for (let i = 0; i < 30; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'cursor-particle'; // reuse particle style or similar
            confetti.style.backgroundColor = randomChoice(colors);
            confetti.style.width = randomBetween(5, 12) + 'px';
            confetti.style.height = confetti.style.width;
            confetti.style.borderRadius = '2px';
            confetti.style.position = 'fixed';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = '-10px';
            confetti.style.zIndex = '1000';
            confetti.style.pointerEvents = 'none';
            
            document.body.appendChild(confetti);

            const duration = randomBetween(2, 4);
            const xDrag = randomBetween(-100, 100);
            
            confetti.animate([
                { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
                { transform: `translate(${xDrag}px, 105vh) rotate(720deg)`, opacity: 0 }
            ], {
                duration: duration * 1000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });

            setTimeout(() => confetti.remove(), duration * 1000);
        }
    }

    function isInCenterZone(xPercent, yPercent) {
        return (
            xPercent > CENTER_CLEAR_ZONE.xMin &&
            xPercent < CENTER_CLEAR_ZONE.xMax &&
            yPercent > CENTER_CLEAR_ZONE.yMin &&
            yPercent < CENTER_CLEAR_ZONE.yMax
        );
    }

    function getRandomPosition() {
        let x, y;
        let attempts = 0;
        do {
            x = Math.random();
            y = Math.random();
            attempts++;
        } while (isInCenterZone(x, y) && attempts < 50);
        return { x, y };
    }

    // ── Place Image Stickers ────────────────
    function placeImageStickers(container) {
        for (let i = 0; i < TOTAL_IMAGE_STICKERS; i++) {
            const stickerData = stickerImages[i % stickerImages.length];
            const { x, y } = getRandomPosition();

            const size = randomBetween(50, 95);
            const rotStart = randomBetween(-20, 20);
            const rotEnd = rotStart + randomBetween(-8, 8);
            const rotMid = (rotStart + rotEnd) / 2 + randomBetween(-3, 3);
            const anim = randomChoice(animations);
            const duration = randomBetween(4, 8);
            const delay = randomBetween(0, 5);

            const wrapper = document.createElement('div');
            wrapper.style.position = 'absolute';
            wrapper.style.left = `${(x * 100).toFixed(1)}%`;
            wrapper.style.top = `${(y * 100).toFixed(1)}%`;
            wrapper.className = 'sticker-wrapper';
            wrapper.dataset.depth = randomBetween(1.2, 3).toFixed(1);

            const el = document.createElement('img');
            el.src = stickerData.src;
            el.alt = stickerData.alt;
            el.className = 'sticker';
            el.style.cssText = `
                width: ${size}px;
                height: auto;
                --rot-start: ${rotStart}deg;
                --rot-end: ${rotEnd}deg;
                --rot-mid: ${rotMid}deg;
                animation: ${anim} ${duration.toFixed(1)}s ease-in-out ${delay.toFixed(1)}s infinite;
                opacity: ${randomBetween(0.7, 0.95).toFixed(2)};
            `;
            
            wrapper.appendChild(el);
            container.appendChild(wrapper);
        }
    }

    // ── Place Emoji Stickers ────────────────
    function placeEmojiStickers(container) {
        for (let i = 0; i < TOTAL_EMOJI_STICKERS; i++) {
            const emoji = randomChoice(emojiStickers);
            const { x, y } = getRandomPosition();

            const size = randomBetween(22, 42);
            const rotStart = randomBetween(-25, 25);
            const rotEnd = rotStart + randomBetween(-10, 10);
            const rotMid = (rotStart + rotEnd) / 2;
            const anim = randomChoice(animations);
            const duration = randomBetween(5, 9);
            const delay = randomBetween(0, 6);

            const wrapper = document.createElement('div');
            wrapper.style.position = 'absolute';
            wrapper.style.left = `${(x * 100).toFixed(1)}%`;
            wrapper.style.top = `${(y * 100).toFixed(1)}%`;
            wrapper.className = 'sticker-wrapper';
            wrapper.dataset.depth = randomBetween(1.2, 3).toFixed(1);

            const el = document.createElement('span');
            el.className = 'sticker';
            el.textContent = emoji;
            el.style.cssText = `
                font-size: ${size}px;
                --rot-start: ${rotStart}deg;
                --rot-end: ${rotEnd}deg;
                --rot-mid: ${rotMid}deg;
                animation: ${anim} ${duration.toFixed(1)}s ease-in-out ${delay.toFixed(1)}s infinite;
                opacity: ${randomBetween(0.55, 0.85).toFixed(2)};
                filter: drop-shadow(1px 2px 3px rgba(0,0,0,0.08));
            `;

            wrapper.appendChild(el);
            container.appendChild(wrapper);
        }
    }

    function setupLetterInteractions() {
        const letters = document.querySelectorAll('.hero-logo span');
        letters.forEach(letter => {
            letter.addEventListener('mouseenter', () => {
                playPop();
            });
            letter.addEventListener('click', () => {
                playPop();
                letter.classList.add('active');
                setTimeout(() => letter.classList.remove('active'), 400);
            });
        });
    }

    function createGlitter(btn) {
        // Create 3-5 glitter particles around the button
        const count = Math.floor(randomBetween(3, 6));
        const btnRect = btn.getBoundingClientRect();
        
        for (let i = 0; i < count; i++) {
            const glitter = document.createElement('div');
            glitter.className = 'btn-glitter';
            glitter.innerHTML = randomChoice(['✦', '✧', '⋆']);
            glitter.style.color = '#ff9cbd';
            
            // Random position around the button perimeter
            const x = randomBetween(0, btnRect.width);
            const y = randomBetween(-10, btnRect.height + 10);
            
            glitter.style.left = `${x}px`;
            glitter.style.top = `${y}px`;
            
            btn.appendChild(glitter);
            
            // Remove after animation
            setTimeout(() => {
                if (btn.contains(glitter)) {
                    btn.removeChild(glitter);
                }
            }, 800);
        }
    }

    // ── Digital Diary Logic ──────────────────
    let currentTheme = 'pastel';
    let currentPage = 1;
    let isDecorateMode = false;
    let draggedElement = null;
    let rotatingElement = null;
    let selectedSticker = null;
    let resizingElement = null;
    let offset = { x: 0, y: 0 };
    let startRotation = 0;
    let startMouseAngle = 0;

    window._pixonoChooseDiary = function(style) {
        currentTheme = style;
        currentPage = 1; // Reset to page 1
        playChime();
        
        // Update Book Theme & Animation
        const book = document.getElementById('diaryBook');
        if (book) {
            book.className = `book-layout style-${style} flipping-next`;
            setTimeout(() => book.classList.remove('flipping-next'), 600);
        }
        
        // Update indicator
        updatePageIndicator();

        // Scroll to Viewer
        const sectionViewer = document.getElementById('sectionViewer');
        if (sectionViewer) {
            sectionViewer.scrollIntoView({ behavior: 'smooth' });
        }
        
        loadDiaryPage();
    };

    function setupViewerInteractions() {
        console.log("Pixono: Setting up viewer interactions...");
        const writeBtn = document.getElementById('modeWrite');
        const decorateBtn = document.getElementById('modeDecorate');
        const sidebar = document.getElementById('stickerSidebar');
        const saveBtn = document.getElementById('saveDiaryBtn');
        const viewerBackBtn = document.getElementById('viewerBackBtn');
        const chooseBackBtn = document.getElementById('chooseBackBtn');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        if (!prevBtn || !nextBtn) console.error("Pixono: Page buttons NOT found in DOM!");

        writeBtn?.addEventListener('click', () => {
            isDecorateMode = false;
            deselectSticker();
            writeBtn.classList.add('active');
            decorateBtn.classList.remove('active');
            sidebar.classList.add('hidden');
            document.getElementById('stickerArea')?.classList.remove('decorate-mode');
            playBubble();
        });

        decorateBtn?.addEventListener('click', () => {
            isDecorateMode = true;
            decorateBtn.classList.add('active');
            writeBtn.classList.remove('active');
            sidebar.classList.remove('hidden');
            document.getElementById('stickerArea')?.classList.add('decorate-mode');
            playBubble();
        });

        saveBtn?.addEventListener('click', () => {
            saveDiaryPage();
            showToast("Page saved! ✨");
        });

        viewerBackBtn?.addEventListener('click', () => {
            playPop();
            document.getElementById('sectionChoose')?.scrollIntoView({ behavior: 'smooth' });
        });

        chooseBackBtn?.addEventListener('click', () => {
            playPop();
            const scroller = document.getElementById('scrollContainer');
            if (scroller) scroller.scrollLeft = 0;
        });

        prevBtn?.addEventListener('click', (e) => {
            console.log("Pixono: Prev button clicked", currentPage);
            e.stopPropagation();
            if (currentPage > 1) {
                flipPage(-1);
            }
        });

        nextBtn?.addEventListener('click', (e) => {
            console.log("Pixono: Next button clicked", currentPage);
            e.stopPropagation();
            flipPage(1);
        });
        
        // Setup clicking on area to deselect
        const area = document.getElementById('stickerArea');
        if (area) {
            area.addEventListener('mousedown', (e) => {
                if (e.target === area) deselectSticker();
            });
            // Initializing toolbar
            const tb = document.createElement('div');
            tb.className = 'sticker-toolbar hidden';
            tb.id = 'stickerToolbar';
            tb.innerHTML = `
                <button class="stk-btn" id="tbDup" title="Duplicate">📑</button>
                <button class="stk-btn" id="tbUp" title="Bring Forward">⏫</button>
                <button class="stk-btn" id="tbDown" title="Send Backward">⏬</button>
            `;
            area.appendChild(tb);
            
            tb.querySelector('#tbDup').addEventListener('click', (e) => {
                e.stopPropagation();
                if (selectedSticker) {
                    const imgSpan = selectedSticker.querySelector('.sticker-image');
                    const content = imgSpan ? imgSpan.src : selectedSticker.querySelector('.sticker-emoji').textContent;
                    addSticker(content, parseFloat(selectedSticker.style.left) + 20, parseFloat(selectedSticker.style.top) + 20, selectedSticker.dataset.scale || 1, selectedSticker.dataset.rotation || 0, !!imgSpan, selectedSticker.style.zIndex);
                    playPop();
                }
            });
            tb.querySelector('#tbUp').addEventListener('click', (e) => {
                e.stopPropagation();
                if (selectedSticker) {
                    let z = parseInt(selectedSticker.style.zIndex || 10);
                    selectedSticker.style.zIndex = z + 1;
                    playBubble();
                }
            });
            tb.querySelector('#tbDown').addEventListener('click', (e) => {
                e.stopPropagation();
                if (selectedSticker) {
                    let z = parseInt(selectedSticker.style.zIndex || 10);
                    selectedSticker.style.zIndex = Math.max(1, z - 1);
                    playBubble();
                }
            });
        }

        // Sticker loading logic for sidebar
        function loadStickersToSidebar(category) {
            const grid = document.getElementById('stickerGrid');
            if (!grid) return;
            grid.innerHTML = '';
            
            if (window.STICKER_MANIFEST && window.STICKER_MANIFEST[category] && window.STICKER_MANIFEST[category].length > 0) {
                window.STICKER_MANIFEST[category].forEach(src => {
                    const img = document.createElement('img');
                    img.src = src;
                    img.className = 'sticker-opt-img';
                    img.addEventListener('click', () => {
                        // Offset loosely from center
                        const randomX = 150 + Math.random() * 50 - 25;
                        const randomY = 150 + Math.random() * 50 - 25;
                        addSticker(src, randomX, randomY, 1, 0, true);
                        playPop();
                    });
                    grid.appendChild(img);
                });
            } else {
                grid.innerHTML = '<p style="grid-column: 1 / -1; font-size: 0.8rem; color:#888; text-align:center; margin-top: 20px;">No stickers found. Run extract_stickers.py!</p>';
            }
        }

        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                loadStickersToSidebar(tab.dataset.tab);
                playPop();
            });
        });
        
        // Initial populate (use setTimeout to ensure manifest is loaded)
        setTimeout(() => loadStickersToSidebar('Flowers'), 100);

        // Photo Upload
        const photoUploadBtn = document.getElementById('photoUploadBtn');
        const photoUploadInput = document.getElementById('photoUploadInput');
        photoUploadBtn?.addEventListener('click', () => {
            photoUploadInput?.click();
            playBubble();
        });

        photoUploadInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 400;
                        const MAX_HEIGHT = 400;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        
                        addSticker(dataUrl, 150, 150, 1, 0, true);
                        playPop();
                    }
                    img.src = event.target.result;
                }
                reader.readAsDataURL(file);
            }
            e.target.value = ''; // reset
        });

        // Font Selection
        const fontSelector = document.getElementById('fontSelector');
        fontSelector?.addEventListener('change', (e) => {
            const font = e.target.value;
            const leftArea = document.getElementById('leftPageText');
            const rightArea = document.getElementById('rightPageText');
            if (leftArea) leftArea.style.fontFamily = font;
            if (rightArea) rightArea.style.fontFamily = font;
            playChime();
            saveDiaryPage();
        });
    }

    function flipPage(dir) {
        console.log("Pixono: flipPage triggered", dir, "from", currentPage);
        try {
            saveDiaryPage(); // Auto-save current
        } catch(e) {
            console.error("Pixono: Save failed before flip", e);
        }
        
        currentPage += dir;
        playChime();
        deselectSticker();
        
        const book = document.getElementById('diaryBook');
        const flipClass = dir > 0 ? 'flipping-next' : 'flipping-prev';
        book?.classList.add(flipClass);
        setTimeout(() => book?.classList.remove(flipClass), 600);

        updatePageIndicator();
        loadDiaryPage();
    }

    function updatePageIndicator() {
        const indicator = document.getElementById('pageIndicator');
        if (indicator) indicator.textContent = `Page ${currentPage}`;
    }

    function selectSticker(sticker) {
        if (selectedSticker === sticker) return;
        deselectSticker();
        selectedSticker = sticker;
        selectedSticker.classList.add('selected');
        updateToolbarPosition();
    }

    function deselectSticker() {
        if (selectedSticker) {
            selectedSticker.classList.remove('selected');
            selectedSticker = null;
        }
        const tb = document.getElementById('stickerToolbar');
        if (tb) tb.classList.remove('active');
    }

    function updateToolbarPosition() {
        if (!selectedSticker) return;
        const tb = document.getElementById('stickerToolbar');
        if (!tb) return;
        
        // Position slightly above sticker center
        const x = parseFloat(selectedSticker.style.left);
        const y = parseFloat(selectedSticker.style.top);
        tb.style.left = `${x}px`;
        tb.style.top = `${y - 50}px`;
        tb.classList.add('active');
    }

    function addSticker(content, x = 150, y = 150, scale = 1, rotation = 0, isImage = false, zIndex = 10) {
        const area = document.getElementById('stickerArea');
        if (!area) return;

        const sticker = document.createElement('div');
        sticker.className = 'diary-sticker';
        
        let innerHTML = '';
        if (isImage) {
            innerHTML = `<img src="${content}" class="sticker-image">`;
        } else {
            innerHTML = `<span class="sticker-emoji">${content}</span>`;
        }
        
        sticker.innerHTML = `
            ${innerHTML}
            <div class="sticker-handle handle-delete" title="Delete">✕</div>
            <div class="sticker-handle handle-rotate" title="Rotate">↻</div>
            <div class="sticker-handle handle-resize" title="Resize">⤡</div>
        `;
        
        // Position
        sticker.style.left = typeof x === 'number' ? `${x}px` : x;
        sticker.style.top = typeof y === 'number' ? `${y}px` : y;
        sticker.style.zIndex = zIndex;
        
        sticker.dataset.scale = scale;
        sticker.dataset.rotation = rotation;
        updateStickerTransform(sticker);

        // Events
        sticker.addEventListener('mousedown', (e) => {
            if (!isDecorateMode) return;
            e.stopPropagation();
            selectSticker(sticker);
            
            if (e.target.closest('.handle-delete')) {
                sticker.remove();
                deselectSticker();
                playBubble();
                return;
            }
            if (e.target.closest('.handle-rotate')) {
                startRotate(e, sticker);
                return;
            }
            if (e.target.closest('.handle-resize')) {
                startResize(e, sticker);
                return;
            }
            startDrag(e, sticker);
        });
        
        area.appendChild(sticker);
    }

    function updateStickerTransform(sticker) {
        const s = sticker.dataset.scale || 1;
        const r = sticker.dataset.rotation || 0;
        sticker.style.transform = `scale(${s}) rotate(${r}deg)`;
    }

    function startDrag(e, element) {
        draggedElement = element;
        const rect = draggedElement.getBoundingClientRect();
        offset.x = e.clientX - rect.left;
        offset.y = e.clientY - rect.top;
        
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
        draggedElement.style.transition = 'none';
        playPop();
    }

    let dragRaf = null;
    function onDrag(e) {
        if (!draggedElement) return;
        const area = document.getElementById('stickerArea');
        const areaRect = area.getBoundingClientRect();
        
        let x = e.clientX - areaRect.left - offset.x;
        let y = e.clientY - areaRect.top - offset.y;

        // No snapping, free movement across spine and beyond, just smooth tracking
        
        if (dragRaf) cancelAnimationFrame(dragRaf);
        dragRaf = requestAnimationFrame(() => {
            draggedElement.style.left = `${x}px`;
            draggedElement.style.top = `${y}px`;
            updateToolbarPosition();
        });
    }

    function stopDrag() {
        if (draggedElement) {
            draggedElement.style.transition = 'transform 0.1s';
            draggedElement = null;
        }
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    }

    function startRotate(e, element) {
        e.stopPropagation();
        rotatingElement = element;
        const rect = rotatingElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        startMouseAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
        startRotation = parseFloat(rotatingElement.dataset.rotation || 0);

        document.addEventListener('mousemove', onRotate);
        document.addEventListener('mouseup', stopRotate);
        playPop();
    }

    let rotateRaf = null;
    function onRotate(e) {
        if (!rotatingElement) return;
        const rect = rotatingElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
        const delta = currentAngle - startMouseAngle;
        
        if (rotateRaf) cancelAnimationFrame(rotateRaf);
        rotateRaf = requestAnimationFrame(() => {
            rotatingElement.dataset.rotation = startRotation + delta;
            updateStickerTransform(rotatingElement);
        });
    }

    function stopRotate() {
        rotatingElement = null;
        document.removeEventListener('mousemove', onRotate);
        document.removeEventListener('mouseup', stopRotate);
    }
    
    // Resize controls
    let startMouseDist = 0;
    let startScale = 1;
    let resizeRaf = null;
    function startResize(e, element) {
        e.stopPropagation();
        resizingElement = element;
        const rect = resizingElement.getBoundingClientRect();
        const centerX = rect.left + rect.width/2;
        const centerY = rect.top + rect.height/2;
        startMouseDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        startScale = parseFloat(resizingElement.dataset.scale || 1);
        
        document.addEventListener('mousemove', onResize);
        document.addEventListener('mouseup', stopResize);
        playPop();
    }
    function onResize(e) {
        if (!resizingElement) return;
        const rect = resizingElement.getBoundingClientRect();
        const centerX = rect.left + rect.width/2;
        const centerY = rect.top + rect.height/2;
        const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        
        const newScale = startScale * (dist / startMouseDist);
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
            resizingElement.dataset.scale = Math.max(0.3, Math.min(newScale, 4.0));
            updateStickerTransform(resizingElement);
            updateToolbarPosition();
        });
    }
    function stopResize() {
        resizingElement = null;
        document.removeEventListener('mousemove', onResize);
        document.removeEventListener('mouseup', stopResize);
    }

    function saveDiaryPage() {
        console.log("Pixono: Saving page", currentPage);
        const leftArea = document.getElementById('leftPageText');
        const rightArea = document.getElementById('rightPageText');
        
        const leftText = leftArea ? leftArea.value : '';
        const rightText = rightArea ? rightArea.value : '';
        const currentFont = document.getElementById('fontSelector')?.value || "'Quicksand', sans-serif";
        
        const stickers = [];
        document.querySelectorAll('.diary-sticker').forEach(s => {
            const emojiSpan = s.querySelector('.sticker-emoji');
            const imgSpan = s.querySelector('.sticker-image');
            
            let content = '';
            let isImage = false;
            if (imgSpan) {
                content = imgSpan.src;
                isImage = true;
            } else if (emojiSpan) {
                content = emojiSpan.textContent;
            } else {
                content = (s.textContent || "").trim().split('\n')[0];
            }

            stickers.push({
                content: content,
                isImage: isImage,
                left: s.style.left,
                top: s.style.top,
                scale: s.dataset.scale || 1,
                rotation: s.dataset.rotation || 0,
                zIndex: s.style.zIndex || 10
            });
        });

        const pageData = {
            leftText,
            rightText,
            stickers,
            fontFamily: currentFont
        };

        const storageKey = `pixono_diary_${currentTheme}_p${currentPage}`;
        localStorage.setItem(storageKey, JSON.stringify(pageData));
        
        // Also save current session
        localStorage.setItem('pixono_last_session', JSON.stringify({ theme: currentTheme, page: currentPage }));
        
        // Aesthetic Feedback
        playSparkle();
        createConfetti();
    }

    function loadDiaryPage() {
        const storageKey = `pixono_diary_${currentTheme}_p${currentPage}`;
        const data = localStorage.getItem(storageKey);
        
        const leftArea = document.getElementById('leftPageText');
        const rightArea = document.getElementById('rightPageText');
        
        // Clear stickers
        document.querySelectorAll('.diary-sticker').forEach(s => s.remove());

        if (data) {
            const page = JSON.parse(data);
            leftArea.value = page.leftText || '';
            rightArea.value = page.rightText || '';
            
            page.stickers?.forEach(s => {
                const content = s.content || s.emoji; // backward compatible
                const isImage = s.isImage || false;
                addSticker(content, s.left, s.top, s.scale, s.rotation, isImage, s.zIndex || 10);
            });
            
            if (page.fontFamily) {
                const fontSelector = document.getElementById('fontSelector');
                if (fontSelector) fontSelector.value = page.fontFamily;
                leftArea.style.fontFamily = page.fontFamily;
                rightArea.style.fontFamily = page.fontFamily;
            } else {
                leftArea.style.fontFamily = "'Quicksand', sans-serif";
                rightArea.style.fontFamily = "'Quicksand', sans-serif";
            }
        } else {
            leftArea.value = '';
            rightArea.value = '';
            leftArea.style.fontFamily = "'Quicksand', sans-serif";
            rightArea.style.fontFamily = "'Quicksand', sans-serif";
        }
    }

    function showToast(message) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }


    function setupScrollAnimations() {
        // Intersection Observer for reveal animations
        const observerOptions = {
            threshold: 0.2
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });

        // Intro Start Button -> Scroll to Section 2 (Choose Diary)
        const startBtn = document.getElementById('introStartBtn');
        const scroller = document.getElementById('scrollContainer');
        const section2 = document.getElementById('sectionChoose');

        if (startBtn && scroller && section2) {
            startBtn.addEventListener('click', () => {
                playPop();
                section2.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }

    function setupHorizontalScroll() {
        const scroller = document.getElementById('scrollContainer');
        if (!scroller) return;

        scroller.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0 && !isDecorateMode) { // disable scroll when decorating
                e.preventDefault();
                scroller.scrollLeft += e.deltaY * 1.5;
            }
        }, { passive: false });
    }

    function init() {
        const stickersContainer = document.getElementById('stickersContainer');
        if (stickersContainer) {
            placeImageStickers(stickersContainer);
            placeEmojiStickers(stickersContainer);
        }
        
        const scroller = document.getElementById('scrollContainer');
        if (scroller) scroller.scrollLeft = 0; // Ensure landing page on refresh

        setupHorizontalScroll();
        setupLetterInteractions();
        setupViewerInteractions();
        setupScrollAnimations();
    }

    // ── Sticker Loop Handlers (Parallax)
    let mouseX = 0, mouseY = 0;
    let pX = 0, pY = 0;
    let lastTrail = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        const now = Date.now();
        if (now - lastTrail > 40) {
            lastTrail = now;
            const trailChars = ['✦', '✧', '⋆', '🌸', '💖'];
            const p = document.createElement('div');
            p.className = 'cursor-particle';
            if (Math.random() > 0.6) p.textContent = randomChoice(trailChars);
            else { 
                p.style.width = '6px'; p.style.height = '6px'; 
                p.style.backgroundColor = '#ff9cbd'; p.style.borderRadius = '50%'; 
            }
            p.style.left = (mouseX - 10) + 'px';
            p.style.top = (mouseY - 10) + 'px';
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 1000);
        }
    });

    function animateFrame() {
        pX += (mouseX - pX) * 0.05;
        pY += (mouseY - pY) * 0.05;
        const xOffset = (pX - window.innerWidth/2) * 0.02;
        const yOffset = (pY - window.innerHeight/2) * 0.02;
        document.querySelectorAll('.sticker-wrapper').forEach(w => {
            const d = parseFloat(w.dataset.depth || 1);
            w.style.transform = `translate3d(${xOffset * d}px, ${yOffset * d}px, 0)`;
        });
        const bgLayer = document.querySelector('.bg-layer');
        if (bgLayer) bgLayer.style.transform = `scale(1.05) translate3d(${xOffset * 0.3}px, ${yOffset * 0.3}px, 0)`;
        requestAnimationFrame(animateFrame);
    }

    animateFrame();
    init();

})();
