from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import time
from openai import OpenAI

app = Flask(__name__)
CORS(app)

os.environ["ARK_API_KEY"] = "c7888c29-d3be-4c16-9508-c0b333b7e509"
endpoint_id = 'ep-20240926201850-z67zj'

client = OpenAI(
    api_key=os.environ.get("ARK_API_KEY"),
    base_url="https://ark.cn-beijing.volces.com/api/v3",
)

@app.route('/generate-lyrics', methods=['POST'])
def generate_lyrics():
    data = request.json
    description = data.get('description', '')
    language = data.get('language', 'English')
    style = data.get('style', '')
    additional_info = (
            "Each stanza should have four lines, each approximately eight words long, ensuring the last words rhyme."
            "Please ensure that the ending words of each line have the same vowel sounds."
    )

    prompt = (
        f"Please create a set of {language} lyrics based on the following requirements:\n"
        f"1. Description: {description}\n"
        f"2. Style: {style}\n"
        f"3. {additional_info}"
    )

    start_time = time.time()
    response = client.chat.completions.create(
        model=endpoint_id,
        messages=[{"role": "user", "content": prompt}],
    )
    end_time = time.time()

    elapsed_time = end_time - start_time
    lyrics = response.choices[0].message.content if response else "Error generating lyrics"

    return jsonify({
        'lyrics': lyrics,
        'time_taken': elapsed_time
    })

if __name__ == '__main__':
    app.run(debug=True)