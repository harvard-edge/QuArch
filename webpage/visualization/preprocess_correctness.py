import json
import os

def preprocess_files(model_names, input_dir):
    for model_name in model_names:
        for dataset in ["test_zs", "val_zs", "test_sft", "val_sft"]:
            # Construct file path
            file_path = os.path.join(input_dir, model_name, f"{model_name}_QuArch_0_1_1_{dataset}.json")
            
            # Check if the file exists
            if os.path.exists(file_path):
                with open(file_path, "r") as f:
                    data = json.load(f)
                
                # Process each entry
                for entry in data:
                    input_text = entry["Input"]
                    
                    # Extract the question from the input text
                    start_index = input_text.find("The following is a binary choice question (answer with YES or NO) about Hardware Design.") + len("The following is a binary choice question (answer with YES or NO) about Hardware Design.")
                    end_index = input_text.find("\n\n### Response:\n")
                    
                    if start_index != -1 and end_index != -1:
                        question = input_text[start_index:end_index].strip()
                        entry["Question"] = question
                
                # Save the modified data back to the file
                with open(file_path, "w") as f:
                    json.dump(data, f, indent=4)

# Model names
model_names = ["phi-3", "mistral-7B", "gemma-7B", "MPT-7B"]

# Input directory
input_dir = "input"

preprocess_files(model_names, input_dir)
