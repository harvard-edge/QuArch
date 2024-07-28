import * as d3 from 'https://cdn.skypack.dev/d3@7';
import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/controls/OrbitControls.js';

document.addEventListener('DOMContentLoaded', async function() {
    const container = document.querySelector(".container");
    const categoryDropdown = document.getElementById('categoryDropdown');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Set up Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0xffffff, 1); // Set background color to white
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Set up OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;

    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    async function loadAndProcessData() {
        const data = await d3.json("../input/QuArch_v0_1_1_Filtered_Errors.json");

        const embeddings = data.data.flatMap(paper =>
            paper.paragraphs.flatMap(paragraph =>
                paragraph.qas.map(qa => ({
                    question: qa.question,
                    embedding: qa.embedding,
                    category: qa.chatgpt_taxonomy["0"].split(':')[0] // Extract base category
                }))
            )
        );

        const vectors = embeddings.map(d => d.embedding);
        const questions = embeddings.map(d => d.question);
        const categories = embeddings.map(d => d.category);

        return { vectors, questions, categories };
    }

    const { vectors, questions, categories } = await loadAndProcessData();

    // Populate the dropdown with unique categories
    const uniqueCategories = Array.from(new Set(categories));
    uniqueCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.text = category;
        categoryDropdown.appendChild(option);
    });

    // Perform t-SNE dimensionality reduction in 3D
    const tsneInstance = new tsnejs.tSNE({
        dim: 3,
        perplexity: 30,
    });

    tsneInstance.initDataRaw(vectors);

    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
        tsneInstance.step();
    }

    const reducedVectors = tsneInstance.getSolution();

    // Use a larger color palette to ensure more distinct colors
    const colorPalette = d3.schemeTableau10.concat(d3.schemeSet3, d3.schemePaired, d3.schemeDark2, d3.schemeAccent);
    const colorScale = d3.scaleOrdinal(colorPalette).domain(uniqueCategories);

    // Manually set a different color for "Interconnection Networks"
    const customColors = {
        "Interconnection Networks": "#351fb4" // Ensure this matches exactly with the category name
    };

    // Add points to the scene
    const points = [];
    reducedVectors.forEach((coords, i) => {
        const geometry = new THREE.SphereGeometry(0.1, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: customColors[categories[i]] || colorScale(categories[i]) });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(coords[0], coords[1], coords[2]);
        sphere.userData = { question: questions[i], category: categories[i] };
        scene.add(sphere);
        points.push(sphere);
    });

    // Add text labels
    const loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(font) {
        uniqueCategories.forEach(category => {
            const categoryPoints = reducedVectors.filter((_, i) => categories[i] === category);
            const centroid = categoryPoints.reduce((acc, point) => {
                return acc.map((val, idx) => val + point[idx] / categoryPoints.length);
            }, [0, 0, 0]);

            const textGeometry = new THREE.TextGeometry(category, {
                font: font,
                size: 0.5,
                height: 0.05,
            });

            const textMaterial = new THREE.MeshBasicMaterial({ color: customColors[category] || colorScale(category) });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            textMesh.position.set(centroid[0], centroid[1], centroid[2]);
            textMesh.userData = { category };
            scene.add(textMesh);
        });
    });

    camera.position.z = 30;

    // Function to show points based on selected category
    function filterPoints(selectedCategory) {
        points.forEach(point => {
            point.visible = point.userData.category === selectedCategory || !selectedCategory;
        });

        scene.children.forEach(child => {
            if (child.userData && child.userData.category) {
                child.visible = child.userData.category === selectedCategory || !selectedCategory;
            }
        });
    }

    categoryDropdown.addEventListener('change', (event) => {
        const selectedCategory = event.target.value;
        filterPoints(selectedCategory);
    });

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    animate();
});