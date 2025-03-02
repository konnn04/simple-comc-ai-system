import json
import random
import os
import time


def random_exam(subject=None, exam_type=None, num_questions = 10):
    # Tạo ID tăng dần theo thời gian (mili giây)
    id = str(int(time.time() * 1000))
    questions = []
    with open(os.path.join('myapp', 'data', 'EZ_1.json'), 'r', encoding='utf-8') as f:
        questions = json.load(f).get("questions")

    questions = random.sample(questions, num_questions)
    # Tách đáp án ra khỏi câu hỏi
    q = []
    a = []
    for question in questions:
        q.append({
            "question": question.get("question"),
            "options": question.get("options")
        })
        a.append({
            "answer": question.get("correct_answer"),
            "explanation": question.get("explanation")
        })
    
    # print(a)
    return {"questions": q, "answers": a, "id": id}

def check_score(answers, answers_session):
    if len(answers) != len(answers_session):
        return -1
    score = 0
    for i in range(len(answers)):
        if answers[i] == answers_session[i].get("answer"):
            score += 1
    return score

def check_score_speaking(answers, answers_session):
    if len(answers) != len(answers_session):
        return -1
    score = 0
    # If answer is int -> 0 = "A", 1 = "B", 2 = "C", 3 = "D"
    # If answer is str answers == answers_session
    # If answer is bool -> True = True, False = False
    for i in range(len(answers)):
        if compare_answer(answers[i], answers_session[i]):
            score += 1
            
# Hàm so sánh tương đồng giữa câu trả lời và đáp án
def compare_answer(answer, answer_session):
    if type(answer) == int:
        chars = "ABCD"
        return chars[answer] == answer_session
    if type(answer) == str:
        # So sánh chuỗi không phân biệt hoa thường và chấp nhận sai lệch 1 ký tự khi chuỗi > 5 ký tự. VD: "hello" và "hellp" vẫn chấp nhận, "apple" và 'allpe' không chấp nhận
        if len(answer) > 5:
            if answer.lower() == answer_session.lower():
                return True
            count = 0
            for i in range(len(answer)):
                if answer[i].lower() != answer_session[i].lower():
                    count += 1
            return count <= len(answer) // 5
        return answer.lower() == answer_session.lower()
    if type(answer) == bool:
        return answer == answer_session
    return False


