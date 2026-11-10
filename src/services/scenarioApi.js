export async function requestScenarioExplanation(data) {
    const response = await fetch('/api/analyze-scenario', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error('설명을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }

    const result = await response.json();

    if (
        typeof result.explanation !== 'string' ||
        result.explanation.trim() === ''
    ) {
        throw new Error('설명 내용이 비어 있습니다. 다시 시도해 주세요.');
    }

    return result.explanation;
}