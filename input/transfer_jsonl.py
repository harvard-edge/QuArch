import json

def convert_jsonl_to_json(jsonl_file, output_json_file):
    data_list = []
    
    # Read the JSONL file and append each line's data to the list
    with open(jsonl_file, 'r') as infile:
        for line in infile:
            try:
                # Parse each line as JSON and append to the list
                data = json.loads(line.strip())
                data_list.append(data)
            except json.JSONDecodeError as e:
                print(f"Error parsing line: {line.strip()}")
                print(f"Error details: {e}")
                continue
    
    # Write the list as a JSON file
    with open(output_json_file, 'w') as outfile:
        json.dump(data_list, outfile, indent=4)  # Writing the list as a JSON array with indentation for readability

    print(f"JSON file saved as {output_json_file}")

if __name__ == "__main__":
    # Input JSONL file path
    input_jsonl_file = 'test_FINAL_post-processed.jsonl'
    
    # Output JSON file path
    output_json_file = 'test_FINAL_post-processed.json'
    
    # Convert the JSONL file to a JSON file
    convert_jsonl_to_json(input_jsonl_file, output_json_file)
