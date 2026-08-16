import json
lines = open('C:/Users/ovt57/.gemini/antigravity/brain/6d5f4602-7bca-44dc-abd1-4c97d84b713b/.system_generated/logs/transcript.jsonl', encoding='utf-8').readlines()
user_inputs = []
for line in lines:
    if '"type":"USER_INPUT"' in line:
        try:
            d = json.loads(line)
            content = d['content'].split('\n')
            if len(content) > 1:
                user_inputs.append(content[1])
        except Exception as e:
            pass
open('user_prompts.txt', 'w', encoding='utf-8').write('\n'.join(user_inputs))
