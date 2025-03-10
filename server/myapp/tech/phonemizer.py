from typing import Dict, List, Optional
import logging

class Phonemizer:
    """
    Class for converting text to phonemes using the phonemizer library
    """
    def __init__(self, language: str = 'en', use_g2p_en: bool = True):
        """
        Initialize the phonemizer.

        Args:
            language: Language code (e.g., 'en', 'de', 'es').
            use_g2p_en:  Whether to use g2p_en as a fallback for English.
        """
        self.language = language
        self.use_g2p_en = use_g2p_en and language.startswith('en') # Only use for English
        self._setup_phonemizer()


    def _setup_phonemizer(self):
        """Set up the phonemizer backend."""
        try:
            from phonemizer import phonemize
            from phonemizer.backend import EspeakBackend
            from phonemizer.separator import Separator

            # Map language codes to espeak language codes (if needed)
            lang_mapping = {'en': 'en-us', 'de': 'de', 'es': 'es'}  # Add more as needed
            espeak_lang = lang_mapping.get(self.language.lower(), self.language)

            self.backend = EspeakBackend(language=espeak_lang, language_switch='remove-flags')
            self.separator = Separator(phone=' ', word='|') # Consistent separator
            self.phonemize_func = phonemize  # Store the phonemize function
            self.is_available = True

        except Exception as e:
            logging.warning(f"Phonemizer setup failed: {e}")
            self.is_available = False

    def phonemize_text(self, text: str) -> Optional[str]:
        """
        Convert text to phonemes.

        Args:
            text: Input text.

        Returns:
            Phonetic transcription or None if conversion failed.
        """
        if not self.is_available or not text:
            return None

        try:
            return self.phonemize_func(
                text,
                backend='espeak',
                language=self.language,
                separator=self.separator,
                strip=True,
                language_switch='remove-flags'
            )
        except Exception as e:
            logging.warning(f"Phonemize error: {e}")

            if self.use_g2p_en:
                try:
                    from g2p_en import G2p
                    g2p = G2p()
                    phonemes = g2p(text)
                    return ' '.join(phonemes)
                except ImportError:
                    logging.warning("g2p_en not available for fallback")

        return self._simple_phoneme_mapping(text) # Fallback to simple mapping


    def phonemize_batch(self, texts: List[str]) -> Dict[str, str]:
        """
        Convert a batch of texts to phonemes.

        Args:
            texts: List of input texts.

        Returns:
            Dictionary mapping input texts to transcriptions.
        """
        if not self.is_available or not texts:
            return {}

        try:
            # Batch phonemize using the stored function and backend
            phonemes_list = self.phonemize_func(
                texts,
                backend='espeak',
                language=self.language,
                separator=self.separator,
                strip=True,
                language_switch='remove-flags'
            )
            #Since phonemize can return a single string or list, handle both
            if isinstance(phonemes_list, str):
                phonemes_list = phonemes_list.split('\n')

            return {text: phoneme.strip() for text, phoneme in zip(texts, phonemes_list)}

        except Exception as e:
            logging.warning(f"Batch phonemize error: {e}")
            # Fallback to individual phonemization
            return {text: self.phonemize_text(text) for text in texts}
    def _simple_phoneme_mapping(self, text: str) -> str:
        """
        Provides a very basic fallback phoneme mapping (replace with a better one if needed).
        This is a VERY rudimentary placeholder and should be replaced with something more robust.
        """
        # This is just a placeholder - you'd need a much more comprehensive mapping
        mapping = {
            'a': 'æ', 'b': 'b', 'c': 'k', 'd': 'd', 'e': 'ɛ', 'f': 'f', 'g': 'ɡ',
            'h': 'h', 'i': 'ɪ', 'j': 'dʒ', 'k': 'k', 'l': 'l', 'm': 'm', 'n': 'n',
            'o': 'oʊ', 'p': 'p', 'q': 'k', 'r': 'r', 's': 's', 't': 't',
            'u': 'u', 'v': 'v', 'w': 'w', 'x': 'ks', 'y': 'j', 'z': 'z'
        }
        return ' '.join(mapping.get(char.lower(), char) for char in text if char.isalpha())