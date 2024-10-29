import json

# Load the data from the JSON file
file_path = '/Users/sgiannuzzi/Desktop/QuArch/input/test_FINAL_post-processed.json'  # Replace with your actual file path

# Models to analyze
models = [
    "claude-3", "gemini-1.5", "gemma-2-2b", "gemma-2-9b", "gemma-2-27b",
    "llama-3.2-1b", "llama-3.2-3b", "llama-3.1-8b", "llama-3.1-70b",
    "mistral-7b", "gpt-4o"
]

# Load the JSON data
with open(file_path, 'r') as f:
    data = json.load(f)

# Initialize counters
model_counters = {model: {"count_1": 0, "total": 0} for model in models}

# Count instances for each model
for datapoint in data:
    for model in models:
        if model in datapoint:
            model_counters[model]["total"] += 1
            if datapoint[model] == 1:
                model_counters[model]["count_1"] += 1

# Calculate percentages
percentages = {model: (model_counters[model]["count_1"] / model_counters[model]["total"]) * 100 
               if model_counters[model]["total"] > 0 else 0
               for model in models}

# Print the results
for model, percentage in percentages.items():
    print(f"{model}: {percentage:.2f}%")
