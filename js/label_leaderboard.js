// trying this version js 
(function() {
    const DATA_URL = 'label_studio_data.json';

    window.onload = async function() {
        const dataContainer = document.getElementById('dataContainer');

        if (!dataContainer) {
            console.error('Error: Data container not found on page load.');
            return;
        }

        try {
            console.log('Attempting to fetch data from ' + DATA_URL);
            const response = await fetch(DATA_URL);
            if (!response.ok) throw new Error('Failed to load data: ' + response.statusText);

            const data = await response.json();
            displayLeaderboard(data, dataContainer);
        } catch (error) {
            console.error('Error loading data:', error);
            dataContainer.innerHTML = '<p>Error loading data: ' + error.message + '</p>';
        }
    };

    function displayLeaderboard(data, dataContainer) {
        dataContainer.innerHTML = '';

        const userContributions = getUserContributions(data);
        const sortedUsers = Object.entries(userContributions)
            .sort(function(a, b) {
                return b[1] - a[1];
            });

        const title = document.createElement('h2');
        title.textContent = 'Labels Contributed';
        title.style.textAlign = 'center';
        title.style.marginBottom = '20px';
        dataContainer.appendChild(title);

        const table = document.createElement('table');
        table.className = 'table table-striped table-bordered';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th class="text-center">Overall Rank</th>
                <th class="text-center">Annotator Username</th>
                <th class="text-center">Affiliation</th>
                <th class="text-center">Badges</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        let currentRank = 0;
        let previousCount = null;
        sortedUsers.forEach(function(user, index) {
            const username = user[0];
            const count = user[1];
            const affiliation = getAffiliation(username);
            const badges = getBadges(count);

            if (count !== previousCount) {
                currentRank = index + 1;
            }
            previousCount = count;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-center">${currentRank}</td>
                <td class="text-center">${username}</td>
                <td class="text-center">${affiliation}</td>
                <td class="text-center">${badges}</td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        dataContainer.appendChild(table);

        addLegend(dataContainer);
    }

    function getUserContributions(data) {
        const hardcodedAdditions = {
            'amir.yazdanbakhsh': 596,
            'andycheng': 606,
            'ankitan': 22,
            'aryatschand': 558,
            'jyik': 580,
            'rghosal': 467,
            'sprakash': 1167, // 643 + 524
            'vjreddi': 265, // 194 + 71
            'shreyasgrampurohit': 2
        };

        const contributions = {...hardcodedAdditions };

        data.forEach(function(task) {
            const annotations = task && task.annotations ? task.annotations : [];

            annotations.forEach(function(annotation) {
                const username = getUserIdentifier(annotation);
                if (!contributions[username]) {
                    contributions[username] = 0;
                }
                contributions[username] += 1;
            });
        });

        return contributions;
    }

    function getUserIdentifier(annotation) {
        if (annotation && annotation.annotator_email) {
            return annotation.annotator_email.split('@')[0];
        }

        return 'Unknown User';
    }

    function getAffiliation(username) {
        const affiliations = {
            'amir.yazdanbakhsh': 'Google DeepMind',
            'andycheng': 'Harvard University',
            'ankitan': 'Qualcomm AI Research',
            'aryatschand': 'Harvard University',
            'jyik': 'Harvard University',
            'rghosal': 'Harvard University',
            'sprakash': 'Harvard University',
            'vjreddi': 'Harvard University',
            'shreyasgrampurohit': 'IIT Bombay',
            'npadilla': 'Univ. Nac. de Tucuman',
            'zishenwan': 'Georgia Tech',
            'jennyhuang': 'NVIDIA',
            'Unknown User': 'N/A'
        };
    
        return affiliations[username] || 'N/A';
    }

    function getBadges(contributionCount) {
        const badges = [];

        if (contributionCount >= 1000) {
            badges.push('<i class="fas fa-medal" style="color: gold;" title="Gold Contributor"></i>');
        }
        else if (contributionCount >= 100) {
            badges.push('<i class="fas fa-award" style="color: silver;" title="Silver Contributor"></i>');
        }
        else if (contributionCount >= 10) {
            badges.push('<i class="fas fa-trophy" style="color: bronze;" title="Bronze Contributor"></i>');
        }
        else if (contributionCount >= 1) {
            badges.push('<i class="fas fa-star" style="color: green;" title="First-Time Contributor"></i>');
        }

        return badges.join(' ');
    }

    function addLegend(container) {
        const legend = document.createElement('div');
        legend.className = 'legend';
        legend.style.marginTop = '20px';
        legend.style.textAlign = 'center';

        legend.innerHTML = `
            <div style="display: flex; justify-content: center; gap: 20px;">
                <span><i class="fas fa-medal" style="color: gold;"></i> Gold Contributor (1000+ Labels) </span>
                <span><i class="fas fa-award" style="color: silver;"></i> Silver Contributor (100+ Labels) </span>
                <span><i class="fas fa-trophy" style="color: bronze;"></i> Bronze Contributor (10+ Labels) </span>
                <span><i class="fas fa-star" style="color: green;"></i> First-Time Contributor! </span>
            </div>
        `;

        container.appendChild(legend);
    }
    
})();
