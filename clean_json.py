import json
import sys

def clean_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            # Read the content of the file
            content = file.read()

        # Print the first and last few characters of the content for inspection
        print("First 200 characters of the file:")
        print(content[:200])
        print("\nLast 200 characters of the file:")
        print(content[-200:])

        # Attempt to load the content as JSON
        try:
            data = json.loads(content)
            print("JSON is valid. No cleanup needed.")
        except json.JSONDecodeError as e:
            print(f"JSONDecodeError: {e}")
            # Try to clean up the content by removing non-JSON parts
            cleaned_content = clean_invalid_json(content)
            try:
                data = json.loads(cleaned_content)
                print("Successfully cleaned the JSON!")
                
                # Save the cleaned JSON to the same or a new file
                save_path = input("Enter the path to save the cleaned JSON file (or press Enter to overwrite): ")
                if not save_path:
                    save_path = file_path
                
                with open(save_path, 'w', encoding='utf-8') as outfile:
                    json.dump(data, outfile, indent=4)
                    print(f"Cleaned JSON saved to {save_path}")
            except json.JSONDecodeError:
                print("Failed to clean the JSON. The file might require manual correction.")
    except FileNotFoundError:
        print(f"File not found: {file_path}")
    except Exception as e:
        print(f"An error occurred: {e}")

def clean_invalid_json(content):
    """
    A basic function to clean up invalid JSON.
    It tries to remove non-JSON text before/after the valid JSON content.
    """
    start = content.find('{')
    end = content.rfind('}')
    
    if start != -1 and end != -1:
        # Extract the potential JSON part
        return content[start:end+1]
    return content  # Return as is if no clear JSON structure found

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python clean_json.py <path_to_json_file>")
    else:
        file_path = sys.argv[1]
        clean_json(file_path)
