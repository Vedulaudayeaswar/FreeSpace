from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory
from flask_cors import CORS
import os
import google.generativeai as genai
# REMOVE THESE TWO LINES:
# import speech_recognition as sr
# import pyttsx3
import threading
import json
import tempfile
import wave
import base64
from datetime import datetime, timedelta
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='.', template_folder='.')
CORS(app, origins=["*"])

# Load environment variables
from dotenv import load_dotenv

# Load .env file - check multiple locations for flexibility
env_locations = [
    '.env',                    # Root directory (for production/Vercel)
    './backend/.env',          # Backend folder (for development)
    'backend/.env',           # Alternative backend path
]

env_loaded = False
for env_path in env_locations:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        logger.info(f"Loaded environment variables from: {env_path}")
        env_loaded = True
        break

if not env_loaded:
    logger.warning("No .env file found, using system environment variables")

# Configure Gemini AI
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY not found in environment variables")
    logger.error("Please check your .env file contains: GEMINI_API_KEY=your_api_key_here")
    GEMINI_API_KEY = "dummy_key_for_testing"

try:
    if GEMINI_API_KEY != "dummy_key_for_testing":
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')
        logger.info("Gemini AI configured successfully for all services")
    else:
        model = None
        logger.warning("Using dummy API key - AI features will not work")
except Exception as e:
    logger.error(f"Failed to configure Gemini AI: {e}")
    model = None

# Initialize speech services with fallback for cloud deployment
recognizer = None
microphone = None
tts_engine = None
speech_available = False

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
    
    # Initialize TTS
    try:
        tts_engine = pyttsx3.init()
        
        # Configure TTS voice
        voices = tts_engine.getProperty('voices')
        if voices:
            for voice in voices:
                if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                    tts_engine.setProperty('voice', voice.id)
                    break
        
        tts_engine.setProperty('rate', 170)
        tts_engine.setProperty('volume', 0.9)
        logger.info("✅ Text-to-speech initialized successfully")
        
    except Exception as tts_error:
        logger.warning(f"⚠️ Text-to-speech not available (cloud environment): {tts_error}")
        tts_engine = None
    
    logger.info("✅ Speech services initialized (with cloud environment adaptations)")
    
except ImportError as e:
    logger.warning(f"⚠️ Speech libraries not available: {e}")
    logger.warning("Voice features will be disabled, but all chat features work perfectly")
    speech_available = False
except Exception as e:
    logger.warning(f"⚠️ Speech services initialization failed: {e}")
    logger.warning("Voice features will be disabled, but all chat features work perfectly")
    speech_available = False

# =================================================================================
# STUDENT ASSISTANT (MAYA) CLASS
# =================================================================================

class VoiceAssistant:
    def __init__(self):
        self.conversation_history = []
        self.student_context = {
            'mood': 'sad',
            'problems': [],
            'session_start': datetime.now().isoformat()
        }
        
    def get_motivational_prompt(self, user_message, context):
        """Generate a context-aware prompt for Maya"""
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
        
        recent_messages = self.conversation_history[-4:]
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
            
            with microphone as source:
                recognizer.adjust_for_ambient_noise(source, duration=1)
                
            with microphone as source:
                audio = recognizer.listen(source, timeout=10, phrase_time_limit=10)
            
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
            self.update_context(user_message)
            prompt = self.get_motivational_prompt(user_message, self.student_context)
            response = model.generate_content(prompt)
            ai_message = response.text.strip()
            
            self.conversation_history.append({
                'user': user_message,
                'assistant': ai_message,
                'timestamp': datetime.now().isoformat()
            })
            
            logger.info(f"Maya response: {ai_message[:100]}...")
            return ai_message
            
        except Exception as e:
            logger.error(f"AI generation error: {e}")
            return "I'm having trouble thinking right now. But I'm here for you. Could you tell me more about what's bothering you?"
    
    def update_context(self, user_message):
        """Update student context based on their message"""
        message_lower = user_message.lower()
        
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
        
        positive_words = ['better', 'good', 'happy', 'okay', 'fine', 'thanks']
        if any(word in message_lower for word in positive_words):
            self.student_context['mood'] = 'improving'

# =================================================================================
# PARENT ASSISTANT (PARENTBOT) CLASS  
# =================================================================================

class ParentAssistant:
    def __init__(self):
        self.conversation_history = []
        self.parent_context = {
            'current_task': None,
            'todo_list': [],
            'meal_preferences': [],
            'kids_ages': [],
            'session_start': datetime.now().isoformat()
        }
        self.task_categories = {
            'meal_planner': 'meal planning and cooking assistance',
            'todo_list': 'personalized todo list creation',
            'parenting_tips': 'parenting guidance from expert books',
            'bedtime_stories': 'creative bedtime stories for kids',
            'money_management': 'financial planning and money psychology'
        }
    
    def get_specialized_prompt(self, user_message, context):
        """Generate specialized prompts based on task type"""
        task_type = self.detect_task_type(user_message)
        
        base_info = f"""
        You are ParentBot, a helpful AI assistant specifically designed for busy parents in India. 
        You have expertise in meal planning, parenting, child psychology, financial management, and family organization.
        
        Parent Context:
        - Current task focus: {context.get('current_task', 'general assistance')}
        - Todo items: {len(context.get('todo_list', []))} items
        - Session started: {context.get('session_start')}
        
        Guidelines:
        1. Be warm, supportive, and understanding of parenting challenges
        2. Provide practical, actionable advice suitable for Indian families
        3. Use Indian Standard Time (IST) for all time-related suggestions
        4. Consider Indian dietary preferences and available ingredients
        5. Be concise but comprehensive in your responses
        6. Ask follow-up questions when needed for better assistance
        """
        
        if task_type == 'meal_planner':
            return base_info + f"""
            MEAL PLANNING EXPERT MODE:
            - Provide detailed ingredient lists with quantities
            - Include prep time, cooking time, and total time
            - Suggest Indian breakfast, lunch, dinner options
            - Consider vegetarian/non-vegetarian preferences
            - Include nutritional benefits when relevant
            - Suggest seasonal and locally available ingredients
            
            User query: "{user_message}"
            
            Provide detailed meal planning assistance:
            """
            
        elif task_type == 'todo_list':
            return base_info + f"""
            TODO LIST EXPERT MODE:
            You MUST create an actual checklist-style todo list, not explanations or questions.
            
            ALWAYS format your response as a proper checklist using this exact format:
            ☐ Task 1 (Time: X:XX AM/PM IST)
            ☐ Task 2 (Time: X:XX AM/PM IST)
            ☐ Task 3 (Time: X:XX AM/PM IST)
            
            Rules:
            - Use ☐ symbol for unchecked items
            - Include specific IST times for each task
            - Make tasks actionable and specific
            - Keep tasks realistic for a parent
            - Don't ask questions - just create the list
            - If request is vague, create a general daily routine checklist
            
            User request: "{user_message}"
            
            Create a checklist-format todo list NOW:
            """
            
        elif task_type == 'parenting_tips':
            return base_info + f"""
            PARENTING EXPERT MODE:
            Draw insights from renowned parenting books like:
            - "The 7 Habits of Highly Effective People" by Stephen Covey
            - "How to Win Friends and Influence People" by Dale Carnegie
            - "Parenting with Love and Logic" by Foster Cline
            - "The Power of Positive Parenting" by Glenn Latham
            - Indian parenting wisdom and cultural values
            
            User question: "{user_message}"
            
            Provide evidence-based parenting guidance:
            """
            
        elif task_type == 'bedtime_stories':
            return base_info + f"""
            STORYTELLER MODE:
            - Create engaging, age-appropriate bedtime stories
            - Include moral lessons and positive values
            - Make stories interactive and imaginative
            - Consider Indian cultural elements when appropriate
            - Keep stories calming and suitable for bedtime
            
            Story request: "{user_message}"
            
            Create a wonderful bedtime story:
            """
            
        elif task_type == 'money_management':
            return base_info + f"""
            FINANCIAL ADVISOR MODE:
            Draw insights from financial wisdom books like:
            - "The Psychology of Money" by Morgan Housel
            - "Rich Dad Poor Dad" by Robert Kiyosaki
            - "The Intelligent Investor" by Benjamin Graham
            - Indian financial planning and investment strategies
            - Family budgeting and expense management
            
            Financial query: "{user_message}"
            
            Provide practical financial guidance for families:
            """
        
        else:
            return base_info + f"""
            Parent just said: "{user_message}"
            
            Provide helpful parenting assistance:
            """
    
    def detect_task_type(self, message):
        """Detect what type of assistance the parent needs"""
        message_lower = message.lower()
        
        todo_keywords = ['todo', 'to do', 'task', 'schedule', 'plan my', 'organize', 'checklist', 'do today', 'practice', 'study', 'learn', 'algorithm', 'data structure']
        meal_keywords = ['cook', 'recipe', 'meal plan', 'food', 'breakfast', 'lunch', 'dinner', 'ingredients', 'prepare food', 'cooking']
        
        if any(word in message_lower for word in ['story', 'bedtime', 'tale', 'sleep', 'night', 'tell me a story', 'bedtime story']):
            return 'bedtime_stories'
        elif any(word in message_lower for word in todo_keywords) and not any(word in message_lower for word in ['meal plan', 'cooking', 'recipe']):
            return 'todo_list'
        elif any(word in message_lower for word in meal_keywords):
            return 'meal_planner'
        elif any(word in message_lower for word in ['parent', 'child', 'kid', 'behavior', 'discipline', 'development']):
            return 'parenting_tips'
        elif any(word in message_lower for word in ['money', 'budget', 'save', 'invest', 'financial', 'expense']):
            return 'money_management'
        else:
            return 'general'
    
    def generate_ai_response(self, user_message):
        """Generate AI response using Gemini"""
        if not model:
            return "I'm having some technical difficulties, but I'm here to help you with parenting tasks. What do you need assistance with?"
        
        try:
            self.update_context(user_message)
            prompt = self.get_specialized_prompt(user_message, self.parent_context)
            response = model.generate_content(prompt)
            ai_message = response.text.strip()
            
            self.conversation_history.append({
                'user': user_message,
                'assistant': ai_message,
                'timestamp': datetime.now().isoformat(),
                'task_type': self.detect_task_type(user_message)
            })
            
            logger.info(f"ParentBot response generated: {ai_message[:100]}...")
            return ai_message
            
        except Exception as e:
            logger.error(f"AI generation error: {e}")
            return "I'm having trouble processing that right now. Could you please try asking again? I'm here to help with meal planning, todo lists, parenting tips, bedtime stories, or money management."
    
    def update_context(self, user_message):
        """Update parent context based on their message"""
        task_type = self.detect_task_type(user_message)
        self.parent_context['current_task'] = task_type
        
        if task_type == 'meal_planner':
            if any(word in user_message.lower() for word in ['veg', 'vegetarian']):
                if 'vegetarian' not in self.parent_context['meal_preferences']:
                    self.parent_context['meal_preferences'].append('vegetarian')
            elif any(word in user_message.lower() for word in ['non-veg', 'chicken', 'mutton', 'fish']):
                if 'non-vegetarian' not in self.parent_context['meal_preferences']:
                    self.parent_context['meal_preferences'].append('non-vegetarian')

# =================================================================================
# WORKING PROFESSIONAL ASSISTANT (LUNA) CLASS
# =================================================================================

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
        
        recent_messages = self.conversation_history[-3:]
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
            
            with microphone as source:
                recognizer.adjust_for_ambient_noise(source, duration=1)
                
            with microphone as source:
                logger.info("Listening now...")
                audio = recognizer.listen(source, timeout=10, phrase_time_limit=10)
            
            logger.info("Processing speech...")
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
            self.update_professional_context(user_message)
            prompt = self.get_professional_prompt(user_message, self.professional_context)
            
            response = model.generate_content(prompt)
            ai_message = response.text.strip()
            
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
    
    def update_professional_context(self, user_message):
        """Update professional context based on message analysis"""
        message_lower = user_message.lower()
        
        high_stress_indicators = ["overwhelmed", "burned out", "exhausted", "can't cope", "breaking point"]
        moderate_stress_indicators = ["stressed", "pressure", "busy", "tired", "difficult"]
        low_stress_indicators = ["better", "manageable", "okay", "good", "fine", "relaxed"]
        
        if any(indicator in message_lower for indicator in high_stress_indicators):
            self.professional_context['stress_level'] = 'very high'
        elif any(indicator in message_lower for indicator in moderate_stress_indicators):
            self.professional_context['stress_level'] = 'high'
        elif any(indicator in message_lower for indicator in low_stress_indicators):
            self.professional_context['stress_level'] = 'moderate'
        
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
        
        positive_words = ['better', 'improved', 'relaxed', 'confident', 'motivated', 'accomplished']
        negative_words = ['frustrated', 'angry', 'sad', 'worried', 'anxious', 'depressed']
        
        if any(word in message_lower for word in positive_words):
            self.professional_context['mood'] = 'improving'
        elif any(word in message_lower for word in negative_words):
            self.professional_context['mood'] = 'struggling'

# =================================================================================
# CODEGENT ASSISTANT CLASS
# =================================================================================

class CodeGentAssistant:
    def __init__(self):
        self.conversation_history = []
        self.supported_languages = {
            'python': {
                'name': 'Python',
                'extensions': ['.py'],
                'examples': [
                    'Hello World program',
                    'List comprehension examples',
                    'Web scraping with requests',
                    'Data analysis with pandas'
                ]
            },
            'java': {
                'name': 'Java',
                'extensions': ['.java'],
                'examples': [
                    'Hello World program',
                    'Object-oriented programming',
                    'ArrayList operations',
                    'Exception handling'
                ]
            },
            'cpp': {
                'name': 'C++',
                'extensions': ['.cpp', '.cc', '.cxx'],
                'examples': [
                    'Hello World program',
                    'STL containers usage',
                    'Template programming',
                    'Memory management'
                ]
            },
            'go': {
                'name': 'Go',
                'extensions': ['.go'],
                'examples': [
                    'Hello World program',
                    'Goroutines and channels',
                    'HTTP server creation',
                    'JSON handling'
                ]
            }
        }
        
    def get_codegent_prompt(self, user_message, language, conversation_history):
        """Generate a specialized prompt for CodeGent"""
        
        # Get language info
        lang_info = self.supported_languages.get(language, {})
        lang_name = lang_info.get('name', language.upper())
        
        # Build conversation context
        context = ""
        if conversation_history:
            recent_messages = conversation_history[-3:]  # Last 3 exchanges
            for msg in recent_messages:
                if msg.get('user'):
                    context += f"User: {msg['user']}\n"
                if msg.get('assistant'):
                    context += f"CodeGent: {msg['assistant']}\n"
        
        base_prompt = f"""
        You are CodeGent, a highly skilled AI coding assistant specializing in {lang_name} programming. 
        You are the user's personal coding agent, here to help with any programming challenge.
        
        Your expertise includes:
        - Writing complete, functional code solutions
        - Debugging and fixing code errors
        - Code optimization and best practices
        - Explaining complex programming concepts simply
        - Algorithm design and data structures
        - Code reviews and improvements
        - Unit testing and test-driven development
        - Performance optimization
        - Modern {lang_name} features and libraries
        
        Current programming language: {lang_name}
        
        Previous conversation context:
        {context}
        
        Guidelines for your response:
        1. Always provide complete, working code when requested
        2. Include clear comments in your code
        3. Explain your solution step by step
        4. Suggest best practices and optimizations
        5. If the code has potential issues, mention them
        6. Provide multiple approaches when applicable
        7. Include error handling where appropriate
        8. Keep explanations clear and beginner-friendly
        9. Use proper {lang_name} syntax and conventions
        10. If asked for debugging, identify the issue and provide the fix
        
        User's request: "{user_message}"
        
        Provide a comprehensive {lang_name} programming solution:
        """
        return base_prompt
    
    def extract_code_from_response(self, response_text):
        """Extract code blocks from the AI response"""
        import re
        
        # Look for code blocks with language specification
        code_pattern = r'```(?:python|java|cpp|c\+\+|go|javascript|js)?\s*\n(.*?)\n```'
        code_matches = re.findall(code_pattern, response_text, re.DOTALL)
        
        if code_matches:
            return code_matches[0].strip()
        
        # Look for code blocks without language specification
        simple_code_pattern = r'```\s*\n(.*?)\n```'
        simple_matches = re.findall(simple_code_pattern, response_text, re.DOTALL)
        
        if simple_matches:
            return simple_matches[0].strip()
        
        # Look for inline code with common programming indicators
        if any(keyword in response_text.lower() for keyword in ['def ', 'class ', 'function', 'public class', '#include', 'package main']):
            lines = response_text.split('\n')
            code_lines = []
            in_code_block = False
            
            for line in lines:
                if any(keyword in line for keyword in ['def ', 'class ', 'function', 'public class', '#include', 'package main', 'import ', 'from ']):
                    in_code_block = True
                    code_lines.append(line)
                elif in_code_block and (line.startswith('    ') or line.startswith('\t') or line.strip() == ''):
                    code_lines.append(line)
                elif in_code_block and line.strip() and not line.startswith(' '):
                    if not any(char in line for char in ['.', '?', '!']):  # Likely still code
                        code_lines.append(line)
                    else:
                        break
            
            if code_lines:
                return '\n'.join(code_lines).strip()
        
        return None
    
    def generate_code_response(self, user_message, language, conversation_history):
        """Generate CodeGent response using Gemini"""
        if not model:
            return {
                'response': "I'm having trouble connecting to my AI services right now. Here's a basic template for your request. Please check your internet connection and try again.",
                'code': f"# {language.upper()} code template\n# Your code here...\nprint('Hello, CodeGent!')",
                'language': language,
                'has_code': True
            }
        
        try:
            prompt = self.get_codegent_prompt(user_message, language, conversation_history)
            response = model.generate_content(prompt)
            ai_message = response.text.strip()
            
            # Extract code from response
            extracted_code = self.extract_code_from_response(ai_message)
            
            # Store conversation
            self.conversation_history.append({
                'user': user_message,
                'assistant': ai_message,
                'language': language,
                'timestamp': datetime.now().isoformat(),
                'has_code': extracted_code is not None
            })
            
            return {
                'response': ai_message,
                'code': extracted_code,
                'language': language,
                'has_code': extracted_code is not None
            }
            
        except Exception as e:
            logger.error(f"CodeGent AI generation error: {e}")
            fallback_response = f"I'm having trouble processing that request right now. However, I can help you with {language.upper()} programming! Try asking me about:\n\n- Writing specific functions or classes\n- Debugging code errors\n- Algorithm implementations\n- Best practices\n- Code optimization\n\nWhat specific {language.upper()} programming challenge can I help you with?"
            
            return {
                'response': fallback_response,
                'code': None,
                'language': language,
                'has_code': False
            }

# Global assistant instances
voice_assistant = VoiceAssistant()
parent_assistant = ParentAssistant()
luna_assistant = LunaProfessionalAssistant()
codegent_assistant = CodeGentAssistant()

# =================================================================================
# MAIN ROUTES (WEBSITE FLOW)
# =================================================================================

@app.route('/')
def index():
    """Landing page"""
    return send_from_directory('.', 'index.html')

@app.route('/login.html')
def login():
    """Login page"""
    return send_from_directory('.', 'login.html')

@app.route('/register.html')
def register():
    """Register page"""
    return send_from_directory('.', 'register.html')

@app.route('/face-auth.html')
def face_auth():
    """Face authentication page"""
    return send_from_directory('.', 'face-auth.html')

@app.route('/happy-result.html')
def happy_result():
    """Happy result page"""
    return send_from_directory('.', 'happy-result.html')

@app.route('/who-are-you.html')
def who_are_you():
    """User type selection page"""
    return send_from_directory('.', 'who-are-you.html')

@app.route('/who are you.html')
def who_are_you_spaces():
    """User type selection page (with spaces)"""
    return send_from_directory('.', 'who-are-you.html')

@app.route('/talk-with-me.html')
def talk_with_me():
    """Student chat page"""
    return send_from_directory('.', 'talk-with-me.html')

@app.route('/working-professional.html')
def working_professional():
    """Working professional chat page"""
    return send_from_directory('.', 'working-professional.html')

@app.route('/parent.html')
def parent():
    """Parent chat page"""
    return send_from_directory('.', 'parent.html')

@app.route('/codegent.html')
def codegent():
    """CodeGent coding assistant page"""
    return send_from_directory('.', 'codegent.html')

@app.route('/zenmode.html')
def zenmode():
    """Zen mode meditation page"""
    return send_from_directory('.', 'zenmode.html')

# Serve static files
@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('.', filename)

# =================================================================================
# STUDENT API ROUTES
# =================================================================================

@app.route('/api/student/start-conversation', methods=['POST'])
def start_student_conversation():
    """Initialize student conversation"""
    global voice_assistant
    voice_assistant = VoiceAssistant()
    
    data = request.get_json() or {}
    happiness_score = data.get('happiness', 0)
    student_name = data.get('name', 'friend')
    
    voice_assistant.student_context.update({
        'happiness_score': happiness_score,
        'student_name': student_name,
        'mood': 'sad' if happiness_score < 80 else 'happy'
    })
    
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

@app.route('/api/student/listen', methods=['POST'])
def listen_to_student():
    """Capture student's voice input - Cloud compatible version"""
    try:
        # In cloud deployment, speech recognition won't work with microphone
        # Return instruction to use browser-based speech recognition instead
        return jsonify({
            'success': False,
            'error': 'Server-side speech recognition not available in cloud environment',
            'message': "Please use the microphone button in your browser to speak. Browser speech recognition will capture your voice and send the text to me.",
            'use_browser_speech': True
        })
        
    except Exception as e:
        logger.error(f"Voice input error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to capture voice input',
            'message': "Please use your browser's speech recognition by clicking the microphone button.",
            'use_browser_speech': True
        })

@app.route('/api/student/respond', methods=['POST'])
def respond_to_student():
    """Generate AI response to student message"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        enable_voice = data.get('enable_voice', True)
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'No message provided'
            })
        
        ai_response = voice_assistant.generate_ai_response(user_message)
        
        # For cloud deployment, always use browser TTS
        voice_response = "use_browser_tts" if enable_voice else None
        
        return jsonify({
            'success': True,
            'response': ai_response,
            'voice_response': voice_response,
            'has_voice': voice_response is not None,
            'use_browser_tts': True,  # Always use browser TTS in cloud
            'conversation_count': len(voice_assistant.conversation_history),
            'student_context': voice_assistant.student_context
        })
        
    except Exception as e:
        logger.error(f"Response generation error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate response',
            'response': "I'm here for you! What's on your mind?"
        })

@app.route('/api/student/speak', methods=['POST'])
def speak_text_student():
    """Convert text to speech for student"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            })
        
        def speak_async():
            try:
                engine = pyttsx3.init()
                engine.say(text)
                engine.runAndWait()
            except Exception as e:
                logger.error(f"TTS error: {e}")
        
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

# =================================================================================
# PARENT API ROUTES
# =================================================================================

@app.route('/api/parent/start-conversation', methods=['POST'])
def start_parent_conversation():
    """Initialize parent conversation"""
    global parent_assistant
    parent_assistant = ParentAssistant()
    
    data = request.get_json() or {}
    parent_name = data.get('name', 'Parent')
    
    parent_assistant.parent_context.update({
        'parent_name': parent_name
    })
    
    welcome_message = f"Hello {parent_name}! I'm ParentBot, your AI parenting assistant. I'm here to help you with meal planning, creating todo lists, parenting guidance, bedtime stories for your kids, and money management. What can I help you with today?"
    
    if model:
        welcome_prompt = f"""
        You are ParentBot, a helpful AI assistant for busy parents. 
        A parent named {parent_name} just started a conversation with you.
        
        Give a warm welcome that:
        1. Introduces yourself as ParentBot
        2. Mentions your specialties: meal planning, todo lists, parenting tips, bedtime stories, money management
        3. Asks what you can help them with today
        4. Keep it warm and professional (2-3 sentences)
        
        Respond as ParentBot:
        """
        
        try:
            response = model.generate_content(welcome_prompt)
            welcome_message = response.text.strip()
        except Exception as e:
            logger.error(f"Welcome message error: {e}")
    
    return jsonify({
        'success': True,
        'message': welcome_message,
        'session_id': parent_assistant.parent_context['session_start']
    })

@app.route('/api/parent/listen', methods=['POST'])
def listen_to_parent():
    """Capture parent's voice input - Cloud compatible version"""
    try:
        return jsonify({
            'success': False,
            'error': 'Server-side speech recognition not available in cloud environment',
            'message': "Please use the microphone button in your browser to speak.",
            'use_browser_speech': True
        })
        
    except Exception as e:
        logger.error(f"Parent voice input error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to capture voice input',
            'message': "Please use your browser's speech recognition by clicking the microphone button.",
            'use_browser_speech': True
        })

@app.route('/api/parent/respond', methods=['POST'])
def respond_to_parent():
    """Generate AI response to parent message"""
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
        
        # For cloud deployment, always use browser TTS
        voice_response = "use_browser_tts" if enable_voice else None
        
        return jsonify({
            'success': True,
            'response': ai_response,
            'voice_response': voice_response,
            'has_voice': voice_response is not None,
            'use_browser_tts': True,  # Always use browser TTS in cloud
            'task_type': parent_assistant.detect_task_type(user_message),
            'conversation_count': len(parent_assistant.conversation_history),
            'parent_context': parent_assistant.parent_context
        })
        
    except Exception as e:
        logger.error(f"Parent response generation error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate response',
            'response': "I'm here to help you with parenting tasks!"
        })

@app.route('/api/professional/workplace-support', methods=['POST'])
def start_workplace_session():
    """Initialize a new professional wellness session with Luna"""
    global luna_assistant
    luna_assistant = LunaProfessionalAssistant()
    
    data = request.get_json() or {}
    stress_level = data.get('stress_level', 'high')
    professional_name = data.get('name', 'Professional')
    work_environment = data.get('work_environment', 'office')
    
    luna_assistant.professional_context.update({
        'stress_level': stress_level,
        'professional_name': professional_name,
        'work_environment': work_environment,
        'mood': 'stressed' if stress_level in ['high', 'very high'] else 'manageable'
    })
    
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

@app.route('/api/professional/listen', methods=['POST'])
def listen_to_professional():
    """Capture professional's voice input - Cloud compatible version"""
    try:
        return jsonify({
            'success': False,
            'error': 'Server-side speech recognition not available in cloud environment',
            'message': "Please use the microphone button in your browser to speak.",
            'use_browser_speech': True
        })
        
    except Exception as e:
        logger.error(f"Professional voice input error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to capture voice input',
            'message': "Please use your browser's speech recognition by clicking the microphone button.",
            'use_browser_speech': True
        })

@app.route('/api/professional/respond', methods=['POST'])
def respond_to_professional():
    """Generate Luna response to professional message"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        enable_voice = data.get('enable_voice', True)
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'No message provided'
            })
        
        ai_response = luna_assistant.generate_ai_response(user_message)
        
        # For cloud deployment, always use browser TTS
        voice_response = "use_browser_tts" if enable_voice else None
        
        return jsonify({
            'success': True,
            'response': ai_response,
            'voice_response': voice_response,
            'has_voice': voice_response is not None,
            'use_browser_tts': True,  # Always use browser TTS in cloud
            'conversation_count': len(luna_assistant.conversation_history),
            'professional_context': luna_assistant.professional_context,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Response generation error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate response',
            'response': "I'm here to support your professional wellness!"
        })

@app.route('/api/codegent/start', methods=['POST'])
def start_codegent():
    """Initialize CodeGent"""
    try:
        data = request.get_json() or {}
        language = data.get('language', 'python')
        user_name = data.get('name', 'Developer')
        
        if language not in codegent_assistant.supported_languages:
            return jsonify({
                'success': False,
                'error': f'Unsupported language: {language}'
            })
        
        lang_info = codegent_assistant.supported_languages[language]
        welcome_message = f"Hello {user_name}! I'm CodeGent, your personal coding assistant. I'm specialized in {lang_info['name']} programming and ready to help you with coding challenges, debugging, optimization, and more. What would you like to work on today?"
        
        return jsonify({
            'success': True,
            'message': welcome_message,
            'language': language,
            'language_info': lang_info,
            'session_id': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"CodeGent start error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to start CodeGent session'
        })

@app.route('/api/codegent/respond', methods=['POST'])
def codegent_respond():
    """Generate CodeGent response"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        language = data.get('language', '')
        conversation_history = data.get('conversation_history', [])
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'No message provided'
            })
        
        if not language:
            return jsonify({
                'success': False,
                'error': 'Please select a programming language first'
            })
        
        if language not in codegent_assistant.supported_languages:
            return jsonify({
                'success': False,
                'error': f'Unsupported language: {language}'
            })
        
        # Generate response
        result = codegent_assistant.generate_code_response(
            user_message, 
            language,
            conversation_history
        )
        
        return jsonify({
            'success': True,
            'response': result['response'],
            'code': result['code'],
            'language': result['language'],
            'has_code': result['has_code'],
            'conversation_count': len(codegent_assistant.conversation_history)
        })
        
    except Exception as e:
        logger.error(f"CodeGent response error: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': 'Failed to generate response',
            'response': "I'm having trouble processing that right now. Could you please try again? I'm here to help with Python, Java, C++, and Go programming."
        })

@app.route('/api/codegent/examples/<language>', methods=['GET'])
def get_code_examples(language):
    """Get code examples for a specific language"""
    try:
        if language not in codegent_assistant.supported_languages:
            return jsonify({
                'success': False,
                'error': f'Unsupported language: {language}'
            })
        
        lang_info = codegent_assistant.supported_languages[language]
        
        return jsonify({
            'success': True,
            'language': language,
            'name': lang_info['name'],
            'examples': lang_info['examples'],
            'extensions': lang_info['extensions']
        })
        
    except Exception as e:
        logger.error(f"Examples error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get examples'
        })

@app.route('/api/codegent/languages', methods=['GET'])
def get_supported_languages():
    """Get all supported programming languages"""
    try:
        languages = {}
        for lang_key, lang_info in codegent_assistant.supported_languages.items():
            languages[lang_key] = {
                'name': lang_info['name'],
                'extensions': lang_info['extensions']
            }
        
        return jsonify({
            'success': True,
            'languages': languages,
            'total': len(languages)
        })
        
    except Exception as e:
        logger.error(f"Languages error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get supported languages'
        })

@app.route('/api/codegent/clear-history', methods=['POST'])
def clear_codegent_history():
    """Clear CodeGent conversation history"""
    try:
        global codegent_assistant
        codegent_assistant.conversation_history = []
        
        return jsonify({
            'success': True,
            'message': 'Conversation history cleared'
        })
        
    except Exception as e:
        logger.error(f"Clear history error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to clear history'
        })

# =================================================================================
# ZEN MODE API ROUTES
# =================================================================================

@app.route('/api/zenmode/start', methods=['POST'])
def start_zen_session():
    """Start a zen meditation session"""
    try:
        data = request.get_json() or {}
        session_type = data.get('type', 'breathing')
        duration = data.get('duration', 5)
        
        return jsonify({
            'success': True,
            'message': f'Starting {session_type} meditation for {duration} minutes',
            'session_id': datetime.now().isoformat(),
            'type': session_type,
            'duration': duration
        })
        
    except Exception as e:
        logger.error(f"Zen session error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to start zen session'
        })

# =================================================================================
# HEALTH CHECK AND UTILITY ROUTES
# =================================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'service': 'FreeSpace Unified AI Mental Wellness Platform',
        'status': 'healthy',
        'components': {
            'ai_model': model is not None,
            'speech_recognition': recognizer is not None,
            'text_to_speech': tts_engine is not None
        },
        'services': ['student', 'parent', 'professional', 'codegent'],
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/conversation-history/<service>', methods=['GET'])
def get_conversation_history(service):
    """Get current conversation history for a specific service"""
    if service == 'student':
        return jsonify({
            'success': True,
            'history': voice_assistant.conversation_history,
            'context': voice_assistant.student_context,
            'total_messages': len(voice_assistant.conversation_history)
        })
    elif service == 'parent':
        return jsonify({
            'success': True,
            'history': parent_assistant.conversation_history,
            'context': parent_assistant.parent_context,
            'total_messages': len(parent_assistant.conversation_history)
        })
    elif service == 'professional':
        return jsonify({
            'success': True,
            'history': luna_assistant.conversation_history,
            'context': luna_assistant.professional_context,
            'total_messages': len(luna_assistant.conversation_history)
        })
    elif service == 'codegent':
        return jsonify({
            'success': True,
            'history': codegent_assistant.conversation_history,
            'total_messages': len(codegent_assistant.conversation_history)
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Invalid service specified'
        })

@app.route('/api/test-gemini', methods=['GET'])
def test_gemini_api():
    """Test if Gemini API is working"""
    if not model:
        return jsonify({
            'success': False,
            'error': 'Gemini model not initialized',
            'api_key_present': bool(GEMINI_API_KEY and GEMINI_API_KEY != "dummy_key_for_testing")
        })
    
    try:
        # Simple test prompt
        test_prompt = "Say 'Hello, FreeSpace API is working!' in a friendly way."
        response = model.generate_content(test_prompt)
        
        return jsonify({
            'success': True,
            'message': 'Gemini API is working correctly',
            'test_response': response.text.strip(),
            'api_key_status': 'valid'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Gemini API error: {str(e)}',
            'api_key_present': bool(GEMINI_API_KEY and GEMINI_API_KEY != "dummy_key_for_testing")
        })

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Run the app
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_ENV', 'development') != 'production'
    
    logger.info("🚀 FreeSpace Unified AI Mental Wellness Platform Starting...")
    
    # Test services on startup
    if not model:
        logger.warning("⚠️  Gemini AI not available - using fallback responses")
    else:
        logger.info("✅ Gemini AI initialized for all services")
        
    if not tts_engine:
        logger.warning("⚠️  Text-to-speech not available")
    else:
        logger.info("✅ Text-to-speech initialized")
        
    if not recognizer:
        logger.warning("⚠️  Speech recognition not available")
    else:
        logger.info("✅ Speech recognition initialized")
    
    logger.info("💙 Maya (Student Support) ready")
    logger.info("🏠 ParentBot (Parent Assistant) ready")
    logger.info("🌙 Luna (Professional Wellness) ready")
    logger.info("💻 CodeGent (Coding Assistant) ready")
    logger.info("🧘 Zen Mode available")
    logger.info(f"🌐 Server running on port {port}")
    
    app.run(debug=debug_mode, host='0.0.0.0', port=port)