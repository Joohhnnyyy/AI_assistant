import os
import requests

API_KEY = os.getenv("GEMINI_API_KEY")
print("Using API_KEY:", API_KEY)
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"

response = requests.get(url)
try:
    print(response.json())
except Exception as e:
    print("Failed to parse JSON. Raw response:")
    print(response.text)
    print("Error:", e)
