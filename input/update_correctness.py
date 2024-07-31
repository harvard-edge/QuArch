import json
import os

def update_correctness(data, model, file_path, field):
    try:
        with open(file_path, 'r') as f:
            file_data = json.load(f)
    except json.JSONDecodeError:
        print(f"Skipping file due to JSON decode error: {file_path}")
        return
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return

    if not file_data:  # If the file contains an empty array, skip it
        print(f"Skipping empty file: {file_path}")
        return

    for qa in file_data:
        for q in qa:
            question = q.get("Question")
            correctness = q.get("Correctness")
            matched = False
            if question is None or correctness is None:
                continue
            for item in data['data']:
                for paragraph in item['paragraphs']:
                    for qas in paragraph['qas']:
                        modified_question = qas["question"].split("\nA)")[0].strip()
                        if modified_question == question.strip():
                            qas[model][field] = correctness
                            matched = True
                            break
                    if matched:
                        break
                if matched:
                    break
            if not matched:
                print(f"No match found for question: {question}")

def main():
    input_file = 'QuArch_v0_2_0_modified.json'
    models = ["llama3-8B", "llama3-70B", "mistral-7B"]
    file_types = ["val_sft", "test_sft", "val_zs", "test_zs"]

    with open(input_file, 'r') as f:
        data = json.load(f)

    for model in models:
        for file_type in file_types:
            file_name = f"{model}/{model}_QuArch_v0_2_0_{file_type}.json"
            if os.path.exists(file_name):
                update_correctness(data, model, file_name, file_type)
            else:
                print(f"File not found: {file_name}")

    with open(input_file, 'w') as f:
        json.dump(data, f, indent=4)

if __name__ == "__main__":
    main()
