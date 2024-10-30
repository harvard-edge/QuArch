import json
from sklearn.manifold import TSNE
import numpy as np
from scipy.spatial.distance import pdist, squareform

# Load the embeddings from the test_FINAL_post-processed.json file
with open('/Users/sgiannuzzi/Desktop/QuArch/input/test_FINAL_post-processed.json', 'r') as f:
    data = [json.loads(line) for line in f]  # Load as JSONL

# Extract embeddings and corresponding categories for clustering
embeddings = np.array([item['embedding'] for item in data if 'embedding' in item and item['embedding']])
categories = [item['chatgpt_taxonomy']['best_selection'] for item in data]

# Apply t-SNE dimensionality reduction
tsne = TSNE(n_components=2, perplexity=30, n_iter=300)
reduced_embeddings = tsne.fit_transform(embeddings)

# Map categories to clusters
category_to_indices = {}
for i, category in enumerate(categories):
    if category not in category_to_indices:
        category_to_indices[category] = []
    category_to_indices[category].append(i)

# Adjust coordinates for points with the same category
adjustment_factor = 0.05  # Adjust to control the strength of attraction
for indices in category_to_indices.values():
    if len(indices) > 1:
        # Calculate pairwise distances
        pairwise_distances = squareform(pdist(reduced_embeddings[indices]))
        mean_distance = np.mean(pairwise_distances)

        # Bring points closer together if their distance exceeds a threshold
        for i in range(len(indices)):
            for j in range(i + 1, len(indices)):
                if pairwise_distances[i, j] > mean_distance:
                    # Move point i closer to point j
                    delta = reduced_embeddings[indices[j]] - reduced_embeddings[indices[i]]
                    reduced_embeddings[indices[i]] += adjustment_factor * delta
                    reduced_embeddings[indices[j]] -= adjustment_factor * delta

# Update data with adjusted 2D coordinates
for i, item in enumerate(data):
    if 'embedding' in item and item['embedding']:  # Ensure the item has an embedding
        item['x'] = float(reduced_embeddings[i][0])
        item['y'] = float(reduced_embeddings[i][1])

# Save the updated data into preprocessed_data.json as a valid JSON array
with open('preprocessed_data.json', 'w') as f:
    json.dump(data, f, indent=2)
