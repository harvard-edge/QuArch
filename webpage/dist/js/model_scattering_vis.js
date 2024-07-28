import * as d3 from 'https://cdn.skypack.dev/d3@7';

function zoomed(event) {
    const g = d3.select("g");
    g.attr("transform", event.transform);
}

export async function loadModelScatteringVis() {
    const container = document.querySelector('.visualization-container');
    container.innerHTML = `
        <h5 class="text-center" id="scatter-header">Scatter of Questions across Models</h5>
        <svg></svg>
        <div id="controls">
            <select id="model-dropdown"></select>
            <select id="set-dropdown"></select>
            <label><input type="checkbox" id="sft-checkbox"> SFT</label>
            <label><input type="checkbox" id="zs-checkbox" checked> ZS</label>
        </div>
        <p class="text-center">
            <button id="return-to-first-vis" class="btn btn-primary" style="margin-top: 10px;">Total Question Distribution</button>
        </p>
    `;

    const svg = d3.select(".visualization-container svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .call(d3.zoom().scaleExtent([0.5, 10]).on("zoom", zoomed));

    const width = parseInt(svg.style("width"));
    const height = parseInt(svg.style("height"));

    const tooltip = d3.select(".tooltip");

    async function loadAndProcessData() {
        const data = await d3.json("/input/QuArch_v0_1_1_Filtered_Errors_modified.json");

        const embeddings = data.data.flatMap(paper =>
            paper.paragraphs.flatMap(paragraph =>
                paragraph.qas.map(qa => ({
                    question: qa.question,
                    embedding: qa.embedding,
                    category: qa.taxonomy["0"].split(':')[0],
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

    const { vectors, questions, categories, modelsData } = await loadAndProcessData();

    const tsneWorker = new Worker('js/tsneWorker.js');
    tsneWorker.postMessage({ vectors, iterations: 300 });

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
            "Interconnection Networks": "#351fb4"
        };

        const points = reducedVectors.map((coords, i) => ({
            x: xScale(coords[0]),
            y: yScale(coords[1]),
            text: questions[i],
            category: categories[i],
            modelsData: modelsData[i],
            color: customColors[categories[i]] || colorScale(categories[i])
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
            .style("pointer-events", "none");

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

        labelGroups.on("click", function(event, d) {
            const selectedCategory = d.category.replace(/\s+/g, '-');

            labelGroups.selectAll("rect").style("opacity", 0);

            d3.select(this).select("rect").style("opacity", 0.7);

            const selectedPoints = points.filter(p => p.category.replace(/\s+/g, '-') === selectedCategory);

            const hull = d3.polygonHull(selectedPoints.map(p => [p.x, p.y]));

            hullGroup.selectAll(".hull").remove();

            if (hull) {
                const color = customColors[d.category] || colorScale(d.category);
                hullGroup.append("path")
                    .attr("class", "hull")
                    .attr("d", d3.line().curve(d3.curveBasisClosed)(hull))
                    .attr("fill", color)
                    .attr("opacity", 0.2)
                    .attr("stroke", color)
                    .attr("stroke-width", 2);
            }

            g.selectAll("circle")
                .style("opacity", function(p) {
                    return p.category.replace(/\s+/g, '-') === selectedCategory ? 1 : 0.1;
                })
                .style("fill", function(p) {
                    return p.category.replace(/\s+/g, '-') === selectedCategory ? p.color : "#CCCCCC";
                });

            g.selectAll(".label text")
                .style("opacity", function(label) {
                    return label.category === d.category ? 1 : 0.2;
                })
                .attr("fill", function(label) {
                    return label.category === d.category ? (customColors[label.category] || colorScale(label.category)) : "#555555";
                });
        });

        const modelDropdown = d3.select("#model-dropdown");
        const setDropdown = d3.select("#set-dropdown");
        const sftCheckbox = d3.select("#sft-checkbox");
        const zsCheckbox = d3.select("#zs-checkbox");

        const modelList = ["llama2-7B", "llama2-13B", "llama3", "phi-3", "mistral-7B", "gemma-7B"];
        const sets = ["val", "test"];

        modelList.forEach(model => {
            if (modelDropdown.selectAll('option').filter(function() { return this.value === model; }).empty()) {
                modelDropdown.append("option")
                    .attr("value", model)
                    .text(model);
            }
        });

        sets.forEach(set => {
            if (setDropdown.selectAll('option').filter(function() { return this.value === set; }).empty()) {
                setDropdown.append("option")
                    .attr("value", set)
                    .text(set);
            }
        });

        function updateScatterPlot() {
            const selectedModel = modelDropdown.node().value;
            const selectedSet = setDropdown.node().value;
            const setFieldSFT = `${selectedSet}_sft`;
            const setFieldZS = `${selectedSet}_zs`;
            const showSFT = sftCheckbox.node().checked;
            const showZS = zsCheckbox.node().checked;

            g.selectAll("circle")
                .style("fill", function(p) {
                    if (showSFT && p.modelsData[selectedModel] && p.modelsData[selectedModel][setFieldSFT] !== "NA") {
                        return p.modelsData[selectedModel][setFieldSFT] ? "#00FF00" : "#FF0000";
                    }
                    if (showZS && p.modelsData[selectedModel] && p.modelsData[selectedModel][setFieldZS] !== "NA") {
                        return p.modelsData[selectedModel][setFieldZS] ? "#00FF00" : "#FF0000";
                    }
                    return "#CCCCCC";
                })
                .attr("opacity", function(p) {
                    if ((showSFT && p.modelsData[selectedModel] && p.modelsData[selectedModel][setFieldSFT] !== "NA") ||
                        (showZS && p.modelsData[selectedModel] && p.modelsData[selectedModel][setFieldZS] !== "NA")) {
                        return 1;
                    }
                    return 0.5;
                });
        }

        sftCheckbox.on("change", function() {
            if (sftCheckbox.node().checked) {
                zsCheckbox.property("checked", false);
            }
            updateScatterPlot();
        });

        zsCheckbox.on("change", function() {
            if (zsCheckbox.node().checked) {
                sftCheckbox.property("checked", false);
            }
            updateScatterPlot();
        });

        modelDropdown.on("change", updateScatterPlot);
        setDropdown.on("change", updateScatterPlot);

        modelDropdown.property("value", "llama2-7B");
        setDropdown.property("value", "test");
        zsCheckbox.property("checked", true);
        sftCheckbox.property("checked", false);
        updateScatterPlot();

        svg.on("click", function(event) {
            if (event.target.tagName !== 'circle' && event.target.tagName !== 'text') {
                g.selectAll("circle")
                    .style("fill", function(p) {
                        const selectedModel = modelDropdown.node().value;
                        const selectedSet = setDropdown.node().value;
                        const setFieldSFT = `${selectedSet}_sft`;
                        const setFieldZS = `${selectedSet}_zs`;
                        const showSFT = sftCheckbox.node().checked;
                        const showZS = zsCheckbox.node().checked;

                        if (showSFT && p.modelsData[selectedModel] && p.modelsData[selectedModel][setFieldSFT] !== "NA") {
                            return p.modelsData[selectedModel][setFieldSFT] ? "#00FF00" : "#FF0000";
                        }
                        if (showZS && p.modelsData[selectedModel] && p.modelsData[selectedModel][setFieldZS] !== "NA") {
                            return p.modelsData[selectedModel][setFieldZS] ? "#00FF00" : "#FF0000";
                        }
                        return "#CCCCCC";
                    })
                    .style("opacity", 1);

                g.selectAll(".label text")
                    .style("opacity", 1)
                    .attr("fill", "#555555");
                g.selectAll(".label rect").style("opacity", 0.7);
                hullGroup.selectAll(".hull").remove();
            }
        });

        document.getElementById('return-to-first-vis').addEventListener('click', function() {
            import ('/js/scatter_plot_vis.js').then(module => {
                module.loadScatterPlotVis();
            });
        });
    };

    tsneWorker.onerror = function(error) {
        console.error('Worker error:', error);
    };
}

document.addEventListener('DOMContentLoaded', function() {
    loadModelScatteringVis();
});