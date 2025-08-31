const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const textInput = document.getElementById('textInput');
const voiceButton = document.getElementById('voiceButton');
const statusMessage = document.getElementById('statusMessage');

let recognition;
let isListening = false;
let finalTranscript = '';
let interimTranscript = '';
let recognitionTimeout;
let restartTimeout;
let isManualStop = false;

// Initialize keyboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('Voice-to-Text Keyboard starting...');
    initializeKeyboard();
    setupVoiceButton();
    console.log('Keyboard ready!');
});

function initializeKeyboard() {
    const keys = document.querySelectorAll('.key:not(.voice-key)');
    keys.forEach(key => {
        key.addEventListener('click', (e) => {
            handleKeyPress(e.target);
        });
    });

    setupSpecialKeys();
}

function setupSpecialKeys() {
    const backspaceKey = document.querySelector('.backspace-key');
    const spaceKey = document.querySelector('.space-key');
    const returnKey = document.querySelector('.return-key');

    backspaceKey?.addEventListener('click', () => {
        handleBackspace();
    });

    spaceKey?.addEventListener('click', () => {
        insertText(' ');
    });

    returnKey?.addEventListener('click', () => {
        insertText('\n');
    });
}

function setupVoiceButton() {
    if (!SpeechRecognition) {
        voiceButton.disabled = true;
        showStatus('Speech recognition not supported', 'error');
        return;
    }

    // Mouse events
    voiceButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startVoiceRecognition();
    });

    voiceButton.addEventListener('mouseup', (e) => {
        e.preventDefault();
        stopVoiceRecognition();
    });

    voiceButton.addEventListener('mouseleave', () => {
        if (isListening) {
            stopVoiceRecognition();
        }
    });

    // Touch events
    voiceButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startVoiceRecognition();
    });

    voiceButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopVoiceRecognition();
    });

    voiceButton.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        stopVoiceRecognition();
    });
}

function startVoiceRecognition() {
    if (isListening) return;
    
    console.log('Starting speech recognition...');
    isManualStop = false;
    clearTimeout(recognitionTimeout);
    clearTimeout(restartTimeout);
    
    startRecognitionSession();
}

function startRecognitionSession() {
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {
            // Ignore errors when stopping
        }
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        console.log('Speech recognition started');
        isListening = true;
        voiceButton.classList.add('recording');
        showStatus('Listening...', 'info');
        
        // Set a timeout to restart recognition every 55 seconds to prevent auto-stop
        recognitionTimeout = setTimeout(() => {
            if (isListening && !isManualStop) {
                console.log('Restarting recognition session...');
                restartRecognitionSession();
            }
        }, 55000);
    };

    recognition.onresult = (event) => {
        let currentInterim = '';
        let newFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                newFinal += transcript + ' ';
            } else {
                currentInterim += transcript;
            }
        }

        // Add new final results to our stored transcript
        if (newFinal) {
            finalTranscript += newFinal;
        }

        // Update interim transcript
        interimTranscript = currentInterim;

        // Display combined text in real-time
        const displayText = (finalTranscript + interimTranscript).trim();
        textInput.value = displayText;
        
        // Keep cursor at the end
        textInput.setSelectionRange(displayText.length, displayText.length);
        
        // Auto-scroll to bottom if needed
        textInput.scrollTop = textInput.scrollHeight;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        // Don't stop on network errors, just restart
        if (event.error === 'network' && isListening && !isManualStop) {
            console.log('Network error, restarting...');
            setTimeout(() => {
                if (isListening && !isManualStop) {
                    restartRecognitionSession();
                }
            }, 1000);
            return;
        }
        
        // Handle other errors
        if (!isManualStop) {
            isListening = false;
            voiceButton.classList.remove('recording', 'processing');
            clearTimeout(recognitionTimeout);
            clearTimeout(restartTimeout);
            
            let errorMessage = 'Speech recognition failed';
            switch(event.error) {
                case 'no-speech':
                    errorMessage = 'No speech detected';
                    break;
                case 'audio-capture':
                    errorMessage = 'Microphone not accessible';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone permission denied';
                    break;
            }
            
            showStatus(errorMessage, 'error');
            setTimeout(() => hideStatus(), 3000);
        }
    };

    recognition.onend = () => {
        console.log('Speech recognition session ended');
        
        // If we're still supposed to be listening and it wasn't a manual stop, restart
        if (isListening && !isManualStop) {
            console.log('Auto-restarting recognition...');
            restartTimeout = setTimeout(() => {
                if (isListening && !isManualStop) {
                    startRecognitionSession();
                }
            }, 100);
        } else {
            // Actually stopped
            isListening = false;
            voiceButton.classList.remove('recording', 'processing');
            clearTimeout(recognitionTimeout);
            clearTimeout(restartTimeout);
            
            if (finalTranscript.trim()) {
                showStatus('Speech recognized!', 'success');
            } else if (isManualStop) {
                showStatus('Recording stopped', 'info');
            }
            
            setTimeout(() => hideStatus(), 2000);
        }
    };

    try {
        recognition.start();
    } catch (error) {
        console.error('Failed to start recognition:', error);
        showStatus('Failed to start speech recognition', 'error');
        isListening = false;
        clearTimeout(recognitionTimeout);
        clearTimeout(restartTimeout);
    }
}

function restartRecognitionSession() {
    if (!isListening || isManualStop) return;
    
    console.log('Restarting recognition session for continuous listening...');
    clearTimeout(recognitionTimeout);
    clearTimeout(restartTimeout);
    
    // Brief pause before restarting
    setTimeout(() => {
        if (isListening && !isManualStop) {
            startRecognitionSession();
        }
    }, 100);
}

function stopVoiceRecognition() {
    if (!isListening || !recognition) return;
    
    console.log('Stopping speech recognition');
    isManualStop = true;
    clearTimeout(recognitionTimeout);
    clearTimeout(restartTimeout);
    
    voiceButton.classList.remove('recording');
    voiceButton.classList.add('processing');
    showStatus('Processing...', 'info');
    
    try {
        recognition.stop();
    } catch (error) {
        console.error('Error stopping recognition:', error);
        isListening = false;
        voiceButton.classList.remove('recording', 'processing');
        hideStatus();
    }
}

function handleKeyPress(keyElement) {
    const keyText = keyElement.textContent;
    
    if (keyText && keyText.length === 1) {
        insertText(keyText);
    }
    
    // Visual feedback
    keyElement.classList.add('haptic-feedback');
    setTimeout(() => {
        keyElement.classList.remove('haptic-feedback');
    }, 100);
}

function handleBackspace() {
    const currentValue = textInput.value;
    const cursorPos = textInput.selectionStart;
    
    if (cursorPos > 0) {
        const newValue = currentValue.slice(0, cursorPos - 1) + currentValue.slice(cursorPos);
        textInput.value = newValue;
        textInput.setSelectionRange(cursorPos - 1, cursorPos - 1);
    }
}

function insertText(text) {
    const start = textInput.selectionStart;
    const end = textInput.selectionEnd;
    const currentValue = textInput.value;
    
    // Insert the text at cursor position
    const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);
    textInput.value = newValue;
    
    // Move cursor to the end of inserted text
    const newCursorPos = start + text.length;
    textInput.setSelectionRange(newCursorPos, newCursorPos);
    
    // Trigger input event for any listeners
    const inputEvent = new Event('input', { bubbles: true });
    textInput.dispatchEvent(inputEvent);
}

function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.style.display = 'block';
}

function hideStatus() {
    statusMessage.style.opacity = '0';
    setTimeout(() => {
        statusMessage.style.display = 'none';
        statusMessage.style.opacity = '1';
    }, 300);
}
