# code written with support of ChatGPT

# script that accepts test_FINAL.jsonl and adds model correctness data, creating test_FINAL_post-processed.json

import json

def load_json(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

def process_test_final(test_final_path, field_file_paths, output_path):
    with open(test_final_path, 'r') as f:
        test_final_data = [json.loads(line) for line in f]
    
    model_data = {}
    for model_name, file_path in field_file_paths.items():
        model_data[model_name] = load_json(file_path)
    
    model_questions_data = {}
    for model_name, data in model_data.items():
        question_dict = {}
        for item in data:
            question_text = item['doc']['question'] 
            if 'acc' in item:
                question_dict[question_text] = item['acc']
            else:
                expected_label = item['data_review_info'][0]['Expected Label']
                predicted_label = item['data_review_info'][0]['Predicted Label']
                question_dict[question_text] = 1.0 if expected_label == predicted_label else 0.0
        model_questions_data[model_name] = question_dict
    
    for entry in test_final_data:
        question_text = entry['question'] 
        print(f"Processing question: {question_text}")  
        
        for model_name, questions_data in model_questions_data.items():
            if question_text in questions_data:
                value = questions_data[question_text]
                entry[model_name] = 1 if value == 1.0 else 0
                print(f"Assigned {model_name}: {entry[model_name]}")  
            else:
                entry[model_name] = "NA"
                print(f"Assigned {model_name}: NA (no match)") 
    
    with open(output_path, 'w') as f:
        for entry in test_final_data:
            f.write(json.dumps(entry) + '\n')

test_final_path = 'test_FINAL.jsonl'
output_path = 'test_FINAL_post-processed.json'
field_file_paths = {
    "claude-3.5": "./eval_results/anthropic__claude-3.5-sonnet/samples_QuArch_v1_2024-10-15_claude-3_5-sonnet_0-1547_post-processed.json",
    "gemini-1.5": "./eval_results/google__gemini-1.5-pro/samples_QuArch_v1_2024-10-15_gemini-1_5-pro_0-1547_post-processed.json",
    "gemma-2-2b": "./eval_results/google__gemma-2-2b-it/samples_QuArch_v1_2024-10-01T07-25-45.719370.json",
    "gemma-2-9b": "./eval_results/google__gemma-2-9b-it/samples_QuArch_v1_2024-10-01T07-31-20.757028.json",
    "gemma-2-27b": "./eval_results/google__gemma-2-27b-it/samples_QuArch_v1_2024-10-15T11-37-45.149345.json",
    "llama-3.2-1b": "./eval_results/meta-llama__Llama-3.2-1B-Instruct/samples_QuArch_v1_2024-10-15T12-12-55.109480.json",
    "llama-3.2-3b": "./eval_results/meta-llama__Llama-3.2-3B-Instruct/samples_QuArch_v1_2024-10-15T12-22-29.390891.json",
    "llama-3.1-8b": "./eval_results/meta-llama__Meta-Llama-3.1-8B-Instruct/samples_QuArch_v1_2024-10-01T07-22-22.292170.json",
    "llama-3.1-70b": "./eval_results/meta-llama__Meta-Llama-3.1-70B-Instruct/samples_QuArch_v1_2024-10-02T16-34-55.767831_llama-3.1-70b_post-processed.json",
    "mistral-7b": "./eval_results/mistralai__Mistral-7B-Instruct-v0.3/samples_QuArch_v1_2024-10-01T07-40-43.607362.json",
    "gpt-4o": "./eval_results/openai__gpt-4o/samples_QuArch_v1_2024-10-02T17-02-10.910773_gpt-4o_post-processed.json"
}

process_test_final(test_final_path, field_file_paths, output_path)
