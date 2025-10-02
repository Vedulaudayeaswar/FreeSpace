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
import base64
from datetime import datetime
import logging
import time

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
    GEMINI_API_KEY = "dummy_key_for_testing"  

try:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.0-flash')  
    logger.info("Gemini AI configured successfully")
except Exception as e:
    logger.error(f"Failed to configure Gemini AI: {e}")
    model = None

# Initialize speech recognition and text-to-speech
try:
    recognizer = sr.Recognizer()
    microphone = sr.Microphone()
    tts_engine = pyttsx3.init()
    
    # Configure TTS voice to sound more professional
    voices = tts_engine.getProperty('voices')
    if voices:
        for voice in voices:
            if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                tts_engine.setProperty('voice', voice.id)
                break
    
    tts_engine.setProperty('rate', 160)  # Professional speaking rate
    tts_engine.setProperty('volume', 0.9)
    logger.info("Speech services initialized successfully")
    
except Exception as e:
    logger.error(f"Failed to initialize speech services: {e}")
    recognizer = None
    microphone = None
    tts_engine = None

class LunaProfessionalAssistant:
    def __init__(self):
        self.conversation_history = []
        self.professional_context = {
            'mood': 'stressed',
            'work_problems': [],
            'stress_level': 'high',
            'work_environment': 'office',
            'role_level': 'mid_level',
            'session_start': datetime.now().isoformat(),
            'professional_name': 'Professional'
        }
        self.is_listening = False
        
    def get_professional_prompt(self, user_message, context):
        """Generate a context-aware prompt for Luna"""
        base_prompt = f"""
        You are Luna, a professional AI workplace wellness companion specializing in supporting working professionals.
        You understand corporate culture, work pressures, and career challenges.
        
        Working Professional Context:
        - Professional's name: {context.get('professional_name', 'Professional')}
        - Current stress level: {context.get('stress_level', 'unknown')}
        - Work environment: {context.get('work_environment', 'unknown')}
        - Work problems mentioned: {', '.join(context.get('work_problems', []))}
        - Current mood: {context.get('mood', 'unknown')}
        
        Guidelines for Luna's response:
        1. Show deep understanding of workplace challenges and professional pressures
        2. Use professional but empathetic language - speak as a trusted workplace wellness expert
        3. Acknowledge work stress while maintaining focus on professional growth
        4. Offer practical, evidence-based workplace wellness strategies
        5. Ask about specific professional situations (deadlines, workload, team dynamics, career goals)
        6. Share relevant workplace mental health techniques and coping strategies
        7. Keep responses concise but comprehensive (2-4 sentences)
        8. For severe burnout signs, professionally suggest seeking HR support or counseling
        9. Remember you're their professional wellness companion, focused on workplace success and wellbeing
        10. Maintain professional boundaries while being supportive
        
        Previous conversation context:
        {self.get_conversation_summary()}
        
        Professional just said: "{user_message}"
        
        Respond as Luna, their professional wellness companion:
        """
        return base_prompt
    
    def get_conversation_summary(self):
        """Get a summary of recent conversation"""
        if not self.conversation_history:
            return "This is the beginning of our professional wellness session."
        
        recent_messages = self.conversation_history[-3:]  # Last 3 exchanges
        summary = ""
        for msg in recent_messages:
            summary += f"Professional: {msg.get('user', '')}\nLuna: {msg.get('assistant', '')}\n"
        return summary
    
    def process_voice_input(self):
        """Capture and process voice input with better error handling"""
        if not recognizer or not microphone:
            return "Voice recognition is not available. Please check your microphone setup."
        
        try:
            self.is_listening = True
            logger.info("Luna is listening for professional input...")
            
            # Adjust for ambient noise with timeout
            with microphone as source:
                recognizer.adjust_for_ambient_noise(source, duration=1)
                
            # Listen for audio input with timeout
            with microphone as source:
                logger.info("Listening now...")
                audio = recognizer.listen(source, timeout=10, phrase_time_limit=10)
            
            logger.info("Processing speech...")
            # Convert speech to text
            text = recognizer.recognize_google(audio)
            logger.info(f"Professional said: {text}")
            
            self.is_listening = False
            return text
            
        except sr.WaitTimeoutError:
            self.is_listening = False
            logger.warning("Speech timeout occurred")
            return "I didn't hear anything. Would you like to try speaking again?"
        except sr.UnknownValueError:
            self.is_listening = False
            logger.warning("Could not understand speech")
            return "I couldn't quite catch that. Could you please speak a bit clearer?"
        except sr.RequestError as e:
            self.is_listening = False
            logger.error(f"Speech recognition service error: {e}")
            return "I'm having trouble with speech recognition. Please try again."
        except Exception as e:
            self.is_listening = False
            logger.error(f"Unexpected voice input error: {e}")
            return "There was an unexpected issue with voice input. Please try again."
    
    def generate_ai_response(self, user_message):
        """Generate AI response using Gemini with better error handling"""
        if not model:
            return "I'm experiencing some technical difficulties with my AI processing, but I'm still here to support you. What specific workplace challenge are you facing today?"
        
        try:
            # Update context based on user message
            self.update_professional_context(user_message)
            
            # Generate prompt
            prompt = self.get_professional_prompt(user_message, self.professional_context)
            
            # Get AI response with retry logic
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    response = model.generate_content(prompt)
                    ai_message = response.text.strip()
                    break
                except Exception as e:
                    logger.warning(f"AI generation attempt {attempt + 1} failed: {e}")
                    if attempt == max_retries - 1:
                        raise e
                    time.sleep(1)
            
            # Store conversation
            self.conversation_history.append({
                'user': user_message,
                'assistant': ai_message,
                'timestamp': datetime.now().isoformat()
            })
            
            logger.info(f"Luna response generated: {ai_message[:100]}...")
            return ai_message
            
        except Exception as e:
            logger.error(f"AI generation error: {e}")
            return f"I'm having some technical difficulties, but I want you to know I'm here to support your professional wellness journey. Could you tell me more about what's challenging you at work today?"
    
    def speak_response(self, text):
        """Convert text to speech using pyttsx3 - like the student version"""
        try:
            if not tts_engine:
                return False
                
            # Clear any pending speech
            tts_engine.stop()
            
            # Configure voice settings
            voices = tts_engine.getProperty('voices')
            if voices:
                for voice in voices:
                    if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                        tts_engine.setProperty('voice', voice.id)
                        break
            
            tts_engine.setProperty('rate', 160)  # Professional speaking rate
            tts_engine.setProperty('volume', 0.9)
            
            # Use say instead of save_to_file to avoid run loop issues
            tts_engine.say(text)
            tts_engine.runAndWait()
            
            logger.info("Text-to-speech completed")
            return True
            
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return False
    
    def update_professional_context(self, user_message):
        """Update professional context based on message analysis"""
        message_lower = user_message.lower()
        
        # Analyze stress level indicators
        high_stress_indicators = ["overwhelmed", "burned out", "exhausted", "can't cope", "breaking point"]
        moderate_stress_indicators = ["stressed", "pressure", "busy", "tired", "difficult"]
        low_stress_indicators = ["better", "manageable", "okay", "good", "fine", "relaxed"]
        
        if any(indicator in message_lower for indicator in high_stress_indicators):
            self.professional_context['stress_level'] = 'very high'
        elif any(indicator in message_lower for indicator in moderate_stress_indicators):
            self.professional_context['stress_level'] = 'high'
        elif any(indicator in message_lower for indicator in low_stress_indicators):
            self.professional_context['stress_level'] = 'moderate'
        
        # Detect workplace problems
        problem_keywords = {
            'deadline': 'tight deadlines',
            'overtime': 'excessive work hours', 
            'workload': 'heavy workload',
            'boss': 'management issues',
            'manager': 'management issues',
            'meeting': 'meeting overload',
            'burnout': 'burnout symptoms',
            'promotion': 'career advancement pressure',
            'colleague': 'workplace relationships',
            'team': 'team dynamics',
            'project': 'project pressure',
            'performance': 'performance anxiety',
            'layoff': 'job security concerns',
            'remote': 'remote work challenges',
            'commute': 'work-life balance issues',
            'client': 'client relationship stress',
            'presentation': 'presentation anxiety'
        }
        
        for keyword, problem in problem_keywords.items():
            if keyword in message_lower and problem not in self.professional_context['work_problems']:
                self.professional_context['work_problems'].append(problem)
        
        # Update mood based on positive/negative sentiment
        positive_words = ['better', 'improved', 'relaxed', 'confident', 'motivated', 'accomplished']
        negative_words = ['frustrated', 'angry', 'sad', 'worried', 'anxious', 'depressed']
        
        if any(word in message_lower for word in positive_words):
            self.professional_context['mood'] = 'improving'
        elif any(word in message_lower for word in negative_words):
            self.professional_context['mood'] = 'struggling'

# Global Luna assistant instance
luna_assistant = LunaProfessionalAssistant()

@app.route('/')
def home():
    return "Luna Professional Wellness Assistant Backend is Running! 🌙"

@app.route('/api/workplace-support', methods=['POST'])
def start_workplace_session():
    """Initialize a new professional wellness session with Luna"""
    global luna_assistant
    luna_assistant = LunaProfessionalAssistant()
    
    # Get professional data from request
    data = request.get_json() or {}
    stress_level = data.get('stress_level', 'high')
    professional_name = data.get('name', 'Professional')
    work_environment = data.get('work_environment', 'office')
    
    # Update Luna's context
    luna_assistant.professional_context.update({
        'stress_level': stress_level,
        'professional_name': professional_name,
        'work_environment': work_environment,
        'mood': 'stressed' if stress_level in ['high', 'very high'] else 'manageable'
    })
    
    # Generate personalized welcome message
    welcome_message = f"Hello! I'm Luna, your AI workplace wellness companion. I specialize in supporting working professionals like yourself through workplace challenges and stress. How can I help you today?"
    
    if model:
        welcome_prompt = f"""
        You are Luna, a professional AI workplace wellness companion. A working professional named {professional_name} 
        just started a session, showing stress level: {stress_level} in a {work_environment} environment.
        
        Create a professional, welcoming greeting that:
        1. Introduces yourself as Luna, their workplace wellness AI companion
        2. Acknowledges that work can be challenging and you understand professional pressures
        3. Shows you're specifically designed to help working professionals
        4. Asks about their current workplace situation in a professional manner
        5. Keep it warm but professional (2-3 sentences)
        
        Respond as Luna:
        """
        
        try:
            response = model.generate_content(welcome_prompt)
            welcome_message = response.text.strip()
        except Exception as e:
            logger.error(f"Welcome message generation error: {e}")
    
    return jsonify({
        'success': True,
        'message': welcome_message,
        'session_id': luna_assistant.professional_context['session_start'],
        'professional_context': luna_assistant.professional_context
    })

@app.route('/api/listen', methods=['POST'])
def listen_to_professional():
    """Capture professional's voice input - like student version"""
    try:
        # Capture voice input
        user_message = luna_assistant.process_voice_input()
        
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
def respond_to_professional():
    """Generate Luna response to professional message - like student version"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        enable_voice = data.get('enable_voice', True)
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'No message provided'
            })
        
        # Generate Luna's AI response
        ai_response = luna_assistant.generate_ai_response(user_message)
        
        # Generate voice response if requested - using base64 like student version
        voice_response = None
        if enable_voice:
            try:
                # Create audio response using pyttsx3
                import tempfile
                import base64
                
                # Initialize TTS engine
                engine = pyttsx3.init()
                
                # Configure voice settings for Luna
                voices = engine.getProperty('voices')
                if voices:
                    # Try to find a female voice for Luna
                    for voice in voices:
                        if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                            engine.setProperty('voice', voice.id)
                            break
                
                # Set speech rate and volume - professional settings
                engine.setProperty('rate', 160)  # Professional pace
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
            'conversation_count': len(luna_assistant.conversation_history),
            'professional_context': luna_assistant.professional_context,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Response generation error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate response',
            'response': "I'm experiencing some technical difficulties, but I'm still here to support your professional wellness. What workplace challenge can I help you with today?"
        })

@app.route('/api/speak', methods=['POST'])
def speak_text():
    """Convert text to speech - like student version"""
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
            luna_assistant.speak_response(text)
        
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

@app.route('/api/professional-input', methods=['POST'])
def capture_professional_voice():
    """Capture professional's voice input through Luna"""
    try:
        # Capture voice input
        user_message = luna_assistant.process_voice_input()
        
        return jsonify({
            'success': True,
            'message': user_message,
            'is_error': user_message.startswith("I didn't hear") or user_message.startswith("I couldn't understand")
        })
        
    except Exception as e:
        logger.error(f"Voice capture error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to capture voice input',
            'message': "I'm having trouble with voice input right now. Could you please type your message instead?",
            'is_error': True
        })

@app.route('/api/wellness-response', methods=['POST'])
def generate_luna_response():
    """Generate Luna's wellness response to professional"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        enable_voice = data.get('enable_voice', True)
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'No message provided'
            })
        
        # Generate Luna's AI response
        ai_response = luna_assistant.generate_ai_response(user_message)
        
        # Generate voice response if requested
        voice_response = None
        if enable_voice:
            try:
                # Create audio response using pyttsx3
                import tempfile
                import base64
                
                # Initialize TTS engine
                engine = pyttsx3.init()
                
                # Configure voice settings for Luna
                voices = engine.getProperty('voices')
                if voices:
                    # Try to find a female voice for Luna
                    for voice in voices:
                        if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                            engine.setProperty('voice', voice.id)
                            break
                
                # Set speech rate and volume - professional settings
                engine.setProperty('rate', 160)  # Professional pace
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
            'conversation_count': len(luna_assistant.conversation_history),
            'professional_context': luna_assistant.professional_context,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Response generation error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate response',
            'response': "I'm experiencing some technical difficulties, but I'm still here to support your professional wellness. What workplace challenge can I help you with today?"
        })

@app.route('/api/professional-status', methods=['GET'])
def get_professional_status():
    """Get current professional wellness status"""
    try:
        return jsonify({
            'success': True,
            'professional_context': luna_assistant.professional_context,
            'conversation_count': len(luna_assistant.conversation_history),
            'session_duration': (datetime.now() - datetime.fromisoformat(luna_assistant.professional_context['session_start'])).total_seconds(),
            'is_listening': luna_assistant.is_listening
        })
    except Exception as e:
        logger.error(f"Status retrieval error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get status'
        })

@app.route('/api/conversation-history', methods=['GET'])
def get_conversation_history():
    """Get current conversation history with Luna"""
    return jsonify({
        'success': True,
        'history': luna_assistant.conversation_history,
        'context': luna_assistant.professional_context,
        'total_messages': len(luna_assistant.conversation_history),
        'session_start': luna_assistant.professional_context['session_start']
    })

@app.route('/api/reset-session', methods=['POST'])
def reset_luna_session():
    """Reset Luna session for new professional"""
    global luna_assistant
    luna_assistant = LunaProfessionalAssistant()
    
    return jsonify({
        'success': True,
        'message': 'Luna session reset successfully',
        'new_session_id': luna_assistant.professional_context['session_start']
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'service': 'Luna Professional Wellness Assistant',
        'status': 'healthy',
        'components': {
            'ai_model': model is not None,
            'speech_recognition': recognizer is not None,
            'text_to_speech': tts_engine is not None
        },
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    logger.info("Luna Professional Wellness Assistant Backend Starting...")
    
    # Test services on startup
    if not model:
        logger.warning("⚠️  Gemini AI not available - using fallback responses")
    else:
        logger.info("✅ Gemini AI initialized")
        
    if not tts_engine:
        logger.warning("⚠️  Text-to-speech not available")
    else:
        logger.info("✅ Text-to-speech initialized")
        
    if not recognizer:
        logger.warning("⚠️  Speech recognition not available")
    else:
        logger.info("✅ Speech recognition initialized")
    
    logger.info("🌙 Luna is ready to support working professionals!")
    app.run(debug=True, host='0.0.0.0', port=5000)