# code written with support of ChatGPT

# script that checks percentages of correctness in preprocessed model data files

import json

def calculate_matching_percentage(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)

    total_questions = 0
    matching_labels = 0
    na_count = 0  

    for entry in data:
        for review_info in entry.get("data_review_info", []):
            expected_label = review_info.get("Expected Label")
            predicted_label = review_info.get("Predicted Label")

            if expected_label is None or predicted_label is None:
                na_count += 1
                continue

            total_questions += 1
            if expected_label == predicted_label:
                matching_labels += 1

    if total_questions > 0:
        percentage = (matching_labels / total_questions) * 100
    else:
        percentage = 0

    print(f"Total Questions (excluding NAs): {total_questions}")
    print(f"Matching Labels (Expected == Predicted): {matching_labels}")
    print(f"NA Count (skipped entries): {na_count}")
    print(f"Percentage of questions where 'Expected Label' == 'Predicted Label': {percentage:.2f}%")

file_path = '/Users/sgiannuzzi/Desktop/QuArch/input/eval_results/google__gemini-1.5-pro/samples_QuArch_v1_2024-10-15_gemini-1_5-pro_0-1547_post-processed.json'
calculate_matching_percentage(file_path)
