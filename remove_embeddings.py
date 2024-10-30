import json

def remove_embedding_field(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    
    for item in data:
        if 'embedding' in item:
            del item['embedding']
    
    output_file_path = file_path.replace('.json', '_no_embedding.json')
    with open(output_file_path, 'w') as output_file:
        json.dump(data, output_file, indent=4)
    
    print(f"'embedding' fields removed and saved to {output_file_path}")

file_path = '/Users/sgiannuzzi/Desktop/QuArch/preprocessed_data.json'
remove_embedding_field(file_path)
