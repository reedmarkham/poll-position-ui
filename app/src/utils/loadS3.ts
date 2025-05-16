let cachedPollData: any[] | null = null;

export async function loadLatestPollData(): Promise<any[]> {
  if (cachedPollData) {
    return cachedPollData;
  }

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const endpoint = `${API_BASE}/api/latest-poll`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Failed to fetch poll data: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Expected poll data to be an array.');
    }

    cachedPollData = data;

    // Print a sample for debugging
    const sample = cachedPollData.slice(0, 3);
    console.log('📊 Sample poll data:\n', JSON.stringify(sample, null, 2));

    return cachedPollData;
  } catch (error) {
    console.error('❌ Visualization load failed:', error);
    throw error;
  }
}
