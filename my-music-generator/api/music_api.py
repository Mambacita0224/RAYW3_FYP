from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import time
import subprocess
import random
import re
from openai import OpenAI

app = Flask(__name__)
CORS(app)

# Set API Key
# os.environ["ARK_API_KEY"] = "c7888c29-d3be-4c16-9508-c0b333b7e509"
# endpoint_id = 'ep-20240926201850-z67zj'

# client = OpenAI(
#     api_key=os.environ.get("ARK_API_KEY"),
#     base_url="https://ark.cn-beijing.volces.com/api/v3",
# )

# Deepseek API Key
os.environ["DEEPSEEK_API_KEY"] = "sk-bd5aebc840b145bb9a3ea75cc3c8e219"
client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com",
)

# Define the ROC folder path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# ROC_FOLDER = 'os.path.join(BASE_DIR, '../../../roc')'
ROC_FOLDER = 'D:\FYP\ROC_fyp'

# Ensure ROC folder exists
os.makedirs(ROC_FOLDER, exist_ok=True)

@app.route('/generate-lyrics', methods=['POST'])
def generate_lyrics():
    """Generates lyrics based on user input."""
    data = request.json
    description = data.get('description', '')
    language = data.get('language', '')
    
    lyrics_info = (
        "Please strictly follow the guidelines below to generate lyrics:\n"
        "1. Each song should contain approximately 3 verses and 1 chorus, with each section having 3 to 5 lines. No two consecutive lines share same length.\n"
        "2. If the lyrics are in English, use [sep] to separate each sentence, e.g., 'when I'm with you[sep]day and night[sep]'\n"
        "3. If the lyrics are in Chinese (Mandarin or Cantonese), use line breaks to separate each sentence, and do not add [sep].\n"
        "4. Use '/' at the end of the previous section (e.g. 我心不灭/）to separate verses and choruses, do not put it in next line, simply follow the last character.\n"
        "5. Ensure that the ending words of each line share the same vowel phoneme, and vary the number of characters in each line, avoiding two lines with the same length.\n"
        "6. Only generate lyrics, no titles, and do not label verses or choruses (absolutely no subheadings like 'Verse:' or 'Chorus:')."
    )

    lyrics_prompt = (
        f"Please create a set of {language} lyrics based on the following requirements, especially the generation guidelines:\n"
        f"1. Description: {description}\n"
        f"2. Generation Requirements: {lyrics_info}"
        f"3. Provide the following three elements in the specified format:\n"
        f"Song Title: 《...》\n"
        f"Lyrics: ...\n"
    )
    
    try:
        start_time = time.time()
        # response = client.chat.completions.create(
        #     model=endpoint_id,
        #     messages=[{"role": "user", "content": lyrics_prompt}],
        # )
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": lyrics_prompt}],
        )
        end_time = time.time()

        elapsed_time = end_time - start_time
        full_content = response.choices[0].message.content if response else "Error generating lyrics"

        parts = full_content.split("Lyrics:")
        song_title = parts[0].replace("Song Title:", "").strip().replace("*", "")
        lyrics = parts[1].strip().replace("*", "")
            
        # Split lyrics and chord progression
        # lyrics = full_content
        print("Song Title: ", song_title)
        print("Lyrics: ", lyrics)

        return jsonify({
            'lyrics': lyrics,
            'time_taken': elapsed_time,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    
@app.route('/generate-chords', methods=['POST'])
def generate_chords():
    data = request.json
    language = data.get('language', '')
    lyrics = data.get('lyrics', '')
    
    try:
        quadrant_info = (
            f"The Q1 refers 'alert', 'excited', 'elated', 'happy'"
            f"The Q2 refers 'contented', 'serene', 'relaxed', 'calm'"
            f"The Q3 refers 'sad', 'depressed', 'lethargic', 'fatigued'"
            f"The Q4 refers 'tense', 'nervous', 'stressed', 'upset'"
        )
        
        quadrant_prompt = (
            f"The Russell's four quadrant emotions are: {quadrant_info}."
            f"What quadrant does the following lyrics belong to? The lyrics is: {lyrics}."
            f"Simply answer one digit 1/2/3/4 without any explanation."
        )
        
        response_quadrant = client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": quadrant_prompt}],
        )
        quadrant_response = response_quadrant.choices[0].message.content.strip()
        match = re.search(r'\d', quadrant_response)
        quadrant = match.group(0) if match else None
        print("Quadrant: ", quadrant)
    except Exception as e:
        return jsonify({'error': f'Error fetching quadrant: {str(e)}'}), 500

    is_major = 0
    tempo = 0

    if quadrant == "1":
        is_major = 1
        tempo = random.randint(120, 140)
    elif quadrant == "2":
        is_major = 1
        tempo = random.randint(100, 120)
    elif quadrant == "3":
        is_major = 1
        tempo = random.randint(100, 120)
    elif quadrant == "4":
        is_major = 0
        tempo = random.randint(120, 140)
    
    chord_prompt = (
        f"Generate chord progression for the Lyrics: {lyrics} with is_major={is_major}, tempo={tempo}."
        f"Remember, the last chord of the verse and chorus should be C if is_major=1, and A if is_major=0."
        f"Generate a set of chord progression for each line of lyrics."
        f"Directly answer with the chord progression generated only."
        f"Below is the sample format:\n"
        f"C E:7\n"
        f"A:m G\n"
        f"D:m G C\n"
    )
    
    try:
        start_time = time.time()
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": chord_prompt}],
        )
        end_time = time.time()

        elapsed_time = end_time - start_time
        chord_progression = response.choices[0].message.content if response else "Error generating lyrics"
        print("Chord Progression: ", chord_progression)

        # Save to files
        lyrics_file_path = os.path.join(ROC_FOLDER, 'lyrics.txt')
        chords_file_path = os.path.join(ROC_FOLDER, 'chord_progression.txt')
        
        # Edit format for lyrics
        language_code = 'zh' if language.lower() in ['cantonese', 'mandarin'] else 'en'
        lyrics_content = f"{is_major}\n{tempo}\n{language_code}\n{lyrics}\n"

        with open(lyrics_file_path, 'w', encoding='utf-8') as lyrics_file:
            lyrics_file.write(lyrics_content)
            print("Lyrics content:\n ",lyrics_content)

        with open(chords_file_path, 'w', encoding='utf-8') as chords_file:
            chords_file.write(chord_progression)
        
        return jsonify({
            'chord_progression': chord_progression,
            'time_taken': elapsed_time,
            'lyrics_file': lyrics_file_path,
            'chords_file': chords_file_path,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

@app.route('/check-files', methods=['GET'])
def check_files():
    """Checks if lyrics.txt and chord_progression.txt exist."""
    lyrics_path = os.path.join(ROC_FOLDER, "lyrics.txt")
    chords_path = os.path.join(ROC_FOLDER, "chord_progression.txt")

    files_exist = os.path.exists(lyrics_path) and os.path.exists(chords_path)
    return jsonify({"files_exist": files_exist})


@app.route('/generate-melody', methods=['POST'])
def generate_melody():
    """Runs lyrics_to_melody.py if files exist."""
    data = request.json
    voice = data.get('voice', '')
    lyrics_path = os.path.join(ROC_FOLDER, "lyrics.txt")
    chords_path = os.path.join(ROC_FOLDER, "chord_progression.txt")

    if not (os.path.exists(lyrics_path) and os.path.exists(chords_path)):
        return jsonify({"error": "Required files not found"}), 400

    try:
        print("The selected voice is", voice)
        subprocess.Popen(["python", "start.py"], cwd=ROC_FOLDER)
        print("Start.py start.")
        return jsonify({"message": "Melody generation started"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(port=5000, debug=False)
