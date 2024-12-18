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
                <th class="text-center">Rank</th>
                <th class="text-center">Annotator</th>
                <th class="text-center">Contributions</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        sortedUsers.forEach(function(user, index) {
            const username = user[0];
            const count = user[1];

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-center">${index + 1}</td>
                <td class="text-center">${username}</td>
                <td class="text-center">${count}</td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        dataContainer.appendChild(table);
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
            'vjreddi': 265 // 194 + 71
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
})();