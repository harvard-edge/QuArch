importScripts('lib/tsne.js');

self.onmessage = function(event) {
    console.log("Worker received message:", event.data);
    try {
        const { vectors, iterations } = event.data;
        console.log("Worker received vectors length:", vectors.length);
        console.log("Worker iterations:", iterations);

        if (!vectors || !Array.isArray(vectors) || vectors.length === 0) {
            throw new Error("Invalid vectors data.");
        }

        const tsneInstance = new tsnejs.tSNE({
            dim: 2,
            perplexity: 30,
        });

        tsneInstance.initDataRaw(vectors);

        for (let i = 0; i < iterations; i++) {
            tsneInstance.step();
        }

        const reducedVectors = tsneInstance.getSolution();
        console.log("Worker computed reduced vectors:", reducedVectors);
        self.postMessage(reducedVectors);
    } catch (error) {
        console.error("Worker processing error:", error);
        self.postMessage({ error: error.message });
    }
};