#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Bitcoin Piano Mapper

Questo script mappa 88 ordini di acquisto Bitcoin a una tastiera pianoforte virtuale,
seguendo una distribuzione logaritmica per gestire l'enorme differenza tra volumi piccoli e grandi.
"""

import json
import math
import numpy as np
import matplotlib.pyplot as plt
import csv
import colorsys
from midiutil.MidiFile import MIDIFile

# Parametri di base
MIN_VOLUME = 0.0001  # 10k sats
MAX_VOLUME = 100.0   # 100 BTC
TOTAL_KEYS = 88

# Nomi delle note (per generare i nomi delle note)
NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

def generate_piano_mapping():
    """
    Genera la mappatura degli ordini Bitcoin sulla tastiera del pianoforte.
    Utilizza una distribuzione logaritmica per mappare i volumi BTC ai tasti del pianoforte.
    
    Returns:
        list: Lista di dizionari contenenti le informazioni di mappatura per ogni tasto.
    """
    mapping = []
    
    # Genera la mappatura per ogni tasto del pianoforte
    for i in range(TOTAL_KEYS):
        # Calcola il nome della nota
        midi_number = 21 + i  # A0 ha MIDI number 21
        note_index = (midi_number - 21) % 12
        octave = math.floor((midi_number - 12) / 12)
        note_name = f"{NOTES[note_index]}{octave}"
        
        # Calcola il volume BTC usando la formula logaritmica
        normalized_index = i / (TOTAL_KEYS - 1)
        volume = math.exp(normalized_index * math.log(MAX_VOLUME / MIN_VOLUME)) * MIN_VOLUME
        
        # Calcola l'intervallo BTC
        if i == 0:
            lower_bound = 0
        else:
            prev_volume = math.exp((i - 1) / (TOTAL_KEYS - 1) * math.log(MAX_VOLUME / MIN_VOLUME)) * MIN_VOLUME
            lower_bound = (volume + prev_volume) / 2
        
        if i == TOTAL_KEYS - 1:
            upper_bound = volume * 1.5
        else:
            next_volume = math.exp((i + 1) / (TOTAL_KEYS - 1) * math.log(MAX_VOLUME / MIN_VOLUME)) * MIN_VOLUME
            upper_bound = (volume + next_volume) / 2
        
        # Genera il colore (da blu a rosso)
        hue = 240 * (1 - normalized_index)
        rgb = colorsys.hls_to_rgb(hue / 360, 0.5, 0.9)
        hex_color = "#{:02x}{:02x}{:02x}".format(
            int(rgb[0] * 255),
            int(rgb[1] * 255),
            int(rgb[2] * 255)
        )
        
        # Aggiungi alla mappatura
        mapping.append({
            "note_name": note_name,
            "midi_number": midi_number,
            "btc_volume": volume,
            "btc_range": [lower_bound, upper_bound],
            "hex_color": hex_color
        })
    
    return mapping

def export_to_json(mapping, filename="bitcoin_piano_mapping.json"):
    """
    Esporta la mappatura in formato JSON.
    
    Args:
        mapping (list): La mappatura da esportare.
        filename (str): Il nome del file di output.
    """
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, indent=2)
    print(f"Mappatura esportata in {filename}")

def export_to_csv(mapping, filename="bitcoin_piano_mapping.csv"):
    """
    Esporta la mappatura in formato CSV.
    
    Args:
        mapping (list): La mappatura da esportare.
        filename (str): Il nome del file di output.
    """
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["Note Name", "MIDI Number", "BTC Volume", "Lower Bound", "Upper Bound", "Hex Color"])
        for key in mapping:
            writer.writerow([
                key["note_name"],
                key["midi_number"],
                key["btc_volume"],
                key["btc_range"][0],
                key["btc_range"][1],
                key["hex_color"]
            ])
    print(f"Mappatura esportata in {filename}")

def create_midi_file(mapping, filename="bitcoin_piano.mid"):
    """
    Crea un file MIDI con velocity proporzionale al volume BTC.
    
    Args:
        mapping (list): La mappatura da utilizzare.
        filename (str): Il nome del file di output.
    """
    # Crea un oggetto MIDI con 1 traccia
    midi = MIDIFile(1)
    track = 0
    time = 0
    midi.addTrackName(track, time, "Bitcoin Piano")
    midi.addTempo(track, time, 120)
    
    # Aggiungi le note con velocity proporzionale al volume BTC
    for i, key in enumerate(mapping):
        # Normalizza il volume BTC in un range di velocity MIDI (1-127)
        normalized_volume = (math.log10(key["btc_volume"]) - math.log10(MIN_VOLUME)) / (math.log10(MAX_VOLUME) - math.log10(MIN_VOLUME))
        velocity = int(1 + normalized_volume * 126)
        
        # Aggiungi la nota
        midi.addNote(track, 0, key["midi_number"], time + i * 0.25, 0.5, velocity)
    
    # Scrivi il file MIDI
    with open(filename, 'wb') as f:
        midi.writeFile(f)
    print(f"File MIDI creato in {filename}")

def visualize_distribution(mapping):
    """
    Visualizza la distribuzione dei volumi BTC sulla tastiera del pianoforte.
    
    Args:
        mapping (list): La mappatura da visualizzare.
    """
    # Estrai i dati
    note_names = [key["note_name"] for key in mapping]
    volumes = [key["btc_volume"] for key in mapping]
    colors = [key["hex_color"] for key in mapping]
    
    # Crea il grafico
    plt.figure(figsize=(15, 8))
    
    # Grafico lineare (scala logaritmica)
    plt.subplot(2, 1, 1)
    plt.plot(note_names, volumes, marker='o', linestyle='-', color='blue')
    plt.yscale('log')
    plt.title('Distribuzione Logaritmica dei Volumi BTC')
    plt.xlabel('Note del Pianoforte')
    plt.ylabel('Volume BTC (scala logaritmica)')
    plt.xticks(rotation=90)
    plt.grid(True, which="both", ls="-")
    
    # Grafico a barre con colori
    plt.subplot(2, 1, 2)
    bars = plt.bar(range(len(note_names)), volumes, color=colors)
    plt.yscale('log')
    plt.title('Volumi BTC per Nota con Codice Colore')
    plt.xlabel('Indice Nota')
    plt.ylabel('Volume BTC (scala logaritmica)')
    plt.grid(True, which="both", ls="-")
    
    # Mostra solo alcuni nomi di note per evitare sovrapposizioni
    step = max(1, len(note_names) // 20)
    plt.xticks(range(0, len(note_names), step), [note_names[i] for i in range(0, len(note_names), step)], rotation=45)
    
    plt.tight_layout()
    plt.savefig('bitcoin_piano_distribution.png')
    plt.show()

def find_note_for_volume(mapping, volume):
    """
    Trova la nota corrispondente a un determinato volume BTC.
    
    Args:
        mapping (list): La mappatura da utilizzare.
        volume (float): Il volume BTC da cercare.
    
    Returns:
        dict: Il dizionario della nota corrispondente.
    """
    for key in mapping:
        if key["btc_range"][0] <= volume <= key["btc_range"][1]:
            return key
    
    # Se non viene trovata una corrispondenza esatta, trova la nota più vicina
    closest_key = None
    min_distance = float('inf')
    
    for key in mapping:
        distance = min(abs(volume - key["btc_range"][0]), abs(volume - key["btc_range"][1]))
        if distance < min_distance:
            min_distance = distance
            closest_key = key
    
    return closest_key

def main():
    # Genera la mappatura
    mapping = generate_piano_mapping()
    
    # Esporta in JSON
    export_to_json(mapping)
    
    # Esporta in CSV
    export_to_csv(mapping)
    
    # Crea file MIDI
    create_midi_file(mapping)
    
    # Visualizza la distribuzione
    visualize_distribution(mapping)
    
    # Esempio di utilizzo: trova la nota per un volume specifico
    test_volume = 1.0  # 1 BTC
    note = find_note_for_volume(mapping, test_volume)
    print(f"\nVolume BTC: {test_volume}")
    print(f"Nota corrispondente: {note['note_name']} (MIDI: {note['midi_number']})")
    print(f"Intervallo BTC: {note['btc_range'][0]:.8f} - {note['btc_range'][1]:.8f}")
    print(f"Colore: {note['hex_color']}")

if __name__ == "__main__":
    main()