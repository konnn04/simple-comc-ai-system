from myapp import root_app, stt
import os
import random
import time

temp_path = os.path.join(root_app, 'static', 'temp')
if not os.path.exists(temp_path):
    os.makedirs(temp_path)

def process_audio_file(audio_file):
    name_file = str(int(time.time())) + str(random.randint(1, 1000))
    audio_file.save(os.path.join(temp_path, name_file + '.wav'))
    result = stt.process_audio_file(os.path.join(temp_path, name_file + '.wav'))
    os.unlink(os.path.join(temp_path, name_file + '.wav'))
    return result