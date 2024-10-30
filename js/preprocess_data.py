# code written with support of ChatGPT

# script that adds coordinates for scatter plot vis into test_FINAL_post-processed.json, creating preprocessed_data.json

import json
from sklearn.manifold import TSNE
import numpy as np
from scipy.spatial.distance import pdist, squareform

with open('/Users/sgiannuzzi/Desktop/QuArch/input/test_FINAL_post-processed.json', 'r') as f:
    data = [json.loads(line) for line in f]  

embeddings = np.array([item['embedding'] for item in data if 'embedding' in item and item['embedding']])
categories = [item['chatgpt_taxonomy']['best_selection'] for item in data]

tsne = TSNE(n_components=2, perplexity=30, n_iter=300)
reduced_embeddings = tsne.fit_transform(embeddings)

category_to_indices = {}
for i, category in enumerate(categories):
    if category not in category_to_indices:
        category_to_indices[category] = []
    category_to_indices[category].append(i)

adjustment_factor = 0.05  
for indices in category_to_indices.values():
    if len(indices) > 1:
        pairwise_distances = squareform(pdist(reduced_embeddings[indices]))
        mean_distance = np.mean(pairwise_distances)

        for i in range(len(indices)):
            for j in range(i + 1, len(indices)):
                if pairwise_distances[i, j] > mean_distance:
                    delta = reduced_embeddings[indices[j]] - reduced_embeddings[indices[i]]
                    reduced_embeddings[indices[i]] += adjustment_factor * delta
                    reduced_embeddings[indices[j]] -= adjustment_factor * delta

for i, item in enumerate(data):
    if 'embedding' in item and item['embedding']: 
        item['x'] = float(reduced_embeddings[i][0])
        item['y'] = float(reduced_embeddings[i][1])

with open('preprocessed_data.json', 'w') as f:
    json.dump(data, f, indent=2)
