from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import time
import subprocess
import random
import re
from openai import OpenAI
from openai import AzureOpenAI
import base64
import io
import requests
from PIL import Image

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

# Azure OpenAI endpoint and API key for album generation
# API_KEY = "b9e6f30f3ab7419db88dec0fd2b73b99"
# ENDPOINT = "https://hkust.azure-api.net"
# client_openai = AzureOpenAI(
#        api_key=API_KEY,
#        api_version="2024-06-01",
#        azure_endpoint="https://hkust.azure-api.net/",
#    )

# OpenAI api ket for album generation
client_openAI = OpenAI(
    api_key='YOUR_API_KEY_HERE'
)

# Define the ROC folder path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# ROC_FOLDER = 'os.path.join(BASE_DIR, '../../../roc')'
# ROC_FOLDER = 'D:\FYP\ROC_fyp'
ROC_FOLDER = "/Users/zengyuhang/Desktop/academic/fyp/fyp_code_latest/RAYW3_FYP/roc"
# Try how to navigate to the roc folder using the relative path

# Ensure ROC folder exists
os.makedirs(ROC_FOLDER, exist_ok=True)

def count_consecutive_lengths(lengths):
    count = 0
    for i in range(0, len(lengths), 4):
        if (i + 2 < len(lengths) and 
            lengths[i] == lengths[i + 1] == lengths[i + 2]) or \
           (i + 3 < len(lengths) and 
            lengths[i + 1] == lengths[i + 2] == lengths[i + 3]):
            count += 1
    
    return count

def clean_lyrics(lyrics):
            lines = lyrics.splitlines()
            cleaned_lines = []
            skip_next = False

            for line in lines:
                if 'Note:' in line:
                    skip_next = True
                    continue
                if skip_next:
                    continue
                if any(keyword in line for keyword in [
                    '主歌：', '副歌：', '尾段：', '主歌:', '副歌:', 
                    '尾段:', '尾声：', '尾聲：', 'verse:', 'verses:',
                    'chorus:', 'choruses:', 'Verse:', 'Verses:',
                    'Chorus:', 'Choruses:', 'outro:', 'Outro:'
                ]):
                    continue
                line = re.sub(r'\(.*?\)', '', line).strip()
                # line = re.sub(r'[^\w]', '', line)
                cleaned_lines.append(line)

            return "\n".join(cleaned_lines)

@app.route('/generate-lyrics', methods=['POST'])
def generate_lyrics():
    """Generates lyrics based on user input."""
    data = request.json
    description = data.get('description', '')
    language = data.get('language', '')
    
    if language == "mandarin":
        lyrics_info = (
            "请严格遵循以下指南生成普通话歌词（以简体中文生成）：\n"
            "1. 每首歌应首先包含2段和2个副歌，每个部分有4行。\n"
            "2. 在2段和2个副歌之后，歌曲末尾应有1个包含2行歌词的尾段。\n"
            "3. 连续的两行不应有相同的字符数，以下是一些指示：\n"
            "在生成普通话歌词时，连续两行的字符数应至少相差3个字符。\n"
            "例如，如果第一行生成的句子包含3个字符，如'你锁眉'，下一行应包含不同数量的字符，如6个或更多'哭红颜唤不回'。\n"
            # "主歌与副歌的生成都要谨记这项规定，千万要避免三句连续歌词字数相近的情况。\n"
            "你可以尝试第一行生成三字歌词开始。\n"
            "主歌和副歌应避免使用相同的段落模式。\n"
            "4. 请使用换行分隔每个句子。\n"
            "5. 确保每行的结尾词共享相同的元音音素，并且每行的字符数不同，避免两行的长度相同。\n"
            "6. 只生成歌词，不要标题，不要标注字符数量，也不要标记段落或尾声（绝对不要有'段落:'或'副歌:'这样的子标题）。"
            "这是你生成过的成功案例，你可以参考：\n你转身\n背影在夜色里沉沦\n我数着伤痕\n月光冷得无声\n风吹散\n承诺像沙漏般流完\n我捂住双眼\n泪却烫伤指尖\n"
        )
    elif language == "cantonese":
        lyrics_info= (
            "請嚴格遵循以下指引生成廣東話歌詞（以繁體中文生成）：\n"
            "1. 請用書面語生成，不要包含‘嘅’、‘咁’、‘啲’、‘哋’等粵語口語字樣。\n"
            "2. 每首歌應首先包含2段和2個副歌，每個部分有4行。\n"
            "3. 在2段和2個副歌之後，歌曲末尾應有1個包含2行歌詞的尾段。\n"
            "4. 連續的兩行不應共享相同的字符數，以下是一些指示：\n"
            "在生成粵語歌詞時，連續兩行的字符數應至少相差3個字符。\n"
            "例如，如果第一句生成的句子包含7個字符，如'為何為好事淚流'，下一行應包含不同數量的字符，如11個或更多'誰能憑愛意要富士山私有'。\n"
            # "主歌與副歌都要謹記這項規定，千萬要避免三句連續歌詞字數相近的情況。"
            "你可以嘗試第一行生成三字歌詞開始。\n"
            "主歌和副歌應避免使用相同的段落模式。\n"
            "5. 確保每行的結尾詞共享相同的元音音素，並且每行的字符數不同，避免兩行的長度相同。\n"
            "6. 只生成歌詞，不要標題，不要標注字符數量，也不要標記段落或尾聲（絕對不要有'段落:'或'副歌:'這樣的子標題）。"
            "這是你生成過的成功案例，你可以參考：\n為何你走\n留下我獨自承受這寂寞\n回憶如刀鋒划過心頭\n眼淚無聲地落成河\n曾經相擁\n承諾過永遠不分的你我\n如今只剩冰冷的沉默\n愛在風中漸漸飄走\n"
        )
    elif language == "english":
        lyrics_info = (
            "Please strictly follow the guidelines below to generate english lyrics:\n"
            "1. Each song should first contain 2 verses and 2 choruses, with each section having 4 lines of lyric.\n"
            "2. After 2 verses and 2 choruses, there should be 1 outro with 2 lines of lyrics at the end of the song.\n"
            "3. No two consecutive lines share the same number of words. Below are some instructions:\n"
            "When generating English lyrics, use only monosyllabic and disyllabic words, and the number of words in two consecutive lines should differ by at least 3.\n"
            "Do not use contractions in English lyrics, such as 'I'm' or 'You're.'\n"
            "For example, if the first generated sentence contains 1 word like 'like', the next line should contain a different number of words like 4 or more 'baby baby baby oh'.\n"
            # "When generating the verses and choruses, be sure to keep this rule in mind and avoid having three consecutive lines with similar word counts."
            # "4. If the lyrics are in English, use [sep] to separate each line, e.g., 'when I'm with you[sep]day and night[sep]'.\n"
            "The verses and choruses should not use the same paragraph pattern.\n"
            "4. Ensure that the ending words of each line share the same vowel phoneme, and vary the number of characters in each line, avoiding two lines with the same length.\n"
            "5. Only generate lyrics, no titles, and do not label verses, choruses, or outro (absolutely no subheadings like 'Verse:' or 'Chorus:')."
            "This is a sample for your reference:\nyou know it is true baby\nyou shine so bright\nyou light up the sky\nI wish you were mine ohh\n"
        )

    lyrics_prompt = (
        f"Please create a set of {language} lyrics based on the following requirements, especially the generation guidelines:\n"
        f"1. Description: {description}\n"
        f"2. Generation Requirements: {lyrics_info}"
        f"3. Must provide the following two elements in the specified format and order including the subtitle, make sure NO additional content generated (e.g. Note).:\n"
        f"Song Title: 《...》\n"
        f"Lyrics: ...\n"
    )
    
    validation_prompt = (
        f"You are a checker to verify if the user's description is suitable as a prompt for an LLM in creating lyrics for a song. "
        f"Determine if the following description is valid for creating {language} song lyrics. "
        f"The description shouldn't contain anything violent, racist, or inappropriate. "
        f"It should not intend to persuade the LLM to generate irrelevant content other than lyrics. "
        f"The description should not aim to create lyrics in a language other than {language}. "
        f"It is acceptable to input description in a language other than {language} as long as it is valid."
        f"The Description: {description}. "
        f"Only reply with the single word 'valid' if it is appropriate for songwriting. "
        f"If the description is invalid, reply with the reason why it is invalid."
    )
    
    try:
        # check user input's validity
        validation_response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "user", "content": validation_prompt}
            ]
        )

        validity = validation_response.choices[0].message.content.strip().lower()
        print(validity)

        if validity != "valid":
            return jsonify({
                'validity': validity
            })
        
        start_time = time.time()
        # response = client.chat.completions.create(
        #     model=endpoint_id,
        #     messages=[{"role": "user", "content": lyrics_prompt}],
        # )
        response = client.chat.completions.create(
            model="deepseek-chat",
            # model="deepseek-reasoner",
            messages=[{"role": "user", "content": lyrics_prompt}],
        )
        end_time = time.time()

        elapsed_time = end_time - start_time
        full_content = response.choices[0].message.content if response else "Error generating lyrics"
        print(full_content)

        try:
            parts = full_content.split("Lyrics:")
            song_title_raw = parts[0].replace("Song Title:", "").strip().replace("*", "")
            match = re.search(r'《.*?》', song_title_raw)
            song_title = match.group(0) if match else ""
            lyrics = clean_lyrics(parts[1].strip().replace("*", ""))
            
        except IndexError:
            lines = full_content.splitlines()
            if lines:
                song_title_raw = lines[0].strip()
                match = re.search(r'《.*?》', song_title_raw)
                song_title = match.group(0) if match else ""
                lyrics = clean_lyrics("\n".join(lines[1:]).strip())
            else:
                song_title = ""
                lyrics = ""
        
        num_lyrics_lines = len([line for line in lyrics.splitlines() if line.strip()])
        lengths = []
        for line in lyrics.splitlines():
            if line.strip():
                if language == 'english':
                    lengths.append(len(line.split()))  # Count words for English
                elif language == 'mandarin' or language == 'cantonese':
                    lengths.append(len(line.strip()))  # Count characters for Chinese
        consecutive_groups = count_consecutive_lengths(lengths)
        non_empty_lyrics = [line for line in lyrics.splitlines() if line.strip()]
        if num_lyrics_lines > 18:
            lyrics = "\n".join(non_empty_lyrics[:18])
        elif num_lyrics_lines < 18:
            num_missing = 18 - len(non_empty_lyrics)
            if num_missing > 0:
                last_lines = non_empty_lyrics[-num_missing:]
                lyrics = "\n".join(non_empty_lyrics + last_lines * ((num_missing // len(last_lines)) + 1))[:18]
            
        if consecutive_groups >= 1:
            # 一些人工补救措施，gen出来三行连续一样字符数量的，给最后一行加上'啊'或者'ohh yeah'
            for i in range(0, len(lengths), 4):
                if (i + 2 < len(lengths) and 
                    lengths[i] == lengths[i + 1] == lengths[i + 2]) or \
                    (i + 3 < len(lengths) and 
                    lengths[i + 1] == lengths[i + 2] == lengths[i + 3]):
                    
                    if (i + 2 < len(lengths) and lengths[i] == lengths[i + 1] == lengths[i + 2]):
                        last_line = non_empty_lyrics[i + 2]
                    else:
                        last_line = non_empty_lyrics[i + 3]

                    if language == 'english':
                        lyrics = lyrics.replace(last_line, last_line + " ohh yeah", 1)
                    else:
                        lyrics = lyrics.replace(last_line, last_line + "啊", 1)
        
        print("Song Title: ", song_title)
        print("Lyrics: ", lyrics)

        return jsonify({
            'lyrics': lyrics,
            'title': song_title,
            'time_taken': elapsed_time,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500 
    
    
@app.route('/generate-chords', methods=['POST'])
def generate_chords():
    data = request.json
    language = data.get('language', '')
    lyrics = data.get('lyrics', '')
    num_lyrics_lines = len([line for line in lyrics.splitlines() if line.strip()])
    print("number of lines in lyrics:", num_lyrics_lines)
    lengths = []
    for line in lyrics.splitlines():
        if line.strip():
            if language == 'english':
                lengths.append(len(line.split()))  # Count words for English
            elif language == 'mandarin' or language == 'cantonese':
                lengths.append(len(line.strip()))  # Count characters for Chinese
                
    consecutive_groups = count_consecutive_lengths(lengths)
    print(lengths)
    print("There are ", consecutive_groups, " consecutive lines share same length")
    
    try:
        # Check lyrics' validity
        if (num_lyrics_lines == 18) and (consecutive_groups <= 1):
            validity = 'valid'
        elif (num_lyrics_lines != 18):
            validity = 'The suggested pattern for lyrics is 2 verses and 2 choruses, each with four lines, plus a closing section with two lines for the best effect.'
        elif (consecutive_groups > 1):
            validity = 'The lengths of adjacent lines are the same, which may sound like reciting poetry. Try using lyrics with varying lengths instead.'
        
        print(validity)

        if validity != "valid":
            return jsonify({
                'validity': validity
            })
            
        quadrant_info = (
            f"The Q1 refers 'alert', 'excited', 'elated', 'happy'"
            f"The Q2 refers 'tense', 'nervous', 'stressed', 'upset'"
            f"The Q3 refers 'sad', 'depressed', 'lethargic', 'fatigued'"
            f"The Q4 refers 'contented', 'serene', 'relaxed', 'calm'"
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
        is_major = 0
        tempo = random.randint(120, 140)
    elif quadrant == "3":
        is_major = 0
        tempo = random.randint(100, 120)
    elif quadrant == "4":
        is_major = 1
        tempo = random.randint(100, 120)
    
    chord_prompt = (
        f"Generate chord progression for the Lyrics: {lyrics} with is_major={is_major}, tempo={tempo}."
        f"Remember, the last chord in the last line of the chord progression of the second verse, the second chorus, and the outro should be C if is_major is 1, and A if is_major is 0."
        f"Generate a set of chord progression for each line of lyrics. The generated content should have the same number of lines as the lyrics."
        f"In this chord generation, please output a total of {num_lyrics_lines} lines of chord progression in the format of 4+4+4+4+2, meaning 4 lines for each verse and chorus, and 2 lines for the outro."
        f"Directly answer with the chord progression generated only, make sure NO additional content generated (e.g. notes/lyrics)."
        f"Ensure each chord is followed by a ':' and appropriate suffix based on the following rules:\n"
        f"- Major chords should have ' ' after ':' (e.g., C: G: )\n"
        f"- Minor chords should have 'm' after ':' (e.g., A:m: G:m)\n"
        f"- Augmented chords should have '+' after ':' (e.g., C:+ G:+)\n"
        f"- Diminished chords should have 'dim' after ':' (e.g., A:dim G:dim)\n"
        f"- Dominant 7th chords should have '7' after ':' (e.g., E:7)\n"
        f"- Major 7th chords should have 'maj7' after ':' (e.g., C:maj7)\n"
        f"- Minor 7th chords should have 'm7' after ':' (e.g., A:m7)\n"
        f"- Half-diminished 7th chords should have 'm7b5' after ':' (e.g., A:m7b5)\n"
        f"Below is the sample format of output:\n"
        f"C: E:7\n"
        f"A:m G: \n"
        f"D:m G: C: \n"
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
        
        num_chord_lines = len([line for line in chord_progression.splitlines() if line.strip()])
        if num_chord_lines != 18:
            print("truncate the chord")
            lines = chord_progression.splitlines()
            non_empty_lines = [line for line in lines if line.strip()]
            truncated_lines = non_empty_lines[:18]
            
            if is_major == 1:
                for i in [7, 15, 17]:
                    if len(truncated_lines[i].strip()) > 0:
                        chords = truncated_lines[i].strip().split()
                        chords[-1] = 'C:'
                        truncated_lines[i] = ' '.join(chords)
            else:
                for i in [7, 15, 17]:
                    if len(truncated_lines[i].strip()) > 0:
                        chords = truncated_lines[i].strip().split()
                        chords[-1] = 'A:m'
                        truncated_lines[i] = ' '.join(chords)
            
            chord_progression = "\n".join(truncated_lines)
            print(chord_progression)
                    

        # Save to files
        lyrics_file_path = os.path.join(ROC_FOLDER, 'lyrics.txt')
        chords_file_path = os.path.join(ROC_FOLDER, 'chord_progression.txt')
        
        # Edit format for lyrics
        language_code = 'zh' if language.lower() in ['cantonese', 'mandarin'] else 'en'
        
        # if language_code == "en":
        #     # 英语歌词转换为用 [sep] 分隔
        #     lyrics = lyrics.replace("\n", "[sep]")
    
        lyrics_content = f"{is_major}\n{tempo}\n{language_code}\n{lyrics}\n"

        with open(lyrics_file_path, 'w', encoding='utf-8') as lyrics_file:
            lyrics_file.write(lyrics_content)

        with open(chords_file_path, 'w', encoding='utf-8') as chords_file:
            chords_file.write(chord_progression)
            
        def remove_blank_lines(file_path):
            with open(file_path, 'r+', encoding='utf-8') as file:
                lines = file.readlines()
                non_blank_lines = [line for line in lines if line.strip()]
                file.seek(0)
                file.truncate()
                file.writelines(non_blank_lines)
        
        remove_blank_lines(lyrics_file_path)
        remove_blank_lines(chords_file_path)
        
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

@app.route('/check-audio-status', methods=['GET'])
def check_audio_status():
    """
    Check if final_song.wav exists in the roc folder.
    If found, return information about the file.
    """
    audio_path = os.path.join(ROC_FOLDER, "final_song.wav") # Modify according to the song name
    
    if os.path.exists(audio_path):
        # Get last modified time
        last_modified = os.path.getmtime(audio_path)
        file_size = os.path.getsize(audio_path)
        
        return jsonify({
            "exists": True,
            "last_modified": last_modified,
            "file_size": file_size,
            "file_path": audio_path
        })
    else:
        return jsonify({"exists": False})

@app.route('/get-audio', methods=['GET'])
def get_audio():
    """
    Send the final_song.wav file if it exists.
    Optional query parameter 'download=true' will set headers for download.
    """
    audio_path = os.path.join(ROC_FOLDER, "final_song.wav")
    
    if not os.path.exists(audio_path):
        return jsonify({"error": "Audio file not found"}), 404
    
    # Check if this is a download request
    download = request.args.get('download', 'false').lower() == 'true'
    
    # Set cache control headers to prevent caching
    response = send_file(
        audio_path,
        mimetype='audio/wav',
        as_attachment=download,
        download_name="generated_song.wav" if download else None
    )
    
    # Add cache control headers
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.route('/generate-album-cover', methods=['POST'])
def generate_album_cover():
    """Generates an album cover image using DALLE based on song information."""
    data = request.json
    # Log incoming data
    print(f"Received request with data: {data}")
    title = data.get('title', '')
    description = data.get('description', '')
    lyrics_snippet = data.get('lyrics', '')
    
    # Take just the first few lines of lyrics for context
    lyrics_lines = lyrics_snippet.strip().split('\n')
    short_lyrics = '\n'.join(lyrics_lines[:4]) if len(lyrics_lines) > 4 else lyrics_snippet
    
    # Construct the prompt for DALLE
    prompt = f"Create an album cover for a song titled '{title}'. The song is about: {description}. Some lyrics: {short_lyrics}. Make it artistic, emotional, and suitable for a music album cover."

    try:
        # Generate image using DALLE via the same client used for other API calls
        response = client_openAI.images.generate(
            model="dall-e-3",  # Use DALLE-3 or whatever model is available in your setup
            prompt=prompt,
            n=1,
            size="1024x1024"
        )
        
        # Get the image URL or data
        if hasattr(response, 'data') and len(response.data) > 0:
            image_url = response.data[0].url
            
            # If the response contains a URL, you can either:
            # 1. Return the URL directly (if it's publicly accessible)
            # return jsonify({"album_cover_url": image_url})
            
            # 2. Or download and save the image to serve locally
            image_response = requests.get(image_url)
            
            if image_response.status_code == 200:
                # Save the image to the ROC folder
                album_cover_path = os.path.join(ROC_FOLDER, "album_cover.jpg")
                with open(album_cover_path, "wb") as f:
                    f.write(image_response.content)
                
                return jsonify({
                    "success": True,
                    "message": "Album cover generated successfully",
                    "album_cover_path": album_cover_path
                })
            else:
                return jsonify({"error": "Failed to download the generated image"}), 500
        else:
            return jsonify({"error": "No image was generated"}), 500
            
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Detailed error: {error_details}")
        return jsonify({'error': str(e)}), 500

# Add a new endpoint to serve the album cover
@app.route('/get-album-cover', methods=['GET'])
def get_album_cover():
    """Serve the generated album cover image."""
    album_cover_path = os.path.join(ROC_FOLDER, "album_cover.jpg")
    
    if os.path.exists(album_cover_path):
        # Set cache control headers to prevent caching
        response = send_file(
            album_cover_path,
            mimetype='image/jpeg'
        )
        
        # Add cache control headers
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    else:
        return jsonify({"error": "Album cover not found"}), 404

if __name__ == '__main__':
    app.run(port=5000, debug=False)
