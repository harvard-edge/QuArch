import requests
import json
from label_studio_sdk import Client

LABEL_STUDIO_URL = "https://app.heartex.com"
API_KEY = "d0489d9470f62d08d26cf49946d8b5383b847bcf"
PROJECT_ID = 118163
PROJECT_ENDPOINT = f"{LABEL_STUDIO_URL}/api/projects/{PROJECT_ID}"
EXPORT_ENDPOINT = f"{LABEL_STUDIO_URL}/api/projects/{PROJECT_ID}/export?include=completed_by,user"

OUTPUT_FILENAME = 'label_studio_data.json'

def download_data():
    """Connects to Label Studio, fetches all project tasks, and saves them as a JSON file."""
    # Initialize the Label Studio client using the SDK
    ls = Client(url=LABEL_STUDIO_URL, api_key=API_KEY)
    
    try:
        # Check if we can connect to Label Studio
        ls.check_connection()
        print('Successfully connected to Label Studio.')
    except Exception as e:
        print(f"Failed to connect to Label Studio: {e}")
        return

    try:
        # Get the project object
        project = ls.get_project(PROJECT_ID)
        print(f"Connected to project: {PROJECT_ID}")
        
        # Step 1: Get all users for this project and build a user ID -> email lookup table
        users = get_project_users(project)
        
        # Step 2: Get all tasks using export_tasks instead of get_labeled_tasks
        print("Fetching all project tasks (not just labeled tasks)...")
        data_from_label_studio = project.export_tasks()  # This gets **all tasks**
        print(f"Successfully fetched {len(data_from_label_studio)} tasks.")

        # Step 3: Extract annotator emails and enrich the data
        enriched_data = extract_annotator_emails(data_from_label_studio, users)

        # Step 4: Write the enriched data to a file
        with open(OUTPUT_FILENAME, 'w') as f:
            json.dump(enriched_data, f, indent=2)
        
        print(f"Data successfully downloaded and saved as {OUTPUT_FILENAME}.")
    
    except Exception as e:
        print(f"Error occurred while downloading data: {e}")


def get_project_users(project):
    """
    Fetches the list of users in the project and returns a lookup dictionary for user_id -> email.
    """
    try:
        print("Fetching project users...")
        members = project.get_members()
        
        # Print out the members so we can understand the structure
        print("Project Members:", members)

        user_lookup = {}

        for member in members:
            # Access the user attributes directly
            user_id = member['id'] if 'id' in member else member.id
            email = member['email'] if 'email' in member else member.email

            if user_id and email:
                user_lookup[user_id] = email  # Map user_id to email
        
        print(f"Successfully extracted {len(user_lookup)} users from the project.")
        return user_lookup
    
    except Exception as e:
        print(f"Error occurred while fetching project users: {e}")
        return {}


def extract_annotator_emails(data, users):
    """
    Extracts the annotator's email from each annotation in the dataset.
    Args:
    - data: List of tasks and annotations from Label Studio
    - users: Dictionary mapping user_id -> email
    """
    for task in data:
        for annotation in task.get('annotations', []):
            completed_by = annotation.get('completed_by', None)
            
            if isinstance(completed_by, int):  # If completed_by is just a user ID, look it up in the users dict
                email = users.get(completed_by, f"User {completed_by}")
                annotation['annotator_email'] = email
            elif isinstance(completed_by, dict):  # If completed_by is a dict, look for an email inside it
                email = completed_by.get('email', None)
                if email:
                    annotation['annotator_email'] = email  
            else:
                annotation['annotator_email'] = "Unknown User"
    
    return data


if __name__ == "__main__":
    download_data()