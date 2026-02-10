// Main Game Controller
class ValentineGame {
    constructor() {
        this.gameData = null;
        this.currentScene = 'loading';
        this.userName = '';
        this.userAnswers = [];
        this.emotionalProfile = {
            romantic: 0,
            playful: 0,
            teasing: 0,
            emotional: 0,
            fantasy: 0
        };
        this.currentQuestionIndex = 0;
        this.unlockedVaults = 0;
        this.selectedLetter = '';
        this.villainClickCount = 0;
        this.villainMessages = [
            "Try again.",
            "That one hurt.",
            "Emotionally damaged.",
            "You monster.",
            "Heartbreaker!",
            "Cruel human!",
            "Mean! 😭",
            "Please stop...",
            "I'm fragile!",
            "Okay fine!"
        ];
        this.selectedOptionIndex = null;
        this.hasForcedYes = false;

        // Loading variables
        this.loadingInterval = null;
        this.skipButtonTimeout = null;
        this.isLoadingSkipped = false;

        // Initialize game
        this.init();
    }

    async init() {
        // Load game data
        await this.loadGameData();

        // Initialize event listeners
        this.initEventListeners();

        // Initialize audio
        this.initAudio();

        // Load character images
        this.loadCharacterImages();

        // Start loading sequence
        this.startLoadingSequence();
    }

    async loadGameData() {
        try {
            const response = await fetch('data/data.json');
            this.gameData = await response.json();
            console.log('Game data loaded successfully');
        } catch (error) {
            console.error('Error loading game data:', error);
            // Use fallback data
            this.gameData = this.getFallbackData();
        }
    }

    loadCharacterImages() {
        const character1Img = document.getElementById('character1-img');
        const character2Img = document.getElementById('character2-img');
        const character1Container = character1Img.parentElement;
        const character2Container = character2Img.parentElement;

        // Add timestamp to prevent caching issues
        const timestamp = new Date().getTime();
        character1Img.src = `assets/images/characters/character1.png?t=${timestamp}`;
        character2Img.src = `assets/images/characters/character2.png?t=${timestamp}`;

        // Handle image load success
        character1Img.onload = () => {
            character1Container.classList.add('loaded');
            console.log('Character 1 image loaded successfully');
        };

        character2Img.onload = () => {
            character2Container.classList.add('loaded');
            console.log('Character 2 image loaded successfully');
        };

        // Handle image load errors (fallback to placeholder)
        character1Img.onerror = () => {
            character1Container.style.display = 'none';
            character1Img.style.display = 'none';
            console.log('Character 1 image failed to load, using placeholder');
        };

        character2Img.onerror = () => {
            character2Container.style.display = 'none';
            character2Img.style.display = 'none';
            console.log('Character 2 image failed to load, using placeholder');
        };
    }

    initEventListeners() {
        // Name submission
        document.getElementById('submit-name').addEventListener('click', () => this.handleNameSubmit());
        document.getElementById('user-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleNameSubmit();
        });

        // Disclaimer acceptance
        document.getElementById('accept-disclaimer').addEventListener('click', () => {
            this.playSFX('click');
            setTimeout(() => this.showQuestions(), 200);
        });

        // Option selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.option-button')) {
                const optionButton = e.target.closest('.option-button');
                const optionIndex = parseInt(optionButton.dataset.index);
                this.playSFX('click');
                this.selectOption(optionIndex);
                window.scrollTo(0, 0);
            }
        });

        // Next question button
        document.getElementById('next-question').addEventListener('click', () => {
            if (document.getElementById('next-question').disabled) return;
            this.playSFX('transition');
            this.goToNextQuestion();
        });

        // Letter selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.letter-card')) {
                this.playSFX('heart');
                const letterCard = e.target.closest('.letter-card');
                this.selectLetter(letterCard.dataset.type);
            }
        });

        // Proposal buttons
        document.getElementById('yes-button').addEventListener('click', () => this.handleYesClick());
        document.getElementById('no-button').addEventListener('click', () => this.handleNoClick());

        // Vault icons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.vault-icon')) {
                const vaultIcon = e.target.closest('.vault-icon');
                if (!vaultIcon.classList.contains('unlocked')) {
                    this.playSFX('success');
                    setTimeout(() => this.openVault(vaultIcon.dataset.vault), 200);
                }
            }
        });

        // Final actions
        document.getElementById('relive-button').addEventListener('click', () => {
            this.playSFX('click');
            setTimeout(() => this.restartGame(), 200);
        });
        document.getElementById('share-button').addEventListener('click', () => {
            this.playSFX('click');
            setTimeout(() => this.shareGame(), 200);
        });

        // Skip loading button
        document.getElementById('skip-loading').addEventListener('click', () => {
            this.skipLoading();
        });
    }

    initAudio() {
        // Background music element
        this.bgm = document.getElementById('background-music');
        this.bgm.volume = 0.3;

        // Play BGM helper
        this.playBGM = () => {
            if (this.bgm) {
                this.bgm.currentTime = 0;
                this.bgm.play().catch(e => {
                    console.log('BGM play failed:', e);
                    // If autoplay is blocked, play on user interaction
                    document.addEventListener('click', () => {
                        this.bgm.play().catch(e => console.log('BGM still blocked'));
                    }, { once: true });
                });
            }
        };

        // Pause BGM helper
        this.pauseBGM = () => {
            if (this.bgm) {
                this.bgm.pause();
            }
        };

        // Play SFX helper with Web Audio API
        this.playSFX = (type) => {
            try {
                // Create audio context if not exists
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }

                // Create oscillator for sound effects
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                // Different sounds for different SFX
                let frequency = 440;
                let typeValue = 'sine';

                switch (type) {
                    case 'click':
                        frequency = 800;
                        typeValue = 'sine';
                        break;
                    case 'heart':
                        frequency = 523.25; // C5
                        typeValue = 'sine';
                        break;
                    case 'success':
                        frequency = 659.25; // E5 - Major 3rd
                        typeValue = 'triangle';
                        break;
                    case 'transition':
                        frequency = 392; // G4
                        typeValue = 'sine';
                        break;
                    case 'accept':
                        // Play a positive ascending chord
                        this.playChord([523.25, 659.25, 783.99], 'triangle');
                        return;
                    case 'error':
                        frequency = 220; // A3 - lower frequency for error
                        typeValue = 'sawtooth';
                        break;
                    case 'skip':
                        frequency = 698.46; // F5
                        typeValue = 'sine';
                        break;
                }

                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                oscillator.type = typeValue;

                gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.3);
            } catch (e) {
                console.log('SFX play failed:', e);
            }
        };

        // Helper for playing chords
        this.playChord = (frequencies, type = 'sine') => {
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);

                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    oscillator.type = type;

                    gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);

                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.5);
                }, index * 50);
            });
        };
    }

    startLoadingSequence() {
        this.playBGM();

        const quotes = this.gameData.loading.quotes;
        const quoteElement = document.getElementById('loading-quote');
        const progressFill = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');
        const skipButton = document.getElementById('skip-loading');

        // Reset skip button
        skipButton.style.display = 'none';
        this.isLoadingSkipped = false;

        // Calculate total loading time based on quotes
        // Each quote: 1.5 seconds visible + 0.5 seconds fade = 2 seconds total
        const totalQuotes = quotes.length;
        const totalLoadingTime = totalQuotes * 2000; // 2 seconds per quote
        const progressPerQuote = 100 / totalQuotes;

        let currentQuoteIndex = 0;
        let progress = 0;

        // Create particles
        this.createParticles();

        // Show skip button after 5 seconds (10 quotes)
        this.skipButtonTimeout = setTimeout(() => {
            skipButton.style.display = 'flex';
            this.playSFX('heart');
        }, 5000);

        // Clear any existing interval
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
        }

        // Start loading interval
        this.loadingInterval = setInterval(() => {
            if (this.isLoadingSkipped) {
                clearInterval(this.loadingInterval);
                return;
            }

            // Update quote with fade animation
            quoteElement.style.animation = 'none';
            setTimeout(() => {
                quoteElement.textContent = quotes[currentQuoteIndex];
                quoteElement.style.animation = 'fadeInOut 2s ease-in-out';
            }, 50);

            // Update progress
            progress = (currentQuoteIndex + 1) * progressPerQuote;
            progressFill.style.width = `${progress}%`;
            progressPercent.textContent = Math.round(progress);

            currentQuoteIndex++;

            // Check if loading is complete
            if (currentQuoteIndex >= totalQuotes) {
                clearInterval(this.loadingInterval);
                clearTimeout(this.skipButtonTimeout);
                this.completeLoading();
            }
        }, 2000); // 2 seconds per quote
    }

    completeLoading() {
        // Clear timeouts and intervals
        clearTimeout(this.skipButtonTimeout);
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
        }

        // Hide skip button
        document.getElementById('skip-loading').style.display = 'none';

        // Set to 100% and show success
        setTimeout(() => {
            document.getElementById('progress-fill').style.width = '100%';
            document.getElementById('progress-percent').textContent = '100';
            this.playSFX('success');

            setTimeout(() => {
                this.switchScene('name-screen');
            }, 800);
        }, 200);
    }

    skipLoading() {
        if (this.isLoadingSkipped) return;

        this.playSFX('skip');
        this.isLoadingSkipped = true;

        // Clear timeouts and intervals
        clearTimeout(this.skipButtonTimeout);
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
        }

        // Hide skip button
        document.getElementById('skip-loading').style.display = 'none';

        // Show skipping animation
        const quoteElement = document.getElementById('loading-quote');
        const progressFill = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');

        // Update quote to show skipping
        quoteElement.style.animation = 'none';
        setTimeout(() => {
            quoteElement.textContent = "Skipping loading... Jumping straight to romance! 💘";
            quoteElement.style.animation = 'fadeInOut 1s ease-in-out';
        }, 50);

        // Quickly animate progress to 100%
        let skipProgress = parseFloat(progressFill.style.width) || 0;
        const skipInterval = setInterval(() => {
            skipProgress += 5;
            if (skipProgress > 100) skipProgress = 100;

            progressFill.style.width = `${skipProgress}%`;
            progressPercent.textContent = Math.round(skipProgress);

            if (skipProgress >= 100) {
                clearInterval(skipInterval);
                setTimeout(() => {
                    this.playSFX('success');
                    setTimeout(() => {
                        this.switchScene('name-screen');
                    }, 500);
                }, 100);
            }
        }, 50);
    }

    createParticles() {
        const container = document.getElementById('particles-container');
        const particleCount = 25;

        // Clear existing particles
        container.innerHTML = '';

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.innerHTML = '❤';

            // Random properties
            const size = Math.random() * 15 + 8;
            const duration = Math.random() * 8 + 6;
            const delay = Math.random() * 5;
            const startX = Math.random() * 100;
            const startY = Math.random() * 100;

            particle.style.cssText = `
                position: absolute;
                left: ${startX}vw;
                top: ${startY}vh;
                font-size: ${size}px;
                color: var(--color-pink);
                opacity: ${Math.random() * 0.4 + 0.2};
                animation: float ${duration}s ease-in-out infinite;
                animation-delay: ${delay}s;
                pointer-events: none;
                z-index: 1;
            `;

            container.appendChild(particle);
        }
    }

    handleNameSubmit() {
        this.playSFX('click');

        const nameInput = document.getElementById('user-name');
        const name = nameInput.value.trim();

        if (name) {
            this.userName = name;
            localStorage.setItem('valentineUserName', name);
            this.playSFX('accept');
            this.switchScene('disclaimer-screen');
        } else {
            // Add shake animation to input
            this.playSFX('error');
            nameInput.classList.add('shake');
            setTimeout(() => nameInput.classList.remove('shake'), 500);
        }
    }

    showQuestions() {
        this.playSFX('transition');
        this.switchScene('questions-screen');
        this.loadQuestion(0);
    }

    loadQuestion(index) {
        if (index >= this.gameData.questions.length) {
            this.showResults();
            return;
        }

        this.currentQuestionIndex = index;
        this.selectedOptionIndex = null;
        const question = this.gameData.questions[index];

        // Update UI
        document.getElementById('main-question').textContent = question.question;

        // Set question image placeholder
        const questionImage = document.getElementById('question-image');
        questionImage.innerHTML = question.imageEmoji || '💭';

        document.getElementById('question-category').textContent = question.category;

        // Update progress
        const progressPercent = ((index + 1) / this.gameData.questions.length) * 100;
        document.getElementById('question-progress').style.width = `${progressPercent}%`;
        document.getElementById('current-question').textContent = index + 1;
        document.getElementById('total-questions').textContent = this.gameData.questions.length;

        // Load options
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';

        question.options.forEach((option, i) => {
            const optionButton = document.createElement('button');
            optionButton.className = 'option-button';
            optionButton.dataset.index = i;

            optionButton.innerHTML = `
                <div class="option-image">${option.emoji || '💖'}</div>
                <span>${option.text}</span>
            `;

            optionsContainer.appendChild(optionButton);
        });

        // Update flirty quote
        document.getElementById('flirty-quote').textContent = question.flirtyQuote;

        // Clear previous reaction and enable/disable next button
        document.getElementById('option-reaction').textContent = 'Select an option to continue...';
        document.getElementById('emoji-reactions').innerHTML = '';

        // Reset next button
        const nextButton = document.getElementById('next-question');
        nextButton.disabled = true;
        nextButton.classList.remove('enabled');
        nextButton.innerHTML = '<span>Select an option first</span>';
    }

    selectOption(optionIndex) {
        const question = this.gameData.questions[this.currentQuestionIndex];
        const option = question.options[optionIndex];

        // Update selected option index
        this.selectedOptionIndex = optionIndex;

        // Show reaction
        const reactionText = document.getElementById('option-reaction');
        reactionText.textContent = option.reaction;
        this.playSFX('heart');

        // Show emojis
        const emojiContainer = document.getElementById('emoji-reactions');
        emojiContainer.innerHTML = option.emojis.map(emoji =>
            `<span style="animation-delay: ${Math.random() * 0.5}s">${emoji}</span>`
        ).join('');

        // Add visual feedback to selected option
        const optionButtons = document.querySelectorAll('.option-button');
        optionButtons.forEach(btn => btn.classList.remove('selected'));
        optionButtons[optionIndex].classList.add('selected');

        // Enable next button
        const nextButton = document.getElementById('next-question');
        nextButton.disabled = false;
        nextButton.classList.add('enabled');
        nextButton.innerHTML = '<span>Next Question</span> <i class="fas fa-arrow-right"></i>';
        this.playSFX('accept');
    }

    goToNextQuestion() {
        if (this.selectedOptionIndex === null) return;

        const question = this.gameData.questions[this.currentQuestionIndex];
        const option = question.options[this.selectedOptionIndex];

        // Update emotional profile
        option.emotions.forEach(emotion => {
            this.emotionalProfile[emotion.type] += emotion.value;
        });

        // Store answer
        this.userAnswers.push({
            question: question.question,
            answer: option.text,
            emotions: option.emotions
        });

        // Load next question
        this.loadQuestion(this.currentQuestionIndex + 1);
    }

    showResults() {
        this.playSFX('success');
        this.switchScene('results-screen');

        // Display user name
        document.getElementById('user-name-display').textContent = this.userName;

        // Determine dominant emotion
        const emotions = Object.entries(this.emotionalProfile);
        emotions.sort((a, b) => b[1] - a[1]);
        const dominantEmotion = emotions[0][0];

        // Generate letters
        const lettersContainer = document.getElementById('letters-container');
        lettersContainer.innerHTML = '';

        const letterTypes = ['romantic', 'playful', 'teasing', 'emotional', 'fantasy'];

        letterTypes.forEach(type => {
            const letterData = this.gameData.results.letters.find(l => l.type === type);
            if (letterData) {
                const letterCard = document.createElement('div');
                letterCard.className = 'letter-card';
                letterCard.dataset.type = type;

                // Highlight letter matching dominant emotion
                if (type === dominantEmotion) {
                    letterCard.style.boxShadow = '0 20px 50px rgba(255, 133, 161, 0.4)';
                    letterCard.style.border = '3px solid var(--color-pink-dark)';
                }

                letterCard.innerHTML = `
                    <h3>${letterData.title}</h3>
                    <p>${letterData.description}</p>
                    <div class="letter-preview">${this.generateLetterPreview(type)}</div>
                    <div class="letter-emoji">${letterData.emoji}</div>
                `;

                lettersContainer.appendChild(letterCard);
            }
        });
    }

    generateLetterPreview(type) {
        const previews = {
            romantic: `My dear ${this.userName}, every moment without you feels like a page unturned...`,
            playful: `Hey ${this.userName}! Ready for some trouble? 😉`,
            teasing: `Oh ${this.userName}, you really thought you could get away that easily?`,
            emotional: `${this.userName}, there's something I've been meaning to tell you...`,
            fantasy: `In a realm of starlight and magic, I found you, ${this.userName}...`
        };

        return previews[type] || `For you, ${this.userName}...`;
    }

    selectLetter(type) {
        this.selectedLetter = type;

        // Visual feedback
        const letterCards = document.querySelectorAll('.letter-card');
        letterCards.forEach(card => {
            card.style.transform = '';
            card.style.boxShadow = '';
        });

        const selectedCard = document.querySelector(`[data-type="${type}"]`);
        selectedCard.style.transform = 'translateY(-5px) scale(1.02)';
        selectedCard.style.boxShadow = '0 25px 60px rgba(255, 133, 161, 0.5)';

        // Proceed to proposal after delay
        setTimeout(() => {
            this.playSFX('success');
            this.showProposal();
        }, 1500);
    }

    showProposal() {
        this.switchScene('proposal-screen');

        // Display user name
        document.getElementById('proposal-name').textContent = this.userName;

        // Initialize villain button
        this.villainClickCount = 0;
        this.hasForcedYes = false;
    }

    handleYesClick() {
        this.playSFX('heart');

        const yesButton = document.getElementById('yes-button');
        const noButton = document.getElementById('no-button');

        // Animate YES button
        yesButton.style.transform = 'scale(1.2)';

        // Create heart particles
        this.createHeartParticles();

        // Hide NO button
        noButton.style.opacity = '0';
        noButton.style.pointerEvents = 'none';

        // Proceed to vault after delay
        setTimeout(() => {
            this.playSFX('success');
            this.showMemoryVault();
        }, 2000);
    }

    handleNoClick() {
        if (this.hasForcedYes) return;

        const noButton = document.getElementById('no-button');
        const yesButton = document.getElementById('yes-button');

        // Play different sounds based on click count
        if (this.villainClickCount < this.villainMessages.length) {
            this.playSFX('error');
        }

        // Update villain button text
        if (this.villainClickCount < this.villainMessages.length) {
            noButton.innerHTML = `
                <span>${this.villainMessages[this.villainClickCount]}</span>
                <i class="fas fa-skull-crossbones"></i>
            `;
            this.villainClickCount++;
        }

        // Check if we should force yes
        if (this.villainClickCount >= this.villainMessages.length) {
            this.forceYes();
            return;
        }

        // Shrink villain button
        const currentScale = 1 - (this.villainClickCount * 0.1);
        noButton.style.transform = `scale(${Math.max(currentScale, 0.5)})`;

        // Make villain button dodge
        this.dodgeVillainButton(noButton);

        // Grow YES button
        const yesScale = 1 + (this.villainClickCount * 0.15);
        yesButton.style.transform = `scale(${yesScale})`;

        // Add glow to YES button
        yesButton.style.boxShadow = '0 0 40px rgba(255, 133, 161, 0.8)';
    }

    forceYes() {
        if (this.hasForcedYes) return;
        this.hasForcedYes = true;

        const noButton = document.getElementById('no-button');
        const yesButton = document.getElementById('yes-button');
        const effectsContainer = document.getElementById('proposal-effects');

        // Play evil laugh sound (using error SFX for now)
        this.playSFX('error');

        // Create system prompt
        const prompt = document.createElement('div');
        prompt.className = 'system-prompt';
        prompt.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            color: #ff6b6b;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            text-align: center;
            padding: 2rem;
            box-shadow: inset 0 0 100px rgba(255, 0, 0, 0.3);
            animation: evilPulse 0.5s 3;
            backdrop-filter: blur(5px);
        ">
            <div style="
                background: rgba(20, 0, 0, 0.9);
                padding: 2rem 3rem;
                border-radius: 1rem;
                border: 3px solid #ff4757;
                box-shadow: 0 0 50px rgba(255, 71, 87, 0.5),
                            inset 0 0 20px rgba(255, 71, 87, 0.2);
                max-width: 90%;
                animation: glitch 0.3s 3;
            ">
                <h3 style="
                    font-size: clamp(1.5rem, 4vw, 2.5rem);
                    margin-bottom: 1.5rem;
                    color: #ff6b6b;
                    text-shadow: 0 0 10px #ff4757,
                                 0 0 20px #ff4757;
                    font-family: 'Courier New', monospace;
                    letter-spacing: 2px;
                ">
                    💀 SYSTEM OVERRIDE INITIATED 💀
                </h3>
                
                <p style="
                    font-size: clamp(1rem, 3vw, 1.3rem);
                    margin-bottom: 2rem;
                    color: #ff8e8e;
                    line-height: 1.6;
                    max-width: 600px;
                ">
                    AHAHAHAHA! You thought you could say NO?<br>
                    <span style="color: #ffcccc; font-weight: bold;">
                    WELL NOW YOU DON'T HAVE A CHOICE!
                    </span>
                </p>
                
                <div style="
                    font-size: 3rem;
                    margin: 1.5rem 0;
                    animation: float 2s infinite ease-in-out;
                    text-shadow: 0 0 20px #ff4757;
                ">
                    ⚡💀⚡
                </div>
                
                <div style="
                    margin-top: 2rem;
                    padding: 1rem;
                    background: rgba(255, 71, 87, 0.1);
                    border-radius: 0.5rem;
                    border: 1px dashed #ff4757;
                    font-size: 0.9rem;
                    color: #ffcccc;
                    max-width: 500px;
                ">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span style="margin-left: 0.5rem;">
                        User choice has been overridden. Proceeding with YES selection...
                    </span>
                </div>
            </div>
        </div>
    `;

        effectsContainer.appendChild(prompt);

        // Remove prompt after 3 seconds
        setTimeout(() => {
            prompt.style.opacity = '0';
            prompt.style.transition = 'opacity 0.5s';
            setTimeout(() => prompt.remove(), 5000);
        }, 8000);

        // Make NO button escape
        noButton.classList.add('villain-escape');
        noButton.style.pointerEvents = 'none';

        // Make YES button super prominent
        yesButton.style.animation = 'heartbeat 0.5s infinite';
        yesButton.style.transform = 'scale(1.5)';
        yesButton.style.boxShadow = '0 0 50px rgba(255, 133, 161, 1)';
        yesButton.style.zIndex = '100';

        // Change YES button text
        setTimeout(() => {
            yesButton.innerHTML = `
            <span>YOU HAVE NO CHOICE! Just Say Yes</span>
            <i class="fas fa-heart-crack"></i>
        `;
            yesButton.style.background = 'linear-gradient(135deg, #ff6b6b, #ff8e8e)';
            yesButton.style.border = '2px solid #ff4757';
            yesButton.style.textShadow = '0 0 10px rgba(255, 71, 87, 0.8)';
        }, 1000);
    }

    dodgeVillainButton(button) {
        const container = document.querySelector('.proposal-container');
        const containerRect = container.getBoundingClientRect();

        // Calculate random position within container
        const maxX = containerRect.width - button.offsetWidth - 40;
        const maxY = containerRect.height - button.offsetHeight - 40;

        const randomX = Math.random() * maxX;
        const randomY = Math.random() * maxY;

        // Move button
        button.style.position = 'absolute';
        button.style.left = `${randomX}px`;
        button.style.top = `${randomY}px`;
        button.style.transition = 'left 0.3s, top 0.3s';
    }

    createHeartParticles() {
        const container = document.getElementById('proposal-effects');

        for (let i = 0; i < 20; i++) {
            const heart = document.createElement('div');
            heart.innerHTML = '❤';

            // Add random animation
            const randomX = (Math.random() - 0.5) * 200;
            const randomY = -Math.random() * 150 - 50;

            heart.style.cssText = `
                position: absolute;
                left: 50%;
                top: 50%;
                font-size: ${Math.random() * 25 + 15}px;
                color: var(--color-pink-dark);
                opacity: 0.8;
                pointer-events: none;
                z-index: 100;
                transform: translate(-50%, -50%);
                animation: heartFloat ${Math.random() * 1.5 + 0.5}s ease-out forwards;
            `;

            heart.style.setProperty('--random-x', `${randomX}px`);
            heart.style.setProperty('--random-y', `${randomY}px`);

            container.appendChild(heart);

            // Remove after animation
            setTimeout(() => heart.remove(), 2000);
        }
    }

    showMemoryVault() {
        this.switchScene('vault-screen');

        // Load vault icons
        const vaultIcons = document.getElementById('vault-icons');
        vaultIcons.innerHTML = '';

        const vaultItems = [
            { id: 'gallery', icon: 'fas fa-images', title: 'Gallery' },
            { id: 'memories', icon: 'fas fa-brain', title: 'Memories' },
            { id: 'letters', icon: 'fas fa-envelope', title: 'Letters' },
            { id: 'surprise', icon: 'fas fa-gift', title: 'Surprise' }
        ];

        vaultItems.forEach(item => {
            const vaultIcon = document.createElement('div');
            vaultIcon.className = 'vault-icon';
            vaultIcon.dataset.vault = item.id;

            vaultIcon.innerHTML = `
                <i class="${item.icon}"></i>
                <h3>${item.title}</h3>
            `;

            vaultIcons.appendChild(vaultIcon);
        });
    }

    openVault(vaultId) {
        // Mark vault as unlocked
        const vaultIcon = document.querySelector(`[data-vault="${vaultId}"]`);
        vaultIcon.classList.add('unlocked');
        this.unlockedVaults++;

        // Update progress
        document.getElementById('unlocked-count').textContent = this.unlockedVaults;

        // Show vault content
        const vaultContent = document.getElementById('vault-content');

        const contentMap = {
            gallery: this.generateGalleryContent(),
            memories: this.generateMemoriesContent(),
            letters: this.generateLettersContent(),
            surprise: this.generateSurpriseContent()
        };

        vaultContent.innerHTML = contentMap[vaultId] || '<p>Something went wrong...</p>';

        // Check if all vaults are unlocked
        if (this.unlockedVaults === 4) {
            setTimeout(() => {
                this.playSFX('success');
                this.showFinalScene();
            }, 2000);
        }
    }

    generateGalleryContent() {
        return `
            <h3>Our Gallery</h3>
            <div class="gallery-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1rem 0;">
                <div style="background: var(--gradient-pink); height: 120px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white;">💕</div>
                <div style="background: var(--gradient-dreamy); height: 120px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white;">🌟</div>
                <div style="background: var(--color-purple); height: 120px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white;">✨</div>
                <div style="background: var(--color-blue); height: 120px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white;">🎁</div>
            </div>
            <p style="margin-top: 1rem; text-align: center; font-size: 0.7rem;">Every moment with you is a memory worth keeping, ${this.userName}.</p>
        `;
    }

    generateMemoriesContent() {
        const memories = this.userAnswers.slice(-3); // Show last 3 memories
        return `
            <h3>Sweet Memories</h3>
            <div style="max-height: 250px; overflow-y: auto; padding-right: 0.5rem;">
                ${memories.map((answer, i) => `
                    <div class="memories-switch" style="background: rgba(255, 255, 255, 0.9);padding: 0.25rem;margin: 0.5rem 0;border-radius: 10px;border-left: 3px solid var(--color-pink);font-size: 0.5rem;">
                        <p><strong>${answer.question}</strong></p>
                        <p style="color: var(--color-pink-dark); margin-top: 0.5rem;"><i class="fas fa-heart"></i> ${answer.answer}</p>
                    </div>
                `).join('')}
            </div>
            <p style="margin-top: 1rem; text-align: center;">These moments made this journey special, ${this.userName}.</p>
        `;
    }

    generateLettersContent() {
        const letterType = this.selectedLetter || 'romantic';
        const letterData = this.gameData.results.letters.find(l => l.type === letterType);

        return `
            <h3>Your Chosen Letter</h3>
            <div style="margin: 1rem 0;">
                <h4 style="color: var(--color-pink-dark); margin-bottom: 1rem; text-align: center;">${letterData.title}</h4>
                <p style="font-style: italic; color: var(--color-purple); line-height: 1.6;">${this.generateFullLetter(letterType)}</p>
            </div>
            <div style="margin-top: 2rem; text-align: right; border-top: 2px solid var(--color-pink-light); padding-top: 1rem;">
                <p style="font-style: italic;">Yours truly,</p>
                <p style="font-family: var(--font-heading); font-size: 1.5rem; color: var(--color-pink-dark);">Your Secret Admirer</p>
            </div>
        `;
    }

    generateSurpriseContent() {
        // Determine dominant emotion
        const emotions = Object.entries(this.emotionalProfile);
        emotions.sort((a, b) => b[1] - a[1]);
        const dominantEmotion = emotions[0][0];
        const emotionDescriptions = {
            romantic: "a hopeless romantic 💕",
            playful: "a playful spirit 😄",
            teasing: "a charming teaser 😏",
            emotional: "an emotional soul 🥺",
            fantasy: "a dreamer ✨"
        };

        return `
            <h3>Special Surprise! 🎁</h3>
            <div style="text-align: center; padding: 1rem;">
                <div class="specialsurprise-icon">🌟</div>
                <p class="specialsurprise-p1">You've unlocked the secret ending, ${this.userName}!</p>
                <p class="specialsurprise-p2">Your emotional profile reveals you're <strong>${emotionDescriptions[dominantEmotion]}</strong></p>
                <div style="background: rgba(255, 255, 255, 0.9); padding: 1rem; border-radius: 10px; margin: 1rem 0;">
                    <p style="margin-bottom: 0.5rem;"><strong>Your Love Score:</strong> ${Object.values(this.emotionalProfile).reduce((a, b) => a + b, 0)}/100</p>
                    <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                        ${Object.entries(this.emotionalProfile).map(([emotion, value]) => `
                            <div style="display: flex; justify-content: space-between;">
                                <span>${emotion.charAt(0).toUpperCase() + emotion.slice(1)}:</span>
                                <span>${value}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <p class="specialsurprise-p3">This Valentine's, may you find someone who appreciates every part of you.</p>
            </div>
        `;
    }

    generateFullLetter(type) {
        const letterTemplates = {
            romantic: `My dearest ${this.userName}, from the moment we began this journey, I knew there was something special about you. Your heart speaks in whispers that echo through my thoughts, and every answer you gave only confirmed what I felt - that you are someone worth cherishing.`,
            playful: `Hey ${this.userName}! So here's the thing - you're amazing. Like, seriously. Your playful spirit and quick wit have made this whole experience unforgettable. I hope we can keep this energy going beyond these digital walls!`,
            teasing: `Alright ${this.userName}, I have to admit - you've been driving me crazy (in the best way). Your clever answers and that subtle confidence? Absolutely lethal. Consider yourself officially the highlight of my Valentine's season.`,
            emotional: `${this.userName}, there are moments that stay with you, and every interaction we've had is now etched in my memory. Your sincerity and depth have touched me more than you could know. Thank you for being you.`,
            fantasy: `In a world of ordinary moments, you appeared like a constellation of possibilities, ${this.userName}. Our digital dance has been a story I'll replay in my mind, wondering what magic the future might hold.`
        };

        return letterTemplates[type] || `Dear ${this.userName}, thank you for sharing this journey with me.`;
    }

    showFinalScene() {
        // Generate final letter
        const finalLetter = document.getElementById('final-letter');
        finalLetter.innerHTML = `
            <h2>For You, ${this.userName}...</h2>
            ${this.generateFinalLetter()}
            <div class="signature">
                <p>With all my heart,</p>
                <p class="signature-name">Your Secret Admirer 💖</p>
            </div>
        `;

        this.switchScene('final-screen');
    }

    generateFinalLetter() {
        // Get dominant emotion
        const emotions = Object.entries(this.emotionalProfile);
        emotions.sort((a, b) => b[1] - a[1]);
        const dominantEmotion = emotions[0][0];

        // Get a random memorable answer
        const randomAnswer = this.userAnswers.length > 0
            ? this.userAnswers[Math.floor(Math.random() * this.userAnswers.length)].answer
            : "something amazing";

        const paragraphs = [
            `From the moment you entered this little adventure, I knew there was something special about you, ${this.userName}. The way you answered each question, with that unique ${dominantEmotion} energy... it's been lighting up this digital space like stardust.`,

            `Remember when you said "${randomAnswer}"? That's when I realized you weren't just playing a game - you were sharing pieces of yourself, and each piece has been more wonderful than the last.`,

            `This Valentine's Day, I don't just want to give you flowers or chocolates (though you definitely deserve both). I want to give you moments that make your heart do that funny little skip, memories that linger like your favorite song, and the certainty that you are absolutely worth celebrating.`,

            `So here's my confession: If you were a library book, I'd never return you because you're the only story I want to keep reading.`,

            `No matter where life takes you, know that today, in this corner of the internet, you made someone believe in magic again. You reminded me that connections can spark anywhere - even in lines of code and carefully crafted questions.`,

            `Thank you, ${this.userName}, for being the wonderful person you are. May your days be filled with the same joy and warmth you've brought to this experience.`
        ];

        return paragraphs.map(p => `<p>${p}</p>`).join('');
    }

    switchScene(sceneId) {
        // Hide current scene
        const currentScene = document.querySelector('.game-scene.active');
        if (currentScene) {
            currentScene.classList.remove('active');
            this.playSFX('transition');
        }

        // Show new scene
        setTimeout(() => {
            const newScene = document.getElementById(sceneId);
            if (newScene) {
                newScene.classList.add('active');
                this.currentScene = sceneId;

                // Scroll to top
                window.scrollTo(0, 0);
            }
        }, 1500);
    }

    restartGame() {
        // Clear loading intervals
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
        }
        if (this.skipButtonTimeout) {
            clearTimeout(this.skipButtonTimeout);
        }

        // Reset game state but keep name
        this.userAnswers = [];
        this.emotionalProfile = {
            romantic: 0,
            playful: 0,
            teasing: 0,
            emotional: 0,
            fantasy: 0
        };
        this.currentQuestionIndex = 0;
        this.unlockedVaults = 0;
        this.selectedLetter = '';
        this.villainClickCount = 0;
        this.selectedOptionIndex = null;
        this.hasForcedYes = false;
        this.isLoadingSkipped = false;

        // Reset villain button
        const noButton = document.getElementById('no-button');
        if (noButton) {
            noButton.innerHTML = `<span>NO</span><i class="fas fa-skull-crossbones"></i>`;
            noButton.style.cssText = '';
            noButton.classList.remove('villain-escape');
        }

        // Reset yes button
        const yesButton = document.getElementById('yes-button');
        if (yesButton) {
            yesButton.innerHTML = `<span>YES</span><i class="fas fa-heart"></i>`;
            yesButton.style.cssText = '';
            yesButton.style.animation = 'heartbeat 1.5s infinite';
        }

        // Reset proposal effects
        const effects = document.getElementById('proposal-effects');
        if (effects) {
            effects.innerHTML = '';
        }

        // Hide skip button
        const skipButton = document.getElementById('skip-loading');
        if (skipButton) {
            skipButton.style.display = 'none';
        }

        // Go back to loading screen
        this.switchScene('loading-screen');
        setTimeout(() => {
            this.startLoadingSequence();
        }, 1000);
    }

    shareGame() {
        this.playSFX('click');

        const shareText = `Just experienced the most adorable Valentine's game! 💖 Try Hearts.exe and see if it makes you blush!`;
        const shareUrl = window.location.href;

        if (navigator.share) {
            navigator.share({
                title: 'Hearts.exe - A Playful Valentine Story',
                text: shareText,
                url: shareUrl
            }).catch(err => {
                console.log('Share failed:', err);
                this.copyToClipboard(shareText, shareUrl);
            });
        } else {
            this.copyToClipboard(shareText, shareUrl);
        }
    }

    copyToClipboard(text, url) {
        const fullText = `${text}\n\n${url}`;

        navigator.clipboard.writeText(fullText).then(() => {
            alert('Link copied to clipboard! Share the love with someone special! 💖');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = fullText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Link copied to clipboard! Share the love with someone special! 💖');
        });
    }

    getFallbackData() {
        return {
            loading: {
                quotes: [
                    "Convincing Kagura to share her magic...",
                    "Negotiating with Kadita for emotional backup...",
                    "Borrowing stardust from Novaria's galaxy...",
                    "Loading romantic courage... please don't unplug me.",
                    "Preparing premium-grade pick-up lines...",
                    "Charging heart emojis to maximum capacity...",
                    "Warming up the blushing algorithms...",
                    "Downloading moonlight for romantic ambiance...",
                    "Calibrating cuteness overload protection...",
                    "Training butterflies for your stomach...",
                    "Buffering shy glances and nervous smiles...",
                    "Installing vulnerability.exe...",
                    "Loading heartfelt confessions...",
                    "Synchronizing heartbeats...",
                    "Preparing emotional defenses... just in case.",
                    "Loading stolen glances and secret smiles...",
                    "Charging romantic tension to 100%...",
                    "Preparing the perfect moment...",
                    "Loading inside jokes that aren't inside yet...",
                    "Finalizing the ability to make you smile..."
                ]
            },
            questions: [
                {
                    question: "If I accidentally stole your hoodie, what would you do?",
                    category: "Cute Scenarios",
                    imageEmoji: "👕",
                    flirtyQuote: "Asking for a friend... who might want your scent nearby.",
                    options: [
                        {
                            text: "Steal something of mine back",
                            emoji: "😏",
                            reaction: "Ooh, competitive! I like that energy.",
                            emojis: ["😏", "⚔️", "💫"],
                            emotions: [
                                { type: "playful", value: 3 },
                                { type: "teasing", value: 2 }
                            ]
                        },
                        {
                            text: "Pretend you didn't notice",
                            emoji: "😌",
                            reaction: "Smooth operator, huh? Noted.",
                            emojis: ["😌", "🎭", "✨"],
                            emotions: [
                                { type: "romantic", value: 2 },
                                { type: "emotional", value: 1 }
                            ]
                        },
                        {
                            text: "Ask for it back politely",
                            emoji: "🥺",
                            reaction: "So respectful! But what if I want to keep it?",
                            emojis: ["🥺", "🙏", "💖"],
                            emotions: [
                                { type: "emotional", value: 3 },
                                { type: "romantic", value: 1 }
                            ]
                        },
                        {
                            text: "Say you look cute in it",
                            emoji: "💘",
                            reaction: "DIRECT HIT! My heart wasn't ready for that.",
                            emojis: ["💘", "🎯", "🌟"],
                            emotions: [
                                { type: "romantic", value: 4 },
                                { type: "playful", value: 2 }
                            ]
                        }
                    ]
                }
            ],
            results: {
                letters: [
                    {
                        type: "romantic",
                        title: "Soft Romantic",
                        description: "Gentle, heartfelt confessions that come straight from the heart",
                        emoji: "💕"
                    },
                    {
                        type: "playful",
                        title: "Playful Flirty",
                        description: "Lighthearted fun with just the right amount of charm",
                        emoji: "😉"
                    },
                    {
                        type: "teasing",
                        title: "Gentle Teasing",
                        description: "Witty banter with a side of affectionate roasting",
                        emoji: "😏"
                    },
                    {
                        type: "emotional",
                        title: "Deep Emotional",
                        description: "Raw, sincere feelings laid bare",
                        emoji: "🥺"
                    },
                    {
                        type: "fantasy",
                        title: "Poetic Fantasy",
                        description: "Dreamy, imaginative confessions from another realm",
                        emoji: "✨"
                    }
                ]
            }
        };
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Create heart float animation if it doesn't exist
    if (!document.querySelector('#heart-float-animation')) {
        const style = document.createElement('style');
        style.id = 'heart-float-animation';
        style.textContent = `
            @keyframes heartFloat {
                0% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(calc(-50% + var(--random-x, 0)), calc(-50% + var(--random-y, -100px))) scale(0);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Start the game
    window.valentineGame = new ValentineGame();

    // Load saved name if exists
    const savedName = localStorage.getItem('valentineUserName');
    if (savedName) {
        document.getElementById('user-name').value = savedName;
    }

    // Add click handler for audio autoplay
    document.body.addEventListener('click', () => {
        const bgm = document.getElementById('background-music');
        if (bgm.paused) {
            bgm.play().catch(e => console.log('Autoplay still blocked'));
        }
    }, { once: true });
});