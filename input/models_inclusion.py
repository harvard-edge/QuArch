# run this script to include correctness in master QuArch json
import json

def add_model_fields(input_file, output_file, models):
    with open(input_file, 'r') as f:
        data = json.load(f)

    for item in data['data']:
        for paragraph in item['paragraphs']:
            for qa in paragraph['qas']:
                for model in models:
                    qa[model] = {
                        "val_zs": "NA",
                        "val_sft": "NA",
                        "test_zs": "NA",
                        "test_sft": "NA"
                    }

    with open(output_file, 'w') as f:
        json.dump(data, f, indent=4)

if __name__ == "__main__":
    input_file = 'QuArch_v0_2_0.json'
    output_file = 'QuArch_v0_2_0_modified.json'
    models = ["llama3-8B", "llama3-70B", "mistral-7B"]

    add_model_fields(input_file, output_file, models)
