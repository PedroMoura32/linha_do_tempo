// --- FUNÇÕES DE FORMATAÇÃO ---

function convertToLinks(text) {
    if (!text) return '';
    let processedText = text;
    const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    processedText = processedText.replace(markdownRegex, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    const plainUrlRegex = /(?<!href=")(https?:\/\/[^\s<]+)/g;
    processedText = processedText.replace(plainUrlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
    return processedText;
}

function formatWorldContext(context) {
    if (!context) return '';
    const lines = context.split('\n').filter(line => line.trim());
    return lines.map(line => {
        const cleanLine = line.trim().replace(/^\*\s*/, '');
        const match = cleanLine.match(/^(\d{4}:.*?)(?=\s*\([^)]*\)|,|$)/);
        if (match) {
            const boldPart = match[1].trim();
            const restOfPart = cleanLine.substring(match[0].length);
            return `<p><strong>${boldPart}</strong>${restOfPart}</p>`;
        }
        return `<p>${cleanLine}</p>`;
    }).join('');
}

// --- LÓGICA DE PARSING E RENDERIZAÇÃO ---

function parseTimelineData(data) {
    const events = [];
    let currentPeriod = '', currentTitle = '', currentData = '', currentLocal = '', currentDetails = '', currentContext = '', currentPositive = '', currentNegative = '', currentSources = '';
    let inSection = null;

    const lines = data.split('\n');
    for (const line of lines) {
        if (line.startsWith('## Período:')) {
            if (currentTitle) events.push({ period: currentPeriod, title: currentTitle, data: currentData, local: currentLocal, details: currentDetails, context: currentContext, positive: currentPositive, negative: currentNegative, sources: currentSources });
            currentPeriod = line.replace('## Período:', '').trim();
            currentTitle = ''; currentData = ''; currentLocal = ''; currentDetails = ''; currentContext = ''; currentPositive = ''; currentNegative = ''; currentSources = ''; inSection = null;
        } else if (line.startsWith('### Título:')) {
            if (currentTitle) events.push({ period: currentPeriod, title: currentTitle, data: currentData, local: currentLocal, details: currentDetails, context: currentContext, positive: currentPositive, negative: currentNegative, sources: currentSources });
            currentTitle = line.replace('### Título:', '').trim();
            currentData = ''; currentLocal = ''; currentDetails = ''; currentContext = ''; currentPositive = ''; currentNegative = ''; currentSources = ''; inSection = null;
        } else if (line.startsWith('**Data:**')) { currentData = line.replace('**Data:**', '').trim(); inSection = null; }
        else if (line.startsWith('**Local:**')) { currentLocal = line.replace('**Local:**', '').trim(); inSection = null; }
        else if (line.startsWith('**Detalhes:**')) { currentDetails = line.replace('**Detalhes:**', '').trim(); inSection = 'details'; }
        else if (line.startsWith('**Contexto Histórico Mundial:**')) { currentContext = ''; inSection = 'context'; }
        else if (line.startsWith('**Pontos Positivos:**')) { currentPositive = ''; inSection = 'positive'; }
        else if (line.startsWith('**Pontos Negativos/Controversos:**')) { currentNegative = ''; inSection = 'negative'; }
        else if (line.startsWith('**Fontes:**')) { currentSources = ''; inSection = 'sources'; }
        else if (line.trim() !== '') {
            if (inSection === 'details') { currentDetails += '\n' + line; }
            else if (inSection === 'context') { currentContext += '\n' + line; }
            else if (inSection === 'positive') { currentPositive += '\n' + line; }
            else if (inSection === 'negative') { currentNegative += '\n' + line; }
            else if (inSection === 'sources') { currentSources += '\n' + line; }
        }
    }
    if (currentTitle) events.push({ period: currentPeriod, title: currentTitle, data: currentData, local: currentLocal, details: currentDetails, context: currentContext, positive: currentPositive, negative: currentNegative, sources: currentSources });
    return events;
}

function extractYearFromDate(dateString) {
    const yearMatch = dateString.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
    return yearMatch ? yearMatch[0] : '????';
}

const timelineEvents = parseTimelineData(timelineDataRaw);
const timelineContainer = document.getElementById('timeline-container');

timelineEvents.forEach(event => {
    const item = document.createElement('div');
    item.classList.add('timeline-item');

    const badge = document.createElement('div');
    badge.classList.add('timeline-badge');
    badge.innerHTML = extractYearFromDate(event.data);
    item.appendChild(badge);

    const panel = document.createElement('div');
    panel.classList.add('timeline-panel');

    const heading = document.createElement('div');
    heading.classList.add('timeline-heading');
    heading.innerHTML = `<h3>${event.title}</h3><span class="timeline-date">${event.data} - ${event.local}</span>`;
    
    if (event.context) {
        const worldContext = document.createElement('div');
        worldContext.classList.add('world-context');
        worldContext.innerHTML = `<h5>🌍 Contexto Histórico Mundial</h5><div>${formatWorldContext(event.context)}</div>`;
        heading.appendChild(worldContext);
    }
    
    panel.appendChild(heading);

    // --- NOVA LÓGICA DE EXIBIÇÃO DE DETALHES (SUBSTITUIÇÃO) ---

    // 1. Cria o corpo do painel que conterá o resumo ou os detalhes completos
    const summaryBody = document.createElement('div');
    summaryBody.classList.add('timeline-body', 'details-summary');
    const summaryText = event.details.split('\n')[0] + '...';
    summaryBody.innerHTML = `<p>${convertToLinks(summaryText)}</p>`;
    panel.appendChild(summaryBody);

    // 2. Cria o container para os detalhes completos (inicialmente oculto)
    const fullDetails = document.createElement('div');
    fullDetails.classList.add('full-details');
    fullDetails.style.display = 'none'; // Começa oculto

    // Preenche o container de detalhes completos UMA VEZ
    const detailsDiv = document.createElement('div');
    detailsDiv.innerHTML = `<h4>Detalhes:</h4><p>${convertToLinks(event.details.replace(/\n/g, '<br>'))}</p>`;
    fullDetails.appendChild(detailsDiv);

    if (event.positive) {
        const positiveSection = document.createElement('div');
        positiveSection.classList.add('positive-section');
        let content = '<ul>';
        event.positive.split('\n').filter(l => l.trim()).forEach(line => {
            content += `<li>${convertToLinks(line.replace(/^\*\s*/, ''))}</li>`;
        });
        content += '</ul>';
        positiveSection.innerHTML = `<h4>✅ Pontos Positivos:</h4>${content}`;
        fullDetails.appendChild(positiveSection);
    }
    
    if (event.negative) {
        const negativeSection = document.createElement('div');
        negativeSection.classList.add('negative-section');
        let content = '<ul>';
        event.negative.split('\n').filter(l => l.trim()).forEach(line => {
            let processedLine = convertToLinks(line.replace(/^\*\s*/, ''));
            content += `<li class="critical-text">${processedLine}</li>`;
        });
        content += '</ul>';
        negativeSection.innerHTML = `<h4>⚠️ Pontos Negativos/Controversos:</h4>${content}`;
        fullDetails.appendChild(negativeSection);
    }
    
    if (event.sources) {
        const sourcesDiv = document.createElement('div');
        let sourcesContent = '<ul>';
        event.sources.split('\n').filter(l => l.trim()).forEach(line => {
            sourcesContent += `<li>${convertToLinks(line.replace(/^\*\s*/, ''))}</li>`;
        });
        sourcesContent += '</ul>';
        sourcesDiv.innerHTML = `<h4>📚 Fontes:</h4>${sourcesContent}`;
        fullDetails.appendChild(sourcesDiv);
    }
    panel.appendChild(fullDetails);

    // 3. Cria o botão de toggle
    const toggleButton = document.createElement('button');
    toggleButton.classList.add('toggle-details');
    toggleButton.textContent = 'Ver Detalhes';
    panel.appendChild(toggleButton); // Adiciona o botão ao final do painel

    // 4. Adiciona o evento de clique que alterna a visibilidade e move o botão
    toggleButton.addEventListener('click', () => {
        const isExpanded = fullDetails.style.display === 'block';

        if (isExpanded) {
            // Se está expandido, oculta detalhes e mostra resumo
            fullDetails.style.display = 'none';
            summaryBody.style.display = 'block';
            toggleButton.textContent = 'Ver Detalhes';
            // Move o botão para o final do painel
            panel.appendChild(toggleButton);
        } else {
            // Se está resumido, oculta resumo e mostra detalhes
            summaryBody.style.display = 'none';
            fullDetails.style.display = 'block';
            toggleButton.textContent = 'Ocultar Detalhes';
            // Move o botão para o final do bloco de detalhes
            fullDetails.appendChild(toggleButton);
        }
    });

    item.appendChild(panel);
    timelineContainer.appendChild(item);
});