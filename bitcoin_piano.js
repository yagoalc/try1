/**
 * Bitcoin Piano Visualizer
 * 
 * Questo script gestisce la visualizzazione e l'interazione con il pianoforte virtuale Bitcoin.
 * Carica i dati di mappatura generati dallo script Python e li visualizza nell'interfaccia utente.
 */

// Parametri di base
const MIN_VOLUME = 0.0001;  // 10k sats
const MAX_VOLUME = 100.0;   // 100 BTC
const TOTAL_KEYS = 88;

// Nomi delle note
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Dati di mappatura
let pianoMapping = [];

// Elementi DOM
const pianoKeyboard = document.getElementById('piano-keyboard');
const btcVolumeSlider = document.getElementById('btc-volume');
const btcVolumeDisplay = document.getElementById('btc-volume-display');
const audioStatusElement = document.createElement('div');
audioStatusElement.id = 'audio-status';
audioStatusElement.style.marginTop = '10px';
document.querySelector('.controls').appendChild(audioStatusElement);
const noteDetailsElement = document.getElementById('note-details');
const mappingTableBody = document.getElementById('mapping-table').querySelector('tbody');
const playNoteButton = document.getElementById('play-note');
const exportDataButton = document.getElementById('export-data');

// Contesto audio
let audioContext;

// Inizializza l'applicazione
async function init() {
    try {
        // Carica i dati di mappatura dal file JSON
        await loadMappingData();
        
        // Crea la tastiera del pianoforte
        createPianoKeyboard();
        
        // Popola la tabella di mappatura
        populateMappingTable();
        
        // Inizializza il contesto audio
        initAudio();
        
        // Imposta gli event listener
        setupEventListeners();
        
        console.log('Inizializzazione completata');
    } catch (error) {
        console.error('Errore durante l\'inizializzazione:', error);
        // Fallback: genera la mappatura direttamente in JavaScript
        generatePianoMapping();
        createPianoKeyboard();
        populateMappingTable();
        initAudio();
        setupEventListeners();
    }
}

// Carica i dati di mappatura dal file JSON
async function loadMappingData() {
    try {
        const response = await fetch('bitcoin_piano_mapping.json');
        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }
        pianoMapping = await response.json();
        console.log('Dati di mappatura caricati:', pianoMapping.length, 'tasti');
    } catch (error) {
        console.error('Errore durante il caricamento dei dati di mappatura:', error);
        throw error;
    }
}

// Genera la mappatura del pianoforte (versione JavaScript come fallback)
function generatePianoMapping() {
    console.log('Generazione della mappatura in JavaScript (fallback)');
    pianoMapping = [];
    
    for (let i = 0; i < TOTAL_KEYS; i++) {
        // Calcola il nome della nota
        const midiNumber = 21 + i;  // A0 ha MIDI number 21
        const noteIndex = (midiNumber - 21) % 12;
        const octave = Math.floor((midiNumber - 12) / 12);
        const noteName = NOTES[noteIndex] + octave;
        
        // Calcola il volume BTC usando la formula logaritmica
        const normalizedIndex = i / (TOTAL_KEYS - 1);
        const volume = Math.exp(normalizedIndex * Math.log(MAX_VOLUME / MIN_VOLUME)) * MIN_VOLUME;
        
        // Calcola l'intervallo BTC
        let lowerBound, upperBound;
        
        if (i === 0) {
            lowerBound = 0;
        } else {
            const prevVolume = Math.exp((i - 1) / (TOTAL_KEYS - 1) * Math.log(MAX_VOLUME / MIN_VOLUME)) * MIN_VOLUME;
            lowerBound = (volume + prevVolume) / 2;
        }
        
        if (i === TOTAL_KEYS - 1) {
            upperBound = volume * 1.5;
        } else {
            const nextVolume = Math.exp((i + 1) / (TOTAL_KEYS - 1) * Math.log(MAX_VOLUME / MIN_VOLUME)) * MIN_VOLUME;
            upperBound = (volume + nextVolume) / 2;
        }
        
        // Genera il colore (da blu a rosso)
        const hue = 240 * (1 - normalizedIndex);
        const hexColor = hslToHex(hue, 90, 50);
        
        // Aggiungi alla mappatura
        pianoMapping.push({
            note_name: noteName,
            midi_number: midiNumber,
            btc_volume: volume,
            btc_range: [lowerBound, upperBound],
            hex_color: hexColor,
            is_black: noteName.includes('#')
        });
    }
}

// Crea la tastiera del pianoforte
function createPianoKeyboard() {
    // Limita a 3 ottave per la visualizzazione (C3-B5)
    const startKey = 39;  // C3 (MIDI 60 - 21 = 39)
    const endKey = 75;    // B5
    
    // Svuota il contenitore
    pianoKeyboard.innerHTML = '';
    
    for (let i = startKey; i <= endKey; i++) {
        const keyData = pianoMapping[i];
        if (!keyData) continue;
        
        // Aggiungi la proprietà is_black se non esiste
        if (keyData.is_black === undefined) {
            keyData.is_black = keyData.note_name.includes('#');
        }
        
        // Crea l'elemento del tasto
        const keyElement = document.createElement('div');
        keyElement.className = `piano-key ${keyData.is_black ? 'black' : 'white'}`;
        keyElement.style.backgroundColor = keyData.hex_color;
        keyElement.dataset.index = i;
        
        // Aggiungi l'etichetta della nota
        const keyLabel = document.createElement('div');
        keyLabel.className = 'key-label';
        keyLabel.textContent = keyData.note_name;
        keyElement.appendChild(keyLabel);
        
        // Aggiungi l'informazione BTC
        const btcInfo = document.createElement('div');
        btcInfo.className = 'btc-info';
        btcInfo.textContent = `${keyData.btc_volume.toFixed(4)} BTC`;
        keyElement.appendChild(btcInfo);
        
        // Aggiungi event listeners
        keyElement.addEventListener('click', () => selectKey(i));
        keyElement.addEventListener('mouseover', () => showBtcInfo(btcInfo));
        keyElement.addEventListener('mouseout', () => hideBtcInfo(btcInfo));
        
        // Aggiungi il tasto alla tastiera
        pianoKeyboard.appendChild(keyElement);
    }
}

// Mostra l'informazione BTC
function showBtcInfo(infoElement) {
    infoElement.style.display = 'block';
}

// Nascondi l'informazione BTC
function hideBtcInfo(infoElement) {
    infoElement.style.display = 'none';
}

// Seleziona un tasto
function selectKey(index) {
    // Rimuovi la selezione precedente
    const selectedKeys = document.querySelectorAll('.piano-key.selected');
    selectedKeys.forEach(key => key.classList.remove('selected'));
    
    // Seleziona il nuovo tasto
    const keyElement = document.querySelector(`.piano-key[data-index="${index}"]`);
    if (keyElement) {
        keyElement.classList.add('selected');
    }
    
    // Mostra i dettagli della nota
    displayNoteDetails(index);
    
    // Suona la nota
    playNote(pianoMapping[index].midi_number);
}

// Mostra i dettagli della nota
function displayNoteDetails(index) {
    const keyData = pianoMapping[index];
    
    noteDetailsElement.innerHTML = `
        <p><strong>Nota:</strong> ${keyData.note_name}</p>
        <p><strong>Numero MIDI:</strong> ${keyData.midi_number}</p>
        <p><strong>Volume BTC:</strong> ${keyData.btc_volume.toFixed(8)} BTC</p>
        <p><strong>Intervallo BTC:</strong> ${keyData.btc_range[0].toFixed(8)} - ${keyData.btc_range[1].toFixed(8)} BTC</p>
        <p><strong>Colore:</strong> <span class="color-cell" style="background-color: ${keyData.hex_color}"></span> ${keyData.hex_color}</p>
    `;
}

// Popola la tabella di mappatura
function populateMappingTable() {
    // Limita a 3 ottave per la visualizzazione (C3-B5)
    const startKey = 39;  // C3
    const endKey = 75;    // B5
    
    // Svuota la tabella
    mappingTableBody.innerHTML = '';
    
    for (let i = startKey; i <= endKey; i++) {
        const keyData = pianoMapping[i];
        if (!keyData) continue;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${keyData.note_name}</td>
            <td>${keyData.midi_number}</td>
            <td>${keyData.btc_volume.toFixed(8)}</td>
            <td>${keyData.btc_range[0].toFixed(8)} - ${keyData.btc_range[1].toFixed(8)}</td>
            <td><span class="color-cell" style="background-color: ${keyData.hex_color}"></span> ${keyData.hex_color}</td>
        `;
        
        // Aggiungi event listener per selezionare il tasto corrispondente
        row.addEventListener('click', () => selectKey(i));
        
        mappingTableBody.appendChild(row);
    }
}

// Inizializza il contesto audio
function initAudio() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Contesto audio inizializzato');
        }

        // Gestione dello stato dell'audio context
        const handleState = () => {
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('AudioContext riattivato con successo');
                    document.getElementById('audio-status').textContent = 'Stato Audio: Attivo';
                });
            } else {
                document.getElementById('audio-status').textContent = 'Stato Audio: Attivo';
            }
        };

        // Aggiungi gestore eventi per cambiamenti di stato
        audioContext.addEventListener('statechange', handleState);
        handleState();
    } catch (error) {
        console.error('Errore durante l\'inizializzazione del contesto audio:', error);
        document.getElementById('audio-status').textContent = 'Stato Audio: Errore - ' + error.message;
    }
}

// Suona una nota MIDI
function playNote(midiNumber) {
    if (!audioContext) {
        // Se il contesto audio non esiste, crealo
        initAudio();
        if (!audioContext) return; // Se ancora non esiste, esci
    }
    
    // Assicurati che il contesto audio sia attivo
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            // Riprova a suonare la nota dopo che il contesto è stato riattivato
            playNoteInternal(midiNumber);
        });
    } else {
        // Suona direttamente se il contesto è già attivo
        playNoteInternal(midiNumber);
    }
}

// Funzione interna per suonare la nota
function playNoteInternal(midiNumber) {
    try {
        // Calcola la frequenza dalla nota MIDI
        const frequency = 440 * Math.pow(2, (midiNumber - 69) / 12);
        
        // Crea un oscillatore
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        
        // Crea un nodo di guadagno per controllare il volume
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
        
        // Collega i nodi
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Suona la nota
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 1.5);
        
        // Log per debug
        console.log('Riproduzione nota MIDI:', midiNumber, 'Frequenza:', frequency.toFixed(1) + 'Hz');
    } catch (error) {
        console.error('Errore durante la riproduzione della nota:', error);
        document.getElementById('audio-status').textContent = 'Errore riproduzione: ' + error.message;
    }
}

// Trova la nota corrispondente a un volume BTC
function findNoteForVolume(volume) {
    for (let i = 0; i < pianoMapping.length; i++) {
        const keyData = pianoMapping[i];
        if (keyData.btc_range[0] <= volume && volume <= keyData.btc_range[1]) {
            return i;
        }
    }
    
    // Se non viene trovata una corrispondenza esatta, trova la nota più vicina
    let closestIndex = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < pianoMapping.length; i++) {
        const keyData = pianoMapping[i];
        const distance = Math.min(
            Math.abs(volume - keyData.btc_range[0]),
            Math.abs(volume - keyData.btc_range[1])
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
        }
    }
    
    return closestIndex;
}

// Imposta gli event listener
function setupEventListeners() {
    // Event listener per il volume BTC
    btcVolumeSlider.addEventListener('input', () => {
        const value = parseFloat(btcVolumeSlider.value);
        
        // Converti il valore dello slider in volume BTC
        const minSlider = parseFloat(btcVolumeSlider.min);
        const maxSlider = parseFloat(btcVolumeSlider.max);
        const normalizedValue = (value - minSlider) / (maxSlider - minSlider);
        const volume = MIN_VOLUME * Math.pow(MAX_VOLUME / MIN_VOLUME, normalizedValue);
        
        btcVolumeDisplay.textContent = `${volume.toFixed(8)} BTC`;
        
        // Trova e seleziona la nota corrispondente
        const noteIndex = findNoteForVolume(volume);
        if (noteIndex !== null) {
            selectKey(noteIndex);
        }
    });
    
    // Imposta il valore iniziale del display BTC
    const initialValue = parseFloat(btcVolumeSlider.value);
    const minSlider = parseFloat(btcVolumeSlider.min);
    const maxSlider = parseFloat(btcVolumeSlider.max);
    const normalizedValue = (initialValue - minSlider) / (maxSlider - minSlider);
    const initialVolume = MIN_VOLUME * Math.pow(MAX_VOLUME / MIN_VOLUME, normalizedValue);
    btcVolumeDisplay.textContent = `${initialVolume.toFixed(8)} BTC`;
    const initialNoteIndex = findNoteForVolume(initialVolume);
    if (initialNoteIndex !== null) {
        selectKey(initialNoteIndex);
    }
    
    // Event listener per il pulsante di riproduzione
    playNoteButton.addEventListener('click', () => {
        const value = parseFloat(btcVolumeSlider.value);
        const volume = Math.pow(10, value);
        const noteIndex = findNoteForVolume(volume);
        
        if (noteIndex !== null) {
            playNote(pianoMapping[noteIndex].midi_number);
        }
    });
    
    // Event listener per il pulsante di esportazione
    exportDataButton.addEventListener('click', () => {
        // Crea un oggetto Blob con i dati JSON
        const dataStr = JSON.stringify(pianoMapping, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        
        // Crea un URL per il Blob
        const url = URL.createObjectURL(blob);
        
        // Crea un link per il download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bitcoin_piano_mapping.json';
        document.body.appendChild(a);
        a.click();
        
        // Pulisci
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    });
}

// Utility: Converti HSL in HEX
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// Inizializza l'applicazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', init);