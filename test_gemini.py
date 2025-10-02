# test_working_model.py
import google.generativeai as genai

genai.configure(api_key="AIzaSyC2mAcbO0KDvTkqwSySWzzxYSuzFpyPIkY")
model = genai.GenerativeModel('gemini-2.0-flash')
response = model.generate_content("Hello! Are you working?")
print("✅ SUCCESS:", response.text)