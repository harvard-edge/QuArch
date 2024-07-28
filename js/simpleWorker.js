self.onmessage = function(event) {
    console.log("Worker received message:", event.data);
    try {
        const response = "Worker received message: " + JSON.stringify(event.data);
        console.log("Worker sending response:", response);
        self.postMessage(response);
    } catch (error) {
        console.error("Worker processing error:", error);
        self.postMessage({ error: error.message });
    }
};