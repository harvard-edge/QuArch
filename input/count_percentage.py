# code written with support of ChatGPT

# script that checks percentages of correctness in postprocessed test_FINAL_post-processed.json

import json

file_path = '/Users/sgiannuzzi/Desktop/QuArch/input/test_FINAL_post-processed.json'

models = [
    "claude-3.5", "gemini-1.5", "gemma-2-2b", "gemma-2-9b", "gemma-2-27b",
    "llama-3.2-1b", "llama-3.2-3b", "llama-3.1-8b", "llama-3.1-70b",
    "mistral-7b", "gpt-4o"
]

with open(file_path, 'r') as f:
    data = [json.loads(line) for line in f]

model_counters = {model: {"count_1": 0, "total": 0, "count_NA": 0} for model in models}

for datapoint in data:
    for model in models:
        if model in datapoint:
            value = datapoint[model]
            print(f"Processing {model}: Value {value}")

            if value == 1:  
                model_counters[model]["total"] += 1
                model_counters[model]["count_1"] += 1
            elif value == 0:  
                model_counters[model]["total"] += 1
            elif value == "NA":  
                model_counters[model]["count_NA"] += 1
            else:
                print(f"Unexpected value {value} for model {model}")

for model in models:
    print(f"Model: {model}, Total (excluding NA): {model_counters[model]['total']}, "
          f"Count 1s: {model_counters[model]['count_1']}, "
          f"Count NAs: {model_counters[model]['count_NA']}")

percentages = {model: (model_counters[model]["count_1"] / model_counters[model]["total"]) * 100 
               if model_counters[model]["total"] > 0 else 0
               for model in models}

# Print the percentages
for model, percentage in percentages.items():
    print(f"{model}: {percentage:.2f}%")
