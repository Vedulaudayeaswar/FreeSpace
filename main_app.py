from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
import logging
import os
import tempfile
import base64

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["*"])

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Initialize Google Gemini AI
try:
    import google.generativeai as genai
    
    # Configure Gemini with API key
    gemini_api_key = os.getenv('GEMINI_API_KEY')
    if gemini_api_key:
        genai.configure(api_key=gemini_api_key)
        # Updated model name to working version
        model = genai.GenerativeModel('gemini-2.0-flash')
        logger.info("✅ Gemini AI configured successfully for all services")
    else:
        logger.error("❌ GEMINI_API_KEY not found in environment variables")
        model = None
        
except Exception as e:
    logger.error(f"❌ Failed to initialize Gemini AI: {e}")
    model = None

# Initialize Speech Services with better error handling
speech_available = False
recognizer = None
microphone = None
tts_engine = None

try:
    # Import speech libraries with fallback handling
    import speech_recognition as sr
    import pyttsx3
    
    recognizer = sr.Recognizer()
    
    # Try to initialize microphone with fallback
    try:
        microphone = sr.Microphone()
        speech_available = True
        logger.info("✅ Microphone initialized successfully")
    except Exception as mic_error:
        logger.warning(f"⚠️ Microphone not available (cloud environment): {mic_error}")
        microphone = None
        speech_available = False
    
    # Initialize TTS with improved fallback
    try:
        tts_engine = pyttsx3.init()
        
        # Configure TTS voice
        voices = tts_engine.getProperty('voices')
        if voices and len(voices) > 0:
            for voice in voices:
                if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                    tts_engine.setProperty('voice', voice.id)
                    break
            else:
                # Use first available voice if no female voice found
                tts_engine.setProperty('voice', voices[0].id)
        
        tts_engine.setProperty('rate', 170)
        tts_engine.setProperty('volume', 0.9)
        
        # Test TTS
        tts_engine.say("TTS initialized")
        tts_engine.runAndWait()
        
        logger.info("✅ Text-to-speech initialized successfully")
        
    except Exception as tts_error:
        logger.warning(f"⚠️ Text-to-speech initialization failed: {tts_error}")
        # Set browser fallback flag
        tts_engine = "browser_fallback"
        logger.info("🌐 Falling back to browser-based text-to-speech")
    
    logger.info("✅ Speech services initialized (with cloud environment adaptations)")
    
except ImportError as e:
    logger.warning(f"⚠️ Speech libraries not available: {e}")
    logger.warning("Voice features will use browser fallback")
    speech_available = False
    recognizer = None
    microphone = None
    tts_engine = "browser_fallback"
    sr = None
except Exception as e:
    logger.warning(f"⚠️ Speech services initialization failed: {e}")
    speech_available = False
    recognizer = None
    microphone = None
    tts_engine = "browser_fallback"
    sr = None

# AI Assistant Classes (keeping your existing classes)
class StudentAIAssistant:
    def __init__(self):
        self.conversation_history = []
        self.student_context = {
            'student_name': '',
            'stress_level': 'medium',
            'academic_year': '',
            'subjects': [],
            'concerns': []
        }
        self.model = model

    def generate_ai_response(self, user_input):
        try:
            if not self.model:
                return "I'm here to help you with your studies and mental wellness! What's on your mind today?"
            
            self.conversation_history.append({"role": "user", "message": user_input})
            
            context = f"""
            You are Maya, a caring and supportive AI assistant specializing in student mental health and academic guidance.
            
            Student context: {self.student_context}
            Recent conversation: {self.conversation_history[-3:] if len(self.conversation_history) >= 3 else self.conversation_history}
            
            Current message: {user_input}
            
            Respond as Maya with empathy, practical advice, and encouragement. Keep responses helpful but concise (2-3 sentences).
            """
            
            response = self.model.generate_content(context)
            ai_response = response.text.strip()
            
            self.conversation_history.append({"role": "assistant", "message": ai_response})
            
            return ai_response
            
        except Exception as e:
            logger.error(f"Student AI response error: {e}")
            return "I'm here to support you through your academic journey. What challenges are you facing today?"

class ParentAssistant:
    def __init__(self):
        self.conversation_history = []
        self.parent_context = {
            'parent_name': '',
            'children_ages': [],
            'concerns': [],
            'family_size': 0
        }
        self.model = model

    def generate_ai_response(self, user_input):
        try:
            if not self.model:
                return "I'm here to help you with parenting challenges and family wellness! How can I support you today?"
            
            self.conversation_history.append({"role": "user", "message": user_input})
            
            context = f"""
            You are ParentBot, a supportive AI assistant specializing in parenting guidance and family management.
            
            Parent context: {self.parent_context}
            Recent conversation: {self.conversation_history[-3:] if len(self.conversation_history) >= 3 else self.conversation_history}
            
            Current message: {user_input}
            
            Respond with practical parenting advice, empathy, and encouragement. Keep responses helpful but concise (2-3 sentences).
            """
            
            response = self.model.generate_content(context)
            ai_response = response.text.strip()
            
            self.conversation_history.append({"role": "assistant", "message": ai_response})
            
            return ai_response
            
        except Exception as e:
            logger.error(f"Parent AI response error: {e}")
            return "I'm here to support you in your parenting journey. What family challenges can I help you with?"

class ProfessionalAssistant:
    def __init__(self):
        self.conversation_history = []
        self.professional_context = {
            'professional_name': '',
            'stress_level': 'medium',
            'work_environment': '',
            'challenges': []
        }
        self.model = model

    def generate_ai_response(self, user_input):
        try:
            if not self.model:
                return "I'm Luna, here to support your professional wellness! How can I help you today?"
            
            self.conversation_history.append({"role": "user", "message": user_input})
            
            context = f"""
            You are Luna, an AI workplace wellness companion for professionals.
            
            Professional context: {self.professional_context}
            Recent conversation: {self.conversation_history[-3:] if len(self.conversation_history) >= 3 else self.conversation_history}
            
            Current message: {user_input}
            
            Provide supportive, professional advice about workplace wellness, stress management, and work-life balance. Keep responses empathetic but concise (2-3 sentences).
            """
            
            response = self.model.generate_content(context)
            ai_response = response.text.strip()
            
            self.conversation_history.append({"role": "assistant", "message": ai_response})
            
            return ai_response
            
        except Exception as e:
            logger.error(f"Professional AI response error: {e}")
            return "I'm here to support your professional wellness. What workplace challenge can I help you with?"

class CodeGent:
    def __init__(self):
        self.conversation_history = []
        self.model = model

    def generate_ai_response(self, user_input, language="general"):
        try:
            if not self.model:
                return "I'm CodeGent, ready to help with programming and developer wellness! What can I assist you with?"
            
            self.conversation_history.append({"role": "user", "message": user_input})
            
            context = f"""
            You are CodeGent, an AI coding companion that combines programming expertise with mental wellness support.
            
            Programming language context: {language}
            Recent conversation: {self.conversation_history[-3:] if len(self.conversation_history) >= 3 else self.conversation_history}
            
            User's coding question: {user_input}
            
            Provide helpful programming assistance while being supportive about coding challenges.
            Include code examples when relevant and be encouraging about the learning process.
            Keep responses practical and include mental wellness tips for developers when appropriate (2-3 sentences).
            """
            
            response = self.model.generate_content(context)
            ai_response = response.text.strip()
            
            self.conversation_history.append({"role": "assistant", "message": ai_response})
            
            return ai_response
            
        except Exception as e:
            logger.error(f"CodeGent AI response error: {e}")
            return "I'm here to help with coding challenges and developer wellness! What programming question do you have?"

# Initialize AI assistants
student_assistant = StudentAIAssistant()
parent_assistant = ParentAssistant()
professional_assistant = ProfessionalAssistant()
codegent_assistant = CodeGent()

# Helper function for voice generation
def generate_voice_response(text, voice_type="general"):
    """Generate voice response with fallback options"""
    try:
        if tts_engine and tts_engine != "browser_fallback":
            # Server-side TTS
            voices = tts_engine.getProperty('voices')
            if voices and len(voices) > 0:
                for voice in voices:
                    if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                        tts_engine.setProperty('voice', voice.id)
                        break
                else:
                    tts_engine.setProperty('voice', voices[0].id)
            
            # Set voice properties based on type
            if voice_type == "student":
                tts_engine.setProperty('rate', 180)
            elif voice_type == "parent":
                tts_engine.setProperty('rate', 170)
            elif voice_type == "professional":
                tts_engine.setProperty('rate', 160)
            else:
                tts_engine.setProperty('rate', 170)
            
            tts_engine.setProperty('volume', 0.9)
            
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_filename = temp_file.name
            
            tts_engine.save_to_file(text, temp_filename)
            tts_engine.runAndWait()
            
            if os.path.exists(temp_filename):
                with open(temp_filename, 'rb') as audio_file:
                    audio_data = audio_file.read()
                    voice_response = base64.b64encode(audio_data).decode('utf-8')
                
                os.unlink(temp_filename)
                logger.info(f"Server TTS voice response generated for {voice_type}")
                return voice_response
            
        else:
            # Browser TTS fallback
            logger.info(f"Using browser TTS fallback for {voice_type}")
            return "use_browser_tts"
            
    except Exception as voice_error:
        logger.error(f"Voice generation error for {voice_type}: {voice_error}")
        return "use_browser_tts"
    
    return None

# Routes
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/talk-with-me.html')
def student_chat():
    return render_template('talk-with-me.html')

@app.route('/parent.html')
def parent_chat():
    return render_template('parent.html')

@app.route('/working-professional.html')
def professional_chat():
    return render_template('working-professional.html')

@app.route('/codegent.html')
def codegent_chat():
    return render_template('codegent.html')

@app.route('/zenmode.html')
def zen_mode():
    return render_template('zenmode.html')

# API Health Check
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'success': True,
        'timestamp': datetime.now().isoformat(),
        'service': 'FreeSpace Unified AI Mental Wellness Platform',
        'services': ['student', 'parent', 'professional', 'codegent'],
        'components': {
            'ai_model': model is not None,
            'speech_recognition': recognizer is not None,
            'text_to_speech': tts_engine is not None and tts_engine != "browser_fallback"
        }
    })

# =================== STUDENT ROUTES ===================
@app.route('/api/student/respond', methods=['POST'])
def respond_to_student():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        enable_voice = data.get('enable_voice', True)
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'No message provided'
            })
        
        ai_response = student_assistant.generate_ai_response(user_message)
        
        # Generate voice response
        voice_response = None
        if enable_voice:
            voice_response = generate_voice_response(ai_response, "student")
        
        return jsonify({
            'success': True,
            'response': ai_response,
            'voice_response': voice_response,
            'has_voice': voice_response is not None,
            'use_browser_tts': voice_response == "use_browser_tts",
            'conversation_count': len(student_assistant.conversation_history)
        })
        
    except Exception as e:
        logger.error(f"Student response generation error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate response',
            'response': "I'm Maya, here to support you through your academic journey! What's on your mind?"
        })

@app.route('/api/student/listen', methods=['POST'])
def listen_to_student():
    try:
        if not recognizer or not microphone:
            return jsonify({
                'success': False,
                'error': 'Voice recognition not available',
                'message': "Voice recognition is not available. Please type your message."
            })
        
        logger.info("Listening for student input...")
        
        with microphone as source:
            recognizer.adjust_for_ambient_noise(source, duration=1)
            
        with microphone as source:
            audio = recognizer.listen(source, timeout=10, phrase_time_limit=10)
        
        text = recognizer.recognize_google(audio)
        logger.info(f"Student said: {text}")
        
        return jsonify({
            'success': True,
            'message': text,
            'is_error': False
        })
        
    except Exception as e:
        logger.error(f"Student voice input error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to capture voice input',
            'message': "I'm having trouble hearing you right now. Could you try again or type your message?"
        })

@app.route('/api/student/speak', methods=['POST'])
def speak_student_text():
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            })
        
        voice_response = generate_voice_response(text, "student")
        
        return jsonify({
            'success': True,
            'voice_response': voice_response,
            'use_browser_tts': voice_response == "use_browser_tts"
        })
        
    except Exception as e:
        logger.error(f"Student speak error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to speak text'
        })

# =================== PARENT ROUTES ===================
@app.route('/api/parent/respond', methods=['POST'])
def respond_to_parent():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        enable_voice = data.get('enable_voice', True)
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'No message provided'
            })
        
        ai_response = parent_assistant.generate_ai_response(user_message)
        
        # Generate voice response
        voice_response = None
        if enable_voice:
            voice_response = generate_voice_response(ai_response, "parent")
        
        return jsonify({
            'success': True,
            'response': ai_response,
            'voice_response': voice_response,
            'has_voice': voice_response is not None,
            'use_browser_tts': voice_response == "use_browser_tts",
            'conversation_count': len(parent_assistant.conversation_history)
        })
        
    except Exception as e:
        logger.error(f"Parent response generation error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate response',
            'response': "I'm here to help you with parenting challenges and family wellness!"
        })

@app.route('/api/parent/listen', methods=['POST'])
def listen_to_parent():
    try:
        if not recognizer or not microphone:
            return jsonify({
                'success': False,
                'error': 'Voice recognition not available',
                'message': "Voice recognition is not available. Please type your message."
            })
        
        logger.info("Listening for parent input...")
        
        with microphone as source:
            recognizer.adjust_for_ambient_noise(source, duration=1)
            
        with microphone as source:
            audio = recognizer.listen(source, timeout=10, phrase_time_limit=10)
        
        text = recognizer.recognize_google(audio)
        logger.info(f"Parent said: {text}")
        
        return jsonify({
            'success': True,
            'message': text,
            'is_error': False
        })
        
    except Exception as e:
        logger.error(f"Parent voice input error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to capture voice input',
            'message': "I'm having trouble hearing you right now. Could you try again or type your message?"
        })

@app.route('/api/parent/speak', methods=['POST'])
def speak_parent_text():
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            })
        
        voice_response = generate_voice_response(text, "parent")
        
        return jsonify({
            'success': True,
            'voice_response': voice_response,
            'use_browser_tts': voice_response == "use_browser_tts"
        })
        
    except Exception as e:
        logger.error(f"Parent speak error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to speak text'
        })

# =================== PROFESSIONAL ROUTES ===================
@app.route('/api/professional/start-conversation', methods=['POST'])
def start_professional_conversation():
    try:
        data = request.get_json() or {}
        professional_name = data.get('name', 'Professional')
        stress_level = data.get('stress_level', 'high')
        
        professional_assistant.professional_context.update({
            'professional_name': professional_name,
            'stress_level': stress_level,
            'session_start': datetime.now().isoformat()
        })
        
        welcome_message = f"Hello {professional_name}! I'm Luna, your AI workplace wellness companion. I understand the pressures of professional life and I'm here to support you through workplace challenges. How are you feeling about work today?"
        
        return jsonify({
            'success': True,
            'message': welcome_message,
            'assistant_name': 'Luna',
            'context': professional_assistant.professional_context
        })
        
    except Exception as e:
        logger.error(f"Professional conversation start error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to start conversation',
            'message': "Hello! I'm Luna, your workplace wellness companion. How can I support you today?"
        })

@app.route('/api/professional/respond', methods=['POST'])
def respond_to_professional():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        enable_voice = data.get('enable_voice', True)
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'No message provided'
            })
        
        ai_response = professional_assistant.generate_ai_response(user_message)
        
        # Generate voice response
        voice_response = None
        if enable_voice:
            voice_response = generate_voice_response(ai_response, "professional")
        
        return jsonify({
            'success': True,
            'response': ai_response,
            'voice_response': voice_response,
            'has_voice': voice_response is not None,
            'use_browser_tts': voice_response == "use_browser_tts",
            'conversation_count': len(professional_assistant.conversation_history)
        })
        
    except Exception as e:
        logger.error(f"Professional response generation error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate response',
            'response': "I'm here to support your professional wellness. What workplace challenge can I help you with?"
        })

@app.route('/api/professional/listen', methods=['POST'])
def listen_to_professional():
    try:
        if not recognizer or not microphone:
            return jsonify({
                'success': False,
                'error': 'Voice recognition not available',
                'message': "Voice recognition is not available. Please type your message."
            })
        
        logger.info("Listening for professional input...")
        
        with microphone as source:
            recognizer.adjust_for_ambient_noise(source, duration=1)
            
        with microphone as source:
            audio = recognizer.listen(source, timeout=10, phrase_time_limit=10)
        
        text = recognizer.recognize_google(audio)
        logger.info(f"Professional said: {text}")
        
        return jsonify({
            'success': True,
            'message': text,
            'is_error': False
        })
        
    except Exception as e:
        logger.error(f"Professional voice input error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to capture voice input',
            'message': "I'm having trouble hearing you right now. Could you try again or type your message?"
        })

@app.route('/api/professional/speak', methods=['POST'])
def speak_professional_text():
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            })
        
        voice_response = generate_voice_response(text, "professional")
        
        return jsonify({
            'success': True,
            'voice_response': voice_response,
            'use_browser_tts': voice_response == "use_browser_tts"
        })
        
    except Exception as e:
        logger.error(f"Professional speak error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to speak text'
        })

# =================== CODEGENT ROUTES ===================
@app.route('/api/codegent/start', methods=['POST'])
def start_codegent():
    try:
        data = request.get_json() or {}
        user = data.get('user', {})
        username = user.get('name', 'Developer')
        
        welcome_message = f"Hello {username}! I'm CodeGent, your AI coding companion. I can help you with programming challenges, debug code, explain concepts, and provide mental wellness support during your coding journey. What can I help you with today?"
        
        return jsonify({
            'success': True,
            'message': welcome_message,
            'assistant_name': 'CodeGent'
        })
        
    except Exception as e:
        logger.error(f"CodeGent start error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to start CodeGent',
            'message': "Hello! I'm CodeGent, ready to help with your coding needs!"
        })

@app.route('/api/codegent/respond', methods=['POST'])
def codegent_respond():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        language = data.get('language', 'general')
        enable_voice = data.get('enable_voice', True)
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'No message provided'
            })
        
        ai_response = codegent_assistant.generate_ai_response(user_message, language)
        
        # Generate voice response
        voice_response = None
        if enable_voice:
            voice_response = generate_voice_response(ai_response, "codegent")
        
        return jsonify({
            'success': True,
            'response': ai_response,
            'voice_response': voice_response,
            'has_voice': voice_response is not None,
            'use_browser_tts': voice_response == "use_browser_tts",
            'language': language,
            'conversation_count': len(codegent_assistant.conversation_history)
        })
        
    except Exception as e:
        logger.error(f"CodeGent response error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate response',
            'response': "I'm here to help with coding challenges and developer wellness!"
        })

@app.route('/api/codegent/listen', methods=['POST'])
def listen_to_codegent():
    try:
        if not recognizer or not microphone:
            return jsonify({
                'success': False,
                'error': 'Voice recognition not available',
                'message': "Voice recognition is not available. Please type your message."
            })
        
        logger.info("Listening for CodeGent input...")
        
        with microphone as source:
            recognizer.adjust_for_ambient_noise(source, duration=1)
            
        with microphone as source:
            audio = recognizer.listen(source, timeout=10, phrase_time_limit=10)
        
        text = recognizer.recognize_google(audio)
        logger.info(f"CodeGent user said: {text}")
        
        return jsonify({
            'success': True,
            'message': text,
            'is_error': False
        })
        
    except Exception as e:
        logger.error(f"CodeGent voice input error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to capture voice input',
            'message': "I'm having trouble hearing you. Could you try again or type your message?"
        })

@app.route('/api/codegent/speak', methods=['POST'])
def speak_codegent_text():
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            })
        
        voice_response = generate_voice_response(text, "codegent")
        
        return jsonify({
            'success': True,
            'voice_response': voice_response,
            'use_browser_tts': voice_response == "use_browser_tts"
        })
        
    except Exception as e:
        logger.error(f"CodeGent speak error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to speak text'
        })

# Static file serving
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

# Initialize and run the app
if __name__ == '__main__':
    logger.info("🚀 FreeSpace Unified AI Mental Wellness Platform Starting...")
    
    if model:
        logger.info("✅ Gemini AI initialized for all services")
    else:
        logger.warning("⚠️ Gemini AI not available - using fallback responses")
    
    if tts_engine == "browser_fallback":
        logger.warning("⚠️  Text-to-speech using browser fallback")
    elif tts_engine:
        logger.info("✅ Text-to-speech initialized")
    else:
        logger.warning("⚠️  Text-to-speech not available")
    
    if recognizer:
        logger.info("✅ Speech recognition initialized")
    else:
        logger.warning("⚠️  Speech recognition not available")
    
    logger.info("💙 Maya (Student Support) ready")
    logger.info("🏠 ParentBot (Parent Assistant) ready")
    logger.info("🌙 Luna (Professional Wellness) ready")
    logger.info("💻 CodeGent (Coding Assistant) ready")
    logger.info("🧘 Zen Mode available")
    
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"🌐 Server running on port {port}")
    
    app.run(host='0.0.0.0', port=port, debug=False)