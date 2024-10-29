import json
import os

input_file = 'test_FINAL.jsonl'
output_file = 'test_FINAL_post-processed.jsonl'

# Dictionary of model names and corresponding data file paths
field_file_paths = {
    "claude-3": "./eval_results/anthropic__claude-3.5-sonnet/samples_QuArch_v1_2024-10-15_claude-3_5-sonnet_0-1547_post-processed.json",
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

def load_samples(file_path):
    samples_data = {}
    try:
        with open(file_path, 'r') as sf:
            samples = json.load(sf)

            for sample in samples:
                question_id = sample.get("doc", {}).get("question_id")

                if "data_review_info" in sample:
                    expected_label = sample["data_review_info"][0].get("Expected Label")
                    predicted_label = sample["data_review_info"][0].get("Predicted Label")

                    if expected_label is not None and predicted_label is not None:
                        samples_data[question_id] = 1 if expected_label == predicted_label else 0
                elif "acc" in sample:
                    acc_value = sample.get("acc")
                    if acc_value is not None:
                        samples_data[question_id] = round(acc_value)
    except json.JSONDecodeError as e:
        print(f"Error reading JSON from {file_path}: {e}")
    except Exception as e:
        print(f"Error processing file {file_path}: {e}")
    
    return samples_data

# Load samples for each model
field_samples_data = {}
for field, file_path in field_file_paths.items():
    if os.path.exists(file_path):
        field_samples_data[field] = load_samples(file_path)
    else:
        print(f"Warning: File not found for {field} at {file_path}")
        field_samples_data[field] = {}

# Set initial fields to 'NA' for each model in the input JSONL file
new_fields = {field: "NA" for field in field_file_paths.keys()}

# Process the input JSONL file and add model-specific data
with open(input_file, 'r') as infile, open(output_file, 'w') as outfile:
    for line_num, line in enumerate(infile, 1):
        try:
            data = json.loads(line.strip())  # Strip to remove extra spaces/newlines
            question_id = data.get("question_id")

            # Populate fields from the loaded sample data
            for field in new_fields:
                if question_id in field_samples_data[field]:
                    data[field] = field_samples_data[field][question_id]
                else:
                    data[field] = "NA"

            # Write updated data to output file
            outfile.write(json.dumps(data) + '\n')
        
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON on line {line_num} of {input_file}: {e}")
        except Exception as e:
            print(f"Unexpected error processing line {line_num}: {e}")

print(f"Updated file saved as {output_file}")
