// Bitcoin Sound Alerts App

// Audio context and sounds
let audioContext;
let buySound;
let sellSound;
let volume = 0.5;
let soundEnabled = true;

// Price data storage
const priceData = {
    timestamps: [],
    prices: [],
    maxDataPoints: 50
};

// Chart reference
let priceChart;

// DOM Elements
const priceElement = document.getElementById('price');
const priceChangeElement = document.getElementById('price-change');
const buyThresholdInput = document.getElementById('buy-threshold');
const sellThresholdInput = document.getElementById('sell-threshold');
const updateIntervalInput = document.getElementById('update-interval');
const volumeInput = document.getElementById('volume');
const soundEnabledCheckbox = document.getElementById('sound-enabled');
const testBuySoundButton = document.getElementById('test-buy-sound');
const testSellSoundButton = document.getElementById('test-sell-sound');
const alertsContainer = document.getElementById('alerts');

// Initialize the application
async function init() {
    // Initialize audio context
    initAudio();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize chart
    initChart();
    
    // Start fetching Bitcoin price data
    await fetchBitcoinPrice();
    
    // Set up the update interval
    startPriceUpdates();
}

// Initialize Web Audio API
async function initAudio() {
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create buy sound (ascending tone)
        buySound = await createTone(440, 660, 0.3); // A4 to E5
        
        // Create sell sound (descending tone)
        sellSound = await createTone(440, 220, 0.3); // A4 to A3
    } catch (error) {
        console.error('Error initializing audio:', error);
    }
}

// Create a tone that changes frequency over time
async function createTone(startFreq, endFreq, duration) {
    // Create an oscillator buffer
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill the buffer with a sine wave that changes frequency
    for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        const freq = startFreq + (endFreq - startFreq) * (t / duration);
        data[i] = Math.sin(2 * Math.PI * freq * t) * Math.pow(1 - t / duration, 0.3);
    }
    
    return buffer;
}

// Play a sound with the current volume
function playSound(buffer) {
    if (!soundEnabled || !audioContext || !buffer) return;
    
    // Resume audio context if it's suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // Create a buffer source
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    
    // Create a gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    
    // Connect nodes and play
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start();
}

// Set up event listeners for controls
function setupEventListeners() {
    // Volume control
    volumeInput.addEventListener('input', (e) => {
        volume = parseFloat(e.target.value);
    });
    
    // Sound enable/disable
    soundEnabledCheckbox.addEventListener('change', (e) => {
        soundEnabled = e.target.checked;
    });
    
    // Test sound buttons
    testBuySoundButton.addEventListener('click', () => {
        playSound(buySound);
    });
    
    testSellSoundButton.addEventListener('click', () => {
        playSound(sellSound);
    });
    
    // Update interval change
    updateIntervalInput.addEventListener('change', () => {
        startPriceUpdates();
    });
}

// Initialize the price chart
function initChart() {
    const ctx = document.getElementById('price-chart').getContext('2d');
    
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Bitcoin Price (USD)',
                data: [],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                pointRadius: 2,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    beginAtZero: false
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            animation: {
                duration: 500
            }
        }
    });
}

// Fetch Bitcoin price from CoinGecko API
async function fetchBitcoinPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
        const data = await response.json();
        
        if (data && data.bitcoin) {
            const currentPrice = data.bitcoin.usd;
            const priceChange24h = data.bitcoin.usd_24h_change;
            
            // Update price display
            updatePriceDisplay(currentPrice, priceChange24h);
            
            // Update price data for chart
            updatePriceData(currentPrice);
            
            // Check for buy/sell signals
            checkForSignals(currentPrice);
            
            return currentPrice;
        }
    } catch (error) {
        console.error('Error fetching Bitcoin price:', error);
    }
    
    return null;
}

// Update the price display elements
function updatePriceDisplay(price, change) {
    if (!price) return;
    
    // Update current price
    priceElement.textContent = `$${price.toLocaleString()}`;
    
    // Update price change
    if (change) {
        const changeText = change.toFixed(2);
        priceChangeElement.textContent = `${changeText > 0 ? '+' : ''}${changeText}%`;
        
        // Add color class
        priceChangeElement.className = '';
        if (change > 0) {
            priceChangeElement.classList.add('positive');
        } else if (change < 0) {
            priceChangeElement.classList.add('negative');
        }
    }
}

// Update price data array and chart
function updatePriceData(price) {
    if (!price) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    // Add new data point
    priceData.timestamps.push(timeString);
    priceData.prices.push(price);
    
    // Limit the number of data points
    if (priceData.timestamps.length > priceData.maxDataPoints) {
        priceData.timestamps.shift();
        priceData.prices.shift();
    }
    
    // Update chart
    priceChart.data.labels = priceData.timestamps;
    priceChart.data.datasets[0].data = priceData.prices;
    priceChart.update();
}

// Check for buy/sell signals based on price movement
function checkForSignals(currentPrice) {
    if (!currentPrice || priceData.prices.length < 2) return;
    
    const previousPrice = priceData.prices[priceData.prices.length - 2];
    const percentChange = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    const buyThreshold = parseFloat(buyThresholdInput.value);
    const sellThreshold = parseFloat(sellThresholdInput.value);
    
    // Check for buy signal (price increased by threshold %)
    if (percentChange >= buyThreshold) {
        triggerBuySignal(currentPrice, percentChange);
    }
    // Check for sell signal (price decreased by threshold %)
    else if (percentChange <= -sellThreshold) {
        triggerSellSignal(currentPrice, percentChange);
    }
}

// Trigger buy signal
function triggerBuySignal(price, percentChange) {
    // Play buy sound
    playSound(buySound);
    
    // Add to alert log
    addAlertToLog('buy', price, percentChange);
}

// Trigger sell signal
function triggerSellSignal(price, percentChange) {
    // Play sell sound
    playSound(sellSound);
    
    // Add to alert log
    addAlertToLog('sell', price, percentChange);
}

// Add an alert to the log
function addAlertToLog(type, price, percentChange) {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    const alertElement = document.createElement('div');
    alertElement.className = `alert ${type}`;
    
    const alertText = document.createElement('div');
    alertText.className = 'alert-text';
    alertText.textContent = `${type.toUpperCase()} Signal: $${price.toLocaleString()} (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(2)}%)`;
    
    const alertTime = document.createElement('div');
    alertTime.className = 'alert-time';
    alertTime.textContent = timeString;
    
    alertElement.appendChild(alertText);
    alertElement.appendChild(alertTime);
    
    // Add to the beginning of the container
    alertsContainer.insertBefore(alertElement, alertsContainer.firstChild);
    
    // Limit the number of alerts
    if (alertsContainer.children.length > 50) {
        alertsContainer.removeChild(alertsContainer.lastChild);
    }
}

// Start or restart the price update interval
function startPriceUpdates() {
    // Clear any existing interval
    if (window.updateInterval) {
        clearInterval(window.updateInterval);
    }
    
    // Get the update interval in seconds
    const intervalSeconds = parseInt(updateIntervalInput.value, 10) || 10;
    const intervalMs = intervalSeconds * 1000;
    
    // Set up new interval
    window.updateInterval = setInterval(fetchBitcoinPrice, intervalMs);
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);