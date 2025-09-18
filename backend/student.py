from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
import google.generativeai as genai
import speech_recognition as sr
import pyttsx3
import threading
import json
import tempfile
import wave
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["*"])

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure Gemini AI
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY not found in environment variables")
    GEMINI_API_KEY = "dummy_key_for_testing"  # Fallback for testing

try:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')  # Changed from 'gemini-pro'
    logger.info("Gemini AI configured successfully")
except Exception as e:
    logger.error(f"Failed to configure Gemini AI: {e}")
    model = None

# Initialize speech recognition and text-to-speech
try:
    recognizer = sr.Recognizer()
    microphone = sr.Microphone()
    tts_engine = pyttsx3.init()
    
    # Configure TTS voice to sound more friendly
    voices = tts_engine.getProperty('voices')
    if voices:
        for voice in voices:
            if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                tts_engine.setProperty('voice', voice.id)
                break
    
    tts_engine.setProperty('rate', 180)  # Slightly slower for clarity
    tts_engine.setProperty('volume', 0.9)
    logger.info("Speech services initialized successfully")
    
except Exception as e:
    logger.error(f"Failed to initialize speech services: {e}")
    recognizer = None
    microphone = None
    tts_engine = None

class VoiceAssistant:
    def __init__(self):
        self.conversation_history = []
        self.student_context = {
            'mood': 'sad',
            'problems': [],
            'session_start': datetime.now().isoformat()
        }
        
    def get_motivational_prompt(self, user_message, context):
        """Generate a context-aware prompt for the AI"""
        base_prompt = f"""
        You are Maya, a caring and empathetic AI friend designed to help students through difficult times. 
        You have a warm, understanding personality and speak like a supportive friend, not a therapist.
        
        Student Context:
        - Current mood: {context.get('mood', 'unknown')}
        - Previous problems mentioned: {', '.join(context.get('problems', []))}
        - Session duration: Started at {context.get('session_start')}
        
        Guidelines for your response:
        1. Always respond with empathy and understanding
        2. Use casual, friendly language like talking to a close friend
        3. Acknowledge their feelings without minimizing them
        4. Offer practical, actionable advice when appropriate
        5. Ask follow-up questions to understand better
        6. Share relatable experiences or analogies
        7. Keep responses conversational and not too long (2-3 sentences max)
        8. Use encouraging language and positive reinforcement
        9. If they mention serious issues (self-harm, etc.), gently suggest professional help
        10. Remember you're their supportive buddy, not a clinical therapist
        
        Previous conversation:
        {self.get_conversation_summary()}
        
        Student just said: "{user_message}"
        
        Respond as Maya, their caring AI friend:
        """
        return base_prompt
    
    def get_conversation_summary(self):
        """Get a summary of recent conversation"""
        if not self.conversation_history:
            return "This is the start of our conversation."
        
        recent_messages = self.conversation_history[-4:]  # Last 4 exchanges
        summary = ""
        for msg in recent_messages:
            summary += f"Student: {msg.get('user', '')}\nMaya: {msg.get('assistant', '')}\n"
        return summary
    
    def process_voice_input(self):
        """Capture and process voice input"""
        if not recognizer or not microphone:
            return "Voice recognition is not available. Please check your microphone setup."
        
        try:
            logger.info("Listening for student input...")
            
            # Adjust for ambient noise
            with microphone as source:
                recognizer.adjust_for_ambient_noise(source, duration=1)
                
            # Listen for audio input
            with microphone as source:
                audio = recognizer.listen(source, timeout=10, phrase_time_limit=10)
            
            # Convert speech to text
            text = recognizer.recognize_google(audio)
            logger.info(f"Student said: {text}")
            
            return text
            
        except sr.WaitTimeoutError:
            return "I didn't hear anything. Could you please try again?"
        except sr.UnknownValueError:
            return "I couldn't understand what you said. Could you please repeat that?"
        except sr.RequestError as e:
            logger.error(f"Speech recognition error: {e}")
            return "I'm having trouble with my hearing right now. Could you type your message instead?"
    
    def generate_ai_response(self, user_message):
        """Generate AI response using Gemini"""
        if not model:
            return "I'm having trouble thinking right now, but I'm here for you. What's on your mind?"
        
        try:
            # Update context based on user message
            self.update_context(user_message)
            
            # Generate prompt
            prompt = self.get_motivational_prompt(user_message, self.student_context)
            
            # Get AI response
            response = model.generate_content(prompt)
            ai_message = response.text.strip()
            
            # Store conversation
            self.conversation_history.append({
                'user': user_message,
                'assistant': ai_message,
                'timestamp': datetime.now().isoformat()
            })
            
            logger.info(f"AI response: {ai_message}")
            return ai_message
            
        except Exception as e:
            logger.error(f"AI generation error: {e}")
            return "I'm having trouble thinking right now. But I'm here for you. Could you tell me more about what's bothering you?"
    
    def speak_response(self, text):
        """Convert text to speech using pyttsx3"""
        try:
            if not self.engine:
                return False
                
            # Clear any pending speech
            self.engine.stop()
            
            # Configure voice settings
            voices = self.engine.getProperty('voices')
            if voices:
                for voice in voices:
                    if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                        self.engine.setProperty('voice', voice.id)
                        break
            
            self.engine.setProperty('rate', 180)
            self.engine.setProperty('volume', 0.9)
            
            # Use say instead of save_to_file to avoid run loop issues
            self.engine.say(text)
            self.engine.runAndWait()
            
            logger.info("Text-to-speech completed")
            return True
            
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return False
    
    def update_context(self, user_message):
        """Update student context based on their message"""
        message_lower = user_message.lower()
        
        # Detect problems mentioned
        problem_keywords = {
            'stress': 'academic stress',
            'exam': 'exam anxiety', 
            'lonely': 'loneliness',
            'friend': 'friendship issues',
            'family': 'family problems',
            'money': 'financial concerns',
            'job': 'career worries',
            'relationship': 'relationship issues',
            'health': 'health concerns',
            'anxiety': 'anxiety',
            'depression': 'depression',
            'overwhelmed': 'feeling overwhelmed'
        }
        
        for keyword, problem in problem_keywords.items():
            if keyword in message_lower and problem not in self.student_context['problems']:
                self.student_context['problems'].append(problem)
        
        # Update mood indicators
        positive_words = ['better', 'good', 'happy', 'okay', 'fine', 'thanks']
        if any(word in message_lower for word in positive_words):
            self.student_context['mood'] = 'improving'

# Global voice assistant instance
voice_assistant = VoiceAssistant()

@app.route('/')
def home():
    return "Student Voice Assistant Backend is Running!"

@app.route('/api/start-conversation', methods=['POST'])
def start_conversation():
    """Initialize a new conversation session"""
    global voice_assistant
    voice_assistant = VoiceAssistant()
    
    # Get student data from request
    data = request.get_json() or {}
    happiness_score = data.get('happiness', 0)
    student_name = data.get('name', 'friend')
    
    # Update context
    voice_assistant.student_context.update({
        'happiness_score': happiness_score,
        'student_name': student_name,
        'mood': 'sad' if happiness_score < 80 else 'happy'
    })
    
    # Generate welcome message
    welcome_message = f"Hi there! I'm Maya, your AI friend. I can sense you might be feeling a bit down today, and that's totally okay. I'm here to listen and support you through whatever you're going through. What's on your mind?"
    
    if model:
        welcome_prompt = f"""
        You are Maya, a caring AI friend. A student named {student_name} just came to talk with you. 
        Their happiness score is {happiness_score}%, which means they're feeling down and need support.
        
        Give a warm, welcoming greeting that:
        1. Introduces yourself as Maya
        2. Acknowledges they might be feeling down
        3. Assures them you're here to listen and help
        4. Asks them to share what's on their mind
        5. Keep it brief, warm, and conversational (2-3 sentences)
        
        Respond as Maya:
        """
        
        try:
            response = model.generate_content(welcome_prompt)
            welcome_message = response.text.strip()
        except Exception as e:
            logger.error(f"Welcome message generation error: {e}")
    
    return jsonify({
        'success': True,
        'message': welcome_message,
        'session_id': voice_assistant.student_context['session_start']
    })

@app.route('/api/listen', methods=['POST'])
def listen_to_student():
    """Capture student's voice input"""
    try:
        # Capture voice input
        user_message = voice_assistant.process_voice_input()
        
        return jsonify({
            'success': True,
            'message': user_message,
            'is_error': user_message.startswith("I didn't hear") or user_message.startswith("I couldn't understand")
        })
        
    except Exception as e:
        logger.error(f"Voice input error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to capture voice input',
            'message': "I'm having trouble hearing you right now. Could you try again?"
        })

@app.route('/api/respond', methods=['POST'])
def respond_to_student():
    """Generate AI response to student message"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        enable_voice = data.get('enable_voice', True)  # New parameter for voice control
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'No message provided'
            })
        
        # Generate AI response
        ai_response = voice_assistant.generate_ai_response(user_message)
        
        # Generate voice response if requested
        voice_response = None
        if enable_voice:
            try:
                # Create audio response using pyttsx3
                import tempfile
                import base64
                
                # Initialize TTS engine
                engine = pyttsx3.init()
                
                # Configure voice settings
                voices = engine.getProperty('voices')
                if voices:
                    # Try to find a female voice for Maya
                    for voice in voices:
                        if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                            engine.setProperty('voice', voice.id)
                            break
                
                # Set speech rate and volume
                engine.setProperty('rate', 180)  # Slower, more natural speech
                engine.setProperty('volume', 0.9)
                
                # Create temporary audio file
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                    temp_filename = temp_file.name
                
                # Save speech to file
                engine.save_to_file(ai_response, temp_filename)
                engine.runAndWait()
                
                # Read audio file and encode as base64
                with open(temp_filename, 'rb') as audio_file:
                    audio_data = audio_file.read()
                    voice_response = base64.b64encode(audio_data).decode('utf-8')
                
                # Clean up temporary file
                import os
                os.unlink(temp_filename)
                
                logger.info("Voice response generated successfully")
                
            except Exception as voice_error:
                logger.error(f"Voice generation error: {voice_error}")
                voice_response = None
        
        return jsonify({
            'success': True,
            'response': ai_response,
            'voice_response': voice_response,
            'has_voice': voice_response is not None,
            'conversation_count': len(voice_assistant.conversation_history),
            'student_context': voice_assistant.student_context
        })
        
    except Exception as e:
        logger.error(f"Response generation error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate response',
            'response': "I'm here for you, even though I'm having some technical difficulties. What matters most is that you're reaching out. Can you tell me what's bothering you?"
        })

@app.route('/api/speak', methods=['POST'])
def speak_text():
    """Convert text to speech"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            })
        
        # Speak the text in a separate thread to avoid blocking
        def speak_async():
            voice_assistant.speak_response(text)
        
        thread = threading.Thread(target=speak_async)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Speaking response...'
        })
        
    except Exception as e:
        logger.error(f"TTS error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to speak text'
        })

@app.route('/api/conversation-history', methods=['GET'])
def get_conversation_history():
    """Get current conversation history"""
    return jsonify({
        'success': True,
        'history': voice_assistant.conversation_history,
        'context': voice_assistant.student_context,
        'total_messages': len(voice_assistant.conversation_history)
    })

if __name__ == '__main__':
    logger.info("Voice Assistant Backend Starting...")
    
    # Test services on startup
    if not model:
        logger.warning("Gemini AI not available - using fallback responses")
    if not tts_engine:
        logger.warning("Text-to-speech not available")
    if not recognizer:
        logger.warning("Speech recognition not available")
    
    app.run(debug=True, host='0.0.0.0', port=5000)