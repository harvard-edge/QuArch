import * as d3 from 'https://cdn.skypack.dev/d3@7';

function zoomed(event) {
    const g = d3.select("g");
    g.attr("transform", event.transform);
}

async function loadAndProcessData() {
    const data = await d3.json("./input/QuArch_v0_2_0.json");

    const embeddings = data.data.flatMap(paper =>
        paper.paragraphs.flatMap(paragraph =>
            paragraph.qas.map(qa => ({
                question: qa.question,
                embedding: qa.embedding,
                category: qa.taxonomy["0"].split(':')[0], // Extract base category
                modelsData: qa
            }))
        )
    );

    const vectors = embeddings.map(d => d.embedding);
    const questions = embeddings.map(d => d.question);
    const categories = embeddings.map(d => d.category);
    const modelsData = embeddings.map(d => d.modelsData);

    return { vectors, questions, categories, modelsData };
}

function resetSelection(g, colorScale, customColors, hullGroup, isSecondVis) {
    g.selectAll("circle")
        .attr("r", 3) // Reset radius to original size
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
            <select id="model-dropdown"></select>
            <select id="set-dropdown"></select>
            <label><input type="checkbox" id="sft-checkbox"> SFT</label>
            <label><input type="checkbox" id="zs-checkbox" checked> ZS</label>
            <button id="update-vis" class="btn btn-primary" style="margin-top: 10px;">Enter</button>
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
    const iterations = 300; // Further reduced number of iterations for faster computation

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
            "Interconnection Networks": "#351fb4",
            "Reconfigurable Architecture (FPGA/CGRA)": "#FFA500" // Change to a different color, for example, orange
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

        const resolveOverlaps = (labels) => {
            const padding = 10;
            let overlapping = true;

            while (overlapping) {
                overlapping = false;
                for (let i = 0; i < labels.length; i++) {
                    const label1 = labels[i];
                    const tempText1 = svg.append("text").text(label1.category).attr("font-size", "18px");
                    const bbox1 = tempText1.node().getBBox();
                    tempText1.remove();

                    for (let j = i + 1; j < labels.length; j++) {
                        const label2 = labels[j];
                        const tempText2 = svg.append("text").text(label2.category).attr("font-size", "18px");
                        const bbox2 = tempText2.node().getBBox();
                        tempText2.remove();

                        if (Math.abs(label1.x - label2.x) < (bbox1.width + bbox2.width) / 2 + padding &&
                            Math.abs(label1.y - label2.y) < (bbox1.height + bbox2.height) / 2 + padding) {
                            overlapping = true;

                            if (label1.y < label2.y) {
                                label1.y -= bbox1.height + padding;
                                label2.y += bbox2.height + padding;
                            } else {
                                label1.y += bbox1.height + padding;
                                label2.y -= bbox2.height + padding;
                            }
                        }
                    }
                }
            }
        };

        resolveOverlaps(labels);

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
            const selectedSet = document.getElementById("set-dropdown").value;
            const setFieldSFT = `${selectedSet}_sft`;
            const setFieldZS = `${selectedSet}_zs`;
            const showSFT = document.getElementById("sft-checkbox").checked;
            const showZS = document.getElementById("zs-checkbox").checked;

            g.selectAll("circle")
                .attr("r", function(p) {
                    if (isSecondVis) {
                        if ((showSFT && p.modelsData[selectedModel] && p.modelsData[selectedModel][setFieldSFT] !== "NA") ||
                            (showZS && p.modelsData[selectedModel] && p.modelsData[selectedModel][setFieldZS] !== "NA")) {
                            return 5; // Increased radius for emphasis
                        }
                        return 3;
                    }
                    return 3;
                })
                .style("fill", function(p) {
                    if (isSecondVis) {
                        if (selectedCategory && p.category.replace(/\s+/g, '-') === selectedCategory) {
                            if (showSFT && p.modelsData[selectedModel] && p.modelsData[selectedModel][setFieldSFT] !== "NA") {
                                return p.modelsData[selectedModel][setFieldSFT] ? "#00FF00" : "#FF0000";
                            }
                            if (showZS && p.modelsData[selectedModel] && p.modelsData[selectedModel][setFieldZS] !== "NA") {
                                return p.modelsData[selectedModel][setFieldZS] ? "#00FF00" : "#FF0000";
                            }
                            return "#CCCCCC";
                        } else {
                            if (showSFT && p.modelsData[selectedModel] && p.modelsData[selectedModel][setFieldSFT] !== "NA") {
                                return p.modelsData[selectedModel][setFieldSFT] ? "#00FF00" : "#FF0000";
                            }
                            if (showZS && p.modelsData[selectedModel] && p.modelsData[selectedModel][setFieldZS] !== "NA") {
                                return p.modelsData[selectedModel][setFieldZS] ? "#00FF00" : "#FF0000";
                            }
                        }
                        return "#CCCCCC";
                    }
                    if (selectedCategory && p.category.replace(/\s+/g, '-') === selectedCategory) {
                        return p.defaultColor;
                    }
                    return selectedCategory ? "#CCCCCC" : p.defaultColor;
                })
                .style("opacity", function(p) {
                    if (isSecondVis) {
                        if ((showSFT && p.modelsData[selectedModel] && p.modelsData[selectedModel][setFieldSFT] !== "NA") ||
                            (showZS && p.modelsData[selectedModel] && p.modelsData[selectedModel][setFieldZS] !== "NA")) {
                            return 1; // Higher opacity for emphasis
                        }
                        return 0.1; // Reduced opacity for non-relevant points
                    }
                    return selectedCategory ? (p.category.replace(/\s+/g, '-') === selectedCategory ? 1 : 0.1) : 1;
                });

            g.selectAll(".label text")
                .style("opacity", function(label) {
                    return selectedCategory ? (label.category.replace(/\s+/g, '-') === selectedCategory ? 1 : 0.2) : 1;
                })
                .attr("fill", function(label) {
                    return selectedCategory ? (label.category.replace(/\s+/g, '-') === selectedCategory ? (customColors[label.category] || colorScale(label.category)) : "#CCCCCC") : (isSecondVis ? "#555555" : (customColors[label.category] || colorScale(label.category)));
                });
        }

        function updateCheckboxState(checkboxChanged) {
            if (checkboxChanged.id === 'sft-checkbox' && checkboxChanged.checked) {
                document.getElementById('zs-checkbox').checked = false;
            }
            if (checkboxChanged.id === 'zs-checkbox' && checkboxChanged.checked) {
                document.getElementById('sft-checkbox').checked = false;
            }
        }

        function onLabelClick(event, d) {
            const selectedCategory = d.category.replace(/\s+/g, '-');
            updateScatterPlot(false, selectedCategory);
        }

        labelGroups.on("click", onLabelClick);

        document.getElementById('model-dropdown').onchange = function() { updateCheckboxState(); };
        document.getElementById('set-dropdown').onchange = function() { updateCheckboxState(); };
        document.getElementById('sft-checkbox').onchange = function() { updateCheckboxState(this); };
        document.getElementById('zs-checkbox').onchange = function() { updateCheckboxState(this); };

        document.getElementById('update-vis').addEventListener('click', function() {
            updateScatterPlot(true);
        });

        document.getElementById('show-second-vis').addEventListener('click', function() {
            resetSelection(g, colorScale, customColors, hullGroup, true);
            const controls = document.getElementById('controls');
            const showSecondVisButton = document.getElementById('show-second-vis');
            const returnFirstVisButton = document.getElementById('return-to-first-vis');
            const header = document.getElementById('scatter-header');

            controls.style.display = 'block';
            showSecondVisButton.style.display = 'none';
            returnFirstVisButton.style.display = 'inline-block';
            header.textContent = 'Correctness of Models Across Hardware Terms';

            // Populate dropdown menus and set initial values
            const modelDropdown = d3.select("#model-dropdown");
            const setDropdown = d3.select("#set-dropdown");

            const modelList = ["llama2-7B", "llama2-13B", "llama3", "phi-3", "mistral-7B", "gemma-7B"];
            const sets = ["val", "test"];

            modelDropdown.selectAll('option').remove();
            setDropdown.selectAll('option').remove();

            modelList.forEach(model => {
                modelDropdown.append("option")
                    .attr("value", model)
                    .text(model);
            });

            sets.forEach(set => {
                setDropdown.append("option")
                    .attr("value", set)
                    .text(set);
            });

            modelDropdown.property("value", "llama2-7B");
            setDropdown.property("value", "val");

            updateScatterPlot(true);

            // Set labels to grey
            g.selectAll(".label text")
                .attr("fill", "#555555")
                .style("opacity", 1);

            // Make labels unclickable in the second vis
            labelGroups.on("click", null);

            svg.on("click", function(event) {
                if (event.target.tagName !== 'circle' && event.target.tagName !== 'text') {
                    updateScatterPlot(true);
                }
            });

            legend.style("display", "block"); // Show the legend in the second vis
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
                .attr("r", 3) // Reset radius to original size
                .style("fill", d => d.defaultColor)
                .style("opacity", 1);

            g.selectAll(".label text")
                .style("opacity", 1)
                .attr("fill", d => customColors[d.category] || colorScale(d.category));

            labelGroups.on("click", onLabelClick);

            svg.on("click", function(event) {
                if (event.target.tagName !== 'circle' && event.target.tagName !== 'text') {
                    resetSelection(g, colorScale, customColors, hullGroup, false);
                }
            });

            legend.style("display", "none"); // Hide the legend when returning to the first vis
        });

        // Add event listener for clicking outside the selected label area in the first vis
        svg.on("click", function(event) {
            if (event.target.tagName !== 'circle' && event.target.tagName !== 'text') {
                resetSelection(g, colorScale, customColors, hullGroup, false);
            }
        });

        updateScatterPlot(); // Ensure the initial update happens
    };

    tsneWorker.onerror = function(error) {
        console.error('Worker error:', error);
    };
}

document.addEventListener('DOMContentLoaded', function() {
    loadScatterPlotVis();
});