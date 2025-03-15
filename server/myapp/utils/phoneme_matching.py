# phoneme_matching.py
from string import punctuation
from myapp.tech.phonemizer import Phonemizer
import numpy as np
import myapp.utils.WordMetrics as WordMetrics
from typing import List, Dict, Tuple

class PhoneticComparator:

    def __init__(self, language='en'):
        self.language = language
        self.phonemizer = Phonemizer(language=self.language)
        self.punctuation_to_remove = punctuation.replace("'", "")

    def remove_punctuation(self, text: str) -> str:
        return text.translate(str.maketrans('', '', self.punctuation_to_remove))

    def calculate_phoneme_accuracy(self, expected, result):
        """
        Calculates phoneme-level accuracy with detailed error analysis.
        """
        try:
            expected_text = expected.get('text', '')
            result_text = result.get('text', '')

            if not expected_text or not result_text:
                return self._empty_result()

            expected_words = self.remove_punctuation(expected_text).lower().split()
            result_words = self.remove_punctuation(result_text).lower().split()

            expected_phonemes_dict = self.phonemizer.phonemize_batch(expected_words)
            result_phonemes_dict = self.phonemizer.phonemize_batch(result_words)
            # Correctly get phoneme strings for EACH WORD
            expected_phonemes = [expected_phonemes_dict[word] for word in expected_words]
            result_phonemes = [result_phonemes_dict[word] for word in result_words]


            word_level_analysis = []
            total_distance = 0
            total_expected_phonemes = 0

            for i, (expected_word, result_word) in enumerate(zip(expected_words, result_words)):
                expected_phoneme_str = expected_phonemes[i]  # Phonemes for the expected word
                result_phoneme_str = result_phonemes[i]    # Phonemes for the result word

                distance = WordMetrics.edit_distance_python(expected_phoneme_str, result_phoneme_str)
                errors, correct_phonemes = self._identify_errors(expected_phoneme_str, result_phoneme_str)
                error_details = self._get_error_details(expected_phoneme_str, result_phoneme_str)

                pronunciation_score = (max(0, len(expected_phoneme_str) - distance) / max(len(expected_phoneme_str), 1e-9)) * 100

                total_distance += distance
                total_expected_phonemes += len(expected_phoneme_str)

                word_level_analysis.append({
                    'expected_word': expected_word,
                    'result_word': result_word,
                    'expected_phonemes': expected_phoneme_str,
                    'result_phonemes': result_phoneme_str,
                    'pronunciation_score': pronunciation_score,
                    'errors': errors,
                    'error_details': error_details,
                    'correct_phonemes': correct_phonemes,
                })

            # Handle extra words (insertions/deletions)
            if len(expected_words) < len(result_words):
                for i in range(len(expected_words), len(result_words)):
                    result_word = result_words[i]
                    result_phoneme_str = result_phonemes[i] # Get the correct phoneme string
                    errors = ['insertion'] * len(result_phoneme_str)
                    error_details = [{'type': 'insertion', 'result': p} for p in result_phoneme_str]
                    correct_phonemes = [False] * len(result_phoneme_str)
                    total_distance += len(result_phoneme_str)

                    word_level_analysis.append({
                        'expected_word': '',
                        'result_word': result_word,
                        'expected_phonemes': '',
                        'result_phonemes': result_phoneme_str,
                        'pronunciation_score': 0.0,
                        'errors': errors,
                        'error_details': error_details,
                        'correct_phonemes': correct_phonemes,
                    })
            elif len(result_words) < len(expected_words):
                for i in range(len(result_words), len(expected_words)):
                    expected_word = expected_words[i]
                    expected_phoneme_str = expected_phonemes[i] # Get the correct phoneme string
                    errors = ['deletion'] * len(expected_phoneme_str)
                    error_details = [{'type': 'deletion', 'expected': p} for p in expected_phoneme_str]
                    correct_phonemes = [False] * len(expected_phoneme_str)

                    total_distance += len(expected_phoneme_str)
                    total_expected_phonemes += len(expected_phoneme_str)


                    word_level_analysis.append({
                        'expected_word': expected_word,
                        'result_word': '',
                        'expected_phonemes': expected_phoneme_str,
                        'result_phonemes': '',
                        'pronunciation_score': 0.0,
                        'errors': errors,
                        'error_details': error_details,
                        'correct_phonemes': correct_phonemes,
                    })

            overall_accuracy_score = (max(0, total_expected_phonemes - total_distance) / max(total_expected_phonemes, 1e-9)) * 100 if total_expected_phonemes > 0 else 100.0
            overall_errors = self._summarize_errors(word_level_analysis)
            fluency_score = self._calculate_fluency_score(result_words)

            return {
                'accuracy_score': overall_accuracy_score / 100,
                'word_level_analysis': word_level_analysis,
                'overall_errors': overall_errors,
                'fluency_score': fluency_score,
                'suggestions': self._generate_suggestions(word_level_analysis)
            }

        except Exception as e:
            import traceback
            print(f"Error in phoneme comparison: {e}")
            print(traceback.format_exc())
            return self._empty_result(str(e))

    def _empty_result(self, error_message: str = ""):
        return {
            'accuracy_score': 0,
            'word_level_analysis': [],
            'overall_errors': {'substitution': 0, 'insertion': 0, 'deletion': 0},
            'error': error_message
        }
    def _summarize_errors(self, word_level_analysis):
        """Summarizes the errors across all words."""
        summary = {'substitution': 0, 'insertion': 0, 'deletion': 0}
        for word_analysis in word_level_analysis:
            for error_type in word_analysis['errors']:
                if isinstance(error_type, str):
                    summary[error_type] += 1
        return summary

    def _identify_errors(self, expected_phonemes, result_phonemes) -> Tuple[List[str], List[bool]]:
        """Identifies errors and creates booleans for correct phonemes."""
        size_x = len(expected_phonemes) + 1
        size_y = len(result_phonemes) + 1
        matrix = np.zeros((size_x, size_y))
        for x in range(size_x):
            matrix[x, 0] = x
        for y in range(size_y):
            matrix[0, y] = y

        for x in range(1, size_x):
            for y in range(1, size_y):
                if expected_phonemes[x - 1] == result_phonemes[y - 1]:
                    matrix[x, y] = matrix[x - 1, y - 1]
                else:
                    matrix[x, y] = min(
                        matrix[x - 1, y] + 1,
                        matrix[x - 1, y - 1] + 1,
                        matrix[x, y - 1] + 1
                    )

        x = size_x - 1
        y = size_y - 1
        errors: List[str] = []
        correct_phonemes = [False] * max(len(expected_phonemes),len(result_phonemes))

        while x > 0 or y > 0:
            if x > 0 and y > 0 and expected_phonemes[x - 1] == result_phonemes[y - 1]:
                correct_phonemes[max(x - 1, y-1)] = True
                x -= 1
                y -= 1
            else:
                if x > 0 and matrix[x, y] == matrix[x - 1, y] + 1:
                    errors.insert(0, 'deletion')
                    x -= 1
                elif y > 0 and matrix[x, y] == matrix[x, y - 1] + 1:
                    errors.insert(0, 'insertion')
                    y -= 1
                else:
                    errors.insert(0, 'substitution')
                    x -= 1
                    y -= 1

        if len(correct_phonemes) < len(result_phonemes):
            correct_phonemes.extend([False]*(len(result_phonemes)-len(correct_phonemes)))
        return errors, correct_phonemes[:len(expected_phonemes)]

    def _get_error_details(self, expected_phonemes_str, result_phonemes_str) -> List[Dict]:
        """Generates detailed error information."""
        details = []
        errors, _ = self._identify_errors(expected_phonemes_str, result_phonemes_str)
        exp_idx = 0
        res_idx = 0

        for error in errors:
            if error == 'substitution':
                details.append({'type': 'substitution', 'expected': expected_phonemes_str[exp_idx], 'result': result_phonemes_str[res_idx]})
                exp_idx += 1
                res_idx += 1
            elif error == 'insertion':
                details.append({'type': 'insertion', 'result': result_phonemes_str[res_idx]})
                res_idx += 1
            elif error == 'deletion':
                details.append({'type': 'deletion', 'expected': expected_phonemes_str[exp_idx]})
                exp_idx += 1

        return details

    def highlight_errors(self, word, correct_phonemes):
        """Highlights errors in a word using HTML."""
        highlighted_word = ""
        # Get the phoneme string for the *entire word*
        phonemes = self.phonemizer.phonemize_text(word)
        if phonemes:
            # Now, split the phoneme string into individual phonemes
            phoneme_list = phonemes.split()
            for i, phoneme in enumerate(phoneme_list):
                # Ensure we don't go out of bounds of correct_phonemes
                if i < len(correct_phonemes):
                    if correct_phonemes[i]:
                        highlighted_word += f"<span style='color: green;'>{phoneme}</span> "  # Correct
                    else:
                        highlighted_word += f"<span style='color: red;'>{phoneme}</span> "  # Incorrect
                else:
                    # Handle cases where correct_phonemes might be shorter than phoneme_list
                    highlighted_word += f"<span style='color: red;'>{phoneme}</span> "
            return highlighted_word.strip()
        return ""
    
    def _calculate_fluency_score(self, result_words: List[str]) -> float:
        """Calculates a fluency score based on the number of pauses and hesitations."""
        # Example: Simple fluency score based on word count and average word length
        if not result_words:
            return 0.0
        
        total_words = len(result_words)
        total_length = sum(len(word) for word in result_words)
        average_word_length = total_length / total_words if total_words > 0 else 0
        
        # Simple heuristic: longer average word length and more words indicate better fluency
        fluency_score = min(100, (average_word_length * total_words) / 2)
        return fluency_score

    def _generate_suggestions(self, word_level_analysis: List[Dict]) -> List[str]:
        """Generates suggestions based on the word-level analysis."""
        suggestions = []
        for analysis in word_level_analysis:
            if analysis['errors']:
                for error in analysis['error_details']:
                    if error['type'] == 'substitution':
                        suggestions.append(f"Try pronouncing '{error['expected']}' more clearly instead of '{error['result']}'.")
                    elif error['type'] == 'insertion':
                        suggestions.append(f"Try to avoid adding extra sounds like '{error['result']}'.")
                    elif error['type'] == 'deletion':
                        suggestions.append(f"Make sure to include the sound '{error['expected']}' in your pronunciation.")
        return suggestions

def analyze_pronunciation(expected_input, result_input, language='en'):
    """
    Analyzes pronunciation accuracy. Takes text input directly.
    """
    comparator = PhoneticComparator(language=language)
    return comparator.calculate_phoneme_accuracy(expected_input, result_input)