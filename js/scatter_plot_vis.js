import * as d3 from 'https://cdn.skypack.dev/d3@7';

function zoomed(event) {
    const g = d3.select("g");
    g.attr("transform", event.transform);
}

async function loadAndProcessData() {
    const data = await d3.json("./input/test_FINAL_post-processed.json");

    const embeddings = data.map(questionData => ({
        question: questionData.question,
        embedding: questionData.embedding,
        category: questionData.taxonomy["0"].split(':')[0],
        modelsData: {
            "claude-3": questionData["claude-3"],
            "gemini-1.5": questionData["gemini-1.5"],
            "gemma-2-2b": questionData["gemma-2-2b"],
            "gemma-2-9b": questionData["gemma-2-9b"],
            "gemma-2-27b": questionData["gemma-2-27b"],
            "llama-3.2-1b": questionData["llama-3.2-1b"],
            "llama-3.2-3b": questionData["llama-3.2-3b"],
            "llama-3.1-8b": questionData["llama-3.1-8b"],
            "llama-3.1-70b": questionData["llama-3.1-70b"],
            "mistral-7b": questionData["mistral-7b"],
            "gpt-4o": questionData["gpt-4o"]
        }
    }));

    const vectors = embeddings.map(d => d.embedding);
    const questions = embeddings.map(d => d.question);
    const categories = embeddings.map(d => d.category);
    const modelsData = embeddings.map(d => d.modelsData);

    return { vectors, questions, categories, modelsData };
}

function resetSelection(g, colorScale, customColors, hullGroup, isSecondVis) {
    g.selectAll("circle")
        .attr("r", 3)
        .style("fill", d => isSecondVis ? "#CCCCCC" : d.defaultColor)
        .style("opacity", 1);

    g.selectAll(".label text")
        .style("opacity", 1)
        .attr("fill", d => isSecondVis ? "#555555" : (customColors[d.category] || colorScale(d.category)));

    hullGroup.selectAll(".hull").remove();
}

function createLegend(svg) {
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(20,20)");

    const legendData = [
        { color: "#00FF00", label: "Correct" },
        { color: "#FF0000", label: "Incorrect" }
    ];

    const legendItem = legend.selectAll(".legend-item")
        .data(legendData)
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItem.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", d => d.color);

    legendItem.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", "0.35em")
        .text(d => d.label);

    return legend;
}

export async function loadScatterPlotVis() {
    const container = document.querySelector('.visualization-container');
    container.innerHTML = `
        <h5 class="text-center" id="scatter-header">Scatter of Questions across Hardware Terms</h5>
        <svg></svg>
        <div id="controls" style="display: none;">
            <label for="model-dropdown">Select Model:</label>
            <select id="model-dropdown"></select>
            <button id="enter-model" class="btn btn-primary" style="margin-left: 10px;">Enter</button>
        </div>
        <p class="text-center">
            <button id="show-second-vis" class="btn btn-primary" style="margin-top: 10px;">Correctness Across Models</button>
            <button id="return-to-first-vis" class="btn btn-primary" style="margin-top: 10px; display: none;">Total Question Distribution</button>
        </p>
    `;

    const svg = d3.select(".visualization-container svg")
        .attr("width", "100%")
        .attr("height", "500px")
        .call(d3.zoom().scaleExtent([0.5, 10]).on("zoom", zoomed));

    const width = parseInt(svg.style("width"));
    const height = parseInt(svg.style("height"));

    const tooltip = d3.select(".tooltip");

    const { vectors, questions, categories, modelsData } = await loadAndProcessData();

    const tsneWorker = new Worker('./js/tsneWorker.js');
    const iterations = 300;

    tsneWorker.postMessage({ vectors, iterations });

    tsneWorker.onmessage = function(event) {
        const reducedVectors = event.data;

        const xScale = d3.scaleLinear()
            .domain(d3.extent(reducedVectors, d => d[0]))
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(reducedVectors, d => d[1]))
            .range([0, height]);

        const uniqueCategories = Array.from(new Set(categories));

        const colorPalette = d3.schemeTableau10.concat(d3.schemeSet3, d3.schemePaired, d3.schemeDark2, d3.schemeAccent);
        const colorScale = d3.scaleOrdinal(colorPalette).domain(uniqueCategories);

        const customColors = {
            "Reconfigurable Architectures (FPGA / CGRA)": "#FFA500",
            "Interconnection Networks": "#351fb4"
        };

        const points = reducedVectors.map((coords, i) => ({
            x: xScale(coords[0]),
            y: yScale(coords[1]),
            text: questions[i],
            category: categories[i],
            modelsData: modelsData[i],
            color: customColors[categories[i]] || colorScale(categories[i]),
            defaultColor: customColors[categories[i]] || colorScale(categories[i])
        }));

        const g = svg.append("g");

        const hullGroup = g.append("g").attr("class", "hulls");

        const renderPoints = () => {
            const circles = g.selectAll("circle")
                .data(points)
                .enter().append("circle")
                .attr("r", 3)
                .attr("cx", d => d.x)
                .attr("cy", d => d.y)
                .style("fill", d => d.color)
                .attr("class", d => `point ${d.category.replace(/\s+/g, '-')}`)
                .on("mouseover", function(event, d) {
                    tooltip.html(`<strong>Category: ${d.category}<br>Question: ${d.text}</strong>`)
                        .style("left", `${event.pageX + 15}px`)
                        .style("top", `${event.pageY + 15}px`)
                        .style("opacity", 1)
                        .style("visibility", "visible")
                        .classed("show", true);
                })
                .on("mouseout", function() {
                    tooltip.classed("show", false)
                        .style("opacity", 0)
                        .style("visibility", "hidden");
                });
        };

        renderPoints();

        const centroids = {};
        uniqueCategories.forEach(category => {
            const categoryPoints = points.filter(p => p.category === category);
            const xMedian = d3.median(categoryPoints, d => d.x);
            const yMedian = d3.median(categoryPoints, d => d.y);
            centroids[category] = { x: xMedian, y: yMedian };
        });

        const labels = uniqueCategories.map(category => ({
            category,
            x: centroids[category].x,
            y: centroids[category].y
        }));

        const labelGroups = g.selectAll("g.label")
            .data(labels)
            .enter().append("g")
            .attr("class", "label")
            .attr("transform", d => `translate(${d.x}, ${d.y})`)
            .style("pointer-events", "all");

        labelGroups.each(function(d) {
            const group = d3.select(this);
            const text = group.append("text")
                .attr("x", 0)
                .attr("y", 0)
                .attr("dy", "0.35em")
                .attr("text-anchor", "middle")
                .attr("fill", customColors[d.category] || colorScale(d.category))
                .attr("font-size", "18px")
                .attr("font-weight", "bold")
                .text(d.category);

            const bbox = text.node().getBBox();
            const padding = 4;

            group.insert("rect", "text")
                .attr("x", bbox.x - padding)
                .attr("y", bbox.y - padding)
                .attr("width", bbox.width + 2 * padding)
                .attr("height", bbox.height + 2 * padding)
                .attr("fill", "white")
                .attr("opacity", 0.7)
                .attr("rx", 4)
                .attr("ry", 4);
        });

        labelGroups.style("pointer-events", "all");

        const legend = createLegend(svg);
        legend.style("display", "none"); // Hide the legend initially

        function updateScatterPlot(isSecondVis = false, selectedCategory = null) {
            const selectedModel = document.getElementById("model-dropdown").value;

            g.selectAll("circle")
                .attr("r", function(p) {
                    if (isSecondVis) {
                        const modelResult = p.modelsData[selectedModel];
                        if (modelResult !== "NA") {
                            return 5; // Increase radius if model data exists
                        }
                        return 3;
                    }
                    return 3;
                })
                .style("fill", function(p) {
                    if (isSecondVis) {
                        const modelResult = p.modelsData[selectedModel];
                        return modelResult === 1 ? "#00FF00" : "#FF0000"; // Green for correct, red for incorrect
                    }
                    if (selectedCategory && p.category.replace(/\s+/g, '-') === selectedCategory) {
                        return p.defaultColor;
                    }
                    return selectedCategory ? "#CCCCCC" : p.defaultColor;
                })
                .style("opacity", function(p) {
                    if (isSecondVis) {
                        return p.modelsData[selectedModel] !== "NA" ? 1 : 0.1;
                    }
                    return selectedCategory ? (p.category.replace(/\s+/g, '-') === selectedCategory ? 1 : 0.1) : 1;
                });
        }

        document.getElementById('show-second-vis').addEventListener('click', function() {
            resetSelection(g, colorScale, customColors, hullGroup, true);
            const controls = document.getElementById('controls');
            const showSecondVisButton = document.getElementById('show-second-vis');
            const returnFirstVisButton = document.getElementById('return-to-first-vis');
            const header = document.getElementById('scatter-header');

            controls.style.display = 'block';
            showSecondVisButton.style.display = 'none';
            returnFirstVisButton.style.display = 'inline-block';
            header.textContent = 'Model Correctness Across Hardware Terms';

            const modelDropdown = d3.select("#model-dropdown");
            const modelList = ["claude-3", "gemini-1.5", "gemma-2-2b", "gemma-2-9b", "gemma-2-27b", "llama-3.2-1b", "llama-3.2-3b", "llama-3.1-8b", "llama-3.1-70b", "mistral-7b", "gpt-4o"];

            modelDropdown.selectAll('option').remove();
            modelList.forEach(model => {
                modelDropdown.append("option")
                    .attr("value", model)
                    .text(model);
            });

            modelDropdown.property("value", "llama-3.1-8b");
            updateScatterPlot(true);

            g.selectAll(".label text")
                .attr("fill", "#555555")
                .style("opacity", 1);

            svg.on("click", function(event) {
                if (event.target.tagName !== 'circle' && event.target.tagName !== 'text') {
                    updateScatterPlot(true);
                }
            });

            legend.style("display", "block");
        });

        document.getElementById('enter-model').addEventListener('click', function() {
            updateScatterPlot(true); // Update the scatter plot when "Enter" button is clicked
        });

        document.getElementById('return-to-first-vis').addEventListener('click', function() {
            resetSelection(g, colorScale, customColors, hullGroup, false);
            const controls = document.getElementById('controls');
            const showSecondVisButton = document.getElementById('show-second-vis');
            const returnFirstVisButton = document.getElementById('return-to-first-vis');
            const header = document.getElementById('scatter-header');

            controls.style.display = 'none';
            showSecondVisButton.style.display = 'inline-block';
            returnFirstVisButton.style.display = 'none';
            header.textContent = 'Scatter of Questions across Hardware Terms';

            g.selectAll("circle")
                .attr("r", 3)
                .style("fill", d => d.defaultColor)
                .style("opacity", 1);

            g.selectAll(".label text")
                .style("opacity", 1)
                .attr("fill", d => customColors[d.category] || colorScale(d.category));

            svg.on("click", function(event) {
                if (event.target.tagName !== 'circle' && event.target.tagName !== 'text') {
                    resetSelection(g, colorScale, customColors, hullGroup, false);
                }
            });

            legend.style("display", "none");
        });

        svg.on("click", function(event) {
            if (event.target.tagName !== 'circle' && event.target.tagName !== 'text') {
                resetSelection(g, colorScale, customColors, hullGroup, false);
            }
        });

        updateScatterPlot();
    };

    tsneWorker.onerror = function(error) {
        console.error('Worker error:', error);
    };
}

document.addEventListener('DOMContentLoaded', function() {
    loadScatterPlotVis();
});