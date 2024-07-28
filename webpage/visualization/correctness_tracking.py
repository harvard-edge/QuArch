import json
import os

# Define the fields
fields = ["val_zs", "val_sft", "test_zs", "test_sft"]

# Function to determine the boolean value based on Expected Label and Predicted Label
def determine_boolean_value(input_question, file_data, is_zs_format, is_llama3_format):
    if is_zs_format:
        for key, entry in file_data.items():
            if key not in ["model_name", "adapter"] and isinstance(entry, dict) and entry["Question"] == input_question:
                return entry["Expected Label"] == entry["Predicted Label"]
    elif is_llama3_format:
        for entry in file_data:
            if entry["Question"] == input_question:
                return entry["Expected Label"] == entry["Predicted Label"]
    else:
        for entry in file_data:
            if entry["Question"] == input_question:
                return entry["Expected Label"] == entry["Predicted Label"]
    return "NA"

# Load the QuArch_v0_1_1_Filtered_Errors.json file
with open("input/QuArch_v0_1_1_Filtered_Errors.json", "r") as f:
    quarch_data = json.load(f)

# Iterate through each paragraph in the main file
for paper in quarch_data["data"]:
    for paragraph in paper["paragraphs"]:
        for question in paragraph["qas"]:
            question_text = question["question"]
            
            # Add the new fields for llama2-7B, llama2-13B, phi-3, mistral-7B, and gemma-7B
            question["llama2-7B"] = {}
            question["llama2-13B"] = {}
            question["llama3"] = {}
            question["phi-3"] = {}
            question["mistral-7B"] = {}
            question["gemma-7B"] = {}
            
            # Iterate through the four fields
            for field in fields:
                for model in ["llama2-7B", "llama2-13B", "llama3", "phi-3", "mistral-7B", "gemma-7B"]:
                    # Construct the file path
                    file_path = os.path.join("input", model, f"{model}_QuArch_0_1_1_{field}.json")
                    
                    # Load the corresponding file if it exists
                    if os.path.exists(file_path):
                        with open(file_path, "r") as f:
                            model_data = json.load(f)
                        
                        # Determine if the file is in zs format or sft format
                        is_zs_format = "model_name" in model_data and model.startswith("llama2")
                        is_llama3_format = model == "llama3"
                        
                        # Debugging output
                        print(f"Reading file: {file_path}")
                        if is_zs_format:
                            print(f"File contains {len(model_data) - 2} entries.")  # Exclude 'model_name' and 'adapter'
                        else:
                            print(f"File contains {len(model_data)} entries.")
                        
                        # Determine the boolean value for the question
                        boolean_value = determine_boolean_value(question_text, model_data, is_zs_format, is_llama3_format)
                        
                        # Save the result in the corresponding field
                        question[model][field] = boolean_value
                        
                        # Debugging output
                        print(f"Processed {field} for question: {question_text} - Result: {boolean_value}")

# Save the modified QuArch_v0_1_1_Filtered_Errors.json file
with open("input/QuArch_v0_1_1_Filtered_Errors_modified.json", "w") as f:
    json.dump(quarch_data, f, indent=4)

print("Script execution completed. The modified file has been saved as QuArch_v0_1_1_Filtered_Errors_modified.json")
