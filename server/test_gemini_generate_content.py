import os
import requests
import json

API_KEY = os.getenv("GEMINI_API_KEY")
print("Using API_KEY:", API_KEY)
url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
headers = {
    "Content-Type": "application/json",
    "X-goog-api-key": API_KEY
}
data = {
    "contents": [
        {
            "parts": [
                {"text": "Write a Python function to check if a number is prime."}
            ]
        }
    ]
}

response = requests.post(url, headers=headers, data=json.dumps(data))
try:
    print(response.json())
except Exception as e:
    print("Failed to parse JSON. Raw response:")
    print(response.text)
    print("Error:", e)
