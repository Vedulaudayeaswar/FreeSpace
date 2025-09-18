from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
import google.generativeai as genai
import speech_recognition as sr
import pyttsx3
import threading
import json
import tempfile
from datetime import datetime, timedelta
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
    GEMINI_API_KEY = "dummy_key_for_testing"

try:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    logger.info("Gemini AI configured successfully for Parent Assistant")
except Exception as e:
    logger.error(f"Failed to configure Gemini AI: {e}")
    model = None

# Initialize speech services
try:
    recognizer = sr.Recognizer()
    microphone = sr.Microphone()
    tts_engine = pyttsx3.init()
    
    # Configure TTS voice for parent assistant
    voices = tts_engine.getProperty('voices')
    if voices:
        for voice in voices:
            if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                tts_engine.setProperty('voice', voice.id)
                break
    
    tts_engine.setProperty('rate', 170)
    tts_engine.setProperty('volume', 0.9)
    logger.info("Parent Assistant speech services initialized")
    
except Exception as e:
    logger.error(f"Failed to initialize speech services: {e}")
    recognizer = None
    microphone = None
    tts_engine = None

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
        
        # Check for todo/task keywords FIRST and more specifically
        todo_keywords = ['todo', 'to do', 'task', 'schedule', 'plan my', 'organize', 'checklist', 'do today', 'practice', 'study', 'learn', 'algorithm', 'data structure']
        meal_keywords = ['cook', 'recipe', 'meal plan', 'food', 'breakfast', 'lunch', 'dinner', 'ingredients', 'prepare food', 'cooking']
        
        # Check bedtime stories first (before todo list) to avoid conflicts
        if any(word in message_lower for word in ['story', 'bedtime', 'tale', 'sleep', 'night', 'tell me a story', 'bedtime story']):
            return 'bedtime_stories'
        
        # Prioritize TODO detection with more specific checks
        elif any(word in message_lower for word in todo_keywords) and not any(word in message_lower for word in ['meal plan', 'cooking', 'recipe']):
            return 'todo_list'
        
        # Then check for meal planning with more specific keywords
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
            # Update context
            self.update_context(user_message)
            
            # Generate specialized prompt
            prompt = self.get_specialized_prompt(user_message, self.parent_context)
            
            # Get AI response
            response = model.generate_content(prompt)
            ai_message = response.text.strip()
            
            # Store conversation
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
        
        # Extract specific information based on task type
        if task_type == 'meal_planner':
            if any(word in user_message.lower() for word in ['veg', 'vegetarian']):
                if 'vegetarian' not in self.parent_context['meal_preferences']:
                    self.parent_context['meal_preferences'].append('vegetarian')
            elif any(word in user_message.lower() for word in ['non-veg', 'chicken', 'mutton', 'fish']):
                if 'non-vegetarian' not in self.parent_context['meal_preferences']:
                    self.parent_context['meal_preferences'].append('non-vegetarian')

# Global parent assistant instance
parent_assistant = ParentAssistant()

@app.route('/')
def home():
    return "Parent Voice Assistant Backend is Running!"

@app.route('/api/start-conversation', methods=['POST'])
def start_conversation():
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

@app.route('/api/respond', methods=['POST'])
def respond_to_parent():
    """Generate AI response to parent message"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'No message provided'
            })
        
        # Generate AI response
        ai_response = parent_assistant.generate_ai_response(user_message)
        
        return jsonify({
            'success': True,
            'response': ai_response,
            'task_type': parent_assistant.detect_task_type(user_message),
            'conversation_count': len(parent_assistant.conversation_history),
            'parent_context': parent_assistant.parent_context
        })
        
    except Exception as e:
        logger.error(f"Response generation error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate response',
            'response': "I'm here to help you with parenting tasks. What do you need assistance with today?"
        })

@app.route('/api/speak', methods=['POST'])
def speak_text():
    """Convert text to speech for parents"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            })
        
        def speak_async():
            if tts_engine:
                tts_engine.say(text)
                tts_engine.runAndWait()
        
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

if __name__ == '__main__':
    logger.info("ParentBot - Parent Voice Assistant Backend Starting...")
    app.run(debug=True, host='0.0.0.0', port=5001)  # Different port from student