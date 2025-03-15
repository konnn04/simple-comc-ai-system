import os
import json
import time
import tempfile
import logging
from typing import Dict, Any, List, Optional, Tuple

# Third-party imports
from google import genai

# Local imports
from myapp import stt
from myapp.utils.tts import create_single_audio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize AI client
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

# Voice options for TTS responses
CONVERSATION_VOICES = {
    "default": "af_heart",     # Default female voice
    "female": "af_heart",      # American female
    "male": "bm_george",       # British male
    "young": "ru_cindy",       # Young voice
    "elder": "pl_adam"         # Older voice
}

# Global cache for active chat sessions
active_chat_sessions = {}

class TopicConstrainedConversation:
    """
    Manages a conversation session focused on a specific topic
    """
    def __init__(self, topic: str, voice: str = "default"):
        """
        Initialize a new conversation session
        
        Args:
            topic: Topic to focus the conversation on
            voice: Voice ID for TTS responses
        """
        self.topic = topic
        self.voice = CONVERSATION_VOICES.get(voice, CONVERSATION_VOICES["default"])
        self.session_id = f"session_{int(time.time())}_{hash(topic) % 10000}"
        self.last_activity = time.time()
        self.history = []
        self.message_count = 0
        
        # Log session creation
        logger.info(f"Created new conversation session {self.session_id} about '{topic}'")
    
    def add_to_history(self, role: str, content: str) -> None:
        """
        Add a message to conversation history
        
        Args:
            role: 'user' or 'assistant'
            content: Message content
        """
        self.history.append({"role": role, "content": content})
        self.message_count += 1
        self.last_activity = time.time()
        
        # Keep history to a reasonable size (last 20 messages)
        if len(self.history) > 20:
            self.history = self.history[-20:]
    
    def get_formatted_messages(self) -> List[Dict[str, Any]]:
        """
        Format conversation history for Gemini API
        
        Returns:
            List of formatted messages
        """
        messages = []
        
        # Add system message at the beginning
        system_message = {
            "role": "user",
            "parts": [{
                "text": f"""You are an English conversation practice assistant helping users practice 
                their English speaking skills about the topic: {self.topic}.
                
                Stay strictly on this topic. If asked about unrelated topics, politely redirect to {self.topic}.
                Use natural conversational English. Keep responses concise (1-3 sentences).
                Don't mention you're an AI. Act as a friendly conversation partner."""
            }]
        }
        
        messages.append(system_message)
        
        # Add confirmation from assistant
        messages.append({
            "role": "model", 
            "parts": [{
                "text": f"I understand. I'll help you practice English conversation about {self.topic}."
            }]
        })
        
        # Add conversation history
        for msg in self.history:
            messages.append({
                "role": "user" if msg["role"] == "user" else "model",
                "parts": [{"text": msg["content"]}]
            })
            
        return messages
    
    def get_state(self) -> Dict[str, Any]:
        """
        Get the current conversation state
        
        Returns:
            Dictionary with session information
        """
        return {
            'session_id': self.session_id,
            'topic': self.topic,
            'voice': self.voice,
            'last_activity': self.last_activity,
            'message_count': self.message_count,
            'history': self.history
        }


def get_or_create_conversation(
    session_id: Optional[str] = None, 
    topic: Optional[str] = None, 
    voice: str = "default"
) -> Tuple[TopicConstrainedConversation, bool]:
    """
    Get an existing conversation or create a new one
    
    Args:
        session_id: Existing session ID (optional)
        topic: Topic for new conversation (required if session_id not provided)
        voice: Voice preference for TTS
        
    Returns:
        Tuple of (conversation object, is_new)
    """
    global active_chat_sessions
    
    # Clean expired sessions (inactive for more than 30 minutes)
    current_time = time.time()
    expired_sessions = [sid for sid, session in active_chat_sessions.items() 
                       if current_time - session.last_activity > 1800]
    
    for sid in expired_sessions:
        logger.info(f"Removing expired session {sid}")
        del active_chat_sessions[sid]
    
    # Return existing session if valid
    if session_id and session_id in active_chat_sessions:
        session = active_chat_sessions[session_id]
        session.last_activity = current_time
        return session, False
        
    # Create new session
    if not topic:
        raise ValueError("Topic is required to create a new conversation")
        
    session = TopicConstrainedConversation(topic, voice)
    active_chat_sessions[session.session_id] = session
    return session, True


def process_audio_message(
    audio_path: str,
    session_id: Optional[str] = None,
    topic: Optional[str] = None,
    voice: str = "default"
) -> Dict[str, Any]:
    """
    Process an audio message and return a response
    
    Args:
        audio_path: Path to the audio file
        session_id: ID of existing conversation session (optional)
        topic: Topic for new conversation (required if session_id not provided)
        voice: Voice preference for TTS
        
    Returns:
        Dict with response text, audio path and session information
    """
    try:
        # Step 1: Get or create conversation
        try:
            conversation, is_new = get_or_create_conversation(session_id, topic, voice)
        except ValueError as e:
            return {'success': False, 'error': str(e)}
            
        # Step 2: Upload audio file to Gemini
        try:
            audio_file = client.files.upload(file=audio_path)
            logger.info(f"Audio file uploaded to Gemini: {audio_file.name}")
        except Exception as e:
            logger.error(f"Failed to upload audio file: {e}")
            return {'success': False, 'error': f"Failed to upload audio: {str(e)}"}
            
        # Step 3: Create prompt for on-topic conversation
        prompt = f"""
        This is an English conversation practice session about {conversation.topic}.
        
        Listen to the audio and respond naturally as if you're having a conversation with the speaker.
        Keep your response strictly related to {conversation.topic}.
        
        Your response should:
        1. Directly address what they said in the audio
        2. Be natural, conversational English (1-3 sentences)
        3. Include a follow-up question to encourage continued practice
        4. NEVER mention that you're an AI or that you're processing audio
        5. NEVER discuss topics unrelated to {conversation.topic}
        
        If the audio is unclear or unrelated to {conversation.topic}, politely redirect the conversation 
        back to discussing {conversation.topic}.
        """
        
        # Step 4: Get response from Gemini
        messages = conversation.get_formatted_messages()
        
        response = client.models.generate_content(
            model="gemini-1.5-pro",
            contents=[
                audio_file,
                "\n\n",
                prompt
            ]
        )
        
        response_text = response.text.strip()
        
        # Step 5: Add to conversation history
        conversation.add_to_history("user", "[Audio message]")  # We don't have transcription
        conversation.add_to_history("assistant", response_text)
        
        # Step 6: Convert response to speech
        tts_result = create_single_audio(text=response_text, voice=conversation.voice)
        audio_path = f"/static/tts/{tts_result['filename']}"
        
        # Step 7: Return result
        return {
            'success': True,
            'response_text': response_text,
            'audio_path': audio_path,
            'is_new_session': is_new,
            'session_id': conversation.session_id,
            'topic': conversation.topic,
            'voice': conversation.voice,
            'message_count': conversation.message_count
        }
        
    except Exception as e:
        logger.error(f"Error processing audio message: {str(e)}")
        return {
            'success': False,
            'error': f"Conversation error: {str(e)}"
        }


def start_conversation(topic: str, voice: str = "default") -> Dict[str, Any]:
    """
    Start a new conversation on a specific topic
    
    Args:
        topic: Topic for the conversation
        voice: Voice preference for TTS
        
    Returns:
        Dict with greeting and session information
    """
    try:
        # Create a new conversation
        conversation, _ = get_or_create_conversation(topic=topic, voice=voice)
        
        # Generate a topic-specific greeting
        prompt = f"""
        You're starting an English conversation practice about {topic}.
        
        Generate a friendly greeting that:
        1. Welcomes the user to practice English conversation
        2. Specifically mentions the topic of {topic} 
        3. Asks an open-ended question about {topic} to start the conversation
        4. Is 2-3 sentences maximum
        
        Don't introduce yourself as an AI or assistant. Act as a friendly conversation partner.
        """
        
        # Get response from Gemini
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        
        greeting_text = response.text.strip()
        
        # Add to conversation history
        conversation.add_to_history("assistant", greeting_text)
        
        # Generate audio for greeting
        tts_result = create_single_audio(text=greeting_text, voice=conversation.voice)
        audio_path = f"/static/tts/{tts_result['filename']}"
        
        # Return result
        return {
            'success': True,
            'greeting_text': greeting_text,
            'audio_path': audio_path,
            'session_id': conversation.session_id,
            'topic': conversation.topic,
            'voice': conversation.voice
        }
        
    except Exception as e:
        logger.error(f"Error starting conversation: {str(e)}")
        return {
            'success': False,
            'error': f"Failed to start conversation: {str(e)}"
        }


def send_text_message(
    text: str,
    session_id: str
) -> Dict[str, Any]:
    """
    Send a text message to an existing conversation
    
    Args:
        text: Text message to send
        session_id: ID of the conversation session
        
    Returns:
        Dict with response text and audio path
    """
    try:
        # Get existing conversation
        if session_id not in active_chat_sessions:
            return {'success': False, 'error': 'Invalid or expired session ID'}
            
        conversation = active_chat_sessions[session_id]
        conversation.last_activity = time.time()
        
        # Add message to history
        conversation.add_to_history("user", text)
        
        # Prepare message for Gemini
        messages = conversation.get_formatted_messages()
        
        # Get response from Gemini
        response = client.models.generate_content(
            model="gemini-1.5-pro",
            contents=messages
        )
        
        response_text = response.text.strip()
        
        # Add response to history
        conversation.add_to_history("assistant", response_text)
        
        # Convert response to speech
        tts_result = create_single_audio(text=response_text, voice=conversation.voice)
        audio_path = f"/static/tts/{tts_result['filename']}"
        
        # Return result
        return {
            'success': True,
            'response_text': response_text,
            'audio_path': audio_path,
            'session_id': conversation.session_id,
            'topic': conversation.topic,
            'voice': conversation.voice,
            'message_count': conversation.message_count
        }
        
    except Exception as e:
        logger.error(f"Error processing text message: {str(e)}")
        return {
            'success': False,
            'error': f"Conversation error: {str(e)}"
        }


def get_conversation_history(session_id: str) -> Dict[str, Any]:
    """
    Get the history of an existing conversation
    
    Args:
        session_id: ID of the conversation session
        
    Returns:
        Dict with conversation history
    """
    try:
        # Check if session exists
        if session_id not in active_chat_sessions:
            return {'success': False, 'error': 'Invalid or expired session ID'}
            
        conversation = active_chat_sessions[session_id]
        state = conversation.get_state()
        
        return {
            'success': True,
            'session_id': session_id,
            'topic': conversation.topic,
            'voice': conversation.voice,
            'history': conversation.history,
            'message_count': conversation.message_count,
            'last_activity': conversation.last_activity
        }
        
    except Exception as e:
        logger.error(f"Error getting conversation history: {str(e)}")
        return {
            'success': False,
            'error': f"Error retrieving conversation: {str(e)}"
        }


def get_suggested_topics(level: str = "intermediate", count: int = 10) -> Dict[str, Any]:
    """
    Get suggested conversation topics based on language level
    
    Args:
        level: Language level - "beginner", "intermediate", or "advanced"
        count: Number of topics to return
        
    Returns:
        Dict with suggested topics
    """
    try:
        # Define topics by difficulty level
        topic_suggestions = {
            'beginner': [
                "introducing yourself", "family members", "daily routines",
                "food and meals", "hobbies", "weather", "shopping", 
                "places in town", "transportation", "pets", "colors and clothes",
                "simple directions", "telling time", "weekends and holidays"
            ],
            'intermediate': [
                "travel experiences", "movies and TV shows", "music preferences",
                "technology in daily life", "sports and games", "health and fitness",
                "education and learning", "jobs and careers", "food culture",
                "shopping habits", "famous places", "cultural differences",
                "social media", "environment", "future plans"
            ],
            'advanced': [
                "global issues", "cultural identity", "personal development",
                "art and literature", "technological advancements", "economics",
                "educational systems", "sustainable living", "media influence",
                "psychology concepts", "political systems", "scientific discoveries",
                "ethical dilemmas", "philosophy", "urban development"
            ]
        }
        
        # Validate level
        if level not in topic_suggestions:
            level = "intermediate"
            
        # Get topics for the specified level
        available_topics = topic_suggestions[level]
        
        # Select random topics up to the requested count
        import random
        selected_topics = random.sample(available_topics, min(count, len(available_topics)))
        
        return {
            'success': True,
            'topics': selected_topics,
            'level': level,
            'count': len(selected_topics)
        }
        
    except Exception as e:
        logger.error(f"Error getting suggested topics: {str(e)}")
        return {
            'success': False,
            'error': f"Error retrieving topics: {str(e)}"
        }