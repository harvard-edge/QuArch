// code written with support of ChatGPT

import * as d3 from 'https://cdn.skypack.dev/d3@7';

function zoomed(event) {
    const g = d3.select("g");
    g.attr("transform", event.transform);
}

async function loadPreprocessedData() {
    try {
        const dataPart1 = await d3.json("./preprocessed_data_part1.json");
        const dataPart2 = await d3.json("./preprocessed_data_part2.json");

        const data = dataPart1.concat(dataPart2);

        console.log("Fetched data:", data);

        const points = data.map(d => ({
            x: d.x,
            y: d.y,
            question: d.question,
            category: d.taxonomy["0"].split(':')[0],
            modelsData: {
                "claude-3.5": d["claude-3.5"],
                "gemini-1.5": d["gemini-1.5"],
                "gemma-2-2b": d["gemma-2-2b"],
                "gemma-2-9b": d["gemma-2-9b"],
                "gemma-2-27b": d["gemma-2-27b"],
                "llama-3.2-1b": d["llama-3.2-1b"],
                "llama-3.2-3b": d["llama-3.2-3b"],
                "llama-3.1-8b": d["llama-3.1-8b"],
                "llama-3.1-70b": d["llama-3.1-70b"],
                "mistral-7b": d["mistral-7b"],
                "gpt-4o": d["gpt-4o"]
            }
        }));

        return points;
    } catch (error) {
        console.error("Error loading JSON:", error);
    }
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

export async function loadScatterPlotVis() {
    const container = document.querySelector('.visualization-container');
    container.innerHTML = `
        <svg></svg>
        <div id="controls" style="display: none;">
            <label for="model-dropdown">Select Model:</label>
            <select id="model-dropdown"></select>
        </div>
        <p class="text-center">
            <button id="show-second-vis" class="btn btn-primary" style="background-color: black; outline: .5px white; margin-top: 10px;">Correctness Across Models</button>
            <button id="return-to-first-vis" class="btn btn-primary" style="background-color: black; outline: .5px white; margin-top: 10px; display: none;">Total Question Distribution</button>
        </p>`;

    const svg = d3.select(".visualization-container svg")
        .attr("width", "100%")
        .attr("height", "500px")
        .call(d3.zoom().scaleExtent([0.5, 10]).on("zoom", zoomed));

    const width = parseInt(svg.style("width"));
    const height = parseInt(svg.style("height"));

    const tooltip = d3.select(".tooltip");

    const points = await loadPreprocessedData();

    const xScale = d3.scaleLinear()
        .domain(d3.extent(points, d => d.x))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(points, d => d.y))
        .range([0, height]);

    const uniqueCategories = Array.from(new Set(points.map(d => d.category)));

    const colorPalette = d3.schemeTableau10.concat(d3.schemeSet3, d3.schemePaired, d3.schemeDark2, d3.schemeAccent);
    const colorScale = d3.scaleOrdinal(colorPalette).domain(uniqueCategories);

    const customColors = {
        "Reconfigurable Architectures (FPGA / CGRA)": "#FFA500",
        "Interconnection Networks": "#351fb4",
        "Graphics Processing Unit (GPU) Architecture": "#fc59a3",
        "Processor Architecture": "#8e3ccb"
    };


    points.forEach(d => {
        d.defaultColor = customColors[d.category] || colorScale(d.category);
    });

    const g = svg.append("g");
    const hullGroup = g.append("g").attr("class", "hulls");

    const circles = g.selectAll("circle")
        .data(points)
        .enter().append("circle")
        .attr("r", 3)
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .style("fill", d => d.defaultColor)
        .on("mouseover", function(event, d) {
            tooltip.html(`<strong>Category: ${d.category}`) //to add question back in:  <br>Question: ${d.question}</strong>
                .style("left", `${event.pageX + 15}px`)
                .style("top", `${event.pageY + 15}px`)
                .style("opacity", 1)
                .style("visibility", "visible");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0)
                .style("visibility", "hidden");
        });

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
        .attr("transform", d => `translate(${xScale(d.x)}, ${yScale(d.y)})`)
        .style("pointer-events", "all");

    labelGroups.each(function(d) {
        const group = d3.select(this);
        const text = group.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .attr("fill", customColors[d.category] || colorScale(d.category))
            .attr("font-size", "14px")
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

    const legend = createLegend(svg);
    legend.style("display", "none");

    function updateScatterPlot(isSecondVis = false, selectedCategory = null) {
        const selectedModel = document.getElementById("model-dropdown").value;

        g.selectAll("circle")
            .attr("r", 3)
            .style("fill", function(p) {
                if (isSecondVis) {
                    const modelResult = p.modelsData[selectedModel];
                    return modelResult === 1 ? "#00FF00" : "#FF0000";
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

        const modelDropdown = d3.select("#model-dropdown");
        const modelList = ["claude-3.5", "gemini-1.5", "gemma-2-2b", "gemma-2-9b", "gemma-2-27b", "llama-3.2-1b", "llama-3.2-3b", "llama-3.1-8b", "llama-3.1-70b", "mistral-7b", "gpt-4o"];

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

    document.getElementById('model-dropdown').addEventListener('change', function() {
        updateScatterPlot(true);
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
}

document.addEventListener('DOMContentLoaded', function() {
    loadScatterPlotVis();
});