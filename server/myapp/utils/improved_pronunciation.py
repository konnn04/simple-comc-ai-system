import numpy as np
from string import punctuation
from typing import Dict, Tuple
from dtwalign import dtw_from_distance_matrix

# Enhanced phoneme similarity mapping with more comprehensive coverage
PHONEME_SIMILARITY = {
    # Vowels similarity (same vowel = 1.0)
    ('a', 'ɑ'): 0.8, ('a', 'æ'): 0.7, ('a', 'ə'): 0.6,
    ('e', 'ɛ'): 0.8, ('e', 'i'): 0.6, ('e', 'ɪ'): 0.7,
    ('i', 'ɪ'): 0.8, ('i', 'iː'): 0.9,
    ('o', 'ɔ'): 0.8, ('o', 'oʊ'): 0.8, ('o', 'ɒ'): 0.7,
    ('u', 'ʊ'): 0.8, ('u', 'uː'): 0.9,
    
    # Consonant similarity (same consonant = 1.0)
    ('b', 'p'): 0.7, ('d', 't'): 0.7, ('g', 'k'): 0.7,
    ('v', 'f'): 0.7, ('z', 's'): 0.7, ('ʒ', 'ʃ'): 0.7,
    ('m', 'n'): 0.6, ('n', 'ŋ'): 0.6,
    ('r', 'l'): 0.5, ('j', 'i'): 0.5, ('w', 'u'): 0.5,
    # More similar sounds for comprehensive coverage
    ('ð', 'θ'): 0.7, ('ʒ', 'dʒ'): 0.7, ('ʃ', 'tʃ'): 0.7,
    ('æ', 'ɛ'): 0.6, ('ɑ', 'ɔ'): 0.6, ('ə', 'ʌ'): 0.8,
    ('eɪ', 'e'): 0.7, ('oʊ', 'o'): 0.7, ('aɪ', 'a'): 0.5,
    ('aʊ', 'a'): 0.5, ('ɔɪ', 'ɔ'): 0.5
}

# Make the similarity matrix symmetric
for (a, b), score in list(PHONEME_SIMILARITY.items()):
    if (b, a) not in PHONEME_SIMILARITY:
        PHONEME_SIMILARITY[(b, a)] = score

def phonetic_edit_distance(seq1: str, seq2: str) -> float:
    """
    Calculate phonetic edit distance with enhanced phonetic similarity consideration
    
    Args:
        seq1: First phonetic sequence
        seq2: Second phonetic sequence
        
    Returns:
        float: Edit distance with phonetic similarity consideration
    """
    # Handle empty sequences
    if not seq1 and not seq2:
        return 0.0
    if not seq1:
        return len(seq2)
    if not seq2:
        return len(seq1)
    
    size_x = len(seq1) + 1
    size_y = len(seq2) + 1
    matrix = np.zeros((size_x, size_y))
    
    # Initialize first row and column
    for x in range(size_x):
        matrix[x, 0] = x
    for y in range(size_y):
        matrix[0, y] = y
    
    # Fill the matrix
    for x in range(1, size_x):
        for y in range(1, size_y):
            # If the phonemes are identical
            if seq1[x-1].lower() == seq2[y-1].lower():
                matrix[x, y] = matrix[x-1, y-1]
            else:
                # Check if there's a similarity score for these phonemes
                similarity = PHONEME_SIMILARITY.get((seq1[x-1].lower(), seq2[y-1].lower()), 0)
                
                # Calculate substitution cost based on similarity
                # Higher similarity = lower cost
                sub_cost = 1.0 - similarity
                
                matrix[x, y] = min(
                    matrix[x-1, y] + 1,          # deletion
                    matrix[x-1, y-1] + sub_cost, # substitution
                    matrix[x, y-1] + 1           # insertion
                )
    
    return matrix[size_x-1, size_y-1]

def calculate_word_accuracy(expected: str, transcribed: str) -> float:
    """
    Calculate pronunciation accuracy for a word using phonetic edit distance
    
    Args:
        expected: Expected pronunciation (could be phonetic transcription)
        transcribed: Actual transcribed pronunciation
        
    Returns:
        float: Accuracy score between 0-100
    """
    # Handle edge cases
    if not expected or expected == '-':
        return 0.0
    
    if not transcribed or transcribed == '-':
        return 0.0
    
    # Clean punctuation
    expected_clean = ''.join([c for c in expected.lower() if c not in punctuation])
    transcribed_clean = ''.join([c for c in transcribed.lower() if c not in punctuation])
    
    # If either is empty after cleaning
    if not expected_clean or not transcribed_clean:
        return 0.0
    
    # Calculate edit distance using phonetic distance
    distance = phonetic_edit_distance(expected_clean, transcribed_clean)
    
    # Calculate accuracy as percentage of matching phonemes
    max_length = max(len(expected_clean), len(transcribed_clean))
    accuracy = 100 * (1 - (distance / max_length)) if max_length > 0 else 0
    
    # Apply logarithmic penalty for longer words to prevent small errors having too large impact
    if max_length > 5:
        error_ratio = distance / max_length
        # Apply stronger penalty for errors in longer words
        accuracy = 100 * (1 - error_ratio * (1 + 0.1 * np.log(max_length/5)))
        accuracy = max(0, accuracy)  # Ensure accuracy doesn't go negative
    
    return accuracy

def align_words_using_dtw(expected_words: list, transcribed_words: list) -> Tuple[list, list]:
    """
    Align transcribed words to expected words using Dynamic Time Warping
    
    Args:
        expected_words: List of expected words
        transcribed_words: List of transcribed words
        
    Returns:
        tuple: (mapped_words, mapped_indices)
    """
    # Handle empty inputs
    if not expected_words:
        return [], []
        
    if not transcribed_words:
        return ['-'] * len(expected_words), [-1] * len(expected_words)
    
    # Create distance matrix with an additional row for handling missing words
    distance_matrix = np.zeros((len(transcribed_words) + 1, len(expected_words)))
    
    # Calculate distances between all pairs of words
    for i, trans_word in enumerate(transcribed_words):
        for j, exp_word in enumerate(expected_words):
            # Use improved phonetic distance for better alignment
            if hasattr(trans_word, 'lower') and hasattr(exp_word, 'lower'):
                distance_matrix[i, j] = phonetic_edit_distance(
                    trans_word.lower(), exp_word.lower())
            else:
                # Fallback for non-string inputs
                distance_matrix[i, j] = 1.0
    
    # Last row is for missing words
    for j in range(len(expected_words)):
        if hasattr(expected_words[j], '__len__'):
            distance_matrix[-1, j] = len(expected_words[j])
        else:
            distance_matrix[-1, j] = 1.0
    
    # Use DTW to find optimal alignment
    try:
        alignment = dtw_from_distance_matrix(distance_matrix.T)
        path = alignment.get_warping_path()
        
        # Extract mapped words and indices
        mapped_words = []
        mapped_indices = []
        
        for i in range(len(expected_words)):
            # Find where this expected word appears in the path
            if len(path.shape) == 1:
                matches = np.where(path == i)[0]
            else:
                matches = np.where(path[:, 1] == i)[0]
            
            if len(matches) == 0:
                # Word not found in path
                mapped_words.append('-')
                mapped_indices.append(-1)
            else:
                # Find the corresponding transcribed word index
                if len(path.shape) == 1:
                    trans_idx = matches[0]
                else:
                    trans_idx = path[matches[0], 0]
                
                if trans_idx < len(transcribed_words):
                    mapped_words.append(transcribed_words[trans_idx])
                    mapped_indices.append(int(trans_idx))
                else:
                    # Word mapped to blank
                    mapped_words.append('-')
                    mapped_indices.append(-1)
        
        return mapped_words, mapped_indices
    
    except Exception as e:
        print(f"Error in DTW alignment: {e}")
        return ['-'] * len(expected_words), [-1] * len(expected_words)

def analyze_pronunciation_errors(expected: str, transcribed: str) -> Dict:
    """
    Analyze specific pronunciation errors with detailed breakdown
    
    Args:
        expected: Expected pronunciation
        transcribed: Actual transcribed pronunciation
        
    Returns:
        dict: Error analysis with counts of different error types
    """
    # Handle missing or empty inputs
    if not expected or not transcribed or expected == '-' or transcribed == '-':
        return {
            'substitutions': 0,
            'deletions': len(expected) if expected and expected != '-' else 0,
            'insertions': 0,
            'total_errors': len(expected) if expected and expected != '-' else 0,
            'specific_errors': []  # List of specific error details
        }
    
    # Clean punctuation
    expected_clean = ''.join([c for c in expected.lower() if c not in punctuation])
    transcribed_clean = ''.join([c for c in transcribed.lower() if c not in punctuation])
    
    # Initialize edit distance matrix
    m, n = len(expected_clean), len(transcribed_clean)
    dp = [[0 for _ in range(n + 1)] for _ in range(m + 1)]
    
    # Fill the DP table
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
        
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if expected_clean[i-1] == transcribed_clean[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j],      # deletion
                                   dp[i][j-1],      # insertion
                                   dp[i-1][j-1])    # substitution
    
    # Trace back to collect detailed error information
    i, j = m, n
    substitutions = deletions = insertions = 0
    specific_errors = []
    
    while i > 0 or j > 0:
        if i > 0 and j > 0 and expected_clean[i-1] == transcribed_clean[j-1]:
            # Match
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i-1][j-1] + 1:
            # Substitution
            substitutions += 1
            specific_errors.append({
                'type': 'substitution',
                'expected': expected_clean[i-1],
                'actual': transcribed_clean[j-1],
                'position': i-1
            })
            i -= 1
            j -= 1
        elif i > 0 and dp[i][j] == dp[i-1][j] + 1:
            # Deletion
            deletions += 1
            specific_errors.append({
                'type': 'deletion',
                'expected': expected_clean[i-1],
                'position': i-1
            })
            i -= 1
        else:
            # Insertion
            insertions += 1
            specific_errors.append({
                'type': 'insertion',
                'actual': transcribed_clean[j-1],
                'position': j-1
            })
            j -= 1
    
    total_errors = substitutions + deletions + insertions
    
    return {
        'substitutions': substitutions,
        'deletions': deletions,
        'insertions': insertions,
        'total_errors': total_errors,
        'specific_errors': specific_errors
    }

def get_pronunciation_category(accuracy: float, thresholds: np.ndarray = np.array([80, 60, 59])) -> int:
    """
    Determine pronunciation category based on accuracy score
    
    Args:
        accuracy: Accuracy score (0-100)
        thresholds: Category thresholds
        
    Returns:
        int: Category index (0=excellent, 1=good, 2=poor)
    """
    return np.argmin(abs(thresholds - accuracy))

def generate_pronunciation_feedback(error_analysis: Dict) -> str:
    """
    Generate helpful feedback based on error analysis
    
    Args:
        error_analysis: Dictionary with error analysis data
        
    Returns:
        str: Feedback message suggesting improvements
    """
    if error_analysis['total_errors'] == 0:
        return "Excellent pronunciation. Keep it up!"
    
    feedback = []
    
    # Check for patterns in errors
    specific_errors = error_analysis.get('specific_errors', [])
    
    # Common substitution patterns
    sub_pairs = {}
    for error in specific_errors:
        if error['type'] == 'substitution':
            pair = (error['expected'], error['actual'])
            sub_pairs[pair] = sub_pairs.get(pair, 0) + 1
    
    # Find most common substitution errors
    common_subs = sorted(sub_pairs.items(), key=lambda x: x[1], reverse=True)[:2]
    
    if common_subs:
        for (expected, actual), count in common_subs:
            feedback.append(f"You're pronouncing '{expected}' as '{actual}'. ")
    
    # General feedback based on error types
    if error_analysis['deletions'] > error_analysis['insertions'] and error_analysis['deletions'] > error_analysis['substitutions']:
        feedback.append("Try not to skip sounds when pronouncing words.")
    elif error_analysis['insertions'] > error_analysis['deletions'] and error_analysis['insertions'] > error_analysis['substitutions']:
        feedback.append("Try not to add extra sounds when pronouncing words.")
    elif error_analysis['substitutions'] > 0:
        feedback.append("Focus on the correct sound production for better pronunciation.")
    
    if not feedback:
        feedback.append("Practice more for clearer pronunciation.")
    
    return " ".join(feedback)
